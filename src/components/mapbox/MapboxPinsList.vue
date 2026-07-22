<template>
 <div class="flex flex-col min-h-0">
  <div class="flex mb-2">
    <button class="px-2 py-1 text-sm rounded"
        :class="activeTab === 'my2' ? 'bg-blue-500 text-white' : 'bg-white border'"
        @click="activeTab = 'my2'">میز کار</button>
    <button class="relative px-2 py-1 text-sm rounded"
        :class="activeTab === 'in' ? 'bg-blue-500 text-white' : 'bg-white border'"
        @click="activeTab = 'in'">
      فضای اشتراکی
      <span v-if="unreadCount > 0" class="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full px-1 min-w-[16px] text-center">{{ unreadCount }}</span>
    </button>
    <button class="px-2 py-1 text-sm rounded"
        :class="activeTab === 'out' ? 'bg-blue-500 text-white' : 'bg-white border'"
        @click="activeTab = 'out'">تاریخچه</button>
  </div>

  <div v-if="activeTab === 'my2'" class="text-xs flex flex-col h-full min-h-0">
    <div class="flex items-center justify-between mt-0 mb-2">
      <div class="flex gap-1 text-sm">
        <button class="text-gray-500 w-8 py-1 rounded" @click="exportDialog = true" title="خروجی kml">
          <i class="fas fa-file-export"></i>
        </button>
        <label class="text-gray-500 w-8 py-1 rounded px-0 text-center cursor-pointer" title="باز کردن kml">
          <i class="fas fa-folder-open"></i>
          <input type="file" class="hidden" @change="handleFileUpload" accept=".kml,.kmz,.csv,.txt"/>
        </label>
        <button class="text-gray-500 w-8 py-1 rounded" @click="createFolderDialog = true" title="ایجاد گروه">
          <i class="fas fa-folder-plus"></i>
        </button>
        <button class="text-gray-500 w-8 py-1 rounded" @click="ArchiveDesktop" title="بایگانی میز کار">
          <i class="fas fa-file"></i>
        </button>
      </div>
    </div>
    <div class="overflow-y-auto">
      <MapboxLayerTree :items="props.pins" :map="map" :depth="0" :selectedGroup="selectedGroup" :selectGroup="selectGroup" :Icons="['send']"/>
    </div>
  </div>

  <div v-if="activeTab === 'in'" class="text-xs flex flex-col h-full min-h-0">
    <div class="flex gap-1 mb-2">
      <button class="px-2 py-0.5 text-xs rounded"
          :class="sharedSubTab === 'files' ? 'bg-orange-500 text-white' : 'bg-white border'"
          @click="sharedSubTab = 'files'">فایل‌ها (پوشه ورودی)</button>
      <button class="px-2 py-0.5 text-xs rounded"
          :class="sharedSubTab === 'groups' ? 'bg-orange-500 text-white' : 'bg-white border'"
          @click="sharedSubTab = 'groups'">گروه‌ها</button>
    </div>
    <div v-if="sharedSubTab === 'files'">
      <div class="overflow-y-auto">
        <ul class="space-y-1">
          <li v-for="(file, index) in inboxFiles" :key="index"
              class="flex items-center justify-between bg-white px-2 border rounded">
            <div class="flex items-center gap-1 cursor-pointer" @click="drawInbox(index)">
              <i :class="file.opened ? 'fas fa-envelope-open text-gray-400' : 'fas fa-envelope text-blue-500'"></i>
              <span class="text-sm truncate">{{ getTitle(file) }}</span>
            </div>
          </li>
          <li v-if="!inboxFiles.length" class="text-center text-gray-400 py-4">پوشه ورودی خالی است</li>
        </ul>
      </div>
    </div>
    <div v-else-if="sharedSubTab === 'groups'" class="flex flex-col h-full min-h-0">
      <div class="overflow-y-auto">
        <ul class="space-y-1">
          <li v-for="(group, index) in userGroups" :key="index"
              class="flex items-center justify-between bg-white px-2 py-1 border rounded">
            <div class="flex items-center gap-2">
              <i class="fas fa-users text-gray-600"></i>
              <span class="text-sm truncate w-48">{{ group.name }}</span>
            </div>
            <span class="text-xs text-gray-500">{{ group.member_count ?? 0 }} عضو</span>
          </li>
          <li v-if="!userGroups.length" class="text-center text-gray-400 py-4">شما در هیچ گروهی عضو نیستید</li>
        </ul>
      </div>
    </div>
  </div>

  <div v-if="activeTab === 'out'" class="text-xs flex flex-col h-full min-h-0">
    <div class="overflow-y-auto">
      <MapboxLayerTree :items="History" :map="map" :depth="0" :selectedGroup="selectedGroup" :selectGroup="selectGroup" :Icons="['back']"/>
    </div>
  </div>

  <ExportDialog v-model="exportDialog" @confirm="Export"/>
  <SaveDialog v-model="createFolderDialog" @confirm="createFolder"/>
  <SendDialog :show="OpenSend" @submit="send" @cancel="OpenSend = false"/>
  <MapboxLoadCSV ref="csvRef" :rows="csvRows" :map="map" :pins="props.pins"/>
  <Loading :active="loading"/>
 </div>
