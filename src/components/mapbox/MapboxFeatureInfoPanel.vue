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
        <input type="number" v-model="widthVal" @change="applyStyle" class="w-40 h-8 cursor-pointer px-3 border border-gray-400 rounded"/>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import axios from "axios";

const SERVER = import.meta.env.VITE_SERVER;

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
const isEditingVertices = ref(false);

const emit = defineEmits(["disableDrawing"]);

let clickHandler = null;

// متغیرهای ویرایش
let editHandlesSourceId = 'edit-handles-' + crypto.randomUUID();
let editLayerId = 'edit-layer-' + crypto.randomUUID();
let editCoords = [];
let editGeomType = null;
let editSourceId = null;
let isEditingActive = false;
let editedPin = null;
let originalFeature = null;
let editingLayerId = null;

const editState = {
  isDragging: false,
  draggedIndex: null,
  mouseMoved: false,
};

let onEditMouseDown = null;
let onEditMouseMove = null;
let onEditMouseUp = null;
let onEditContextMenu = null;
let onEditDblClick = null;

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
  disableVertexEditing();
  props.map.getCanvas().style.cursor = 'default';
  featureInfo.value = null;
}

function onMapClick(e) {
  if (editState.isDragging) return;
  
  // اول بررسی کن ببین روی هندل‌های ویرایش کلیک شده یا نه
  const handleFeatures = props.map.queryRenderedFeatures(e.point, { 
    layers: [editHandlesSourceId + '-points'] 
  });
  
  if (handleFeatures && handleFeatures.length > 0) {
    return; // کلیک روی هندل‌ها توسط event handlers خودشون مدیریت میشه
  }
  
  // اگر در حالت ویرایش هستیم و روی فضای خالی کلیک شده
  if (isEditingActive) {
    addVertexAtClick(e);
    return;
  }
  
  // بررسی feature های عادی
  const features = props.map.queryRenderedFeatures(e.point);
  if (!features || features.length === 0) return;

  const feature = features[0];
  const layerId = feature.layer?.id;
  
  if (!layerId || layerId === editHandlesSourceId + '-points') return;

  selectFeatureId.value = feature.id || layerId;
  showFeatureInfo(feature, layerId);
  enableEditing(feature, layerId);
}

function addVertexAtClick(e) {
  if (!isEditingActive) return;
  
  const newCoord = [e.lngLat.lng, e.lngLat.lat];
  let insertIdx;
  
  if (editGeomType === 'LineString' || editGeomType === 'Polygon') {
    insertIdx = findClosestEdgeIndex(newCoord, editGeomType === 'Polygon');
    editCoords.splice(insertIdx + 1, 0, newCoord);
  }
  
  updateHandlesGeoJSON();
  updateOriginalGeometry();
  
  if (editedPin) {
    updatePinShape();
    saveEditedPin();
  }
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
    props.map.setPaintProperty(layerId, 'fill-color', `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`);
    if (borderColor.value) {
      const bc = hexToRgb(borderColor.value);
      props.map.setPaintProperty(layerId, 'fill-outline-color', `rgba(${bc.r}, ${bc.g}, ${bc.b}, 1)`);
    }
  }

  if (type === 'line') {
    const c = hexToRgb(borderColor.value);
    props.map.setPaintProperty(layerId, 'line-color', `rgba(${c.r}, ${c.g}, ${c.b}, 1)`);
    if (widthVal.value) props.map.setPaintProperty(layerId, 'line-width', Number(widthVal.value));
  }

  if (type === 'circle') {
    const c = hexToRgb(bgColor.value);
    props.map.setPaintProperty(layerId, 'circle-color', `rgba(${c.r}, ${c.g}, ${c.b}, 1)`);
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

function enableEditing(feature, layerId) {
  disableVertexEditing();

  const geometry = feature.geometry?.type;
  if (geometry !== 'LineString' && geometry !== 'Polygon') return;

  // ذخیره feature اصلی برای بازگشت در صورت cancel
  originalFeature = JSON.parse(JSON.stringify(feature));
  editingLayerId = layerId;

  editGeomType = geometry;
  
  // استخراج مختصات
  if (geometry === 'LineString') {
    editCoords = feature.geometry.coordinates.map(c => [...c]);
  } else if (geometry === 'Polygon') {
    editCoords = feature.geometry.coordinates[0].map(c => [...c]);
    // حذف آخرین نقطه تکراری
    if (editCoords.length > 1 && 
        editCoords[0][0] === editCoords[editCoords.length - 1][0] && 
        editCoords[0][1] === editCoords[editCoords.length - 1][1]) {
      editCoords.pop();
    }
  }

  // پیدا کردن pin
  editedPin = findPinById(props.pins, feature.id || feature.properties?.id);

  // گرفتن source مربوط به این layer
  const layer = props.map.getLayer(layerId);
  if (layer) {
    editSourceId = layer.source;
  }

  isEditingActive = true;
  isEditingVertices.value = true;
  
  props.map.getCanvas().style.cursor = 'crosshair';
  
  setupVertexHandles();
}

function setupVertexHandles() {
  const map = props.map;
  if (!map) return;

  // حذف موارد قبلی
  if (map.getLayer(editHandlesSourceId + '-points')) {
    map.removeLayer(editHandlesSourceId + '-points');
  }
  if (map.getSource(editHandlesSourceId)) {
    map.removeSource(editHandlesSourceId);
  }

  // اضافه کردن source جدید برای هندل‌ها
  map.addSource(editHandlesSourceId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  // اضافه کردن layer برای نمایش نقاط
  map.addLayer({
    id: editHandlesSourceId + '-points',
    type: 'circle',
    source: editHandlesSourceId,
    paint: {
      'circle-radius': 8,
      'circle-color': '#ffffff',
      'circle-stroke-color': '#1e90ff',
      'circle-stroke-width': 3
    }
  });

  updateHandlesGeoJSON();
  bindEditEvents();
}

function updateHandlesGeoJSON() {
  const map = props.map;
  if (!map) return;
  
  const src = map.getSource(editHandlesSourceId);
  if (!src) return;

  const features = editCoords.map((coord, idx) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: coord },
    properties: { index: idx }
  }));

  src.setData({ type: 'FeatureCollection', features });
}

