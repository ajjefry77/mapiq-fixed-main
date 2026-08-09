<template>
  <div class="flex flex-col min-h-0">
    <div class="flex gap-1 mb-2">
      <button
        class="px-2 py-1 text-sm rounded transition-all duration-200 ease-out cursor-pointer"
        :class="
          activeTab === 'my2'
            ? 'bg-accent text-white hover:bg-accent/90 shadow-sm'
            : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        "
        @click="activeTab = 'my2'"
      >
        میز کار
      </button>
      <button
        v-if="authStore.user"
        class="relative px-2 py-1 text-sm rounded transition-all duration-200 ease-out cursor-pointer"
        :class="
          activeTab === 'in'
            ? 'bg-accent text-white hover:bg-accent/90 shadow-sm'
            : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        "
        @click="activeTab = 'in'"
      >
        فضای اشتراکی
        <span
          v-if="unreadCount > 0"
          class="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full px-1 min-w-[16px] text-center animate-pulse"
          >{{ unreadCount }}</span
        >
      </button>
      <button
        v-if="authStore.user"
        class="px-2 py-1 text-sm rounded transition-all duration-200 ease-out cursor-pointer"
        :class="
          activeTab === 'out'
            ? 'bg-accent text-white hover:bg-accent/90 shadow-sm'
            : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        "
        @click="activeTab = 'out'"
      >
        تاریخچه
      </button>
    </div>

    <div
      v-if="activeTab === 'my2'"
      class="text-xs flex flex-col h-full min-h-0"
    >
      <div class="flex items-center justify-between mt-0 mb-2">
        <div class="flex gap-1 text-sm">
          <button
            class="text-gray-500 w-8 py-1 rounded transition-all duration-200 ease-out hover:bg-gray-100 hover:text-gray-800 hover:scale-110 cursor-pointer"
            @click="exportDialog = true"
            title="خروجی kml"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1.2em"
              height="1.2em"
              viewBox="0 0 20 20"
            >
              <path d="M0 0h20v20H0z" fill="none" />
              <path
                fill="currentColor"
                d="M15 15H2V6h2.595s.689-.896 2.17-2H1a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-3.746l-2 1.645zm-1.639-6.95v3.551L20 6.4l-6.639-4.999v3.131C5.3 4.532 5.3 12.5 5.3 12.5c2.282-3.748 3.686-4.45 8.061-4.45"
              />
            </svg>
          </button>
          <label
            class="text-gray-500 w-8 py-1 rounded px-0 text-center cursor-pointer transition-all duration-200 ease-out hover:bg-gray-100 hover:text-gray-800 hover:scale-110"
            title="باز کردن KML / CSV / DXF / DWG / Shapefile"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1.5em"
              height="1.5em"
              viewBox="0 0 512 512"
            >
              <path d="M0 0h512v512H0z" fill="none" />
              <path
                fill="currentColor"
                fill-rule="evenodd"
                d="M448 85.333V448H64V170.666h42.667v234.667h298.667V128H320V85.333zm-277.333 0c57.36 0 104.145 45.276 106.568 102.04l.099 4.627l-.001 76.485l48.916-48.904l30.17 30.17L256 350.17L155.582 249.75l30.17-30.17l48.915 48.904V192c0-34.084-26.644-61.945-60.24-63.892l-3.76-.108h-128V85.333z"
              />
            </svg>
            <input
              type="file"
              class="hidden"
              @change="handleFileUpload"
              accept=".kml,.kmz,.csv,.txt,.dxf,.dwg,.zip"
            />
          </label>
          <button
            class="text-gray-500 w-8 py-1 rounded transition-all duration-200 ease-out hover:bg-gray-100 hover:text-gray-800 hover:scale-110 cursor-pointer"
            @click="createFolderDialog = true"
            title="ایجاد گروه"
          >
            <i class="fas fa-folder-tree"></i>
          </button>
          <button
            class="text-gray-500 w-8 py-1 rounded transition-all duration-200 ease-out hover:bg-gray-100 hover:text-gray-800 hover:scale-110 cursor-pointer"
            @click="ArchiveDesktop"
            title="بایگانی میز کار"
          >
            <i class="fas fa-clock-rotate-left"></i>
          </button>
        </div>
      </div>
      <div class="overflow-y-auto">
        <MapboxLayerTree
          :items="props.pins"
          :map="map"
          :depth="0"
          :selectedGroup="selectedGroup"
          :selectGroup="selectGroup"
          :Icons="['send']"
        />
      </div>
    </div>

    <div
      v-if="activeTab === 'in' && authStore.user"
      class="text-xs flex flex-col h-full min-h-0"
    >
      <div class="flex gap-1 mb-2">
        <button
          class="px-2 py-0.5 text-xs rounded transition-all duration-200 ease-out cursor-pointer"
          :class="
            sharedSubTab === 'files'
              ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          "
          @click="sharedSubTab = 'files'"
        >
          فایل‌ها (پوشه ورودی)
        </button>
        <button
          class="px-2 py-0.5 text-xs rounded transition-all duration-200 ease-out cursor-pointer"
          :class="
            sharedSubTab === 'groups'
              ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          "
          @click="sharedSubTab = 'groups'"
        >
          گروه‌ها
        </button>
      </div>
      <div v-if="sharedSubTab === 'files'">
        <div class="overflow-y-auto">
          <ul class="space-y-1">
            <li
              v-for="(file, index) in inboxFiles"
              :key="index"
              class="flex items-center justify-between bg-white px-2 rounded transition-all duration-150 ease-out hover:bg-gray-50 hover:shadow-sm group"
            >
              <div
                class="flex items-center gap-1 cursor-pointer flex-1 min-w-0"
                @click="drawInbox(index)"
              >
                <i
                  :class="
                    file.opened
                      ? 'fas fa-envelope-open text-gray-400'
                      : 'fas fa-envelope text-accent'
                  "
                  class="transition-transform duration-200 group-hover:scale-110"
                ></i>
                <span class="text-sm truncate">{{ getTitle(file) }}</span>
              </div>
              <div class="flex items-center gap-1">
                <button
                  @click.stop="addInboxToDesktop(index)"
                  class="text-accent px-1 rounded transition-all duration-200 ease-out hover:bg-accent hover:text-white hover:scale-110 cursor-pointer opacity-70 group-hover:opacity-100"
                  title="افزودن به میز کار"
                >
                  <i class="fas fa-plus text-sm"></i>
                </button>
              </div>
            </li>
            <li
              v-if="!inboxFiles.length"
              class="text-center text-gray-400 py-4"
            >
              پوشه ورودی خالی است
            </li>
          </ul>
        </div>
      </div>
      <div
        v-else-if="sharedSubTab === 'groups'"
        class="flex flex-col h-full min-h-0"
      >
        <div class="overflow-y-auto">
          <ul class="space-y-1">
            <li
              v-for="(group, index) in userGroups"
              :key="index"
              class="flex items-center justify-between bg-white px-2 py-1 rounded transition-all duration-150 ease-out hover:bg-gray-50 hover:shadow-sm cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <i class="fas fa-users text-gray-600 transition-colors duration-200 group-hover:text-accent"></i>
                <span class="text-sm truncate w-48">{{ group.name }}</span>
              </div>
              <span v-if="authStore.isAdmin" class="text-xs text-gray-500"
                >{{ group.member_count ?? 0 }} عضو</span
              >
            </li>
            <li
              v-if="!userGroups.length"
              class="text-center text-gray-400 py-4"
            >
              شما در هیچ گروهی عضو نیستید
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div
      v-if="activeTab === 'out' && authStore.user"
      class="text-xs flex flex-col h-full min-h-0"
    >
      <div class="overflow-y-auto">
        <MapboxLayerTree
          :items="History"
          :map="map"
          :depth="0"
          :selectedGroup="selectedGroup"
          :selectGroup="selectGroup"
          :Icons="['back']"
        />
      </div>
    </div>

    <ExportDialog v-model="exportDialog" @confirm="Export" />
    <SaveDialog v-model="createFolderDialog" @confirm="createFolder" />
    <SendDialog :show="OpenSend" @submit="send" @cancel="OpenSend = false" />
    <MapboxLoadCSV ref="csvRef" :rows="csvRows" :map="map" :pins="props.pins" />
    <MapboxImportPointsDialog
      ref="importCsvRef"
      :map="map"
      :pins="props.pins"
      @imported="onCsvImported"
    />
    <Loading :active="loading" />
  </div>
