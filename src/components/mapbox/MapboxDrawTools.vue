<template>
  <DrawToolbar
    ref="toolbarComponent"
    :map="map"
    :drawMode="drawMode"
    :pickForForm="pickForForm"
    :baseMaps="baseMaps"
    :intersectPanelOpen="intersectPanelOpen"
    @toggleMeasure="toggleMeasure"
    @togglePointPick="togglePointPick"
    @setDrawMode="setDrawMode"
    @setBaseLayer="$emit('setBaseLayer', $event)"
    @start-cut-mode="startCutMode"
    @openKroki="openKroki"
    @openAddressFinder="openAddressFinder"
    @openIntersectPanel="openIntersectPanel"
  />

  <MapboxKrokiDialog ref="krokiDialogRef" :map="map" :pins="pins" />
  <MapboxAddressFinder ref="addressFinderRef" :map="map" :hide-trigger="true" />

  <Transition name="modal">
    <div
      v-if="showForm"
      class="absolute inset-0 z-50 pointer-events-none"
      @contextmenu.prevent
    >
      <DrawPanel
        ref="panelComponent"
        :panelReady="panelReady"
        :panelPositioned="panelPositioned"
        :panelTranslate="panelTranslate"
        :title="getDrawTypeName()"
        :tabs="tabs"
        :activeTab="activeTab"
        :drawMode="drawMode"
        :shape="shape"
        :coordinateSystem="coordinateSystem"
        :livePointCount="livePointCount"
        :liveTotalLength="liveTotalLength"
        :liveArea="liveArea"
        :liveRadius="liveRadius"
        :liveCenter="liveCenter"
        :canFinishDrawing="canFinishDrawing"
        :displayPoints="displayPoints"
        :formData="formData"
        :attchFileName="attch_file?.name || ''"
        :nameError="nameError"
        :isSaveEnabled="isSaveEnabled"
        :formatCoordinate="formatCoordinate"
        @startDrag="startDrag"
        @cancel="cancelForm"
        @save="handleSave"
        @finish="finishCurrentDrawing"
        @applyManualCoords="applyManualUTMCoords"
        @update:activeTab="activeTab = $event"
        @update:coordinateSystem="coordinateSystem = $event"
        @update:formData="formData = $event"
        @fileChange="onFileChange"
        @update:shapeColor="onShapeColor($event)"
        @update:shapeOpacity="onShapeOpacity($event)"
        @update:shapeWidth="onShapeWidth($event)"
        @update:lineStyle="onShapeLineStyle($event)"
        @update:pointSymbol="onShapePointSymbol($event)"
        @copyCoordinates="copyCoordinates"
      />
    </div>
  </Transition>

  <IntersectPanel
    :panelOpen="intersectPanelOpen"
    :drawMode="drawMode"
    :intersectResults="intersectResults"
    :intersectSummary="intersectSummary"
    :overlapSourceLabel="overlapSourceLabel"
    :analyzing="intersectAnalyzing"
    :pins="pins"
    @startIntersectMode="startIntersectMode"
    @uploadKML="loadIntersectFromKML"
    @usePinLayers="loadIntersectFromPins"
    @clearIntersect="clearIntersect"
    @generateReport="generateIntersectReport"
    @exportCSV="exportIntersectReportCSV"
  />

  <Loading :active="loading" />
</template>

<script setup>
import { ref, watch, inject, nextTick } from "vue";
import Loading from "../Loading.vue";
import DrawToolbar from "./DrawToolbar.vue";
import DrawPanel from "./DrawPanel.vue";
import MapboxKrokiDialog from "./MapboxKrokiDialog.vue";
import MapboxAddressFinder from "./MapboxAddressFinder.vue";
import { useDrawing } from "../../composables/useDrawing";
import { useDragPanel } from "../../composables/useDragPanel";
import IntersectPanel from "./IntersectPanel.vue";
import {
  getDashArray,
  pointIcon,
  ensurePointSymbolImages,
} from "../../utils/drawStyle";

const props = defineProps({
  map: { type: Object, required: true },
  pins: { type: Object, required: true },
  baseMaps: { type: Array, default: () => [] },
});

const emit = defineEmits(["pickPoint", "setBaseLayer"]);

const SelectGroup = inject("SelectGroup", null);

const toolbarComponent = ref(null);
const panelComponent = ref(null);
const krokiDialogRef = ref(null);
const addressFinderRef = ref(null);

function openKroki() {
  krokiDialogRef.value?.open();
}
function openAddressFinder() {
  addressFinderRef.value?.openPanel?.();
}


const {
  loading,
  drawMode, // <--- اطمینان حاصل کنید این وجود دارد
  pickForForm,
  showForm,
  formData,
  shape,
  attch_file,
  nameError,
  activeTab,
  coordinateSystem,
  tabs,
  displayPoints,
  livePointCount,
  liveTotalLength,
  liveArea,
  liveRadius,
  liveCenter,
  canFinishDrawing,
  isSaveEnabled,
  togglePointPick,
  setDrawMode,
  toggleMeasure,
  cancelForm,
  handleSave,
  onFileChange,
  formatCoordinate,
  copyCoordinates,
  finishCurrentDrawing,
  applyManualUTMCoords,
  getDrawTypeName,
  inactiveDrawing,
  startCutMode,
  editingPin,
  intersectResults,
  intersectSummary,
  overlapSourceLabel,
  intersectAnalyzing,
  intersectPanelOpen,
  openIntersectPanel,
  startIntersectMode,
  loadIntersectFromKML,
  loadIntersectFromPins,
  clearIntersect,
  generateIntersectReport,
  exportIntersectReportCSV,
} = useDrawing(props.map, props.pins, emit, SelectGroup);

