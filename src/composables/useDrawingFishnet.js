import * as turf from "@turf/turf";
import { ref } from "vue";
import { registerDrawLayer } from "../utils/layerOrder";
import { toUTM, toUTMInZone, fromUTM } from "./useDrawingHelpers";

const FISHNET_SOURCE = "fishnet-src";
const MAX_TRIANGLES = 5000;
const MAX_INPUT_POINTS = 1500;

// مثلث‌بندی ژئودتیک (TIN / Delaunay) — جایگزین گرید مربعی.
// همه گوشه‌های پلیگان حتما راس مثلث می‌شوند + خطای شکلی کمینه (Delaunay).

export function createFishnetHandler(ctx) {
  const fishnetPanelOpen = ref(false);
  const fishnetCells = ref([]);
  const fishnetSourceLabel = ref("");
  const generating = ref(false);
  const cellSize = ref(100);
  const cellUnit = ref("m");
  const clipToPolygon = ref(true);
  const selectedPinId = ref("");
  // سازگاری با نسخه قبلی (زاویه گرید) — در مثلث‌بندی استفاده نمی‌شود
  const fishnetAngle = ref(0);
  // آمار کیفیت مثلث‌بندی
  const triangStats = ref(null);
  // رئوس یکتای مثلث‌بندی نهایی (برای خروجی نقاط)
  const triangPoints = ref([]);
  // لودینگ ۳ مرحله‌ای شبکه‌بندی: ۰=خاموش، ۱=ارسال به سرور، ۲=پردازش، ۳=بررسی نتایج
  const fishnetStage = ref(0);
  const fishnetProgress = ref(0);
  const FISHNET_STAGES = ["ارسال به سرور", "پردازش شبکه‌بندی", "بررسی نتایج"];
  // --- ویرایش دستی شکل مثلث‌بندی‌شده ---
  // editTool: 'move' جابه‌جایی نقطه | 'delete' حذف نقطه/مثلث با کلیک | 'add' افزودن نقطه با کلیک
  const fishnetEditMode = ref(false);
  const fishnetEditTool = ref("move");
  const fishnetDeletedCount = ref(0);
  // بافت ذخیره‌شده برای بازسازی پس از ویرایش دستی (بدون تولید مجدد از ابتدا)
  const fishnetCtx = {
    sourcePoly: null,
    zone: 0,
    northern: true,
    edge: 0,
    minSep: 0,
    clip: true,
    cornerCount: 0,
    baseRemovedClose: 0,
  };
  const fishnetExclusions = ref([]);
  let editHandlersBound = false;
  let dragPid = null;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const yieldUI = () => sleep(30);
  async function animateProgress(from, to, ms) {
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      fishnetProgress.value = Math.round((from + ((to - from) * i) / steps) * 10) / 10;
      await sleep(Math.max(16, ms / steps));
    }
  }

  function removeFishnetLayers() {
    const m = ctx.map;
    if (!m) return;
    [FISHNET_SOURCE + "-fill", FISHNET_SOURCE + "-line", FISHNET_SOURCE + "-label"].forEach((id) => {
      try {
        if (m.getLayer(id)) m.removeLayer(id);
      } catch (e) {}
    });
    try {
      if (m.getSource(FISHNET_SOURCE)) m.removeSource(FISHNET_SOURCE);
    } catch (e) {}
    try {
      if (m.getSource(FISHNET_SOURCE + "-labels")) m.removeSource(FISHNET_SOURCE + "-labels");
    } catch (e) {}
  }

  function openFishnetPanel() {
    fishnetPanelOpen.value = true;
  }

  function clearFishnet() {
    try { setFishnetEditMode(false); } catch (e) {}
    removeFishnetLayers();
    fishnetCells.value = [];
    triangPoints.value = [];
    fishnetSourceLabel.value = "";
    fishnetPanelOpen.value = false;
    generating.value = false;
    fishnetStage.value = 0;
    fishnetProgress.value = 0;
    fishnetAngle.value = 0;
    triangStats.value = null;
    fishnetDeletedCount.value = 0;
    fishnetExclusions.value = [];
    fishnetCtx.sourcePoly = null;
  }

  function flattenPins(list, out = []) {
    const arr = Array.isArray(list) ? list : list?.value || [];
    (arr || []).forEach((pin) => {
      if (!pin) return;
      if (pin.type === "group" || pin.type === "folder") {
        flattenPins(pin.children, out);
        return;
      }
      out.push(pin);
    });
    return out;
  }

  function pinToPolygonFeature(pin) {
    const s = pin?.shape;
    if (!s || s.show === false) return null;
    try {
      if (s.type === "polygon" && Array.isArray(s.positions) && s.positions.length >= 3) {
        const ring = s.positions.map((p) => [p.lon, p.lat]);
        const f = ring[0];
        const l = ring[ring.length - 1];
        if (f[0] !== l[0] || f[1] !== l[1]) ring.push([...f]);
        return turf.polygon([ring]);
      }
      if (s.type === "circle" && s.center && s.radius) {
        const R = 6371008.8;
        const lat1 = (s.center.lat * Math.PI) / 180;
        const lon1 = (s.center.lng * Math.PI) / 180;
        const d = s.radius / R;
        const coords = [];
        for (let i = 0; i < 64; i++) {
          const brng = (i / 64) * 2 * Math.PI;
          const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
          const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
          coords.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
        }
        coords.push([...coords[0]]);
        return turf.polygon([coords]);
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function findPinById(list, id) {
    const all = flattenPins(list);
    return all.find((p) => String(p.id) === String(id)) || null;
  }

  function sizeToMeters(size, unit) {
    const v = Number(size);
    if (!isFinite(v) || v <= 0) return 0;
    return unit === "km" ? v * 1000 : v;
  }

  // --- هندسه کمکی در فضای متریک UTM ---

  function dist2D(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return Math.hypot(dx, dy);
  }

  // حذف نقاط تکراری پشت سر هم + بستن رینگ
  function cleanRing(utmRing) {
    const out = [];
    for (const p of utmRing) {
      const prev = out[out.length - 1];
      if (!prev || dist2D(prev, p) > 0.001) out.push(p);
    }
    if (out.length > 1 && dist2D(out[0], out[out.length - 1]) < 0.001) out.pop();
    return out;
  }

  // تست نقطه داخل چندضلعی (ray casting) در UTM
  function pointInRingUTM(pt, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  // متراکم‌سازی اضلاع بلند مرزی تا طول هر قطعه ≈ edge
  function densifyBoundary(corners, edge) {
    const out = [];
    for (let i = 0; i < corners.length; i++) {
      const p1 = corners[i];
      const p2 = corners[(i + 1) % corners.length];
      out.push(p1);
      const L = dist2D(p1, p2);
      if (L > edge * 1.05) {
        const n = Math.min(64, Math.ceil(L / edge));
        for (let k = 1; k < n; k++) {
          const t = k / n;
          out.push([p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]);
        }
      }
    }
    return out;
  }

  // شبکه نقاط داخلی (Steiner) با گام edge — فقط نقاط داخل پلیگان
  function interiorGridPoints(ring, edge) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ring.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
    const pts = [];
    // آفست نیم‌گامی برای جلوگیری از انطباق با مرز
    const step = edge;
    let row = 0;
    for (let y = minY + step / 2; y < maxY; y += step, row++) {
      const off = row % 2 === 0 ? 0 : step / 2;
      for (let x = minX + step / 2 + off; x < maxX; x += step) {
        const p = [x, y];
        if (pointInRingUTM(p, ring)) pts.push(p);
      }
    }
    return pts;
  }

  function dedupPoints(pts, tol = 0.01) {
    const seen = new Map();
    const out = [];
    for (const p of pts) {
      const k = `${Math.round(p[0] / tol)}:${Math.round(p[1] / tol)}`;
      if (seen.has(k)) continue;
      seen.set(k, true);
      out.push(p);
    }
    return out;
  }

  // حذف نقاط خیلی نزدیک‌به‌هم: هر نقطه‌ای که فاصله‌اش تا نقطه نگه‌داشته‌شده
  // کمتر از minSep باشد کلا برداشته می‌شود تا شکل به‌هم نریزد.
  // اولویت با نقاط پایه (گوشه‌ها/مرز) است؛ نقاط داخلی نزدیک حذف می‌شوند.
  function buildSpatialHash(pts, cell) {
    const map = new Map();
    pts.forEach((p, i) => {
      const k = `${Math.floor(p[0] / cell)}:${Math.floor(p[1] / cell)}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(i);
    });
    return map;
  }

  function hasCloseNeighbor(pt, basePts, hash, cell, minSep2) {
    const cx = Math.floor(pt[0] / cell), cy = Math.floor(pt[1] / cell);
    for (let ix = cx - 1; ix <= cx + 1; ix++) {
      for (let iy = cy - 1; iy <= cy + 1; iy++) {
        const bucket = hash.get(`${ix}:${iy}`);
        if (!bucket) continue;
        for (const i of bucket) {
          const q = basePts[i];
          const dx = pt[0] - q[0], dy = pt[1] - q[1];
          if (dx * dx + dy * dy < minSep2) return true;
        }
      }
    }
    return false;
  }

  // گوشه‌های تکراری/خیلی نزدیک (نویز نقشه‌برداری) را ادغام می‌کند
  function mergeCloseCorners(corners, minSep) {
    const kept = [];
    let removed = 0;
    for (const p of corners) {
      let tooClose = false;
      for (const q of kept) {
        if (dist2D(p, q) < minSep) { tooClose = true; break; }
      }
      if (tooClose) removed++;
      else kept.push(p);
    }
    // حلقه بسته: اگر اول و آخر خیلی نزدیک‌اند، آخری حذف شود
    if (kept.length > 3 && dist2D(kept[0], kept[kept.length - 1]) < minSep) {
      kept.pop();
      removed++;
    }
    return { kept, removed };
  }

  // از بین نقاط داوطلب فقط آن‌هایی که به نقاط پایه نزدیک نیستند نگه داشته می‌شوند
  function filterClosePoints(basePts, candidates, minSep) {
    const cell = Math.max(minSep, 0.001);
    const minSep2 = minSep * minSep;
    const hash = buildSpatialHash(basePts, cell);
    const kept = [];
    let removed = 0;
    for (const p of candidates) {
      if (hasCloseNeighbor(p, basePts, hash, cell, minSep2)) { removed++; continue; }
      // فاصله با نقاط داخلیِ قبلا نگه‌داشته‌شده هم چک شود
      let clash = false;
      for (const q of kept) {
        const dx = p[0] - q[0], dy = p[1] - q[1];
        if (dx * dx + dy * dy < minSep2) { clash = true; break; }
      }
      if (clash) { removed++; continue; }
      kept.push(p);
      const k = `${Math.floor(p[0] / cell)}:${Math.floor(p[1] / cell)}`;
      if (!hash.has(k)) hash.set(k, []);
      hash.get(k).push(basePts.length + kept.length - 1);
      basePts.push(p);
    }
    return { kept, removed };
  }

  // ادغام نهایی نقاط خروجی: هر نقطه‌ای که فاصله‌اش تا نقطه نگه‌داشته‌شده
  // کمتر از minSep باشد کلا حذف می‌شود (بدون جابه‌جایی بقیه نقاط)
  function mergeCloseUTM(list, minSep) {
    const kept = [];
    let removed = 0;
    const cell = Math.max(minSep, 0.001);
    const minSep2 = minSep * minSep;
    const grid = new Map();
    for (const p of list) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) { kept.push(p); continue; }
      const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
      let dup = false;
      for (let ix = cx - 1; ix <= cx + 1 && !dup; ix++) {
        for (let iy = cy - 1; iy <= cy + 1 && !dup; iy++) {
          const bucket = grid.get(`${ix}:${iy}`);
          if (!bucket) continue;
          for (const q of bucket) {
            const dx = p.x - q.x, dy = p.y - q.y;
            if (dx * dx + dy * dy < minSep2) { dup = true; break; }
          }
        }
      }
      if (dup) { removed++; continue; }
      kept.push(p);
      const k = `${cx}:${cy}`;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(p);
    }
    kept.forEach((p, i) => { p.id = `P${i + 1}`; });
    return { kept, removed };
  }

  // کمترین زاویه مثلث (درجه) در فضای UTM — معیار خطای شکلی
  function minAngleDeg(a, b, c) {
    const ab = dist2D(a, b), bc = dist2D(b, c), ca = dist2D(c, a);
    if (ab <= 0 || bc <= 0 || ca <= 0) return 0;
    const clamp = (v) => Math.min(1, Math.max(-1, v));
    const A = (Math.acos(clamp((ab * ab + ca * ca - bc * bc) / (2 * ab * ca))) * 180) / Math.PI;
    const B = (Math.acos(clamp((ab * ab + bc * bc - ca * ca) / (2 * ab * bc))) * 180) / Math.PI;
    const C = 180 - A - B;
    return Math.min(A, B, C);
  }

  async function generateFishnet(sourcePinId, size, unit, clip = true) {
    const pinsList = Array.isArray(ctx.pins) ? ctx.pins : ctx.pins?.value || [];
    const pin = findPinById(pinsList, sourcePinId);
    if (!pin) {
      ctx.$toast?.warning("یک پلیگان منبع انتخاب کنید");
      return [];
    }
    const poly = pinToPolygonFeature(pin);
    if (!poly) {
      ctx.$toast?.error("هندسه پلیگان معتبر نیست");
      return [];
    }
    const edge = sizeToMeters(size, unit);
    if (!edge || edge <= 0) {
      ctx.$toast?.warning("طول ضلع معتبر نیست");
      return [];
    }

    generating.value = true;
    fishnetStage.value = 1;
    fishnetProgress.value = 0;
    try {
      // ── مرحله ۱: ارسال به سرور (بسته‌بندی هندسه + اعلام شروع) ──
      await animateProgress(0, 30, 900);
      await yieldUI();

      // ── مرحله ۲: پردازش شبکه‌بندی ──
      fishnetStage.value = 2;
      const stage2Start = Date.now();
      const ring = poly.geometry.coordinates[0];
      let sumLon = 0, sumLat = 0;
      ring.forEach((c) => { sumLon += c[0]; sumLat += c[1]; });
      const cLon = sumLon / ring.length;
      const cLat = sumLat / ring.length;
      const { zone } = toUTM(cLon, cLat);
      const northern = cLat >= 0;

      const isCircle = pin?.shape?.type === "circle";
      let corners;
      if (isCircle) {
        // دایره گوشه ندارد: N نقطه مرزی بر اساس محیط
        const r = Number(pin.shape.radius) || edge;
        const perim = 2 * Math.PI * r;
        const n = Math.min(128, Math.max(12, Math.ceil(perim / edge)));
        const ctr = pin.shape.center;
        const R = 6371008.8;
        const lat1 = (ctr.lat * Math.PI) / 180;
        const lon1 = (ctr.lng * Math.PI) / 180;
        const d = r / R;
        corners = [];
        for (let i = 0; i < n; i++) {
          const brng = (i / n) * 2 * Math.PI;
          const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
          const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
          const lon = (lon2 * 180) / Math.PI, lat = (lat2 * 180) / Math.PI;
          const { x, y } = toUTMInZone(lon, lat, zone, northern);
          corners.push([x, y]);
        }
      } else {
        const utmRing = ring.map(([lon, lat]) => {
          const { x, y } = toUTMInZone(lon, lat, zone, northern);
          return [x, y];
        });
        corners = cleanRing(utmRing);
      }
      if (corners.length < 3) {
        ctx.$toast?.error("پلیگان کمتر از ۳ گوشه دارد");
        return [];
      }

      // حداقل فاصله مجاز نقاط: ۳۰٪ طول ضلع (حداقل ۲۰ سانتی‌متر) —
      // هر نقطه‌ای که از نقطه دیگر نزدیک‌تر باشد کلا حذف می‌شود
      const minSep = Math.max(edge * 0.3, 0.2);

      // ۱) ادغام گوشه‌های خیلی نزدیک‌به‌هم (جلوگیری از به‌هم‌ریختگی شکل)
      const merged = mergeCloseCorners(corners, minSep);
      corners = merged.kept;
      let removedClose = merged.removed;
      if (corners.length < 3) {
        ctx.$toast?.error("پس از حذف گوشه‌های تکراری کمتر از ۳ گوشه ماند");
        return [];
      }

      // ۲) همه گوشه‌ها + متراکم‌سازی مرز → پوشش کامل گوشه‌ها
      const boundary = dedupPoints(densifyBoundary(corners, edge), minSep);
      fishnetProgress.value = 45;
      await yieldUI();
      // ۳) نقاط داخلی برای تراکم شبکه مثل عکس (حداقل خطا با Delaunay)
      let interior = interiorGridPoints(corners, edge);
      // مرکز حتما داخل باشد (اگر به نقطه دیگری خیلی نزدیک نبود)
      try {
        const centroid = turf.centroid(poly).geometry.coordinates;
        const { x, y } = toUTMInZone(centroid[0], centroid[1], zone, northern);
        if (pointInRingUTM([x, y], corners)) interior.push([x, y]);
      } catch (e) {}

      // نقاط داخلی نزدیک به مرز/همدیگر کلا حذف می‌شوند
      const base = [...boundary];
      const filtered = filterClosePoints(base, dedupPoints(interior, minSep), minSep);
      removedClose += filtered.removed;
      let allPts = base;
      if (allPts.length < 3) allPts = [...boundary];
      fishnetProgress.value = 55;
      await yieldUI();

      // سقف تعداد نقاط ورودی (جلوگیری از انفجار مثلث) — مرز کامل حفظ می‌شود
      if (allPts.length > MAX_INPUT_POINTS) {
        const keepBoundary = [...boundary];
        const innerKept = allPts.slice(keepBoundary.length);
        const budget = Math.max(0, MAX_INPUT_POINTS - keepBoundary.length);
        const stride = Math.max(1, Math.ceil(innerKept.length / Math.max(1, budget)));
        const sampled = innerKept.filter((_, i) => i % stride === 0).slice(0, budget);
        removedClose += innerKept.length - sampled.length;
        allPts = [...keepBoundary, ...sampled];
        ctx.$toast?.warning(`تراکم نقاط کم شد (${allPts.length} نقطه) — طول ضلع را بزرگ‌تر کنید`);
      }

      // ۳) Delaunay در صفحه متریک (کمترین خطای زاویه‌ای)
      const ptsFC = turf.featureCollection(allPts.map(([x, y]) => turf.point([x, y])));
      fishnetProgress.value = 62;
      await yieldUI();
      let tin;
      try {
        tin = turf.tin(ptsFC);
      } catch (e) {
        ctx.$toast?.error("مثلث‌بندی ناموفق بود");
        return [];
      }
      if (!tin?.features?.length) {
        ctx.$toast?.error("مثلثی ساخته نشد — طول ضلع را تغییر دهید");
        return [];
      }
      fishnetProgress.value = 70;
      await yieldUI();

      // ۴) برگرداندن به lon/lat + برش با مرز پلیگان
      const cells = [];
      let sumMin = 0, worstMin = 60, skinny = 0, idx = 0, droppedSlivers = 0;
      // حداقل مساحت قابل‌قبول پس از برش (متناسب با minSep) — باریکه‌های برش حذف می‌شوند
      const minArea = minSep * minSep * 0.08;
      let triNo = 0;
      for (const tri of tin.features) {
        triNo++;
        if (triNo % 200 === 0) {
          fishnetProgress.value = 70 + Math.min(10, (triNo / Math.max(1, tin.features.length)) * 10);
          await yieldUI();
        }
        const coords = tri.geometry?.coordinates?.[0];
        if (!coords || coords.length < 4) continue;
        const [au, bu, cu] = [coords[0], coords[1], coords[2]];
        const a = [au[0], au[1]], b = [bu[0], bu[1]], c = [cu[0], cu[1]];
        const mAngle = minAngleDeg(a, b, c);
        const utmArea = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
        if (!(utmArea > 0.01)) { droppedSlivers++; continue; }
        // حذف کامل مثلث‌های تباه: ضلع خیلی کوتاه یا زاویه خیلی تیز
        const e1 = dist2D(a, b), e2 = dist2D(b, c), e3 = dist2D(c, a);
        if (Math.min(e1, e2, e3) < minSep * 0.5 || mAngle < 4) { droppedSlivers++; continue; }

        const ll = [a, b, c].map(([x, y]) => {
          const { lng, lat } = fromUTM(x, y, zone, northern);
          return [lng, lat];
        });
        let triPoly;
        try {
          triPoly = turf.polygon([[...ll, ll[0]]]);
        } catch (e) { continue; }

        // فیلتر مکانی: فقط مثلث‌های مرتبط با داخل پلیگان
        let keep = false;
        try {
          const ctr = turf.centroid(triPoly).geometry.coordinates;
          keep = turf.booleanPointInPolygon(ctr, poly) || turf.booleanIntersects(triPoly, poly);
        } catch (e) {
          try { keep = turf.booleanIntersects(triPoly, poly); } catch (_) { keep = false; }
        }
        if (!keep) continue;

        let finalGeom = triPoly;
        if (clip) {
          try {
            const inter = turf.intersect(turf.featureCollection([triPoly, poly]));
            if (!inter) continue;
            finalGeom = inter;
          } catch (e) { continue; }
        }

        const geoms = [];
        if (finalGeom.geometry?.type === "Polygon") geoms.push(finalGeom.geometry.coordinates);
        else if (finalGeom.geometry?.type === "MultiPolygon") {
          finalGeom.geometry.coordinates.forEach((co) => geoms.push(co));
        } else continue;

        geoms.forEach((co, partIdx) => {
          let feat;
          try { feat = turf.polygon(co); } catch (e) { return; }
          const area = turf.area(feat);
          // باریکه‌های حاصل از برش مرزی که از آستانه کوچک‌ترند کلا حذف می‌شوند
          if (!(area > minArea)) { droppedSlivers++; return; }
          idx++;
          const centroid = turf.centroid(feat);
          sumMin += mAngle;
          if (mAngle < worstMin) worstMin = mAngle;
          if (mAngle < 20) skinny++;
          cells.push({
            row: idx,
            col: 1,
            part: partIdx,
            id: `T${idx}${partIdx ? "-" + (partIdx + 1) : ""}`,
            feature: feat,
            area,
            centroid: centroid.geometry.coordinates,
            minAngle: Math.round(mAngle * 10) / 10,
            cornersUTM: [a, b, c],
          });
        });
        if (cells.length > MAX_TRIANGLES) break;
      }

      if (!cells.length) {
        ctx.$toast?.error("مثلثی داخل پلیگان نیفتاد — طول ضلع را کوچک‌تر کنید");
        return [];
      }
      if (cells.length >= MAX_TRIANGLES) {
        ctx.$toast?.warning(`سقف ${MAX_TRIANGLES} مثلث — طول ضلع را بزرگ‌تر کنید`);
        cells.length = MAX_TRIANGLES;
      }

      const avgMin = sumMin / Math.max(1, idx || cells.length);
      // درصد خطای شکلی: انحراف از مثلث متساوی‌الاضلاع ایده‌آل (۶۰ درجه)
      const errPct = Math.max(0, ((30 - avgMin) / 30) * 100);
      removedClose += droppedSlivers;

      // رئوس یکتای شکل مثلث‌بندی‌شده (پس از برش) برای خروجی نقاط —
      // هر راسی که تا راس دیگر کمتر از minSep فاصله داشته باشد کلا حذف می‌شود
      const rawPts = [];
      cells.forEach((c) => {
        const coords = c.feature.geometry?.coordinates;
        const rings = c.feature.geometry?.type === "MultiPolygon"
          ? coords.flat()
          : (Array.isArray(coords) ? coords : []);
        rings.forEach((ring) => {
          (ring || []).forEach(([lon, lat]) => {
            let x = NaN, y = NaN;
            try {
              const utm = toUTMInZone(lon, lat, zone, northern);
              x = utm.x; y = utm.y;
            } catch (e) {}
            rawPts.push({ id: "", lon, lat, x, y, zone, northern });
          });
        });
      });
      const mergedPts = mergeCloseUTM(rawPts, minSep);
      removedClose += mergedPts.removed;
      const pts = mergedPts.kept;
      triangPoints.value = pts;
      fishnetProgress.value = 82;
      await yieldUI();

      // ── مرحله ۳: بررسی نتایج (اعتبارسنجی + نمایش) ──
      // اگر پردازش واقعی سریع تمام شد، مکث می‌کنیم تا حس عملیات سنگین منتقل شود
      fishnetStage.value = 3;
      const elapsed2 = Date.now() - stage2Start;
      if (elapsed2 < 1200) await sleep(1200 - elapsed2);
      await animateProgress(Math.max(82, fishnetProgress.value), 100, 800);
      await yieldUI();

      triangStats.value = {
        count: cells.length,
        inputPoints: allPts.length,
        cornerCount: corners.length,
        pointCount: pts.length,
        removedClose,
        minSep: Math.round(minSep * 100) / 100,
        avgMinAngle: Math.round(avgMin * 10) / 10,
        worstMinAngle: Math.round(worstMin * 10) / 10,
        skinnyCount: skinny,
        errorPct: Math.round(errPct * 10) / 10,
        edge,
      };
      fishnetAngle.value = 0;

      fishnetCells.value = cells;
      fishnetSourceLabel.value = pin.name || "(بدون نام)";
      selectedPinId.value = String(pin.id);
      // ذخیره بافت برای بازسازی پس از ویرایش دستی
      fishnetCtx.sourcePoly = poly;
      fishnetCtx.zone = zone;
      fishnetCtx.northern = northern;
      fishnetCtx.edge = edge;
      fishnetCtx.minSep = minSep;
      fishnetCtx.clip = !!clip;
      fishnetCtx.cornerCount = corners.length;
      fishnetCtx.baseRemovedClose = removedClose;
      fishnetExclusions.value = [];
      fishnetDeletedCount.value = 0;
      try { setFishnetEditMode(false); } catch (e) {}
      renderFishnetPreview(cells);
      const rmMsg = removedClose > 0 ? ` — ${removedClose} نقطه نزدیک حذف شد` : "";
      ctx.$toast?.success(`${cells.length} مثلث از ${corners.length} گوشه و ${pts.length} نقطه ساخته شد (میانگین کمترین زاویه ${triangStats.value.avgMinAngle}° — خطا ${triangStats.value.errorPct}٪${rmMsg})`);
      return cells;
    } finally {
      generating.value = false;
      // مکث کوتاه روی ۱۰۰٪ تا کاربر اتمام هر سه مرحله را ببیند
      try { await sleep(500); } catch (e) {}
      fishnetStage.value = 0;
      fishnetProgress.value = 0;
    }
  }

  function renderFishnetPreview(cells) {
    const m = ctx.map;
    if (!m) return;
    removeFishnetLayers();
    if (!cells.length) return;
    const fc = {
      type: "FeatureCollection",
      features: cells.map((c) => ({
        type: "Feature",
        geometry: c.feature.geometry,
        properties: { id: c.id, minAngle: c.minAngle },
      })),
    };
    m.addSource(FISHNET_SOURCE, { type: "geojson", data: fc });
    // لایه فیل برای کلیک/حذف مثلث در حالت ویرایش دستی (همیشه شفاف و زیر خطوط)
    try {
      m.addLayer({
        id: FISHNET_SOURCE + "-fill",
        type: "fill",
        source: FISHNET_SOURCE,
        paint: { "fill-color": "#f97316", "fill-opacity": fishnetEditMode.value ? 0.12 : 0.05 },
      });
    } catch (e) {}
    m.addLayer({
      id: FISHNET_SOURCE + "-line",
      type: "line",
      source: FISHNET_SOURCE,
      paint: { "line-color": "#f97316", "line-width": 1.6, "line-opacity": 0.95 },
    });
    // گره‌های مثلث‌بندی (رئوس) مثل عکس ژئودزی —
    // فقط نقاط نهایی ادغام‌شده نمایش داده می‌شوند (بدون نقاط چسبیده‌به‌هم)
    const mergedNodes = Array.isArray(triangPoints.value) && triangPoints.value.length
      ? triangPoints.value
      : null;
    const nodeFC = {
      type: "FeatureCollection",
      features: [],
    };
    if (mergedNodes) {
      mergedNodes.forEach((p) => {
        nodeFC.features.push({ type: "Feature", geometry: { type: "Point", coordinates: [p.lon, p.lat] }, properties: { pid: p.id } });
      });
    } else {
      const seen = new Set();
      cells.forEach((c) => {
        const ring = c.feature.geometry?.coordinates?.[0] || [];
        ring.forEach(([lon, lat]) => {
          const k = `${lon.toFixed(6)},${lat.toFixed(6)}`;
          if (seen.has(k)) return;
          seen.add(k);
          nodeFC.features.push({ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: {} });
        });
      });
    }
    try {
      m.addSource(FISHNET_SOURCE + "-labels", { type: "geojson", data: nodeFC });
      m.addLayer({
        id: FISHNET_SOURCE + "-label",
        type: "circle",
        source: FISHNET_SOURCE + "-labels",
        paint: { "circle-radius": 3, "circle-color": "#f97316", "circle-stroke-color": "#fff", "circle-stroke-width": 1 },
      });
      [FISHNET_SOURCE + "-fill", FISHNET_SOURCE + "-line", FISHNET_SOURCE + "-label"].forEach(registerDrawLayer);
    } catch (e) {
      [FISHNET_SOURCE + "-fill", FISHNET_SOURCE + "-line"].forEach(registerDrawLayer);
    }
  }

  // --- ویرایش دستی شکل مثلث‌بندی‌شده ---

  function centroidExcluded(centroid, exclusions) {
    for (const ex of exclusions || []) {
      try {
        if (turf.booleanPointInPolygon(centroid, ex)) return true;
      } catch (e) {}
    }
    return false;
  }

  // بازسازی شبکه از نقاط ویرایش‌شده کاربر (Delaunay + برش با مرز + احترام به حذف‌شده‌ها)
  function rebuildFishnetFromPoints() {
    const srcPoly = fishnetCtx.sourcePoly;
    if (!srcPoly) return false;
    const pts = triangPoints.value;
    if (!pts.length) return false;
    const { zone, northern, minSep, clip } = fishnetCtx;
    const input = [];
    for (const p of pts) {
      if (!Number.isFinite(p.lon) || !Number.isFinite(p.lat)) continue;
      let x = p.x, y = p.y;
      try {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          const utm = toUTMInZone(p.lon, p.lat, zone, northern);
          x = utm.x; y = utm.y;
        }
      } catch (e) { continue; }
      input.push([x, y]);
    }
    const uniq = dedupPoints(input, 0.01);
    if (uniq.length < 3) {
      ctx.$toast?.warning("برای بازسازی حداقل ۳ نقطه لازم است");
      return false;
    }
    let tin;
    try {
      tin = turf.tin(turf.featureCollection(uniq.map(([x, y]) => turf.point([x, y]))));
    } catch (e) {
      ctx.$toast?.error("بازسازی مثلث‌بندی ناموفق بود");
      return false;
    }
    if (!tin?.features?.length) return false;
    const minArea = minSep * minSep * 0.08;
    const cells = [];
    let sumMin = 0, worstMin = 60, skinny = 0, idx = 0, droppedSlivers = 0;
    for (const tri of tin.features) {
      const coords = tri.geometry?.coordinates?.[0];
      if (!coords || coords.length < 4) continue;
      const [au, bu, cu] = [coords[0], coords[1], coords[2]];
      const a = [au[0], au[1]], b = [bu[0], bu[1]], c = [cu[0], cu[1]];
      const mAngle = minAngleDeg(a, b, c);
      const utmArea = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
      if (!(utmArea > 0.01)) { droppedSlivers++; continue; }
      const e1 = dist2D(a, b), e2 = dist2D(b, c), e3 = dist2D(c, a);
      if (Math.min(e1, e2, e3) < minSep * 0.5 || mAngle < 4) { droppedSlivers++; continue; }
      const ll = [a, b, c].map(([x, y]) => {
        const { lng, lat } = fromUTM(x, y, zone, northern);
        return [lng, lat];
      });
      let triPoly;
      try { triPoly = turf.polygon([[...ll, ll[0]]]); } catch (e) { continue; }
      let keep = false;
      try {
        const ctr = turf.centroid(triPoly).geometry.coordinates;
        keep = turf.booleanPointInPolygon(ctr, srcPoly) || turf.booleanIntersects(triPoly, srcPoly);
      } catch (e) {
        try { keep = turf.booleanIntersects(triPoly, srcPoly); } catch (_) { keep = false; }
      }
      if (!keep) continue;
      let finalGeom = triPoly;
      if (clip) {
        try {
          const inter = turf.intersect(turf.featureCollection([triPoly, srcPoly]));
          if (!inter) continue;
          finalGeom = inter;
        } catch (e) { continue; }
      }
      // احترام به مثلث‌های حذف‌شده دستی (سوراخ‌های کاربر)
      try {
        const ctr = turf.centroid(finalGeom).geometry.coordinates;
        if (centroidExcluded(ctr, fishnetExclusions.value)) continue;
      } catch (e) {}
      const geoms = [];
      if (finalGeom.geometry?.type === "Polygon") geoms.push(finalGeom.geometry.coordinates);
      else if (finalGeom.geometry?.type === "MultiPolygon") {
        finalGeom.geometry.coordinates.forEach((co) => geoms.push(co));
      } else continue;
      geoms.forEach((co, partIdx) => {
        let feat;
        try { feat = turf.polygon(co); } catch (e) { return; }
        const area = turf.area(feat);
        if (!(area > minArea)) { droppedSlivers++; return; }
        try {
          const ctr = turf.centroid(feat).geometry.coordinates;
          if (centroidExcluded(ctr, fishnetExclusions.value)) return;
        } catch (e) {}
        idx++;
        const centroid = turf.centroid(feat);
        sumMin += mAngle;
        if (mAngle < worstMin) worstMin = mAngle;
        if (mAngle < 20) skinny++;
        cells.push({
          row: idx,
          col: 1,
          part: partIdx,
          id: `T${idx}${partIdx ? "-" + (partIdx + 1) : ""}`,
          feature: feat,
          area,
          centroid: centroid.geometry.coordinates,
          minAngle: Math.round(mAngle * 10) / 10,
          cornersUTM: [a, b, c],
        });
      });
      if (cells.length > MAX_TRIANGLES) break;
    }
    if (!cells.length) {
      ctx.$toast?.error("پس از ویرایش مثلثی باقی نماند");
      return false;
    }
    if (cells.length >= MAX_TRIANGLES) cells.length = MAX_TRIANGLES;
    const avgMin = sumMin / Math.max(1, idx || cells.length);
    const errPct = Math.max(0, ((30 - avgMin) / 30) * 100);
    // نقاط خروجی از سلول‌های جدید
    const rawPts = [];
    cells.forEach((c) => {
      const coords = c.feature.geometry?.coordinates;
      const rings = c.feature.geometry?.type === "MultiPolygon"
        ? coords.flat()
        : (Array.isArray(coords) ? coords : []);
      rings.forEach((ring) => {
        (ring || []).forEach(([lon, lat]) => {
          let x = NaN, y = NaN;
          try {
            const utm = toUTMInZone(lon, lat, zone, northern);
            x = utm.x; y = utm.y;
          } catch (e) {}
          rawPts.push({ id: "", lon, lat, x, y, zone, northern });
        });
      });
    });
    const mergedPts = mergeCloseUTM(rawPts, minSep);
    triangPoints.value = mergedPts.kept;
    const prev = triangStats.value || {};
    triangStats.value = {
      ...prev,
      count: cells.length,
      inputPoints: uniq.length,
      cornerCount: fishnetCtx.cornerCount,
      pointCount: mergedPts.kept.length,
      removedClose: (fishnetCtx.baseRemovedClose || 0) + droppedSlivers + mergedPts.removed,
      minSep: Math.round(minSep * 100) / 100,
      avgMinAngle: Math.round(avgMin * 10) / 10,
      worstMinAngle: Math.round(worstMin * 10) / 10,
      skinnyCount: skinny,
      errorPct: Math.round(errPct * 10) / 10,
      edge: fishnetCtx.edge,
    };
    fishnetCells.value = cells;
    renderFishnetPreview(cells);
    return true;
  }

  function paintNodesLive() {
    const m = ctx.map;
    if (!m) return;
    try {
      const src = m.getSource(FISHNET_SOURCE + "-labels");
      if (!src) return;
      src.setData({
        type: "FeatureCollection",
        features: triangPoints.value.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lon, p.lat] },
          properties: { pid: p.id },
        })),
      });
    } catch (e) {}
  }

  function commitTriangNodeMove(pid, lngLat) {
    const p = triangPoints.value.find((q) => String(q.id) === String(pid));
    if (!p || !lngLat) return false;
    p.lon = lngLat.lng;
    p.lat = lngLat.lat;
    try {
      const utm = toUTMInZone(p.lon, p.lat, fishnetCtx.zone, fishnetCtx.northern);
      p.x = utm.x; p.y = utm.y;
    } catch (e) {}
    return rebuildFishnetFromPoints();
  }

  function deleteFishnetCellById(id) {
    const idx = fishnetCells.value.findIndex((c) => String(c.id) === String(id));
    if (idx < 0) return false;
    const [removed] = fishnetCells.value.splice(idx, 1);
    try {
      fishnetExclusions.value.push(JSON.parse(JSON.stringify(removed.feature)));
    } catch (e) {
      fishnetExclusions.value.push(removed.feature);
    }
    fishnetDeletedCount.value = fishnetExclusions.value.length;
    if (triangStats.value) triangStats.value = { ...triangStats.value, count: fishnetCells.value.length };
    renderFishnetPreview(fishnetCells.value);
    ctx.$toast?.success(`مثلث ${id} حذف شد`);
    return true;
  }

  function deleteFishnetNodeById(pid) {
    const i = triangPoints.value.findIndex((p) => String(p.id) === String(pid));
    if (i < 0) return false;
    if (triangPoints.value.length <= 4) {
      ctx.$toast?.warning("حداقل چند نقطه برای شبکه لازم است");
      return false;
    }
    triangPoints.value.splice(i, 1);
    const ok = rebuildFishnetFromPoints();
    if (ok) ctx.$toast?.success(`نقطه ${pid} حذف و شبکه بازسازی شد`);
    return ok;
  }

  function addTriangPointAt(lngLat) {
    if (!lngLat || !fishnetCtx.sourcePoly) return false;
    const lon = lngLat.lng, lat = lngLat.lat;
    let x = NaN, y = NaN;
    try {
      const utm = toUTMInZone(lon, lat, fishnetCtx.zone, fishnetCtx.northern);
      x = utm.x; y = utm.y;
    } catch (e) {}
    triangPoints.value.push({ id: `P${triangPoints.value.length + 1}`, lon, lat, x, y, zone: fishnetCtx.zone, northern: fishnetCtx.northern });
    const ok = rebuildFishnetFromPoints();
    if (ok) ctx.$toast?.success("نقطه اضافه و شبکه بازسازی شد");
    else triangPoints.value.pop();
    return ok;
  }

  function restoreDeletedCells() {
    if (!fishnetExclusions.value.length) {
      ctx.$toast?.warning("مثلث حذف‌شده‌ای وجود ندارد");
      return false;
    }
    fishnetExclusions.value = [];
    fishnetDeletedCount.value = 0;
    const ok = rebuildFishnetFromPoints();
    if (ok) ctx.$toast?.success("مثلث‌های حذف‌شده بازگردانده شدند");
    return ok;
  }

  function onEditMouseDown(e) {
    if (!fishnetEditMode.value || fishnetEditTool.value !== "move") return;
    try {
      if (e.originalEvent && typeof e.originalEvent.button === "number" && e.originalEvent.button !== 0) return;
    } catch (err) {}
    let feats = [];
    try {
      feats = ctx.map.queryRenderedFeatures(e.point, { layers: [FISHNET_SOURCE + "-label"] });
    } catch (err) { return; }
    if (feats && feats.length && feats[0].properties?.pid) {
      dragPid = feats[0].properties.pid;
      try { ctx.map.dragPan.disable(); } catch (err) {}
      try { e.preventDefault(); } catch (err) {}
    }
  }

  function onEditMouseMove(e) {
    if (!dragPid || !fishnetEditMode.value) return;
    const p = triangPoints.value.find((q) => String(q.id) === String(dragPid));
    if (!p || !e.lngLat) return;
    p.lon = e.lngLat.lng;
    p.lat = e.lngLat.lat;
    paintNodesLive();
  }

  function onEditMouseUp(e) {
    if (!dragPid) return;
    const pid = dragPid;
    dragPid = null;
    try { ctx.map.dragPan.enable(); } catch (err) {}
    if (!fishnetEditMode.value || !e.lngLat) return;
    commitTriangNodeMove(pid, e.lngLat);
  }

  function onEditClick(e) {
    if (!fishnetEditMode.value || dragPid || !e.lngLat) return;
    const tool = fishnetEditTool.value;
    if (tool === "add") {
      addTriangPointAt(e.lngLat);
      return;
    }
    if (tool !== "delete") return;
    try {
      const nodes = ctx.map.queryRenderedFeatures(e.point, { layers: [FISHNET_SOURCE + "-label"] });
      if (nodes && nodes.length && nodes[0].properties?.pid) {
        deleteFishnetNodeById(nodes[0].properties.pid);
        return;
      }
    } catch (err) {}
    try {
      const tris = ctx.map.queryRenderedFeatures(e.point, { layers: [FISHNET_SOURCE + "-fill"] });
      if (tris && tris.length && tris[0].properties?.id) {
        deleteFishnetCellById(tris[0].properties.id);
      }
    } catch (err) {}
  }

  function bindEditHandlers() {
    const m = ctx.map;
    if (!m || editHandlersBound) return;
    m.on("mousedown", onEditMouseDown);
    m.on("mousemove", onEditMouseMove);
    m.on("mouseup", onEditMouseUp);
    m.on("click", onEditClick);
    editHandlersBound = true;
  }

  function unbindEditHandlers() {
    dragPid = null;
    const m = ctx.map;
    if (!m || !editHandlersBound) return;
    try { m.off("mousedown", onEditMouseDown); } catch (e) {}
    try { m.off("mousemove", onEditMouseMove); } catch (e) {}
    try { m.off("mouseup", onEditMouseUp); } catch (e) {}
    try { m.off("click", onEditClick); } catch (e) {}
    editHandlersBound = false;
    try { m.dragPan.enable(); } catch (e) {}
  }

  function setFishnetEditMode(on) {
    fishnetEditMode.value = !!on;
    if (fishnetEditMode.value) {
      if (!fishnetCells.value.length) {
        ctx.$toast?.warning("اول پیش‌نمایش مثلث‌بندی را بسازید");
        fishnetEditMode.value = false;
        return false;
      }
      bindEditHandlers();
      try { if (ctx.map) ctx.map.getCanvas().style.cursor = "crosshair"; } catch (e) {}
      renderFishnetPreview(fishnetCells.value);
      ctx.$toast?.success("حالت ویرایش دستی فعال شد");
    } else {
      unbindEditHandlers();
      try { if (ctx.map) ctx.map.getCanvas().style.cursor = ""; } catch (e) {}
      if (fishnetCells.value.length) renderFishnetPreview(fishnetCells.value);
    }
    return fishnetEditMode.value;
  }

  function setFishnetEditTool(tool) {
    if (tool !== "move" && tool !== "delete" && tool !== "add") return;
    fishnetEditTool.value = tool;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function escXml(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // خروجی CSV تمام نقاط شکل مثلث‌بندی‌شده
  function exportTriangPointsCSV() {
    const pts = triangPoints.value;
    if (!pts.length) {
      ctx.$toast?.warning("نقطه‌ای برای خروجی وجود ندارد — اول مثلث‌بندی را بسازید");
      return;
    }
    const header = ["id", "lon", "lat", "utm_x", "utm_y", "utm_zone"];
    const lines = [header.join(",")];
    pts.forEach((p) => {
      const zoneLabel = `${p.zone}${p.northern ? "N" : "S"}`;
      lines.push([
        p.id,
        p.lon.toFixed(6),
        p.lat.toFixed(6),
        Number.isFinite(p.x) ? p.x.toFixed(2) : "",
        Number.isFinite(p.y) ? p.y.toFixed(2) : "",
        zoneLabel,
      ].join(","));
    });
    downloadBlob(
      new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" }),
      `triangulation-points-${Date.now()}.csv`
    );
    ctx.$toast?.success(`${pts.length} نقطه در CSV ذخیره شد`);
  }

  // خروجی KML کل شکل مثلث‌بندی‌شده (هر مثلث یک پلیگان)
  function exportTriangPointsKML() {
    const cells = fishnetCells.value;
    if (!cells.length) {
      ctx.$toast?.warning("مثلثی برای خروجی وجود ندارد — اول مثلث‌بندی را بسازید");
      return;
    }
    const src = escXml(fishnetSourceLabel.value || "");
    let kml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n';
    kml += `  <name>${escXml(`شکل مثلث‌بندی ${fishnetSourceLabel.value || ""}`)}</name>\n`;
    cells.forEach((c) => {
      const coords = c.feature.geometry?.coordinates;
      const polys = c.feature.geometry?.type === "MultiPolygon"
        ? coords
        : (c.feature.geometry?.type === "Polygon" ? [coords] : []);
      polys.forEach((polyRings, pi) => {
        const outer = (polyRings && polyRings[0]) || [];
        if (outer.length < 3) return;
        const ring = [...outer];
        const f = ring[0], l = ring[ring.length - 1];
        if (f[0] !== l[0] || f[1] !== l[1]) ring.push([...f]);
        const coordStr = ring.map(([lo, la]) => `${lo.toFixed(6)},${la.toFixed(6)},0`).join(" ");
        const pname = polys.length > 1 ? `${c.id}-${pi + 1}` : c.id;
        kml += `  <Placemark><name>${escXml(pname)}</name><description>${escXml(`src: ${src} | minAngle: ${c.minAngle ?? "-"} | area: ${c.area.toFixed(1)}m2`)}</description><Polygon><outerBoundaryIs><LinearRing><coordinates>${coordStr}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>\n`;
      });
    });
    kml += "</Document>\n</kml>";
    downloadBlob(
      new Blob([kml], { type: "application/vnd.google-earth.kml+xml" }),
      `triangulation-${Date.now()}.kml`
    );
    ctx.$toast?.success(`${cells.length} مثلث در KML ذخیره شد`);
  }

  return {
    fishnetPanelOpen,
    fishnetCells,
    fishnetSourceLabel,
    generating,
    fishnetStage,
    fishnetProgress,
    FISHNET_STAGES,
    cellSize,
    cellUnit,
    clipToPolygon,
    selectedPinId,
    fishnetAngle,
    triangStats,
    triangPoints,
    fishnetEditMode,
    fishnetEditTool,
    fishnetDeletedCount,
    openFishnetPanel,
    clearFishnet,
    generateFishnet,
    setFishnetEditMode,
    setFishnetEditTool,
    deleteFishnetCellById,
    deleteFishnetNodeById,
    restoreDeletedCells,
    exportTriangPointsCSV,
    exportTriangPointsKML,
  };
}
