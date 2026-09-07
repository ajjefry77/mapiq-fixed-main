import proj4 from "proj4";

export function measureDistance([lng1, lat1], [lng2, lat2]) {
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

export function formatDistance(meters) {
  if (!isFinite(meters) || meters < 0) return "—";
  if (meters < 0.05) return "≈ 0 m";
  if (meters < 1) return (meters * 100).toFixed(0) + " cm";
  if (meters >= 1000) return (meters / 1000).toFixed(2) + " km";
  return meters.toFixed(2) + " m";
}

export function formatArea(squareMeters) {
  if (!isFinite(squareMeters) || squareMeters < 0) return "—";
  if (squareMeters >= 10000)
    return (squareMeters / 10000).toFixed(2) + " هکتار";
  return squareMeters.toFixed(2) + " m²";
}

export function formatVertexLabel(lng, lat, coordinateSystem) {
  if (coordinateSystem === "utm") {
    const zone = Math.floor((lng + 180) / 6) + 1;
    const hemisphere = lat >= 0 ? "" : "+south";
    const [x, y] = proj4(
      "EPSG:4326",
      `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${hemisphere}`,
      [lng, lat],
    );
    return `${x.toFixed(2)}, ${y.toFixed(2)} (Z${zone}${hemisphere ? "S" : "N"})`;
  }
  return `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
}

export function fromUTM(easting, northing, zone, northern = true) {
  const hemisphere = northern ? "" : "+south";
  const [lng, lat] = proj4(
    `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${hemisphere}`,
    "EPSG:4326",
    [Number(easting), Number(northing)],
  );
  return { lng, lat };
}

export function computeCentroid(positions) {
  if (!positions || !positions.length) return null;
  let sumLon = 0;
  let sumLat = 0;
  let count = 0;
  for (const p of positions) {
    const lon = p.lon ?? p.lng;
    const lat = p.lat;
    if (lon == null || lat == null) continue;
    sumLon += lon;
    sumLat += lat;
    count++;
  }
  if (!count) return null;
  return { lon: sumLon / count, lat: sumLat / count, lng: sumLon / count };
}

export function getDrawTypeName(type, isEditing) {
  if (isEditing) {
    const names = {
      circle: "ویرایش دایره",
      polygon: "ویرایش پلیگن",
      polyline: "ویرایش خط",
      multi_point: "ویرایش چند نقطه",
      point: "ویرایش نقطه",
    };
    return names[type] || "ویرایش ترسیم";
  }
  const names = {
    circle: "ترسیم دایره جدید",
    polygon: "ترسیم پلیگن جدید",
    polyline: "ترسیم خط جدید",
    multi_point: "ترسیم چند نقطه جدید",
  };
  return names[type] || "ترسیم جدید";
}

export function toUTM(lon, lat) {
  const zone = Math.floor((lon + 180) / 6) + 1;
  const northern = lat >= 0;
  return { ...toUTMInZone(lon, lat, zone, northern), zone };
}

export function toUTMInZone(lon, lat, zone, northern = true) {
  const hemisphere = northern ? "" : "+south";
  const [x, y] = proj4(
    "EPSG:4326",
    `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${hemisphere}`,
    [lon, lat],
  );
  return { x, y };
}

export function computeCircleCoords(center, radius, steps = 64) {
  const R = 6371008.8;
  const lat1 = (center.lat * Math.PI) / 180;
  const lon1 = (center.lng * Math.PI) / 180;
  const d = radius / R;
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const brng = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
      );
    coords.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  coords.push(coords[0]);
  return coords;
}

export function pointArraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].lng !== b[i].lng || a[i].lat !== b[i].lat) return false;
  }
  return true;
}