function bindEditEvents() {
  const map = props.map;
  if (!map) return;
  
  unbindEditEvents();

  onEditMouseDown = (e) => {
    if (!isEditingActive) return;
    
    const features = map.queryRenderedFeatures(e.point, { 
      layers: [editHandlesSourceId + '-points'] 
    });
    
    if (!features || features.length === 0) return;

    e.preventDefault();
    if (e.originalEvent) e.originalEvent.preventDefault();

    const idx = features[0].properties.index;
    editState.isDragging = true;
    editState.draggedIndex = idx;
    editState.mouseMoved = false;

    map.getCanvas().style.cursor = 'grabbing';
    if (map.dragPan) map.dragPan.disable();
  };

  onEditMouseMove = (e) => {
    if (!isEditingActive) return;
    
    if (!editState.isDragging) {
      const hoverFeatures = map.queryRenderedFeatures(e.point, { 
        layers: [editHandlesSourceId + '-points'] 
      });
      map.getCanvas().style.cursor = hoverFeatures.length > 0 ? 'grab' : 'crosshair';
      return;
    }

    editState.mouseMoved = true;
    const newCoord = [e.lngLat.lng, e.lngLat.lat];
    editCoords[editState.draggedIndex] = newCoord;
    
    // به‌روزرسانی همزمان
    updateHandlesGeoJSON();
    updateOriginalGeometry();
  };

  onEditMouseUp = () => {
    if (!editState.isDragging) return;

    const wasMoved = editState.mouseMoved;
    editState.isDragging = false;
    editState.draggedIndex = null;
    editState.mouseMoved = false;
    
    map.getCanvas().style.cursor = 'crosshair';
    if (map.dragPan) map.dragPan.enable();

    if (wasMoved && editedPin) {
      updatePinShape();
      saveEditedPin();
    }
  };

  onEditContextMenu = (e) => {
    if (!isEditingActive) return;
    e.preventDefault();

    const features = map.queryRenderedFeatures(e.point, { 
      layers: [editHandlesSourceId + '-points'] 
    });
    
    if (features && features.length > 0) {
      const idx = features[0].properties.index;
      
      if (editGeomType === 'Polygon' && editCoords.length <= 3) return;
      if (editGeomType === 'LineString' && editCoords.length <= 2) return;

      editCoords.splice(idx, 1);
      updateHandlesGeoJSON();
      updateOriginalGeometry();
      
      if (editedPin) {
        updatePinShape();
        saveEditedPin();
      }
    }
  };

  onEditDblClick = (e) => {
    if (!isEditingActive) return;

    const features = map.queryRenderedFeatures(e.point, { 
      layers: [editHandlesSourceId + '-points'] 
    });
    
    if (features && features.length > 0) {
      const idx = features[0].properties.index;
      
      if (editGeomType === 'Polygon' && editCoords.length <= 3) return;
      if (editGeomType === 'LineString' && editCoords.length <= 2) return;

      editCoords.splice(idx, 1);
      updateHandlesGeoJSON();
      updateOriginalGeometry();
      
      if (editedPin) {
        updatePinShape();
        saveEditedPin();
      }
    }
  };

  map.on('mousedown', editHandlesSourceId + '-points', onEditMouseDown);
  map.on('mousemove', onEditMouseMove);
  map.on('mouseup', onEditMouseUp);
  map.on('contextmenu', onEditContextMenu);
  map.on('dblclick', editHandlesSourceId + '-points', onEditDblClick);
}