</template>

<script setup>
import {
  ref,
  toRaw,
  onMounted,
  onUnmounted,
  watch,
  provide,
  inject,
} from "vue";
import { useRoute } from "vue-router";
import axios from "axios";
import mapboxgl from "mapbox-gl";
import moment from "moment-jalaali";
import Papa from "papaparse";
import { useAuthStore } from "../../stores/auth";
import SaveDialog from "../SaveDialog.vue";
import ExportDialog from "../ExportDialog.vue";
import SendDialog from "../SendDialog.vue";
import MapboxImportPointsDialog from "./MapboxImportPointsDialog.vue";
import Loading from "../Loading.vue";
import MapboxLayerTree from "./MapboxLayerTree.vue";
import MapboxLoadCSV from "./MapboxLoadCSV.vue";
import { useToast } from "vue-toast-notification";
import { useSharedArray } from "../../stores/app";
import {
  registerLayersForSource,
  bringDrawingsToFront,
} from "../../utils/layerOrder";
import { dxfToGeoJSON } from "../../utils/dxfToGeoJSON";

const {
  getExtendedIds,
  getVisibleIds,
  isExtended,
  isVisible,
  setExtendedIds,
  setVisibleIds,
  extendedIds,
  visibleIds,
} = useSharedArray();
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
const SelectGroup = inject("SelectGroup", null);
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

function selectGroup(group) {
  selectedGroup.value = group;
}

const route = useRoute();

onMounted(async () => {
  if (props.map) {
    props.map.on("style.load", onBaseStyleReloaded);
  }
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
  if (!authStore.user && route.params.token) {
    await getData(route.params.token);
  }
});

onUnmounted(() => {
  clearInterval(intervalId);
  if (props.map) props.map.off("style.load", onBaseStyleReloaded);
});

let redrawScheduled = false;
async function onBaseStyleReloaded() {
  if (redrawScheduled) return;
  redrawScheduled = true;
  try {
    await drawPins();
    bringDrawingsToFront(props.map);
  } finally {
    redrawScheduled = false;
  }
}

watch(
  () => authStore.user,
  async (newUser) => {
    if (newUser) {
      await loadWorks();
      await loadInbox();
      for (let pin of props.pins) pin.check = false;
    } else {
      activeTab.value = "my2";
    }
  },
);

const getTitle = (file) => {
  let user = users.value.find((a) => a.id == file.sender_id);
  return (
    (file.MyWork?.name ?? "") +
    " (" +
    (user?.name ?? user?.username ?? "") +
    ")"
  );
};

