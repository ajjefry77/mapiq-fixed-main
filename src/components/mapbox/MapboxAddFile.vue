<template>
  <Loading :active="loading"/>
</template>

<script setup>
import { ref } from 'vue';
import Loading from '../Loading.vue';
import shp from 'shpjs';

const loading = ref(false);

const props = defineProps({
  pins: { type: Object, required: true },
  map: { type: Object, required: true },
});

function addGeoJSONSourceAndLayers(sourceId, geojson, pin) {
  const map = props.map;

  map.addSource(sourceId, { type: 'geojson', data: geojson });

  map.addLayer({
    id: sourceId + '-fill',
    type: 'fill',
    source: sourceId,
    paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.3 },
    filter: ['==', '$type', 'Polygon']
  });

  map.addLayer({
    id: sourceId + '-line',
    type: 'line',
    source: sourceId,
    paint: { 'line-color': '#ff0000', 'line-width': 2 },
    filter: ['in', '$type', 'LineString', 'Polygon']
  });

  map.addLayer({
    id: sourceId + '-point',
    type: 'circle',
    source: sourceId,
    paint: { 'circle-radius': 6, 'circle-color': '#ff0000' },
    filter: ['==', '$type', 'Point']
  });

  pin.shape._sourceIds = [sourceId];

  const bounds = new mapboxgl.LngLatBounds();
  const addCoords = (coords) => {
    if (typeof coords[0] === 'number') {
      bounds.extend(coords);
    } else {
      coords.forEach(addCoords);
    }
  };
  geojson.features.forEach(f => addCoords(f.geometry.coordinates));

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 50, duration: 2000 });
  }
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();
  loading.value = true;

  if (fileName.endsWith(".kml") || fileName.endsWith(".kmz")) {
    try {
      const url = URL.createObjectURL(file);
      const response = await fetch(url);
      const text = await response.text();
      URL.revokeObjectURL(url);

      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'application/xml');
      const geojson = kmlToGeoJSON(doc);

      const sourceId = 'file-' + crypto.randomUUID();
      const pin = {
        id: crypto.randomUUID(),
        name: fileName,
        shape: { show: true, _sourceIds: [sourceId] },
        date: new Date(),
        save: -1,
        type: 'file',
        file: file
      };

      addGeoJSONSourceAndLayers(sourceId, geojson, pin);
      props.pins.push(pin);
    } catch (error) {
      console.error("خطا در بارگذاری فایل:", error);
    } finally {
      loading.value = false;
    }
  } else if (fileName.endsWith(".zip")) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const geojson = await shp(arrayBuffer);

        const sourceId = 'file-' + crypto.randomUUID();
        const pin = {
          id: crypto.randomUUID(),
          name: fileName,
          shape: { show: true, _sourceIds: [sourceId] },
          date: new Date(),
          save: -1,
          type: 'file'
        };

        addGeoJSONSourceAndLayers(sourceId, geojson, pin);
        props.pins.push(pin);
      } catch (error) {
        console.error("خطا در بارگذاری Shapefile:", error);
      } finally {
        loading.value = false;
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert("فقط فایل‌های KML/KMZ و SHP (ZIP) پشتیبانی می‌شوند.");
    loading.value = false;
  }
};

function kmlToGeoJSON(doc) {
  const features = [];

  const processPlacemark = (pm) => {
    const nameEl = pm.querySelector('name');
    const descEl = pm.querySelector('description');
    const name = nameEl ? nameEl.textContent : '';
    const description = descEl ? descEl.textContent : '';

    const point = pm.querySelector('Point');
    const lineString = pm.querySelector('LineString');
    const polygon = pm.querySelector('Polygon');

    let geometry = null;

    if (point) {
      const coords = parseKMLCoordinates(point.querySelector('coordinates'));
      if (coords.length) geometry = { type: 'Point', coordinates: coords[0] };
    } else if (lineString) {
      const coords = parseKMLCoordinates(lineString.querySelector('coordinates'));
      if (coords.length) geometry = { type: 'LineString', coordinates: coords };
    } else if (polygon) {
      const outer = polygon.querySelector('outerBoundaryIs coordinates');
      const coords = parseKMLCoordinates(outer);
      if (coords.length) {
        coords.push(coords[0]);
        geometry = { type: 'Polygon', coordinates: [coords] };
      }
    }

    if (geometry) {
      features.push({ type: 'Feature', properties: { name, description }, geometry });
    }
  };

  doc.querySelectorAll('Placemark').forEach(processPlacemark);
  return { type: 'FeatureCollection', features };
}

function parseKMLCoordinates(el) {
  if (!el) return [];
  return el.textContent.trim().split(/\s+/).map(pair => {
    const [lon, lat] = pair.split(',').map(Number);
    return [lon, lat];
  }).filter(c => !isNaN(c[0]) && !isNaN(c[1]));
}

defineExpose({ handleFileUpload });
</script>
