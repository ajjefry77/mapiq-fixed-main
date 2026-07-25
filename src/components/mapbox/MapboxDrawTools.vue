<template>
  <div ref="toolbarRef" class="absolute top-[calc(var(--top)+150px)] left-1 z-50">
    <div @click.stop class="flex flex-col rounded shadow-md p-2 gap-2">
      <button
        @click="toggleMeasure"
        title="اندازه گیری"
        style="margin: 0"
        class="w-8 h-8 rounded flex items-center justify-center shadow-md"
        :class="
          drawMode === 'measure'
            ? 'text-white bg-blue-500'
            : 'text-black bg-gray-200'
        "
      >
        <i class="fas fa-ruler m-1"></i>
      </button>
      <button
        @click="togglePointPick"
        :class="[
          'w-8 h-8 rounded flex items-center justify-center shadow-md',
          pickForForm ? 'text-white bg-blue-500' : 'text-black bg-gray-200',
        ]"
        title="نقطه (انتخاب برای فرم)"
      >
        <i class="fas fa-location-pin"></i>
      </button>
      <button
        @click="setDrawMode('multi_point')"
        :class="[
          'w-8 h-8 rounded flex items-center justify-center shadow-md',
          drawMode === 'multi_point'
            ? 'text-white bg-blue-500'
            : 'text-black bg-gray-200',
        ]"
        title="چند نقطه"
      >
        <i class="fas fa-braille"></i>
      </button>
      <button
        @click="setDrawMode('polyline')"
        :class="[
          'w-8 h-8 rounded flex items-center justify-center shadow-md',
          drawMode === 'polyline'
            ? 'text-white bg-blue-500'
            : 'text-black bg-gray-200',
        ]"
        title="خط"
      >
        <svg
          width="35"
          height="35"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line
            x1="25"
            y1="75"
            x2="75"
            y2="25"
            stroke-width="6"
            stroke="currentColor"
          />
          <circle cx="25" cy="75" r="6" fill="currentColor" />
          <circle cx="75" cy="25" r="6" fill="currentColor" />
        </svg>
      </button>
      <button
        @click="setDrawMode('polygon')"
        :class="[
          'w-8 h-8 rounded flex items-center justify-center shadow-md',
          drawMode === 'polygon'
            ? 'text-white bg-blue-500'
            : 'text-black bg-gray-200',
        ]"
        title="پلیگون"
      >
        <i class="fas fa-draw-polygon"></i>
      </button>
      <button
        @click="setDrawMode('circle')"
        :class="[
          'w-8 h-8 rounded flex items-center justify-center shadow-md',
          drawMode === 'circle'
            ? 'text-white bg-blue-500'
            : 'text-black bg-gray-200',
        ]"
        title="دایره"
      >
        <i class="fa fa-circle"></i>
      </button>
      <label
        class="w-8 h-8 flex items-center justify-center bg-gray-200 rounded shadow-md cursor-pointer"
        title="انتخاب رنگ"
      >
        <span class="w-5 h-5 rounded border" :style="{ backgroundColor: color }"></span>
        <input type="color" v-model="color" class="hidden" />
      </label>
    </div>
  </div>

  <!-- فرم شناور -->
  <transition name="fade">
    <div
      v-if="showForm"
      class="absolute inset-0 z-50 pointer-events-none"
      @contextmenu.prevent
    >
      <!-- پنل قابل جابه‌جایی -->
      <div
        ref="panelRef"
        v-show="panelReady"
        class="fixed bg-white rounded-lg shadow-2xl w-80 overflow-hidden pointer-events-auto z-50"
        :class="{ invisible: !panelPositioned }"
        :style="{
          left: panelTranslate.x + 'px',
          top: panelTranslate.y + 'px',
        }"
      >
        <!-- هدر نارنجی (قابل کشیدن) -->
        <div
          class="bg-orange-500 text-white px-4 py-2 flex justify-between items-center cursor-move"
          @mousedown="startDrag"
        >
          <button @click="cancelForm" class="hover:text-gray-200 text-lg">✕</button>
          <h3 class="font-bold text-sm">{{ getDrawTypeName() }}</h3>
        </div>

        <!-- تب‌ها -->
        <div class="flex border-b bg-gray-50">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'flex-1 py-1.5 text-xs transition-colors',
              activeTab === tab.key
                ? 'border-b-2 border-orange-500 text-orange-600 bg-white font-medium'
                : 'text-gray-500 hover:text-gray-700'
            ]"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- محتوای تب‌ها -->
        <div class="p-3 max-h-72 overflow-y-auto text-sm">
          <!-- تب توضیحات -->
          <div v-if="activeTab === 'info'" class="space-y-2">
            <div>
              <label class="block text-xs mb-1 text-gray-600">نام ترسیم</label>
              <input 
                v-model="formData.name" 
                placeholder="نام ترسیم را وارد کنید" 
                class="w-full border rounded p-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" 
              />
            </div>
            <div>
              <label class="block text-xs mb-1 text-gray-600">توضیحات</label>
              <textarea 
                v-model="formData.description" 
                placeholder="توضیحات اضافی..." 
                rows="2" 
                class="w-full border rounded p-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              ></textarea>
            </div>
            <div>
              <label class="block text-xs mb-1 text-gray-600">فایل ضمیمه</label>
              <input type="file" @change="onFileChange" class="w-full text-xs" />
              <p v-if="attch_file" class="mt-1 text-xs text-green-600">
                {{ attch_file.name }} انتخاب شد
              </p>
            </div>
          </div>

          <!-- تب استایل -->
          <div v-if="activeTab === 'style'" class="space-y-3">
            <div v-if="shape">
              <label class="block text-xs mb-1 text-gray-600">رنگ</label>
              <div class="flex gap-1 items-center">
                <input type="color" v-model="shape.color" class="w-8 h-8 border rounded cursor-pointer" />
                <input 
                  v-model="shape.color" 
                  class="flex-1 border rounded p-1 text-xs font-mono focus:border-orange-500 outline-none" 
                  placeholder="#ff0000"
                />
              </div>
            </div>
            
            <div v-if="shape">
              <label class="block text-xs mb-1 text-gray-600">
                شفافیت: {{ Math.round(shape.opacity * 100) }}%
              </label>
              <input 
                type="range" 
                v-model="shape.opacity" 
                min="0" 
                max="1" 
                step="0.1" 
                class="w-full accent-orange-500" 
              />
            </div>

            <div v-if="shape && shape.type !== 'circle' && shape.type !== 'multi_point'">
              <label class="block text-xs mb-1 text-gray-600">ضخامت خط</label>
              <input 
                type="number" 
                v-model="shape.width" 
                min="1" 
                max="10" 
                class="w-24 border rounded p-1 text-xs focus:border-orange-500 outline-none" 
              />
            </div>

            <div 
              v-if="shape"
              class="w-full h-16 rounded border-2 flex items-center justify-center text-xs"
              :style="{ 
                backgroundColor: shape.color + '30',
                borderColor: shape.color 
              }"
            >
              <span :style="{ color: shape.color }">پیش‌نمایش رنگ</span>
            </div>
            
            <div v-if="!shape" class="text-center py-4 text-gray-400 text-xs">
              <p>پس از اتمام ترسیم، استایل قابل تغییر است</p>
            </div>
          </div>

          <!-- تب تصویر -->
          <div v-if="activeTab === 'image'">
            <div v-if="!shape">
              <div class="text-center py-6">
                <div class="border-2 border-dashed border-gray-300 rounded p-4">
                  <p class="text-xs text-gray-400">پس از اتمام ترسیم می‌توانید تصویر اضافه کنید</p>
                </div>
              </div>
            </div>
            <div v-else-if="!shape.backgroundImage">
              <div class="text-center py-6">
                <div class="border-2 border-dashed border-gray-300 rounded p-4">
                  <p class="text-xs text-gray-400 mb-2">تصویری انتخاب نشده</p>
                  <label class="cursor-pointer inline-block">
                    <span class="px-3 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600">
                      انتخاب تصویر
                    </span>
                    <input 
                      type="file" 
                      @change="onBackgroundImageChange" 
                      accept="image/*" 
                      class="hidden" 
                    />
                  </label>
                </div>
              </div>
            </div>
            <div v-else class="space-y-2">
              <div class="relative group">
                <img :src="shape.backgroundImage" class="w-full rounded border" />
                <button 
                  @click="shape.backgroundImage = null" 
                  class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                  title="حذف تصویر"
                >
                  ✕
                </button>
              </div>
              <p class="text-xs text-green-600">تصویر با موفقیت بارگذاری شد</p>
            </div>
          </div>

          <!-- تب اندازه‌ها -->
          <div v-if="activeTab === 'measurements'" class="space-y-3">
            <div class="bg-orange-50 rounded p-2 text-xs space-y-1.5">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">تعداد نقاط:</span>
                <span class="font-bold text-orange-600">{{ livePointCount }}</span>
              </div>
              
              <div 
                v-if="drawMode === 'polyline' || drawMode === 'polygon' || shape?.type === 'polyline' || shape?.type === 'polygon'"
                class="flex justify-between items-center border-t border-orange-200 pt-1.5"
              >
                <span class="text-gray-600">طول کل:</span>
                <span class="font-bold text-orange-600">{{ liveTotalLength }}</span>
              </div>
              
              <div 
                v-if="drawMode === 'polygon' || shape?.type === 'polygon'"
                class="flex justify-between items-center border-t border-orange-200 pt-1.5"
              >
                <span class="text-gray-600">مساحت:</span>
                <span class="font-bold text-green-600">{{ liveArea }}</span>
              </div>
              
              <div 
                v-if="drawMode === 'circle' || shape?.type === 'circle'"
                class="flex justify-between items-center border-t border-orange-200 pt-1.5"
              >
                <span class="text-gray-600">شعاع:</span>
                <span class="font-bold text-purple-600">{{ liveRadius }}</span>
              </div>
            </div>

            <!-- مختصات نقاط -->
            <div>
              <h4 class="text-xs font-medium mb-2 text-gray-700">مختصات نقاط:</h4>
              <div class="space-y-1 max-h-32 overflow-y-auto">
                <div 
                  v-for="(point, index) in livePoints" 
                  :key="index" 
                  class="bg-gray-50 rounded p-1.5 text-xs flex justify-between items-center hover:bg-orange-50 transition group"
                >
                  <span class="text-gray-600">نقطه {{ index + 1 }}</span>
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs">
                      {{ point.lat.toFixed(6) }}, {{ point.lon.toFixed(6) }}
                    </span>
                    <button 
                      @click="copyCoordinates(point)" 
                      class="text-gray-400 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition"
                      title="کپی مختصات"
                    >
                      <i class="fas fa-copy text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
              <div v-if="livePoints.length === 0" class="text-center py-4 text-gray-400 text-xs">
                <p>در حال ترسیم روی نقشه کلیک کنید</p>
              </div>
            </div>
          </div>
        </div>

        <!-- دکمه‌های پایین -->
        <div class="px-3 py-2 bg-gray-50 border-t flex justify-between items-center">
          <button 
            @click="cancelForm" 
            class="px-3 py-1.5 text-gray-600 hover:text-red-600 text-xs transition"
          >
            انصراف
          </button>
          <button 
            @click="savePin" 
            :disabled="!shape"
            :class="[
              'px-4 py-1.5 rounded text-xs transition shadow',
              shape 
                ? 'bg-orange-500 text-white hover:bg-orange-600' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            ]"
          >
            ذخیره ترسیم
          </button>
        </div>
      </div>
    </div>
  </transition>

  <MultiPointsList v-if="drawMode === 'multi_point'" :pointList="pointList" />
  <Loading :active="loading" />
