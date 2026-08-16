/**
 * پارسر ساده DXF → GeoJSON
 * از موجودیت‌های POINT, LINE, LWPOLYLINE, POLYLINE, CIRCLE پشتیبانی می‌کند.
 * مختصات اگر شبیه درجه جغرافیایی باشند (lon/lat) همان‌طور استفاده می‌شوند؛
 * در غیر این صورت به‌صورت UTM (منطقه پیش‌فرض 39 شمالی — ایران) به WGS84 تبدیل می‌شوند.
 */
import proj4 from "proj4";

function isLikelyLonLat(x, y) {
  return Math.abs(x) <= 180 && Math.abs(y) <= 90;
}

function toLonLat(x, y, utmZone = 39) {
  if (isLikelyLonLat(x, y)) return [x, y];
  try {
    const [lon, lat] = proj4(
      `+proj=utm +zone=${utmZone} +datum=WGS84 +units=m +no_defs`,
      "EPSG:4326",
      [x, y]
    );
    return [lon, lat];
  } catch (e) {
    return [x, y];
  }
}

function parseGroupCodes(text) {
  const lines = text.split(/\r?\n/);
  const pairs = [];
  for (let i = 0; i < lines.length - 1; i += 2) {
    const code = parseInt(String(lines[i]).trim(), 10);
    const value = String(lines[i + 1] ?? "").trim();
    if (!Number.isNaN(code)) pairs.push([code, value]);
  }
  return pairs;
}

function extractEntities(pairs) {
  const entities = [];
  let inEntities = false;
  let current = null;

  const flush = () => {
    if (current) entities.push(current);
    current = null;
  };

  for (let i = 0; i < pairs.length; i++) {
    const [code, value] = pairs[i];
    if (code === 0 && value === "SECTION") {
      const next = pairs[i + 1];
      if (next && next[0] === 2 && next[1] === "ENTITIES") {
        inEntities = true;
      }
      continue;
    }
    if (code === 0 && value === "ENDSEC" && inEntities) {
      flush();
      inEntities = false;
      continue;
    }
    if (!inEntities) continue;

    if (code === 0) {
      flush();
      current = { type: value, props: {}, verts: [], bulge: [] };
      continue;
    }
    if (!current) continue;

    if (code === 10) current.props.x = parseFloat(value);
    else if (code === 20) current.props.y = parseFloat(value);
    else if (code === 11) current.props.x2 = parseFloat(value);
    else if (code === 21) current.props.y2 = parseFloat(value);
    else if (code === 40) current.props.radius = parseFloat(value);
    else if (code === 70) current.props.flags = parseInt(value, 10) || 0;
    else if (code === 90) current.props.nVerts = parseInt(value, 10) || 0;
    else if (code === 8) current.props.layer = value;
    else if (code === 42) current.bulge.push(parseFloat(value) || 0);

    if (current.type === "LWPOLYLINE" && code === 10) {
      const yPair = pairs[i + 1];
      const y =
        yPair && yPair[0] === 20 ? parseFloat(yPair[1]) : current.props.y;
      if (!Number.isNaN(current.props.x) && !Number.isNaN(y)) {
        current.verts.push([current.props.x, y]);
      }
    }
    if (current.type === "VERTEX" && code === 20) {
      if (
        !Number.isNaN(current.props.x) &&
        !Number.isNaN(current.props.y)
      ) {
        current.verts.push([current.props.x, current.props.y]);
      }
    }
  }
  flush();
  return entities;
}

function circleToRing(cx, cy, r, segments = 64) {
  const ring = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    ring.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return ring;
}

/**
 * @param {string} dxfText
 * @param {{ utmZone?: number }} options
 * @returns {{ type: 'FeatureCollection', features: object[] }}
 */
export function dxfToGeoJSON(dxfText, options = {}) {
  const utmZone = options.utmZone ?? 39;
  const pairs = parseGroupCodes(dxfText);
  const entities = extractEntities(pairs);
  const features = [];

  let polyBuffer = null;
  const convert = (xy) => toLonLat(xy[0], xy[1], utmZone);

  for (const ent of entities) {
    const t = ent.type;

    if (t === "POLYLINE") {
      polyBuffer = {
        closed: !!(ent.props.flags & 1),
        verts: [],
        layer: ent.props.layer,
      };
      continue;
    }
    if (t === "VERTEX" && polyBuffer) {
      if (ent.props.x != null && ent.props.y != null) {
        polyBuffer.verts.push([ent.props.x, ent.props.y]);
      }
      continue;
    }
    if (t === "SEQEND" && polyBuffer) {
      if (polyBuffer.verts.length >= 2) {
        const coords = polyBuffer.verts.map(convert);
        if (polyBuffer.closed && coords.length >= 3) {
          const ring = [...coords];
          const f = ring[0],
            l = ring[ring.length - 1];
          if (f[0] !== l[0] || f[1] !== l[1]) ring.push([...f]);
          features.push({
            type: "Feature",
            properties: { layer: polyBuffer.layer || "", source: "DXF" },
            geometry: { type: "Polygon", coordinates: [ring] },
          });
        } else {
          features.push({
            type: "Feature",
            properties: { layer: polyBuffer.layer || "", source: "DXF" },
            geometry: { type: "LineString", coordinates: coords },
          });
        }
      }
      polyBuffer = null;
      continue;
    }

    if (t === "POINT" && ent.props.x != null && ent.props.y != null) {
      features.push({
        type: "Feature",
        properties: { layer: ent.props.layer || "", source: "DXF" },
        geometry: {
          type: "Point",
          coordinates: convert([ent.props.x, ent.props.y]),
        },
      });
      continue;
    }

    if (
      t === "LINE" &&
      ent.props.x != null &&
      ent.props.y != null &&
      ent.props.x2 != null &&
      ent.props.y2 != null
    ) {
      features.push({
        type: "Feature",
        properties: { layer: ent.props.layer || "", source: "DXF" },
        geometry: {
          type: "LineString",
          coordinates: [
            convert([ent.props.x, ent.props.y]),
            convert([ent.props.x2, ent.props.y2]),
          ],
        },
      });
      continue;
    }

    if (t === "LWPOLYLINE" && ent.verts.length >= 2) {
      const coords = ent.verts.map(convert);
      const closed = !!(ent.props.flags & 1);
      if (closed && coords.length >= 3) {
        const ring = [...coords];
        const f = ring[0],
          l = ring[ring.length - 1];
        if (f[0] !== l[0] || f[1] !== l[1]) ring.push([...f]);
        features.push({
          type: "Feature",
          properties: { layer: ent.props.layer || "", source: "DXF" },
          geometry: { type: "Polygon", coordinates: [ring] },
        });
      } else {
        features.push({
          type: "Feature",
          properties: { layer: ent.props.layer || "", source: "DXF" },
          geometry: { type: "LineString", coordinates: coords },
        });
      }
      continue;
    }

    if (
      t === "CIRCLE" &&
      ent.props.x != null &&
      ent.props.y != null &&
      ent.props.radius != null &&
      ent.props.radius > 0
    ) {
      const ring = circleToRing(
        ent.props.x,
        ent.props.y,
        ent.props.radius
      ).map(convert);
      features.push({
        type: "Feature",
        properties: {
          layer: ent.props.layer || "",
          source: "DXF",
          isCircle: true,
        },
        geometry: { type: "Polygon", coordinates: [ring] },
      });
    }
  }

  return { type: "FeatureCollection", features };
}