const loadUserGroups = async () => {
  if (!authStore.user) return;
  try {
    const res = await axios.get(SERVER + "/api/auth/me");
    const me = res.data?.data ?? res.data;
    const groups = me?.Groups ?? me?.groups ?? [];
    const rawGroups = Array.isArray(groups) ? groups : [];
    if (!authStore.isAdmin) {
      userGroups.value = rawGroups;
      return;
    }
    userGroups.value = await Promise.all(
      rawGroups.map(async (g) => {
        if (g.member_count != null) return g;
        if (Array.isArray(g.Users) || Array.isArray(g.users))
          return { ...g, member_count: (g.Users ?? g.users).length };
        try {
          const r = await axios.get(SERVER + `/api/groups/${g.id}/users/`);
          const u = r.data?.data ?? r.data;
          return { ...g, member_count: Array.isArray(u) ? u.length : 0 };
        } catch {
          return { ...g, member_count: 0 };
        }
      }),
    );
  } catch {
    userGroups.value = [];
  }
};

const load_Users = async () => {
  try {
    const response = await axios.get(SERVER + "/api/users");
    users.value = response.data;
  } catch (error) {
    console.log("Error loading users:", error);
  }
};

const loadInbox = async () => {
  if (!authStore.user) return;
  inboxFiles.value = [];
  try {
    const response = await axios.get(
      SERVER + "/api/inbox/" + authStore.user?.id,
    );
    inboxFiles.value = response.data;
    unreadCount.value = inboxFiles.value.filter((a) => !a.opened).length;
  } catch (error) {
    console.error("Error loading inbox:", error);
  }
};

const drawInbox = async (idx) => {
  const pin = inboxFiles.value[idx]?.MyWork;
  if (!pin) return;
  try {
    await axios.post(SERVER + "/api/inbox/opened", {
      id: inboxFiles.value[idx].id,
    });
    inboxFiles.value[idx].opened = true;
    unreadCount.value--;
  } catch (err) {
    console.error("Failed to sync opened state", err);
  }

  if (pin.show != undefined) {
    if (pin.entity && pin.entity.show !== undefined) {
      pin.entity.show = !pin.entity.show;
      if (pin.shape) pin.shape.show = pin.entity.show;
    } else if (pin.shape) {
      const sourceId =
        (pin.shape._sourceIds && pin.shape._sourceIds[0]) ||
        "draw-pin-" + pin.id;
      const visible = !pin.shape.show;
      pin.shape.show = visible;
      const layers = props.map
        .getStyle()
        .layers.filter((l) => l.id.startsWith(sourceId));
      layers.forEach((l) =>
        props.map.setLayoutProperty(
          l.id,
          "visibility",
          visible ? "visible" : "none",
        ),
      );
    }
    return;
  }
  if (pin.type == "draw") {
    try {
      pin.shape = JSON.parse(pin.content);
    } catch (e) {
      pin.shape = pin.content;
    }
    if (pin.shape && pin.shape.type) {
      drawShape(pin, "inbox");
      bringDrawingsToFront(props.map);
    } else {
      showMessage("لایه دریافتی قابلیت نمایش روی نقشه را ندارد", "warning");
    }
  } else if (pin.name || pin.content) {
    await drawKML(pin, "inbox");
    bringDrawingsToFront(props.map);
  }
  pin.show = true;
};

const addInboxToDesktop = async (idx) => {
  const file = inboxFiles.value[idx];
  const pin = file?.MyWork;
  if (!pin) return;
  loading.value = true;
  try {
    const newPin = {
      id: crypto.randomUUID(),
      name: pin.name || "بدون نام",
      type: pin.type,
      date: new Date(),
      save: -1,
    };
    if (pin.type == "draw") {
      let shape;
      const content =
        typeof pin.content === "string"
          ? pin.content.replace(/^"|"$/g, "")
          : pin.content;
      try {
        shape = JSON.parse(content);
      } catch (e) {
        shape = content;
      }
      if (!shape || !shape.type) {
        showMessage("ترسیم دریافتی معتبر نیست", "error");
        return;
      }
      shape.show = true;
      newPin.shape = shape;
    } else if (pin.type == "file") {
      newPin.shape = { show: true };
      newPin.content = pin.content;
    } else {
      newPin.shape = { show: true };
    }

    if (SelectGroup.value !== null && props.pins[SelectGroup.value]) {
      newPin.parent_id = props.pins[SelectGroup.value].save ?? -1;
      if (!props.pins[SelectGroup.value].children)
        props.pins[SelectGroup.value].children = [];
      props.pins[SelectGroup.value].children.push(newPin);
    } else {
      newPin.parent_id = -1;
      props.pins.push(newPin);
    }

    if (newPin.type == "draw") {
      drawShape(newPin, "draw", true);
    } else if (newPin.type == "file" && newPin.content) {
      const url = SERVER + "/uploads/pins/" + newPin.content;
      const res = await fetch(url);
      const blob = await res.blob();
      newPin.file = new File(
        [blob],
        String(newPin.content).replace(/^.*[\\/]/, ""),
        { type: blob.type || "application/vnd.google-earth.kml+xml" },
      );
      await drawKML(newPin, true);
    }
    bringDrawingsToFront(props.map);
    await saveOneWorks(newPin);
    showMessage("لایه دریافتی به میز کار اضافه شد", "success");
  } catch (e) {
    console.error("خطا در افزودن به میز کار:", e);
    showMessage("خطا در افزودن به میز کار", "error");
  } finally {
    loading.value = false;
  }
};