</template>

<script setup>
import { ref, reactive, toRaw, computed, watch, onMounted, onUnmounted, inject, nextTick } from "vue";
import mapboxgl from "mapbox-gl";
import axios from "axios";
import proj4 from "proj4";
import Loading from "../Loading.vue";
import MultiPointsList from "../MultiPointsList.vue";
import { useAuthStore } from "../../stores/auth";
import { useToast } from "vue-toast-notification";

const SERVER = import.meta.env.VITE_SERVER;
const authStore = useAuthStore();
const $toast = useToast();
const SelectGroup = inject("SelectGroup", null);

const props = defineProps({
  map: { type: Object, required: true },
  pins: { type: Object, required: true },
});

const emit = defineEmits(["disableFeatureInfo", "pickPoint"]);

// State
const loading = ref(false);
const drawMode = ref("");
const color = ref("#ff0000");
const pickForForm = ref(false);
const pointList = ref([]);
const positions = reactive([]);
const formData = ref({ name: "", description: "", file: null });
const showForm = ref(false);
const shape = ref(null);
const attch_file = ref(null);
const activeTab = ref('info');
let radius = 0;
let circleCenter = null;
const tempCircle = ref(null);
let measurePoints = [];
const measureActive = ref(false);

// ====== Draggable panel state ======
const toolbarRef = ref(null);
const panelRef = ref(null);
const panelReady = ref(false);
const panelPositioned = ref(false);
const isDragging = ref(false);
const panelTranslate = reactive({ x: 0, y: 0 });
const dragStart = reactive({ x: 0, y: 0 });