</template>

<script setup>
import { ref, toRaw, onMounted, onUnmounted, watch, provide, inject } from "vue";
import { useRoute } from 'vue-router';
import axios from "axios";
import moment from 'moment-jalaali';
import Papa from 'papaparse';
import { useAuthStore } from '../../stores/auth';
import SaveDialog from '../SaveDialog.vue';
import ExportDialog from '../ExportDialog.vue';
import SendDialog from '../SendDialog.vue';
import Loading from '../Loading.vue';
import MapboxLayerTree from "./MapboxLayerTree.vue";
import MapboxLoadCSV from "./MapboxLoadCSV.vue";
import { useToast } from "vue-toast-notification";
import { useSharedArray } from '../../stores/app';

const { getExtendedIds, getVisibleIds, isExtended, isVisible, setExtendedIds, setVisibleIds, extendedIds, visibleIds } = useSharedArray();
const SERVER = import.meta.env.VITE_SERVER;
const authStore = useAuthStore();
const $toast = useToast();

const csvRef = ref(null);
const exportDialog = ref(false);
const createFolderDialog = ref(false);
const OpenSend = ref(false);
const loading = ref(false);
const activeTab = ref("my2");
const sharedSubTab = ref("files");
const inboxFiles = ref([]);
const userGroups = ref([]);
const users = ref([]);
const unreadCount = ref(0);
const csvRows = ref([]);
const History = ref([]);
const myWorks = ref([]);
const selectedGroup = ref(null);
const SelectGroup = inject('SelectGroup', null);
let intervalId = null;
const index_pin_id = ref(-1);

const emit = defineEmits(["update:openDia", "clearPins", "close"]);
const props = defineProps({
  pins: { type: Object, required: true },
  map: { type: Object, required: true },
  openId: { type: Object, required: true },
  openDia: Function,
  close: { type: Boolean, default: false },
});

function selectGroup(group) { selectedGroup.value = group; }

onMounted(async () => {
  if (authStore.user) {
    await getExtendedIds();
    await getVisibleIds();
    await loadWorks();
    await loadInbox();
    await loadUserGroups();
    if (authStore.isAdmin || authStore.isGroupManager) await load_Users();
    intervalId = setInterval(loadInbox, 20000);
    for (let pin of props.pins) pin.check = false;
  }
  const route = useRoute();
  if (!authStore.user && route.params.token) {
    await getData(route.params.token);
  }
});

onUnmounted(() => clearInterval(intervalId));

watch(() => authStore.isLogin, async (isLogin) => {
  if (isLogin && authStore.user) {
    await loadWorks();
    await loadInbox();
    for (let pin of props.pins) pin.check = false;
  }
});

const getTitle = (file) => {
  let user = users.value.find(a => a.id == file.sender_id);
  return (file.MyWork?.name ?? '') + ' (' + (user?.name ?? user?.username ?? '') + ')';
};

