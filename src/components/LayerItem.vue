<template>
  <div  class="grid grid-cols-[1fr_auto] items-center w-full pr-2 px-1 py-0 cursor-pointer"
     :class="{  'bg-orange-500/15': isActiveLayer, 'hover:bg-zinc-700': !isActiveLayer}"
     :style="{ ['paddingRight']: `${depth * 20}px` }"
      draggable="true"   @dragstart="onDragStart" >
    
    <div class="flex items-center gap-1"  @click.stop="zoomOnPin">
      <i v-if="isGroup" class="fas fa-folder text-yellow-500"></i>
      <span class="text-xs text-zinc-100 truncate" :class="{ 'font-bold': isGroup }" >
        <input type="checkbox" @click="toggle" v-model="item.shape.show" class="ml-2 accent-orange-500"/>
        <i :class="selectIcon(item)" class="text-orange-500"/>
        {{ name }}
      </span>
    </div>

    <div class="flex items-center justify-end gap-2 min-w-[50px]">

<!--      <button class="text-green-600 hover:text-green-800 w-6 h-6 flex items-center justify-center"-->
<!--        @click="hide"  title="نمایش / پنهان کردن لایه">-->
<!--        <i :class=" isActive ? 'fas fa-power-off text-green-500' : 'fas fa-power-off text-gray-400'" />-->
<!--      </button>-->

      <button v-if="Icons.includes('send')"
          class="text-green-600 hover:text-green-800"
          @click="Pin = item;OpenSend = true"
          title="ارسال">
        <i class="fas fa-share rev text-zinc-400 text-sm" />
      </button>

      <button v-if="Icons.includes('back')"
          class="text-green-600 hover:text-green-800"
          @click="backToDesk"
          title="انتقال به میز کار">
        <i class="fas fa-share rev text-orange-500 text-sm" />
      </button>

      <button class="text-red-500 hover:text-red-700 w-6 h-6 flex items-center justify-center"
        @click="remove"  title="حذف لایه" >
        <i class="fas fa-trash-alt"></i>
      </button>

<!--      <button v-if="Icons.includes('send')"-->
<!--              class="text-green-600 hover:text-green-800 mr-2"-->
<!--              @click="Pin = item;OpenSend = true"-->
<!--              title="ارسال">-->
<!--        <i class="fas fa-ellipsis-v rev text-zinc-400 text-sm" />-->
<!--      </button>-->

    </div>
    
  </div>
  <SendDialog  :show="OpenSend" @submit="send" @cancel="OpenSend = false"/>
  <MultiPointsList v-if="showPoint && activeItem == item.id" :pointList="pointList"  @close="showPoint = false"/>

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
import { ref, defineProps, provide, inject, computed } from 'vue'
import { useToast } from "vue-toast-notification"
import axios from "axios"
import { useAuthStore } from '../stores/auth';
import { AppStore } from '../stores/app'
import SendDialog from '../components/SendDialog.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import MultiPointsList from '../components/MultiPointsList.vue'
const store = AppStore()

const authStore = useAuthStore();

import { useSharedArray } from '../stores/app'
import proj4 from "proj4";
const {toggleVisible} = useSharedArray()

const SERVER = import.meta.env.VITE_SERVER
const $toast = useToast()

const drawPin = inject('drawPin')
const Pins = inject('Pins')

const props = defineProps({
  viewer: { type: Object, required: true },
  items : Array,
  item : Object,
  idx : Number,
  name: String,
  id: [String, Number],
  depth: {type: Number, default: 0 },
  isGroup: Boolean,
  isActive: {type: Boolean, default: false },
  parentGroup: Object,      
  setSelectedGroup: Function,
  Icons : Array ,
  activeItem : [String, Number]
});
const emit = defineEmits(['change-active'])

const viewer = inject("viewer");
const activeLayerId = inject("activeLayerId", null);
const setActiveLayer = inject("setActiveLayer", null);

const OpenSend = ref(false)
const Pin = ref(null);
const pointList = ref([]);
const showPoint = ref(false);
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

const isActiveLayer = computed(() => activeLayerId?.value === props.id);
const isActive = ref(true)  // وضعیت نمایش لایه در Cesium

function onDragStart(event) {
  event.dataTransfer.setData("layerId", props.id)
}