// موقعیت‌دهی پیش‌فرض بغل نوار ابزار (اولویت سمت راست چون تولبار چپه)
const positionPanelBesideToolbar = () => {
  if (!panelRef.value || !toolbarRef.value) return;

  const toolbarRect = toolbarRef.value.getBoundingClientRect();
  const panelRect = panelRef.value.getBoundingClientRect();
  const gap = 12;

  // همیشه اول سمت راست تولبار
  let x = toolbarRect.right + gap;
  let y = toolbarRect.top;

  // اگر از سمت راست صفحه بیرون زد → سمت چپ تولبار
  if (x + panelRect.width > window.innerWidth - gap) {
    x = toolbarRect.left - panelRect.width - gap;
  }

  // اگر باز هم بیرون زد → به لبه راست صفحه بچسبون
  if (x < gap) {
    x = window.innerWidth - panelRect.width - gap;
  }

  // کنترل بالا و پایین
  if (y + panelRect.height > window.innerHeight - gap) {
    y = window.innerHeight - panelRect.height - gap;
  }
  if (y < gap) {
    y = gap;
  }

  panelTranslate.x = x;
  panelTranslate.y = y;
};

// درگ کردن
const startDrag = (e) => {
  isDragging.value = true;
  dragStart.x = e.clientX - panelTranslate.x;
  dragStart.y = e.clientY - panelTranslate.y;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  e.preventDefault();
};