const loadUserGroups = async () => {
  if (!authStore.user) return;
  try {
    const res = await axios.get(SERVER + "/api/auth/me");
    const me = res.data?.data ?? res.data;
    const groups = me?.Groups ?? me?.groups ?? [];
    const rawGroups = Array.isArray(groups) ? groups : [];
    userGroups.value = await Promise.all(rawGroups.map(async (g) => {
      if (g.member_count != null) return g;
      try {
        const r = await axios.get(SERVER + `/api/groups/${g.id}/users/`);
        const u = r.data?.data ?? r.data;
        return { ...g, member_count: Array.isArray(u) ? u.length : 0 };
      } catch { return { ...g, member_count: 0 }; }
    }));
  } catch { userGroups.value = []; }
};

const load_Users = async () => {
  try {
    const response = await axios.get(SERVER + '/api/users');
    users.value = response.data;
  } catch (error) { console.log('Error loading users:', error); }
};

const loadInbox = async () => {
  if (!authStore.user) return;
  inboxFiles.value = [];
  try {
    const response = await axios.get(SERVER + '/api/inbox/' + authStore.user?.id);
    inboxFiles.value = response.data;
    unreadCount.value = inboxFiles.value.filter(a => !a.opened).length;
  } catch (error) { console.error('Error loading inbox:', error); }
};

const drawInbox = async (idx) => {
  const pin = inboxFiles.value[idx].MyWork;
  try {
    await axios.post(SERVER + "/api/inbox/opened", { id: inboxFiles.value[idx].id });
    inboxFiles.value[idx].opened = true;
    unreadCount.value--;
  } catch (err) { console.error("Failed to sync opened state", err); }

  if (pin.show != undefined) { pin.entity.show = !pin.entity.show; return; }
  if (pin.type == 'draw') {
    pin.shape = JSON.parse(pin.content);
    drawShape(pin, 'inbox');
  } else if (pin.name) {
    await drawKML(pin, 'inbox');
  }
  pin.show = true;
};

const loadWorks = async () => {
  if (!authStore.user) return;
  emit('clearPins');
  myWorks.value = [];
  loading.value = true;
  try {
    const res = await axios.get(SERVER + '/api/load/myWork/' + authStore.user?.id);
    for (let i of res.data) {
      let pin = {
        id: i.obj_id, name: i.name,
        shape: i.type == 'draw' ? JSON.parse(i.content) : { show: true },
        content: i.type == 'file' ? i.content : '',
        date: i.createdAt, type: i.type, save: i.id, parent_id: i.parent_id, archive: i.archive
      };
      pin.shape.show = isVisible(i.obj_id);
      myWorks.value.push(pin);
    }
    let tmp = groupBy(myWorks.value);
    let tmp2 = tmp.filter(a => a.archive !== null);
    History.value = groupByCreatedAtDay(tmp2);
    tmp = tmp.filter(a => a.archive == null);
    props.pins.push(...tmp);
    await drawPins();
  } catch (err) { console.error('خطا در دریافت pins از سرور', err); }
  finally { loading.value = false; }
};

function groupByCreatedAtDay(items) {
  const map = new Map();
  for (const item of items) {
    const dayKey = new Date(item.date).toISOString().slice(0, 10);
    if (!map.has(dayKey)) map.set(dayKey, { id: dayKey, name: moment(dayKey).format('jYYYY/jMM/jDD'), type: "group", history: true, expanded: false, children: [] });
    const group = map.get(dayKey);
    if (item.type == 'group') {
      const chd = [];
      for (const row of item.children) { row.shape.show = false; chd.push({ id: row.id, name: row?.name ?? "بدون نام", type: row.type, save: row.save, shape: row.shape, content: row.content, dataSource: row, obj_id: row?.obj_id, bounding: row.bounding }); }
      group.children.push({ id: item.id, name: item?.name ?? "بدون نام", type: item.type, save: item.save, children: chd });
    } else {
      isVisible(item.id) ? item.shape.show = true : item.shape.show = false;
      item.shape.show = false;
      group.children.push({ id: item.id, name: item?.name ?? "بدون نام", type: item.type, save: item.save, shape: item.shape, content: item.content, dataSource: item, obj_id: item?.obj_id, bounding: item.bounding });
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.name < b.name ? 1 : -1));
}