const loadWorks = async () => {
  if (!authStore.user) return;
  emit("clearPins");
  myWorks.value = [];
  loading.value = true;
  try {
    const res = await axios.get(
      SERVER + "/api/load/myWork/" + authStore.user?.id,
    );
    for (let i of res.data) {
      let pin = {
        id: i.obj_id,
        name: i.name,
        shape: i.type == "draw" ? JSON.parse(i.content) : { show: true },
        content: i.type == "file" ? i.content : "",
        date: i.createdAt,
        type: i.type,
        save: i.id,
        parent_id: i.parent_id,
        archive: i.archive,
      };
      pin.shape.show = isVisible(i.obj_id);
      myWorks.value.push(pin);
    }
    let tmp = groupBy(myWorks.value);
    let tmp2 = tmp.filter((a) => a.archive !== null);
    History.value = groupByCreatedAtDay(tmp2);
    tmp = tmp.filter((a) => a.archive == null);
    props.pins.push(...tmp);
    await drawPins();
  } catch (err) {
    console.error("خطا در دریافت pins از سرور", err);
  } finally {
    loading.value = false;
  }
};

function groupByCreatedAtDay(items) {
  const map = new Map();
  for (const item of items) {
    const dayKey = new Date(item.date).toISOString().slice(0, 10);
    if (!map.has(dayKey))
      map.set(dayKey, {
        id: dayKey,
        name: moment(dayKey).format("jYYYY/jMM/jDD"),
        type: "group",
        history: true,
        expanded: false,
        children: [],
      });
    const group = map.get(dayKey);
    if (item.type == "group") {
      const chd = [];
      for (const row of item.children) {
        row.shape.show = false;
        chd.push({
          id: row.id,
          name: row?.name ?? "بدون نام",
          type: row.type,
          save: row.save,
          shape: row.shape,
          content: row.content,
          dataSource: row,
          obj_id: row?.obj_id,
          bounding: row.bounding,
        });
      }
      group.children.push({
        id: item.id,
        name: item?.name ?? "بدون نام",
        type: item.type,
        save: item.save,
        children: chd,
      });
    } else {
      isVisible(item.id) ? (item.shape.show = true) : (item.shape.show = false);
      item.shape.show = false;
      group.children.push({
        id: item.id,
        name: item?.name ?? "بدون نام",
        type: item.type,
        save: item.save,
        shape: item.shape,
        content: item.content,
        dataSource: item,
        obj_id: item?.obj_id,
        bounding: item.bounding,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.name < b.name ? 1 : -1));
}

function groupBy(items) {
  const map = {};
  const tree = [];
  items.forEach((item) => {
    item.expanded = true;
    map[item.save] = { ...item, children: [] };
  });
  items.forEach((item) => {
    if (item.parent_id !== null && item.parent_id > -1) {
      if (map[item.parent_id])
        map[item.parent_id].children.push(map[item.save]);
    } else {
      tree.push(map[item.save]);
    }
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
    if (item.type === "file") fd.append("file", item.file);
    else fd.append("content", JSON.stringify(toRaw(item.shape)));
    await axios.post(SERVER + "/api/Save/myWork/" + authStore.user.id, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } catch (err) {
    console.error(err);
  }
};

function drawShape(pin, dataSourceName = "draw", visible = false) {
  const shape = pin.shape;
  if (!shape || !shape.type) return;

  const map = props.map;
  const sourceId = "draw-pin-" + pin.id;

  if (shape.type === "polyline") {
    const coords = shape.positions
      .map((p) => [p.lon ?? p.lng, p.lat])
      .filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));
    if (!map.getSource(sourceId))
      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    map.addLayer({
      id: sourceId + "-line",
      type: "line",
      source: sourceId,
      paint: {
        "line-color": shape.color || "#ff0000",
        "line-width": shape.width || 3,
        "line-opacity": shape.opacity ?? 1,
      },
      layout: {
        visibility: visible ? "visible" : shape.show ? "visible" : "none",
      },
    });
    map.getSource(sourceId).setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
          properties: {
            name: pin.name,
            description: shape.description || "",
          },
        },
      ],
    });
    pin.shape._sourceIds = [sourceId];
  } else if (shape.type === "polygon") {
    const coords = shape.positions.map((p) => [p.lon, p.lat]);
    if (!map.getSource(sourceId))
      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    map.addLayer({
      id: sourceId + "-fill",
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": shape.color || "#ff0000",
        "fill-opacity": shape.opacity ?? 0.5,
      },
      layout: {
        visibility: visible ? "visible" : shape.show ? "visible" : "none",
      },
    });
    map.addLayer({
      id: sourceId + "-line",
      type: "line",
      source: sourceId,
      paint: {
        "line-color": shape.outlineColor || shape.color || "#ff0000",
        "line-width": shape.outlineWidth || shape.width || 2,
        "line-opacity": shape.opacity ?? 1,
      },
      layout: {
        visibility: visible ? "visible" : shape.show ? "visible" : "none",
      },
    });
    map.getSource(sourceId).setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [coords] },
          properties: {
            name: pin.name,
            description: shape.description || "",
          },
        },
      ],
    });
    pin.shape._sourceIds = [sourceId];
  } else if (shape.type === "point") {
    if (!map.getSource(sourceId))
      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    map.addLayer({
      id: sourceId + "-point",
      type: "circle",
      source: sourceId,
      paint: {
        "circle-radius": shape.pixelSize || 8,
        "circle-color": shape.color || "#ff0000",
        "circle-opacity": shape.opacity ?? 1,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": shape.outlineWidth || 1,
        "circle-stroke-opacity": shape.opacity ?? 1,
      },
      layout: {
        visibility: visible ? "visible" : shape.show ? "visible" : "none",
      },
    });
    map.getSource(sourceId).setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [shape.lon, shape.lat] },
          properties: {
            name: pin.name,
            description: shape.description || "",
          },
        },
      ],
    });
    pin.shape._sourceIds = [sourceId];
  } else if (shape.type === "multi_point") {
    const features = shape.positions.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: { color: p.color || shape.color || "#00ff00" },
    }));
    if (!map.getSource(sourceId))
      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });
    map.addLayer({
      id: sourceId + "-points",
      type: "circle",
      source: sourceId,
      paint: {
        "circle-radius": 5,
        "circle-color": ["get", "color"],
        "circle-opacity": shape.opacity ?? 1,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1,
        "circle-stroke-opacity": shape.opacity ?? 1,
      },
      layout: {
        visibility: visible ? "visible" : shape.show ? "visible" : "none",
      },
    });
    pin.shape._sourceIds = [sourceId];
  } else if (shape.type === "circle") {
    const center = shape.center;
    const r = shape.radius;
    const coords = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * 2 * Math.PI;
      const rLat = center.lat + (r / 110540) * Math.sin(angle);
      const rLng =
        center.lng +
        (r / (111319.9 * Math.cos((center.lat * Math.PI) / 180))) *
          Math.cos(angle);
      coords.push([rLng, rLat]);
    }
    coords.push(coords[0]);
    if (!map.getSource(sourceId))
      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    map.addLayer({
      id: sourceId + "-fill",
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": shape.fillColor || shape.color || "#0000ff",
        "fill-opacity": shape.opacity ?? 0.3,
      },
      layout: {
        visibility: visible ? "visible" : shape.show ? "visible" : "none",
      },
    });
    map.addLayer({
      id: sourceId + "-line",
      type: "line",
      source: sourceId,
      paint: {
        "line-color": shape.outlineColor || shape.color || "#0000ff",
        "line-width": shape.outlineWidth || shape.width || 2,
        "line-opacity": shape.opacity ?? 1,
      },
      layout: {
        visibility: visible ? "visible" : shape.show ? "visible" : "none",
      },
    });
    map.getSource(sourceId).setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [coords] },
          properties: {},
        },
      ],
    });
    pin.shape._sourceIds = [sourceId];
  }

  (pin.shape._sourceIds || []).forEach((sid) =>
    registerLayersForSource(map, sid),
  );
}