const onDrag = (e) => {
  if (!isDragging.value) return;
  panelTranslate.x = e.clientX - dragStart.x;
  panelTranslate.y = e.clientY - dragStart.y;
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

// Event handlers
let mouseMoveHandler = null;
let clickHandler = null;
let dblClickHandler = null;
let rightClickHandler = null;
let keyHandler = null;

// Source IDs
let drawDataSourceId = "pins-draw-" + crypto.randomUUID();
let tempSourceId = null;
let tempLayerIds = [];

// Tabs
const tabs = [
  { key: 'info', label: 'توضیحات' },
  { key: 'style', label: 'استایل' },
  { key: 'image', label: 'تصویر' },
  { key: 'measurements', label: 'اندازه‌ها' }
];

// Computed
const livePoints = computed(() => {
  if (shape.value) return getAllPoints();
  if (drawMode.value === 'circle' && tempCircle.value) return [{ lat: tempCircle.value.center.lat, lon: tempCircle.value.center.lng }];
  if (positions.length > 0) return positions.map(p => ({ lat: p.lat, lon: p.lng }));
  return [];
});
const livePointCount = computed(() => {
  if (shape.value) return getPointsCount();
  if (drawMode.value === 'circle' && tempCircle.value) return 1;
  return positions.length;
});
const liveTotalLength = computed(() => {
  if (shape.value) return calculateTotalLength();
  const points = livePoints.value;
  if (points.length < 2) return '0 m';
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += measureDistance([points[i-1].lon, points[i-1].lat], [points[i].lon, points[i].lat]);
  }
  return formatDistance(total);
});
const liveArea = computed(() => {
  if (shape.value) return calculateArea();
  if (drawMode.value !== 'polygon') return '0 m²';
  const points = livePoints.value;
  if (points.length < 3) return '0 m²';
  let area = 0;
  const coords = points.map(p => {
    const zone = Math.floor((p.lon + 180) / 6) + 1;
    return proj4('EPSG:4326', `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`, [p.lon, p.lat]);
  });
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  area = Math.abs(area) / 2;
  return area > 1000000 ? (area / 1000000).toFixed(2) + ' km²' : area.toFixed(2) + ' m²';
});
const liveRadius = computed(() => {
  if (shape.value && shape.value.type === 'circle') return formatDistance(shape.value.radius);
  if (tempCircle.value) return formatDistance(tempCircle.value.radius);
  return '0 m';
});

watch(shape, (newVal) => {
  if (newVal && showForm.value) {
    tempCircle.value = null;
    circleCenter = null;
  }
}, { deep: true });

watch(showForm, async (newVal) => {
  if (newVal) {
    panelReady.value = false;
    panelPositioned.value = false;
    await nextTick();
    panelReady.value = true;
    await nextTick();
    positionPanelBesideToolbar();
    panelPositioned.value = true;
  } else {
    panelReady.value = false;
    panelPositioned.value = false;
  }
});