function unbindEditEvents() {
  const map = props.map;
  if (!map) return;

  if (onEditMouseDown) {
    map.off('mousedown', editHandlesSourceId + '-points', onEditMouseDown);
    onEditMouseDown = null;
  }
  if (onEditMouseMove) {
    map.off('mousemove', onEditMouseMove);
    onEditMouseMove = null;
  }
  if (onEditMouseUp) {
    map.off('mouseup', onEditMouseUp);
    onEditMouseUp = null;
  }
  if (onEditContextMenu) {
    map.off('contextmenu', onEditContextMenu);
    onEditContextMenu = null;
  }
  if (onEditDblClick) {
    map.off('dblclick', editHandlesSourceId + '-points', onEditDblClick);
    onEditDblClick = null;
  }
  
  if (map.dragPan) map.dragPan.enable();
}

function disableVertexEditing() {
  unbindEditEvents();
  
  const map = props.map;
  if (!map) return;

  try {
    if (map.getLayer(editHandlesSourceId + '-points')) {
      map.removeLayer(editHandlesSourceId + '-points');
    }
  } catch (e) {}
  
  try {
    if (map.getSource(editHandlesSourceId)) {
      map.removeSource(editHandlesSourceId);
    }
  } catch (e) {}

  isEditingActive = false;
  isEditingVertices.value = false;
  editCoords = [];
  editGeomType = null;
  editSourceId = null;
  editedPin = null;
  originalFeature = null;
  editingLayerId = null;
  editState.isDragging = false;
  editState.draggedIndex = null;
  
  if (map.dragPan) map.dragPan.enable();
}

function findClosestEdgeIndex(point, isPolygon = false) {
  let minDist = Infinity;
  let insertIdx = 0;
  const len = editCoords.length;

  for (let i = 0; i < len; i++) {
    const a = editCoords[i];
    const b = editCoords[(i + 1) % len];
    const dist = pointToSegmentDistance(point, a, b);
    if (dist < minDist) {
      minDist = dist;
      insertIdx = i;
    }
  }
  return insertIdx;
}

function pointToSegmentDistance(p, a, b) {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

function updateOriginalGeometry() {
  const map = props.map;
  const srcId = editSourceId;
  
  if (!srcId || !map) {
    console.warn('❌ No source ID or map available');
    return;
  }

  const src = map.getSource(srcId);
  if (!src) {
    console.warn('❌ Source not found:', srcId);
    return;
  }

  console.log('✅ Source found:', srcId, 'Type:', src.type);

  // روش 1: اگر source از نوع geojson است
  if (src.type === 'geojson') {
    let newCoords;
    if (editGeomType === 'LineString') {
      newCoords = editCoords.map(c => [...c]);
    } else if (editGeomType === 'Polygon') {
      const closedCoords = [...editCoords, [...editCoords[0]]];
      newCoords = [closedCoords];
    }

    const updatedData = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: editGeomType,
          coordinates: newCoords
        },
        properties: originalFeature?.properties || {}
      }]
    };

    console.log('🔄 Updating GeoJSON source with new coordinates');
    src.setData(updatedData);
    return;
  }

  // روش 2: اگر source از نوع vector است (مثل tileset)
  if (src.type === 'vector') {
    console.log('📦 Vector source detected, trying alternative method...');
    
    // ساخت یک GeoJSON source موقت برای نمایش ویرایش
    const tempSourceId = 'temp-edit-' + crypto.randomUUID();
    const tempLayerId = 'temp-edit-layer-' + crypto.randomUUID();
    
    let newCoords;
    if (editGeomType === 'LineString') {
      newCoords = editCoords.map(c => [...c]);
    } else if (editGeomType === 'Polygon') {
      const closedCoords = [...editCoords, [...editCoords[0]]];
      newCoords = [closedCoords];
    }

    // حذف source موقت قبلی اگر وجود دارد
    if (map.getLayer(editLayerId)) {
      map.removeLayer(editLayerId);
    }
    if (map.getSource(editLayerId)) {
      map.removeSource(editLayerId);
    }

    // اضافه کردن source موقت
    map.addSource(editLayerId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: editGeomType,
            coordinates: newCoords
          },
          properties: originalFeature?.properties || {}
        }]
      }
    });

    // اضافه کردن layer موقت با همان استایل
    const originalLayer = map.getLayer(editingLayerId);
    if (originalLayer) {
      const layerConfig = {
        id: editLayerId,
        type: originalLayer.type,
        source: editLayerId,
      };

      // کپی paint properties
      if (originalLayer.type === 'line') {
        layerConfig.paint = {
          'line-color': map.getPaintProperty(editingLayerId, 'line-color') || '#000000',
          'line-width': map.getPaintProperty(editingLayerId, 'line-width') || 2,
          'line-opacity': map.getPaintProperty(editingLayerId, 'line-opacity') || 1
        };
      } else if (originalLayer.type === 'fill') {
        layerConfig.paint = {
          'fill-color': map.getPaintProperty(editingLayerId, 'fill-color') || '#000000',
          'fill-opacity': map.getPaintProperty(editingLayerId, 'fill-opacity') || 0.5,
          'fill-outline-color': map.getPaintProperty(editingLayerId, 'fill-outline-color') || '#000000'
        };
      }

      // مخفی کردن layer اصلی
      map.setLayoutProperty(editingLayerId, 'visibility', 'none');
      
      // اضافه کردن layer موقت
      map.addLayer(layerConfig);
      
      // به‌روزرسانی editSourceId برای استفاده در cancel
      editSourceId = editLayerId;
    }
    
    return;
  }

  console.warn('❌ Unknown source type:', src.type);
}

