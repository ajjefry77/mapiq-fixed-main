<template>
  <div class="grid grid-cols-[1fr_auto] items-center w-full pr-2 px-1 py-0 cursor-pointer"
       :class="{ 'bg-orange-500/15': isActiveLayer, 'hover:bg-zinc-700': !isActiveLayer }"
       :style="{ ['paddingRight']: `${depth * 20}px` }">

    <div class="flex items-center gap-1" @click.stop="zoomOnPin">
      <span class="text-xs text-zinc-100 truncate flex items-center gap-1" :class="{ 'font-bold': isGroup }">
        <input type="checkbox" :checked="item.shape?.show !== false" @change="toggle" class="ml-2 accent-orange-500"/>
        <i :class="selectIcon(item)"></i>
        {{ name }}
      </span>
    </div>

    <div class="flex items-center justify-end gap-2 min-w-[50px]">
      <button v-if="Icons.includes('send')"
              class="text-green-600 hover:text-green-800"
              @click="Pin = item; OpenSend = true" title="ارسال">
        <i class="fas fa-share rev text-zinc-400 text-sm"/>
      </button>
      <button v-if="Icons.includes('back')"
              class="text-green-600 hover:text-green-800"
              @click="backToDesk" title="انتقال به میز کار">
        <i class="fas fa-share rev text-orange-500 text-sm"/>
      </button>
      <button class="text-red-500 hover:text-red-700 w-6 h-6 flex items-center justify-center"
              @click="remove" title="حذف لایه">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  </div>
  <SendDialog :show="OpenSend" @submit="send" @cancel="OpenSend = false"/>

  <div v-if="showDeleteDialog" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" @click.self="showDeleteDialog = false">
    <div class="bg-zinc-800 rounded-lg p-5 shadow-xl max-w-sm w-full mx-4 border border-zinc-700">
      <p class="text-zinc-200 text-sm mb-1">
        تعداد لایه‌های انتخاب‌شده: <span class="font-bold text-orange-400">{{ checkedLayerCount }}</span>
      </p>
      <p class="text-zinc-400 text-xs mb-4">
        آیا می‌خواهید تمام لایه‌های انتخاب‌شده را حذف کنید یا فقط همین لایه را؟
      </p>
      <div class="flex flex-col gap-2">
        <button @click="deleteAllSelected" class="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition">
          حذف تمام انتخاب‌شده ({{ checkedLayerCount }})
        </button>
        <button @click="deleteOnlyThis" class="w-full px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition">
          حذف فقط این لایه
        </button>
        <button @click="showDeleteDialog = false" class="w-full px-3 py-2 bg-zinc-600 text-white rounded text-sm hover:bg-zinc-500 transition">
          انصراف
        </button>
      </div>
    </div>
  </div>
  <ConfirmDialog :show="showConfirmDialog" :message="confirmMessage" confirmText="بله" cancelText="خیر" @confirm="onConfirmDialogConfirm" @cancel="onConfirmDialogCancel"/>
</template>

<script setup>
import { ref, inject, computed } from 'vue';
import mapboxgl from 'mapbox-gl';
import { useToast } from "vue-toast-notification";
import axios from "axios";
import { useAuthStore } from '../../stores/auth';
import SendDialog from '../SendDialog.vue';
import ConfirmDialog from '../ConfirmDialog.vue';
import { useSharedArray } from '../../stores/app';

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
});

const map = inject("map");
const OpenSend = ref(false);
const Pin = ref(null);
const isActiveLayer = computed(() => false);
const showDeleteDialog = ref(false);
const showConfirmDialog = ref(false);
const confirmMessage = ref('');
let confirmCallback = null;

const checkedLayerCount = computed(() => {
  return props.items.filter(item =>
    item.type !== 'group' && item.type !== 'folder' &&
    item.shape?.show !== false
  ).length;
});

function showConfirm(msg) {
  return new Promise((resolve) => {
    confirmMessage.value = msg;
    confirmCallback = resolve;
    showConfirmDialog.value = true;
  });
}

function onConfirmDialogConfirm() {
  showConfirmDialog.value = false;
  if (confirmCallback) confirmCallback(true);
  confirmCallback = null;
}

function onConfirmDialogCancel() {
  showConfirmDialog.value = false;
  if (confirmCallback) confirmCallback(false);
  confirmCallback = null;
}

const send = async (data) => {
  if (!Pin.value) return;
  const pin = Pin.value;
  const form = new FormData();
  form.append("sender_id", authStore.user.id);
  if (data.selected) form.append("receiver_id", data.selected);
  if (data.phone) form.append("rec_phone", data.phone);
  if (!data.selected && !data.phone) {
    showMessage("گیرنده مشخص نشده است", "error");
    return;
  }
  form.append("document_id", pin.save);
  form.append("descr", data.description);
  if (pin.save < 0) {
    let content = pin.content;
    if (pin.type == 'draw' && pin.shape) content = JSON.stringify(pin.shape);
    form.append("name", pin.name);
    form.append("pin", JSON.stringify({ name: pin.name, content, type: pin.type, obj_id: pin.id }));
  }
  if (pin.type == 'file' && pin.content == null) form.append("file", pin.file);
  await axios.post(SERVER + '/api/sendTo', form, { headers: { "Content-Type": "multipart/form-data" } });
  OpenSend.value = false;
  showMessage('آیتم مورد نظر ارسال شد', 'success');
};