function groupBy(items) {
  const map = {};
  const tree = [];
  items.forEach(item => { item.expanded = true; map[item.save] = { ...item, children: [] }; });
  items.forEach(item => {
    if (item.parent_id !== null && item.parent_id > -1) { if (map[item.parent_id]) map[item.parent_id].children.push(map[item.save]); }
    else { tree.push(map[item.save]); }
  });
  return tree;
}

const saveOneWorks = async (item) => {
  if (!authStore.user) return;
  try {
    const fd = new FormData();
    fd.append("type", item.type);
    fd.append("name", item.name);
    fd.append("obj_id", item.id);
    if (item.type === 'file') fd.append("file", item.file);
    else fd.append("content", JSON.stringify(toRaw(item.shape)));
    await axios.post(SERVER + '/api/Save/myWork/' + authStore.user.id, fd, { headers: { "Content-Type": "multipart/form-data" } });
  } catch (err) { console.error(err); }
};

function drawShape(pin, dataSourceName = 'draw', visible = false) {
  const shape = pin.shape;
  if (!shape || !shape.type) return;

  const map = props.map;
  const sourceId = 'draw-pin-' + pin.id;

  if (shape.type === 'polyline') {
    const coords = shape.positions.map(p => [p.lon, p.lat]);
    if (!map.getSource(sourceId)) map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: sourceId + '-line', type: 'line', source: sourceId, paint: { 'line-color': shape.color || '#ff0000', 'line-width': shape.width || 3 }, layout: { visibility: visible ? 'visible' : (shape.show ? 'visible' : 'none') } });
    map.getSource(sourceId).setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: { name: pin.name, description: shape.description || '' } }] });
    pin.shape._sourceIds = [sourceId];
  }

  else if (shape.type === 'polygon') {
    const coords = shape.positions.map(p => [p.lon, p.lat]);
    if (!map.getSource(sourceId)) map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: sourceId + '-fill', type: 'fill', source: sourceId, paint: { 'fill-color': shape.color || '#ff0000', 'fill-opacity': 0.5 }, layout: { visibility: visible ? 'visible' : (shape.show ? 'visible' : 'none') } });
    map.addLayer({ id: sourceId + '-line', type: 'line', source: sourceId, paint: { 'line-color': shape.outlineColor || shape.color || '#ff0000', 'line-width': shape.outlineWidth || 2 }, layout: { visibility: visible ? 'visible' : (shape.show ? 'visible' : 'none') } });
    map.getSource(sourceId).setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: { name: pin.name, description: shape.description || '' } }] });
    pin.shape._sourceIds = [sourceId];
  }

  else if (shape.type === 'point') {
    if (!map.getSource(sourceId)) map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: sourceId + '-point', type: 'circle', source: sourceId, paint: { 'circle-radius': shape.pixelSize || 8, 'circle-color': shape.color || '#ff0000', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': shape.outlineWidth || 1 }, layout: { visibility: visible ? 'visible' : (shape.show ? 'visible' : 'none') } });
    map.getSource(sourceId).setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [shape.lon, shape.lat] }, properties: { name: pin.name, description: shape.description || '' } }] });
    pin.shape._sourceIds = [sourceId];
  }

  else if (shape.type === 'multi_point') {
    const features = shape.positions.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { color: p.color || shape.color || '#00ff00' }
    }));
    if (!map.getSource(sourceId)) map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features } });
    map.addLayer({ id: sourceId + '-points', type: 'circle', source: sourceId, paint: { 'circle-radius': 5, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } });
    pin.shape._sourceIds = [sourceId];
  }

  else if (shape.type === 'circle') {
    const center = shape.center;
    const r = shape.radius;
    const coords = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * 2 * Math.PI;
      const rLat = center.lat + (r / 110540) * Math.sin(angle);
      const rLng = center.lng + (r / (111319.9 * Math.cos(center.lat * Math.PI / 180))) * Math.cos(angle);
      coords.push([rLng, rLat]);
    }
    coords.push(coords[0]);
    if (!map.getSource(sourceId)) map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: sourceId + '-fill', type: 'fill', source: sourceId, paint: { 'fill-color': shape.fillColor || shape.color || '#0000ff', 'fill-opacity': 0.3 }, layout: { visibility: visible ? 'visible' : (shape.show ? 'visible' : 'none') } });
    map.addLayer({ id: sourceId + '-line', type: 'line', source: sourceId, paint: { 'line-color': shape.outlineColor || '#0000ff', 'line-width': shape.outlineWidth || 2 }, layout: { visibility: visible ? 'visible' : (shape.show ? 'visible' : 'none') } });
    map.getSource(sourceId).setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }] });
    pin.shape._sourceIds = [sourceId];
  }
}