function updatePinShape() {
  if (!editedPin || !editedPin.shape) return;

  if (editGeomType === 'LineString') {
    editedPin.shape.positions = editCoords.map(c => ({ 
      lon: c[0], 
      lat: c[1], 
      height: 0 
    }));
  } else if (editGeomType === 'Polygon') {
    const coords = editCoords.map(c => ({ 
      lon: c[0], 
      lat: c[1], 
      height: 0 
    }));
    coords.push({ ...coords[0] });
    editedPin.shape.positions = coords;
  }
}

function saveEditedPin() {
  if (!editedPin) return;

  const pinToSave = {
    id: editedPin.id,
    name: editedPin.name || shapeName.value,
    type: editedPin.type,
    save: editedPin.save,
    shape: JSON.parse(JSON.stringify(editedPin.shape))
  };

  saveEditedPinToServer(pinToSave);
}

async function saveEditedPinToServer(pin) {
  try {
    const fd = new FormData();
    fd.append("type", pin.type);
    fd.append("name", pin.name);
    fd.append("obj_id", pin.id);
    fd.append("content", JSON.stringify(pin.shape));
    
    const userId = await getUserId();
    if (!userId) {
      console.error("❌ User ID not found");
      return;
    }
    
    const response = await axios.post(SERVER + '/api/Save/myWork/' + userId, fd, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    
    console.log('✅ Pin saved successfully:', response.data);
  } catch (err) {
    console.error("❌ خطا در ذخیره ویرایش:", err);
  }
}

async function getUserId() {
  try {
    const res = await axios.get(SERVER + '/api/auth/me');
    return res.data?.data?.id ?? res.data?.id;
  } catch { 
    console.error('❌ Error getting user ID');
    return null; 
  }
}

function clearSelection() {
  disableVertexEditing();
  featureInfo.value = null;
  selectFeatureId.value = null;
  props.map.getCanvas().style.cursor = 'crosshair';
  activate();
}

function cancel() {
  // برگرداندن layer اصلی به حالت visible
  if (editingLayerId && props.map.getLayer(editingLayerId)) {
    props.map.setLayoutProperty(editingLayerId, 'visibility', 'visible');
  }
  
  // حذف layer و source موقت
  try {
    if (props.map.getLayer(editLayerId)) {
      props.map.removeLayer(editLayerId);
    }
  } catch (e) {}
  
  try {
    if (props.map.getSource(editLayerId)) {
      props.map.removeSource(editLayerId);
    }
  } catch (e) {}
  
  disableVertexEditing();
  featureInfo.value = null;
  selectFeatureId.value = null;
  activate();
}

function findPinById(items, id) {
  if (!items) return null;
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

onUnmounted(() => {
  disableVertexEditing();
  if (clickHandler && props.map) {
    props.map.off('click', clickHandler);
  }
});

defineExpose({ toggleHandler, disableEdit });
</script>

<style scoped>
table tr td {
  text-align: right !important;
  font-family: 'Vazir', sans-serif;
}
</style>