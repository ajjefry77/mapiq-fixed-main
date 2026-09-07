import * as turf from "@turf/turf";
import { ref } from "vue";
import { registerDrawLayer } from "../utils/layerOrder";
import { toUTM, toUTMInZone, fromUTM } from "./useDrawingHelpers";

const FISHNET_SOURCE = "fishnet-src";
const MAX_CELLS = 5000;

export function createFishnetHandler(ctx) {
  const fishnetPanelOpen = ref(false);
  const fishnetCells = ref([]);
  const fishnetSourceLabel = ref("");
  const generating = ref(false);
  const cellSize = ref(100);
  const cellUnit = ref("m");
  const clipToPolygon = ref(true);
  const selectedPinId = ref("");

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

  // فقط شبکه خالی: بدون لیبل RxCy، بدون فیل توپر — فقط خطوط نارنجی

  function openFishnetPanel() {
    fishnetPanelOpen.value = true;
  }

  function clearFishnet() {
    removeFishnetLayers();
    fishnetCells.value = [];
    fishnetSourceLabel.value = "";
    fishnetPanelOpen.value = false;
    generating.value = false;
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

  function generateFishnet(sourcePinId, size, unit, clip = true) {
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
    const cell = sizeToMeters(size, unit);
    if (!cell || cell <= 0) {
      ctx.$toast?.warning("اندازه سلول معتبر نیست");
      return [];
    }

    generating.value = true;
    try {
      const ring = poly.geometry.coordinates[0];
      let sumLon = 0;
      let sumLat = 0;
      ring.forEach((c) => {
        sumLon += c[0];
        sumLat += c[1];
      });
      const cLon = sumLon / ring.length;
      const cLat = sumLat / ring.length;
      const { zone } = toUTM(cLon, cLat);
      const northern = cLat >= 0;

      const utmRing = ring.map(([lon, lat]) => {
        const { x, y } = toUTMInZone(lon, lat, zone, northern);
        return [x, y];
      });
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      utmRing.forEach(([x, y]) => {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      });

      const cols = Math.ceil((maxX - minX) / cell);
      const rows = Math.ceil((maxY - minY) / cell);
      if (cols <= 0 || rows <= 0) {
        ctx.$toast?.error("محدوده پلیگان برای شبکه‌بندی خیلی کوچک است");
        return [];
      }
      if (cols * rows > MAX_CELLS) {
        ctx.$toast?.error(`تعداد سلول‌ها ${cols * rows} است (سقف ${MAX_CELLS}). اندازه سلول را بزرگ‌تر کنید`);
        return [];
      }

      const cells = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x0 = minX + c * cell;
          const y0 = minY + r * cell;
          const x1 = Math.min(x0 + cell, maxX + cell);
          const cx1 = x0 + cell;
          const cy1 = y0 + cell;
          const cornersUTM = [
            [x0, y0],
            [cx1, y0],
            [cx1, cy1],
            [x0, cy1],
            [x0, y0],
          ];
          const cornersLonLat = cornersUTM.map(([x, y]) => {
            const { lng, lat } = fromUTM(x, y, zone, northern);
            return [lng, lat];
          });
          let cellPoly;
          try {
            cellPoly = turf.polygon([cornersLonLat]);
          } catch (e) {
            continue;
          }
          if (!turf.booleanIntersects(cellPoly, poly)) continue;
          let finalGeom = cellPoly;
          if (clip) {
            try {
              const inter = turf.intersect(turf.featureCollection([cellPoly, poly]));
              if (!inter) continue;
              finalGeom = inter;
            } catch (e) {
              continue;
            }
          }
          const geoms = [];
          if (finalGeom.geometry.type === "Polygon") geoms.push(finalGeom.geometry.coordinates);
          else if (finalGeom.geometry.type === "MultiPolygon") {
            finalGeom.geometry.coordinates.forEach((coords) => geoms.push(coords));
          } else continue;
          geoms.forEach((coords, partIdx) => {
            const feat = turf.polygon(coords);
            const area = turf.area(feat);
            if (area <= 0.001) return;
            const centroid = turf.centroid(feat);
            cells.push({
              row: r + 1,
              col: c + 1,
              part: partIdx,
              id: `R${r + 1}C${c + 1}${partIdx ? "-" + (partIdx + 1) : ""}`,
              feature: feat,
              area,
              centroid: centroid.geometry.coordinates,
            });
          });
          void x1;
        }
      }

      fishnetCells.value = cells;
      fishnetSourceLabel.value = pin.name || "(بدون نام)";
      selectedPinId.value = String(pin.id);
      renderFishnetPreview(cells);
      ctx.$toast?.success(`${cells.length} سلول شبکه ساخته شد (${cols}×${rows})`);
      return cells;
    } finally {
      generating.value = false;
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
        properties: { id: c.id, row: c.row, col: c.col },
      })),
    };
    m.addSource(FISHNET_SOURCE, { type: "geojson", data: fc });
    m.addLayer({
      id: FISHNET_SOURCE + "-line",
      type: "line",
      source: FISHNET_SOURCE,
      paint: { "line-color": "#f97316", "line-width": 2, "line-opacity": 0.95 },
    });
    [FISHNET_SOURCE + "-line"].forEach(registerDrawLayer);
  }

  async function saveFishnet(baseName) {
    const cells = fishnetCells.value;
    if (!cells.length) {
      ctx.$toast?.warning("اول پیش‌نمایش شبکه را بسازید");
      return;
    }
    const pinsList = Array.isArray(ctx.pins) ? ctx.pins : null;
    const name = (baseName || fishnetSourceLabel.value || "گرید").trim() || "گرید";
    let saved = 0;
    for (const c of cells) {
      const coords = c.feature.geometry.coordinates[0];
      const positions = coords.map(([lon, lat]) => ({ lon, lat, height: 0 }));
      const pin = {
        id: crypto.randomUUID(),
        name: `${name} ${c.id}`,
        descr: `fishnet row=${c.row} col=${c.col} area=${c.area.toFixed(1)}m2 src=${fishnetSourceLabel.value}`,
        shape: {
          type: "polygon",
          positions,
          color: "#f97316",
          outlineColor: "#ea580c",
          opacity: 1,
          fillOpacity: 0,
          width: 2,
          show: true,
        },
        date: new Date(),
        save: -1,
        type: "draw",
        parent_id: -1,
      };
      if (pinsList) {
        pinsList.push(pin);
      } else if (ctx.pins?.value) {
        ctx.pins.value.push(pin);
      }
      try {
        if (ctx.renderNewPin) ctx.renderNewPin(pin);
        if (ctx.addVisibleId) ctx.addVisibleId(pin.id);
        if (ctx.saveOneWorks) await ctx.saveOneWorks(pin);
        saved++;
      } catch (e) {
        /* ادامه با بقیه سلول‌ها */
      }
    }
    removeFishnetLayers();
    ctx.$toast?.success(`${saved} سلول ذخیره شد`);
    return saved;
  }

  function exportFishnetCSV() {
    const cells = fishnetCells.value;
    if (!cells.length) {
      ctx.$toast?.warning("داده‌ای برای خروجی وجود ندارد");
      return;
    }
    const header = ["id", "row", "col", "area_m2", "center_lon", "center_lat"];
    const lines = [header.join(",")];
    cells.forEach((c) => {
      lines.push([c.id, c.row, c.col, c.area.toFixed(2), c.centroid[0].toFixed(6), c.centroid[1].toFixed(6)].join(","));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fishnet-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    fishnetPanelOpen,
    fishnetCells,
    fishnetSourceLabel,
    generating,
    cellSize,
    cellUnit,
    clipToPolygon,
    selectedPinId,
    openFishnetPanel,
    clearFishnet,
    generateFishnet,
    saveFishnet,
    exportFishnetCSV,
  };
}
