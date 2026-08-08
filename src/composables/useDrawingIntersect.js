import * as turf from "@turf/turf";
import { ref, computed } from "vue";
import { registerDrawLayer } from "../utils/layerOrder";
import { toUTM, formatDistance, formatArea, computeCircleCoords } from "./useDrawingHelpers";

/**
 * ماژول «همپوشانی» (Intersect)
 * ----------------------------------------------------------------
 * کاربر یک پلیگان همپوشانی رسم می‌کند (یا فایل KML آپلود می‌کند) و این ماژول
 * تمام پین‌های موجود (ctx.pins) را با آن پلیگان مقایسه می‌کند:
 *  - نقطه / چند‌نقطه‌ای: نقاطی که داخل محدوده هستند + مختصات (Lat/Lon و UTM)
 *  - خط: بخشی از خط که داخل محدوده است (طول)
 *  - پلیگان / دایره: بخشی از سطح که داخل محدوده است (مساحت)
 *
 * این ماژول destructive نیست؛ هیچ شکلی حذف/تغییر داده نمی‌شود، فقط تحلیل و
 * نمایش (هایلایت + گزارش) انجام می‌شود.
 *
 * ctx مورد نیاز (دقیقا مشابه cutCtx در useDrawingCut.js):
 *   map, pins, emit, $toast, drawMode, activeTab, positions, editingPin,
 *   hs, ts, renderUpdatedShape, disableVertexEditing, cleanupHandlers, clearTempLayers
 */

const OVERLAP_SOURCE = "intersect-overlap-src";
const HIGHLIGHT_SOURCE = "intersect-highlight-src";

