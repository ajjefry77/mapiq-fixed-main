<template>
  <div  class="grid grid-cols-[1fr_auto] items-center w-full pr-2 px-1 py-0 cursor-pointer"
     :class="{  'bg-blue-200': isActiveLayer, 'hover:bg-gray-300': !isActiveLayer}"
     :style="{ ['paddingRight']: `${depth * 20}px` }"
      draggable="true"   @dragstart="onDragStart" >
    
    <div class="flex items-center gap-1"  @click.stop="zoomOnPin">
      <i v-if="isGroup" class="fas fa-folder text-yellow-500"></i>
      <span class="text-xs text-gray-800 truncate" :class="{ 'font-bold': isGroup }" >
        <input type="checkbox" @click="toggle" v-model="item.shape.show" class="ml-2 accent-green-600"/>
        <i :class="selectIcon(item)" class="text-blue-500"/>
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
        <i class="fas fa-share rev text-gray-700 text-sm" />
      </button>

      <button v-if="Icons.includes('back')"
          class="text-green-600 hover:text-green-800"
          @click="backToDesk"
          title="انتقال به میز کار">
        <i class="fas fa-share rev text-blue-700 text-sm" />
      </button>

      <button class="text-red-500 hover:text-red-700 w-6 h-6 flex items-center justify-center"
        @click="remove"  title="حذف لایه" >
        <i class="fas fa-trash-alt"></i>
      </button>

<!--      <button v-if="Icons.includes('send')"-->
<!--              class="text-green-600 hover:text-green-800 mr-2"-->
<!--              @click="Pin = item;OpenSend = true"-->
<!--              title="ارسال">-->
<!--        <i class="fas fa-ellipsis-v rev text-gray-700 text-sm" />-->
<!--      </button>-->

    </div>
    
  </div>
  <SendDialog  :show="OpenSend" @submit="send" @cancel="OpenSend = false"/>
  <MultiPointsList v-if="showPoint && activeItem == item.id" :pointList="pointList"  @close="showPoint = false"/>
</template>

<script setup>
import { ref, defineProps, provide, inject, computed } from 'vue'
import { useToast } from "vue-toast-notification"
import axios from "axios"
import { useAuthStore } from '../stores/auth';
import { AppStore } from '../stores/app'
import SendDialog from '../components/SendDialog.vue'
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
  else
    form.append("rec_phone", data.phone);

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
  let b = item.bounding;
  if (item.save < 0 ) {
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
  try {
    let pins = props.items;
    let item = props.item;
    const confirmed = window.confirm("آیا مطمئن هستید که می‌خواهید این پین را حذف کنید؟");
    if (!confirmed) return;

    const pinsDS = props.viewer.dataSources.getByName("pins")[0];
    const pin = pins.find(x => x.id == item.id)
    const index = pins.findIndex(x => x.id == item.id)
    if (pin.save > -1)
      await axios.delete(SERVER + '/api/delWork?id=' + pin.save + '&userId=' + authStore.user.id);

    if (pin) {
      if (pin.type == 'file') {
        props.viewer.dataSources.remove(pin.shape)
      } else {
        if (item.shape.type == 'multi_point') {
          const ds = props.viewer.dataSources.getByName(item.id)[0];
          props.viewer.dataSources.remove(ds, true);
        }
        pinsDS.entities.removeById(pin.id);
      }
      pins.splice(index, 1)
    }
    showMessage('گزینه مورد نظر حذف شد','success')
  } catch (e) {
    showMessage('خطا در حذف گزینه مورد نظر','error')
  }

}

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
    console.log(res.data)
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
      return 'fas fa-braille';
    case 'point' :
      return 'fas fa-location-pin';
    case 'polyline' :
      return 'fas fa-draw-polygon';
    case 'polygon' :
      return 'fas fa-bookmark';
    case 'circle' :
      return 'fas fa-circle';
    }
  } else
    return 'fa fa-file';
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