async function drawKML(pin, visible = false) {
  try {
    const url = SERVER + '/uploads/pins/' + pin.content;
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    const geojson = kmlToGeoJSON(doc);

    const sourceId = 'kml-' + pin.id;
    props.map.addSource(sourceId, { type: 'geojson', data: geojson });
    props.map.addLayer({ id: sourceId + '-fill', type: 'fill', source: sourceId, paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.3 }, filter: ['==', '$type', 'Polygon'] });
    props.map.addLayer({ id: sourceId + '-line', type: 'line', source: sourceId, paint: { 'line-color': '#ff0000', 'line-width': 2 }, filter: ['in', '$type', 'LineString', 'Polygon'] });
    props.map.addLayer({ id: sourceId + '-point', type: 'circle', source: sourceId, paint: { 'circle-radius': 6, 'circle-color': '#ff0000' }, filter: ['==', '$type', 'Point'] });

    pin.shape = { show: visible, _sourceIds: [sourceId] };
    pin.shape.show = visible || isVisible(pin.id);
    pin.loaded = true;
  } catch (err) {
    console.error('خطا در خواندن KML:', pin.name, err);
  }
}

function kmlToGeoJSON(doc) {
  const features = [];
  doc.querySelectorAll('Placemark').forEach(pm => {
    const name = pm.querySelector('name')?.textContent || '';
    const description = pm.querySelector('description')?.textContent || '';
    const point = pm.querySelector('Point');
    const lineString = pm.querySelector('LineString');
    const polygon = pm.querySelector('Polygon');
    let geometry = null;

    if (point) {
      const coords = parseKMLCoords(point.querySelector('coordinates'));
      if (coords.length) geometry = { type: 'Point', coordinates: coords[0] };
    } else if (lineString) {
      const coords = parseKMLCoords(lineString.querySelector('coordinates'));
      if (coords.length) geometry = { type: 'LineString', coordinates: coords };
    } else if (polygon) {
      const outer = polygon.querySelector('outerBoundaryIs coordinates');
      const coords = parseKMLCoords(outer);
      if (coords.length) { coords.push(coords[0]); geometry = { type: 'Polygon', coordinates: [coords] }; }
    }

    if (geometry) features.push({ type: 'Feature', properties: { name, description }, geometry });
  });
  return { type: 'FeatureCollection', features };
}

function parseKMLCoords(el) {
  if (!el) return [];
  return el.textContent.trim().split(/\s+/).map(pair => {
    const [lon, lat] = pair.split(',').map(Number);
    return [lon, lat];
  }).filter(c => !isNaN(c[0]) && !isNaN(c[1]));
}

const drawPins = async () => {
  for (const pin of props.pins) {
    if (pin.type == 'group') {
      for (const ch_pin of pin.children) {
        if (ch_pin.type == 'draw') drawShape(ch_pin);
        else if (ch_pin.type == 'file') await drawKML(ch_pin);
      }
    }
    if (pin.type == 'draw') drawShape(pin);
    else if (pin.type == 'file') await drawKML(pin);
  }
};

const drawPin = async (pin, visible = false) => {
  if (pin.type == 'draw') drawShape(pin, 'draw', visible);
  else if (pin.type == 'file') await drawKML(pin, visible);
};