onMounted(() => {
  if (!props.map.getSource(drawDataSourceId)) {
    props.map.addSource(drawDataSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
});

onUnmounted(() => {
  cleanupHandlers();
  clearTempLayers();
});

function clearTempLayers() {
  tempLayerIds.forEach((id) => {
    if (props.map.getLayer(id)) props.map.removeLayer(id);
  });
  tempLayerIds = [];
  if (tempSourceId && props.map.getSource(tempSourceId)) {
    props.map.removeSource(tempSourceId);
    tempSourceId = null;
  }
}

function cleanupHandlers() {
  if (mouseMoveHandler) {
    props.map.off("mousemove", mouseMoveHandler);
    mouseMoveHandler = null;
  }
  if (clickHandler) {
    props.map.off("click", clickHandler);
    clickHandler = null;
  }
  if (dblClickHandler) {
    props.map.off("dblclick", dblClickHandler);
    dblClickHandler = null;
  }
  if (rightClickHandler) {
    props.map.off("contextmenu", rightClickHandler);
    rightClickHandler = null;
  }
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
  props.map.getCanvas().style.cursor = "default";
}

function togglePointPick() {
  emit("disableFeatureInfo");
  if (pickForForm.value) {
    cancelPointPick();
    return;
  }
  if (clickHandler) cleanupHandlers();
  drawMode.value = "";
  pickForForm.value = true;
  startPointPick();
}

function startPointPick() {
  props.map.getCanvas().style.cursor = "crosshair";
  clickHandler = (e) => {
    const { lng, lat } = e.lngLat;
    cleanupHandlers();
    pickForForm.value = false;
    drawMode.value = "";
    emit("pickPoint", { lat, lng });
  };
  props.map.on("click", clickHandler);
}

function cancelPointPick() {
  cleanupHandlers();
  pickForForm.value = false;
}

function setDrawMode(mode) {
  emit("disableFeatureInfo");
  pickForForm.value = false;
  
  if (drawMode.value === mode && showForm.value) return;
  
  measureActive.value = false;
  cleanupHandlers();
  drawMode.value = mode;
  activeTab.value = 'info';
  positions.length = 0;
  shape.value = null;
  pointList.value = [];
  tempCircle.value = null;
  circleCenter = null;
  
  showForm.value = true;
  
  setTimeout(() => {
    startDrawing();
  }, 100);
}

function startDrawing() {
  const map = props.map;
  map.getCanvas().style.cursor = "crosshair";

  if (drawMode.value === "multi_point") {
    tempSourceId = "temp-" + crypto.randomUUID();
    map.addSource(tempSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const pointsLayerId = tempSourceId + "-points";
    map.addLayer({
      id: pointsLayerId,
      type: "circle",
      source: tempSourceId,
      paint: { "circle-radius": 5, "circle-color": color.value, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1 },
    });
    tempLayerIds.push(pointsLayerId);

    clickHandler = (e) => {
      const { lng, lat } = e.lngLat;
      const src = map.getSource(tempSourceId);
      if (!src) return;
      const data = src._data ? JSON.parse(JSON.stringify(src._data)) : { type: "FeatureCollection", features: [] };
      data.features.push({ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: { color: color.value } });
      src.setData(data);
      positions.push({ lng, lat, color: color.value });
      const zone = Math.floor((lng + 180) / 6) + 1;
      const [x, y] = proj4("EPSG:4326", `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`, [lng, lat]);
      pointList.value.push({ id: crypto.randomUUID(), row: pointList.value.length + 1, x: Number(x).toFixed(3), y: Number(y).toFixed(3) });
    };

    rightClickHandler = () => {
      if (positions.length < 1) return;
      cleanupHandlers();
      finishDrawing("multi_point", [...positions]);
    };

    map.on("click", clickHandler);
    map.on("contextmenu", rightClickHandler);
  } else if (drawMode.value === "polyline") {
    tempSourceId = "temp-" + crypto.randomUUID();
    map.addSource(tempSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const lineLayerId = tempSourceId + "-line";
    const pointsLayerId = tempSourceId + "-points";
    map.addLayer({ id: lineLayerId, type: "line", source: tempSourceId, paint: { "line-color": color.value, "line-width": 3 } });
    map.addLayer({ id: pointsLayerId, type: "circle", source: tempSourceId, filter: ["==", "$type", "Point"], paint: { "circle-radius": 5, "circle-color": "#ffff00", "circle-stroke-color": "#000000", "circle-stroke-width": 2 } });
    tempLayerIds.push(lineLayerId, pointsLayerId);

    clickHandler = (e) => { positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat }); updateTempGeoJSON(); };
    mouseMoveHandler = (e) => { if (positions.length === 0) return; const pts = [...positions, { lng: e.lngLat.lng, lat: e.lngLat.lat }]; updateTempGeoJSONWithPreview(pts); };
    rightClickHandler = () => { if (positions.length > 0) { positions.pop(); updateTempGeoJSON(); if (positions.length < 2) cleanupHandlers(); } };
    dblClickHandler = () => { if (positions.length < 2) return; if (positions.length > 1) positions.pop(); cleanupHandlers(); finishDrawing("polyline", [...positions]); };
    keyHandler = (event) => { if (event.key === "Delete" && positions.length > 0) { positions.pop(); updateTempGeoJSON(); if (positions.length < 2) cleanupHandlers(); } };
    window.addEventListener("keydown", keyHandler);
    map.on("click", clickHandler);
    map.on("mousemove", mouseMoveHandler);
    map.on("contextmenu", rightClickHandler);
    map.on("dblclick", dblClickHandler);
  } else if (drawMode.value === "polygon") {
    tempSourceId = "temp-" + crypto.randomUUID();
    map.addSource(tempSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const fillLayerId = tempSourceId + "-fill";
    const outlineLayerId = tempSourceId + "-outline";
    const pointsLayerId = tempSourceId + "-points";
    map.addLayer({ id: fillLayerId, type: "fill", source: tempSourceId, paint: { "fill-color": color.value, "fill-opacity": 0.4 } });
    map.addLayer({ id: outlineLayerId, type: "line", source: tempSourceId, paint: { "line-color": color.value, "line-width": 3 } });
    map.addLayer({ id: pointsLayerId, type: "circle", source: tempSourceId, filter: ["==", "$type", "Point"], paint: { "circle-radius": 6, "circle-color": "#ffff00", "circle-stroke-color": "#000000", "circle-stroke-width": 2 } });
    tempLayerIds.push(fillLayerId, outlineLayerId, pointsLayerId);

    clickHandler = (e) => { positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat }); updateTempGeoJSON(); };
    mouseMoveHandler = (e) => { if (positions.length === 0) return; const pts = [...positions, { lng: e.lngLat.lng, lat: e.lngLat.lat }]; updateTempGeoJSONWithPreview(pts); };
    rightClickHandler = () => { if (positions.length > 0) { positions.pop(); updateTempGeoJSON(); if (positions.length < 3) cleanupHandlers(); } };
    dblClickHandler = () => { if (positions.length < 3) return; if (positions.length > 0) positions.pop(); cleanupHandlers(); finishDrawing("polygon", [...positions]); };
    keyHandler = (event) => { if (event.key === "Delete" && positions.length > 0) { positions.pop(); updateTempGeoJSON(); if (positions.length < 3) cleanupHandlers(); } };
    window.addEventListener("keydown", keyHandler);
    map.on("click", clickHandler);
    map.on("mousemove", mouseMoveHandler);
    map.on("contextmenu", rightClickHandler);
    map.on("dblclick", dblClickHandler);
  } else if (drawMode.value === "circle") {
    circleCenter = null;
    tempCircle.value = null;
    tempSourceId = "temp-" + crypto.randomUUID();
    map.addSource(tempSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const fillLayerId = tempSourceId + "-fill";
    const outlineLayerId = tempSourceId + "-outline";
    map.addLayer({ id: fillLayerId, type: "fill", source: tempSourceId, paint: { "fill-color": color.value, "fill-opacity": 0.5 } });
    map.addLayer({ id: outlineLayerId, type: "line", source: tempSourceId, paint: { "line-color": color.value, "line-width": 2 } });
    tempLayerIds.push(fillLayerId, outlineLayerId);

    clickHandler = (e) => {
      if (!circleCenter) {
        circleCenter = [e.lngLat.lng, e.lngLat.lat];
        tempCircle.value = { center: { lat: circleCenter[1], lng: circleCenter[0] }, radius: 0 };
      } else {
        cleanupHandlers();
        finishDrawing("circle", { center: { lng: circleCenter[0], lat: circleCenter[1] }, radius });
      }
    };
    mouseMoveHandler = (e) => {
      if (!circleCenter) return;
      const dx = (e.lngLat.lng - circleCenter[0]) * 111319.9 * Math.cos((circleCenter[1] * Math.PI) / 180);
      const dy = (e.lngLat.lat - circleCenter[1]) * 110540;
      radius = Math.sqrt(dx * dx + dy * dy);
      tempCircle.value = { center: { lat: circleCenter[1], lng: circleCenter[0] }, radius: radius };
      const coords = [];
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * 2 * Math.PI;
        const rLat = circleCenter[1] + (radius / 110540) * Math.sin(angle);
        const rLng = circleCenter[0] + (radius / (111319.9 * Math.cos((circleCenter[1] * Math.PI) / 180))) * Math.cos(angle);
        coords.push([rLng, rLat]);
      }
      coords.push(coords[0]);
      const src = map.getSource(tempSourceId);
      if (src) src.setData({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} }] });
    };
    map.on("click", clickHandler);
    map.on("mousemove", mouseMoveHandler);
  }
}

