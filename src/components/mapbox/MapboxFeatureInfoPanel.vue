<template>
  <div class="absolute top-[calc(var(--top)+25px)] left-[12px]">
    <button
      @click="toggleHandler"
      title="اطلاعات"
      :class="[
        'w-8 h-8 rounded flex items-center justify-center shadow-md',
        isActive ? 'text-white bg-blue-500' : 'text-black bg-gray-200',
      ]"
    >
      <i class="fas fa-info font-bold"></i>
    </button>
  </div>

  <div
    v-if="featureInfo"
    class="absolute bottom-[10px] right-[350px] bg-white shadow-lg rounded-xl p-4 w-80 max-h-[500px] min-h-[250px]"
  >
    <button
      @click="cancel"
      class="absolute top-[10px] left-[15px] text-gray-500 hover:text-red-600"
    >
      ✖
    </button>
    <button
      @click="clearSelection"
      class="absolute top-[10px] left-[40px] text-gray-500 hover:text-green-600"
    >
      <i class="fas fa-check" />
    </button>
    <div class="flex mb-2">
      <button
        class="px-2 py-1 text-sm rounded"
        :class="
          activeTab === 'info' ? 'bg-blue-500 text-white' : 'bg-white border'
        "
        @click="activeTab = 'info'"
      >
        مشخصات
      </button>
      <button
        class="px-2 py-1 text-sm rounded"
        :class="
          activeTab === 'edit' ? 'bg-blue-500 text-white' : 'bg-white border'
        "
        @click="activeTab = 'edit'"
      >
        استایل
      </button>
    </div>

    <div v-if="activeTab === 'info'">
      <div class="flex flex-col gap-2 items-center justify-between mt-0 mb-2">
        <input
          type="text"
          v-model="shapeName"
          class="w-full h-8 text-sm cursor-pointer px-2 border border-gray-400 rounded"
        />
        <ul class="space-y-1 text-sm w-full">
          <li
            v-if="featureInfo.description"
            class="max-h-[300px] w-full overflow-y-auto"
          >
            <span class="font-semibold">توضیحات : </span>
            <span
              class="font-semibold"
              dir="rtl"
              v-html="featureInfo.description"
            ></span>
          </li>
          <li v-if="featureInfo.length" class="mt-4">
            <span class="font-semibold leading-loose">طول : </span
            >{{ featureInfo.length }}
          </li>
          <li v-if="featureInfo.perimeter">
            <span class="font-semibold leading-loose mt-1">محیط : </span
            >{{ featureInfo.perimeter }}
          </li>
          <li v-if="featureInfo.area">
            <span class="font-semibold leading-loose mt-1">مساحت : </span
            >{{ featureInfo.area }}
          </li>
        </ul>
      </div>
    </div>

    <div v-if="activeTab === 'edit'">
      <div class="h-4" />

      <!-- رنگ زمینه با پیش‌نمایش -->
      <div
        v-if="showBgColor"
        class="flex items-center justify-between mt-1 mb-2"
      >
        <span class="text-sm"> رنگ زمینه :</span>
        <div class="flex items-center gap-2">
          <label
            class="relative w-8 h-8 flex items-center justify-center bg-gray-200 rounded shadow-md cursor-pointer"
            title="انتخاب رنگ"
          >
            <div
              class="w-5 h-5 rounded border border-gray-300"
              :style="{ backgroundColor: bgColor }"
            ></div>
            <input
              type="color"
              v-model="bgColor"
              @input="applyStyle"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
          <span class="text-xs text-gray-500 font-mono">{{ bgColor }}</span>
        </div>
      </div>

      <!-- شفافیت -->
      <div v-if="showBgColor" class="w-full mt-2 mb-2">
        <label class="text-sm font-semibold">شفافیت: {{ transparency }}%</label>
        <input
          type="range"
          min="0"
          max="100"
          v-model="transparency"
          class="w-full"
          @input="applyStyle"
        />
      </div>

      <!-- رنگ حاشیه با پیش‌نمایش -->
      <div
        v-if="showBorderColor"
        class="flex items-center justify-between mt-1 mb-2"
      >
        <span class="text-sm"> رنگ حاشیه :</span>
        <div class="flex items-center gap-2">
          <label
            class="relative w-8 h-8 flex items-center justify-center bg-gray-200 rounded shadow-md cursor-pointer"
            title="انتخاب رنگ"
          >
            <div
              class="w-5 h-5 rounded border border-gray-300"
              :style="{ backgroundColor: borderColor }"
            ></div>
            <input
              type="color"
              v-model="borderColor"
              @input="applyStyle"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
          <span class="text-xs text-gray-500 font-mono">{{ borderColor }}</span>
        </div>
      </div>

      <!-- عرض خط -->
      <div v-if="showWidth" class="flex items-center justify-between mt-1 mb-2">
        <span class="text-sm"> عرض خط :</span>
        <input
          type="number"
          v-model="widthVal"
          @input="applyStyle"
          class="w-40 h-8 cursor-pointer px-3 border border-gray-400 rounded"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
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

