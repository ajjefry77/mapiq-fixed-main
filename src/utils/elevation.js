// ابزار ارتفاع — کار در هر دو حالت 2D و 3D
// اولویت: 1) queryTerrainElevation (وقتی terrain ست است، حتی با exaggeration=0)
// 2) دیکد Terrain-RGB مپ‌باکس (بدون نیاز به terrain نمایشی)
// 3) OpenTopoData (رایگان، بدون کلید)

const cache = new Map();
const pending = new Map();

function cacheKey(lat, lng) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export function queryElevationSync(map, lng, lat) {
  try {
    if (!map || typeof map.queryTerrainElevation !== "function") return 0;
    const ele = map.queryTerrainElevation({ lng, lat });
    return Number.isFinite(ele) ? ele : 0;
  } catch (_) {
    return 0;
  }
}

export function ensureDemSource(map) {
  try {
    if (!map || map.getSource("mapbox-dem")) return true;
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });
    return true;
  } catch (_) {
    return false;
  }
}

export function setTerrainExaggeration(map, exaggeration) {
  try {
    if (!map) return false;
    ensureDemSource(map);
    map.setTerrain({ source: "mapbox-dem", exaggeration });
    return true;
  } catch (_) {
    return false;
  }
}

function lngLatToTile(lng, lat, z) {
  const n = Math.pow(2, z);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x: Math.floor(x), y: Math.floor(y), px: Math.floor((x % 1) * 512), py: Math.floor((y % 1) * 512) };
}

async function fetchTerrainRgbElevation(lng, lat, token) {
  if (!token) return null;
  const z = 14;
  const t = lngLatToTile(lng, lat, z);
  if (t.x < 0 || t.y < 0 || t.y >= Math.pow(2, z)) return null;
  const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${z}/${t.x}/${t.y}.pngraw?access_token=${token}`;
  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || 512;
  canvas.height = img.naturalHeight || 512;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const sx = Math.min(Math.max(t.px, 0), canvas.width - 1);
  const sy = Math.min(Math.max(t.py, 0), canvas.height - 1);
  const d = ctx.getImageData(sx, sy, 1, 1).data;
  const ele = -10000 + (d[0] * 256 * 256 + d[1] * 256 + d[2]) * 0.1;
  return Number.isFinite(ele) ? ele : null;
}

async function fetchOpenTopoElevation(lat, lng) {
  const url = `https://api.opentopodata.org/v1/mapbox?locations=${lat},${lng}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const ele = json?.results?.[0]?.elevation;
  return Number.isFinite(ele) ? ele : null;
}

// نسخه ناهمگام: اول کش، بعد Terrain-RGB، بعد OpenTopoData
export async function fetchElevationAsync(lng, lat) {
  const key = cacheKey(lat, lng);
  if (cache.has(key)) return cache.get(key);
  if (pending.has(key)) return pending.get(key);
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const p = (async () => {
    try {
      const rgb = await fetchTerrainRgbElevation(lng, lat, token);
      if (Number.isFinite(rgb)) {
        cache.set(key, rgb);
        return rgb;
      }
    } catch (_) {}
    try {
      const oto = await fetchOpenTopoElevation(lat, lng);
      if (Number.isFinite(oto)) {
        cache.set(key, oto);
        return oto;
      }
    } catch (_) {}
    return null;
  })();
  pending.set(key, p);
  try {
    return await p;
  } finally {
    pending.delete(key);
  }
}

// ترکیب sync + async: مقدار sync را فوری بده، بعد async را روی کالبک اعمال کن
export function resolveElevation(map, lng, lat, onUpdate) {
  const syncEle = queryElevationSync(map, lng, lat);
  if (Number.isFinite(syncEle) && syncEle !== 0) {
    return syncEle;
  }
  // sync صفر/نامعتبر بود → ناهمگام تلاش کن
  fetchElevationAsync(lng, lat).then((ele) => {
    if (Number.isFinite(ele) && typeof onUpdate === "function") onUpdate(ele);
  });
  return syncEle || 0;
}