async function drawKML(pin, visible = false) {
  try {
    const url = SERVER + "/uploads/pins/" + pin.content;
    const response = await fetch(url);
    const blob = await response.blob();
    const text = await readKmlText(blob, pin.content);
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "application/xml");
    const geojson = kmlToGeoJSON(doc);

    const sourceId = "kml-" + pin.id;
    if (props.map.getSource(sourceId)) {
      props.map.getSource(sourceId).setData(geojson);
      pin.shape = { show: visible, _sourceIds: [sourceId] };
      pin.shape.show = visible || isVisible(pin.id);
      pin.loaded = true;
      registerLayersForSource(props.map, sourceId);
      return;
    }
    props.map.addSource(sourceId, { type: "geojson", data: geojson });
    props.map.addLayer({
      id: sourceId + "-fill",
      type: "fill",
      source: sourceId,
      paint: { "fill-color": "#ff0000", "fill-opacity": 0.3 },
      filter: ["==", "$type", "Polygon"],
    });
    props.map.addLayer({
      id: sourceId + "-line",
      type: "line",
      source: sourceId,
      paint: { "line-color": "#ff0000", "line-width": 2 },
      filter: ["in", "$type", "LineString", "Polygon"],
    });
    props.map.addLayer({
      id: sourceId + "-point",
      type: "circle",
      source: sourceId,
      paint: { "circle-radius": 6, "circle-color": "#ff0000" },
      filter: ["==", "$type", "Point"],
    });

    pin.shape = { show: visible, _sourceIds: [sourceId] };
    pin.shape.show = visible || isVisible(pin.id);
    pin.loaded = true;
    registerLayersForSource(props.map, sourceId);
  } catch (err) {
    console.error("خطا در خواندن KML:", pin.name, err);
  }
}

function kmlToGeoJSON(doc) {
  const features = [];
  doc.querySelectorAll("Placemark").forEach((pm) => {
    const name = pm.querySelector("name")?.textContent || "";
    const description = pm.querySelector("description")?.textContent || "";
    const point = pm.querySelector("Point");
    const lineString = pm.querySelector("LineString");
    const polygon = pm.querySelector("Polygon");
    let geometry = null;

    if (point) {
      const coords = parseKMLCoords(point.querySelector("coordinates"));
      if (coords.length) geometry = { type: "Point", coordinates: coords[0] };
    } else if (lineString) {
      const coords = parseKMLCoords(lineString.querySelector("coordinates"));
      if (coords.length) geometry = { type: "LineString", coordinates: coords };
    } else if (polygon) {
      const outer = polygon.querySelector("outerBoundaryIs coordinates");
      const coords = parseKMLCoords(outer);
      if (coords.length) {
        coords.push(coords[0]);
        geometry = { type: "Polygon", coordinates: [coords] };
      }
    }

    if (geometry)
      features.push({
        type: "Feature",
        properties: { name, description },
        geometry,
      });
  });
  return { type: "FeatureCollection", features };
}

function parseKMLCoords(el) {
  if (!el) return [];
  return el.textContent
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [lon, lat] = pair.split(",").map(Number);
      return [lon, lat];
    })
    .filter((c) => !isNaN(c[0]) && !isNaN(c[1]));
}