const zoomOnPin = () => {
  const item = props.item;
  const shape = item.shape;
  if (!shape) return;

  if (shape.positions && shape.positions.length > 0) {
    const coords = shape.positions
      .map(p => [p.lon, p.lat])
      .filter(c => c[0] != null && c[1] != null);
    if (coords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach(c => bounds.extend(c));
      props.map.fitBounds(bounds, { padding: 50, duration: 1500 });
    }
  } else if (shape._sourceIds && shape._sourceIds.length > 0) {
    const bounds = new mapboxgl.LngLatBounds();
    for (const sid of shape._sourceIds) {
      const src = props.map.getSource(sid);
      if (!src) continue;
      try {
        const data = src._data;
        const geojson = typeof data === 'string' ? JSON.parse(data) : data;
        if (!geojson) continue;
        const coords = [];
        const extractCoords = (g) => {
          if (!g) return;
          if (g.type === 'FeatureCollection') g.features?.forEach(extractCoords);
          else if (g.type === 'Feature') extractCoords(g.geometry);
          else if (g.type === 'Point') coords.push(g.coordinates);
          else if (g.type === 'MultiPoint' || g.type === 'LineString') g.coordinates?.forEach(c => coords.push(c));
          else if (g.type === 'MultiLineString' || g.type === 'Polygon') g.coordinates?.flat(1).forEach(c => coords.push(c));
          else if (g.type === 'MultiPolygon') g.coordinates?.flat(2).forEach(c => coords.push(c));
        };
        extractCoords(geojson);
        coords.forEach(c => { if (c?.length >= 2) bounds.extend(c); });
      } catch (_) {}
    }
    if (!bounds.isEmpty()) {
      props.map.fitBounds(bounds, { padding: 50, duration: 1500 });
    }
  } else if (shape.center) {
    props.map.flyTo({ center: [shape.center.lng || shape.center.lon, shape.center.lat], zoom: 14, duration: 1500 });
  } else if (shape.lon !== undefined && shape.lat !== undefined) {
    props.map.flyTo({ center: [shape.lon, shape.lat], zoom: 16, duration: 1500 });
  }
};

const remove = async () => {
  if (checkedLayerCount.value > 1) {
    showDeleteDialog.value = true;
    return;
  }
  const confirmed = await showConfirm("آیا مطمئن هستید که می‌خواهید این پین را حذف کنید؟");
  if (!confirmed) return;
  await deleteSingleItem(props.item);
};

const deleteOnlyThis = async () => {
  showDeleteDialog.value = false;
  const confirmed = await showConfirm("آیا مطمئن هستید که می‌خواهید این پین را حذف کنید؟");
  if (!confirmed) return;
  await deleteSingleItem(props.item);
};

const deleteAllSelected = async () => {
  showDeleteDialog.value = false;
  const itemsToDelete = props.items.filter(item =>
    item.type !== 'group' && item.type !== 'folder' &&
    item.shape?.show !== false
  );
  for (const item of itemsToDelete) {
    await deleteSingleItem(item);
  }
  showMessage(`${itemsToDelete.length} لایه حذف شد`, 'success');
};

const deleteSingleItem = async (item) => {
  try {
    const pins = props.items;
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
  if (!item.shape) {
    item.shape = { show: true };
  }
  toggleVisible(item.id);

  if (item.type == 'file') {
    if (!item.shape._sourceIds && !item.loaded) {
      drawPin(item);
      item.shape.show = true;
    } else {
      item.shape.show = !item.shape.show;
      applyLayersVisibility(item, item.shape.show);
    }
    return;
  }

  const next = !item.shape.show;
  item.shape.show = next;
  const sourceId = 'draw-pin-' + item.id;
  const mapRef = props.map;
  if (mapRef.getSource?.(sourceId) || props.map.getSource(sourceId)) {
    const layers = mapRef.getStyle().layers.filter(l => l.id.startsWith(sourceId));
    layers.forEach(l => {
      mapRef.setLayoutProperty(l.id, 'visibility', next ? 'visible' : 'none');
    });
  } else {
    drawPin(item, next);
  }
};

function applyLayersVisibility(item, visible) {
  const mapRef = props.map;
  const ids = item.shape._sourceIds || ['draw-pin-' + item.id];
  ids.forEach(sid => {
    const layers = mapRef.getStyle().layers.filter(l => l.id.startsWith(sid));
    layers.forEach(l => {
      mapRef.setLayoutProperty(l.id, 'visibility', visible ? 'visible' : 'none');
    });
  });
}

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
  if (item.type === 'folder') return 'fas fa-folder text-amber-500';
  // گروه واقعی (با group_id) → آیکون کاربران؛ پوشه شخصی قدیمی با type=group → پوشه
  if (item.type === 'group' && item.group_id) return 'fas fa-users text-blue-600';
  if (item.type === 'group') return 'fas fa-folder text-amber-500';
  if (item.type == 'draw') {
    switch (item.shape?.type) {
      case 'multi_point': return 'fas fa-map-pin text-orange-500';
      case 'point': return 'fas fa-location-dot text-orange-500';
      case 'polyline': return 'fas fa-bezier-curve text-orange-500';
      case 'polygon': return 'fas fa-draw-polygon text-orange-500';
      case 'circle': return 'fas fa-circle-dot text-orange-500';
    }
  }
  {
    const name = String(item.name || (item.content && JSON.stringify(item.content)) || '').toLowerCase();
    if (name.includes('.csv') || name.includes('.txt')) return 'fas fa-file-csv text-green-500';
    if (name.includes('.kml') || name.includes('.kmz')) return 'fas fa-globe text-orange-500';
    if (name.includes('.dxf')) return 'fas fa-compress-arrows-alt text-sky-500';
    if (name.includes('.dwg')) return 'fas fa-layer-group text-amber-500';
    if (name.includes('.shp') || name.includes('.zip')) return 'fas fa-archive text-amber-500';
  }
  return 'fas fa-file text-zinc-400';
}

function showMessage(msg, type) {
  $toast.open({ message: msg, type: type, duration: 4000 });
}
</script>

<style scoped>
button { transition: all 0.2s ease; }
</style>
