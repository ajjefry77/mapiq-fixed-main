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
${polyRows.length ? `
<h2>پلیگان‌ها / دایره‌های دارای همپوشانی</h2>
<table><thead><tr><th>#</th><th>نام</th><th>مساحت کل</th><th>مساحت داخل محدوده</th><th>درصد همپوشانی</th><th>توضیحات</th></tr></thead><tbody>
${polyRows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.pinName)}</td><td>${formatArea(r.totalAreaSqMeters)}</td><td>${formatArea(r.insideAreaSqMeters)}</td><td>${r.percentage.toFixed(1)}%</td><td>${esc(r.description)}</td></tr>`).join("")}
</tbody></table>` : ""}
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
      "نوع", "نام", "طول_جغرافیایی", "عرض_جغرافیایی", "UTM_X", "UTM_Y",
      "طول_کل_متر", "طول_داخل_متر", "مساحت_کل_مترمربع", "مساحت_داخل_مترمربع",
      "درصد", "توضیحات",
    ];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push([
        r.kind, r.pinName || "",
        r.lon ?? "", r.lat ?? "",
        r.utmX ?? "", r.utmY ?? "",
        r.totalLengthMeters ?? "", r.insideLengthMeters ?? "",
        r.totalAreaSqMeters ?? "", r.insideAreaSqMeters ?? "",
        r.percentage != null ? r.percentage.toFixed(1) : "",
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
    clearIntersect,
    generateIntersectReport,
    exportIntersectReportCSV,
  };
}