function applyShapeStyle() {
  if (!shape.value || !props.map) return;
  const s = shape.value;
  const opacity = s.opacity ?? 1;
  const map = props.map;
  // اگر در حال ویرایش پین موجود هستیم، لایه دائمی را به‌روز کن
  const pin = editingPin.value;
  if (pin) {
    pin.shape = shape.value;
    const sourceId = "draw-pin-" + pin.id;
    try {
      if (s.type === "polyline" && map.getLayer(sourceId + "-line")) {
        map.setPaintProperty(sourceId + "-line", "line-color", s.color || "#ff0000");
        map.setPaintProperty(sourceId + "-line", "line-width", s.width || 3);
        map.setPaintProperty(sourceId + "-line", "line-opacity", opacity);
        map.setPaintProperty(sourceId + "-line", "line-dasharray", getDashArray(s.dash));
      } else if (s.type === "polygon") {
        if (map.getLayer(sourceId + "-fill")) {
          map.setPaintProperty(sourceId + "-fill", "fill-color", s.color || "#ff0000");
          map.setPaintProperty(sourceId + "-fill", "fill-opacity", opacity);
        }
        if (map.getLayer(sourceId + "-line")) {
          map.setPaintProperty(sourceId + "-line", "line-color", s.outlineColor || s.color || "#ff0000");
          map.setPaintProperty(sourceId + "-line", "line-width", s.width || s.outlineWidth || 2);
          map.setPaintProperty(sourceId + "-line", "line-opacity", opacity);
        }
      } else if (s.type === "point" && map.getLayer(sourceId + "-point")) {
        map.setPaintProperty(sourceId + "-point", "circle-color", s.color || "#ff0000");
        map.setPaintProperty(sourceId + "-point", "circle-opacity", opacity);
        map.setPaintProperty(sourceId + "-point", "circle-stroke-opacity", opacity);
      } else if (s.type === "multi_point") {
        // رنگ و شکل در properties هر feature است — data را دوباره set کن
        if (Array.isArray(s.positions)) {
          s.positions.forEach((p) => {
            p.color = s.color || p.color || "#00ff00";
            p.symbol = s.symbol || p.symbol;
          });
        }
        const src = map.getSource(sourceId);
        if (src && Array.isArray(s.positions)) {
          const features = s.positions.map((p) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [p.lon, p.lat] },
            properties: {
              color: p.color || s.color || "#00ff00",
              icon: pointIcon(s.symbol || p.symbol),
            },
          }));
          src.setData({ type: "FeatureCollection", features });
        }
        if (map.getLayer(sourceId + "-points")) {
          const layer = map.getLayer(sourceId + "-points");
          if (layer.type === "symbol") {
            ensurePointSymbolImages(map);
            map.setPaintProperty(sourceId + "-points", "icon-opacity", opacity);
          } else {
            map.setPaintProperty(sourceId + "-points", "circle-opacity", opacity);
            map.setPaintProperty(sourceId + "-points", "circle-stroke-opacity", opacity);
          }
        }
      } else if (s.type === "circle") {
        if (map.getLayer(sourceId + "-fill")) {
          map.setPaintProperty(sourceId + "-fill", "fill-color", s.color || s.fillColor || "#0000ff");
          map.setPaintProperty(sourceId + "-fill", "fill-opacity", opacity);
        }
        if (map.getLayer(sourceId + "-line")) {
          map.setPaintProperty(sourceId + "-line", "line-color", s.outlineColor || s.color || "#0000ff");
          map.setPaintProperty(sourceId + "-line", "line-opacity", opacity);
        }
      }
    } catch (e) {
      console.warn("applyShapeStyle", e);
    }
  }
}

function onShapeColor(val) {
  if (shape.value) {
    shape.value.color = val;
    // برای multi_point رنگ هر نقطه هم هم‌راستا شود
    if (shape.value.type === "multi_point" && Array.isArray(shape.value.positions)) {
      shape.value.positions.forEach((p) => {
        p.color = val;
      });
    }
    if (shape.value.type === "polygon" || shape.value.type === "circle") {
      shape.value.outlineColor = val;
    }
  }
  applyShapeStyle();
}
function onShapeOpacity(val) {
  if (shape.value) shape.value.opacity = val;
  applyShapeStyle();
}
function onShapeWidth(val) {
  if (shape.value) shape.value.width = val;
  applyShapeStyle();
}
function onShapeLineStyle(val) {
  if (shape.value) shape.value.dash = val;
  applyShapeStyle();
}
function onShapePointSymbol(val) {
  if (shape.value) shape.value.symbol = val;
  applyShapeStyle();
}

const {
  panelReady,
  panelPositioned,
  panelTranslate,
  startDrag,
  positionPanelBesideToolbar,
} = useDragPanel(showForm);

watch(showForm, async (newVal) => {
  if (newVal) {
    await nextTick();
    const toolbarEl = toolbarComponent.value?.toolbarEl;
    const panelEl = panelComponent.value?.panelEl;
    positionPanelBesideToolbar(toolbarEl, panelEl);
  }
});

// <--- متغیرها و توابع جدید را expose می‌کنیم تا کامپوننت والد بتواند به آن‌ها دسترسی داشته باشد
defineExpose({
  inactiveDrawing,
  drawMode,
  startCutMode,
});
</script>

<!-- استایل‌ها بدون تغییر باقی می‌مانند -->
