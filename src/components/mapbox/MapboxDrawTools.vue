<template>
  <div class="absolute top-[calc(var(--top)+150px)] left-1 z-50">
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
        <span class="w-5 h-5" :style="{ backgroundColor: color }"></span>
        <input type="color" v-model="color" class="hidden" />
      </label>
    </div>
  </div>

  <transition name="fade">
    <div
      v-if="showForm"
      class="absolute inset-0 bg-black/40 flex items-end justify-end px-14 py-32 z-50"
      @contextmenu.prevent
    >
      <div class="bg-white rounded-2xl p-6 w-84 shadow-xl relative">
        <button
          @click="cancelForm"
          class="absolute top-4 left-4 text-gray-500 hover:text-black"
        >
          ✕
        </button>
        <h2 class="text-md font-semibold mb-3">افزودن ترسیم جدید</h2>
        <form @submit.prevent="savePin">
          <label class="block mb-2 text-sm font-medium">نام</label>
          <input
            v-model="formData.name"
            type="text"
            class="w-full border rounded-lg p-2 mb-3"
            required
          />
          <label class="block mb-2 text-sm font-medium">توضیحات</label>
          <textarea
            v-model="formData.description"
            class="w-full border rounded-lg p-2 mb-3"
            rows="3"
          ></textarea>
          <label class="block mb-2 text-sm font-medium">فایل ضمیمه</label>
          <input
            type="file"
            @change="onFileChange"
            class="w-full border rounded-lg p-2 mb-4"
          />
          <div class="flex justify-end gap-2">
            <button
              type="button"
              @click="cancelForm"
              class="px-4 py-2 bg-gray-300 rounded-lg"
            >
              لغو
            </button>
            <button
              type="button"
              @click="savePin"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ذخیره
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>

  <MultiPointsList v-if="drawMode === 'multi_point'" :pointList="pointList" />
  <Loading :active="loading" />
</template>

<script setup>
import { ref, toRaw, onMounted, onUnmounted, inject } from "vue";
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

const loading = ref(false);
const drawMode = ref("");
const color = ref("#ff0000");
const pickForForm = ref(false);
const drawings = ref([]);
const pointList = ref([]);
const positions = [];
let drawDataSourceId = "pins-draw-" + crypto.randomUUID();
let tempSourceId = null;
let tempLayerIds = [];
const emit = defineEmits(["disableFeatureInfo", "pickPoint"]);
const formData = ref({ name: "", description: "", file: null });
const showForm = ref(false);
const shape = ref(null);
const attch_file = ref(null);
let shape_id = "";
let radius = 0;
let measurePoints = [];
let measureEntities = [];
const measureActive = ref(false);

let mouseMoveHandler = null;
let clickHandler = null;
let dblClickHandler = null;
let rightClickHandler = null;
let keyHandler = null;

