<template>
  <div class="grid grid-cols-[1fr_auto] items-center w-full pr-2 px-1 py-0 cursor-pointer"
       :class="{ 'bg-blue-200': isActiveLayer, 'hover:bg-gray-300': !isActiveLayer }"
       :style="{ ['paddingRight']: `${depth * 20}px` }"
       draggable="true" @dragstart="onDragStart">

    <div class="flex items-center gap-1" @click.stop="zoomOnPin">
      <i v-if="isGroup" class="fas fa-folder text-yellow-500"></i>
      <span class="text-xs text-gray-800 truncate" :class="{ 'font-bold': isGroup }">
        <input type="checkbox" @click="toggle" v-model="item.shape.show" class="ml-2 accent-green-600"/>
        <i :class="selectIcon(item)" class="text-blue-500"/>
        {{ name }}
      </span>
    </div>

    <div class="flex items-center justify-end gap-2 min-w-[50px]">
      <button v-if="Icons.includes('send')"
              class="text-green-600 hover:text-green-800"
              @click="Pin = item; OpenSend = true" title="ارسال">
        <i class="fas fa-share rev text-gray-700 text-sm"/>
      </button>
      <button v-if="Icons.includes('back')"
              class="text-green-600 hover:text-green-800"
              @click="backToDesk" title="انتقال به میز کار">
        <i class="fas fa-share rev text-blue-700 text-sm"/>
      </button>
      <button class="text-red-500 hover:text-red-700 w-6 h-6 flex items-center justify-center"
              @click="remove" title="حذف لایه">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  </div>
  <SendDialog :show="OpenSend" @submit="send" @cancel="OpenSend = false"/>
  <MultiPointsList v-if="showPoint && activeItem == item.id" :pointList="pointList" @close="showPoint = false"/>
</template>

<script setup>
import { ref, inject, computed } from 'vue';
import { useToast } from "vue-toast-notification";
import axios from "axios";
import { useAuthStore } from '../../stores/auth';
import SendDialog from '../SendDialog.vue';
import MultiPointsList from '../MultiPointsList.vue';
import { useSharedArray } from '../../stores/app';
import proj4 from "proj4";

const authStore = useAuthStore();
const { toggleVisible } = useSharedArray();
const SERVER = import.meta.env.VITE_SERVER;
const $toast = useToast();
const drawPin = inject('drawPin');
const Pins = inject('Pins');

const props = defineProps({
  map: { type: Object, required: true },
  items: Array,
  item: Object,
  idx: Number,
  name: String,
  id: [String, Number],
  depth: { type: Number, default: 0 },
  isGroup: Boolean,
  isActive: { type: Boolean, default: false },
  parentGroup: Object,
  setSelectedGroup: Function,
  Icons: Array,
  activeItem: [String, Number]
});

const emit = defineEmits(['change-active']);

const map = inject("map");
const OpenSend = ref(false);
const Pin = ref(null);
const pointList = ref([]);
const showPoint = ref(false);
const isActiveLayer = computed(() => false);

function onDragStart(event) {
  event.dataTransfer.setData("layerId", props.id);
}

const send = async (data) => {
  if (!Pin.value) return;
  const pin = Pin.value;
  const form = new FormData();
  form.append("sender_id", authStore.user.id);
  if (data.selected) form.append("receiver_id", data.selected);
  else form.append("rec_phone", data.phone);
  form.append("document_id", pin.save);
  form.append("descr", data.description);
  if (pin.save < 0) {
    form.append("name", pin.name);
    form.append("pin", JSON.stringify({ name: pin.name, content: pin.content, type: pin.type, obj_id: pin.id }));
  }
  if (pin.type == 'file' && pin.content == null) form.append("file", pin.file);
  await axios.post(SERVER + '/api/sendTo', form, { headers: { "Content-Type": "multipart/form-data" } });
  OpenSend.value = false;
  showMessage('آیتم مورد نظر ارسال شد', 'success');
};