provide('drawPin', drawPin);
provide('Pins', props.pins);

const getData = async (token) => {
  emit('clearPins');
  myWorks.value = [];
  loading.value = true;
  try {
    const result = await axios.post(SERVER + '/api/load/link/', { token });
    const res = result.data;
    if (res.success) {
      const i = res.data;
      let pin = { id: i.obj_id, name: i.name, shape: i.type == 'draw' ? JSON.parse(i.content) : { show: true }, content: i.type == 'file' ? i.content : '', date: i.createdAt, type: i.type, save: i.id, parent_id: i.parent_id, archive: i.archive };
      pin.shape.show = true;
      pin.shared = true;
      props.pins.push(pin);
      await drawPin(pin, true);

      const coords = pin.shape.positions?.map(p => [p.lon, p.lat]);
      if (coords?.length) {
        const bounds = new mapboxgl.LngLatBounds();
        coords.forEach(c => bounds.extend(c));
        props.map.fitBounds(bounds, { padding: 50, duration: 1500 });
      }
    }
  } catch (err) { console.error('خطا در دریافت pins از سرور', err); }
  finally { loading.value = false; }
};

const createFolder = async (name) => {
  try {
    await axios.post(SERVER + '/api/createFolder/' + authStore.user?.id, { type: 'group', name });
  } catch (err) { console.error(err); }
};

const ArchiveDesktop = async () => {
  const confirmed = window.confirm("تمامی آیتم های میز کار به بخش آرشیو منتقل میشوند ، مطمئن هستید ؟");
  if (!confirmed) return;
  let ids = props.pins.map(item => item.save);
  await axios.post(SERVER + '/api/archive', { ids });
  emit('clearPins');
};

const send = async (data) => {
  if (!authStore.user) return;
  let pin = props.pins[index_pin_id.value];
  const form = new FormData();
  form.append("sender_id", authStore.user.id);
  form.append("receiver_id", data.selected);
  form.append("document_id", pin.save);
  form.append("descr", data.description);
  if (pin.save < 0) {
    form.append("name", pin.name);
    form.append("pin", JSON.stringify({ name: pin.name, content: pin.content, type: pin.type, obj_id: pin.id }));
  }
  if (pin.type == 'file' && pin.content == null) form.append("file", pin.file);
  await axios.post(SERVER + '/api/sendTo', form, { headers: { "Content-Type": "multipart/form-data" } });
  OpenSend.value = false;
  showMessage('آیتم مورد نظر ارسال شد', 'success');
};