const readU16 = (buf, o) => buf[o] | (buf[o + 1] << 8);
const readU32 = (buf, o) =>
  buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16) | (buf[o + 3] << 24);

async function inflateRawZipEntry(data) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("مرورگر شما از فایل KMZ پشتیبانی نمی‌کند");
  }
  const stream = new Blob([data]).stream().pipeThrough(
    new DecompressionStream("deflate-raw"),
  );
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function extractKmlFromZip(buf) {
  const decoder = new TextDecoder("latin1");
  let offset = 0;
  while (offset + 30 <= buf.length) {
    const sig = readU32(buf, offset);
    if (sig !== 0x04034b50) break;
    const method = buf[offset + 8];
    const compSize = readU32(buf, offset + 18);
    const nameLen = readU16(buf, offset + 26);
    const extraLen = readU16(buf, offset + 28);
    const name = decoder
      .decode(buf.subarray(offset + 30, offset + 30 + nameLen))
      .toLowerCase();
    const dataStart = offset + 30 + nameLen + extraLen;
    if (name.endsWith(".kml")) {
      const comp = buf.subarray(dataStart, dataStart + compSize);
      if (method === 0) return comp;
      if (method === 8) return await inflateRawZipEntry(comp);
      throw new Error("روش فشرده‌سازی KMZ پشتیبانی نمی‌شود");
    }
    offset = dataStart + compSize;
  }
  throw new Error("فایل doc.kml داخل KMZ یافت نشد");
}

async function readKmlText(blob, name = "") {
  const isKmz = /\.kmz$/i.test(name);
  if (!isKmz) return await blob.text();
  const buf = new Uint8Array(await blob.arrayBuffer());
  const kmlBytes = await extractKmlFromZip(buf);
  return new TextDecoder().decode(kmlBytes);
}

const drawPins = async () => {
  for (const pin of props.pins) {
    if (pin.type == "group") {
      for (const ch_pin of pin.children) {
        if (ch_pin.type == "draw") drawShape(ch_pin);
        else if (ch_pin.type == "file") await drawKML(ch_pin);
      }
    }
    if (pin.type == "draw") drawShape(pin);
    else if (pin.type == "file") await drawKML(pin);
  }
  bringDrawingsToFront(props.map);
};

const drawPin = async (pin, visible = false) => {
  if (pin.type == "draw") drawShape(pin, "draw", visible);
  else if (pin.type == "file") await drawKML(pin, visible);
};

provide("drawPin", drawPin);
provide("Pins", props.pins);

const getData = async (token) => {
  emit("clearPins");
  myWorks.value = [];
  loading.value = true;
  try {
    const result = await axios.post(SERVER + "/api/load/link/", { token });
    const res = result.data;
    if (res.success) {
      const i = res.data;
      let pin = {
        id: i.obj_id,
        name: i.name,
        shape: i.type == "draw" ? JSON.parse(i.content) : { show: true },
        content: i.type == "file" ? i.content : "",
        date: i.createdAt,
        type: i.type,
        save: i.id,
        parent_id: i.parent_id,
        archive: i.archive,
      };
      pin.shape.show = true;
      pin.shared = true;
      props.pins.push(pin);
      await drawPin(pin, true);

      const coords = pin.shape.positions?.map((p) => [p.lon, p.lat]);
      if (coords?.length) {
        const bounds = new mapboxgl.LngLatBounds();
        coords.forEach((c) => bounds.extend(c));
        props.map.fitBounds(bounds, { padding: 50, duration: 1500 });
      }
    }
  } catch (err) {
    console.error("خطا در دریافت pins از سرور", err);
  } finally {
    loading.value = false;
  }
};

const createFolder = async (name) => {
  try {
    await axios.post(SERVER + "/api/createFolder/" + authStore.user?.id, {
      type: "group",
      name,
    });
  } catch (err) {
    console.error(err);
  }
};

const ArchiveDesktop = async () => {
  const confirmed = window.confirm(
    "تمامی آیتم های میز کار به بخش آرشیو منتقل میشوند ، مطمئن هستید ؟",
  );
  if (!confirmed) return;
  let ids = props.pins.map((item) => item.save);
  await axios.post(SERVER + "/api/archive", { ids });
  emit("clearPins");
};

