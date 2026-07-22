<template>
  <div class="absolute top-[calc(var(--top)+25px)] left-[12px]">
    <button @click="toggleHandler" title="اطلاعات"
            :class="['w-8 h-8 rounded flex items-center justify-center shadow-md', isActive ? 'text-white bg-blue-500' : 'text-black bg-gray-200']">
      <i class="fas fa-info font-bold"></i>
    </button>
  </div>

  <div v-if="featureInfo" class="absolute bottom-[10px] right-[350px] bg-white shadow-lg rounded-xl p-4 w-80 max-h-[500px] min-h-[250px]">
    <button @click="cancel" class="absolute top-[10px] left-[15px] text-gray-500 hover:text-red-600">✖</button>
    <button @click="clearSelection" class="absolute top-[10px] left-[40px] text-gray-500 hover:text-green-600">
      <i class="fas fa-check"/>
    </button>
    <div class="flex mb-2">
      <button class="px-2 py-1 text-sm rounded"
              :class="activeTab === 'info' ? 'bg-blue-500 text-white' : 'bg-white border'"
              @click="activeTab = 'info'">مشخصات</button>
      <button class="px-2 py-1 text-sm rounded"
              :class="activeTab === 'edit' ? 'bg-blue-500 text-white' : 'bg-white border'"
              @click="activeTab = 'edit'">استایل</button>
    </div>

    <div v-if="activeTab === 'info'">
      <div class="flex flex-col gap-2 items-center justify-between mt-0 mb-2">
        <input type="text" v-model="shapeName" class="w-full h-8 text-sm cursor-pointer px-2 border border-gray-400 rounded"/>
        <ul class="space-y-1 text-sm w-full">
          <li v-if="featureInfo.description" class="max-h-[300px] w-full overflow-y-auto">
            <span class="font-semibold">توضیحات : </span>
            <span class="font-semibold" dir="rtl" v-html="featureInfo.description"></span>
          </li>
          <li v-if="featureInfo.length" class="mt-4">
            <span class="font-semibold leading-loose">طول : </span>{{ featureInfo.length }}
          </li>
          <li v-if="featureInfo.perimeter">
            <span class="font-semibold leading-loose mt-1">محیط : </span>{{ featureInfo.perimeter }}
          </li>
          <li v-if="featureInfo.area">
            <span class="font-semibold leading-loose mt-1">مساحت : </span>{{ featureInfo.area }}
          </li>
        </ul>
      </div>
    </div>

    <div v-if="activeTab === 'edit'">
      <div class="h-4"/>
      <div v-if="showBgColor" class="flex items-center justify-between mt-1 mb-2">
        <span class="text-sm"> رنگ زمینه :</span>
        <label class="w-8 h-8 flex items-center justify-center bg-gray-200 rounded shadow-md cursor-pointer" title="انتخاب رنگ">
          <span class="w-5 h-5" :style="{ backgroundColor: bgColor }"></span>
          <input type="color" v-model="bgColor" @change="applyStyle" class="w-40 h-8 cursor-pointer"/>
        </label>
      </div>
      <div v-if="showBgColor" class="w-full">
        <label class="text-sm font-semibold">شفافیت: {{ transparency }}%</label>
        <input type="range" min="0" max="100" v-model="transparency" class="w-full" @change="applyStyle"/>
      </div>
      <div v-if="showBorderColor" class="flex items-center justify-between mt-1 mb-2">
        <span class="text-sm"> رنگ حاشیه :</span>
        <label class="w-8 h-8 flex items-center justify-center bg-gray-200 rounded shadow-md cursor-pointer" title="انتخاب رنگ">
          <span class="w-5 h-5" :style="{ backgroundColor: borderColor }"></span>
          <input type="color" v-model="borderColor" @change="applyStyle" class="w-40 h-8 cursor-pointer"/>
        </label>
      </div>
      <div v-if="showWidth" class="flex items-center justify-between mt-1 mb-2">
        <span class="text-sm"> عرض خط :</span>
        <input type="number" v-model="widthVal" class="w-40 h-8 cursor-pointer px-3 border border-gray-400 rounded"/>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const props = defineProps({
  map: Object,
  pins: Object
});

const bgColor = ref('#ff0000');
const borderColor = ref('#0000ff');
const widthVal = ref(3);
const shapeName = ref('');
const showBgColor = ref(false);
const transparency = ref(50);
const showBorderColor = ref(false);
const showWidth = ref(false);
const selectFeatureId = ref(null);
const activeTab = ref('info');
const isActive = ref(true);
const featureInfo = ref(null);

const emit = defineEmits(["disableDrawing"]);

let clickHandler = null;

function toggleHandler() {
  if (!isActive.value) activate();
  else deactivate();
}

function activate() {
  if (!props.map) return;
  emit("disableDrawing");
  isActive.value = true;
  props.map.getCanvas().style.cursor = 'crosshair';
  clickHandler = (e) => onMapClick(e);
  props.map.on('click', clickHandler);
}

function deactivate() {
  isActive.value = false;
  if (clickHandler) {
    props.map.off('click', clickHandler);
    clickHandler = null;
  }
  clearSelection();
}

function disableEdit() {
  isActive.value = false;
  if (clickHandler) {
    props.map.off('click', clickHandler);
    clickHandler = null;
  }
  props.map.getCanvas().style.cursor = 'default';
  featureInfo.value = null;
}

function onMapClick(e) {
  const features = props.map.queryRenderedFeatures(e.point, { layers: undefined });
  if (!features || features.length === 0) return;

  const feature = features[0];
  const layerId = feature.layer?.id;
  if (!layerId) return;

  selectFeatureId.value = feature.id || layerId;
  showFeatureInfo(feature, layerId);
  enableEditing(feature, layerId);
}