function showMessage(msg, type) { $toast.open({ message: msg, type, duration: 4000 }); }

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const fileName = file.name.toLowerCase();
  loading.value = true;

  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    Papa.parse(file, { header: true, skipEmptyLines: true, complete(results) { csvRows.value = results.data; }, error(error) { console.error(error); } });
    loading.value = false;
    csvRef.value?.open(fileName);
    return;
  }

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
      props.map.addSource(sourceId, { type: 'geojson', data: geojson });
      props.map.addLayer({ id: sourceId + '-fill', type: 'fill', source: sourceId, paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.3 }, filter: ['==', '$type', 'Polygon'] });
      props.map.addLayer({ id: sourceId + '-line', type: 'line', source: sourceId, paint: { 'line-color': '#ff0000', 'line-width': 2 }, filter: ['in', '$type', 'LineString', 'Polygon'] });
      props.map.addLayer({ id: sourceId + '-point', type: 'circle', source: sourceId, paint: { 'circle-radius': 6, 'circle-color': '#ff0000' }, filter: ['==', '$type', 'Point'] });

      const bounds = new mapboxgl.LngLatBounds();
      const addCoords = (coords) => { if (typeof coords[0] === 'number') bounds.extend(coords); else coords.forEach(addCoords); };
      geojson.features.forEach(f => addCoords(f.geometry.coordinates));
      if (!bounds.isEmpty()) props.map.fitBounds(bounds, { padding: 50, duration: 2000 });

      loading.value = false;
      let pin = { id: crypto.randomUUID(), name: fileName, shape: { show: true, _sourceIds: [sourceId] }, date: new Date(), save: -1, type: 'file', file };
      if (SelectGroup.value !== null) { pin.parent_id = props.pins[SelectGroup.value].save ?? -1; props.pins[SelectGroup.value].children.push(pin); }
      else { pin.parent_id = -1; props.pins.push(pin); }
      await saveOneWorks(pin);
    } catch (error) { console.error("خطا در بارگذاری فایل:", error); loading.value = false; }
  } else if (fileName.endsWith(".zip")) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const shp = (await import('shpjs')).default;
        const geojson = await shp(e.target.result);
        const sourceId = 'shp-' + crypto.randomUUID();
        props.map.addSource(sourceId, { type: 'geojson', data: geojson });
        props.map.addLayer({ id: sourceId + '-fill', type: 'fill', source: sourceId, paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.3 }, filter: ['==', '$type', 'Polygon'] });
        props.map.addLayer({ id: sourceId + '-line', type: 'line', source: sourceId, paint: { 'line-color': '#ff0000', 'line-width': 2 }, filter: ['in', '$type', 'LineString', 'Polygon'] });
        props.map.addLayer({ id: sourceId + '-point', type: 'circle', source: sourceId, paint: { 'circle-radius': 6, 'circle-color': '#ff0000' }, filter: ['==', '$type', 'Point'] });

        const bounds = new mapboxgl.LngLatBounds();
        const addCoords = (coords) => { if (typeof coords[0] === 'number') bounds.extend(coords); else coords.forEach(addCoords); };
        geojson.features.forEach(f => addCoords(f.geometry.coordinates));
        if (!bounds.isEmpty()) props.map.fitBounds(bounds, { padding: 50, duration: 2000 });

        loading.value = false;
        let pin = { id: crypto.randomUUID(), name: fileName, shape: { show: true, _sourceIds: [sourceId] }, date: new Date(), save: -1, type: 'file' };
        if (SelectGroup.value !== null) { pin.parent_id = props.pins[SelectGroup.value].save ?? -1; props.pins[SelectGroup.value].children.push(pin); }
        else { pin.parent_id = -1; props.pins.push(pin); }
        await saveOneWorks(pin);
      } catch (error) { console.error("خطا در بارگذاری Shapefile:", error); loading.value = false; }
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert("فقط فایل‌های KML/KMZ و SHP (ZIP) و CSV پشتیبانی می‌شوند.");
    loading.value = false;
  }
};

function Export(filename, exportType) {
  if (exportType == 'csv') {
    let csvContent = '';
    props.pins.forEach((pin) => {
      if (!pin.shape?.positions || !Array.isArray(pin.shape.positions) || !pin.shape.show || pin.type !== 'draw') return;
      csvContent += pin.name + '\n' + 'polygon :\n' + 'lat,lon\n';
      pin.shape.positions.forEach(pos => { csvContent += `${pos.lat},${pos.lon}\n`; });
      csvContent += '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  } else {
    let kml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n';
    props.pins.forEach(pin => {
      if (!pin.shape?.show) return;
      if (pin.type !== 'draw') return;
      const name = (pin.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (pin.shape.type === 'polyline') {
        const coords = pin.shape.positions.map(p => `${p.lon},${p.lat},0`).join(' ');
        kml += `  <Placemark><name>${name}</name><LineString><coordinates>${coords}</coordinates></LineString></Placemark>\n`;
      } else if (pin.shape.type === 'polygon') {
        const coords = pin.shape.positions.map(p => `${p.lon},${p.lat},0`).join(' ');
        kml += `  <Placemark><name>${name}</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>\n`;
      } else if (pin.shape.type === 'point') {
        kml += `  <Placemark><name>${name}</name><Point><coordinates>${pin.shape.lon},${pin.shape.lat},0</coordinates></Point></Placemark>\n`;
      }
    });
    kml += '</Document>\n</kml>';
    const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename + ".kml"; a.click();
  }
}

defineExpose({ fetchPins: loadWorks });
</script>

<style scoped>
.rev { transform: scaleX(-1); }
</style>