function updateTempGeoJSON() {
  const src = props.map.getSource(tempSourceId);
  if (!src) return;
  const lineCoords = positions.map(p => [p.lng, p.lat]);
  const pointFeatures = positions.map(p => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: {} }));
  const features = [...pointFeatures];
  if (lineCoords.length >= 2) {
    if (drawMode.value === "polygon" && lineCoords.length >= 3) {
      features.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [[...lineCoords, lineCoords[0]]] }, properties: {} });
    } else {
      features.push({ type: "Feature", geometry: { type: "LineString", coordinates: lineCoords }, properties: {} });
    }
  }
  src.setData({ type: "FeatureCollection", features });
}

function updateTempGeoJSONWithPreview(pts) {
  const src = props.map.getSource(tempSourceId);
  if (!src) return;
  const lineCoords = pts.map(p => [p.lng, p.lat]);
  const pointFeatures = pts.map((p, i) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { isPreview: i === pts.length - 1 } }));
  const features = [...pointFeatures];
  if (lineCoords.length >= 2) {
    if (drawMode.value === "polygon" && lineCoords.length >= 3) {
      features.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [[...lineCoords, lineCoords[0]]] }, properties: {} });
    } else {
      features.push({ type: "Feature", geometry: { type: "LineString", coordinates: lineCoords }, properties: {} });
    }
  }
  src.setData({ type: "FeatureCollection", features });
}

