<template>
  <div class="w-[80%]">
    <input type="checkbox" @click="callDraw(idx)" v-model="isActive" class="inline-block ml-2 accent-green-600"/>
    <span class="inline-block text-sm text-gray-800 truncate cursor-pointer w-[90%]" @click="zoomOnPin(idx)" :class="{ 'font-bold': !unread?? false }">{{ name }}</span>
  </div>

  <button
      class="text-green-600 hover:text-green-800  text-sm"
      @click="setDescr(idx)"
      title="توضیحات">
    <i class="fas fa-comment-dots text-[var(--primary-color)]  text-sm" />
  </button>
<!--  <button-->
<!--      class="text-green-600 hover:text-green-800  text-sm"-->
<!--      @click="callDraw(idx)"-->
<!--      title="خاموش کردن لایه">-->
<!--    <i :class="isActive ? 'fas fa-power-off text-green-500' : 'fas fa-power-off text-gray-400'" />-->
<!--  </button>-->
<!--  <button-->
<!--      class="text-green-600 hover:text-green-800"-->
<!--      @click="zoomOnPin(idx)"-->
<!--      title="نمایش روی نقشه">-->
<!--    <i class="fas fa-search text-[var(&#45;&#45;primary-color)]  text-sm" />-->
<!--  </button>-->
  <button
      class="text-green-600 hover:text-green-800"
      @click="remove(idx)"
      title="حذف">
    <i class="fas fa-trash text-gray-700  text-sm" />
  </button>

  <SendDialog  :show="OpenSend" @submit="send" @cancel="OpenSend = false"/>
  <Loading :active="loading" />

  <div  v-if="featureInfo" class="absolute top-[10px] right-[350px] bg-white shadow-lg rounded-xl p-4 w-80 max-h-[400px] overflow-auto">
    <h3 class="text-sm font-bold mb-2">توضیحات ارسالی : </h3>

    <button @click="featureInfo = false;" class="absolute top-[10px] left-[15px] text-gray-500 hover:text-red-600" >
      ✖
    </button>

    <span class="font-semibold"> </span>
    {{ description }}

  </div>

</template>

<script setup>
import { ref } from 'vue'
import {useAuthStore} from '../stores/auth';
import axios from 'axios';
import { useToast } from "vue-toast-notification";
import Loading from '../components/Loading.vue'
import SendDialog from '../components/SendDialog.vue'

const SERVER = import.meta.env.VITE_SERVER
const $toast = useToast();

const authStore = useAuthStore();
const loading = ref(false)
const isActive=ref(false)
const OpenSend=ref(false)
const featureInfo=ref(false)
const description=ref('')


const props = defineProps({
  name: {type: String, required: true},
  unread: {type: Boolean},
  id : {type: Number, required: true},
  idx : {type: Number, required: true},
  layer: {type: String, required: false},
  viewer: {type: Object, required: true},
  loadedFiles: {type: Array, required: true},
})

const emit = defineEmits(['drawInbox'])
async function callDraw(idx) {
  const pin = props.loadedFiles[idx].MyWork
  if (pin.type == 'file') {
    if (pin.shape) {
      pin.shape.show = !pin.shape.show;
      isActive.value = pin.shape.show;
    } else {
      emit('drawInbox', idx)
      isActive.value = true
    }
  } else {
    const drawDataSource = props.viewer.dataSources.getByName("inbox")[0];
    let entity = drawDataSource.entities.getById(pin.id);
    if (entity) {
      entity.show = !entity.show;
      isActive.value = entity.show;
    } else {
      emit('drawInbox', idx)
      isActive.value = true
    }
  }
}

const setDescr = async (idx) => {
  description.value = props.loadedFiles[idx].descr;
  if (description.value?.trim() !== '') {
    featureInfo.value = true;
  }
}

const zoomOnPin = async (idx) => {
  //const pin = props.pins.find(x => x.id == id)
  //console.log(JSON.stringify(props.loadedFiles))
  console.log(props.loadedFiles);
  if ( !isActive.value)
    showMessage('برای نمایش موقعیت ابتدا آیتم را فعال کنید', 'warning')
  const pin = props.loadedFiles[idx].MyWork;
  let b = pin.bounding;

  props.viewer.camera.flyToBoundingSphere(pin.bounding, {
    duration: 1.5,
    offset: new Cesium.HeadingPitchRange(
        0,
        -90,
        0
    )
  });

}

async function remove(idx) {
  const item = props.loadedFiles[idx];

  if (item) {
    const confirmed = window.confirm("آیا مطمئن هستید که می‌خواهید این سند را حذف کنید؟");
    if (!confirmed) return;

    try {
      const res = await axios.delete(SERVER + '/api/inbox/remove/' + item.id);
      if (item.MyWork) {
        if (item.MyWork.type == 'file')
          props.viewer.dataSources.remove(item.MyWork.shape, true)
        else {
          const ds = props.viewer.dataSources.getByName("inbox")[0];
          let entity = ds.entities.getById(item.MyWork.obj_id);
          ds.entities.remove(entity)
        }
      }
      props.loadedFiles.splice(idx, 1)

      showMessage('گزینه مورد نظر حذف شد','success')

    } catch (err) {
      console.error(err);
      showMessage('خطا در حذف گزینه مورد نظر','error')
    }
  }

}

function showMessage(msg , type) {
  $toast.open({
    message: msg,
    type: type,
    duration: 4000   // ۲ ثانیه
  });

}

</script>

<style scoped>
.rev {
  transform: scaleX(-1); /* افقی برعکس */
}
</style>