<template>
  <div>
    <div v-if="dialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">انتخاب ستون‌ها</h2>
          <button @click="dialog = false" class="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 text-sm font-medium">Latitude</label>
            <select v-model="mapping.lat" class="w-full border rounded px-3 py-2">
              <option v-for="col in columns" :key="col" :value="col">{{ col }}</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 text-sm font-medium">Longitude</label>
            <select v-model="mapping.lng" class="w-full border rounded px-3 py-2">
              <option v-for="col in columns" :key="col" :value="col">{{ col }}</option>
            </select>
          </div>
        </div>

        <span class="block mt-8 text-sm">
          <input type="checkbox" v-model="validate" class="ml-2 accent-green-600"/>
          اعتبار سنجی نقاط از دستگاه GPS
        </span>
        <hr/>
        <div v-if="validate" class="grid grid-cols-2 gap-4 mt-8">
          <div>
            <label class="block mb-1 text-sm font-medium">HRMS</label>
            <select v-model="mapping.hrms" class="w-full border rounded px-3 py-2">
              <option value="">انتخاب نشود</option>
              <option v-for="col in columns" :key="col" :value="col">{{ col }}</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 text-sm font-medium">VRMS</label>
            <select v-model="mapping.vrms" class="w-full border rounded px-3 py-2">
              <option value="">انتخاب نشود</option>
              <option v-for="col in columns" :key="col" :value="col">{{ col }}</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 text-sm font-medium">PDOP</label>
            <select v-model="mapping.pdop" class="w-full border rounded px-3 py-2">
              <option value="">انتخاب نشود</option>
              <option v-for="col in columns" :key="col" :value="col">{{ col }}</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 text-sm font-medium">Age</label>
            <select v-model="mapping.age" class="w-full border rounded px-3 py-2">
              <option value="">انتخاب نشود</option>
              <option v-for="col in columns" :key="col" :value="col">{{ col }}</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 text-sm font-medium">STAT</label>
            <select v-model="mapping.stat" class="w-full border rounded px-3 py-2">
              <option value="">انتخاب نشود</option>
              <option v-for="col in columns" :key="col" :value="col">{{ col }}</option>
            </select>
          </div>
          <div class="block w-full h-3 bg-gray-200 rounded-full overflow-hidden" style="margin-top: 50px">
            <div class="h-full bg-blue-600" :style="{ width: `${progress}%` }"/>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button @click="dialog = false" class="px-4 py-2 border rounded">انصراف</button>
          <button @click="renderPoints" class="btn btn-primary">تایید</button>
        </div>
      </div>
    </div>
  </div>
  <MultiPointsList v-if="showPoint" :pointList="pointList" @close="showPoint = false"/>
  <Loading :active="loading"/>
</template>

<script setup>
import { ref, reactive, computed, watch, inject, onMounted } from 'vue';
import Loading from '../Loading.vue';
import MultiPointsList from '../MultiPointsList.vue';
import proj4 from "proj4";

const props = defineProps({
  rows: { type: Array, required: true },
  pins: { type: Object, required: true },
  map: { type: Object, required: true }
});

const dialog = ref(false);
const invalidRows = ref([]);
const pinName = ref('');
const loading = ref(false);
const validate = ref(false);
const progress = ref(0);
const pointList = ref([]);
const showPoint = ref(false);

const SelectGroup = inject('SelectGroup', null);

const mapping = reactive({
  lat: '', lng: '',
  hrms: '', vrms: '', pdop: '', age: '', stat: ''
});

const columns = computed(() => {
  if (!props.rows.length) return [];
  return Object.keys(props.rows[0]);
});

onMounted(() => autoDetectFields());

watch(() => props.rows, () => autoDetectFields(), { immediate: true });

function open(filename) {
  dialog.value = true;
  pinName.value = filename;
}

function autoDetectFields() {
  const findField = aliases => columns.value.find(col => aliases.includes(col.toLowerCase())) || '';
  mapping.lat = findField(['lat', 'latitude']);
  mapping.lng = findField(['lng', 'lon', 'longitude']);
  mapping.hrms = findField(['hrms']);
  mapping.vrms = findField(['vrms']);
  mapping.pdop = findField(['pdop']);
  mapping.age = findField(['age']);
  mapping.stat = findField(['stat']);
}

function validateRow(row) {
  const errors = [];
  const lat = Number(row[mapping.lat]);
  const lng = Number(row[mapping.lng]);
  if (isNaN(lat) || lat < -90 || lat > 90) errors.push('Latitude');
  if (isNaN(lng) || lng < -180 || lng > 180) errors.push('Longitude');
  return { valid: errors.length === 0, errors };
}

function fakeProgress(duration = 3000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const timer = setInterval(() => {
      progress.value = Math.min(Math.floor(((Date.now() - start) / duration) * 100), 100);
      if (progress.value === 100) { clearInterval(timer); resolve(); }
    }, 16);
  });
}

async function renderPoints() {
  if (validate.value) await fakeProgress();
  dialog.value = false;
  invalidRows.value = [];

  const sourceId = 'csv-' + crypto.randomUUID();
  const features = [];

  props.rows.forEach((row, index) => {
    let result = { valid: true };
    if (validate.value) {
      result = validateRow(row);
      if (!result.valid) invalidRows.value.push({ rowIndex: index + 1, errors: result.errors });
    }

    const lat = Number(row[mapping.lat]);
    const lng = Number(row[mapping.lng]);
    if (isNaN(lat) || isNaN(lng)) return;

    const zone = Math.floor((lng + 180) / 6) + 1;
    const [x, y] = proj4("EPSG:4326", `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`, [lng, lat]);

    pointList.value.push({
      id: crypto.randomUUID(),
      row: pointList.value.length + 1,
      x: Number(x).toFixed(3),
      y: Number(y).toFixed(3),
      valid: result.valid
    });

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { valid: result.valid }
    });
  });

  props.map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features } });
  props.map.addLayer({
    id: sourceId + '-points',
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': 6,
      'circle-color': ['case', ['get', 'valid'], '#00ff00', '#ff0000'],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1
    }
  });

  if (features.length > 0) {
    const bounds = new mapboxgl.LngLatBounds();
    features.forEach(f => bounds.extend(f.geometry.coordinates));
    props.map.fitBounds(bounds, { padding: 50, duration: 1500 });
  }

  const positions = features.map(f => ({
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    color: f.properties.valid ? '#00ff00' : '#ff0000'
  }));

  let pin = {
    id: sourceId,
    name: pinName.value,
    shape: { type: 'multi_point', positions, width: 5, color: '#00ff00', show: true, _sourceIds: [sourceId] },
    date: new Date(),
    save: -1,
    type: 'draw'
  };

  if (SelectGroup.value !== null) {
    pin.parent_id = props.pins[SelectGroup.value].save ?? -1;
    props.pins[SelectGroup.value].children.push(pin);
  } else {
    pin.parent_id = -1;
    props.pins.push(pin);
  }
}

const summary = computed(() => ({
  total: props.rows.length,
  valid: props.rows.length - invalidRows.value.length,
  invalid: invalidRows.value.length
}));

defineExpose({ open });
</script>