function finishDrawing(draw, pos) {
  cleanupHandlers();
  props.map.getCanvas().style.cursor = "default";

  const defaultOpacity = 0.7;
  const defaultWidth = 3;

  if (draw === "circle") {
    shape.value = { type: "circle", center: pos.center, radius, color: color.value, opacity: defaultOpacity, width: defaultWidth, backgroundImage: null, show: true };
    tempCircle.value = null;
    circleCenter = null;
  } else if (draw === "multi_point") {
    shape.value = { type: "multi_point", positions: pos.map(p => ({ lon: p.lng, lat: p.lat, height: 0, color: p.color })), color: color.value, opacity: defaultOpacity, width: 5, backgroundImage: null, show: true };
  } else if (draw === "polyline") {
    shape.value = { type: draw, positions: pos.map(p => ({ lon: p.lng, lat: p.lat, height: 0 })), color: color.value, opacity: defaultOpacity, width: 3, backgroundImage: null, show: true };
  } else if (draw === "polygon") {
    const coords = pos.map(p => ({ lon: p.lng, lat: p.lat, height: 0 }));
    coords.push(coords[0]);
    shape.value = { type: "polygon", positions: coords, color: color.value, outlineColor: color.value, opacity: defaultOpacity, width: defaultWidth, backgroundImage: null, show: true };
  }

  positions.length = 0;
  clearTempLayers();
}

function toggleMeasure() {
  emit("disableFeatureInfo");
  measureActive.value = !measureActive.value;
  if (measureActive.value) {
    drawMode.value = "measure";
    startMeasure();
  } else {
    drawMode.value = "";
    stopMeasure();
  }
}

