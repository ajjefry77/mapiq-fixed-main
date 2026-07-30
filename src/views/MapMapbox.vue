<template>
  <div class="flex h-[calc(100vh-60px)] bg-gray-50">
    <div class="flex-1 h-full overflow-hidden">
      <div class="relative">
        <button class="absolute top-4 right-[5px] h-8 w-8 z-50 bg-black/30 text-white rounded md:hidden py-1.5" @click="isOpen = !isOpen">☰</button>
      </div>

      <div :class="['md:relative md:float-right md:h-screen md:block', isOpen ? 'fixed inset-0 z-[500] md:static' : 'hidden']">
        <div v-if="isOpen" class="absolute inset-0 bg-black/40 md:hidden" @click="isOpen = false"></div>

        <div class="absolute top-1 right-[1px] w-[340px] max-w-[calc(100vw-16px)] bg-white border border-[var(--border)] rounded shadow p-3 z-[500] flex flex-col
                    md:h-[70vh] max-md:top-2 max-md:bottom-2 max-md:left-2 max-md:right-2 max-md:w-auto max-md:max-h-[calc(100vh-16px)] max-md:overflow-y-auto">
          <button @click="isOpen = false" class="absolute top-2 left-4 text-xl z-10">&times;</button>
          <MapboxPinsList v-if="mapReady" class="flex-1 min-h-0" :pins="Pins" :map="map" :openId="openWorkId" :openDia="openMyDialog"
                         @clearPins="clearPins" :close="isOpen"/>
        </div>

        <div id="layer-panel"
             class="absolute top-[70.5%] right-1 w-[340px] h-[29%] bg-white border border-[var(--border)] rounded shadow p-3 z-50 max-md:hidden">
          <div class="overflow-y-auto h-[95%]">
            <h3 class="mb-2 text-sm">لایه ها : </h3>
            <hr style="border-top: 1px solid #aaa; margin-bottom: 10px"/>
            <span v-if="authStore?.user?.phone == '09153333989' || authStore?.user?.phone == '09156620866'" class="text-xs text-gray-800 truncate">
              <input type="checkbox" class="ml-2 accent-green-600" @change="ShowTile"/>
              <i class="text-blue-500"/>
              عکس هوایی طرقبه 1340
            </span>
          </div>
        </div>
      </div>

      <div class="relative h-full">
        <div ref="mapContainerRef" id="mapboxRoot" style="width:100%; height:100%;"></div>

        <!-- ========================================== -->
        <!-- بنر راهنمای حالت برش (Cut Mode Indicator) -->
        <!-- ========================================== -->
        <div 
          v-if="drawing?.drawMode === 'cut'" 
          class="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded shadow-lg z-[600] flex items-center gap-2 pointer-events-none"
        >
          <i class="fas fa-scissors animate-pulse"></i>
          <span class="text-sm font-medium whitespace-nowrap">
            در حال ترسیم خط برش... (برای اتمام: دابل‌کلیک | برای لغو: کلید Esc)
          </span>
        </div>
        <!-- ========================================== -->

        <div v-if="!authStore.user && ShowForLogin" class="absolute top-3 right-1 md:right-[350px] bg-gray-900/85 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 border border-gray-700/50 backdrop-blur-sm flex items-center gap-3">
          <svg class="w-4 h-4 shrink-0 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>برای دسترسی به امکانات کامل، <a class="text-orange-400 hover:text-orange-300 transition-colors underline underline-offset-2" href="/login">وارد شوید</a></span>
          <button @click="ShowForLogin = false" class="text-xl leading-none text-gray-400 hover:text-white transition-colors">&times;</button>
        </div>

        <div class="absolute bottom-8 md:bottom-3 left-3 px-2 py-2 rounded-md font-mono text-sm" style="background: rgba(26,29,39,.85); color: var(--text-muted);">
          <div class="float-left mr-4">
            <ToggleSwitch class="inline-block" v-model="latlon" left='UTM' right='GCS'/>
          </div>
          <div class="flex">
            <div v-if="latlon">
              Lon: {{ Lon }} , Lat: {{ Lat }} | Scale: {{ scale }}
            </div>
            <div v-else>
              Easting: {{ easting }} , Northing: {{ northing }} , Zone: {{ zone }} | Scale: {{ scale }}
            </div>
          </div>
        </div>
      </div>

      <MapboxSearchAddress v-if="mapReady" :map="map"/>
      <MapboxNorthIcon v-if="mapReady" :map="map"/>
      <MapboxFlyPosition v-if="mapReady" :map="map" :latlon="latlon"/>
      <MapboxDrawTools ref="drawing" v-if="mapReady" :map="map" :pins="Pins" :baseMaps="baseMaps" @setBaseLayer="setBaseLayer" @pickPoint="onMapPointPicked"/>

    </div>
  </div>

  <OpenDialog v-if="mapReady" v-model:visible="openDialog" :openId="openWorkId" :pins="Pins" @update:pins="Pins = $event" :viewer="map"/>
  <Profile />
  <Loading :active="loading" />
  <button v-if="isMobileUA" @click="getLocation" style="z-index: 9999"
          class="absolute bottom-16 right-[10px] w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shadow-md"
          title="جستجوی آدرس">
    <i class="fas fa-location m-1"></i>
  </button>

  <LocationPickerPanel v-model:visible="showPickerPanel" :lat="pickedPoint.lat" :lng="pickedPoint.lng" @close="closePickerPanel" @savePoint="savePickedPoint"/>
