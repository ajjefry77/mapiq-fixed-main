import {
  ref,
  reactive,
  toRaw,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
} from "vue";
import axios from "axios";
import { useAuthStore } from "../stores/auth";
import { useToast } from "vue-toast-notification";
import { useSharedArray } from "../stores/app";
import { registerDrawLayer, bringDrawingsToFront } from "../utils/layerOrder";
import {
  measureDistance,
  formatDistance,
  formatArea,
  formatVertexLabel,
  getDrawTypeName,
  toUTM,
  fromUTM,
  computeCentroid,
  computeCircleCoords,
} from "./useDrawingHelpers";
import { createCutHandler } from "./useDrawingCut";
import { createIntersectHandler } from "./useDrawingIntersect";
import {
  getDashArray,
  pointIcon,
  ensurePointSymbolImages,
} from "../utils/drawStyle";
const SERVER = import.meta.env.VITE_SERVER;
export function useDrawing(map, pins, emit, SelectGroup) {
  const authStore = useAuthStore();
  const $toast = useToast();
  const { addVisibleId } = useSharedArray();
  // Reactive state
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
  const activeTab = ref("measurements");
  const tempCircle = ref(null);
  const measurePoints = reactive([]);
  const measureActive = ref(false);
  const coordinateSystem = ref("utm");
  const editingPin = ref(null);
  const intersectActive = ref(false);
  const nameError = ref(false);
  // Non-reactive mutable state (shared across modules)
  const hs = {
    mouseMove: null,
    click: null,
    dblClick: null,
    rightClick: null,
    key: null,
    featureClick: null,
    styleLoad: null,
  };
  const es = {
    sourceId: null,
    haloLayerId: null,
    dragIndex: null,
    dragging: false,
    mouseDown: null,
    mouseMove: null,
    mouseUp: null,
  };
  const ts = {
    sourceId: null,
    layerIds: [],
    polygonLabelSourceId: null,
    lineLabelSourceId: null,
    extraSourceIds: [],
  };
  const cs = { radius: 0, center: null };
  const drawDataSourceId = "pins-draw-" + crypto.randomUUID();
  // Tabs
  const tabs = computed(() => {
    const list = [
      { key: "measurements", label: "ترسیم" },
      { key: "style", label: "استایل" },
    ];
    if (
      drawMode.value === "polygon" ||
      drawMode.value === "polyline" ||
      drawMode.value === "multi_point"
    ) {
      list.splice(1, 0, { key: "manual", label: "مختصات دستی" });
    }
    return list;
  });
  // Computed
  const livePoints = computed(() => {
    if (shape.value) return getAllPoints();
    if (drawMode.value === "circle" && tempCircle.value)
      return [
        { lat: tempCircle.value.center.lat, lon: tempCircle.value.center.lng },
      ];
    if (positions.length > 0)
      return positions.map((p) => ({ lat: p.lat, lon: p.lng }));
    return [];
  });
  const displayPoints = computed(() => {
    const src = measureActive.value ? measurePoints : livePoints.value;
    return src.map((p, i) => {
      const lon = Array.isArray(p) ? p[0] : p.lon || p.lng;
      const lat = Array.isArray(p) ? p[1] : p.lat;
      if (coordinateSystem.value === "utm") {
        const { x, y, zone } = toUTM(lon, lat);
        return {
          lat,
          lon,
          displayX: x,
          displayY: y,
          zone,
          system: "utm",
          index: i,
        };
      }
      return {
        lat,
        lon,
        displayX: lon,
        displayY: lat,
        system: "latlon",
        index: i,
      };
    });
  });
  const livePointCount = computed(() => {
    if (shape.value) return getPointsCount();
    if (drawMode.value === "circle" && tempCircle.value) return 1;
    if (measureActive.value) return measurePoints.length;
    return positions.length;
  });
  const computeTotalFromArr = (arr) => {
    if (arr.length < 2) return "0 m";
    let total = 0;
    for (let i = 1; i < arr.length; i++) {
      const a = arr[i - 1];
      const b = arr[i];
      total += measureDistance(
        Array.isArray(a) ? a : [a.lon || a.lng, a.lat],
        Array.isArray(b) ? b : [b.lon || b.lng, b.lat],
      );
    }
    return formatDistance(total);
  };
  const liveTotalLength = computed(() => {
    if (shape.value) return calculateTotalLength();
    if (measureActive.value) return computeTotalFromArr(measurePoints);
    return computeTotalFromArr(livePoints.value);
  });
  const liveArea = computed(() => {
    if (shape.value) return calculateArea();
    if (drawMode.value !== "polygon") return "0 m²";
    const points = livePoints.value;
    if (points.length < 3) return "0 m²";
    const coords = points.map((p) => {
      const { x, y } = toUTM(p.lon, p.lat);
      return [x, y];
    });
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      area += coords[i][0] * coords[j][1];
      area -= coords[j][0] * coords[i][1];
    }
    return formatArea(Math.abs(area) / 2);
  });
  const liveRadius = computed(() => {
    if (shape.value && shape.value.type === "circle")
      return formatDistance(shape.value.radius);
    if (tempCircle.value) return formatDistance(tempCircle.value.radius);
    return "0 m";
  });
  const liveCenter = computed(() => {
    if (shape.value?.type === "circle" && shape.value.center) {
      const c = shape.value.center;
      const lon = c.lng ?? c.lon;
      const lat = c.lat;
      if (coordinateSystem.value === "utm") {
        const { x, y, zone } = toUTM(lon, lat);
        return { lon, lat, displayX: x, displayY: y, zone, system: "utm" };
      }
      return { lon, lat, displayX: lon, displayY: lat, system: "latlon" };
    }
    if (tempCircle.value?.center) {
      const c = tempCircle.value.center;
      const lon = c.lng ?? c.lon;
      const lat = c.lat;
      if (coordinateSystem.value === "utm") {
        const { x, y, zone } = toUTM(lon, lat);
        return { lon, lat, displayX: x, displayY: y, zone, system: "utm" };
      }
      return { lon, lat, displayX: lon, displayY: lat, system: "latlon" };
    }
    const pts = livePoints.value;
    if (!pts || pts.length < 1) return null;
    const c = computeCentroid(pts);
    if (!c) return null;
    if (coordinateSystem.value === "utm") {
      const { x, y, zone } = toUTM(c.lon, c.lat);
      return {
        lon: c.lon,
        lat: c.lat,
        displayX: x,
        displayY: y,
        zone,
        system: "utm",
      };
    }
    return {
      lon: c.lon,
      lat: c.lat,
      displayX: c.lon,
      displayY: c.lat,
      system: "latlon",
    };
  });
  const canFinishDrawing = computed(() => {
    if (shape.value) return false;
    const mode = drawMode.value;
    if (mode === "polyline") return positions.length >= 2;
    if (mode === "polygon") return positions.length >= 3;
    if (mode === "multi_point") return positions.length >= 1;
    if (mode === "circle") return !!(cs.center && cs.radius > 0);
    return false;
  });
  const isSaveEnabled = computed(() => {
    if (drawMode.value === "multi_point") {
      if (positions.length > 0) return true;
      if (shape.value && shape.value.type === "multi_point" && Array.isArray(shape.value.positions) && shape.value.positions.length > 0) return true;
      return false;
    }
    return !!shape.value;
  });
  // Watchers
  watch(
    shape,
    (newVal) => {
      if (newVal && showForm.value) {
        tempCircle.value = null;
        cs.center = null;
      }
    },
    { deep: true },
  );
  watch(
    () => formData.value.name,
    () => {
      nameError.value = false;
    },
  );
  // Core utilities
  function reassertDrawingOrder() {
    ts.layerIds.forEach((id) => registerDrawLayer(id));
    if (es.sourceId) registerDrawLayer(es.sourceId + "-points");
    bringDrawingsToFront(map);
  }
  function clearTempLayers() {
    ts.layerIds.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    ts.layerIds = [];
    if (ts.sourceId && map.getSource(ts.sourceId)) {
      map.removeSource(ts.sourceId);
      ts.sourceId = null;
    }
    ts.extraSourceIds.forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });
    ts.extraSourceIds = [];
    ts.polygonLabelSourceId = null;
    ts.lineLabelSourceId = null;
  }
  function cleanupHandlers() {
    if (hs.mouseMove) {
      map.off("mousemove", hs.mouseMove);
      hs.mouseMove = null;
    }
    if (hs.click) {
      map.off("click", hs.click);
      hs.click = null;
    }
    if (hs.dblClick) {
      map.off("dblclick", hs.dblClick);
      hs.dblClick = null;
    }
    if (hs.rightClick) {
      map.off("contextmenu", hs.rightClick);
      hs.rightClick = null;
    }
    if (hs.key) {
      window.removeEventListener("keydown", hs.key);
      hs.key = null;
    }
    map.getCanvas().style.cursor = "default";
  }
  function addTempSource() {
    ts.sourceId = "temp-" + crypto.randomUUID();
    map.addSource(ts.sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    return ts.sourceId;
  }
  function addTempLayer(id, config) {
    map.addLayer({ source: ts.sourceId, ...config, id });
    ts.layerIds.push(id);
  }
  function addLabelSource() {
    const labelId = ts.sourceId + "-labels";
    map.addSource(labelId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    ts.extraSourceIds.push(labelId);
    return labelId;
  }
  function buildFeatures(pts, closed) {
    const lineCoords = pts.map((p) => [p.lng || p.lon, p.lat]);
    const features = pts.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng || p.lon, p.lat] },
      properties: {},
    }));
    if (lineCoords.length >= 2) {
      if (closed && lineCoords.length >= 3) {
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
    return { type: "FeatureCollection", features };
  }
  function updateTempSource(pts, closed) {
    const src = map.getSource(ts.sourceId);
    if (src) src.setData(buildFeatures(pts, closed));
    updatePolygonLabels(pts);
    updateLineLabels(pts);
  }
  function midCoord(a, b) {
    const alng = a.lng ?? a.lon;
    const blng = b.lng ?? b.lon;
    return [(alng + blng) / 2, (a.lat + b.lat) / 2];
  }
  function edgeFeature(a, b) {
    const dist = measureDistance(
      [a.lng ?? a.lon, a.lat],
      [b.lng ?? b.lon, b.lat],
    );
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: midCoord(a, b) },
      properties: { kind: "edge", label: formatDistance(dist) },
    };
  }
  function updatePolygonLabels(pts) {
    if (drawMode.value !== "polygon" || !ts.polygonLabelSourceId) return;
    const labelSrc = map.getSource(ts.polygonLabelSourceId);
    if (!labelSrc) return;
    const features = [];
    pts.forEach((p) => {
      const lng = p.lng || p.lon;
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, p.lat] },
        properties: {
          kind: "vertex",
          label: formatVertexLabel(lng, p.lat, coordinateSystem.value),
        },
      });
    });
    for (let i = 1; i < pts.length; i++) {
      features.push(edgeFeature(pts[i - 1], pts[i]));
    }
    // ضلع بسته‌کننده پلی‌گان
    if (pts.length >= 3) {
      features.push(edgeFeature(pts[pts.length - 1], pts[0]));
    }
    // نقطه مرکز (برچسب لاتین تا فونت Mapbox درست رندر شود)
    if (pts.length >= 1) {
      const c = computeCentroid(
        pts.map((p) => ({ lon: p.lng ?? p.lon, lat: p.lat })),
      );
      if (c) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [c.lon, c.lat] },
          properties: { kind: "center", label: "C" },
        });
      }
    }
    labelSrc.setData({ type: "FeatureCollection", features });
  }
  function updateLineLabels(pts) {
    if (drawMode.value !== "polyline" || !ts.lineLabelSourceId) return;
    const labelSrc = map.getSource(ts.lineLabelSourceId);
    if (!labelSrc) return;
    const features = [];
    for (let i = 1; i < pts.length; i++) {
      features.push(edgeFeature(pts[i - 1], pts[i]));
    }
    if (pts.length >= 2) {
      const c = computeCentroid(
        pts.map((p) => ({ lon: p.lng ?? p.lon, lat: p.lat })),
      );
      if (c) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [c.lon, c.lat] },
          properties: { kind: "center", label: "C" },
        });
      }
    }
    labelSrc.setData({ type: "FeatureCollection", features });
  }
  // Drawing layers setup
  function addPolygonLayers() {
    addTempLayer(ts.sourceId + "-fill", {
      type: "fill",
      paint: { "fill-color": color.value, "fill-opacity": 0.35 },
    });
    addTempLayer(ts.sourceId + "-outline", {
      type: "line",
      paint: {
        "line-color": color.value,
        "line-width": 2.5,
        "line-opacity": 0.9,
      },
    });
    addTempLayer(ts.sourceId + "-points", {
      type: "circle",
      filter: ["==", "$type", "Point"],
      paint: {
        "circle-radius": 5,
        "circle-color": "#ffffff",
        "circle-stroke-color": color.value,
        "circle-stroke-width": 2.5,
        "circle-opacity": 0.9,
      },
    });
    const labelSrcId = addLabelSource();
    ts.polygonLabelSourceId = labelSrcId;
    addTempLayer(ts.sourceId + "-edge-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "edge"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#b45309",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    addTempLayer(ts.sourceId + "-vertex-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "vertex"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-offset": [0, -1.2],
        "text-anchor": "bottom",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#1e3a8a",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    addTempLayer(ts.sourceId + "-center-point", {
      type: "circle",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "center"],
      paint: {
        "circle-radius": 5,
        "circle-color": "#2563eb",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
    addTempLayer(ts.sourceId + "-center-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "center"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#1d4ed8",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
  }
  function addPolylineLayers() {
    addTempLayer(ts.sourceId + "-line", {
      type: "line",
      paint: {
        "line-color": color.value,
        "line-width": 3,
        "line-opacity": 0.85,
      },
    });
    addTempLayer(ts.sourceId + "-points", {
      type: "circle",
      filter: ["==", "$type", "Point"],
      paint: {
        "circle-radius": 6,
        "circle-color": "#ffffff",
        "circle-stroke-color": color.value,
        "circle-stroke-width": 3,
        "circle-opacity": 0.9,
      },
    });
    const labelSrcId = addLabelSource();
    ts.lineLabelSourceId = labelSrcId;
    addTempLayer(ts.sourceId + "-edge-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "edge"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#b45309",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    addTempLayer(ts.sourceId + "-center-point", {
      type: "circle",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "center"],
      paint: {
        "circle-radius": 5,
        "circle-color": "#2563eb",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
    addTempLayer(ts.sourceId + "-center-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "center"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#1d4ed8",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
  }
  function addMultiPointLayers() {
    addTempLayer(ts.sourceId + "-points", {
      type: "circle",
      paint: {
        "circle-radius": 7,
        "circle-color": color.value,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.9,
      },
    });
  }
  // Drawing mode setup
  function startDrawing() {
    const m = map;
    m.getCanvas().style.cursor = "crosshair";
    if (drawMode.value === "multi_point") {
      addTempSource();
      addMultiPointLayers();
      const updateSource = () => {
        const src = m.getSource(ts.sourceId);
        if (!src) return;
        const features = positions.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: { color: p.color || color.value },
        }));
        src.setData({ type: "FeatureCollection", features });
      };
      hs.click = (e) => {
        positions.push({
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
          color: color.value,
        });
        updateSource();
      };
      hs.rightClick = (e) => {
        e.preventDefault();
        if (positions.length < 1) return;
        cleanupHandlers();
        finishDrawing("multi_point", [...positions]);
      };
      hs.key = (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          finishCurrentDrawing();
        } else if (event.key === "Delete" && positions.length > 0) {
          positions.pop();
          updateSource();
        }
      };
      window.addEventListener("keydown", hs.key);
      m.on("click", hs.click);
      m.on("contextmenu", hs.rightClick);
    } else if (drawMode.value === "polyline") {
      addTempSource();
      addPolylineLayers();
      let lastClickTs = 0;
      hs.click = (e) => {
        const now = Date.now();
        if (now - lastClickTs < 280) return;
        lastClickTs = now;
        positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        updateTempSource(positions);
      };
      hs.mouseMove = (e) => {
        if (positions.length === 0) return;
        updateTempSource([
          ...positions,
          { lng: e.lngLat.lng, lat: e.lngLat.lat },
        ]);
      };
      hs.rightClick = (e) => {
        e.preventDefault();
        if (positions.length > 0) {
          positions.pop();
          updateTempSource(positions);
          if (positions.length < 2) cleanupHandlers();
        }
      };
      // اتمام فقط با Enter یا دکمه پنل — دابل‌کلیک نقطه اضافه نمی‌کند
      hs.dblClick = (e) => {
        e.preventDefault();
        e.originalEvent?.preventDefault?.();
        e.originalEvent?.stopPropagation?.();
      };
      hs.key = (event) => {
        if (event.key === "Delete" && positions.length > 0) {
          positions.pop();
          updateTempSource(positions);
          if (positions.length < 2) cleanupHandlers();
        } else if (event.key === "Enter") {
          event.preventDefault();
          finishCurrentDrawing();
        }
      };
      window.addEventListener("keydown", hs.key);
      m.on("click", hs.click);
      m.on("mousemove", hs.mouseMove);
      m.on("contextmenu", hs.rightClick);
      m.on("dblclick", hs.dblClick);
    } else if (drawMode.value === "polygon") {
      addTempSource();
      addPolygonLayers();
      let lastClickTs = 0;
      hs.click = (e) => {
        const now = Date.now();
        if (now - lastClickTs < 280) return;
        lastClickTs = now;
        positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        updateTempSource(positions, true);
      };
      hs.mouseMove = (e) => {
        if (positions.length === 0) return;
        updateTempSource(
          [...positions, { lng: e.lngLat.lng, lat: e.lngLat.lat }],
          true,
        );
      };
      hs.rightClick = (e) => {
        e.preventDefault();
        if (positions.length > 0) {
          positions.pop();
          updateTempSource(positions, true);
          if (positions.length < 3) cleanupHandlers();
        }
      };
      hs.dblClick = (e) => {
        e.preventDefault();
        e.originalEvent?.preventDefault?.();
        e.originalEvent?.stopPropagation?.();
      };
      hs.key = (event) => {
        if (event.key === "Delete" && positions.length > 0) {
          positions.pop();
          updateTempSource(positions, true);
          if (positions.length < 3) cleanupHandlers();
        } else if (event.key === "Enter") {
          event.preventDefault();
          finishCurrentDrawing();
        }
      };
      window.addEventListener("keydown", hs.key);
      m.on("click", hs.click);
      m.on("mousemove", hs.mouseMove);
      m.on("contextmenu", hs.rightClick);
      m.on("dblclick", hs.dblClick);
    } else if (drawMode.value === "circle") {
      cs.center = null;
      tempCircle.value = null;
      addTempSource();
      addTempLayer(ts.sourceId + "-fill", {
        type: "fill",
        paint: { "fill-color": color.value, "fill-opacity": 0.4 },
      });
      addTempLayer(ts.sourceId + "-outline", {
        type: "line",
        paint: {
          "line-color": color.value,
          "line-width": 2,
          "line-opacity": 0.9,
        },
      });
      addTempLayer(ts.sourceId + "-center", {
        type: "circle",
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 8,
          "circle-color": "#3b82f6",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      addTempLayer(ts.sourceId + "-radius", {
        type: "line",
        source: ts.sourceId,
        filter: ["==", "$type", "LineString"],
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
          "line-dasharray": [4, 4],
          "line-opacity": 0.8,
        },
      });
      const circleLabelSourceId = addLabelSource();
      addTempLayer(circleLabelSourceId + "-text", {
        type: "symbol",
        source: circleLabelSourceId,
        layout: {
          "text-field": ["get", "label"],
          "text-size": 12,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
          "text-offset": [0, -1.5],
          "text-anchor": "bottom",
        },
        paint: {
          "text-color": "#1e40af",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      });
      hs.click = (e) => {
        if (!cs.center) {
          cs.center = [e.lngLat.lng, e.lngLat.lat];
          tempCircle.value = {
            center: { lat: cs.center[1], lng: cs.center[0] },
            radius: 0,
          };
          const src = m.getSource(ts.sourceId);
          if (src)
            src.setData({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: { type: "Point", coordinates: cs.center },
                  properties: {},
                },
              ],
            });
        } else {
          cleanupHandlers();
          finishDrawing("circle", {
            center: { lng: cs.center[0], lat: cs.center[1] },
            radius: cs.radius,
          });
        }
      };
      hs.mouseMove = (e) => {
        if (!cs.center) return;
        const dx =
          (e.lngLat.lng - cs.center[0]) *
          111319.9 *
          Math.cos((cs.center[1] * Math.PI) / 180);
        const dy = (e.lngLat.lat - cs.center[1]) * 110540;
        cs.radius = Math.sqrt(dx * dx + dy * dy);
        tempCircle.value = {
          center: { lat: cs.center[1], lng: cs.center[0] },
          radius: cs.radius,
        };
        const circleCoords = computeCircleCoords(
          { lat: cs.center[1], lng: cs.center[0] },
          cs.radius,
        );
        const src = m.getSource(ts.sourceId);
        if (src) {
          src.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Polygon", coordinates: [circleCoords] },
                properties: {},
              },
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: cs.center },
                properties: {},
              },
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: [cs.center, [e.lngLat.lng, e.lngLat.lat]],
                },
                properties: {},
              },
            ],
          });
        }
        const labelSrc = m.getSource(circleLabelSourceId);
        if (labelSrc) {
          labelSrc.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [
                    (cs.center[0] + e.lngLat.lng) / 2,
                    (cs.center[1] + e.lngLat.lat) / 2,
                  ],
                },
                properties: { label: formatDistance(cs.radius) },
              },
            ],
          });
        }
      };
      m.on("click", hs.click);
      m.on("mousemove", hs.mouseMove);
    }
  }
  function finishDrawing(draw, pos) {
    cleanupHandlers();
    map.getCanvas().style.cursor = "default";
    const defaultOpacity = 0.7;
    if (draw === "circle") {
      shape.value = {
        type: "circle",
        center: pos.center,
        radius: cs.radius,
        color: color.value,
        opacity: defaultOpacity,
        width: 3,
        backgroundImage: null,
        show: true,
      };
      tempCircle.value = null;
      cs.center = null;
    } else if (draw === "multi_point") {
      shape.value = {
        type: "multi_point",
        positions: pos.map((p) => ({
          lon: p.lng,
          lat: p.lat,
          height: 0,
          color: p.color || color.value,
        })),
        color: color.value,
        opacity: defaultOpacity,
        width: 5,
        show: true,
      };
    } else if (draw === "polyline") {
      shape.value = {
        type: draw,
        positions: pos.map((p) => ({ lon: p.lng, lat: p.lat, height: 0 })),
        color: color.value,
        opacity: defaultOpacity,
        width: 3,
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
        opacity: defaultOpacity,
        width: 3,
        show: true,
      };
    }
    positions.length = 0;
  }
  /** اتمام ترسیم از پنل یا Enter — در صورت داشتن نام، ذخیره هم می‌شود */
  function finishCurrentDrawing() {
    if (shape.value) {
      // شکل آماده است؛ اگر نام دارد ذخیره کن
      if (formData.value?.name?.trim()) {
        handleSave();
      } else {
        nameError.value = true;
        $toast?.warning?.("برای ذخیره، نام ترسیم را وارد کنید", {
          position: "top-left",
        });
      }
      return;
    }
    const mode = drawMode.value;
    let finished = false;
    if (mode === "polyline" && positions.length >= 2) {
      cleanupHandlers();
      finishDrawing("polyline", [...positions]);
      finished = true;
    } else if (mode === "polygon" && positions.length >= 3) {
      cleanupHandlers();
      finishDrawing("polygon", [...positions]);
      finished = true;
    } else if (mode === "multi_point" && positions.length >= 1) {
      cleanupHandlers();
      finishDrawing("multi_point", [...positions]);
      finished = true;
    } else if (mode === "circle" && cs.center && cs.radius > 0) {
      cleanupHandlers();
      finishDrawing("circle", {
        center: { lng: cs.center[0], lat: cs.center[1] },
      });
      finished = true;
    }
    if (finished) {
      nextTick(() => {
        if (formData.value?.name?.trim() && shape.value) {
          handleSave();
        } else if (!formData.value?.name?.trim()) {
          nameError.value = true;
          $toast?.info?.(
            "ترسیم تمام شد. نام را وارد کنید و ذخیره را بزنید",
            { position: "top-left" },
          );
        }
      });
    }
  }
  /**
   * ساخت شکل از مختصات دستی UTM
   * rows: [{ easting, northing, zone }]
   */
  function applyManualUTMCoords(rows) {
    if (!rows || !rows.length) return;
    const mode = drawMode.value;
    if (!mode || mode === "circle") return;
    const pts = [];
    for (const r of rows) {
      const e = Number(r.easting);
      const n = Number(r.northing);
      const z = Number(r.zone) || 39;
      if (!isFinite(e) || !isFinite(n)) continue;
      const { lng, lat } = fromUTM(e, n, z, true);
      pts.push({ lng, lat });
    }
    if (!pts.length) return;
    if (mode === "multi_point") {
      cleanupHandlers();
      finishDrawing(
        "multi_point",
        pts.map((p) => ({ ...p, color: color.value })),
      );
    } else if (mode === "polyline") {
      if (pts.length < 2) return;
      cleanupHandlers();
      finishDrawing("polyline", pts);
    } else if (mode === "polygon") {
      if (pts.length < 3) return;
      cleanupHandlers();
      finishDrawing("polygon", pts);
    }
  }
  function setDrawMode(mode) {
    pickForForm.value = false;
    if (editingPin.value) {
      renderUpdatedShape(editingPin.value);
      disableVertexEditing();
    }
    editingPin.value = null;
    if (drawMode.value === mode && showForm.value) return;
    measureActive.value = false;
    cleanupHandlers();
    clearTempLayers();
    drawMode.value = mode;
    activeTab.value = "measurements";
    positions.length = 0;
    shape.value = null;
    pointList.value = [];
    tempCircle.value = null;
    cs.center = null;
    showForm.value = true;
    setTimeout(() => {
      startDrawing();
    }, 100);
  }
  // Point picking
  function togglePointPick() {
    if (pickForForm.value) {
      cancelPointPick();
      return;
    }
    if (hs.click) cleanupHandlers();
    drawMode.value = "";
    pickForForm.value = true;
    map.getCanvas().style.cursor = "crosshair";
    hs.click = (e) => {
      const { lng, lat } = e.lngLat;
      cleanupHandlers();
      pickForForm.value = false;
      drawMode.value = "";
      emit("pickPoint", { lat, lng });
    };
    map.on("click", hs.click);
  }
  function cancelPointPick() {
    cleanupHandlers();
    pickForForm.value = false;
  }
  // Lifecycle
  onMounted(() => {
    if (!map.getSource(drawDataSourceId)) {
      map.addSource(drawDataSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }
    hs.featureClick = (e) => onExistingFeatureClick(e);
    map.on("click", hs.featureClick);
    hs.styleLoad = () => reassertDrawingOrder();
    map.on("style.load", hs.styleLoad);
  });
  onUnmounted(() => {
    cleanupHandlers();
    clearTempLayers();
    disableVertexEditing();
    if (hs.featureClick) {
      map.off("click", hs.featureClick);
      hs.featureClick = null;
    }
    if (hs.styleLoad) {
      map.off("style.load", hs.styleLoad);
      hs.styleLoad = null;
    }
  });
  // Edit existing feature
  function findPinRecursive(list, id) {
    if (!list || !id) return null;
    for (const item of list) {
      if (!item) continue;
      if (String(item.id) === String(id)) return item;
      if (item.children && item.children.length) {
        const found = findPinRecursive(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }
  function onExistingFeatureClick(e) {
    if (
      drawMode.value ||
      pickForForm.value ||
      measureActive.value ||
      showForm.value ||
      intersectActive.value
    )
      return;
    const rendered = map.queryRenderedFeatures(e.point);
    const feature = rendered.find((f) =>
      f.layer?.source?.startsWith("draw-pin-"),
    );
    if (!feature) return;
    const pinId = feature.layer.source.replace(/^draw-pin-/, "");
    const pin = findPinRecursive(pins, pinId);
    if (pin) startEditFeature(pin);
  }
  // Vertex drag editing
  function enableVertexEditing() {
    disableVertexEditing();
    const type = shape.value?.type;
    if (type !== "polyline" && type !== "polygon" && type !== "multi_point") return;
    es.sourceId = "edit-handles-" + crypto.randomUUID();
    map.addSource(es.sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    const handlesLayerId = es.sourceId + "-points";
    if (type === "multi_point") {
      // حاشیه آبی دور هر نماد (مطابق شکل) — لایه halo هم‌شکل با خود نماد، پشت لایه اصلی
      const pin = editingPin.value
      const mainSourceId = pin ? "draw-pin-" + pin.id : null
      const mainIconLayerId = mainSourceId ? mainSourceId + "-points" : null
      if (pin && mainIconLayerId && map.getLayer(mainIconLayerId)) {
        es.haloLayerId = es.sourceId + "-halo"
        map.addLayer(
          {
            id: es.haloLayerId,
            type: "symbol",
            source: mainSourceId,
            layout: {
              "icon-image": ["get", "icon"],
              "icon-size": 0.62,
              "icon-allow-overlap": true,
            },
            paint: {
              "icon-color": "#2563eb",
              "icon-opacity": shape.value?.opacity ?? 1,
            },
          },
          mainIconLayerId,
        )
      }
      // دستگیره شفاف فقط برای کشیدن
      map.addLayer({
        id: handlesLayerId,
        type: "circle",
        source: es.sourceId,
        paint: {
          "circle-radius": 17,
          "circle-color": "rgba(37, 99, 235, 0)",
          "circle-stroke-width": 0,
        },
      })
    } else {
      map.addLayer({
        id: handlesLayerId,
        type: "circle",
        source: es.sourceId,
        paint: {
          "circle-radius": 6,
          "circle-color": "#ffffff",
          "circle-stroke-color": "#2563eb",
          "circle-stroke-width": 3,
        },
      })
    }
    refreshEditHandles();
    es.mouseDown = (e) => {
      if (!e.features?.length) return;
      es.dragIndex = Number(e.features[0].properties.index);
      es.dragging = true;
      map.dragPan.disable();
      map.getCanvas().style.cursor = "grabbing";
    };
    es.mouseMove = (e) => {
      if (!es.dragging || es.dragIndex === null || !shape.value) return;
      const { lng, lat } = e.lngLat;
      const pts = shape.value.positions;
      pts[es.dragIndex] = { ...pts[es.dragIndex], lon: lng, lat };
      if (shape.value.type === "polygon") {
        if (es.dragIndex === 0) pts[pts.length - 1] = { ...pts[0] };
        else if (es.dragIndex === pts.length - 1)
          pts[0] = { ...pts[pts.length - 1] };
      }
      refreshEditHandles();
      if (editingPin.value)
        renderUpdatedShape(editingPin.value, toRaw(shape.value));
    };
    es.mouseUp = () => {
      if (es.dragging) {
        es.dragging = false;
        es.dragIndex = null;
        map.dragPan.enable();
        map.getCanvas().style.cursor = "";
      }
    };
    map.on("mousedown", handlesLayerId, es.mouseDown);
    map.on("mousemove", es.mouseMove);
    map.on("mouseup", es.mouseUp);
  }
  function refreshEditHandles() {
    if (!es.sourceId || !shape.value) return;
    const src = map.getSource(es.sourceId);
    if (!src) return;
    const pts = shape.value.positions || [];
    const limit = shape.value.type === "polygon" ? pts.length - 1 : pts.length;
    const features = [];
    for (let i = 0; i < limit; i++) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [pts[i].lon, pts[i].lat] },
        properties: { index: i },
      });
    }
    src.setData({ type: "FeatureCollection", features });
  }
  function disableVertexEditing() {
    if (es.sourceId) {
      const handlesLayerId = es.sourceId + "-points";
      if (es.mouseDown) map.off("mousedown", handlesLayerId, es.mouseDown);
      if (map.getLayer(handlesLayerId)) map.removeLayer(handlesLayerId);
      if (es.haloLayerId) {
        if (map.getLayer(es.haloLayerId)) map.removeLayer(es.haloLayerId);
        es.haloLayerId = null;
      }
      if (map.getSource(es.sourceId)) map.removeSource(es.sourceId);
      es.sourceId = null;
    }
    if (es.mouseMove) map.off("mousemove", es.mouseMove);
    if (es.mouseUp) map.off("mouseup", es.mouseUp);
    es.mouseDown = null;
    es.mouseMove = null;
    es.mouseUp = null;
    es.dragging = false;
    es.dragIndex = null;
    map.dragPan.enable();
    map.getCanvas().style.cursor = "";
  }
  function startEditFeature(pin) {
    if (!pin || !pin.shape) return;
    if (editingPin.value && editingPin.value !== pin)
      renderUpdatedShape(editingPin.value);
    disableVertexEditing();
    cleanupHandlers();
    clearTempLayers();
    drawMode.value = "";
    pickForForm.value = false;
    measureActive.value = false;
    positions.length = 0;
    pointList.value = [];
    editingPin.value = pin;
    shape.value = JSON.parse(JSON.stringify(toRaw(pin.shape)));
    formData.value = {
      name: pin.name || "",
      description: pin.descr || pin.shape.description || "",
      file: null,
    };
    attch_file.value = null;
    activeTab.value = "measurements";
    showForm.value = true;
    enableVertexEditing();
  }
  function renderUpdatedShape(pin, overrideShape) {
    const s = overrideShape || pin.shape;
    if (!s || !s.type) return;
    const sourceId = "draw-pin-" + pin.id;
    const src = map.getSource(sourceId);
    if (!src) return;
    const opacity = s.opacity ?? 1;
    if (s.type === "polyline") {
      const coords = s.positions.map((p) => [p.lon, p.lat]);
      src.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: {
              name: pin.name,
              description: s.description || pin.descr || "",
            },
          },
        ],
      });
      if (map.getLayer(sourceId + "-line")) {
        map.setPaintProperty(
          sourceId + "-line",
          "line-color",
          s.color || "#ff0000",
        );
        map.setPaintProperty(sourceId + "-line", "line-width", s.width || 3);
        map.setPaintProperty(sourceId + "-line", "line-opacity", opacity);
        map.setPaintProperty(sourceId + "-line", "line-dasharray", getDashArray(s.dash));
      }
    } else if (s.type === "polygon") {
      const coords = s.positions.map((p) => [p.lon, p.lat]);
      src.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [coords] },
            properties: {
              name: pin.name,
              description: s.description || pin.descr || "",
            },
          },
        ],
      });
      if (map.getLayer(sourceId + "-fill")) {
        map.setPaintProperty(
          sourceId + "-fill",
          "fill-color",
          s.color || "#ff0000",
        );
        map.setPaintProperty(sourceId + "-fill", "fill-opacity", opacity);
      }
      if (map.getLayer(sourceId + "-line")) {
        map.setPaintProperty(
          sourceId + "-line",
          "line-color",
          s.outlineColor || s.color || "#ff0000",
        );
        map.setPaintProperty(sourceId + "-line", "line-width", s.width || s.outlineWidth || 2);
        map.setPaintProperty(sourceId + "-line", "line-opacity", opacity);
      }
    } else if (s.type === "circle") {
      const circleCoords = computeCircleCoords(s.center, s.radius);
      src.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [circleCoords] },
            properties: {},
          },
        ],
      });
      if (map.getLayer(sourceId + "-fill")) {
        map.setPaintProperty(
          sourceId + "-fill",
          "fill-color",
          s.color || s.fillColor || "#0000ff",
        );
        map.setPaintProperty(sourceId + "-fill", "fill-opacity", opacity);
      }
      if (map.getLayer(sourceId + "-line")) {
        map.setPaintProperty(
          sourceId + "-line",
          "line-color",
          s.outlineColor || s.color || "#0000ff",
        );
        map.setPaintProperty(sourceId + "-line", "line-opacity", opacity);
      }
    } else if (s.type === "multi_point") {
      const features = s.positions.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: {
          color: p.color || s.color || "#00ff00",
          icon: pointIcon(s.symbol || p.symbol),
        },
      }));
      src.setData({ type: "FeatureCollection", features });
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
    } else if (s.type === "point") {
      src.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [s.lon, s.lat] },
            properties: {
              name: pin.name,
              description: s.description || pin.descr || "",
            },
          },
        ],
      });
      if (map.getLayer(sourceId + "-point")) {
        map.setPaintProperty(
          sourceId + "-point",
          "circle-color",
          s.color || "#ff0000",
        );
        map.setPaintProperty(sourceId + "-point", "circle-opacity", opacity);
        map.setPaintProperty(sourceId + "-point", "circle-stroke-opacity", opacity);
      }
    }
  }
  const saveEditedPin = async () => {
    if (!formData.value.name.trim()) {
      activeTab.value = "measurements";
      nameError.value = true;
      return;
    }
    const pin = editingPin.value;
    if (!pin) return;
    pin.name = formData.value.name;
    pin.descr = formData.value.description;
    pin.shape = toRaw(shape.value);
    if (attch_file.value && pin.shape.type === "circle") {
      pin.filename = attch_file.value.name;
      pin.file = attch_file.value;
    }
    renderUpdatedShape(pin);
    disableVertexEditing();
    editingPin.value = null;
    drawMode.value = "";
    showForm.value = false;
    formData.value = { name: "", description: "", file: null };
    attch_file.value = null;
    tempCircle.value = null;
    cs.center = null;
    clearTempLayers();
    await saveOneWorks(pin);
  };
  // Measure mode
  function toggleMeasure() {
    if (editingPin.value) {
      renderUpdatedShape(editingPin.value);
      disableVertexEditing();
    }
    editingPin.value = null;
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
    const m = map;
    measurePoints.length = 0;
    const tempId = "measure-temp-" + crypto.randomUUID();
    m.addSource(tempId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    m.addLayer({
      id: tempId + "-line",
      type: "line",
      source: tempId,
      paint: {
        "line-color": "#f97316",
        "line-width": 4,
        "line-dasharray": [8, 6],
        "line-opacity": 0.85,
      },
    });
    m.addLayer({
      id: tempId + "-points",
      type: "circle",
      source: tempId,
      filter: ["==", "$type", "Point"],
      paint: {
        "circle-radius": 8,
        "circle-color": "#f97316",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3,
        "circle-opacity": 0.9,
      },
    });
    m.addLayer({
      id: tempId + "-labels",
      type: "symbol",
      source: tempId,
      filter: ["has", "distance"],
      layout: {
        "text-field": ["get", "distance"],
        "text-size": 14,
        "text-offset": [0, -1.5],
        "text-anchor": "top",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#1e293b",
        "text-halo-color": "#ffffff",
        "text-halo-width": 3,
        "text-halo-blur": 2,
      },
    });
    ts.sourceId = tempId;
    ts.layerIds.push(tempId + "-line", tempId + "-points", tempId + "-labels");
    const buildMeasureFeatures = (pts, withPreview) => {
      const allPts = withPreview
        ? [...measurePoints, [withPreview.lng, withPreview.lat]]
        : measurePoints;
      const features = allPts.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: p },
        properties: {},
      }));
      if (allPts.length >= 2) {
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: allPts },
          properties: {},
        });
        let total = 0;
        for (let i = 1; i < allPts.length; i++)
          total += measureDistance(allPts[i - 1], allPts[i]);
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: allPts[allPts.length - 1] },
          properties: { distance: formatDistance(total) },
        });
      }
      return { type: "FeatureCollection", features };
    };
    hs.click = (e) => {
      measurePoints.push([e.lngLat.lng, e.lngLat.lat]);
      const src = m.getSource(tempId);
      if (src) src.setData(buildMeasureFeatures());
    };
    hs.mouseMove = (e) => {
      if (measurePoints.length === 0) return;
      const src = m.getSource(tempId);
      if (src) src.setData(buildMeasureFeatures(measurePoints, e.lngLat));
    };
    hs.rightClick = (e) => {
      e.preventDefault();
      measurePoints.length = 0;
      const src = m.getSource(tempId);
      if (src) src.setData({ type: "FeatureCollection", features: [] });
    };
    m.on("click", hs.click);
    m.on("mousemove", hs.mouseMove);
    m.on("contextmenu", hs.rightClick);
  }
  function stopMeasure() {
    cleanupHandlers();
    measurePoints.length = 0;
    measureActive.value = false;
    clearTempLayers();
  }
  // Form / Save
  const cancelForm = () => {
    if (editingPin.value) {
      renderUpdatedShape(editingPin.value);
      disableVertexEditing();
    }
    editingPin.value = null;
    shape.value = null;
    clearTempLayers();
    cleanupHandlers();
    showForm.value = false;
    drawMode.value = "";
    formData.value = { name: "", description: "", file: null };
    attch_file.value = null;
    tempCircle.value = null;
    cs.center = null;
    positions.length = 0;
    pointList.value = [];
    measurePoints.length = 0;
    measureActive.value = false;
    if (map.getSource(drawDataSourceId)) {
      map
        .getSource(drawDataSourceId)
        .setData({ type: "FeatureCollection", features: [] });
    }
    map.getCanvas().style.cursor = "default";
  };
  const onFileChange = (e) => {
    attch_file.value = e.target.files[0];
  };
  const handleSave = () => {
    if (editingPin.value) {
      saveEditedPin();
      return;
    }
    if (
      drawMode.value === "multi_point" &&
      !shape.value &&
      positions.length > 0
    ) {
      finishDrawing("multi_point", [...positions]);
      nextTick(() => {
        if (shape.value) savePin();
        else alert("خطا در پایان ترسیم، لطفاً دوباره تلاش کنید");
      });
    } else savePin();
  };
  // رندر یک ترسیم تازه ذخیره شده روی نقشه تا پس از ذخیره فعال و قابل مشاهده بماند
  function renderNewPin(pin) {
    const s = pin.shape;
    if (!s || !s.type) return;
    const sourceId = "draw-pin-" + pin.id;
    if (map.getSource(sourceId)) return;
    const visibility = s.show === false ? "none" : "visible";
    const opacity = s.opacity ?? 0.7;
    if (s.type === "polyline" || s.type === "polygon") {
      const coords = s.positions.map((p) => [p.lon, p.lat]);
      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry:
                s.type === "polygon"
                  ? { type: "Polygon", coordinates: [coords] }
                  : { type: "LineString", coordinates: coords },
              properties: { name: pin.name },
            },
          ],
        },
      });
      if (s.type === "polygon") {
        map.addLayer({
          id: sourceId + "-fill",
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": s.color || "#ff0000",
            "fill-opacity": opacity,
          },
          layout: { visibility },
        });
      }
      map.addLayer({
        id: sourceId + "-line",
        type: "line",
        source: sourceId,
        paint: {
          "line-color": s.outlineColor || s.color || "#ff0000",
          "line-width": s.width || 2,
          "line-opacity": opacity,
          "line-dasharray": getDashArray(s.dash),
        },
        layout: { visibility },
      });
    } else if (s.type === "point") {
      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [s.lon, s.lat] },
              properties: {},
            },
          ],
        },
      });
      map.addLayer({
        id: sourceId + "-point",
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": s.pixelSize || 8,
          "circle-color": s.color || "#ff0000",
          "circle-opacity": opacity,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": s.outlineWidth || 1,
          "circle-stroke-opacity": opacity,
        },
        layout: { visibility },
      });
    } else if (s.type === "multi_point") {
      const features = s.positions.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: {
          color: p.color || s.color || "#00ff00",
          icon: pointIcon(s.symbol || p.symbol),
        },
      }));
      map.addSource(sourceId, { type: "geojson", data: { type: "FeatureCollection", features } });
      ensurePointSymbolImages(map);
      map.addLayer({
        id: sourceId + "-points",
        type: "symbol",
        source: sourceId,
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": 0.5,
          "icon-allow-overlap": true,
          visibility,
        },
        paint: {
          "icon-color": ["get", "color"],
          "icon-opacity": opacity,
        },
      });
    } else if (s.type === "circle") {
      const center = s.center;
      const r = s.radius;
      const coords = [];
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * 2 * Math.PI;
        const rLat = center.lat + (r / 110540) * Math.sin(angle);
        const rLng =
          center.lng +
          (r / (111319.9 * Math.cos((center.lat * Math.PI) / 180))) *
            Math.cos(angle);
        coords.push([rLng, rLat]);
      }
      coords.push(coords[0]);
      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [coords] },
              properties: {},
            },
          ],
        },
      });
      map.addLayer({
        id: sourceId + "-fill",
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": s.fillColor || s.color || "#0000ff",
          "fill-opacity": opacity,
        },
        layout: { visibility },
      });
      map.addLayer({
        id: sourceId + "-line",
        type: "line",
        source: sourceId,
        paint: {
          "line-color": s.outlineColor || s.color || "#0000ff",
          "line-width": s.outlineWidth || s.width || 2,
          "line-opacity": opacity,
        },
        layout: { visibility },
      });
    } else {
      return;
    }
    s._sourceIds = [sourceId];
    registerDrawLayer(sourceId + "-fill");
    registerDrawLayer(sourceId + "-line");
    registerDrawLayer(sourceId + "-point");
    registerDrawLayer(sourceId + "-points");
    bringDrawingsToFront(map);
  }

  const savePin = async () => {
    if (!formData.value.name.trim()) {
      activeTab.value = "measurements";
      nameError.value = true;
      return;
    }
    if (!shape.value) {
      alert("ترسیم کامل نشده است");
      return;
    }
    const pin = {
      id: crypto.randomUUID(),
      name: formData.value.name,
      descr: formData.value.description,
      shape: toRaw(shape.value),
      date: new Date(),
      save: -1,
      type: "draw",
    };
    if (
      attch_file.value &&
      (drawMode.value === "circle" || shape.value?.type === "circle")
    ) {
      pin.filename = attch_file.value.name;
      pin.file = attch_file.value;
    }
    if (SelectGroup.value !== null) {
      pin.parent_id = pins[SelectGroup.value].save ?? -1;
      pins[SelectGroup.value].children.push(pin);
    } else {
      pin.parent_id = -1;
      pins.push(pin);
    }
    drawMode.value = "";
    showForm.value = false;
    formData.value = { name: "", description: "", file: null };
    attch_file.value = null;
    tempCircle.value = null;
    cs.center = null;
    clearTempLayers();
    renderNewPin(pin);
    addVisibleId(pin.id);
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
      fd.append("parent_id", item.parent_id ?? -1);
      if (item.type === "file") fd.append("file", item.file);
      else fd.append("content", JSON.stringify(toRaw(item.shape)));
      if (item.save && item.save > 0) {
        await axios.put(SERVER + "/api/save/myWork/" + item.save, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        const response = await axios.post(
          SERVER + "/api/Save/myWork/" + authStore.user?.id,
          fd,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        if (response.data?.id) item.save = response.data.id;
      }
    } catch (err) {
      console.error("خطا در ذخیره‌سازی:", err);
    } finally {
      loading.value = false;
    }
  };
  // Shape helpers
  function getPointsCount() {
    if (!shape.value) return 0;
    if (shape.value.type === "circle" || shape.value.type === "point") return 1;
    if (shape.value.type === "multi_point")
      return shape.value.positions?.length || 0;
    const pos = shape.value.positions || [];
    return pos.length > 0 ? pos.length - 1 : 0;
  }
  function getAllPoints() {
    if (!shape.value) return [];
    if (shape.value.type === "circle")
      return [{ lat: shape.value.center.lat, lon: shape.value.center.lng }];
    if (shape.value.type === "point")
      return [{ lat: shape.value.lat, lon: shape.value.lon }];
    const pos = shape.value.positions || [];
    if (shape.value.type === "polygon" && pos.length > 1)
      return pos.slice(0, -1);
    return pos;
  }
  function calculateTotalLength() {
    const points = getAllPoints();
    if (points.length < 2) return "0 m";
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += measureDistance(
        [points[i - 1].lon, points[i - 1].lat],
        [points[i].lon, points[i].lat],
      );
    }
    return formatDistance(total);
  }
  function calculateArea() {
    if (!shape.value || shape.value.type !== "polygon") return "0 m²";
    const points = getAllPoints();
    if (points.length < 3) return "0 m²";
    const coords = points.map((p) => {
      const { x, y } = toUTM(p.lon, p.lat);
      return [x, y];
    });
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      area += coords[i][0] * coords[j][1];
      area -= coords[j][0] * coords[i][1];
    }
    return formatArea(Math.abs(area) / 2);
  }
  function formatCoordinate(point) {
    if (point.system === "utm")
      return `${point.displayX.toFixed(3)} E, ${point.displayY.toFixed(3)} N (منطقه ${point.zone})`;
    return `${point.displayX.toFixed(6)}, ${point.displayY.toFixed(6)}`;
  }
  function copyCoordinates(point) {
    const text = formatCoordinate(point);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        if ($toast) $toast.success("مختصات کپی شد");
      })
      .catch(() => {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        if ($toast) $toast.success("مختصات کپی شد");
      });
  }
  function inactiveDrawing() {
    shape.value = null;
    clearTempLayers();
    cleanupHandlers();
    showForm.value = false;
    drawMode.value = "";
    measureActive.value = false;
    measurePoints.length = 0;
    positions.length = 0;
    tempCircle.value = null;
    cs.center = null;
    pointList.value = [];
    if (map.getSource(drawDataSourceId)) {
      map
        .getSource(drawDataSourceId)
        .setData({ type: "FeatureCollection", features: [] });
    }
    map.getCanvas().style.cursor = "default";
  }
  // Cut module
  const cutCtx = {
    map,
    pins,
    emit,
    $toast,
    editingPin,
    drawMode,
    activeTab,
    positions,
    shape,
    showForm,
    hs,
    ts,
    es,
    cs,
    renderUpdatedShape,
    disableVertexEditing,
    cleanupHandlers,
    clearTempLayers,
    inactiveDrawing,
  };
  const { startCutMode } = createCutHandler(cutCtx);
  // Intersect module
  // Intersect module
  const intersectCtx = {
    map,
    pins,
    emit,
    $toast,
    editingPin,
    drawMode,
    activeTab,
    positions,
    hs,
    ts,
    renderUpdatedShape,
    disableVertexEditing,
    cleanupHandlers,
    clearTempLayers,
    intersectActive, // برای جلوگیری از باز شدن پنل ویرایش روی محدوده همپوشانی
  };
  const {
    intersectResults,
    intersectSummary,
    overlapSourceLabel,
    analyzing: intersectAnalyzing,
    intersectPanelOpen,
    openIntersectPanel,
    startIntersectMode,
    loadIntersectFromKML,
    loadIntersectFromPins,
    clearIntersect,
    generateIntersectReport,
    exportIntersectReportCSV,
  } = createIntersectHandler(intersectCtx);
  return {
    loading,
    drawMode,
    color,
    pickForForm,
    pointList,
    positions,
    formData,
    showForm,
    shape,
    attch_file,
    activeTab,
    tempCircle,
    measureActive,
    coordinateSystem,
    nameError,
    editingPin,
    tabs,
    livePoints,
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
    finishCurrentDrawing,
    applyManualUTMCoords,
    formatCoordinate,
    copyCoordinates,
    getDrawTypeName: () =>
      getDrawTypeName(shape.value?.type || drawMode.value, !!editingPin.value),
    inactiveDrawing,
    startCutMode,
    // --- Intersect ---
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
  };
}
