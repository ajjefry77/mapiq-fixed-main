/**
 * تبدیل ترسیم‌ها / GeoJSON به DXF (ASCII)
 * خروجی در سیستم WGS84 lon/lat نوشته می‌شود (قابل‌باز شدن در اکثر نرم‌افزارها).
 */

function fmt(n) {
  return Number(n).toFixed(8);
}

function entityHeader(type, layer = "0") {
  return `  0\n${type}\n  8\n${layer}\n`;
}

function writePoint(lon, lat, layer = "0") {
  return (
    entityHeader("POINT", layer) +
    ` 10\n${fmt(lon)}\n 20\n${fmt(lat)}\n 30\n0.0\n`
  );
}

function writeLine(lon1, lat1, lon2, lat2, layer = "0") {
  return (
    entityHeader("LINE", layer) +
    ` 10\n${fmt(lon1)}\n 20\n${fmt(lat1)}\n 30\n0.0\n` +
    ` 11\n${fmt(lon2)}\n 21\n${fmt(lat2)}\n 31\n0.0\n`
  );
}

function writeLwPolyline(coords, closed, layer = "0") {
  let s =
    entityHeader("LWPOLYLINE", layer) +
    ` 90\n${coords.length}\n 70\n${closed ? 1 : 0}\n`;
  for (const c of coords) {
    s += ` 10\n${fmt(c[0])}\n 20\n${fmt(c[1])}\n`;
  }
  return s;
}

function featureToDxf(f, layer = "0") {
  if (!f?.geometry) return "";
  const g = f.geometry;
  const ly = (f.properties && f.properties.layer) || layer;
  if (g.type === "Point") {
    return writePoint(g.coordinates[0], g.coordinates[1], ly);
  }
  if (g.type === "MultiPoint") {
    return g.coordinates.map((c) => writePoint(c[0], c[1], ly)).join("");
  }
  if (g.type === "LineString") {
    return writeLwPolyline(g.coordinates, false, ly);
  }
  if (g.type === "MultiLineString") {
    return g.coordinates
      .map((line) => writeLwPolyline(line, false, ly))
      .join("");
  }
  if (g.type === "Polygon") {
    // outer ring
    const ring = g.coordinates[0] || [];
    return writeLwPolyline(ring, true, ly);
  }
  if (g.type === "MultiPolygon") {
    return g.coordinates
      .map((poly) => writeLwPolyline(poly[0] || [], true, ly))
      .join("");
  }
  return "";
}

/** از FeatureCollection */
export function geoJSONToDXF(geojson, layerName = "MAPIQ") {
  const features = geojson?.features || [];
  let entities = "";
  for (const f of features) {
    entities += featureToDxf(f, layerName);
  }
  return wrapDxf(entities);
}

/** از پین‌های draw اپلیکیشن */
export function pinsToDXF(pins) {
  let entities = "";
  for (const pin of pins || []) {
    const s = pin.shape;
    if (!s) continue;
    const layer = (pin.name || "0").replace(/[^\w\u0600-\u06FF\- ]/g, "_").slice(0, 30) || "0";
    if (s.type === "point" && s.lon != null) {
      entities += writePoint(s.lon, s.lat, layer);
    } else if (s.type === "multi_point" && Array.isArray(s.positions)) {
      for (const p of s.positions) {
        entities += writePoint(p.lon, p.lat, layer);
      }
    } else if (s.type === "polyline" && Array.isArray(s.positions)) {
      const coords = s.positions.map((p) => [p.lon, p.lat]);
      if (coords.length >= 2) entities += writeLwPolyline(coords, false, layer);
    } else if (s.type === "polygon" && Array.isArray(s.positions)) {
      let coords = s.positions.map((p) => [p.lon, p.lat]);
      // حذف نقطه تکراری آخر در صورت وجود
      if (
        coords.length > 1 &&
        coords[0][0] === coords[coords.length - 1][0] &&
        coords[0][1] === coords[coords.length - 1][1]
      ) {
        coords = coords.slice(0, -1);
      }
      if (coords.length >= 3) entities += writeLwPolyline(coords, true, layer);
    } else if (s.type === "circle" && s.center && s.radius) {
      const c = s.center;
      const lon = c.lng ?? c.lon;
      const lat = c.lat;
      // تقریب دایره با پلی‌لاین
      const ring = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * 2 * Math.PI;
        const rLat = lat + (s.radius / 110540) * Math.sin(a);
        const rLon =
          lon +
          (s.radius / (111319.9 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a);
        ring.push([rLon, rLat]);
      }
      entities += writeLwPolyline(ring, true, layer);
    }
  }
  return wrapDxf(entities);
}

function wrapDxf(entitiesContent) {
  return (
    `  0\nSECTION\n  2\nHEADER\n  9\n$ACADVER\n  1\nAC1015\n  0\nENDSEC\n` +
    `  0\nSECTION\n  2\nTABLES\n  0\nENDSEC\n` +
    `  0\nSECTION\n  2\nBLOCKS\n  0\nENDSEC\n` +
    `  0\nSECTION\n  2\nENTITIES\n` +
    entitiesContent +
    `  0\nENDSEC\n  0\nEOF\n`
  );
}