</template>

<script setup>
import { ref, reactive, onMounted, computed, inject, onActivated, provide, onUnmounted, nextTick } from 'vue';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import MapboxNorthIcon from '../components/mapbox/MapboxNorthIcon.vue';
import MapboxFlyPosition from '../components/mapbox/MapboxFlyPosition.vue';
import MapboxDrawTools from '../components/mapbox/MapboxDrawTools.vue';
import MapboxPinsList from "../components/mapbox/MapboxPinsList.vue";
import MapboxSearchAddress from '../components/mapbox/MapboxSearchAddress.vue';

import Loading from '../components/Loading.vue';
import OpenDialog from '../components/OpenDialog.vue';
import Profile from '../components/Profile.vue';
import ToggleSwitch from "../components/ToggleSwitch.vue";
import LocationPickerPanel from "../components/LocationPickerPanel.vue";

import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import axios from "axios";
import proj4 from "proj4";
import { bringDrawingsToFront } from "../utils/layerOrder";

const GEOSERVER = import.meta.env.VITE_GEOSERVER;
const SERVER = import.meta.env.VITE_SERVER;

const baseMaps = [
  { name: "OSM", thumbnail: "https://a.tile.openstreetmap.org/0/0/0.png", style: "https://api.maptiler.com/maps/streets/style.json" },
  { name: "Satellite", thumbnail: "smap.jpg", style: "satellite" },
  { name: "Google Maps", thumbnail: "gmap.jpg", tiles: "https://mapiq.ir:3002/api/proxy/mapir/google/vt/lyrs=p&hl=fa&x={x}&y={y}&z={z}" },
  { name: "Satellite(داخلی)", thumbnail: "smap.jpg", tiles: "https://sat.neshanmap.ir/v1.0/{z}/{x}/{y}" },
];