const zoomOnPin = () => {
  pointList.value = [];
  if (props.item.shape?.type === 'multi_point') {
    props.item.shape.positions.forEach((row) => {
      const zone = Math.floor((row.lon + 180) / 6) + 1;
      const [x, y] = proj4("EPSG:4326", `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`, [row.lon, row.lat]);
      pointList.value.push({ id: crypto.randomUUID(), row: pointList.value.length + 1, x: Number(x).toFixed(3), y: Number(y).toFixed(3) });
    });
    showPoint.value = true;
    emit('change-active', props.item.id);
    return;
  }

  const item = props.item;
  const shape = item.shape;
  if (!shape) return;

  if (shape.positions && shape.positions.length > 0) {
    const coords = shape.positions.map(p => [p.lon, p.lat]);
    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach(c => bounds.extend(c));
    props.map.fitBounds(bounds, { padding: 50, duration: 1500 });
  } else if (shape.center) {
    props.map.flyTo({ center: [shape.center.lng || shape.center.lon, shape.center.lat], zoom: 14, duration: 1500 });
  } else if (shape.lon !== undefined && shape.lat !== undefined) {
    props.map.flyTo({ center: [shape.lon, shape.lat], zoom: 16, duration: 1500 });
  }
};

const remove = async () => {
  try {
    const pins = props.items;
    const item = props.item;
    const confirmed = window.confirm("آیا مطمئن هستید که می‌خواهید این پین را حذف کنید؟");
    if (!confirmed) return;

    const pin = pins.find(x => x.id == item.id);
    const index = pins.findIndex(x => x.id == item.id);
    if (pin.save > -1)
      await axios.delete(SERVER + '/api/delWork?id=' + pin.save + '&userId=' + authStore.user.id);

    if (pin) {
      removeMapLayers(pin);
      pins.splice(index, 1);
    }
    showMessage('گزینه مورد نظر حذف شد', 'success');
  } catch (e) {
    showMessage('خطا در حذف گزینه مورد نظر', 'error');
  }
};

function removeMapLayers(pin) {
  const mapRef = props.map;
  if (pin.shape?._sourceIds) {
    pin.shape._sourceIds.forEach(sid => {
      const layers = mapRef.getStyle().layers.filter(l => l.id.startsWith(sid));
      layers.forEach(l => { if (mapRef.getLayer(l.id)) mapRef.removeLayer(l.id); });
      if (mapRef.getSource(sid)) mapRef.removeSource(sid);
    });
  } else {
    const sourceId = 'draw-pin-' + pin.id;
    const layers = mapRef.getStyle().layers.filter(l => l.id.startsWith(sourceId));
    layers.forEach(l => { if (mapRef.getLayer(l.id)) mapRef.removeLayer(l.id); });
    if (mapRef.getSource(sourceId)) mapRef.removeSource(sourceId);
  }
}

const toggle = () => {
  const item = props.item;
  toggleVisible(item.id);

  if (item.type == 'file') {
    if (!item.loaded) drawPin(item);
    if (item.shape) item.shape.show = !item.shape.show;
  } else {
    const sourceId = 'draw-pin-' + item.id;
    if (map.value?.getSource?.(sourceId) || props.map.getSource(sourceId)) {
      const mapRef = props.map;
      const layers = mapRef.getStyle().layers.filter(l => l.id.startsWith(sourceId));
      const visible = !item.shape.show;
      item.shape.show = visible;
      layers.forEach(l => {
        mapRef.setLayoutProperty(l.id, 'visibility', visible ? 'visible' : 'none');
      });
    } else {
      drawPin(item);
      item.shape.show = !item.shape.show;
    }
  }
};

const backToDesk = async () => {
  const pin = findPinById(Pins, props.item.id);
  if (!pin) {
    Pins.push(props.item);
    await axios.post(SERVER + '/api/copyRecord/' + props.item.save);
    showMessage('آیتم به میزکار منتقل شد', 'success');
  } else {
    showMessage('این آیتم در میزکار موجود هست', 'warning');
  }
};

function findPinById(items, id) {
  for (const item of items) {
    if (item.id == id) return item;
    if (item.children && item.children.length) {
      const found = findPinById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

function selectIcon(item) {
  if (item.type == 'draw') {
    switch (item.shape?.type) {
      case 'multi_point': return 'fas fa-braille';
      case 'point': return 'fas fa-location-pin';
      case 'polyline': return 'fas fa-draw-polygon';
      case 'polygon': return 'fas fa-bookmark';
      case 'circle': return 'fas fa-circle';
    }
  }
  return 'fa fa-file';
}

function showMessage(msg, type) {
  $toast.open({ message: msg, type: type, duration: 4000 });
}
</script>

<style scoped>
button { transition: all 0.2s ease; }
</style>