onMounted(() => {
  if (!props.map.getSource(drawDataSourceId)) {
    props.map.addSource(drawDataSourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
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
  if (drawMode.value !== "" && drawMode.value !== "measure") {
    finishDrawingCurrent();
    showForm.value = true;
    return;
  }
  measureActive.value = false;
  cleanupHandlers();
  drawMode.value = mode;
  startDrawing();
}

function startDrawing() {
  const map = props.map;
  map.getCanvas().style.cursor = "crosshair";

  if (drawMode.value === "multi_point") {
    tempSourceId = "temp-" + crypto.randomUUID();
    map.addSource(tempSourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: tempSourceId + "-points",
      type: "circle",
      source: tempSourceId,
      paint: {
        "circle-radius": 5,
        "circle-color": color.value,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1,
      },
    });

    clickHandler = (e) => {
      const { lng, lat } = e.lngLat;
      const src = map.getSource(tempSourceId);
      if (!src) return;
      const data = src._data
        ? JSON.parse(JSON.stringify(src._data))
        : { type: "FeatureCollection", features: [] };
      data.features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: { color: color.value },
      });
      src.setData(data);

      positions.push({ lng, lat, color: color.value });
      const zone = Math.floor((lng + 180) / 6) + 1;
      const [x, y] = proj4(
        "EPSG:4326",
        `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`,
        [lng, lat],
      );
      pointList.value.push({
        id: crypto.randomUUID(),
        row: pointList.value.length + 1,
        x: Number(x).toFixed(3),
        y: Number(y).toFixed(3),
      });
    };

    rightClickHandler = () => {
      if (positions.length < 1) return;
      cleanupHandlers();
      finishDrawing("multi_point", [...positions]);
      showForm.value = true;
    };

    map.on("click", clickHandler);
    map.on("contextmenu", rightClickHandler);
  } else if (drawMode.value === "polyline") {
    tempSourceId = "temp-" + crypto.randomUUID();
    map.addSource(tempSourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: tempSourceId + "-line",
      type: "line",
      source: tempSourceId,
      paint: { "line-color": color.value, "line-width": 3 },
    });
    map.addLayer({
      id: tempSourceId + "-points",
      type: "circle",
      source: tempSourceId,
      filter: ["==", "$type", "Point"],
      paint: {
        "circle-radius": 5,
        "circle-color": "#ffff00",
        "circle-stroke-color": "#000000",
        "circle-stroke-width": 2,
      },
    });

    clickHandler = (e) => {
      positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      updateTempGeoJSON();
    };

    mouseMoveHandler = (e) => {
      if (positions.length === 0) return;
      const pts = [...positions, { lng: e.lngLat.lng, lat: e.lngLat.lat }];
      updateTempGeoJSONWithPreview(pts);
    };

    rightClickHandler = () => {
      if (positions.length > 0) {
        positions.pop();
        updateTempGeoJSON();
        if (positions.length < 2) cleanupHandlers();
      }
    };

    dblClickHandler = () => {
      if (positions.length < 2) return;
      if (positions.length > 1) positions.pop();
      cleanupHandlers();
      finishDrawing("polyline", [...positions]);
      showForm.value = true;
    };

    keyHandler = (event) => {
      if (event.key === "Delete" && positions.length > 0) {
        positions.pop();
        updateTempGeoJSON();
        if (positions.length < 2) cleanupHandlers();
      }
    };
    window.addEventListener("keydown", keyHandler);

    map.on("click", clickHandler);
    map.on("mousemove", mouseMoveHandler);
    map.on("contextmenu", rightClickHandler);
    map.on("dblclick", dblClickHandler);
  } else if (drawMode.value === "polygon") {
    tempSourceId = "temp-" + crypto.randomUUID();
    map.addSource(tempSourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: tempSourceId + "-fill",
      type: "fill",
      source: tempSourceId,
      paint: { "fill-color": color.value, "fill-opacity": 0.4 },
    });
    map.addLayer({
      id: tempSourceId + "-outline",
      type: "line",
      source: tempSourceId,
      paint: { "line-color": color.value, "line-width": 3 },
    });
    map.addLayer({
      id: tempSourceId + "-points",
      type: "circle",
      source: tempSourceId,
      filter: ["==", "$type", "Point"],
      paint: {
        "circle-radius": 6,
        "circle-color": "#ffff00",
        "circle-stroke-color": "#000000",
        "circle-stroke-width": 2,
      },
    });

    clickHandler = (e) => {
      positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      updateTempGeoJSON();
    };

    mouseMoveHandler = (e) => {
      if (positions.length === 0) return;
      const pts = [...positions, { lng: e.lngLat.lng, lat: e.lngLat.lat }];
      updateTempGeoJSONWithPreview(pts);
    };

    rightClickHandler = () => {
      if (positions.length > 0) {
        positions.pop();
        updateTempGeoJSON();
        if (positions.length < 3) cleanupHandlers();
      }
    };

    dblClickHandler = () => {
      if (positions.length < 3) return;
      if (positions.length > 0) positions.pop();
      cleanupHandlers();
      finishDrawing("polygon", [...positions]);
      showForm.value = true;
    };

    keyHandler = (event) => {
      if (event.key === "Delete" && positions.length > 0) {
        positions.pop();
        updateTempGeoJSON();
        if (positions.length < 3) cleanupHandlers();
      }
    };
    window.addEventListener("keydown", keyHandler);

    map.on("click", clickHandler);
    map.on("mousemove", mouseMoveHandler);
    map.on("contextmenu", rightClickHandler);
    map.on("dblclick", dblClickHandler);
  } else if (drawMode.value === "circle") {
    let center = null;
    tempSourceId = "temp-" + crypto.randomUUID();
    map.addSource(tempSourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: tempSourceId + "-fill",
      type: "fill",
      source: tempSourceId,
      paint: { "fill-color": color.value, "fill-opacity": 0.5 },
    });
    map.addLayer({
      id: tempSourceId + "-outline",
      type: "line",
      source: tempSourceId,
      paint: { "line-color": color.value, "line-width": 2 },
    });

    clickHandler = (e) => {
      if (!center) {
        center = [e.lngLat.lng, e.lngLat.lat];
      } else {
        cleanupHandlers();
        finishDrawing("circle", {
          center: { lng: center[0], lat: center[1] },
          radius,
        });
        showForm.value = true;
      }
    };

    mouseMoveHandler = (e) => {
      if (!center) return;
      const dx =
        (e.lngLat.lng - center[0]) *
        111319.9 *
        Math.cos((center[1] * Math.PI) / 180);
      const dy = (e.lngLat.lat - center[1]) * 110540;
      radius = Math.sqrt(dx * dx + dy * dy);

      const coords = [];
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * 2 * Math.PI;
        const rLat = center[1] + (radius / 110540) * Math.sin(angle);
        const rLng =
          center[0] +
          (radius / (111319.9 * Math.cos((center[1] * Math.PI) / 180))) *
            Math.cos(angle);
        coords.push([rLng, rLat]);
      }
      coords.push(coords[0]);

      const src = map.getSource(tempSourceId);
      if (src) {
        src.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [coords] },
              properties: {},
            },
          ],
        });
      }
    };

    map.on("click", clickHandler);
    map.on("mousemove", mouseMoveHandler);
  }
}