function startMeasure() {
  const map = props.map;
  measurePoints = [];
  const tempId = "measure-temp-" + crypto.randomUUID();

  map.addSource(tempId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  const lineLayerId = tempId + "-line";
  const pointsLayerId = tempId + "-points";
  const labelsLayerId = tempId + "-labels";
  map.addLayer({ id: lineLayerId, type: "line", source: tempId, paint: { "line-color": "#00ff00", "line-width": 3 } });
  map.addLayer({ id: pointsLayerId, type: "circle", source: tempId, filter: ["==", "$type", "Point"], paint: { "circle-radius": 8, "circle-color": "#ff0000" } });
  map.addLayer({ id: labelsLayerId, type: "symbol", source: tempId, filter: ["has", "distance"], layout: { "text-field": ["get", "distance"], "text-size": 14, "text-offset": [0, -1.5] }, paint: { "text-color": "#000000", "text-halo-color": "#ffffff", "text-halo-width": 2 } });

  tempSourceId = tempId;
  tempLayerIds.push(lineLayerId, pointsLayerId, labelsLayerId);

  clickHandler = (e) => {
    measurePoints.push([e.lngLat.lng, e.lngLat.lat]);
    const features = [];
    measurePoints.forEach(p => features.push({ type: "Feature", geometry: { type: "Point", coordinates: p }, properties: {} }));
    if (measurePoints.length >= 2) {
      features.push({ type: "Feature", geometry: { type: "LineString", coordinates: measurePoints }, properties: {} });
      let totalDist = 0;
      for (let i = 1; i < measurePoints.length; i++) totalDist += measureDistance(measurePoints[i - 1], measurePoints[i]);
      const lastPt = measurePoints[measurePoints.length - 1];
      const label = totalDist > 1000 ? (totalDist / 1000).toFixed(2) + " km" : totalDist.toFixed(0) + " m";
      features.push({ type: "Feature", geometry: { type: "Point", coordinates: lastPt }, properties: { distance: label } });
    }
    const src = map.getSource(tempId);
    if (src) src.setData({ type: "FeatureCollection", features });
  };

  rightClickHandler = () => {
    measurePoints = [];
    const src = map.getSource(tempId);
    if (src) src.setData({ type: "FeatureCollection", features: [] });
  };

  map.on("click", clickHandler);
  map.on("contextmenu", rightClickHandler);
}

function measureDistance([lng1, lat1], [lng2, lat2]) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function stopMeasure() {
  cleanupHandlers();
  measurePoints = [];
  measureActive.value = false;
  clearTempLayers();
}

const cancelForm = () => {
  shape.value = null;
  clearTempLayers();
  cleanupHandlers();
  showForm.value = false;
  drawMode.value = "";
  formData.value = { name: "", description: "", file: null };
  attch_file.value = null;
  tempCircle.value = null;
  circleCenter = null;
  positions.length = 0;
  pointList.value = [];
  
  if (props.map.getSource(drawDataSourceId)) {
    props.map.getSource(drawDataSourceId).setData({ type: "FeatureCollection", features: [] });
  }
  props.map.getCanvas().style.cursor = "default";
};

const onFileChange = (e) => {
  attch_file.value = e.target.files[0];
};

const savePin = async () => {
  if (!formData.value.name.trim()) {
    alert("لطفاً نام ترسیم را وارد کنید");
    return;
  }
  
  let pin = {
    id: crypto.randomUUID(),
    name: formData.value.name,
    descr: formData.value.description,
    shape: toRaw(shape.value),
    date: new Date(),
    save: -1,
    type: "draw",
  };
  
  if (attch_file.value) {
    pin.filename = attch_file.value.name;
    pin.file = attch_file.value;
  }
  
  if (SelectGroup.value !== null) {
    pin.parent_id = props.pins[SelectGroup.value].save ?? -1;
    props.pins[SelectGroup.value].children.push(pin);
  } else {
    pin.parent_id = -1;
    props.pins.push(pin);
  }

  drawMode.value = "";
  showForm.value = false;
  formData.value = { name: "", description: "", file: null };
  attch_file.value = null;
  tempCircle.value = null;
  circleCenter = null;
  
  await saveOneWorks(pin);
};

const saveOneWorks = async (item) => {
  if (!authStore.user) return;
  loading.value = true;
  try {
    const fd = new FormData();
    fd.append("type", item.type);
    fd.append("name", item.name);
    fd.append("obj_id", item.id);
    fd.append("parent_id", item.parent_id);
    if (item.type === "file") fd.append("file", item.file);
    else fd.append("content", JSON.stringify(toRaw(item.shape)));
    
    const response = await axios.post(SERVER + "/api/Save/myWork/" + authStore.user?.id, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    
    if (response.data?.id) item.save = response.data.id;
  } catch (err) {
    console.error("خطا در ذخیره‌سازی:", err);
  } finally {
    loading.value = false;
  }
};

// Helper functions
function getDrawTypeName() {
  const names = {
    'circle': 'دایره',
    'polygon': 'چندضلعی',
    'polyline': 'خط',
    'multi_point': 'چند نقطه'
  };
  return names[shape.value?.type] || 'ترسیم جدید';
}

function getPointsCount() {
  if (!shape.value) return 0;
  if (shape.value.type === 'circle') return 1;
  if (shape.value.type === 'multi_point') return shape.value.positions?.length || 0;
  const positions = shape.value.positions || [];
  return positions.length > 0 ? positions.length - 1 : 0;
}

function getAllPoints() {
  if (!shape.value) return [];
  if (shape.value.type === 'circle') return [{ lat: shape.value.center.lat, lon: shape.value.center.lng }];
  const positions = shape.value.positions || [];
  if (shape.value.type === 'polygon' && positions.length > 1) return positions.slice(0, -1);
  return positions;
}

function calculateTotalLength() {
  const points = getAllPoints();
  if (points.length < 2) return '0 m';
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += measureDistance([points[i-1].lon, points[i-1].lat], [points[i].lon, points[i].lat]);
  }
  return formatDistance(total);
}

function calculateArea() {
  if (!shape.value || shape.value.type !== 'polygon') return '0 m²';
  const points = getAllPoints();
  if (points.length < 3) return '0 m²';
  let area = 0;
  const coords = points.map(p => {
    const zone = Math.floor((p.lon + 180) / 6) + 1;
    return proj4('EPSG:4326', `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`, [p.lon, p.lat]);
  });
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  area = Math.abs(area) / 2;
  return area > 1000000 ? (area / 1000000).toFixed(2) + ' km²' : area.toFixed(2) + ' m²';
}

function formatDistance(meters) {
  if (meters > 1000) return (meters / 1000).toFixed(2) + ' km';
  return meters.toFixed(0) + ' m';
}

function copyCoordinates(point) {
  const text = `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`;
  navigator.clipboard.writeText(text).then(() => {
    if ($toast) $toast.success("مختصات کپی شد");
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    if ($toast) $toast.success("مختصات کپی شد");
  });
}

function onBackgroundImageChange(e) {
  const file = e.target.files[0];
  if (file && shape.value) {
    const reader = new FileReader();
    reader.onload = (event) => {
      shape.value.backgroundImage = event.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function inactiveDrawing() {
  shape.value = null;
  clearTempLayers();
  cleanupHandlers();
  showForm.value = false;
  drawMode.value = "";
  measureActive.value = false;
  positions.length = 0;
  tempCircle.value = null;
  circleCenter = null;
  pointList.value = [];
  
  if (props.map.getSource(drawDataSourceId)) {
    props.map.getSource(drawDataSourceId).setData({ type: "FeatureCollection", features: [] });
  }
  props.map.getCanvas().style.cursor = "default";
}

defineExpose({ inactiveDrawing });
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.invisible {
  visibility: hidden;
}
.max-h-72::-webkit-scrollbar,
.max-h-32::-webkit-scrollbar {
  width: 4px;
}
.max-h-72::-webkit-scrollbar-track,
.max-h-32::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.max-h-72::-webkit-scrollbar-thumb,
.max-h-32::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}
.max-h-72::-webkit-scrollbar-thumb:hover,
.max-h-32::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}
</style>