export function createIntersectHandler(ctx) {
  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  const intersectResults = ref([]); // آرایه‌ای مسطح از نتایج (هر آیتم یک ردیف نتیجه)
  const overlapPolygon = ref(null); // turf.Feature<Polygon|MultiPolygon> فعلی
  const overlapSourceLabel = ref(""); // "ترسیم دستی" یا نام فایل KML
  const analyzing = ref(false);
  const intersectPanelOpen = ref(false); // پنل باز است (چه در حالت انتخاب، چه رسم، چه نتیجه)

  // ctx.intersectActive یک ref است که در useDrawing.js ساخته و به اینجا پاس داده می‌شود
  // تا در گاردِ کلیک روی شکل‌های موجود (onExistingFeatureClick) هم قابل‌استفاده باشد و
  // با کلیک روی محدوده‌ی همپوشانی‌شده، پنل ویرایش شکل باز نشود.
  const setIntersectActive = (val) => {
    if (ctx.intersectActive) ctx.intersectActive.value = val;
  };

  const intersectSummary = computed(() => {
    const rows = intersectResults.value;
    const lineRows = rows.filter((r) => r.kind === "line");
    const polyRows = rows.filter((r) => r.kind === "polygon");
    return {
      pointCount: rows.filter((r) => r.kind === "point").length,
      lineCount: lineRows.length,
      polygonCount: polyRows.length,
      totalLineLength: lineRows.reduce((s, r) => s + r.insideLengthMeters, 0),
      totalPolygonArea: polyRows.reduce((s, r) => s + r.insideAreaSqMeters, 0),
    };
  });

  // ---------------------------------------------------------------------
  // رندر لایه‌های نقشه
  // ---------------------------------------------------------------------
  function removeOverlapLayers() {
    const m = ctx.map;
    if (!m) return;
    [OVERLAP_SOURCE + "-fill", OVERLAP_SOURCE + "-line"].forEach((id) => {
      if (m.getLayer(id)) m.removeLayer(id);
    });
    if (m.getSource(OVERLAP_SOURCE)) m.removeSource(OVERLAP_SOURCE);
  }

  function renderOverlapPolygon(feature) {
    removeOverlapLayers();
    const m = ctx.map;
    m.addSource(OVERLAP_SOURCE, { type: "geojson", data: feature });
    m.addLayer({
      id: OVERLAP_SOURCE + "-fill",
      type: "fill",
      source: OVERLAP_SOURCE,
      paint: { "fill-color": "#f97316", "fill-opacity": 0.22 },
    });
    m.addLayer({
      id: OVERLAP_SOURCE + "-line",
      type: "line",
      source: OVERLAP_SOURCE,
      paint: { "line-color": "#f97316", "line-width": 3, "line-dasharray": [3, 2] },
    });
    registerDrawLayer(OVERLAP_SOURCE + "-fill");
    registerDrawLayer(OVERLAP_SOURCE + "-line");
  }

  function removeHighlightLayers() {
    const m = ctx.map;
    if (!m) return;
    [HIGHLIGHT_SOURCE + "-poly", HIGHLIGHT_SOURCE + "-line", HIGHLIGHT_SOURCE + "-point"].forEach((id) => {
      if (m.getLayer(id)) m.removeLayer(id);
    });
    if (m.getSource(HIGHLIGHT_SOURCE)) m.removeSource(HIGHLIGHT_SOURCE);
  }

  // نکته: از فیلتر legacy ("$type") استفاده شده، دقیقا هم‌سبک با بقیه‌ی
  // useDrawing.js / useDrawingCut.js تا با نسخه‌ی MapLibre پروژه سازگار بماند.
  function renderHighlights(rows) {
    removeHighlightLayers();
    const m = ctx.map;
    const pointFeatures = rows
      .filter((r) => r.kind === "point")
      .map((r) => ({ type: "Feature", geometry: { type: "Point", coordinates: [r.lon, r.lat] }, properties: {} }));
    const lineFeatures = rows
      .filter((r) => r.kind === "line")
      .flatMap((r) => (r.insideSegments || []).map((f) => ({ type: "Feature", geometry: f.geometry, properties: {} })));
    const polyFeatures = rows
      .filter((r) => r.kind === "polygon" && r.insideGeometry)
      .map((r) => ({ type: "Feature", geometry: r.insideGeometry.geometry, properties: {} }));

    const fc = { type: "FeatureCollection", features: [...pointFeatures, ...lineFeatures, ...polyFeatures] };
    if (fc.features.length === 0) return;

    m.addSource(HIGHLIGHT_SOURCE, { type: "geojson", data: fc });
    m.addLayer({
      id: HIGHLIGHT_SOURCE + "-poly",
      type: "fill",
      source: HIGHLIGHT_SOURCE,
      filter: ["==", "$type", "Polygon"],
      paint: { "fill-color": "#10b981", "fill-opacity": 0.5 },
    });
    m.addLayer({
      id: HIGHLIGHT_SOURCE + "-line",
      type: "line",
      source: HIGHLIGHT_SOURCE,
      filter: ["==", "$type", "LineString"],
      paint: { "line-color": "#10b981", "line-width": 5 },
    });
    m.addLayer({
      id: HIGHLIGHT_SOURCE + "-point",
      type: "circle",
      source: HIGHLIGHT_SOURCE,
      filter: ["==", "$type", "Point"],
      paint: { "circle-radius": 7, "circle-color": "#f59e0b", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
    });
    [HIGHLIGHT_SOURCE + "-poly", HIGHLIGHT_SOURCE + "-line", HIGHLIGHT_SOURCE + "-point"].forEach(registerDrawLayer);
  }

  // ---------------------------------------------------------------------
  // تحلیل: مقایسه‌ی همه‌ی پین‌ها با پلیگان همپوشانی
  // ---------------------------------------------------------------------
  function analyzePoint(pin, p, polygon, rows, idx) {
    if (p == null || p.lon == null || p.lat == null) return;
    if (!turf.booleanPointInPolygon([p.lon, p.lat], polygon)) return;
    const utm = toUTM(p.lon, p.lat);
    rows.push({
      kind: "point",
      pinId: pin.id,
      pinName: pin.name || "(بدون نام)",
      pointIndex: idx,
      lon: p.lon,
      lat: p.lat,
      utmX: utm.x,
      utmY: utm.y,
      utmZone: utm.zone,
      description: pin.descr || pin.shape?.description || "",
    });
  }

  function analyzeLine(pin, s, polygon, rows) {
    const coords = (s.positions || []).map((p) => [p.lon, p.lat]);
    if (coords.length < 2) return;
    let line;
    try {
      line = turf.lineString(coords);
    } catch (e) {
      return;
    }
    if (!turf.booleanIntersects(line, polygon)) return;

    const totalLength = turf.length(line, { units: "meters" });
    let insideLength = 0;
    const insideSegments = [];
    try {
      const boundary = turf.polygonToLine(polygon);
      const boundaryLines = boundary.type === "FeatureCollection" ? boundary.features : [boundary];
      let pieces = [line];
      boundaryLines.forEach((bl) => {
        const nextPieces = [];
        pieces.forEach((piece) => {
          const split = turf.lineSplit(piece, bl);
          if (split.features.length) nextPieces.push(...split.features);
          else nextPieces.push(piece);
        });
        pieces = nextPieces;
      });
      pieces.forEach((piece) => {
        const len = turf.length(piece, { units: "meters" });
        if (len === 0) return;
        const mid = turf.along(piece, len / 2, { units: "meters" });
        if (turf.booleanPointInPolygon(mid, polygon)) {
          insideLength += len;
          insideSegments.push(piece);
        }
      });
    } catch (e) {
      // اگر تقسیم خط بر اساس مرز پلیگان ممکن نشد، حالت fallback: بر اساس نقطه‌ی میانی خط تصمیم بگیر
      const mid = turf.along(line, totalLength / 2, { units: "meters" });
      if (turf.booleanPointInPolygon(mid, polygon)) {
        insideLength = totalLength;
        insideSegments.push(line);
      }
    }
    if (insideLength <= 0) return;

    rows.push({
      kind: "line",
      pinId: pin.id,
      pinName: pin.name || "(بدون نام)",
      insideLengthMeters: insideLength,
      totalLengthMeters: totalLength,
      percentage: totalLength ? (insideLength / totalLength) * 100 : 0,
      insideSegments,
      description: pin.descr || s.description || "",
    });
  }

  function analyzePolygon(pin, positions, polygon, rows, isCircle) {
    if (!positions || positions.length < 3) return;
    const ring = positions.map((p) => [p.lon, p.lat]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);

    let poly;
    try {
      poly = turf.polygon([ring]);
    } catch (e) {
      return;
    }
    if (!turf.booleanIntersects(poly, polygon)) return;

    let intersection = null;
    try {
      intersection = turf.intersect(turf.featureCollection([poly, polygon]));
    } catch (e) {
      intersection = null;
    }
    if (!intersection) return;

    const insideArea = turf.area(intersection);
    if (insideArea <= 0) return;
    const totalArea = turf.area(poly);

    rows.push({
      kind: "polygon",
      pinId: pin.id,
      pinName: pin.name || "(بدون نام)",
      insideAreaSqMeters: insideArea,
      totalAreaSqMeters: totalArea,
      percentage: totalArea ? (insideArea / totalArea) * 100 : 0,
      insideGeometry: intersection,
      isCircle: !!isCircle,
      description: pin.descr || "",
    });
  }

  function analyzePinShape(pin, polygon, rows) {
    const s = pin.shape;
    if (!s || !s.type) return;
    if (s.show === false) return;
    if (s.type === "point") {
      analyzePoint(pin, { lon: s.lon, lat: s.lat }, polygon, rows);
    } else if (s.type === "multi_point") {
      (s.positions || []).forEach((p, idx) => analyzePoint(pin, p, polygon, rows, idx));
    } else if (s.type === "polyline") {
      analyzeLine(pin, s, polygon, rows);
    } else if (s.type === "polygon") {
      analyzePolygon(pin, s.positions, polygon, rows, false);
    } else if (s.type === "circle" && s.center && s.radius) {
      const ring = computeCircleCoords(s.center, s.radius).map(([lon, lat]) => ({ lon, lat }));
      analyzePolygon(pin, ring, polygon, rows, true);
    }
  }

  function collectVisiblePins(list) {
    const visible = [];
    (list || []).forEach((pin) => {
      if (!pin) return;
      if (pin.type === "group") {
        if (pin.show === false) return;
        visible.push(...collectVisiblePins(pin.children));
        return;
      }
      if (!pin.shape || !pin.shape.type) return;
      if (pin.shape.show === false) return;
      visible.push(pin);
    });
    return visible;
  }

  function runIntersectAnalysis(polygon) {
    analyzing.value = true;
    const rows = [];
    const pinsList = Array.isArray(ctx.pins) ? ctx.pins : ctx.pins.value || [];
    collectVisiblePins(pinsList).forEach((pin) => {
      analyzePinShape(pin, polygon, rows);
    });
    intersectResults.value = rows;
    renderHighlights(rows);
    analyzing.value = false;
    if (ctx.$toast) {
      if (rows.length) ctx.$toast.success(`${rows.length} مورد در محدوده همپوشانی یافت شد`);
      else ctx.$toast.warning("هیچ عنصری در محدوده همپوشانی قرار ندارد");
    }
  }

  function applyOverlapPolygon(feature, label) {
    overlapPolygon.value = feature;
    overlapSourceLabel.value = label;
    intersectPanelOpen.value = true;
    setIntersectActive(true);
    renderOverlapPolygon(feature);
    runIntersectAnalysis(feature);
  }

  // باز کردن پنل همپوشانی از روی دکمه‌ی نوار ابزار — هنوز چیزی رسم/آپلود نشده،
  // فقط پنل با دو گزینه‌ی «ترسیم دستی» و «آپلود KML» نمایش داده می‌شود.
  function openIntersectPanel() {
    intersectPanelOpen.value = true;
  }

  // ---------------------------------------------------------------------
  // رسم دستی پلیگان همپوشانی روی نقشه (کلیک برای افزودن راس، دابل‌کلیک/راست‌کلیک برای پایان)
  // ---------------------------------------------------------------------
  function startDrawingOverlapPolygon() {
    const m = ctx.map;
    m.getCanvas().style.cursor = "crosshair";
    ctx.ts.sourceId = "temp-intersect-" + crypto.randomUUID();
    m.addSource(ctx.ts.sourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });

    const fillLayerId = ctx.ts.sourceId + "-fill";
    const lineLayerId = ctx.ts.sourceId + "-line";
    const pointsLayerId = ctx.ts.sourceId + "-points";
    m.addLayer({
      id: fillLayerId, type: "fill", source: ctx.ts.sourceId,
      filter: ["==", "$type", "Polygon"],
      paint: { "fill-color": "#f97316", "fill-opacity": 0.2 },
    });
    m.addLayer({
      id: lineLayerId, type: "line", source: ctx.ts.sourceId,
      paint: { "line-color": "#f97316", "line-width": 3, "line-dasharray": [3, 2] },
    });
    m.addLayer({
      id: pointsLayerId, type: "circle", source: ctx.ts.sourceId,
      filter: ["==", "$type", "Point"],
      paint: { "circle-radius": 6, "circle-color": "#ffffff", "circle-stroke-color": "#f97316", "circle-stroke-width": 3 },
    });
    ctx.ts.layerIds.push(fillLayerId, lineLayerId, pointsLayerId);

    const buildFeatures = (pts) => {
      const coords = pts.map((p) => [p.lng, p.lat]);
      const features = pts.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: {} }));
      if (coords.length >= 2) features.push({ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} });
      if (coords.length >= 3) features.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] }, properties: {} });
      return features;
    };

    ctx.hs.click = (e) => {
      ctx.positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      const src = m.getSource(ctx.ts.sourceId);
      if (src) src.setData({ type: "FeatureCollection", features: buildFeatures(ctx.positions) });
    };
    ctx.hs.mouseMove = (e) => {
      if (ctx.positions.length === 0) return;
      const src = m.getSource(ctx.ts.sourceId);
      if (!src) return;
      const pts = [...ctx.positions, { lng: e.lngLat.lng, lat: e.lngLat.lat }];
      src.setData({ type: "FeatureCollection", features: buildFeatures(pts) });
    };
    const finish = () => {
      if (ctx.positions.length < 3) {
        ctx.cleanupHandlers();
        ctx.clearTempLayers();
        ctx.drawMode.value = "";
        if (ctx.$toast) ctx.$toast.warning("حداقل ۳ نقطه برای رسم محدوده همپوشانی لازم است");
        return;
      }
      ctx.cleanupHandlers();
      m.getCanvas().style.cursor = "default";
      const coords = ctx.positions.map((p) => [p.lng, p.lat]);
      coords.push(coords[0]);
      ctx.clearTempLayers();
      const feature = turf.polygon([coords]);
      ctx.drawMode.value = "";
      applyOverlapPolygon(feature, "ترسیم دستی");
    };
    ctx.hs.rightClick = (e) => { e.preventDefault(); finish(); };
    ctx.hs.dblClick = () => finish();
    ctx.hs.key = (event) => {
      if (event.key === "Escape") {
        ctx.cleanupHandlers();
        ctx.clearTempLayers();
        ctx.drawMode.value = "";
        ctx.positions.length = 0;
      }
    };
    window.addEventListener("keydown", ctx.hs.key);
    m.on("click", ctx.hs.click);
    m.on("mousemove", ctx.hs.mouseMove);
    m.on("contextmenu", ctx.hs.rightClick);
    m.on("dblclick", ctx.hs.dblClick);
  }

  function startIntersectMode() {
    if (ctx.editingPin?.value) {
      ctx.renderUpdatedShape(ctx.editingPin.value);
      ctx.disableVertexEditing();
      ctx.editingPin.value = null;
    }
    ctx.cleanupHandlers();
    ctx.clearTempLayers();
    ctx.drawMode.value = "intersect";
    ctx.activeTab.value = "measurements";
    ctx.positions.length = 0;
    setTimeout(() => startDrawingOverlapPolygon(), 100);
  }

  // ---------------------------------------------------------------------
  // آپلود KML به‌عنوان محدوده همپوشانی (بدون نیاز به کتابخانه‌ی خارجی)
  // ---------------------------------------------------------------------
  function extractKMLGeometries(xmlDoc) {
    const parseCoordText = (text) =>
      text
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((pair) => {
          const parts = pair.split(",").map(Number);
          return [parts[0], parts[1]];
        });

    const geoms = [];
    Array.from(xmlDoc.getElementsByTagName("Placemark")).forEach((pm) => {
      Array.from(pm.getElementsByTagName("Polygon")).forEach((poly) => {
        const outer = poly.getElementsByTagName("outerBoundaryIs")[0];
        const coordEl = outer?.getElementsByTagName("coordinates")[0];
        if (coordEl && coordEl.textContent.trim()) {
          geoms.push({ type: "Polygon", coordinates: [parseCoordText(coordEl.textContent)] });
        }
      });
      Array.from(pm.getElementsByTagName("LineString")).forEach((ln) => {
        const coordEl = ln.getElementsByTagName("coordinates")[0];
        if (coordEl && coordEl.textContent.trim()) {
          geoms.push({ type: "LineString", coordinates: parseCoordText(coordEl.textContent) });
        }
      });
    });
    return geoms;
  }

  function loadIntersectFromKML(file) {
    return new Promise((resolve, reject) => {
      if (!file) { reject(new Error("no file")); return; }
      const reader = new FileReader();
      reader.onerror = () => {
        if (ctx.$toast) ctx.$toast.error("خطا در خواندن فایل KML");
        reject(new Error("read error"));
      };
      reader.onload = () => {
        try {
          const xml = new DOMParser().parseFromString(String(reader.result), "text/xml");
          if (xml.getElementsByTagName("parsererror").length) throw new Error("invalid xml");

          const geoms = extractKMLGeometries(xml);
          const polygons = geoms.filter((g) => g.type === "Polygon").map((g) => turf.polygon(g.coordinates));

          // اگر یک LineString بسته (حلقه) بود هم به‌عنوان پلیگان در نظر گرفته می‌شود
          geoms
            .filter((g) => g.type === "LineString")
            .forEach((g) => {
              const c = g.coordinates;
              if (c.length >= 4) {
                const f = c[0], l = c[c.length - 1];
                if (f[0] === l[0] && f[1] === l[1]) polygons.push(turf.polygon([c]));
              }
            });

          if (polygons.length === 0) {
            if (ctx.$toast) ctx.$toast.error("هیچ پلیگانی در فایل KML پیدا نشد");
            reject(new Error("no polygon found"));
            return;
          }

          let merged = polygons[0];
          for (let i = 1; i < polygons.length; i++) {
            try {
              const u = turf.union(turf.featureCollection([merged, polygons[i]]));
              if (u) merged = u;
            } catch (e) {
              // اگر یکی‌کردن دو پلیگان ممکن نبود، از پلیگان بعدی صرف‌نظر می‌شود
            }
          }

          if (ctx.editingPin?.value) {
            ctx.renderUpdatedShape(ctx.editingPin.value);
            ctx.disableVertexEditing();
            ctx.editingPin.value = null;
          }
          ctx.cleanupHandlers();
          ctx.clearTempLayers();
          ctx.drawMode.value = "";
          ctx.positions.length = 0;

          applyOverlapPolygon(merged, `فایل KML: ${file.name}`);
          resolve(merged);
        } catch (err) {
          if (ctx.$toast) ctx.$toast.error("فایل KML معتبر نیست یا قابل‌خواندن نبود");
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }

  /**
   * همپوشانی متقابل لایه‌های انتخاب‌شده در Pinlist
   * شامل نقطه، خط، پلیگان و دایره — فقط قسمت‌هایی که تماس/روی‌هم دارند.
   */
  function pinToTurfFeature(pin) {
    const s = pin?.shape;
    if (!s || !s.type) return null;
    const name = pin.name || "(بدون نام)";
    try {
      if (s.type === "point" && s.lon != null && s.lat != null) {
        return {
          kind: "point",
          name,
          pin,
          feature: turf.point([s.lon, s.lat]),
          coords: [[s.lon, s.lat]],
        };
      }
      if (s.type === "multi_point" && Array.isArray(s.positions) && s.positions.length) {
        const coords = s.positions
          .filter((p) => p && p.lon != null && p.lat != null)
          .map((p) => [p.lon, p.lat]);
        if (!coords.length) return null;
        return {
          kind: "point",
          name,
          pin,
          feature: coords.length === 1
            ? turf.point(coords[0])
            : turf.multiPoint(coords),
          coords,
          isMulti: true,
        };
      }
      if (s.type === "polyline" && Array.isArray(s.positions) && s.positions.length >= 2) {
        const coords = s.positions.map((p) => [p.lon, p.lat]);
        const line = turf.lineString(coords);
        return {
          kind: "line",
          name,
          pin,
          feature: line,
          length: turf.length(line, { units: "meters" }),
        };
      }
      if (s.type === "polygon" && Array.isArray(s.positions) && s.positions.length >= 3) {
        const ring = s.positions.map((p) => [p.lon, p.lat]);
        const f = ring[0], l = ring[ring.length - 1];
        if (f[0] !== l[0] || f[1] !== l[1]) ring.push([...f]);
        const poly = turf.polygon([ring]);
        return {
          kind: "polygon",
          name,
          pin,
          feature: poly,
          area: turf.area(poly),
          isCircle: false,
        };
      }
      if (s.type === "circle" && s.center && s.radius) {
        const ring = computeCircleCoords(s.center, s.radius);
        if (ring.length < 3) return null;
        const closed = [...ring];
        const f = closed[0], l = closed[closed.length - 1];
        if (f[0] !== l[0] || f[1] !== l[1]) closed.push([...f]);
        const poly = turf.polygon([closed]);
        return {
          kind: "polygon",
          name,
          pin,
          feature: poly,
          area: turf.area(poly),
          isCircle: true,
        };
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function findPinsByIds(list, ids, out = []) {
    const idSet = new Set((ids || []).map((x) => String(x)));
    (list || []).forEach((pin) => {
      if (!pin) return;
      if (pin.type === "group") {
        findPinsByIds(pin.children, ids, out);
        return;
      }
      if (idSet.has(String(pin.id))) out.push(pin);
    });
    return out;
  }

  function safeIntersect(a, b) {
    try {
      if (!turf.booleanIntersects(a, b)) return null;
      return turf.intersect(turf.featureCollection([a, b]));
    } catch (e) {
      return null;
    }
  }

  /** طول بخشی از خط که داخل پلیگان است */
  function lineInsidePolygon(line, polygon) {
    const totalLength = turf.length(line, { units: "meters" });
    if (totalLength <= 0) return { insideLength: 0, segments: [] };
    if (!turf.booleanIntersects(line, polygon)) {
      return { insideLength: 0, segments: [] };
    }
    let insideLength = 0;
    const insideSegments = [];
    try {
      const boundary = turf.polygonToLine(polygon);
      const boundaryLines =
        boundary.type === "FeatureCollection" ? boundary.features : [boundary];
      let pieces = [line];
      boundaryLines.forEach((bl) => {
        const nextPieces = [];
        pieces.forEach((piece) => {
          try {
            const split = turf.lineSplit(piece, bl);
            if (split.features.length) nextPieces.push(...split.features);
            else nextPieces.push(piece);
          } catch (e) {
            nextPieces.push(piece);
          }
        });
        pieces = nextPieces;
      });
      pieces.forEach((piece) => {
        const len = turf.length(piece, { units: "meters" });
        if (len === 0) return;
        const mid = turf.along(piece, len / 2, { units: "meters" });
        if (turf.booleanPointInPolygon(mid, polygon)) {
          insideLength += len;
          insideSegments.push(piece);
        }
      });
    } catch (e) {
      const mid = turf.along(line, totalLength / 2, { units: "meters" });
      if (turf.booleanPointInPolygon(mid, polygon)) {
        insideLength = totalLength;
        insideSegments.push(line);
      }
    }
    return { insideLength, segments: insideSegments, totalLength };
  }

  function analyzePair(a, b, rows, overlapParts) {
    const ka = a.kind;
    const kb = b.kind;

    // پلیگان ∩ پلیگان
    if (ka === "polygon" && kb === "polygon") {
      const inter = safeIntersect(a.feature, b.feature);
      if (!inter) return;
      const interArea = turf.area(inter);
      if (interArea <= 0) return;
      overlapParts.push(inter);
      rows.push({
        kind: "polygon",
        pinId: a.pin.id,
        pinName: `${a.name} ∩ ${b.name}`,
        insideAreaSqMeters: interArea,
        totalAreaSqMeters: a.area,
        otherTotalArea: b.area,
        percentage: a.area ? (interArea / a.area) * 100 : 0,
        insideGeometry: inter,
        isCircle: false,
        description: `همپوشانی پلیگان «${a.name}» با «${b.name}»`,
        pairNames: [a.name, b.name],
        pairIds: [String(a.pin.id), String(b.pin.id)],
        pairKinds: ["polygon", "polygon"],
      });
      return;
    }

    // نقطه داخل پلیگان
    if (ka === "point" && kb === "polygon") {
      const pts = a.coords || [];
      pts.forEach((c, idx) => {
        if (!turf.booleanPointInPolygon(c, b.feature)) return;
        const utm = toUTM(c[0], c[1]);
        overlapParts.push(turf.point(c));
        rows.push({
          kind: "point",
          pinId: a.pin.id,
          pinName: a.name,
          pointIndex: idx,
          lon: c[0],
          lat: c[1],
          utmX: utm.x,
          utmY: utm.y,
          utmZone: utm.zone,
          description: `نقطه داخل پلیگان «${b.name}»`,
          pairNames: [a.name, b.name],
          pairIds: [String(a.pin.id), String(b.pin.id)],
          pairKinds: ["point", "polygon"],
          insideAreaSqMeters: 0,
          totalAreaSqMeters: b.area,
          otherTotalArea: b.area,
          percentage: 100,
        });
      });
      return;
    }
    if (ka === "polygon" && kb === "point") {
      analyzePair(b, a, rows, overlapParts);
      return;
    }

    // خط ∩ پلیگان
    if (ka === "line" && kb === "polygon") {
      const { insideLength, segments, totalLength } = lineInsidePolygon(
        a.feature,
        b.feature,
      );
      if (insideLength <= 0) return;
      segments.forEach((seg) => overlapParts.push(seg));
      rows.push({
        kind: "line",
        pinId: a.pin.id,
        pinName: a.name,
        insideLengthMeters: insideLength,
        totalLengthMeters: totalLength || a.length,
        percentage:
          (totalLength || a.length)
            ? (insideLength / (totalLength || a.length)) * 100
            : 0,
        insideSegments: segments,
        description: `بخشی از خط داخل پلیگان «${b.name}»`,
        pairNames: [a.name, b.name],
        pairIds: [String(a.pin.id), String(b.pin.id)],
        pairKinds: ["line", "polygon"],
        insideAreaSqMeters: 0,
        totalAreaSqMeters: b.area,
        otherTotalArea: b.area,
      });
      return;
    }
    if (ka === "polygon" && kb === "line") {
      analyzePair(b, a, rows, overlapParts);
      return;
    }

    // خط ∩ خط (تقاطع)
    if (ka === "line" && kb === "line") {
      try {
        if (!turf.booleanIntersects(a.feature, b.feature)) return;
        let cross = null;
        try {
          cross = turf.lineIntersect(a.feature, b.feature);
        } catch (e) {
          cross = null;
        }
        const n =
          cross && cross.features ? cross.features.length : 1;
        if (cross && cross.features) {
          cross.features.forEach((f) => overlapParts.push(f));
        }
        rows.push({
          kind: "line",
          pinId: a.pin.id,
          pinName: `${a.name} ∩ ${b.name}`,
          insideLengthMeters: 0,
          totalLengthMeters: a.length,
          percentage: 0,
          insideSegments: [],
          description: `تقاطع خط «${a.name}» با «${b.name}» (${n} نقطه تقاطع)`,
          pairNames: [a.name, b.name],
          pairIds: [String(a.pin.id), String(b.pin.id)],
          pairKinds: ["line", "line"],
          crossCount: n,
        });
      } catch (e) {
        /* ignore */
      }
      return;
    }

    // نقطه روی/نزدیک خط (آستانه ~1 متر)
    if (ka === "point" && kb === "line") {
      const pts = a.coords || [];
      pts.forEach((c, idx) => {
        try {
          const pt = turf.point(c);
          const dist = turf.pointToLineDistance(pt, b.feature, {
            units: "meters",
          });
          if (dist > 1.5) return;
          const utm = toUTM(c[0], c[1]);
          overlapParts.push(pt);
          rows.push({
            kind: "point",
            pinId: a.pin.id,
            pinName: a.name,
            pointIndex: idx,
            lon: c[0],
            lat: c[1],
            utmX: utm.x,
            utmY: utm.y,
            utmZone: utm.zone,
            description: `نقطه روی/نزدیک خط «${b.name}» (فاصله ${dist.toFixed(2)} m)`,
            pairNames: [a.name, b.name],
            pairIds: [String(a.pin.id), String(b.pin.id)],
            pairKinds: ["point", "line"],
            percentage: 100,
          });
        } catch (e) {
          /* ignore */
        }
      });
      return;
    }
    if (ka === "line" && kb === "point") {
      analyzePair(b, a, rows, overlapParts);
      return;
    }

    // نقطه روی نقطه (تقریباً یکسان — آستانه ~0.5 متر)
    if (ka === "point" && kb === "point") {
      const pa = a.coords || [];
      const pb = b.coords || [];
      pa.forEach((ca, ia) => {
        pb.forEach((cb, ib) => {
          try {
            const d = turf.distance(turf.point(ca), turf.point(cb), {
              units: "meters",
            });
            if (d > 0.5) return;
            const utm = toUTM(ca[0], ca[1]);
            overlapParts.push(turf.point(ca));
            rows.push({
              kind: "point",
              pinId: a.pin.id,
              pinName: `${a.name} ≈ ${b.name}`,
              lon: ca[0],
              lat: ca[1],
              utmX: utm.x,
              utmY: utm.y,
              utmZone: utm.zone,
              description: `نقاط تقریباً منطبق (فاصله ${d.toFixed(2)} m)`,
              pairNames: [a.name, b.name],
              pairIds: [String(a.pin.id), String(b.pin.id)],
              pairKinds: ["point", "point"],
              percentage: 100,
            });
          } catch (e) {
            /* ignore */
          }
        });
      });
    }
  }

  function loadIntersectFromPins(pinIds) {
    if (!pinIds || !pinIds.length) {
      if (ctx.$toast) ctx.$toast.warning("هیچ لایه‌ای انتخاب نشده است");
      return;
    }
    const pinsList = Array.isArray(ctx.pins) ? ctx.pins : ctx.pins.value || [];
    const selected = findPinsByIds(pinsList, pinIds);

    const items = [];
    selected.forEach((pin) => {
      if (pin.shape && pin.shape.show === false) return;
      const item = pinToTurfFeature(pin);
      if (item) items.push(item);
    });

    if (!items.length) {
      if (ctx.$toast)
        ctx.$toast.error("از لایه‌های انتخاب‌شده هیچ هندسه معتبری ساخته نشد");
      return;
    }

    if (ctx.editingPin?.value) {
      ctx.renderUpdatedShape(ctx.editingPin.value);
      ctx.disableVertexEditing();
      ctx.editingPin.value = null;
    }
    ctx.cleanupHandlers();
    ctx.clearTempLayers();
    ctx.drawMode.value = "";
    ctx.positions.length = 0;

    // یک لایهٔ پلیگونی: محدوده در برابر بقیه پین‌های نقشه
    if (items.length === 1 && items[0].kind === "polygon") {
      applyOverlapPolygon(items[0].feature, `لایه: ${items[0].name}`);
      return;
    }
    if (items.length === 1) {
      if (ctx.$toast)
        ctx.$toast.warning(
          "برای همپوشانی متقابل حداقل ۲ لایه انتخاب کنید (یا یک پلیگان به‌عنوان محدوده)",
        );
      return;
    }

    analyzing.value = true;
    const rows = [];
    const overlapParts = [];

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        analyzePair(items[i], items[j], rows, overlapParts);
      }
    }

    // تقاطع مشترک همه پلیگان‌ها (در صورت وجود ≥۳ پلیگان)
    const polys = items.filter((it) => it.kind === "polygon");
    if (polys.length >= 3) {
      let multi = polys[0].feature;
      let ok = true;
      for (let i = 1; i < polys.length; i++) {
        const next = safeIntersect(multi, polys[i].feature);
        if (!next) {
          ok = false;
          break;
        }
        multi = next;
      }
      if (ok && multi) {
        const multiArea = turf.area(multi);
        if (multiArea > 0) {
          overlapParts.push(multi);
          rows.push({
            kind: "polygon",
            pinId: "multi-all",
            pinName: `تقاطع مشترک همه پلیگان‌ها (${polys.length})`,
            insideAreaSqMeters: multiArea,
            totalAreaSqMeters: multiArea,
            percentage: 100,
            insideGeometry: multi,
            isCircle: false,
            description: polys.map((it) => it.name).join(" ∩ "),
          });
        }
      }
    }

    // نمایش محدوده از اجتماع قسمت‌های پلیگونی هم‌پوشان
    const polyParts = overlapParts.filter(
      (f) =>
        f &&
        f.geometry &&
        (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"),
    );
    let displayPoly = null;
    if (polyParts.length === 1) displayPoly = polyParts[0];
    else if (polyParts.length > 1) {
      displayPoly = polyParts[0];
      for (let i = 1; i < polyParts.length; i++) {
        try {
          const u = turf.union(
            turf.featureCollection([displayPoly, polyParts[i]]),
          );
          if (u) displayPoly = u;
        } catch (e) {
          /* ignore */
        }
      }
    }

    const label = `همپوشانی متقابل لایه‌ها (${items.length}): ${items
      .slice(0, 3)
      .map((it) => it.name)
      .join("، ")}${items.length > 3 ? "…" : ""}`;

    overlapPolygon.value = displayPoly;
    overlapSourceLabel.value = label;
    intersectPanelOpen.value = true;
    setIntersectActive(true);

    if (displayPoly) renderOverlapPolygon(displayPoly);
    else removeOverlapLayers();

    // ردیف‌های highlight از point/line/polygon
    const highlightRows = rows.map((r) => {
      if (r.kind === "point" && r.lon != null) return r;
      if (r.kind === "line" && r.insideSegments) return r;
      if (r.kind === "polygon" && r.insideGeometry) return r;
      // نقاط تقاطع خط-خط در overlapParts هستند؛ برای highlight نقطه بساز
      return r;
    });
    // نقاط تقاطع اضافه‌شده در overlapParts که در rows نیستند را هم هایلایت کن
    overlapParts.forEach((f) => {
      if (!f || !f.geometry) return;
      if (f.geometry.type === "Point") {
        const [lon, lat] = f.geometry.coordinates;
        highlightRows.push({
          kind: "point",
          lon,
          lat,
          pinName: "",
        });
      } else if (f.geometry.type === "LineString") {
        highlightRows.push({
          kind: "line",
          insideSegments: [f],
          pinName: "",
        });
      }
    });

    intersectResults.value = rows;
    renderHighlights(highlightRows);
    analyzing.value = false;

    if (ctx.$toast) {
      if (rows.length) {
        ctx.$toast.success(
          `${rows.length} مورد هم‌پوشانی بین لایه‌های انتخاب‌شده یافت شد`,
        );
      } else {
        ctx.$toast.warning(
          "لایه‌های انتخاب‌شده با هم هم‌پوشانی یا تماس ندارند",
        );
      }
    }
  }

  // ---------------------------------------------------------------------
  // پاکسازی
  // ---------------------------------------------------------------------
  function clearIntersect() {
    // اگر در حال رسم دستی بودیم، هندلرهای موقت را هم جمع کن
    if (ctx.drawMode.value === "intersect") {
      ctx.cleanupHandlers();
      ctx.clearTempLayers();
      ctx.drawMode.value = "";
    }
    removeOverlapLayers();
    removeHighlightLayers();
    overlapPolygon.value = null;
    overlapSourceLabel.value = "";
    intersectResults.value = [];
    intersectPanelOpen.value = false;
    setIntersectActive(false);
    ctx.positions.length = 0;
  }

  // ---------------------------------------------------------------------
  // تولید گزارش (چاپ/PDF مرورگر) + خروجی CSV
  // ---------------------------------------------------------------------
  function generateIntersectReport() {
    const rows = intersectResults.value;
    const w = window.open("", "_blank");
    if (!w) {
      if (ctx.$toast) ctx.$toast.error("مرورگر اجازه بازکردن پنجره گزارش را نداد (Popup Blocker را غیرفعال کنید)");
      return;
    }
    const summary = intersectSummary.value;
    const pointRows = rows.filter((r) => r.kind === "point");
    const lineRows = rows.filter((r) => r.kind === "line");
    const polyRows = rows.filter((r) => r.kind === "polygon");
    const esc = (v) => String(v ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html = `<!doctype html>
<html dir="rtl" lang="fa"><head><meta charset="utf-8" />
<title>گزارش همپوشانی</title>
<style>
  body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#111}
  h1{font-size:20px;border-bottom:2px solid #f97316;padding-bottom:8px}
  h2{font-size:16px;margin-top:28px;color:#c2410c}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
  th,td{border:1px solid #ddd;padding:6px 8px;text-align:right}
  th{background:#fff7ed}
  .summary{display:flex;gap:16px;margin-top:12px;flex-wrap:wrap}
  .card{border:1px solid #ddd;border-radius:8px;padding:10px 16px;min-width:140px}
  .card b{display:block;font-size:18px;color:#f97316}
  @media print { .no-print{display:none} }
</style></head><body>
<h1>گزارش همپوشانی (Intersect)</h1>
<p>منبع محدوده همپوشانی: ${esc(overlapSourceLabel.value)}</p>
<p>تاریخ تولید گزارش: ${new Date().toLocaleString("fa-IR")}</p>
<div class="summary">
  <div class="card">تعداد نقاط<br/><b>${summary.pointCount}</b></div>
  <div class="card">تعداد خطوط<br/><b>${summary.lineCount}</b></div>
  <div class="card">تعداد پلیگان‌ها<br/><b>${summary.polygonCount}</b></div>
  <div class="card">مجموع طول در محدوده<br/><b>${formatDistance(summary.totalLineLength)}</b></div>
  <div class="card">مجموع مساحت در محدوده<br/><b>${formatArea(summary.totalPolygonArea)}</b></div>
</div>
${pointRows.length ? `
<h2>نقاط داخل محدوده همپوشانی</h2>
<table><thead><tr><th>#</th><th>نام</th><th>طول جغرافیایی</th><th>عرض جغرافیایی</th><th>UTM X</th><th>UTM Y</th><th>Zone</th><th>توضیحات</th></tr></thead><tbody>
${pointRows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.pinName)}</td><td>${r.lon.toFixed(6)}</td><td>${r.lat.toFixed(6)}</td><td>${r.utmX.toFixed(2)}</td><td>${r.utmY.toFixed(2)}</td><td>${r.utmZone}</td><td>${esc(r.description)}</td></tr>`).join("")}
</tbody></table>` : ""}
${lineRows.length ? `
<h2>خطوط دارای همپوشانی</h2>
<table><thead><tr><th>#</th><th>نام</th><th>طول کل</th><th>طول داخل محدوده</th><th>درصد همپوشانی</th><th>توضیحات</th></tr></thead><tbody>
${lineRows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.pinName)}</td><td>${formatDistance(r.totalLengthMeters)}</td><td>${formatDistance(r.insideLengthMeters)}</td><td>${r.percentage.toFixed(1)}%</td><td>${esc(r.description)}</td></tr>`).join("")}
</tbody></table>` : ""}
${(() => {
  const pairRows = polyRows.filter((r) => Array.isArray(r.pairNames) && r.pairNames.length === 2);
  if (pairRows.length) {
    const byLayer = new Map();
    const ensure = (name, area) => {
      if (!byLayer.has(name)) byLayer.set(name, { area: area || 0, items: [] });
      return byLayer.get(name);
    };
    pairRows.forEach((r) => {
      const [a, b] = r.pairNames;
      ensure(a, r.totalAreaSqMeters).items.push({ other: b, area: r.insideAreaSqMeters, pct: r.percentage });
      const pctB = r.otherTotalArea ? (r.insideAreaSqMeters / r.otherTotalArea) * 100 : 0;
      ensure(b, r.otherTotalArea).items.push({ other: a, area: r.insideAreaSqMeters, pct: pctB });
    });
    let html = "<h2>همپوشانی لایه‌ها (به‌ازای هر لایه)</h2>";
    for (const [name, g] of byLayer) {
      html += `<h3 style="font-size:14px;margin-top:16px;color:#9a3412">لایه: ${esc(name)} <span style="font-weight:normal;color:#666;font-size:12px">(مساحت کل: ${formatArea(g.area)})</span></h3><ul>`;
      g.items.forEach((it) => {
        html += `<li>همپوشانی با «${esc(it.other)}»: <b>${formatArea(it.area)}</b> (${it.pct.toFixed(1)}٪ از این لایه)</li>`;
      });
      html += "</ul>";
    }
    return html;
  }
  if (!polyRows.length) return "";
  return `<h2>پلیگان‌ها / دایره‌های دارای همپوشانی</h2>
<table><thead><tr><th>#</th><th>نام</th><th>مساحت کل</th><th>مساحت داخل محدوده</th><th>درصد همپوشانی</th><th>توضیحات</th></tr></thead><tbody>
${polyRows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.pinName)}</td><td>${formatArea(r.totalAreaSqMeters)}</td><td>${formatArea(r.insideAreaSqMeters)}</td><td>${r.percentage.toFixed(1)}%</td><td>${esc(r.description)}</td></tr>`).join("")}
</tbody></table>`;
})()}
${rows.length === 0 ? "<p>هیچ عنصری در محدوده همپوشانی یافت نشد.</p>" : ""}
<button class="no-print" onclick="window.print()" style="margin-top:24px;padding:8px 20px;background:#f97316;color:#fff;border:none;border-radius:6px;cursor:pointer">چاپ / ذخیره PDF</button>
</body></html>`;

    w.document.write(html);
    w.document.close();
  }

  function exportIntersectReportCSV() {
    const rows = intersectResults.value;
    if (!rows.length) {
      if (ctx.$toast) ctx.$toast.warning("داده‌ای برای خروجی وجود ندارد");
      return;
    }
    const header = [
      "نوع", "نام", "لایه_۱", "لایه_۲",
      "طول_جغرافیایی", "عرض_جغرافیایی", "UTM_X", "UTM_Y",
      "طول_کل_متر", "طول_داخل_متر", "مساحت_کل_مترمربع", "مساحت_داخل_مترمربع",
      "مساحت_لایه_دوم", "درصد_از_لایه_۱", "درصد_از_لایه_۲", "توضیحات",
    ];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      const pair = Array.isArray(r.pairNames) ? r.pairNames : ["", ""];
      const pct2 =
        r.otherTotalArea > 0 && r.insideAreaSqMeters != null
          ? ((r.insideAreaSqMeters / r.otherTotalArea) * 100).toFixed(1)
          : "";
      lines.push([
        r.kind, r.pinName || "",
        pair[0] || "", pair[1] || "",
        r.lon ?? "", r.lat ?? "",
        r.utmX ?? "", r.utmY ?? "",
        r.totalLengthMeters ?? "", r.insideLengthMeters ?? "",
        r.totalAreaSqMeters ?? "", r.insideAreaSqMeters ?? "",
        r.otherTotalArea ?? "",
        r.percentage != null ? r.percentage.toFixed(1) : "",
        pct2,
        `"${(r.description || "").replace(/"/g, '""')}"`,
      ].join(","));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intersect-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    intersectResults,
    intersectSummary,
    overlapSourceLabel,
    analyzing,
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