function updateTempGeoJSON() {
  const map = props.map;
  const src = map.getSource(tempSourceId);
  if (!src) return;

  const lineCoords = positions.map((p) => [p.lng, p.lat]);
  const pointFeatures = positions.map((p) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    properties: {},
  }));

  const features = [...pointFeatures];
  if (lineCoords.length >= 2) {
    if (drawMode.value === "polygon" && lineCoords.length >= 3) {
      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[...lineCoords, lineCoords[0]]],
        },
        properties: {},
      });
    } else {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: lineCoords },
        properties: {},
      });
    }
  }

  src.setData({ type: "FeatureCollection", features });
}

function updateTempGeoJSONWithPreview(pts) {
  const map = props.map;
  const src = map.getSource(tempSourceId);
  if (!src) return;

  const lineCoords = pts.map((p) => [p.lng, p.lat]);
  const pointFeatures = pts.map((p, i) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    properties: { isPreview: i === pts.length - 1 },
  }));

  const features = [...pointFeatures];
  if (lineCoords.length >= 2) {
    if (drawMode.value === "polygon" && lineCoords.length >= 3) {
      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[...lineCoords, lineCoords[0]]],
        },
        properties: {},
      });
    } else {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: lineCoords },
        properties: {},
      });
    }
  }

  src.setData({ type: "FeatureCollection", features });
}

function finishDrawingCurrent() {
  if (drawMode.value === "multi_point") {
    finishDrawing("multi_point", [...positions]);
  } else if (drawMode.value === "polyline") {
    finishDrawing("polyline", [...positions]);
  } else if (drawMode.value === "polygon") {
    finishDrawing("polygon", [...positions]);
  }
}