const send = async (data) => {

  //let pin = props.pins[index_pin_id.value];
  if (!Pin.value) return
  let pin = Pin.value;
  const form = new FormData();
  form.append("sender_id", authStore.user.id);
  if (data.selected)
    form.append("receiver_id", data.selected);
  if (data.phone)
    form.append("rec_phone", data.phone);
  if (!data.selected && !data.phone) {
    showMessage('گیرنده مشخص نشده است', 'error');
    return;
  }

  form.append("document_id", pin.save);
  form.append("descr", data.description);
  if (pin.save < 0) {
    let rec = {
      name : pin.name,
      content : pin.content,
      type : pin.type,
      obj_id : pin.id,
    }
    form.append("name", pin.name);
    form.append("pin",  JSON.stringify(rec));
  }
  if (pin.type == 'file' && pin.content== null) {
    // const fileHandle = await dirHandle.value.getFileHandle(pin.name);
    // const file = await fileHandle.getFile();
    form.append("file", pin.file);
  }
  let res = await axios.post(SERVER + '/api/sendTo', form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  OpenSend.value=false;
  showMessage('آیتم مورد نظر ارسال شد' , 'success')
};

const selectLayer = () => {
  if (activeLayerId?.value === props.id) {
    setActiveLayer(null); // دوباره کلیک = لغو انتخاب
  } else {
    setActiveLayer(props.id);
  }
  let tmp = props.items.find(a => a.id == props.id);
  //provide("data_src", tmp.dataSource); 
  store.setValue(tmp.dataSource)

  if (props.parentGroup) {
    props.setSelectedGroup(props.parentGroup)
  }  
};

const zoomOnPin = async (idx) => {
  pointList.value=[];
  if (props.item.shape?.type === 'multi_point' ) {
    props.item.shape.positions.forEach((row, index) => {

      const zone = Math.floor((row.lon + 180) / 6) + 1;
      const [x, y] = proj4(
          "EPSG:4326",
          `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`,
          [row.lon, row.lat]
      );

      pointList.value.push({
        id: crypto.randomUUID(),
        row: pointList.value.length + 1,
        x: Number(x).toFixed(3),
        y: Number(y).toFixed(3),
      });
    })

    showPoint.value=true;
    emit('change-active', props.item.id)
  }
  let item = props.item;

  if (item.shape && typeof item.shape.entities !== 'undefined') {
    try {
      await props.viewer.flyTo(item.shape, { duration: 1.5, offset: new Cesium.HeadingPitchRange(0, -90, 0) });
    } catch (_) {}
    return;
  }

  let b = item.bounding;
  if (!b || item.save < 0 ) {
    const toCartesian = (p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height || 0)
    const positionsCartesian = item.shape.positions.map(toCartesian)
    item.bounding = Cesium.BoundingSphere.fromPoints(positionsCartesian);
  }
  props.viewer.camera.flyToBoundingSphere(item.bounding, {
    duration: 1.5,
    offset: new Cesium.HeadingPitchRange(
        0,
        -90,
        0
    )
  });

}

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
    let pins = props.items;
    const pinsDS = props.viewer.dataSources.getByName("pins")[0];
    const pin = pins.find(x => x.id == item.id);
    const index = pins.findIndex(x => x.id == item.id);
    if (pin.save > -1)
      await axios.delete(SERVER + '/api/delWork?id=' + pin.save + '&userId=' + authStore.user.id);

    if (pin) {
      if (pin.type == 'file') {
        props.viewer.dataSources.remove(pin.shape);
      } else {
        if (item.shape.type == 'multi_point') {
          const ds = props.viewer.dataSources.getByName(item.id)[0];
          props.viewer.dataSources.remove(ds, true);
        }
        pinsDS.entities.removeById(pin.id);
      }
      pins.splice(index, 1);
    }
    showMessage('گزینه مورد نظر حذف شد', 'success');
  } catch (e) {
    showMessage('خطا در حذف گزینه مورد نظر', 'error');
  }
};

const toggle = () => {
  let item = props.item;
  toggleVisible(item.id);
  if (item.type == 'file') {
    if (! item.loaded)
      drawPin(props.item);
    if (item.shape)
      item.shape.show = !item.shape.show;

  } else {
    if (item.shape.type == 'multi_point') {
      const ds = props.viewer.dataSources.getByName(item.id)[0];
      ds.show= !ds.show;
    } else {
      const drawDataSource = props.viewer.dataSources.getByName("pins")[0];
      let entity = drawDataSource.entities.getById(item.id);
      if (entity) {
        item.shape.show = !item.shape.show
        entity.show = item.shape.show;
      } else {
        drawPin(props.item);
        item.shape.show = !item.shape.show
        entity.show = item.shape.show;
      }
    }
  }
};

const backToDesk = async () => {
  let pin = findPinById(Pins, props.item.id);
  if (! pin) {
    Pins.push(props.item)
    const res = await axios.post(SERVER + '/api/copyRecord/' + props.item.save)
    showMessage('آیتم به میزکار منتقل شد','success')
  } else {
    showMessage('این آیتم در میزکار موجود هست', 'warning')
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
  switch (item.shape.type) {
    case 'multi_point' :
      return 'fas fa-map-pin';
    case 'point' :
      return 'fas fa-location-dot';
    case 'polyline' :
      return 'fas fa-bezier-curve';
    case 'polygon' :
      return 'fas fa-draw-polygon';
    case 'circle' :
      return 'fas fa-circle-dot';
    }
  } else {
    const name = String(item.name || (item.content && JSON.stringify(item.content)) || '').toLowerCase();
    if (name.includes('.csv') || name.includes('.txt')) return 'fas fa-file-csv text-green-500';
    if (name.includes('.kml') || name.includes('.kmz')) return 'fas fa-globe text-orange-500';
    if (name.includes('.dxf')) return 'fas fa-compress-arrows-alt text-sky-500';
    if (name.includes('.dwg')) return 'fas fa-layer-group text-amber-500';
    if (name.includes('.shp') || name.includes('.zip')) return 'fas fa-archive text-amber-500';
    return 'fas fa-file';
  }
}

// 🔹 پیام Toast
function showMessage(msg, type) {
  $toast.open({
    message: msg,
    type: type,
    duration: 4000
  })
}
</script>

<style scoped>
button {
  transition: all 0.2s ease;
}
</style>