const router = useRouter();
const authStore = useAuthStore();
const isMobileUA = ref(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

const ShowForLogin = ref(true);
const isOpen = ref(false);
let map = null;
const mapReady = ref(false);

const Pins = reactive([]);
const openWorkId = ref({});
const openDialog = ref(false);

const latlon = ref(false);
const easting = ref("--");
const northing = ref("--");
const Lon = ref("--");
const Lat = ref("--");
const zone = ref("--");
const scale = ref("--");

// این ref برای دسترسی به کامپوننت MapboxDrawTools و خواندن drawMode استفاده می‌شود
const drawing = ref(null); 
const loading = ref(false);

const pickMarker = ref(null);
const pickedPoint = reactive({ lat: null, lng: null });
const showPickerPanel = ref(false);

const layersLoaded = reactive([]);
const layerOpacity = reactive({});
const activeOpacityLayer = ref(null);

const mapContainerRef = ref(null);

provide('Pins', Pins);

function clearPins() { Pins.splice(0, Pins.length); }
function openMyDialog() { openDialog.value = true; }

function setBaseLayer(basemap) {
  if (!map) return;
  if (basemap.tiles) {
    // قبل از افزودن بیس‌مپ جدید، سبک قبلی نقشه (مثلا ست‌لایت یا OSM) را کامل پاک می‌کنیم
    // وگرنه لایه‌ی جدید زیر لایه‌ی قبلی اضافه می‌شود و دیده نمی‌شود
    map.setStyle({ version: 8, sources: {}, layers: [] });
    map.once("style.load", () => {
      const sourceId = 'basemap-custom';
      const layerId = 'basemap-custom-layer';
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      map.addSource(sourceId, { type: 'raster', tiles: [basemap.tiles], tileSize: 256, attribution: '' });
      map.addLayer({ id: layerId, type: 'raster', source: sourceId });
      bringDrawingsToFront(map);
    });
  } else if (basemap.style === "satellite") {
    const satelliteLayer = {
      version: 8,
      glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
      sources: {
        'satellite': { type: 'raster', tiles: ['https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}'], tileSize: 256 }
      },
      layers: [{ id: 'satellite', type: 'raster', source: 'satellite', minzoom: 0, maxzoom: 22 }]
    };
    map.setStyle(satelliteLayer);
  } else {
    map.setStyle(basemap.style);
  }
}

const ShowTile = () => {
  const sourceId = 'local-tile';
  if (map.getSource(sourceId)) {
    const layerId = 'local-tile-layer';
    const visible = map.getLayoutProperty(layerId, 'visibility') !== 'none';
    map.setLayoutProperty(layerId, 'visibility', visible ? 'none' : 'visible');
  } else {
    map.addSource(sourceId, { type: 'raster', tiles: ['tile/data/Ax_1340/{z}/{x}/{y}.png'], tileSize: 256 });
    map.addLayer({ id: sourceId + '-layer', type: 'raster', source: sourceId, paint: { 'raster-opacity': 1 } });
  }
  bringDrawingsToFront(map);
};

function getUTMZone(latDeg, lonDeg) {
  const _zone = Math.floor((lonDeg + 180) / 6) + 1;
  const hemisphere = latDeg >= 0 ? "N" : "S";
  return { _zone, hemisphere };
}

function getLocation() {
  if (!navigator.geolocation) { alert("مرورگر شما از قابلیت موقعیت مکانی پشتیبانی نمی‌کند."); return; }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { longitude, latitude, altitude } = position.coords;
      const el = document.createElement('div');
      el.style.width = '16px'; el.style.height = '16px'; el.style.borderRadius = '50%'; el.style.background = '#0066ff'; el.style.border = '2px solid white';
      if (pickMarker.value) pickMarker.value.remove();
      pickMarker.value = new mapboxgl.Marker({ element: el }).setLngLat([longitude, latitude]).addTo(map);
      map.flyTo({ center: [longitude, latitude], zoom: 14, duration: 1500 });
    },
    (error) => {
      switch (error.code) {
        case error.PERMISSION_DENIED: alert("دسترسی به موقعیت مکانی رد شد."); break;
        case error.POSITION_UNAVAILABLE: alert("اطلاعات موقعیت مکانی در دسترس نیست."); break;
        case error.TIMEOUT: alert("زمان درخواست دریافت موقعیت تمام شد."); break;
      }
    }
  );
}

function onMapPointPicked({ lat, lng }) {
  if (!map) return;
  pickedPoint.lat = lat;
  pickedPoint.lng = lng;

  const el = document.createElement('div');
  el.style.width = '24px'; el.style.height = '24px'; el.style.borderRadius = '50%'; el.style.background = '#e8843c'; el.style.border = '3px solid white';
  el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
  if (pickMarker.value) pickMarker.value.remove();
  pickMarker.value = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);

  map.flyTo({ center: [lng, lat], zoom: 16, pitch: 45, duration: 1500 });
  showPickerPanel.value = true;
}

function closePickerPanel() {
  showPickerPanel.value = false;
  if (pickMarker.value) { pickMarker.value.remove(); pickMarker.value = null; }
  pickedPoint.lat = null;
  pickedPoint.lng = null;
}

async function savePickedPoint(data) {
  if (!authStore.user) return;
  try {
    const shape = { type: "point", lon: data.lng, lat: data.lat, color: '#e8843c', show: true };
    const pin = { id: crypto.randomUUID(), name: data.name || 'نقطه', descr: data.description || '', shape, date: new Date(), save: -1, type: 'draw' };
    if (data.file) { pin.filename = data.file.name; pin.file = data.file; }
    Pins.push(pin);
    const formData = new FormData();
    formData.append("type", pin.type);
    formData.append("name", pin.name);
    formData.append("obj_id", pin.id);
    formData.append("parent_id", -1);
    formData.append("content", JSON.stringify(shape));
    if (data.file) formData.append("file", data.file);
    await axios.post(SERVER + '/api/Save/myWork/' + authStore.user.id, formData, { headers: { "Content-Type": "multipart/form-data" } });
  } catch (err) { console.error('خطا در ذخیره نقطه:', err); }
}