const send = async (data) => {
  if (!authStore.user) return;
  let pin = props.pins[index_pin_id.value];
  const form = new FormData();
  form.append("sender_id", authStore.user.id);
  // کاربر عادی به لیست کاربران دسترسی ندارد؛ در این حالت با شماره همراه (rec_phone) ارسال می‌شود
  if (data.selected) {
    form.append("receiver_id", data.selected);
  } else if (data.phone) {
    form.append("rec_phone", data.phone);
  } else {
    showMessage("گیرنده مشخص نشده است", "error");
    return;
  }
  form.append("document_id", pin.save);
  form.append("descr", data.description);
  if (pin.save < 0) {
    let content = pin.content;
    if (pin.type == "draw" && pin.shape) content = JSON.stringify(pin.shape);
    form.append("name", pin.name);
    form.append(
      "pin",
      JSON.stringify({
        name: pin.name,
        content,
        type: pin.type,
        obj_id: pin.id,
      }),
    );
  }
  if (pin.type == "file" && pin.content == null) form.append("file", pin.file);
  await axios.post(SERVER + "/api/sendTo", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  OpenSend.value = false;
  showMessage("آیتم مورد نظر ارسال شد", "success");
};

function showMessage(msg, type) {
  $toast.open({ message: msg, type, duration: 4000 });
}

const importCsvRef = ref(null);
function onCsvImported({ count, skipped }) {}

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const fileName = file.name.toLowerCase();
  loading.value = true;
  event.target.value = "";

  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    loading.value = false;
    importCsvRef.value?.open(file);
    return;
  }

  if (fileName.endsWith(".kml") || fileName.endsWith(".kmz")) {
    try {
      const text = await readKmlText(file, file.name);
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "application/xml");
      const geojson = kmlToGeoJSON(doc);
      const sourceId = "file-" + crypto.randomUUID();
      props.map.addSource(sourceId, { type: "geojson", data: geojson });
      props.map.addLayer({
        id: sourceId + "-fill",
        type: "fill",
        source: sourceId,
        paint: { "fill-color": "#ff0000", "fill-opacity": 0.3 },
        filter: ["==", "$type", "Polygon"],
      });
      props.map.addLayer({
        id: sourceId + "-line",
        type: "line",
        source: sourceId,
        paint: { "line-color": "#ff0000", "line-width": 2 },
        filter: ["in", "$type", "LineString", "Polygon"],
      });
      props.map.addLayer({
        id: sourceId + "-point",
        type: "circle",
        source: sourceId,
        paint: { "circle-radius": 6, "circle-color": "#ff0000" },
        filter: ["==", "$type", "Point"],
      });
      registerLayersForSource(props.map, sourceId);

      const bounds = new mapboxgl.LngLatBounds();
      const addCoords = (coords) => {
        if (typeof coords[0] === "number") bounds.extend(coords);
        else coords.forEach(addCoords);
      };
      geojson.features.forEach((f) => addCoords(f.geometry.coordinates));
      if (!bounds.isEmpty())
        props.map.fitBounds(bounds, { padding: 50, duration: 2000 });

      loading.value = false;
      let pin = {
        id: crypto.randomUUID(),
        name: fileName,
        shape: { show: true, _sourceIds: [sourceId] },
        date: new Date(),
        save: -1,
        type: "file",
        file,
      };
      if (SelectGroup.value !== null) {
        pin.parent_id = props.pins[SelectGroup.value].save ?? -1;
        props.pins[SelectGroup.value].children.push(pin);
      } else {
        pin.parent_id = -1;
        props.pins.push(pin);
      }
      await saveOneWorks(pin);
    } catch (error) {
      console.error("خطا در بارگذاری فایل:", error);
      loading.value = false;
    }
  } else if (fileName.endsWith(".zip")) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const shp = (await import("shpjs")).default;
        const geojson = await shp(e.target.result);
        const sourceId = "shp-" + crypto.randomUUID();
        props.map.addSource(sourceId, { type: "geojson", data: geojson });
        props.map.addLayer({
          id: sourceId + "-fill",
          type: "fill",
          source: sourceId,
          paint: { "fill-color": "#ff0000", "fill-opacity": 0.3 },
          filter: ["==", "$type", "Polygon"],
        });
        props.map.addLayer({
          id: sourceId + "-line",
          type: "line",
          source: sourceId,
          paint: { "line-color": "#ff0000", "line-width": 2 },
          filter: ["in", "$type", "LineString", "Polygon"],
        });
        props.map.addLayer({
          id: sourceId + "-point",
          type: "circle",
          source: sourceId,
          paint: { "circle-radius": 6, "circle-color": "#ff0000" },
          filter: ["==", "$type", "Point"],
        });
        registerLayersForSource(props.map, sourceId);

        const bounds = new mapboxgl.LngLatBounds();
        const addCoords = (coords) => {
          if (typeof coords[0] === "number") bounds.extend(coords);
          else coords.forEach(addCoords);
        };
        geojson.features.forEach((f) => addCoords(f.geometry.coordinates));
        if (!bounds.isEmpty())
          props.map.fitBounds(bounds, { padding: 50, duration: 2000 });

        loading.value = false;
        let pin = {
          id: crypto.randomUUID(),
          name: fileName,
          shape: { show: true, _sourceIds: [sourceId] },
          date: new Date(),
          save: -1,
          type: "file",
        };
        if (SelectGroup.value !== null) {
          pin.parent_id = props.pins[SelectGroup.value].save ?? -1;
          props.pins[SelectGroup.value].children.push(pin);
        } else {
          pin.parent_id = -1;
          props.pins.push(pin);
        }
        await saveOneWorks(pin);
      } catch (error) {
        console.error("خطا در بارگذاری Shapefile:", error);
        loading.value = false;
      }
    };
    reader.readAsArrayBuffer(file);
  } else if (fileName.endsWith(".dxf") || fileName.endsWith(".dwg")) {
    try {
      const textContent = await readDxfText(file, fileName);
      const geojson = dxfToGeoJSON(textContent);
      if (!geojson.features.length) {
        showMessage(
          fileName.endsWith(".dwg")
            ? "فایل DWG باینری پشتیبانی نمی‌شود. لطفاً از AutoCAD به‌صورت DXF ذخیره کنید."
            : "هیچ هندسه‌ای در فایل DXF پیدا نشد",
          "error",
        );
        loading.value = false;
        return;
      }
      await addGeoJsonFileToMap(geojson, fileName, file);
    } catch (error) {
      console.error("خطا در بارگذاری DXF/DWG:", error);
      showMessage(
        fileName.endsWith(".dwg")
          ? "فایل DWG باینری در مرورگر قابل‌خواندن نیست. فایل را به DXF تبدیل کنید."
          : "خطا در خواندن فایل DXF",
        "error",
      );
      loading.value = false;
    }
  } else {
    alert(
      "فقط فایل‌های KML/KMZ، SHP (ZIP)، CSV، DXF و DWG (ASCII) پشتیبانی می‌شوند.",
    );
    loading.value = false;
  }
};

