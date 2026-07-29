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
import proj4 from "proj4";
import * as turf from "@turf/turf";
import { useAuthStore } from "../stores/auth";
import { useToast } from "vue-toast-notification";
import { registerDrawLayer, bringDrawingsToFront } from "../utils/layerOrder";
const SERVER = import.meta.env.VITE_SERVER;
export function useDrawing(map, pins, emit, SelectGroup) {
  const authStore = useAuthStore();
  const $toast = useToast();
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
  const activeTab = ref("measurements");
  let radius = 0;
  let circleCenter = null;
  const tempCircle = ref(null);
  const measurePoints = reactive([]);
  const measureActive = ref(false);
  const coordinateSystem = ref("utm");
  // Edit mode state (same dialog is reused for editing an existing feature)
  const editingPin = ref(null);
  // Event handlers
  let mouseMoveHandler = null;
  let clickHandler = null;
  let dblClickHandler = null;
  let rightClickHandler = null;
  let keyHandler = null;
  let featureClickHandler = null;
  let styleLoadHandler = null;
  // Vertex-drag editing (edit mode only)
  let editHandlesSourceId = null;
  let editDragIndex = null;
  let editDragging = false;
  let onEditMouseDown = null;
  let onEditMouseMove = null;
  let onEditMouseUp = null;
  // Source IDs
  let drawDataSourceId = "pins-draw-" + crypto.randomUUID();
  let tempSourceId = null;
  let tempLayerIds = [];
  let polygonLabelSourceId = null;
  let lineLabelSourceId = null;
  let extraTempSourceIds = [];
  // Tabs
  const tabs = computed(() => {
    const isMultiPoint =
      drawMode.value === "multi_point" || shape.value?.type === "multi_point";
    const isMeasure = drawMode.value === "measure" || measureActive.value;
    return [
      {
        key: "measurements",
        label: isMultiPoint ? "نقاط" : isMeasure ? "اندازه‌گیری" : "اندازه‌ها",
      },
      { key: "style", label: "استایل" },
      { key: "info", label: "ذخیره" },
    ];
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
    if (measureActive.value) {
      return measurePoints.map((p, i) => {
        if (coordinateSystem.value === "utm") {
          const zone = Math.floor((p[0] + 180) / 6) + 1;
          const [x, y] = proj4(
            "EPSG:4326",
            `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`,
            [p[0], p[1]],
          );
          return {
            lat: p[1],
            lon: p[0],
            displayX: x,
            displayY: y,
            zone,
            system: "utm",
            index: i,
          };
        } else {
          return {
            lat: p[1],
            lon: p[0],
            displayX: p[0],
            displayY: p[1],
            system: "latlon",
            index: i,
          };
        }
      });
    }
    return livePoints.value.map((p) => {
      if (coordinateSystem.value === "utm") {
        const zone = Math.floor((p.lon + 180) / 6) + 1;
        const [x, y] = proj4(
          "EPSG:4326",
          `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`,
          [p.lon, p.lat],
        );
        return { ...p, displayX: x, displayY: y, zone, system: "utm" };
      } else {
        return { ...p, displayX: p.lon, displayY: p.lat, system: "latlon" };
      }
    });
  });
  const livePointCount = computed(() => {
    if (shape.value) return getPointsCount();
    if (drawMode.value === "circle" && tempCircle.value) return 1;
    if (measureActive.value) return measurePoints.length;
    return positions.length;
  });
  const liveTotalLength = computed(() => {
    if (shape.value) return calculateTotalLength();
    if (measureActive.value) {
      if (measurePoints.length < 2) return "0 m";
      let total = 0;
      for (let i = 1; i < measurePoints.length; i++) {
        total += measureDistance(measurePoints[i - 1], measurePoints[i]);
      }
      return formatDistance(total);
    }
    const points = livePoints.value;
    if (points.length < 2) return "0 m";
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += measureDistance(
        [points[i - 1].lon, points[i - 1].lat],
        [points[i].lon, points[i].lat],
      );
    }
    return formatDistance(total);
  });
  const liveArea = computed(() => {
    if (shape.value) return calculateArea();
    if (drawMode.value !== "polygon") return "0 m²";
    const points = livePoints.value;
    if (points.length < 3) return "0 m²";
    let area = 0;
    const coords = points.map((p) => {
      const zone = Math.floor((p.lon + 180) / 6) + 1;
      return proj4(
        "EPSG:4326",
        `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`,
        [p.lon, p.lat],
      );
    });
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      area += coords[i][0] * coords[j][1];
      area -= coords[j][0] * coords[i][1];
    }
    area = Math.abs(area) / 2;
    return formatArea(area);
  });
  const liveRadius = computed(() => {
    if (shape.value && shape.value.type === "circle")
      return formatDistance(shape.value.radius);
    if (tempCircle.value) return formatDistance(tempCircle.value.radius);
    return "0 m";
  });
  const isSaveEnabled = computed(() => {
    if (drawMode.value === "multi_point") {
      return positions.length > 0;
    }
    return !!shape.value;
  });
  // Watchers
  watch(
    shape,
    (newVal) => {
      if (newVal && showForm.value) {
        tempCircle.value = null;
        circleCenter = null;
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
  // Lifecycle
  onMounted(() => {
    if (!map.getSource(drawDataSourceId)) {
      map.addSource(drawDataSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }
    // Persistent listener: clicking an already-drawn feature opens the same
    // Draw dialog, pre-filled, in edit mode. It stays out of the way while
    // drawing/measuring/picking a point or while the dialog is already open.
    featureClickHandler = (e) => onExistingFeatureClick(e);
    map.on("click", featureClickHandler);
    // وقتی سبک نقشه (بیس‌مپ) عوض می‌شود، لایه‌های در حال ترسیم را دوباره بالا بیاور
    styleLoadHandler = () => reassertDrawingOrder();
    map.on("style.load", styleLoadHandler);
  });
  onUnmounted(() => {
    cleanupHandlers();
    clearTempLayers();
    disableVertexEditing();
    if (featureClickHandler) {
      map.off("click", featureClickHandler);
      featureClickHandler = null;
    }
    if (styleLoadHandler) {
      map.off("style.load", styleLoadHandler);
      styleLoadHandler = null;
    }
  });
  // Helper functions
  function reassertDrawingOrder() {
    tempLayerIds.forEach((id) => registerDrawLayer(id));
    if (editHandlesSourceId) registerDrawLayer(editHandlesSourceId + "-points");
    bringDrawingsToFront(map);
  }
  function clearTempLayers() {
    tempLayerIds.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    tempLayerIds = [];
    if (tempSourceId && map.getSource(tempSourceId)) {
      map.removeSource(tempSourceId);
      tempSourceId = null;
    }
    extraTempSourceIds.forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });
    extraTempSourceIds = [];
    polygonLabelSourceId = null;
    lineLabelSourceId = null;
  }
  function cleanupHandlers() {
    if (mouseMoveHandler) {
      map.off("mousemove", mouseMoveHandler);
      mouseMoveHandler = null;
    }
    if (clickHandler) {
      map.off("click", clickHandler);
      clickHandler = null;
    }
    if (dblClickHandler) {
      map.off("dblclick", dblClickHandler);
      dblClickHandler = null;
    }
    if (rightClickHandler) {
      map.off("contextmenu", rightClickHandler);
      rightClickHandler = null;
    }
    if (keyHandler) {
      window.removeEventListener("keydown", keyHandler);
      keyHandler = null;
    }
    map.getCanvas().style.cursor = "default";
  }
  function togglePointPick() {
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
    map.getCanvas().style.cursor = "crosshair";
    clickHandler = (e) => {
      const { lng, lat } = e.lngLat;
      cleanupHandlers();
      pickForForm.value = false;
      drawMode.value = "";
      emit("pickPoint", { lat, lng });
    };
    map.on("click", clickHandler);
  }
  function cancelPointPick() {
    cleanupHandlers();
    pickForForm.value = false;
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
    circleCenter = null;
    showForm.value = true;
    setTimeout(() => {
      startDrawing();
    }, 100);
  }
  function startDrawing() {
    const m = map;
    m.getCanvas().style.cursor = "crosshair";
    if (drawMode.value === "multi_point") {
      tempSourceId = "temp-" + crypto.randomUUID();
      m.addSource(tempSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      const pointsLayerId = tempSourceId + "-points";
      m.addLayer({
        id: pointsLayerId,
        type: "circle",
        source: tempSourceId,
        paint: {
          "circle-radius": 7,
          "circle-color": color.value,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity": 0.9,
        },
      });
      tempLayerIds.push(pointsLayerId);
      const updateMultiPointSource = () => {
        const src = m.getSource(tempSourceId);
        if (!src) return;
        const features = positions.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: { color: p.color || color.value },
        }));
        src.setData({ type: "FeatureCollection", features });
      };
      clickHandler = (e) => {
        const { lng, lat } = e.lngLat;
        positions.push({ lng, lat, color: color.value });
        updateMultiPointSource();
      };
      rightClickHandler = (e) => {
        e.preventDefault();
        if (positions.length < 1) return;
        cleanupHandlers();
        finishDrawing("multi_point", [...positions]);
      };
      m.on("click", clickHandler);
      m.on("contextmenu", rightClickHandler);
    } else if (drawMode.value === "polyline") {
      tempSourceId = "temp-" + crypto.randomUUID();
      m.addSource(tempSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      const lineLayerId = tempSourceId + "-line";
      const pointsLayerId = tempSourceId + "-points";
      m.addLayer({
        id: lineLayerId,
        type: "line",
        source: tempSourceId,
        paint: {
          "line-color": color.value,
          "line-width": 3,
          "line-opacity": 0.85,
        },
      });
      m.addLayer({
        id: pointsLayerId,
        type: "circle",
        source: tempSourceId,
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 6,
          "circle-color": "#ffffff",
          "circle-stroke-color": color.value,
          "circle-stroke-width": 3,
          "circle-opacity": 0.9,
        },
      });
      tempLayerIds.push(lineLayerId, pointsLayerId);
      // Live label: length along each segment (no vertex coordinates)
      lineLabelSourceId = tempSourceId + "-labels";
      m.addSource(lineLabelSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      extraTempSourceIds.push(lineLabelSourceId);
      const lineEdgeLabelLayerId = lineLabelSourceId + "-edge";
      m.addLayer({
        id: lineEdgeLabelLayerId,
        type: "symbol",
        source: lineLabelSourceId,
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
      tempLayerIds.push(lineEdgeLabelLayerId);
      clickHandler = (e) => {
        positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        updateTempGeoJSON();
      };
      mouseMoveHandler = (e) => {
        if (positions.length === 0) return;
        const pts = [...positions, { lng: e.lngLat.lng, lat: e.lngLat.lat }];
        updateTempGeoJSONWithPreview(pts);
      };
      rightClickHandler = (e) => {
        e.preventDefault();
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
      };
      keyHandler = (event) => {
        if (event.key === "Delete" && positions.length > 0) {
          positions.pop();
          updateTempGeoJSON();
          if (positions.length < 2) cleanupHandlers();
        }
      };
      window.addEventListener("keydown", keyHandler);
      m.on("click", clickHandler);
      m.on("mousemove", mouseMoveHandler);
      m.on("contextmenu", rightClickHandler);
      m.on("dblclick", dblClickHandler);
    } else if (drawMode.value === "polygon") {
      tempSourceId = "temp-" + crypto.randomUUID();
      m.addSource(tempSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      const fillLayerId = tempSourceId + "-fill";
      const outlineLayerId = tempSourceId + "-outline";
      const pointsLayerId = tempSourceId + "-points";
      m.addLayer({
        id: fillLayerId,
        type: "fill",
        source: tempSourceId,
        paint: { "fill-color": color.value, "fill-opacity": 0.35 },
      });
      m.addLayer({
        id: outlineLayerId,
        type: "line",
        source: tempSourceId,
        paint: {
          "line-color": color.value,
          "line-width": 2.5,
          "line-opacity": 0.9,
        },
      });
      m.addLayer({
        id: pointsLayerId,
        type: "circle",
        source: tempSourceId,
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#ffffff",
          "circle-stroke-color": color.value,
          "circle-stroke-width": 2.5,
          "circle-opacity": 0.9,
        },
      });
      tempLayerIds.push(fillLayerId, outlineLayerId, pointsLayerId);
      // Live labels: coordinates at each vertex, length along each edge
      polygonLabelSourceId = tempSourceId + "-labels";
      m.addSource(polygonLabelSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      extraTempSourceIds.push(polygonLabelSourceId);
      const vertexLabelLayerId = polygonLabelSourceId + "-vertex";
      const edgeLabelLayerId = polygonLabelSourceId + "-edge";
      m.addLayer({
        id: edgeLabelLayerId,
        type: "symbol",
        source: polygonLabelSourceId,
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
      m.addLayer({
        id: vertexLabelLayerId,
        type: "symbol",
        source: polygonLabelSourceId,
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
      tempLayerIds.push(edgeLabelLayerId, vertexLabelLayerId);
      clickHandler = (e) => {
        positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        updateTempGeoJSON();
      };
      mouseMoveHandler = (e) => {
        if (positions.length === 0) return;
        const pts = [...positions, { lng: e.lngLat.lng, lat: e.lngLat.lat }];
        updateTempGeoJSONWithPreview(pts);
      };
      rightClickHandler = (e) => {
        e.preventDefault();
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
      };
      keyHandler = (event) => {
        if (event.key === "Delete" && positions.length > 0) {
          positions.pop();
          updateTempGeoJSON();
          if (positions.length < 3) cleanupHandlers();
        }
      };
      window.addEventListener("keydown", keyHandler);
      m.on("click", clickHandler);
      m.on("mousemove", mouseMoveHandler);
      m.on("contextmenu", rightClickHandler);
      m.on("dblclick", dblClickHandler);
    } else if (drawMode.value === "circle") {
      circleCenter = null;
      tempCircle.value = null;
      tempSourceId = "temp-" + crypto.randomUUID();
      m.addSource(tempSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      const fillLayerId = tempSourceId + "-fill";
      const outlineLayerId = tempSourceId + "-outline";
      m.addLayer({
        id: fillLayerId,
        type: "fill",
        source: tempSourceId,
        paint: { "fill-color": color.value, "fill-opacity": 0.4 },
      });
      m.addLayer({
        id: outlineLayerId,
        type: "line",
        source: tempSourceId,
        paint: {
          "line-color": color.value,
          "line-width": 2,
          "line-opacity": 0.9,
        },
      });
      tempLayerIds.push(fillLayerId, outlineLayerId);
      // Center point marker (blue)
      const centerPointLayerId = tempSourceId + "-center";
      m.addLayer({
        id: centerPointLayerId,
        type: "circle",
        source: tempSourceId,
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 8,
          "circle-color": "#3b82f6",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      tempLayerIds.push(centerPointLayerId);
      // Radius line (blue, dashed)
      const radiusLineLayerId = tempSourceId + "-radius";
      m.addLayer({
        id: radiusLineLayerId,
        type: "line",
        source: tempSourceId,
        filter: ["==", "$type", "LineString"],
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
          "line-dasharray": [4, 4],
          "line-opacity": 0.8,
        },
      });
      tempLayerIds.push(radiusLineLayerId);
      // Radius label source and layer
      const circleLabelSourceId = tempSourceId + "-radius-label";
      m.addSource(circleLabelSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      extraTempSourceIds.push(circleLabelSourceId);
      const circleLabelLayerId = circleLabelSourceId + "-text";
      m.addLayer({
        id: circleLabelLayerId,
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
      tempLayerIds.push(circleLabelLayerId);
      clickHandler = (e) => {
        if (!circleCenter) {
          circleCenter = [e.lngLat.lng, e.lngLat.lat];
          tempCircle.value = {
            center: { lat: circleCenter[1], lng: circleCenter[0] },
            radius: 0,
          };
          // Immediately show center point (without radius line until mouse moves)
          const src = m.getSource(tempSourceId);
          if (src) {
            src.setData({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: { type: "Point", coordinates: circleCenter },
                  properties: {},
                },
              ],
            });
          }
        } else {
          cleanupHandlers();
          finishDrawing("circle", {
            center: { lng: circleCenter[0], lat: circleCenter[1] },
            radius,
          });
        }
      };
      mouseMoveHandler = (e) => {
        if (!circleCenter) return;
        const dx =
          (e.lngLat.lng - circleCenter[0]) *
          111319.9 *
          Math.cos((circleCenter[1] * Math.PI) / 180);
        const dy = (e.lngLat.lat - circleCenter[1]) * 110540;
        radius = Math.sqrt(dx * dx + dy * dy);
        tempCircle.value = {
          center: { lat: circleCenter[1], lng: circleCenter[0] },
          radius: radius,
        };
        const coords = [];
        for (let i = 0; i <= 64; i++) {
          const angle = (i / 64) * 2 * Math.PI;
          const rLat = circleCenter[1] + (radius / 110540) * Math.sin(angle);
          const rLng =
            circleCenter[0] +
            (radius /
              (111319.9 * Math.cos((circleCenter[1] * Math.PI) / 180))) *
              Math.cos(angle);
          coords.push([rLng, rLat]);
        }
        coords.push(coords[0]);
        const src = m.getSource(tempSourceId);
        if (src) {
          const features = [
            {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [coords] },
              properties: {},
            },
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: circleCenter },
              properties: {},
            },
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [circleCenter, [e.lngLat.lng, e.lngLat.lat]],
              },
              properties: {},
            },
          ];
          src.setData({ type: "FeatureCollection", features });
        }
        // Update radius label
        const labelSrc = m.getSource(circleLabelSourceId);
        if (labelSrc) {
          const midLng = (circleCenter[0] + e.lngLat.lng) / 2;
          const midLat = (circleCenter[1] + e.lngLat.lat) / 2;
          labelSrc.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [midLng, midLat] },
                properties: { label: formatDistance(radius) },
              },
            ],
          });
        }
      };
      m.on("click", clickHandler);
      m.on("mousemove", mouseMoveHandler);
    }
  }
  function updateTempGeoJSON() {
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
    updatePolygonLabels(positions);
    updateLineLabels(positions);
  }
  function updateTempGeoJSONWithPreview(pts) {
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
    updatePolygonLabels(pts);
    updateLineLabels(pts);
  }
  function updatePolygonLabels(pts) {
    if (drawMode.value !== "polygon" || !polygonLabelSourceId) return;
    const labelSrc = map.getSource(polygonLabelSourceId);
    if (!labelSrc) return;
    const features = [];
    pts.forEach((p) => {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          kind: "vertex",
          label: formatVertexLabel(p.lng, p.lat),
        },
      });
    });
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const dist = measureDistance([a.lng, a.lat], [b.lng, b.lat]);
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [(a.lng + b.lng) / 2, (a.lat + b.lat) / 2],
        },
        properties: { kind: "edge", label: formatDistance(dist) },
      });
    }
    labelSrc.setData({ type: "FeatureCollection", features });
  }
  function updateLineLabels(pts) {
    if (drawMode.value !== "polyline" || !lineLabelSourceId) return;
    const labelSrc = map.getSource(lineLabelSourceId);
    if (!labelSrc) return;
    const features = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const dist = measureDistance([a.lng, a.lat], [b.lng, b.lat]);
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [(a.lng + b.lng) / 2, (a.lat + b.lat) / 2],
        },
        properties: { label: formatDistance(dist) },
      });
    }
    labelSrc.setData({ type: "FeatureCollection", features });
  }
  function finishDrawing(draw, pos) {
    cleanupHandlers();
    map.getCanvas().style.cursor = "default";
    const defaultOpacity = 0.7;
    const defaultWidth = 3;
    if (draw === "circle") {
      shape.value = {
        type: "circle",
        center: pos.center,
        radius,
        color: color.value,
        opacity: defaultOpacity,
        width: defaultWidth,
        backgroundImage: null,
        show: true,
      };
      tempCircle.value = null;
      circleCenter = null;
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
        width: defaultWidth,
        show: true,
      };
    }
    positions.length = 0;
  }
  // ---------------------------------------------------------------------
  // Edit existing feature (reuses the Draw dialog instead of a separate one)
  // ---------------------------------------------------------------------
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
    // Don't hijack clicks that belong to drawing, measuring, point-picking,
    // or that happen while the dialog is already open.
    if (
      drawMode.value ||
      pickForForm.value ||
      measureActive.value ||
      showForm.value
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
  // ------------------------------------------------------------------
  // Drag vertices on the map while editing a polyline/polygon
  // ------------------------------------------------------------------
  function enableVertexEditing() {
    disableVertexEditing();
    const type = shape.value?.type;
    if (type !== "polyline" && type !== "polygon") return;
    editHandlesSourceId = "edit-handles-" + crypto.randomUUID();
    map.addSource(editHandlesSourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    const handlesLayerId = editHandlesSourceId + "-points";
    map.addLayer({
      id: handlesLayerId,
      type: "circle",
      source: editHandlesSourceId,
      paint: {
        "circle-radius": 6,
        "circle-color": "#ffffff",
        "circle-stroke-color": "#2563eb",
        "circle-stroke-width": 3,
      },
    });
    refreshEditHandles();
    onEditMouseDown = (e) => {
      if (!e.features?.length) return;
      editDragIndex = Number(e.features[0].properties.index);
      editDragging = true;
      map.dragPan.disable();
      map.getCanvas().style.cursor = "grabbing";
    };
    onEditMouseMove = (e) => {
      if (!editDragging || editDragIndex === null || !shape.value) return;
      const { lng, lat } = e.lngLat;
      const pts = shape.value.positions;
      pts[editDragIndex] = { ...pts[editDragIndex], lon: lng, lat };
      // Keep a polygon's ring closed: first and last vertex must match
      if (shape.value.type === "polygon") {
        if (editDragIndex === 0) {
          pts[pts.length - 1] = { ...pts[0] };
        } else if (editDragIndex === pts.length - 1) {
          pts[0] = { ...pts[pts.length - 1] };
        }
      }
      refreshEditHandles();
      if (editingPin.value) {
        renderUpdatedShape(editingPin.value, toRaw(shape.value));
      }
    };
    onEditMouseUp = () => {
      if (editDragging) {
        editDragging = false;
        editDragIndex = null;
        map.dragPan.enable();
        map.getCanvas().style.cursor = "";
      }
    };
    map.on("mousedown", handlesLayerId, onEditMouseDown);
    map.on("mousemove", onEditMouseMove);
    map.on("mouseup", onEditMouseUp);
  }
  function refreshEditHandles() {
    if (!editHandlesSourceId || !shape.value) return;
    const src = map.getSource(editHandlesSourceId);
    if (!src) return;
    const pts = shape.value.positions || [];
    const isPolygon = shape.value.type === "polygon";
    // For polygon, the last position duplicates the first (closing point);
    // skip it so there aren't two overlapping handles on the same spot.
    const limit = isPolygon ? pts.length - 1 : pts.length;
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
    if (editHandlesSourceId) {
      const handlesLayerId = editHandlesSourceId + "-points";
      if (onEditMouseDown) map.off("mousedown", handlesLayerId, onEditMouseDown);
      if (map.getLayer(handlesLayerId)) map.removeLayer(handlesLayerId);
      if (map.getSource(editHandlesSourceId)) map.removeSource(editHandlesSourceId);
      editHandlesSourceId = null;
    }
    if (onEditMouseMove) map.off("mousemove", onEditMouseMove);
    if (onEditMouseUp) map.off("mouseup", onEditMouseUp);
    onEditMouseDown = null;
    onEditMouseMove = null;
    onEditMouseUp = null;
    editDragging = false;
    editDragIndex = null;
    map.dragPan.enable();
    map.getCanvas().style.cursor = "";
  }
  function startEditFeature(pin) {
    if (!pin || !pin.shape) return;
    // Switching to edit a different feature mid-edit: restore the previous
    // one's saved geometry (discard any unsaved drag) before moving on.
    if (editingPin.value && editingPin.value !== pin) {
      renderUpdatedShape(editingPin.value);
    }
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
    activeTab.value = "info";
    showForm.value = true;
    enableVertexEditing();
  }
  function renderUpdatedShape(pin, overrideShape) {
    const s = overrideShape || pin.shape;
    if (!s || !s.type) return;
    const sourceId = "draw-pin-" + pin.id;
    const src = map.getSource(sourceId);
    if (!src) return;
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
        map.setPaintProperty(sourceId + "-line", "line-color", s.color || "#ff0000");
        map.setPaintProperty(sourceId + "-line", "line-width", s.width || 3);
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
        map.setPaintProperty(sourceId + "-fill", "fill-color", s.color || "#ff0000");
      }
      if (map.getLayer(sourceId + "-line")) {
        map.setPaintProperty(
          sourceId + "-line",
          "line-color",
          s.outlineColor || s.color || "#ff0000",
        );
        map.setPaintProperty(sourceId + "-line", "line-width", s.width || 2);
      }
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
      if (map.getLayer(sourceId + "-fill")) {
        map.setPaintProperty(
          sourceId + "-fill",
          "fill-color",
          s.color || s.fillColor || "#0000ff",
        );
      }
      if (map.getLayer(sourceId + "-line")) {
        map.setPaintProperty(
          sourceId + "-line",
          "line-color",
          s.outlineColor || "#0000ff",
        );
      }
    } else if (s.type === "multi_point") {
      const features = s.positions.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: { color: p.color || s.color || "#00ff00" },
      }));
      src.setData({ type: "FeatureCollection", features });
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
        map.setPaintProperty(sourceId + "-point", "circle-color", s.color || "#ff0000");
      }
    }
  }
  const saveEditedPin = async () => {
    if (!formData.value.name.trim()) {
      activeTab.value = "info";
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
    circleCenter = null;
    clearTempLayers();
    await saveOneWorks(pin);
  };
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
    // خط نارنجی با ظاهری نرم
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
    // نقاط نارنجی با حاشیه سفید
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
    // برچسب مسافت (لایو) - با تنظیمات اطمینان از نمایش
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
    tempSourceId = tempId;
    tempLayerIds.push(tempId + "-line", tempId + "-points", tempId + "-labels");
    // کلیک
    clickHandler = (e) => {
      measurePoints.push([e.lngLat.lng, e.lngLat.lat]);
      const features = [];
      measurePoints.forEach((p) =>
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: p },
          properties: {},
        }),
      );
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
        const label = formatDistance(totalDist);
        features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: measurePoints[measurePoints.length - 1],
          },
          properties: { distance: label },
        });
      }
      const src = m.getSource(tempId);
      if (src) src.setData({ type: "FeatureCollection", features });
    };
    // حرکت موس (لایو)
    mouseMoveHandler = (e) => {
      if (measurePoints.length === 0) return;
      const features = [];
      measurePoints.forEach((p) =>
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: p },
          properties: {},
        }),
      );
      const allPoints = [...measurePoints, [e.lngLat.lng, e.lngLat.lat]];
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: allPoints },
        properties: {},
      });
      let totalDist = 0;
      for (let i = 1; i < allPoints.length; i++) {
        totalDist += measureDistance(allPoints[i - 1], allPoints[i]);
      }
      const label = formatDistance(totalDist);
      // برچسب روی نقطه انتهایی (موقعیت ماوس)
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [e.lngLat.lng, e.lngLat.lat] },
        properties: { distance: label },
      });
      const src = m.getSource(tempId);
      if (src) src.setData({ type: "FeatureCollection", features });
    };
    // کلیک راست (ریست)
    rightClickHandler = (e) => {
      e.preventDefault();
      measurePoints.length = 0;
      const src = m.getSource(tempId);
      if (src) src.setData({ type: "FeatureCollection", features: [] });
    };
    m.on("click", clickHandler);
    m.on("mousemove", mouseMoveHandler);
    m.on("contextmenu", rightClickHandler);
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
    measurePoints.length = 0;
    measureActive.value = false;
    clearTempLayers();
  }
  const cancelForm = () => {
    // Edit mode never mutates the original pin until save, so cancelling
    // simply discards the local form/shape state below. If vertices were
    // dragged, the map preview must be reverted to the saved geometry.
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
    circleCenter = null;
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
        if (shape.value) {
          savePin();
        } else {
          alert("خطا در پایان ترسیم، لطفاً دوباره تلاش کنید");
        }
      });
    } else {
      savePin();
    }
  };
  const nameError = ref(false);
  const savePin = async () => {
    if (!formData.value.name.trim()) {
      activeTab.value = "info";
      nameError.value = true;
      return;
    }
    if (!shape.value) {
      alert("ترسیم کامل نشده است");
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
    circleCenter = null;
    clearTempLayers();
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
        // Already exists on the server -> update instead of creating a duplicate
        await axios.put(SERVER + "/api/save/myWork/" + item.save, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        const response = await axios.post(
          SERVER + "/api/Save/myWork/" + authStore.user?.id,
          fd,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        if (response.data?.id) item.save = response.data.id;
      }
    } catch (err) {
      console.error("خطا در ذخیره‌سازی:", err);
    } finally {
      loading.value = false;
    }
  };
  // Helper functions
  function getDrawTypeName() {
    const type = shape.value?.type || drawMode.value;
    if (editingPin.value) {
      const editNames = {
        circle: "ویرایش دایره",
        polygon: "ویرایش پلیگن",
        polyline: "ویرایش خط",
        multi_point: "ویرایش چند نقطه",
        point: "ویرایش نقطه",
      };
      return editNames[type] || "ویرایش ترسیم";
    }
    const names = {
      circle: "ترسیم دایره جدید",
      polygon: "ترسیم پلیگن جدید",
      polyline: "ترسیم خط جدید",
      multi_point: "ترسیم چند نقطه جدید",
    };
    return names[type] || "ترسیم جدید";
  }
  function getPointsCount() {
    if (!shape.value) return 0;
    if (shape.value.type === "circle") return 1;
    if (shape.value.type === "point") return 1;
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
    let area = 0;
    const coords = points.map((p) => {
      const zone = Math.floor((p.lon + 180) / 6) + 1;
      return proj4(
        "EPSG:4326",
        `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`,
        [p.lon, p.lat],
      );
    });
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      area += coords[i][0] * coords[j][1];
      area -= coords[j][0] * coords[i][1];
    }
    area = Math.abs(area) / 2;
    return formatArea(area);
  }
  // طول: زیر 1 متر -> سانتی‌متر، بین 1 تا 1000 متر -> متر، بالای 1000 متر -> کیلومتر
  // برچسب مختصات هر ورتکس روی نقشه: بر اساس coordinateSystem (پیش‌فرض UTM)
  function formatVertexLabel(lng, lat) {
    if (coordinateSystem.value === "utm") {
      const zone = Math.floor((lng + 180) / 6) + 1;
      const hemisphere = lat >= 0 ? "" : "+south";
      const [x, y] = proj4(
        "EPSG:4326",
        `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${hemisphere}`,
        [lng, lat],
      );
      return `${x.toFixed(2)}, ${y.toFixed(2)} (Z${zone})`;
    }
    return `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
  }
  function formatDistance(meters) {
    if (meters < 1) return (meters * 100).toFixed(0) + " cm";
    if (meters >= 1000) return (meters / 1000).toFixed(2) + " km";
    return meters.toFixed(2) + " m";
  }
  // مساحت: زیر 1000 متر مربع -> متر مربع، بالای 1000 متر مربع -> هکتار
  function formatArea(squareMeters) {
    if (squareMeters >= 1000) return (squareMeters / 10000).toFixed(2) + " هکتار";
    return squareMeters.toFixed(2) + " m²";
  }
  function formatCoordinate(point) {
    if (point.system === "utm") {
      return `${point.displayX.toFixed(3)} E, ${point.displayY.toFixed(3)} N (منطقه ${point.zone})`;
    } else {
      return `${point.displayX.toFixed(6)}, ${point.displayY.toFixed(6)}`;
    }
  }
  function copyCoordinates(point) {
    let text;
    if (point.system === "utm") {
      text = `${point.displayX.toFixed(3)} E, ${point.displayY.toFixed(3)} N (منطقه ${point.zone})`;
    } else {
      text = `${point.displayX.toFixed(6)}, ${point.displayY.toFixed(6)}`;
    }
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
    circleCenter = null;
    pointList.value = [];
    if (map.getSource(drawDataSourceId)) {
      map
        .getSource(drawDataSourceId)
        .setData({ type: "FeatureCollection", features: [] });
    }
    map.getCanvas().style.cursor = "default";
  }
    // برش پلی‌لاین
  function splitPolyline(pin, cutLine) {
    const coords = pin.shape.positions.map((p) => [p.lon, p.lat]);
    const lineFeature = turf.lineString(coords, { originalId: pin.id });
    
    const split = turf.lineSplit(lineFeature, cutLine);
    
    if (split.features.length > 1) {
      return split.features.map((feat, index) => {
        const newPositions = feat.geometry.coordinates.map(([lon, lat]) => ({
          lon,
          lat,
          height: 0,
        }));
        return {
          ...pin,
          id: crypto.randomUUID(),
          name: `${pin.name} (بخش ${index + 1})`,
          shape: {
            ...pin.shape,
            type: "polyline",
            positions: newPositions,
          },
          save: -1, // باید دوباره ذخیره شود
        };
      });
    }
    return [pin]; // اگر برشی رخ نداد، همان قبلی را برمی‌گرداند
  }

  // برش پلی‌گان
  function splitPolygon(pin, cutLine) {
    // تبدیل پلی‌گان به یک خط بسته (Ring)
    const coords = [pin.shape.positions.map((p) => [p.lon, p.lat])];
    const polygonFeature = turf.polygon(coords, { originalId: pin.id });
    const ringLine = turf.polygonToLine(polygonFeature);
    
    // برش خط محیطی پلی‌گان با خط برش
    const split = turf.lineSplit(ringLine, cutLine);
    
    if (split.features.length >= 2) {
      return split.features.map((feat, index) => {
        let newCoords = feat.geometry.coordinates;
        // اطمینان از بسته بودن حلقه پلی‌گان جدید
        const first = newCoords[0];
        const last = newCoords[newCoords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          newCoords.push([...first]);
        }
        
        const newPositions = newCoords.map(([lon, lat]) => ({
          lon,
          lat,
          height: 0,
        }));

        return {
          ...pin,
          id: crypto.randomUUID(),
          name: `${pin.name} (بخش ${index + 1})`,
          shape: {
            ...pin.shape,
            type: "polygon",
            positions: newPositions,
          },
          save: -1, // باید دوباره ذخیره شود
        };
      });
    }
    return [pin];
  }

  // پردازش نهایی برش و به‌روزرسانی آرایه pins
  function processCut(cutPositions) {
    const cutCoords = cutPositions.map((p) => [p.lng, p.lat]);
    const cutLine = turf.lineString(cutCoords);
    
    let hasCut = false;
    const newPins = [];

    // پیمایش تمام پین‌ها برای پیدا کردن تقاطع
    // نکته: اگر pins یک Ref است، باید با pins.value کار کنید. 
    // در اینجا فرض بر این است که pins یک آرایه reactive یا ref است که می‌توان روی آن iterat کرد.
    const pinsList = Array.isArray(pins) ? pins : pins.value || [];

    pinsList.forEach((pin) => {
      if (pin.shape && (pin.shape.type === "polyline" || pin.shape.type === "polygon")) {
        const coords = pin.shape.type === "polygon" 
          ? [pin.shape.positions.map((p) => [p.lon, p.lat])]
          : pin.shape.positions.map((p) => [p.lon, p.lat]);
          
        const feature = pin.shape.type === "polygon" ? turf.polygon(coords) : turf.lineString(coords);
        
        // بررسی تقاطع
        if (turf.booleanIntersects(feature, cutLine)) {
          hasCut = true;
          if (pin.shape.type === "polyline") {
            newPins.push(...splitPolyline(pin, cutLine));
          } else {
            newPins.push(...splitPolygon(pin, cutLine));
          }
        } else {
          newPins.push(pin);
        }
      } else {
        newPins.push(pin);
      }
    });

    if (hasCut) {
      // به‌روزرسانی آرایه pins با حفظ reactivity
      if (Array.isArray(pins)) {
        pins.splice(0, pins.length, ...newPins);
      } else if (pins.value) {
        pins.value = newPins;
      }
      
      // اطلاع‌رسانی به کامپوننت والد (اختیاری)
      emit("pinsUpdated", newPins);
      $toast.success("شکل با موفقیت برش داده شد");
    } else {
      $toast.warning("خط برش با هیچ شکلی تقاطع نداشت");
    }

    // پاکسازی حالت برش
    inactiveDrawing();
  }

  // --- CUT FEATURE: شروع حالت برش ---
  function startCutMode() {
    if (editingPin.value) {
      renderUpdatedShape(editingPin.value);
      disableVertexEditing();
    }
    editingPin.value = null;
    cleanupHandlers();
    clearTempLayers();
    
    drawMode.value = "cut";
    activeTab.value = "measurements";
    positions.length = 0;
    shape.value = null;
    showForm.value = true; // نمایش فرم برای کنترل‌های حین برش (مثل دکمه لغو)
    
    setTimeout(() => {
      startDrawingCutLine();
    }, 100);
  }

  // رسم خط برش (مشابه polyline اما با منطق پایان متفاوت)
  function startDrawingCutLine() {
    const m = map;
    m.getCanvas().style.cursor = "crosshair";
    
    tempSourceId = "temp-cut-" + crypto.randomUUID();
    m.addSource(tempSourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    
    const lineLayerId = tempSourceId + "-line";
    const pointsLayerId = tempSourceId + "-points";
    
    m.addLayer({
      id: lineLayerId,
      type: "line",
      source: tempSourceId,
      paint: {
        "line-color": "#ef4444", // قرمز برای تمایز حالت برش
        "line-width": 4,
        "line-dasharray": [6, 4],
        "line-opacity": 0.9,
      },
    });
    
    m.addLayer({
      id: pointsLayerId,
      type: "circle",
      source: tempSourceId,
      filter: ["==", "$type", "Point"],
      paint: {
        "circle-radius": 6,
        "circle-color": "#ffffff",
        "circle-stroke-color": "#ef4444",
        "circle-stroke-width": 3,
      },
    });
    
    tempLayerIds.push(lineLayerId, pointsLayerId);

    const updateCutGeoJSON = () => {
      const src = m.getSource(tempSourceId);
      if (!src) return;
      const lineCoords = positions.map((p) => [p.lng, p.lat]);
      const pointFeatures = positions.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {},
      }));
      
      const features = [...pointFeatures];
      if (lineCoords.length >= 2) {
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: lineCoords },
          properties: {},
        });
      }
      src.setData({ type: "FeatureCollection", features });
    };

    clickHandler = (e) => {
      positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      updateCutGeoJSON();
    };

    mouseMoveHandler = (e) => {
      if (positions.length === 0) return;
      const src = m.getSource(tempSourceId);
      if (!src) return;
      const pts = [...positions, { lng: e.lngLat.lng, lat: e.lngLat.lat }];
      const lineCoords = pts.map((p) => [p.lng, p.lat]);
      const pointFeatures = pts.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {},
      }));
      const features = [...pointFeatures];
      if (lineCoords.length >= 2) {
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: lineCoords },
          properties: {},
        });
      }
      src.setData({ type: "FeatureCollection", features });
    };

    // پایان برش با دابل‌کلیک یا کلیک راست
    const finishCut = () => {
      if (positions.length < 2) {
        cleanupHandlers();
        clearTempLayers();
        drawMode.value = "";
        showForm.value = false;
        return;
      }
      cleanupHandlers();
      map.getCanvas().style.cursor = "default";
      processCut([...positions]);
    };

    rightClickHandler = (e) => {
      e.preventDefault();
      finishCut();
    };

    dblClickHandler = () => {
      finishCut();
    };

    keyHandler = (event) => {
      if (event.key === "Escape") {
        cleanupHandlers();
        clearTempLayers();
        drawMode.value = "";
        showForm.value = false;
        positions.length = 0;
      }
    };

    window.addEventListener("keydown", keyHandler);
    m.on("click", clickHandler);
    m.on("mousemove", mouseMoveHandler);
    m.on("contextmenu", rightClickHandler);
    m.on("dblclick", dblClickHandler);
  }
  return {
    // State
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
    // Computed
    tabs,
    livePoints,
    displayPoints,
    livePointCount,
    liveTotalLength,
    liveArea,
    liveRadius,
    isSaveEnabled,
    // Methods
    togglePointPick,
    setDrawMode,
    toggleMeasure,
    cancelForm,
    startCutMode,
    handleSave,
    onFileChange,
    formatCoordinate,
    copyCoordinates,
    getDrawTypeName,
    inactiveDrawing,
  };
}