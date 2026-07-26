import { ref, reactive, toRaw, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import axios from "axios";
import proj4 from "proj4";
import { useAuthStore } from "../stores/auth";
import { useToast } from "vue-toast-notification";

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
  const activeTab = ref('measurements');
  let radius = 0;
  let circleCenter = null;
  const tempCircle = ref(null);
  const measurePoints = reactive([]);
  const measureActive = ref(false);
  const coordinateSystem = ref('latlon');

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
  const tabs = computed(() => {
    const isMultiPoint = drawMode.value === 'multi_point' || shape.value?.type === 'multi_point';
    const isMeasure = drawMode.value === 'measure' || measureActive.value;
    return [
      {
        key: 'measurements',
        label: isMultiPoint ? 'نقاط' : isMeasure ? 'اندازه‌گیری' : 'اندازه‌ها'
      },
      { key: 'style', label: 'استایل' },
      { key: 'info', label: 'ذخیره' }
    ];
  });

  // Computed
  const livePoints = computed(() => {
    if (shape.value) return getAllPoints();
    if (drawMode.value === 'circle' && tempCircle.value) return [{ lat: tempCircle.value.center.lat, lon: tempCircle.value.center.lng }];
    if (positions.length > 0) return positions.map(p => ({ lat: p.lat, lon: p.lng }));
    return [];
  });

  const displayPoints = computed(() => {
    if (measureActive.value) {
      return measurePoints.map((p, i) => {
        if (coordinateSystem.value === 'utm') {
          const zone = Math.floor((p[0] + 180) / 6) + 1;
          const [x, y] = proj4('EPSG:4326', `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`, [p[0], p[1]]);
          return { lat: p[1], lon: p[0], displayX: x, displayY: y, zone, system: 'utm', index: i };
        } else {
          return { lat: p[1], lon: p[0], displayX: p[0], displayY: p[1], system: 'latlon', index: i };
        }
      });
    }
    return livePoints.value.map(p => {
      if (coordinateSystem.value === 'utm') {
        const zone = Math.floor((p.lon + 180) / 6) + 1;
        const [x, y] = proj4('EPSG:4326', `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`, [p.lon, p.lat]);
        return { ...p, displayX: x, displayY: y, zone, system: 'utm' };
      } else {
        return { ...p, displayX: p.lon, displayY: p.lat, system: 'latlon' };
      }
    });
  });

  const livePointCount = computed(() => {
    if (shape.value) return getPointsCount();
    if (drawMode.value === 'circle' && tempCircle.value) return 1;
    if (measureActive.value) return measurePoints.length;
    return positions.length;
  });

  const liveTotalLength = computed(() => {
    if (shape.value) return calculateTotalLength();
    if (measureActive.value) {
      if (measurePoints.length < 2) return '0 m';
      let total = 0;
      for (let i = 1; i < measurePoints.length; i++) {
        total += measureDistance(measurePoints[i - 1], measurePoints[i]);
      }
      return formatDistance(total);
    }
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

  const isSaveEnabled = computed(() => {
    if (drawMode.value === 'multi_point') {
      return positions.length > 0;
    }
    return !!shape.value;
  });

  // Watchers
  watch(shape, (newVal) => {
    if (newVal && showForm.value) {
      tempCircle.value = null;
      circleCenter = null;
    }
  }, { deep: true });

  watch(() => formData.value.name, () => {
    nameError.value = false;
  });

  // Lifecycle
  onMounted(() => {
    if (!map.getSource(drawDataSourceId)) {
      map.addSource(drawDataSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    }
  });

  onUnmounted(() => {
    cleanupHandlers();
    clearTempLayers();
  });

  // Helper functions
  function clearTempLayers() {
    tempLayerIds.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    tempLayerIds = [];
    if (tempSourceId && map.getSource(tempSourceId)) {
      map.removeSource(tempSourceId);
      tempSourceId = null;
    }
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
    emit("disableFeatureInfo");
    pickForForm.value = false;

    if (drawMode.value === mode && showForm.value) return;

    measureActive.value = false;
    cleanupHandlers();
    clearTempLayers();
    drawMode.value = mode;
    activeTab.value = 'measurements';
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
      m.addSource(tempSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
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
          "circle-opacity": 0.9
        },
      });
      tempLayerIds.push(pointsLayerId);

      const updateMultiPointSource = () => {
        const src = m.getSource(tempSourceId);
        if (!src) return;
        const features = positions.map(p => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: { color: p.color || color.value }
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
      m.addSource(tempSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      const lineLayerId = tempSourceId + "-line";
      const pointsLayerId = tempSourceId + "-points";
      m.addLayer({ id: lineLayerId, type: "line", source: tempSourceId, paint: { "line-color": color.value, "line-width": 3, "line-opacity": 0.85 } });
      m.addLayer({ id: pointsLayerId, type: "circle", source: tempSourceId, filter: ["==", "$type", "Point"], paint: { "circle-radius": 6, "circle-color": "#ffffff", "circle-stroke-color": color.value, "circle-stroke-width": 3, "circle-opacity": 0.9 } });
      tempLayerIds.push(lineLayerId, pointsLayerId);

      clickHandler = (e) => { positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat }); updateTempGeoJSON(); };
      mouseMoveHandler = (e) => { if (positions.length === 0) return; const pts = [...positions, { lng: e.lngLat.lng, lat: e.lngLat.lat }]; updateTempGeoJSONWithPreview(pts); };
      rightClickHandler = (e) => { e.preventDefault(); if (positions.length > 0) { positions.pop(); updateTempGeoJSON(); if (positions.length < 2) cleanupHandlers(); } };
      dblClickHandler = () => { if (positions.length < 2) return; if (positions.length > 1) positions.pop(); cleanupHandlers(); finishDrawing("polyline", [...positions]); };
      keyHandler = (event) => { if (event.key === "Delete" && positions.length > 0) { positions.pop(); updateTempGeoJSON(); if (positions.length < 2) cleanupHandlers(); } };
      window.addEventListener("keydown", keyHandler);
      m.on("click", clickHandler);
      m.on("mousemove", mouseMoveHandler);
      m.on("contextmenu", rightClickHandler);
      m.on("dblclick", dblClickHandler);
    } else if (drawMode.value === "polygon") {
      tempSourceId = "temp-" + crypto.randomUUID();
      m.addSource(tempSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
       const fillLayerId = tempSourceId + "-fill";
      const outlineLayerId = tempSourceId + "-outline";
      const pointsLayerId = tempSourceId + "-points";
      m.addLayer({ id: fillLayerId, type: "fill", source: tempSourceId, paint: { "fill-color": color.value, "fill-opacity": 0.35 } });
      m.addLayer({ id: outlineLayerId, type: "line", source: tempSourceId, paint: { "line-color": color.value, "line-width": 2.5, "line-opacity": 0.9 } });
      m.addLayer({ id: pointsLayerId, type: "circle", source: tempSourceId, filter: ["==", "$type", "Point"], paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": color.value, "circle-stroke-width": 2.5, "circle-opacity": 0.9 } });
      tempLayerIds.push(fillLayerId, outlineLayerId, pointsLayerId);

      clickHandler = (e) => { positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat }); updateTempGeoJSON(); };
      mouseMoveHandler = (e) => { if (positions.length === 0) return; const pts = [...positions, { lng: e.lngLat.lng, lat: e.lngLat.lat }]; updateTempGeoJSONWithPreview(pts); };
      rightClickHandler = (e) => { e.preventDefault(); if (positions.length > 0) { positions.pop(); updateTempGeoJSON(); if (positions.length < 3) cleanupHandlers(); } };
      dblClickHandler = () => { if (positions.length < 3) return; if (positions.length > 0) positions.pop(); cleanupHandlers(); finishDrawing("polygon", [...positions]); };
      keyHandler = (event) => { if (event.key === "Delete" && positions.length > 0) { positions.pop(); updateTempGeoJSON(); if (positions.length < 3) cleanupHandlers(); } };
      window.addEventListener("keydown", keyHandler);
      m.on("click", clickHandler);
      m.on("mousemove", mouseMoveHandler);
      m.on("contextmenu", rightClickHandler);
      m.on("dblclick", dblClickHandler);
    } else if (drawMode.value === "circle") {
      circleCenter = null;
      tempCircle.value = null;
      tempSourceId = "temp-" + crypto.randomUUID();
      m.addSource(tempSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
       const fillLayerId = tempSourceId + "-fill";
      const outlineLayerId = tempSourceId + "-outline";
      m.addLayer({ id: fillLayerId, type: "fill", source: tempSourceId, paint: { "fill-color": color.value, "fill-opacity": 0.4 } });
      m.addLayer({ id: outlineLayerId, type: "line", source: tempSourceId, paint: { "line-color": color.value, "line-width": 2, "line-opacity": 0.9 } });
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
        const src = m.getSource(tempSourceId);
        if (src) src.setData({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} }] });
      };
      m.on("click", clickHandler);
      m.on("mousemove", mouseMoveHandler);
    }
  }

  function updateTempGeoJSON() {
    const src = map.getSource(tempSourceId);
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
    const src = map.getSource(tempSourceId);
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
    map.getCanvas().style.cursor = "default";

    const defaultOpacity = 0.7;
    const defaultWidth = 3;

    if (draw === "circle") {
      shape.value = { type: "circle", center: pos.center, radius, color: color.value, opacity: defaultOpacity, width: defaultWidth, backgroundImage: null, show: true };
      tempCircle.value = null;
      circleCenter = null;
    } else if (draw === "multi_point") {
      shape.value = {
        type: "multi_point",
        positions: pos.map(p => ({ lon: p.lng, lat: p.lat, height: 0, color: p.color || color.value })),
        color: color.value,
        opacity: defaultOpacity,
        width: 5,
        show: true
      };
    } else if (draw === "polyline") {
      shape.value = { type: draw, positions: pos.map(p => ({ lon: p.lng, lat: p.lat, height: 0 })), color: color.value, opacity: defaultOpacity, width: 3, show: true };
    } else if (draw === "polygon") {
      const coords = pos.map(p => ({ lon: p.lng, lat: p.lat, height: 0 }));
      coords.push(coords[0]);
      shape.value = { type: "polygon", positions: coords, color: color.value, outlineColor: color.value, opacity: defaultOpacity, width: defaultWidth, show: true };
    }

    positions.length = 0;
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
  const m = map;
  measurePoints.length = 0;
  const tempId = "measure-temp-" + crypto.randomUUID();

  m.addSource(tempId, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });

  // 🔶 خط نارنجی با ظاهری نرم
  m.addLayer({
    id: tempId + "-line",
    type: "line",
    source: tempId,
    paint: {
      "line-color": "#f97316",
      "line-width": 4,
      "line-dasharray": [8, 6],
      "line-opacity": 0.85
    }
  });

  // 🔶 نقاط نارنجی با حاشیه سفید
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
      "circle-opacity": 0.9
    }
  });

  // 🏷️ برچسب مسافت (لایو) - با تنظیمات اطمینان از نمایش
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
      "text-allow-overlap": true,       // اجازه هم‌پوشانی
      "text-ignore-placement": true,    // نادیده گرفتن جای‌گذاری
      "text-font": ["Droid Sans", "Arial Unicode MS Bold"]
    },
    paint: {
      "text-color": "#1e293b",
      "text-halo-color": "#ffffff",
      "text-halo-width": 3,
      "text-halo-blur": 2
    }
  });

  tempSourceId = tempId;
  tempLayerIds.push(tempId + "-line", tempId + "-points", tempId + "-labels");

  // ===== کلیک =====
  clickHandler = (e) => {
    measurePoints.push([e.lngLat.lng, e.lngLat.lat]);
    const features = [];
    measurePoints.forEach(p => features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: p },
      properties: {}
    }));

    if (measurePoints.length >= 2) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: measurePoints },
        properties: {}
      });

      let totalDist = 0;
      for (let i = 1; i < measurePoints.length; i++) {
        totalDist += measureDistance(measurePoints[i - 1], measurePoints[i]);
      }
      const label = totalDist > 1000
        ? (totalDist / 1000).toFixed(2) + " km"
        : totalDist.toFixed(1) + " m";

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: measurePoints[measurePoints.length - 1] },
        properties: { distance: label }
      });
    }

    const src = m.getSource(tempId);
    if (src) src.setData({ type: "FeatureCollection", features });
  };

  // ===== حرکت موس (لایو) =====
  mouseMoveHandler = (e) => {
    if (measurePoints.length === 0) return;

    const features = [];
    measurePoints.forEach(p => features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: p },
      properties: {}
    }));

    const allPoints = [...measurePoints, [e.lngLat.lng, e.lngLat.lat]];
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: allPoints },
      properties: {}
    });

    let totalDist = 0;
    for (let i = 1; i < allPoints.length; i++) {
      totalDist += measureDistance(allPoints[i - 1], allPoints[i]);
    }
    const label = totalDist > 1000
      ? (totalDist / 1000).toFixed(2) + " km"
      : totalDist.toFixed(1) + " m";

    // برچسب روی نقطه انتهایی (موقعیت ماوس)
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [e.lngLat.lng, e.lngLat.lat] },
      properties: { distance: label }
    });

    const src = m.getSource(tempId);
    if (src) src.setData({ type: "FeatureCollection", features });
  };

  // ===== کلیک راست (ریست) =====
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
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function stopMeasure() {
    cleanupHandlers();
    measurePoints.length = 0;
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
    measurePoints.length = 0;
    measureActive.value = false;

    if (map.getSource(drawDataSourceId)) {
      map.getSource(drawDataSourceId).setData({ type: "FeatureCollection", features: [] });
    }
    map.getCanvas().style.cursor = "default";
  };

  const onFileChange = (e) => {
    attch_file.value = e.target.files[0];
  };

  const handleSave = () => {
    if (drawMode.value === 'multi_point' && !shape.value && positions.length > 0) {
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
      activeTab.value = 'info';
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

    if (attch_file.value && (drawMode.value === 'circle' || shape.value?.type === 'circle')) {
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
    const type = shape.value?.type || drawMode.value;
    const names = {
      'circle': 'ترسیم دایره جدید',
      'polygon': 'ترسیم پلیگن جدید',
      'polyline': 'ترسیم خط جدید',
      'multi_point': 'ترسیم چند نقطه جدید'
    };
    return names[type] || 'ترسیم جدید';
  }

  function getPointsCount() {
    if (!shape.value) return 0;
    if (shape.value.type === 'circle') return 1;
    if (shape.value.type === 'multi_point') return shape.value.positions?.length || 0;
    const pos = shape.value.positions || [];
    return pos.length > 0 ? pos.length - 1 : 0;
  }

  function getAllPoints() {
    if (!shape.value) return [];
    if (shape.value.type === 'circle') return [{ lat: shape.value.center.lat, lon: shape.value.center.lng }];
    const pos = shape.value.positions || [];
    if (shape.value.type === 'polygon' && pos.length > 1) return pos.slice(0, -1);
    return pos;
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

  function formatCoordinate(point) {
    if (point.system === 'utm') {
      return `${point.displayX.toFixed(3)} E, ${point.displayY.toFixed(3)} N (منطقه ${point.zone})`;
    } else {
      return `${point.displayX.toFixed(6)}, ${point.displayY.toFixed(6)}`;
    }
  }

  function copyCoordinates(point) {
    let text;
    if (point.system === 'utm') {
      text = `${point.displayX.toFixed(3)} E, ${point.displayY.toFixed(3)} N (منطقه ${point.zone})`;
    } else {
      text = `${point.displayX.toFixed(6)}, ${point.displayY.toFixed(6)}`;
    }
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
      map.getSource(drawDataSourceId).setData({ type: "FeatureCollection", features: [] });
    }
    map.getCanvas().style.cursor = "default";
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
    handleSave,
    onFileChange,
    formatCoordinate,
    copyCoordinates,
    getDrawTypeName,
    inactiveDrawing,
  };
}