function finishDrawing(draw, pos) {
  cleanupHandlers();
  props.map.getCanvas().style.cursor = "default";

  if (draw === "circle") {
    shape.value = {
      type: "circle",
      center: pos.center,
      radius,
      color: color.value,
      show: true,
    };
  } else if (draw === "multi_point") {
    shape.value = {
      type: "multi_point",
      positions: pos.map((p) => ({
        lon: p.lng,
        lat: p.lat,
        height: 0,
        color: p.color,
      })),
      width: 5,
      color: color.value,
      show: true,
    };
  } else if (draw === "polyline") {
    shape.value = {
      type: draw,
      positions: pos.map((p) => ({ lon: p.lng, lat: p.lat, height: 0 })),
      width: 3,
      color: color.value,
      show: true,
    };
  } else if (draw === "polygon") {
    const coords = pos.map((p) => ({ lon: p.lng, lat: p.lat, height: 0 }));
    coords.push(coords[0]);
    shape.value = {
      type: "polygon",
      positions: coords,
      color: color.value,
      outlineColor: color.value,
      show: true,
    };
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

  map.addSource(tempId, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addLayer({
    id: tempId + "-line",
    type: "line",
    source: tempId,
    paint: { "line-color": "#00ff00", "line-width": 3 },
  });
  map.addLayer({
    id: tempId + "-points",
    type: "circle",
    source: tempId,
    filter: ["==", "$type", "Point"],
    paint: { "circle-radius": 8, "circle-color": "#ff0000" },
  });
  map.addLayer({
    id: tempId + "-labels",
    type: "symbol",
    source: tempId,
    filter: ["has", "distance"],
    layout: {
      "text-field": ["get", "distance"],
      "text-size": 14,
      "text-offset": [0, -1.5],
    },
    paint: {
      "text-color": "#000000",
      "text-halo-color": "#ffffff",
      "text-halo-width": 2,
    },
  });

  tempSourceId = tempId;
  measureEntities = [tempId + "-line", tempId + "-points", tempId + "-labels"];

  clickHandler = (e) => {
    measurePoints.push([e.lngLat.lng, e.lngLat.lat]);
    const features = [];
    measurePoints.forEach((p) => {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: p },
        properties: {},
      });
    });
    if (measurePoints.length >= 2) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: measurePoints },
        properties: {},
      });
      let totalDist = 0;
      for (let i = 1; i < measurePoints.length; i++) {
        totalDist += measureDistance(measurePoints[i - 1], measurePoints[i]);
      }
      const lastPt = measurePoints[measurePoints.length - 1];
      const label =
        totalDist > 1000
          ? (totalDist / 1000).toFixed(2) + " km"
          : totalDist.toFixed(0) + " m";
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: lastPt },
        properties: { distance: label },
      });
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
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function stopMeasure() {
  cleanupHandlers();
  measurePoints = [];
  measureActive.value = false;
}

const cancelForm = () => {
  showForm.value = false;
  drawMode.value = "";
  positions.length = 0;
  clearTempLayers();
  props.map.getCanvas().style.cursor = "default";
};

const onFileChange = (e) => {
  attch_file.value = e.target.files[0];
};

const savePin = async () => {
  let pin = {
    id: crypto.randomUUID(),
    name: formData.value.name,
    descr: formData.value.description,
    shape: shape.value,
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
  await saveOneWorks(pin);
};

const saveOneWorks = async (item) => {
  if (!authStore.user) return;
  try {
    const fd = new FormData();
    fd.append("type", item.type);
    fd.append("name", item.name);
    fd.append("obj_id", item.id);
    fd.append("parent_id", item.parent_id);
    if (item.type === "file") fd.append("file", item.file);
    else fd.append("content", JSON.stringify(toRaw(item.shape)));
    await axios.post(SERVER + "/api/Save/myWork/" + authStore.user?.id, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } catch (err) {
    console.error(err);
  }
};

function inactiveDrawing() {
  showForm.value = false;
  cleanupHandlers();
  drawMode.value = "";
  measureActive.value = false;
  positions.length = 0;
  clearTempLayers();
}

defineExpose({ inactiveDrawing });
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