const emit = defineEmits(["disableDrawing", "refreshPins", "pinUpdated"]);

let clickHandler = null;

let editHandlesSourceId = null;
let editLayerId = null;
let editCoords = [];
let editGeomType = null;
let editSourceId = null;
let isEditingActive = false;
let editedPin = null;
let originalFeature = null;
let editingLayerId = null;
let saveTimeout = null;

const editState = {
  isDragging: false,
  draggedIndex: null,
  mouseMoved: false,
};

let onEditMouseDown = null;
let onEditMouseMove = null;
let onEditMouseUp = null;
let onEditContextMenu = null;

function generateUniqueId() {
  return 'edit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

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
  
  if (isEditingActive) {
    if (editHandlesSourceId) {
      try {
        const handleFeatures = props.map.queryRenderedFeatures(e.point, { 
          layers: [editHandlesSourceId + '-points'] 
        });
        if (handleFeatures && handleFeatures.length > 0) return;
      } catch (err) {}
    }
    
    addVertexAtClick(e);
    return;
  }
  
  const features = props.map.queryRenderedFeatures(e.point);
  if (!features || features.length === 0) return;

  const feature = features[0];
  const layerId = feature.layer?.id;
  
  if (!layerId || (editHandlesSourceId && layerId.includes('edit-handles'))) return;

  selectFeatureId.value = feature.id || layerId;
  showFeatureInfo(feature, layerId);
  enableEditing(feature, layerId);
}

function addVertexAtClick(e) {
  if (!isEditingActive || !editCoords.length) return;
  
  const newCoord = [e.lngLat.lng, e.lngLat.lat];
  const insertIdx = findClosestEdgeIndex(newCoord, editGeomType === 'Polygon');
  editCoords.splice(insertIdx + 1, 0, newCoord);
  
  updateHandlesGeoJSON();
  updateOriginalGeometry();
  
  if (editedPin) {
    updatePinShape();
    scheduleSave();
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
    try { bgColor.value = rgbToHex(props.map.getPaintProperty(layerId, 'fill-color')); } catch (e) {}
    try { borderColor.value = rgbToHex(props.map.getPaintProperty(layerId, 'fill-outline-color') || '#000000'); } catch (e) {}
    const opacity = props.map.getPaintProperty(layerId, 'fill-opacity');
    if (opacity !== undefined) transparency.value = Math.round((1 - opacity) * 100);
  }

  if (type === 'line') {
    showBorderColor.value = true;
    showWidth.value = true;
    try { borderColor.value = rgbToHex(props.map.getPaintProperty(layerId, 'line-color')); } catch (e) {}
    widthVal.value = props.map.getPaintProperty(layerId, 'line-width') || 3;
  }

  if (type === 'circle') {
    showBgColor.value = true;
    showWidth.value = true;
    try { bgColor.value = rgbToHex(props.map.getPaintProperty(layerId, 'circle-color')); } catch (e) {}
    widthVal.value = props.map.getPaintProperty(layerId, 'circle-radius') || 5;
  }
}