/** اضافه کردن GeoJSON فایل به نقشه و لیست پین‌ها */
async function addGeoJsonFileToMap(geojson, fileName, file) {
  const sourceId = "file-" + crypto.randomUUID();
  props.map.addSource(sourceId, { type: "geojson", data: geojson });
  props.map.addLayer({
    id: sourceId + "-fill",
    type: "fill",
    source: sourceId,
    paint: { "fill-color": "#ff0000", "fill-opacity": 0.3 },
    filter: ["==", "$type", "Polygon"],
  });
  props.map.addLayer({
    id: sourceId + "-line",
    type: "line",
    source: sourceId,
    paint: { "line-color": "#ff0000", "line-width": 2 },
    filter: ["in", "$type", "LineString", "Polygon"],
  });
  props.map.addLayer({
    id: sourceId + "-point",
    type: "circle",
    source: sourceId,
    paint: { "circle-radius": 6, "circle-color": "#ff0000" },
    filter: ["==", "$type", "Point"],
  });
  registerLayersForSource(props.map, sourceId);

  const bounds = new mapboxgl.LngLatBounds();
  const addCoords = (coords) => {
    if (typeof coords[0] === "number") bounds.extend(coords);
    else coords.forEach(addCoords);
  };
  (geojson.features || []).forEach((f) => {
    if (f.geometry?.coordinates) addCoords(f.geometry.coordinates);
  });
  if (!bounds.isEmpty())
    props.map.fitBounds(bounds, { padding: 50, duration: 2000 });

  loading.value = false;
  let pin = {
    id: crypto.randomUUID(),
    name: fileName,
    shape: { show: true, _sourceIds: [sourceId] },
    date: new Date(),
    save: -1,
    type: "file",
    file,
  };
  if (SelectGroup.value !== null) {
    pin.parent_id = props.pins[SelectGroup.value].save ?? -1;
    props.pins[SelectGroup.value].children.push(pin);
  } else {
    pin.parent_id = -1;
    props.pins.push(pin);
  }
  await saveOneWorks(pin);
  showMessage(`فایل ${fileName} با موفقیت بارگذاری شد`, "success");
}

/**
 * خواندن متن DXF. برای DWG باینری خطا می‌دهد مگر اینکه در واقع ASCII DXF باشد.
 */
async function readDxfText(file, name = "") {
  const lower = (name || file.name || "").toLowerCase();

  if (lower.endsWith(".dwg")) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const sig = String.fromCharCode(...bytes.slice(0, 6));
    if (sig.startsWith("AC10")) {
      throw new Error("binary DWG not supported");
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  return await file.text();
}

function Export(filename, exportType) {
  const activePins = props.pins.filter(
    (pin) => pin.type === "draw" && pin.shape && pin.shape.show === true,
  );

  if (exportType == "csv") {
    let csvContent = "";
    activePins.forEach((pin) => {
      if (pin.shape?.positions && Array.isArray(pin.shape.positions)) {
        csvContent += pin.name + "\n" + (pin.shape.type || "shape") + " :\n" + "lat,lon\n";
        pin.shape.positions.forEach((pos) => {
          csvContent += `${pos.lat},${pos.lon}\n`;
        });
        csvContent += "\n";
      } else if (pin.shape?.type === "point" && pin.shape.lon != null && pin.shape.lat != null) {
        csvContent += pin.name + "\npoint :\nlat,lon\n";
        csvContent += `${pin.shape.lat},${pin.shape.lon}\n\n`;
      }
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    let kml =
      '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n';
    activePins.forEach((pin) => {
      const name = (pin.name || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (pin.shape.type === "polyline") {
        const coords = (pin.shape.positions || [])
          .map((p) => `${p.lon},${p.lat},0`)
          .join(" ");
        kml += `  <Placemark><name>${name}</name><LineString><coordinates>${coords}</coordinates></LineString></Placemark>\n`;
      } else if (pin.shape.type === "polygon") {
        const coords = (pin.shape.positions || [])
          .map((p) => `${p.lon},${p.lat},0`)
          .join(" ");
        kml += `  <Placemark><name>${name}</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>\n`;
      } else if (pin.shape.type === "point") {
        kml += `  <Placemark><name>${name}</name><Point><coordinates>${pin.shape.lon},${pin.shape.lat},0</coordinates></Point></Placemark>\n`;
      } else if (pin.shape.type === "multi_point") {
        (pin.shape.positions || []).forEach((p, idx) => {
          kml += `  <Placemark><name>${name} (${idx + 1})</name><Point><coordinates>${p.lon},${p.lat},0</coordinates></Point></Placemark>\n`;
        });
      } else if (pin.shape.type === "circle" && pin.shape.center) {
        kml += `  <Placemark><name>${name}</name><Point><coordinates>${pin.shape.center.lng ?? pin.shape.center.lon},${pin.shape.center.lat},0</coordinates></Point></Placemark>\n`;
      }
    });
    kml += "</Document>\n</kml>";
    const blob = new Blob([kml], {
      type: "application/vnd.google-earth.kml+xml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename + ".kml";
    a.click();
  }
}

defineExpose({ fetchPins: loadWorks, redrawPins: drawPins });
</script>

<style scoped>
.rev {
  transform: scaleX(-1);
}
</style>