function showFeatureInfo(feature, layerId) {
  const info = {};
  const props_data = feature.properties || {};

  if (props_data.description) info.description = props_data.description;

  const geometry = feature.geometry?.type;

  if (geometry === 'LineString') {
    let length = 0;
    const coords = feature.geometry.coordinates;
    for (let i = 1; i < coords.length; i++) {
      length += measureDistance(coords[i - 1], coords[i]);
    }
    info.length = formatLength(length);
  }

  if (geometry === 'Polygon') {
    const coords = feature.geometry.coordinates[0];
    let perimeter = 0;
    for (let i = 1; i < coords.length; i++) {
      perimeter += measureDistance(coords[i - 1], coords[i]);
    }
    perimeter += measureDistance(coords[coords.length - 1], coords[0]);
    info.perimeter = formatLength(perimeter);
    info.area = formatArea(calculatePolygonArea(coords));
  }

  shapeName.value = props_data.name || '';
  featureInfo.value = info;

  getEntityStyle(layerId);
}

function getEntityStyle(layerId) {
  showBgColor.value = false;
  showBorderColor.value = false;
  showWidth.value = false;

  const layer = props.map.getLayer(layerId);
  if (!layer) return;

  const type = layer.type;

  if (type === 'fill') {
    showBgColor.value = true;
    showBorderColor.value = true;
    try {
      bgColor.value = rgbToHex(props.map.getPaintProperty(layerId, 'fill-color'));
    } catch (e) {}
    try {
      borderColor.value = rgbToHex(props.map.getPaintProperty(layerId, 'fill-outline-color') || '#000000');
    } catch (e) {}
    const opacity = props.map.getPaintProperty(layerId, 'fill-opacity');
    if (opacity !== undefined) transparency.value = Math.round((1 - opacity) * 100);
  }

  if (type === 'line') {
    showBorderColor.value = true;
    showWidth.value = true;
    try {
      borderColor.value = rgbToHex(props.map.getPaintProperty(layerId, 'line-color'));
    } catch (e) {}
    widthVal.value = props.map.getPaintProperty(layerId, 'line-width') || 3;
  }

  if (type === 'circle') {
    showBgColor.value = true;
    showWidth.value = true;
    try {
      bgColor.value = rgbToHex(props.map.getPaintProperty(layerId, 'circle-color'));
    } catch (e) {}
    widthVal.value = props.map.getPaintProperty(layerId, 'circle-radius') || 5;
  }

  const pre_bg = bgColor.value;
  const pre_bd = borderColor.value;
  const pre_w = widthVal.value;
  const pre_tr = transparency.value;
}

function rgbToHex(color) {
  if (!color) return '#000000';
  if (typeof color === 'string' && color.startsWith('#')) return color;
  if (Array.isArray(color)) {
    const r = Math.round(color[0] * 255);
    const g = Math.round(color[1] * 255);
    const b = Math.round(color[2] * 255);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  return '#000000';
}

function applyStyle() {
  if (!selectFeatureId.value) return;
  const layerId = selectFeatureId.value;
  const layer = props.map.getLayer(layerId);
  if (!layer) return;

  const type = layer.type;

  if (type === 'fill') {
    const alpha = 1 - (transparency.value / 100);
    const c = hexToRgb(bgColor.value);
    props.map.setPaintProperty(layerId, 'fill-color', [c.r / 255, c.g / 255, c.b / 255, alpha]);
    if (borderColor.value) {
      const bc = hexToRgb(borderColor.value);
      props.map.setPaintProperty(layerId, 'fill-outline-color', [bc.r / 255, bc.g / 255, bc.b / 255, 1]);
    }
  }

  if (type === 'line') {
    const c = hexToRgb(borderColor.value);
    props.map.setPaintProperty(layerId, 'line-color', [c.r / 255, c.g / 255, c.b / 255, 1]);
    if (widthVal.value) props.map.setPaintProperty(layerId, 'line-width', Number(widthVal.value));
  }

  if (type === 'circle') {
    const c = hexToRgb(bgColor.value);
    props.map.setPaintProperty(layerId, 'circle-color', [c.r / 255, c.g / 255, c.b / 255, 1]);
    if (widthVal.value) props.map.setPaintProperty(layerId, 'circle-radius', Number(widthVal.value));
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
}

function calculatePolygonArea(coords) {
  if (!coords || coords.length < 3) return 0;
  const R = 6371000;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lon1, lat1] = coords[i].map(v => v * Math.PI / 180);
    const [lon2, lat2] = coords[(i + 1) % coords.length].map(v => v * Math.PI / 180);
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs(area * R * R / 2.0);
}

function measureDistance([lng1, lat1], [lng2, lat2]) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatLength(m) {
  if (!m) return "0 متر";
  return m >= 1000 ? (m / 1000).toFixed(2) + " کیلومتر" : m.toFixed(2) + " متر";
}

function formatArea(a) {
  if (!a) return "0 متر مربع";
  return a >= 10000 ? (a / 10000).toFixed(2) + " هکتار" : a.toFixed(2) + " متر مربع";
}

function enableEditing(feature, layerId) {}

function clearSelection() {
  featureInfo.value = null;
  selectFeatureId.value = null;
  props.map.getCanvas().style.cursor = 'default';
  activate();
}

function cancel() {
  featureInfo.value = null;
  selectFeatureId.value = null;
  activate();
}

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

onMounted(() => {
  setTimeout(() => { activate(); }, 2500);
});

defineExpose({ toggleHandler, disableEdit });
</script>

<style scoped>
table tr td {
  text-align: right !important;
  font-family: 'Vazir', sans-serif;
}
</style>