function rgbToHex(color) {
  if (!color) return '#000000';
  if (typeof color === 'string' && color.startsWith('#')) return color;
  if (typeof color === 'string' && color.startsWith('rgb')) {
    const matches = color.match(/\d+/g);
    if (matches && matches.length >= 3) {
      return '#' + matches.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
    }
  }
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
  
  // ذخیره استایل
  if (editedPin) {
    scheduleSave();
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

  originalFeature = JSON.parse(JSON.stringify(feature));
  editingLayerId = layerId;
  editGeomType = geometry;
  
  if (geometry === 'LineString') {
    editCoords = feature.geometry.coordinates.map(c => [...c]);
  } else if (geometry === 'Polygon') {
    editCoords = feature.geometry.coordinates[0].map(c => [...c]);
    if (editCoords.length > 1 && 
        editCoords[0][0] === editCoords[editCoords.length - 1][0] && 
        editCoords[0][1] === editCoords[editCoords.length - 1][1]) {
      editCoords.pop();
    }
  }

  // پیدا کردن pin
  const featureId = feature.properties?.id || feature.id;
  editedPin = findPinById(props.pins, featureId);
  
  if (!editedPin && feature.properties?.name) {
    editedPin = findPinByName(props.pins, feature.properties.name);
  }

  console.log('✅ Found pin:', editedPin?.id, editedPin?.name);

  const layer = props.map.getLayer(layerId);
  if (layer) {
    editSourceId = layer.source;
    console.log('📦 Using source:', editSourceId);
  }

  isEditingActive = true;
  isEditingVertices.value = true;
  
  props.map.getCanvas().style.cursor = 'crosshair';
  
  editHandlesSourceId = 'edit-handles-' + generateUniqueId();
  editLayerId = 'edit-layer-' + generateUniqueId();
  
  setupVertexHandles();
}

function setupVertexHandles() {
  const map = props.map;
  if (!map || !editHandlesSourceId) return;

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

  map.addSource(editHandlesSourceId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

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
  if (!map || !editHandlesSourceId) return;
  
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
  if (!map || !editHandlesSourceId) return;
  
  unbindEditEvents();

  const handlesLayerId = editHandlesSourceId + '-points';

  onEditMouseDown = (e) => {
    if (!isEditingActive) return;
    
    try {
      const features = map.queryRenderedFeatures(e.point, { layers: [handlesLayerId] });
      if (!features || features.length === 0) return;

      e.preventDefault();
      if (e.originalEvent) e.originalEvent.preventDefault();

      editState.isDragging = true;
      editState.draggedIndex = features[0].properties.index;
      editState.mouseMoved = false;

      map.getCanvas().style.cursor = 'grabbing';
      if (map.dragPan) map.dragPan.disable();
    } catch (err) {}
  };

  onEditMouseMove = (e) => {
    if (!isEditingActive) return;
    
    if (!editState.isDragging) {
      try {
        const hoverFeatures = map.queryRenderedFeatures(e.point, { layers: [handlesLayerId] });
        map.getCanvas().style.cursor = hoverFeatures.length > 0 ? 'grab' : 'crosshair';
      } catch (err) {}
      return;
    }

    editState.mouseMoved = true;
    editCoords[editState.draggedIndex] = [e.lngLat.lng, e.lngLat.lat];
    
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
      scheduleSave();
    }
  };

  onEditContextMenu = (e) => {
    if (!isEditingActive) return;
    
    e.preventDefault();
    if (e.originalEvent) {
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
    }

    try {
      const features = map.queryRenderedFeatures(e.point, { layers: [handlesLayerId] });
      
      if (features && features.length > 0) {
        const idx = features[0].properties.index;
        
        if (editGeomType === 'Polygon' && editCoords.length <= 3) return;
        if (editGeomType === 'LineString' && editCoords.length <= 2) return;

        editCoords.splice(idx, 1);
        updateHandlesGeoJSON();
        updateOriginalGeometry();
        
        if (editedPin) {
          updatePinShape();
          scheduleSave();
        }
      }
    } catch (err) {}
  };

  map.on('mousedown', handlesLayerId, onEditMouseDown);
  map.on('mousemove', onEditMouseMove);
  map.on('mouseup', onEditMouseUp);
  map.on('contextmenu', onEditContextMenu);
}

function unbindEditEvents() {
  const map = props.map;
  if (!map) return;

  const handlesLayerId = editHandlesSourceId ? editHandlesSourceId + '-points' : null;

  if (handlesLayerId) {
    if (onEditMouseDown) {
      map.off('mousedown', handlesLayerId, onEditMouseDown);
      onEditMouseDown = null;
    }
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
  
  if (map.dragPan) map.dragPan.enable();
}

function disableVertexEditing() {
  // قبل از پاک کردن، ذخیره کن
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveNow();
  }
  
  unbindEditEvents();
  
  const map = props.map;
  if (!map) return;

  if (editHandlesSourceId) {
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
  }

  if (editLayerId) {
    try {
      if (map.getLayer(editLayerId)) map.removeLayer(editLayerId);
      if (map.getSource(editLayerId)) map.removeSource(editLayerId);
    } catch (e) {}
  }

  if (editingLayerId && map.getLayer(editingLayerId)) {
    map.setLayoutProperty(editingLayerId, 'visibility', 'visible');
  }

  isEditingActive = false;
  isEditingVertices.value = false;
  editCoords = [];
  editGeomType = null;
  editSourceId = null;
  editedPin = null;
  originalFeature = null;
  editingLayerId = null;
  editHandlesSourceId = null;
  editLayerId = null;
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
  
  if (!srcId || !map) return;

  let newCoords;
  if (editGeomType === 'LineString') {
    newCoords = editCoords.map(c => [...c]);
  } else if (editGeomType === 'Polygon') {
    const closedCoords = [...editCoords, [...editCoords[0]]];
    newCoords = [closedCoords];
  }

  const src = map.getSource(srcId);
  if (!src) return;

  if (src.type === 'geojson') {
    const currentData = src._data;
    const features = currentData?.features || [];
    
    const updatedFeatures = features.map(f => {
      const fId = f.properties?.id || f.id;
      const sId = selectFeatureId.value;
      
      if (fId == sId || f.properties?.name == shapeName.value || 
          (editedPin && (fId == editedPin.id || f.properties?.name == editedPin.name))) {
        return {
          ...f,
          geometry: {
            type: editGeomType,
            coordinates: newCoords
          }
        };
      }
      return f;
    });

    src.setData({
      type: 'FeatureCollection',
      features: updatedFeatures
    });
  }
}

function updatePinShape() {
  if (!editedPin) return;

  if (!editedPin.shape) {
    editedPin.shape = { positions: [] };
  }

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
  
  if (shapeName.value) {
    editedPin.name = shapeName.value;
  }
}

// سیستم ذخیره‌سازی با debounce
function scheduleSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveNow();
  }, 500); // 500ms delay
}