function initMap() {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

  const mapDiv = document.createElement('div');
  mapDiv.style.width = '100%';
  mapDiv.style.height = '100%';
  mapContainerRef.value.appendChild(mapDiv);

  map = new mapboxgl.Map({
    container: mapDiv,
    style: {
      version: 8,
      glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
      sources: {
        'satellite': { type: 'raster', tiles: ['https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}'], tileSize: 256 }
      },
      layers: [{ id: 'satellite', type: 'raster', source: 'satellite', minzoom: 0, maxzoom: 22 }]
    },
    center: [51.5, 35.5],
    zoom: 5,
    attributionControl: false
  });

  map.on('mousemove', (e) => {
    const { lng, lat } = e.lngLat;
    Lon.value = lng.toFixed(6);
    Lat.value = lat.toFixed(6);

    const { _zone, hemisphere } = getUTMZone(lat, lng);
    const utmProj = `+proj=utm +zone=${_zone} +datum=WGS84 +units=m +no_defs ${hemisphere === "S" ? "+south" : ""}`;
    const [_easting, _northing] = proj4("WGS84", utmProj, [lng, lat]);
    easting.value = _easting.toFixed(2);
    northing.value = _northing.toFixed(2);
    zone.value = _zone + hemisphere;

    updateScale();
  });

  map.on('zoom', () => { updateScale(); });
  map.on('move', () => { updateScale(); });

  map.on('load', () => {
    mapReady.value = true;
  });
}

function updateScale() {
  if (!map) return;
  const container = map.getContainer();
  const widthInMeters = map.unitsPerPixel ? map.unitsPerPixel * container.clientWidth : null;

  if (widthInMeters) {
    const meterPerPixel = widthInMeters / container.clientWidth;
    const dpiScale = 0.00028;
    const s = (widthInMeters / container.clientWidth) / dpiScale;
    scale.value = "1:" + Math.round(s).toLocaleString();
  } else {
    const zoom = map.getZoom();
    const metersPerPixel = 156543.03392 * Math.cos(map.getCenter().lat * Math.PI / 180) / Math.pow(2, zoom);
    const s = metersPerPixel / 0.00028;
    scale.value = "1:" + Math.round(s).toLocaleString();
  }
}

function toggleLayer(layerName) {
  if (!map) return;
  const sourceId = 'wms-' + layerName;
  if (map.getSource(sourceId)) {
    const layerId = sourceId + '-layer';
    const layer = layersLoaded.find(l => l.name === layerName);
    if (layer) {
      const visible = !layer.active;
      layer.active = visible;
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }
  } else {
    const workspace = 'your_workspace';
    const url = `${GEOSERVER}/geoserver/wms?service=WMS&version=1.1.0&request=GetMap&layers=${workspace}:${layerName}&styles=&bbox=-180,-90,180,90&width=256&height=256&srs=EPSG:4326&format=image/png&transparent=true`;
    map.addSource(sourceId, { type: 'raster', tiles: [url], tileSize: 256 });
    map.addLayer({ id: sourceId + '-layer', type: 'raster', source: sourceId, paint: { 'raster-opacity': 1.0 } });
    layersLoaded.push({ name: layerName, active: true, sourceId });
    layerOpacity[layerName] = 1.0;
  }
  bringDrawingsToFront(map);
}

onMounted(async () => {
  await nextTick();
  initMap();
});

onUnmounted(() => {
  if (map) { map.remove(); map = null; }
});
</script>

<style scoped>
#mapboxContainer {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
#layer-panel {
  right: 1px;
  z-index: 10;
}
</style>
<style>
.mapboxgl-ctrl-group {
  background: #374151 !important;
  border: none !important;
  border-radius: 0.5rem !important;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3) !important;
  overflow: hidden;
}
.mapboxgl-ctrl-group button {
  background: transparent !important;
  border-color: rgba(255,255,255,0.15) !important;
}
.mapboxgl-ctrl-group button + button {
  border-top: 1px solid rgba(255,255,255,0.15) !important;
}
.mapboxgl-ctrl-group button:hover {
  background: rgba(255,255,255,0.1) !important;
}
.mapboxgl-ctrl-group button span.mapboxgl-ctrl-icon {
  filter: invert(1);
}
.mapboxgl-ctrl-top-right {
  top: calc(var(--top, 0px) + 380px) !important;
  left: 4px !important;
  right: auto !important;
}
.mapboxgl-ctrl-bottom-left {
  display: none !important;
}
</style>