function saveNow() {
  if (!editedPin) return;

  updatePinShape();

  const pinToSave = {
    id: editedPin.id,
    name: editedPin.name || shapeName.value || 'بدون نام',
    type: editedPin.type || (editGeomType === 'Polygon' ? 'polygon' : 'polyline'),
    save: true,
    shape: editedPin.shape ? JSON.parse(JSON.stringify(editedPin.shape)) : null
  };

  console.log('💾 Saving pin:', pinToSave.id, pinToSave.name, 'positions:', pinToSave.shape?.positions?.length);

  // ذخیره در localStorage
  saveToLocalStorage(pinToSave);
  
  // ذخیره در سرور
  saveEditedPinToServer(pinToSave);
  
  // به‌روزرسانی parent
  emit("pinUpdated", pinToSave);
  emit("refreshPins");
}

function saveToLocalStorage(pin) {
  try {
    const key = `pin-${pin.id}`;
    const data = {
      id: pin.id,
      name: pin.name,
      type: pin.type,
      shape: pin.shape,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(data));
    console.log('💾 Saved to localStorage:', key);
  } catch (err) {
    console.warn('Could not save to localStorage:', err);
  }
}

async function saveEditedPinToServer(pin) {
  try {
    if (!pin.id) {
      console.error("❌ Pin ID is missing");
      return;
    }

    const userId = await getUserId();
    if (!userId) {
      console.error("❌ User ID not found");
      return;
    }

    const fd = new FormData();
    fd.append("type", pin.type);
    fd.append("name", pin.name);
    fd.append("obj_id", pin.id);
    fd.append("content", JSON.stringify(pin.shape));
    
    const response = await axios.post(`${SERVER}/api/Save/myWork/${userId}`, fd, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    
    console.log('✅ Server saved:', response.data?.id);
    return response.data;
  } catch (err) {
    console.error("❌ Server save failed:", err.response?.data || err.message);
    // حتی اگر خطا داد، داده در localStorage هست
  }
}

async function getUserId() {
  try {
    const res = await axios.get(`${SERVER}/api/auth/me`);
    return res.data?.data?.id ?? res.data?.id;
  } catch { 
    return null; 
  }
}

function clearSelection() {
  // ذخیره قبل از پاک کردن
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveNow();
  
  disableVertexEditing();
  featureInfo.value = null;
  selectFeatureId.value = null;
  if (props.map) {
    props.map.getCanvas().style.cursor = 'crosshair';
  }
  activate();
}

function cancel() {
  // کنسل بدون ذخیره
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  disableVertexEditing();
  featureInfo.value = null;
  selectFeatureId.value = null;
  activate();
}

function findPinById(items, id) {
  if (!items || id === undefined || id === null) return null;
  
  // اول localStorage رو چک کن
  const localPin = loadFromLocalStorage(id);
  
  for (const item of items) {
    if (!item) continue;
    
    if (String(item.id) === String(id) || item.id == id) {
      // اگر داده localStorage جدیدتره، از اون استفاده کن
      if (localPin && localPin.timestamp > (item._timestamp || 0)) {
        console.log('📂 Using localStorage version for:', id);
        item.shape = localPin.shape;
        item.name = localPin.name;
        item._timestamp = localPin.timestamp;
      }
      return item;
    }
    
    if (item.children && item.children.length) {
      const found = findPinById(item.children, id);
      if (found) return found;
    }
  }
  
  // اگر در pins پیدا نشد، از localStorage استفاده کن
  if (localPin) {
    console.log('📂 Pin found only in localStorage:', id);
    return localPin;
  }
  
  return null;
}

function findPinByName(items, name) {
  if (!items || !name) return null;
  
  for (const item of items) {
    if (!item) continue;
    
    if (item.name === name) return item;
    
    if (item.children && item.children.length) {
      const found = findPinByName(item.children, name);
      if (found) return found;
    }
  }
  return null;
}

function loadFromLocalStorage(pinId) {
  try {
    const key = `pin-${pinId}`;
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('Could not load from localStorage:', err);
  }
  return null;
}

// watch برای name changes
watch(shapeName, (newName) => {
  if (editedPin && newName && newName !== editedPin.name) {
    editedPin.name = newName;
    scheduleSave();
  }
});

onMounted(() => {
  setTimeout(() => { 
    if (props.map) activate(); 
  }, 2500);
});

onUnmounted(() => {
  // ذخیره نهایی
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveNow();
  
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
  font-family: "Vazir", sans-serif;
}
</style>
