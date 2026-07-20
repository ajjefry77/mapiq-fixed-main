<template>
 <div class="flex flex-col min-h-0">
  <!-- Tabs -->
  <div class="flex mb-2 ">
<!--    <button-->
<!--        class="px-2 py-1 text-sm rounded"-->
<!--        :class="activeTab === 'my' ? 'bg-blue-500 text-white' : 'bg-white border'"-->
<!--        @click="activeTab = 'my'" >-->
<!--      میز کار-->
<!--    </button>-->
    <button
        class="px-2 py-1 text-sm rounded"
        :class="activeTab === 'my2' ? 'bg-blue-500 text-white' : 'bg-white border'"
        @click="activeTab = 'my2'" >
      میز کار
    </button>
    <button
        class="relative px-2 py-1 text-sm rounded"
        :class="activeTab === 'in' ? 'bg-blue-500 text-white' : 'bg-white border'"
        @click="activeTab = 'in'" >
       فضای اشتراکی
      <span
          v-if="unreadCount > 0" class="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full px-1 min-w-[16px] text-center">
          {{ unreadCount }}
      </span>
    </button>
    <button
        class="px-2 py-1 text-sm rounded"
        :class="activeTab === 'out' ? 'bg-blue-500 text-white' : 'bg-white border'"
        @click="activeTab = 'out'" >
       تاریخچه
    </button>
  </div>

  <div v-if="activeTab === 'my'" class="text-xs flex flex-col h-full min-h-0">
    <div class="flex items-center justify-between mt-0 mb-2">
      <div class="flex gap-1">
        <!--<button class="bg-[var(--primary-color)] text-white w-8 py-1 rounded" @click="allView" title="خاموش / روشن">
          <i :class="isShow ? 'fas fa-eye' : 'fas fa-eye-slash'"></i>
        </button>-->
        <button class="text-gray-500 w-8 py-1 rounded" @click="exportDialog = true" title="خروجی kml">
          <i class="fas fa-file-export"></i>
        </button>
        <!--<button class="bg-[var(--primary-color)] text-white w-8 py-1 rounded" @click="openSaveDialog" title="ذخیره فضای کاری ">
          <i class="fas fa-save"></i>
        </button>-->
        <!--<button class="bg-[var(&#45;&#45;primary-color)] text-white w-8 py-1 rounded" title="افزودن لایه">-->
        <!--  <i class="fas fa-layer-group"></i>-->
        <!--  <input type="file" class="hidden" @change="e => handleFileUpload(e, 'shapefile')"  accept=".kml,.zip"/>-->
        <!--</button>-->
          <label class="text-gray-500  w-8 py-1 rounded px-0 text-center cursor-pointer" title="باز کردن kml">
            <i class="fas fa-folder-open"></i>
            <input type="file" class="hidden" @change="e => handleFileUpload(e, 'shapefile')"  accept=".kml,.kmz"/>
          </label>
        <!--<button @click="saveWorks">ذخیره</button>-->
        <!--<button class="bg-[var(--primary-color)] text-white w-8 py-1 rounded" @click="props.openDia();" title="لیست پروژه ها">
          <i class="fas fa-layer-group"></i>
        </button>
        <button class="bg-[var(--primary-color)] text-white w-8 py-1 rounded" @click="NewWork" title="جدید">
          <i class="fas fa-file"></i>
        </button>-->

      </div>
    </div>
    <hr style="border-top: 1px solid #aaa; margin-bottom: 5px"/>

    <div class="overflow-y-auto" style="overflow-y: auto !important; height: 100%;">
      <ul class="space-y-0">
      <li v-for="(pin, index) in pins" :key="index"
          class="flex items-center justify-between  px-2  border rounded">

        <div>
          <input type="checkbox" @click="hide(pin)" v-model="pin.shape.show" class="ml-2 accent-green-600"/>
          <span class="text-sm text-gray-800 truncate w-48">{{ pin.name }}</span>
        </div>

        <div>
          <button class="text-green-600 hover:text-green-800 px-1"
              @click="deletePin(pin)" title="حذف بوک مارک">
            <i class="fas fa-trash text-gray-700 text-sm" />
          </button>

<!--          <button class="text-green-600 hover:text-green-800 px-1"-->
<!--              @click="toggleView(index)"  title="روشن / خاموش">-->
<!--            <i :class="pin.shape.show ? 'fas fa-power-off text-green-500' : 'fas fa-power-off text-gray-400'" />-->
<!--          </button>-->

            <button
                class="text-green-600 hover:text-green-800"
                @click="index_pin_id = index;OpenSend = true"
                title="ارسال">
                <i class="fas fa-share rev text-gray-700 text-sm" />
            </button>


          <button class="text-green-600 hover:text-green-800 px-1"
              @click="zoomOnPin(index)"  title="نمایش روی نقشه">
            <i class="fas fa-search text-[var(--primary-color)] text-sm" />
          </button>
        </div>
      </li>
    </ul>
    </div>
  </div>

  <div v-if="activeTab === 'my2'" class="text-xs flex flex-col h-full min-h-0">
    <div class="flex items-center justify-between mt-0 mb-2">
      <div class="flex gap-1 text-sm">
        <button class="text-gray-500 w-8 py-1 rounded" @click="exportDialog = true" title="خروجی kml">
          <i class="fas fa-file-export"></i>
        </button>
        <label class="text-gray-500  w-8 py-1 rounded px-0 text-center cursor-pointer" title="باز کردن kml">
          <i class="fas fa-folder-open"></i>
          <input type="file" class="hidden" @change="e => handleFileUpload(e, 'shapefile')"  accept=".kml,.kmz,.csv,.txt"/>
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
      <LayerTree :items="props.pins" :viewer="viewer" :depth="0" :selectedGroup="selectedGroup" :selectGroup="selectGroup" :Icons="['send']"/>
    </div>
  </div>

  <div v-if="activeTab === 'in'" class="text-xs flex flex-col h-full min-h-0">
    <div class="flex gap-1 mb-2">
      <button
          class="px-2 py-0.5 text-xs rounded"
          :class="sharedSubTab === 'files' ? 'bg-orange-500 text-white' : 'bg-white border'"
          @click="sharedSubTab = 'files'" >
        فایل‌ها (پوشه ورودی)
      </button>
      <button
          class="px-2 py-0.5 text-xs rounded"
          :class="sharedSubTab === 'groups' ? 'bg-orange-500 text-white' : 'bg-white border'"
          @click="sharedSubTab = 'groups'" >
        گروه‌ها
      </button>
    </div>
    <div v-if="sharedSubTab === 'files'">
      <div class="flex items-center justify-between mt-0 mb-2">
        <p class="text-sm text-gray-600">پوشه ورودی:</p>
      </div>
      <hr style="border-top: 1px solid #aaa; margin-bottom: 5px"/>

      <div class="overflow-y-auto">
        <ul class="space-y-1">
          <li
              v-for="(file, index) in inboxFiles"
              :key="index"
              class="flex items-center justify-between bg-white px-2  border rounded">
            <item-box v-if="viewer && inboxFiles" :viewer="viewer" :name ="getTitle(file)" :id="file.id" :idx="index"
                      :loadedFiles="inboxFiles" @drawInbox="drawInbox" :unread="file.opened"/>
          </li>
          <li v-if="!inboxFiles.length" class="text-center text-gray-400 py-4">
            پوشه ورودی خالی است
          </li>
        </ul>
      </div>
    </div>

    <div v-else-if="sharedSubTab === 'groups'" class="flex flex-col h-full min-h-0">
      <div class="flex items-center justify-between mt-0 mb-2">
        <p class="text-sm text-gray-600">گروه‌های من:</p>
      </div>
      <hr style="border-top: 1px solid #aaa; margin-bottom: 5px"/>

      <div class="overflow-y-auto">
        <ul class="space-y-1">
          <li
              v-for="(group, index) in userGroups"
              :key="index"
              class="flex items-center justify-between bg-white px-2 py-1 border rounded">
            <div class="flex items-center gap-2">
              <i class="fas fa-users text-gray-600"></i>
              <span class="text-sm text-gray-800 truncate w-48">{{ group.name }}</span>
            </div>
            <span class="text-xs text-gray-500">
              {{ group.member_count ?? 0 }} عضو
            </span>
          </li>
          <li v-if="!userGroups.length" class="text-center text-gray-400 py-4">
            شما در هیچ گروهی عضو نیستید
          </li>
        </ul>
      </div>
    </div>
  </div>

  <div v-if="activeTab === 'out'" class="text-xs flex flex-col h-full min-h-0">
    <div class="overflow-y-auto">
      <LayerTree :items="History" :viewer="viewer" :depth="0" :selectedGroup="selectedGroup" :selectGroup="selectGroup" :Icons="['back']"/>
    </div>
  </div>

  <ExportDialog v-model="exportDialog" @confirm="Export" />
  <SaveDialog v-model="createFolderDialog" @confirm="createFolder" />
  <!--<OpenDialog v-model="openDialog"  />-->

  <SendDialog  :show="OpenSend" @submit="send" @cancel="OpenSend = false"/>
  <LoadCSV :rows="csvRows" :viewer="viewer" ref="csvRef" :pins="props.pins"/>
  <Loading :active="loading" />
 </div>
</template>

<script setup>

import {ref, toRaw, onMounted, onUnmounted, watch, provide, inject} from "vue";
import { useRoute } from 'vue-router'
import axios from "axios";
import moment from 'moment-jalaali'
import Papa from 'papaparse'
import {useAuthStore} from '../stores/auth';
import ItemBox from "./ItemBox.vue";
import UsersDepSelect from "./UsersDepSelect.vue";
import SaveDialog from '../components/SaveDialog.vue'
import ExportDialog from '../components/ExportDialog.vue'
import OpenDialog from '../components/OpenDialog.vue'
import SendDialog from '../components/SendDialog.vue'
import Loading from '../components/Loading.vue'
import LayerTree from "../components/LayerTree.vue";
import LoadCSV from "../components/LoadCSV.vue";
import {useToast} from "vue-toast-notification";
import { useSharedArray } from '../stores/app'

const {getExtentedIds,getVisibleIds, isExtented, isVisible, setExtentedIds,setVisibleIds, extentedIds, visibleIds} = useSharedArray()

const SERVER = import.meta.env.VITE_SERVER //?? 'http://localhost:3001';
const authStore = useAuthStore();
const $toast = useToast();

const DepsModal = ref(false);
//const pins = ref([]);
const csvRef = ref(null)
const pin_id = ref(0);
const index_pin_id = ref(-1);
const exportDialog = ref(false)
const createFolderDialog = ref(false)
const openDialog = ref(false)
const OpenSend = ref(false)
const isShow = ref(true)
const loading = ref(false)
const isActive = ref(false)
const activeTab = ref("my2")
const sharedSubTab = ref("files")
const inboxFiles = ref([]);
const userGroups = ref([]);
const users = ref([]);
const unreadCount = ref(0);
const csvRows = ref([])
const exportDataSource = new Cesium.CustomDataSource("exportPins");

const emit = defineEmits([ "update:openDia", "clearPins", "close"]);
const props = defineProps({
  pins: { type: Object, required: true },
  viewer: { type: Object, required: true },
  openId : { type: Object, required: true },
  openDia: Function ,
  close: { type: Boolean, default: false },
});
let inbox_ds= null;
let intervalId = null;
let openedIds=[];

const History = ref([])
const myWorks = ref([])
const selectedGroup = ref(null)

const SelectGroup = inject('SelectGroup', null)

function selectGroup(group) {
  selectedGroup.value = group
}

const saveIds = () => {
  setExtentedIds();
  setVisibleIds();
}


// window.addEventListener("beforeunload", () => {
// })

onMounted(async () => {
  //await fetchPins();
  if (authStore.user) {
    inbox_ds= new Cesium.CustomDataSource("inbox");
    props.viewer.dataSources.add(inbox_ds);


    // const extentedIds = JSON.parse(localStorage.getItem("expandedIds") || "[]");
    // const visibleIds = JSON.parse(localStorage.getItem("visibleIds") || "[]");

    await getExtentedIds();
    await getVisibleIds();

    console.log('Mounted : ' , authStore.user )

    await loadWorks();
    await loadInbox();
    await loadUserGroups();
    if (authStore.isAdmin || authStore.isGroupManager) await load_Users();
    intervalId = setInterval(loadInbox, 20000)

    for (let pin of props.pins) {
      pin.check = false;
    }
  } else {
    const token = route.params.token

    if (token) {
      await getData(token)
    }


  }
});

const route = useRoute()

async function getData(token) {
  emit('clearPins')
  myWorks.value = []
  loading.value = true
  try {
    const result = await axios.post(SERVER + '/api/load/link/', {token : token}) // یا هر مسیری که داری
    const res = result.data;
    if (res.success) {
      const i = res.data;
      let pin = {
        id: i.obj_id,
        name: i.name,
        shape: i.type == 'draw' ? JSON.parse(i.content) : {show: true},
        content: i.type == 'file' ? i.content : '',
        date: i.createdAt,
        type: i.type,
        save: i.id,
        parent_id: i.parent_id,
        archive: i.archive
      }
      pin.shape.show = true
      pin.shared = true
      props.pins.push(pin)
      await drawPin(pin, true)
      props.viewer.camera.flyToBoundingSphere(pin.bounding, {
        duration: 1.5,
        offset: new Cesium.HeadingPitchRange(
            0,
            -90,
            0
        )
      });

    } else {
      console.log(res.message)
    }

  } catch (err) {
    console.error('خطا در دریافت pins از سرور', err)
  } finally {
    loading.value = false
  }}

onUnmounted(() => {
  clearInterval(intervalId)
})

watch(() => authStore.isLogin, async (isLogin) => {
  if (isLogin) {
    if (authStore.user) {
      console.log('watch : ' , authStore.user )
      await loadWorks();
      await loadInbox();
      for (let pin of props.pins) {
        pin.check = false;
      }
    }
  }
})

const getTitle = (file) => {
  let user = users.value.find(a=> a.id == file.sender_id)
  return (file.MyWork?.name??'') + '  (' + (user.name?? user.username) + ')';
}

const loadUserGroups = async () => {
  if (!authStore.user) return
  try {
    const res = await axios.get(SERVER + "/api/auth/me")
    const me = res.data?.data ?? res.data
    const groups =
        me?.Groups ??
        me?.groups ??
        me?.group_ids?.map(id => ({ id })) ?? []
    const rawGroups = Array.isArray(groups) ? groups : []

    userGroups.value = await Promise.all(
      rawGroups.map(async (g) => {
        if (g.member_count != null) return g
        if (Array.isArray(g.Users) || Array.isArray(g.users)) return { ...g, member_count: (g.Users ?? g.users).length }
        try {
          const r = await axios.get(SERVER + `/api/groups/${g.id}/users/`)
          const users = r.data?.data ?? r.data
          return { ...g, member_count: Array.isArray(users) ? users.length : 0 }
        } catch {
          return { ...g, member_count: 0 }
        }
      }),
    )
  } catch (error) {
    console.error('Error loading user groups:', error)
    userGroups.value = []
  }
};

const load_Users = async () => {
  try {
    const response = await axios.get(SERVER + '/api/users');
    users.value = response.data;
  } catch (error) {
    console.log('Error loading users:', error);
  }
};

const hide = (pin) => {
  if (pin.type == 'file') {
  if (pin.shape)
    pin.shape.show = !pin.shape.show;

  } else {
    const drawDataSource = props.viewer.dataSources.getByName("pins")[0];
    let entity = drawDataSource.entities.getById(pin.id);
    if (entity) {
      entity.show = !entity.show;
      pin.shape.show = entity.show;
    }
  }
};

const loadInbox = async () => {
  if (authStore.user) {
    inboxFiles.value = [];
    try {
      const response = await axios.get(SERVER + '/api/inbox/' + authStore.user?.id);
      //inboxFiles.value = response.data;
      const incoming = response.data;

      for (let item of incoming) {
        let existing = inboxFiles.value.find(f => f.id === item.id);
        if (!existing) {
          inboxFiles.value.push(item);
        }
      }

      unreadCount.value = inboxFiles.value.filter(a => !a.opened).length
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }
};

const drawInbox = async (idx) => {
  const viewer = props.viewer
  const pin = inboxFiles.value[idx].MyWork
  try {
    await axios.post(SERVER + "/api/inbox/opened", {id: inboxFiles.value[idx].id})
    inboxFiles.value[idx].opened=true;
    unreadCount.value--;

  } catch (err) {
    console.error("Failed to sync opened state", err)
  }

  if (!viewer) return

  if (pin.show != undefined) {
    pin.show =pin.show;
    pin.entity.show = ! pin.entity.show;
    return
  }
  if (pin.type == 'draw') {
    pin.shape = JSON.parse(pin.content);
    const entity = drawShape(viewer, pin , 'inbox')
    pin.entity = entity;
  }

  // 2) اگر فایل KML دارد → از فولدر کاری بخوان و لود کن
  else if (pin.name) {
    await drawKML(viewer,pin, 'inbox')
  }
  pin.show = true;
  console.log('run draw ')
}

const loadWorks = async () => {
  if (authStore.user) {
    emit('clearPins')
    myWorks.value = []
    loading.value = true
    try {
      const res = await axios.get(SERVER + '/api/load/myWork/' + authStore.user?.id) // یا هر مسیری که داری
      //props.pins = res.data   // فرض می‌کنیم همین آرایه pinها را برمی‌گرداند

      //=== Insert to myWorks Array
      for (let i of res.data) {
        let pin = {
          id: i.obj_id,
          name: i.name,
          shape: i.type == 'draw' ? JSON.parse(i.content) : {show: true},
          content: i.type == 'file' ? i.content : '',
          date: i.createdAt,
          type: i.type,
          save: i.id,
          parent_id : i.parent_id,
          archive : i.archive
        }
        pin.shape.show = isVisible(i.obj_id
        );
        myWorks.value.push(pin);
      }
      //=== All Items Group by folder
      let tmp = groupBy(myWorks.value);

      //=== Get History Items
      let tmp2 = tmp.filter(a=> a. archive !== null);
      History.value = groupByCreatedAtDay(tmp2);

      //=== Desktop Items without Groups in Pins
      tmp = tmp.filter(a=> a. archive == null);
      props.pins.push(...tmp)
      await drawPins()

    } catch (err) {
      console.error('خطا در دریافت pins از سرور', err)
    } finally {
      loading.value = false
    }
  }
}

function groupByCreatedAtDay(items) {
  // 1) گروه‌بندی با Map
  const map = new Map(); // key: 'YYYY-MM-DD' -> group

  for (const item of items) {
    const dayKey = new Date(item.date).toISOString().slice(0, 10); // YYYY-MM-DD

    if (!map.has(dayKey)) {
      map.set(dayKey, {
        //id: `day-${dayKey}`,       // می‌تونی عددی هم بسازی
        id: dayKey,
        name: moment(dayKey).format('jYYYY/jMM/jDD'),              // یا فرمت فارسی (پایین‌تر توضیح دادم)
        type: "group",
        history : true ,
        expanded: false , //isExtented(dayKey),
        children: [],
      });
    }

    const group = map.get(dayKey);
    if (item.type == 'group') {
      const chd=[]
      for (const row of item.children) {
        row.shape.show=false;
         chd.push({
          id: row.id,                         // یا `${dayKey}-${item.id}`
          name: row?.name ?? "بدون نام",
          type: row.type,
          save: row.save,
          shape: row.shape,
          content: row.content,
          dataSource: row,
          obj_id: row?.obj_id,
          bounding: row.bounding
        });
      }
      group.children.push({
        id: item.id,                         // یا `${dayKey}-${item.id}`
        name: item?.name ?? "بدون نام",
        type: item.type,
        save: item.save,
        children : chd
      })


    } else {

      isVisible(item.id) ? item.shape.show = true : item.shape.show = false
      // 2) تبدیل هر رکورد به لایه (child)
      item.shape.show=false;
      group.children.push({
        id: item.id,                         // یا `${dayKey}-${item.id}`
        name: item?.name ?? "بدون نام",
        type: item.type,
        save: item.save,
        shape: item.shape,
        content: item.content,
        dataSource: item,
        obj_id: item?.obj_id,
        bounding: item.bounding
        // workType: item?.MyWork?.type,
      });
    }
  }

  // 3) خروجی نهایی + مرتب‌سازی بر اساس تاریخ (جدیدتر بالا)
  return Array.from(map.values()).sort((a, b) => (a.name < b.name ? 1 : -1));
}

function groupBy(items) {
  const map = {};
  const tree = [];

  // ۱. ایجاد یک نقشه (Map) برای دسترسی سریع به آیتم‌ها
  items.forEach(item => {
    item.expanded = true;
    map[item.save] = { ...item, children: [] };
  });

  // ۲. ساخت درخت
  items.forEach(item => {
    if (item.parent_id !== null && item.parent_id > -1) {
      // اگر parent داشت، به لیست فرزندان والد اضافه شود
      if (map[item.parent_id]) {
        map[item.parent_id].children.push(map[item.save]);
      }
    } else {
      // اگر parent نداشت، سرگروه است و به ریشه اضافه می‌شود
      tree.push(map[item.save]);
    }
  });

  return tree;
}

const saveOneWorks = async (item) => {
  try {

    const formData = new FormData();

    formData.append("type", item.type);
    formData.append("name", item.name);
    formData.append("obj_id", item.id);

    if (item.type === 'file') {
      formData.append("file", item.file);
    } else {
      formData.append("content", JSON.stringify(toRaw(item.shape)));
    }

    const res = await axios.post(SERVER + '/api/Save/myWork/' + authStore.user.id, formData,
        { headers: { "Content-Type": "multipart/form-data" } })

    console.log(res.data)

  } catch (err) {
    console.error(err)
  }
}

const saveWorks = async () => {
  try {
    const formData = new FormData();
    const items = [];

    for (const pin of props.pins) {
      if (pin.save < 0) {
        if (pin.type === "file" && pin.file instanceof File) {
          formData.append("files", pin.file);
          items.push({
            id: pin.id,
            name: pin.name,
            type: pin.type,
            obj_id: pin.obj_id
          });
        } else {
          items.push(pin);
        }
      }
    }

    formData.append("items", JSON.stringify(items));

    await axios.post("/api/save/myWorks" + authStore.user?.id, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
  } catch (err) {
    console.error(err)
  }
}

const createFolder = async (name) => {
  try {

    const payload = {
      type: 'group',
      name: name,
    }
    const res = await axios.post(SERVER + '/api/createFolder/' + authStore.user?.id, payload)
    console.log(res.data)

  } catch (err) {
    console.error(err)
  }
}

const ArchiveDesktop = async () => {
  const confirmed = window.confirm("تمامی آیتم های میز کار به بخش آرشیو منتقل میشوند ، مطمئن هستید ؟");
  if (!confirmed) return;

  let ids=[];
  for (const item of props.pins) {
    ids.push(item.save);
  }
  const res = await axios.post(SERVER + '/api/archive' , {ids : ids})
  console.log(res)
  emit('clearPins')
}

const send = async (data) => {

  let pin = props.pins[index_pin_id.value];
  const form = new FormData();
  form.append("sender_id", authStore.user.id);
  form.append("receiver_id", data.selected);
  form.append("document_id", pin.save);
  form.append("descr", data.description);
  if (pin.save < 0) {
    let rec = {
      name : pin.name,
      content : pin.content,
      type : pin.type,
      obj_id : pin.id,
    }
    form.append("name", pin.name);
    form.append("pin",  JSON.stringify(rec));
  }
  if (pin.type == 'file' && pin.content== null) {
    // const fileHandle = await dirHandle.value.getFileHandle(pin.name);
    // const file = await fileHandle.getFile();
    form.append("file", pin.file);
  }
  let res = await axios.post(SERVER + '/api/sendTo', form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  OpenSend.value=false;
  showMessage('آیتم مورد نظر ارسال شد' , 'success')
 };

function showMessage(msg , type) {
  $toast.open({
    message: msg,
    type: type,
    duration: 4000   // ۲ ثانیه
  });
}

function NewWork() {
  const drawDataSource = props.viewer.dataSources.getByName("pins")[0];
  drawDataSource.entities.removeAll();
    while (props.pins.length > 0) {
    props.pins.pop();
  }
  props.openId.value=null;
}

function allView() {
  const drawDataSource = props.viewer.dataSources.getByName("pins")[0];
  drawDataSource.show = !drawDataSource.show;
  isShow.value=drawDataSource.show;
}

const zoomOnPin = async (idx) => {
  //const pin = props.pins.find(x => x.id == id)
  const pin = props.pins[idx];
  let b = pin.bounding;
  if (pin.save < 0 ) {
    const toCartesian = (p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height || 0)
    const positionsCartesian = pin.shape.positions.map(toCartesian)
    pin.bounding = pin.bounding = Cesium.BoundingSphere.fromPoints(positionsCartesian);
  }
  props.viewer.camera.flyToBoundingSphere(pin.bounding, {
    duration: 1.5,
    offset: new Cesium.HeadingPitchRange(
        0,
        -90,
        0
    )
  });

}

const deletePin = async (p) => {
  try {
    let pins = props.pins;
    const confirmed = window.confirm("آیا مطمئن هستید که می‌خواهید این پین را حذف کنید؟");
    if (!confirmed) return;

    const pinsDS = props.viewer.dataSources.getByName("pins")[0];
    const pin = pins.find(x => x.id == p.id)
    const index = pins.findIndex(x => x.id == p.id)
    if (pin.save > -1)
      await axios.delete(SERVER + '/api/delWork?id=' + pin.save + '&userId=' + authStore.user.id);

    if (pin) {
      if (pin.type == 'file') {
        props.viewer.dataSources.remove(pin.shape)
      } else {
        pinsDS.entities.removeById(pin.id);
      }
      pins.splice(index, 1)
    }
    showMessage('گزینه مورد نظر حذف شد','success')
  } catch (e) {
    showMessage('خطا در حذف گزینه مورد نظر','error')
  }

}

const fetchPins = async () => {
  const res = await axios.get(SERVER + '/api/pins/' + authStore.user.id);
  pins.value = res.data;
};

function addPinToExport(pin) {

  // اگر KML باشد
  if (pin.id === 'file' && pin.shape?.show && pin.shape?.entities) {
    pin.shape.entities.values.forEach(entity => {
      exportDataSource.entities.add(entity);
    });
  }

  // اگر ترسیم باشد
  else if (pin.shape?.show) {

    if (pin.shape.type === "polyline") {

      const positions = pin.shape.positions.map(p =>
          Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height || 0)
      );

      exportDataSource.entities.add({
        name: pin.name,
        polyline: {
          positions,
          width: pin.shape.width,
          material: Cesium.Color.fromCssColorString(pin.shape.color)
        }
      });
    }

    else if (pin.shape.type === "polygon") {

      const positions = pin.shape.positions.map(p =>
          Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height || 0)
      );

      exportDataSource.entities.add({
        name: pin.name,
        polygon: {
          hierarchy: positions,
          material: Cesium.Color.fromCssColorString(pin.shape.color).withAlpha(0.5)
        }
      });
    }

    else if (pin.shape.type === "point") {

      exportDataSource.entities.add({
        name: pin.name,
        position: Cesium.Cartesian3.fromDegrees(
            pin.shape.lon,
            pin.shape.lat,
            pin.shape.height || 0
        ),
        point: {
          pixelSize: 10,
          color: Cesium.Color.fromCssColorString(pin.shape.color)
        }
      });
    }
  }

  // فرزندان
  if (pin.children?.length) {
    pin.children.forEach(child => addPinToExport(child));
  }
}

function Export(filename, exportType) {

  if (exportType == 'csv') {

    const rows = [
      ['shapeIndex', 'lon', 'lat', 'height']
    ];
    let csvContent = '';
    props.pins.forEach((pin, pinIndex) => {

      if (!pin.shape?.positions || !Array.isArray(pin.shape.positions) ||
          !pin.shape.show ||   pin.type !== 'draw' ) {
        return;
      }

      csvContent += pin.name + '\n';
      csvContent += `polygon : \n`;
      csvContent += 'lat,lon\n';

      pin.shape.positions.forEach(pos => {
        csvContent += `${pos.lat},${pos.lon}\n`;
      });

      csvContent += '\n';
    });

    const blob = new Blob( [csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();

    URL.revokeObjectURL(url);

  } else {
    props.pins.forEach(pin => {
      addPinToExport(pin);
    });
    exportDataSource.entities.removeAll();
    Cesium.exportKml({
      entities: exportDataSource.entities,
      kmz: false
    }).then(result => {

      const blob = new Blob(
          [result.kml],
          {type: "application/vnd.google-earth.kml+xml"}
      );

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename + ".kml";
      a.click();
    });
  }
}

function Export1(filename) {
  props.pins.forEach(pin => {

    // اگر KML باشد
    if (pin.id === 'file' && pin.shape.show && pin.shape.entities) {
      pin.shape.entities.values.forEach(entity => {
        exportDataSource.entities.add(entity);
      });
    }

    // اگر ترسیم باشد
    else if (pin.shape) {
      if (pin.shape.show) {
        if (pin.shape.type === "polyline") {

          const positions = pin.shape.positions.map(p =>
              Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height || 0)
          );

          exportDataSource.entities.add({
            name: pin.name,
            polyline: {
              positions: positions,
              width: pin.shape.width,
              material: Cesium.Color.fromCssColorString(pin.shape.color)
            }
          });

        }

        if (pin.shape.type === "polygon") {

          const positions = pin.shape.positions.map(p =>
              Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height || 0)
          );

          exportDataSource.entities.add({
            name: pin.name,
            polygon: {
              hierarchy: positions,
              material: Cesium.Color.fromCssColorString(pin.shape.color).withAlpha(0.5)
            }
          });

        }

        if (pin.shape.type === "point") {

          const p = pin.shape;

          exportDataSource.entities.add({
            name: pin.name,
            position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height || 0),
            point: {
              pixelSize: 10,
              color: Cesium.Color.fromCssColorString(pin.shape.color)
            }
          });

        }
      }
    }
  });

  Cesium.exportKml({
    entities: exportDataSource.entities,
    kmz: false
  }).then(result => {

    const blob = new Blob([result.kml], { type: "application/vnd.google-earth.kml+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename + ".kml";
    a.click();

  });

}

function exportGeoJSON(dataSource) {
  const entities = dataSource.entities.values;
  const features = [];

  const now = Cesium.JulianDate.now();

  entities.forEach(entity => {
    let geometry = null;

    // ------------------ Polygon ------------------
    if (entity.polygon && entity.polygon.hierarchy) {
      const hierarchy = entity.polygon.hierarchy.getValue(now);
      if (hierarchy && hierarchy.positions) {
        const coords = hierarchy.positions.map(p => {
          const carto = Cesium.Cartographic.fromCartesian(p);
          return [
            Cesium.Math.toDegrees(carto.longitude),
            Cesium.Math.toDegrees(carto.latitude)
          ];
        });

        // بستن حلقه
        if (coords.length > 0) {
          const first = coords[0];
          const last = coords[coords.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            coords.push(first);
          }
        }

        geometry = {
          type: "Polygon",
          coordinates: [coords]
        };
      }
    }

    // ------------------ Polyline ------------------
    else if (entity.polyline && entity.polyline.positions) {
      const positions = entity.polyline.positions.getValue(now);
      if (positions) {
        const coords = positions.map(p => {
          const carto = Cesium.Cartographic.fromCartesian(p);
          return [
            Cesium.Math.toDegrees(carto.longitude),
            Cesium.Math.toDegrees(carto.latitude)
          ];
        });

        geometry = {
          type: "LineString",
          coordinates: coords
        };
      }
    }

    // ------------------ Point ------------------
    else if (entity.position) {
      const pos = entity.position.getValue(now);
      if (pos) {
        const carto = Cesium.Cartographic.fromCartesian(pos);
        geometry = {
          type: "Point",
          coordinates: [
            Cesium.Math.toDegrees(carto.longitude),
            Cesium.Math.toDegrees(carto.latitude)
          ]
        };
      }
    }

    // اگر هندسه معتبر ساخته شده
    if (geometry) {
      // استخراج properties — تبدیل کامل Cesium Property به آبجکت ساده
      let props = {};

      if (entity.properties) {
        const propNames = entity.properties.propertyNames;
        propNames.forEach(name => {
          const val = entity.properties[name].getValue(now);
          props[name] = val;
        });
      }

      // نام
      if (entity.name) props.name = entity.name;

      // توضیحات (معمولاً ConstantProperty با HTML)
      if (entity.description) {
        const desc = entity.description.getValue(now);
        if (typeof desc === "string") props.description = desc;
      }

      features.push({
        type: "Feature",
        properties: props,
        geometry: geometry
      });
    }
  });

  return {
    type: "FeatureCollection",
    features: features
  };
}

const handleFileUpload = async (event) => {

  const viewer= props.viewer
  const file = event.target.files[0]
  if (!file) return

  const fileName = file.name.toLowerCase()
  let DataSource;
  loading.value = true;
  let pin;
  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {

    Papa.parse(file, { header: true, skipEmptyLines: true, complete(results) {
        csvRows.value = results.data
        console.log( 'rows count:', csvRows.value.length )
      },
      error(error) {
        console.error(error)
      }
    })
    loading.value = false;
    csvRef.value?.open(fileName);
    return
  }

  // فایل KML
  if (fileName.endsWith(".kml") || fileName.endsWith(".kmz")) {

    // axios.post('/api/mywork', { name: file.name, type: 'file' })

    const loadFile = async (file) => {
      try {
        // Cesium به صورت خودکار هم KML و هم KMZ را پشتیبانی می‌کند
        DataSource = await Cesium.KmlDataSource.load(file, {
          camera: viewer.scene.camera,
          canvas: viewer.scene.canvas,
        });

        await viewer.dataSources.add(DataSource);

        await viewer.flyTo(DataSource, {
          duration: 2,
          offset: new Cesium.HeadingPitchRange(
              Cesium.Math.toRadians(0),
              Cesium.Math.toRadians(-90),
              0
          )
        });

        loading.value = false;
        let savedCameraView = {
          position: viewer.camera.position.clone(),
          heading: viewer.camera.heading,
          pitch: viewer.camera.pitch,
          roll: viewer.camera.roll
        };

        const id = crypto.randomUUID()
        console.log(id);
        //loadedFiles.value.push(row);
        pin = {
          id : id ,
          name : fileName,
          shape : DataSource,
          date :  new Date(),
          bounding: savedCameraView,
          save : -1,
          type : 'file',
          file : file
        }

        if (SelectGroup.value !== null) {
          pin.parent_id = props.pins[SelectGroup.value].save?? -1;
          props.pins[SelectGroup.value].children.push(pin);
        }
        else {
          pin.parent_id = -1;
          props.pins.push(pin);
        }

      } catch (error) {
        console.error("خطا در بارگذاری فایل:", error);
        loading.value = false;
      }
    };

    // تبدیل File به URL
    const url = URL.createObjectURL(file);
    await loadFile(url);
    URL.revokeObjectURL(url); // پاکسازی حافظه
  }

  // فایل ZIP شامل SHP
  else if (fileName.endsWith(".zip")) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result
        const geojson = await shp(arrayBuffer)
        DataSource = await Cesium.GeoJsonDataSource.load(geojson)
        await viewer.dataSources.add(DataSource)
        await viewer.flyTo(DataSource, {
          duration: 2,
          offset: new Cesium.HeadingPitchRange(
              Cesium.Math.toRadians(0),   // heading (جهت)
              Cesium.Math.toRadians(-90), // pitch (زاویه عمودی) - 90- درجه
              0                           // range (فاصله - 0 یعنی محاسبه خودکار)
          )
        }).then(() => {
          loading.value = false;
          let savedCameraView = {
            position: viewer.camera.position.clone(),
            heading: viewer.camera.heading,
            pitch: viewer.camera.pitch,
            roll: viewer.camera.roll
          };
          let row = {
            name: fileName,
            bounding: savedCameraView,
            dataSource : DataSource
          }
          const id = crypto.randomUUID()
          console.log(id);
          //loadedFiles.value.push(row);
          pin = {
            id : id ,
            name : fileName,
            shape : DataSource,
            date :  new Date(),
            bounding: savedCameraView,
            save : -1,
            type : 'file'
          }
          if (SelectGroup.value !== null) {
            pin.parent_id = props.pins[SelectGroup.value].save?? -1;
            props.pins[SelectGroup.value].children.push(pin);
          }
          else {
            pin.parent_id = -1;
            props.pins.push(pin);
          }

        });

      } catch (error) {
        console.error("خطا در بارگذاری Shapefile:", error)
        loading.value = false;
      }
    }
    reader.readAsArrayBuffer(file)
  } else {
    alert("فقط فایل‌های KML و kmz پشتیبانی می‌شوند.")
    loading.value = false;
  }
  pin.file = file;
  await saveOneWorks(pin);
}

//=========================================================

function drawShape(viewer, pin , dataSource = 'pins' , visible = false) {
  const shape = pin.shape
  if (!shape || !shape.type) return null

  const type = shape.type.toLowerCase()
  // const ds= new Cesium.CustomDataSource("pins");
  // viewer.dataSources.add(ds)
  const ds = viewer.dataSources.getByName(dataSource)[0];

  // Helper for converting positions (lon,lat,height)
  const toCartesian = (p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height || 0)

  if (type === 'polyline') {
    const positionsCartesian = shape.positions.map(toCartesian)

     const enty = ds.entities.add({
      id: pin.id,
      name: pin.name,
      description: shape.description,
      polyline: {
        positions: positionsCartesian,
        width: shape.width || 3,
        clampToGround: shape.clampToGround || false,
        material: Cesium.Color.fromCssColorString(shape.color || '#ff0000'),
        show: true
      }
    })
    enty.show = isVisible(pin.id);
    if (visible) enty.show = true;
    pin.bounding = Cesium.BoundingSphere.fromPoints(positionsCartesian);
    return (enty)
  }

  if (type === 'polygon') {

    const positionsCartesian = shape.positions.map(toCartesian)
    const hierarchy = positionsCartesian
    let clr= shape.color
    try {
      clr = Cesium.Color.fromCssColorString(shape.color || '#ff0000').withAlpha(0.5)
    } catch (e) {
      clr= shape.color
    }
    const enty = ds.entities.add({
      id: pin.id,
      name: pin.name,
      description: shape.description,
      polygon: {
        hierarchy: hierarchy,
        material: clr,
        outline: shape.outline !== false,
        outlineWidth: shape.outlineWidth || 2,
        outlineColor: Cesium.Color.fromCssColorString(shape.outlineColor || '#ff0000'),
        height: shape.height || 0,
        show: true
      }
    })
    enty.show = isVisible(pin.id);
    if (visible) enty.show = true;
    pin.bounding = Cesium.BoundingSphere.fromPoints(positionsCartesian)

    return enty
  }

  if (type === 'point') {
    const posObj = { lon: shape.lon, lat: shape.lat };
    const cartesian = toCartesian(posObj);

    if (!cartesian) return;

    // const enty = ds.entities.add({
    //   id: pin.id,
    //   name: pin.name,
    //   description: shape.description,
    //   position: cartesian, // اینجا باید یک Cartesian3 تکی باشد
    //   point: {
    //     pixelSize: shape.pixelSize || 3,
    //     color: Cesium.Color.fromCssColorString(shape.color || '#ff0000'),
    //     outlineColor: Cesium.Color.fromCssColorString(shape.color || '#ff0000'),
    //     outlineWidth: shape.outlineWidth || 1,
    //     show: true
    //   }
    // });

    const enty = ds.entities.add({
      id: pin.id,
      name: pin.name,
      description: shape.description,
      position: cartesian, // اینجا باید یک Cartesian3 تکی باشد
      billboard: {
        image: "pin.png",
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        width: 32,
        height: 32,
        show: true
      },
    });

    enty.show = isVisible(pin.id);
    if (visible) enty.show = true;
    pin.bounding = new Cesium.BoundingSphere(cartesian, 2.0);

    return enty;
  }
  
  if (type === 'multi_point') {
    const ds= new Cesium.CustomDataSource(pin.id);
    props.viewer.dataSources.add(ds);

    for (const i in shape.positions) {
      const cartesian = toCartesian({ lon: shape.positions[i].lon, lat: shape.positions[i].lat });
      if (!cartesian) continue;
      const color = shape.positions[i].color
      const enty = ds.entities.add({
        // id: pin.id,
        name: i,
        sh_id: pin.id,
        description: 'multi_point',
        //description: shape.description,
        position: cartesian,
        point: {
          pixelSize: shape.pixelSize || 5,
          color: Cesium.Color.fromCssColorString(color || '#ff0000'),
          outlineColor: Cesium.Color.fromCssColorString('#ffffff'),
          outlineWidth: shape.outlineWidth || 1,
          show: true
        }
      });

    }
    const positionsCartesian = shape.positions.map(toCartesian)
    if (visible) enty.show = true;
    //enty.show = isVisible(pin.id);
    pin.bounding = Cesium.BoundingSphere.fromPoints(positionsCartesian);

    //return enty;
  }

  if (type === 'billboard') {

    const position = toCartesian(shape.position)

    const enty = ds.entities.add({
      id: pin.id,
      name: pin.name,
      description: shape.description,
      position: position,
      billboard: {
        image: shape.image,
        width: shape.width || 32,
        height: shape.height || 32,
        scale: shape.scale || 1.0,
        show: true
      }
    })
    enty.show = isVisible(pin.id);
    pin.bounding = Cesium.BoundingSphere.fromPoints([position])

    return enty
  }

  if (type === 'rectangle') {

    const rect = Cesium.Rectangle.fromDegrees(
        shape.west,
        shape.south,
        shape.east,
        shape.north
    )

    const positions = [
      Cesium.Cartesian3.fromDegrees(shape.west, shape.south),
      Cesium.Cartesian3.fromDegrees(shape.west, shape.north),
      Cesium.Cartesian3.fromDegrees(shape.east, shape.south),
      Cesium.Cartesian3.fromDegrees(shape.east, shape.north)
    ]

    const enty = ds.entities.add({
      id: pin.id,
      name: pin.name,
      description: shape.description,
      rectangle: {
        coordinates: rect,
        height: shape.height || 0,
        material: Cesium.Color.fromCssColorString(shape.fillColor || 'rgba(255,0,0,0.2)'),
        outline: shape.outline !== false,
        outlineColor: Cesium.Color.fromCssColorString(shape.outlineColor || '#ff0000'),
        outlineWidth: shape.outlineWidth || 2,
        show: true
      }
    })
    enty.show = isVisible(pin.id);
    if (visible) enty.show = true;
    pin.bounding = Cesium.BoundingSphere.fromPoints(positions)

    return enty
  }

  if (type === 'ellipse') {

    const center = toCartesian(shape.center)

    const enty = ds.entities.add({
      id: pin.id,
      name: pin.name,
      description: shape.description,
      position: center,
      ellipse: {
        semiMajorAxis: shape.semiMajorAxis,
        semiMinorAxis: shape.semiMinorAxis,
        rotation: Cesium.Math.toRadians(shape.rotation || 0),
        height: shape.height || 0,
        material: Cesium.Color.fromCssColorString(shape.fillColor || 'rgba(255,0,0,0.3)'),
        outline: shape.outline !== false,
        outlineWidth: shape.outlineWidth || 2,
        outlineColor: Cesium.Color.fromCssColorString(shape.outlineColor || '#ff0000'),
        show: true
      }
    })
    enty.show = isVisible(pin.id);
    if (visible) enty.show = true;
    pin.bounding = new Cesium.BoundingSphere(center, shape.semiMajorAxis)

    return enty
  }

  if (type === 'circle') {

    const center = toCartesian(shape.center)

    const enty = ds.entities.add({
      id: pin.id,
      name: pin.name,
      description: shape.description,
      position: center,
      ellipse: {
        semiMajorAxis: shape.radius,
        semiMinorAxis: shape.radius,
        height: shape.height || 0,
        material: Cesium.Color.fromCssColorString(shape.fillColor || 'rgba(0,0,255,0.3)'),
        outline: shape.outline !== false,
        outlineColor: Cesium.Color.fromCssColorString(shape.outlineColor || '#0000ff'),
        outlineWidth: shape.outlineWidth || 2,
        show: true
      }
    })
    enty.show = isVisible(pin.id);
    if (visible) enty.show = true;
    pin.bounding = new Cesium.BoundingSphere(center, shape.radius)

    return enty
  }

  if (type === 'label') {
    return ds.entities.add({
      id: pin.id,
      name: pin.name,
      description: shape.description,
      position: toCartesian(shape.position),
      label: {
        text: shape.text || '',
        font: `${shape.fontSize || 16}px sans-serif`,
        fillColor: Cesium.Color.fromCssColorString(shape.color || '#ffffff'),
        outlineColor: Cesium.Color.fromCssColorString(shape.outlineColor || '#000000'),
        outlineWidth: shape.outlineWidth || 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        show: shape.show !== false,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(
            shape.offsetX || 0,
            shape.offsetY || 0
        )
      }
    })
  }

  // Unknown type
  return null
}

async function drawKML(viewer, pin , visible = false) {
  try {
    const url = SERVER + '/uploads/pins/' + pin.content;
    const dataSource = await Cesium.KmlDataSource.load(url, {
      camera: viewer.camera,
      canvas: viewer.canvas,
      // اگر فایل‌های محلی (مثل آیکون‌ها) داخل KMZ هستند، این گزینه کمک می‌کند
      //clampToGround: true
    });

    viewer.dataSources.add(dataSource);

    const time = viewer.clock.currentTime;
    const entities = dataSource.entities.values;
    const positions = [];

    exportDataSource.entities.removeAll();
    entities.forEach(entity => {
      entity._pinId = pin.id;
      //exportDataSource.entities.add(entity);

      if (entity.position) {
        const p = entity.position.getValue(time);
        if (p) positions.push(p);
      }

      if (entity.polyline?.positions) {
        const ps = entity.polyline.positions.getValue(time);
        if (ps) positions.push(...ps);
      }

      if (entity.polygon?.hierarchy) {
        const h = entity.polygon.hierarchy.getValue(time);
        if (h?.positions) positions.push(...h.positions);
      }

      if (entity.rectangle?.coordinates) {
        const rect = entity.rectangle.coordinates.getValue(time);
        if (rect) {
          const corners = Cesium.Rectangle.subsample(rect);
          positions.push(...corners);
        }
      }

      if (entity.ellipse) {
        const p = entity.position?.getValue(time);
        if (p) positions.push(p);
      }

      if (entity.corridor?.positions) {
        const ps = entity.corridor.positions.getValue(time);
        if (ps) positions.push(...ps);
      }

      if (entity.wall?.positions) {
        const ps = entity.wall.positions.getValue(time);
        if (ps) positions.push(...ps);
      }

    });

    pin.bounding = Cesium.BoundingSphere.fromPoints(positions);
    pin.shape = dataSource;
    //pin.export = exportDataSource;
    pin.shape.show = isVisible(pin.id);
    if (visible) pin.shape.show = true;
    pin.loaded = true;

    // زوم کردن روی فایل لود شده (اختیاری)
    // viewer.zoomTo(dataSource);

    console.log(`✅ فایل با موفقیت لود شد: ${pin.name}`);
    return dataSource;

  } catch (err) {
    console.error('خطا در خواندن یا لود KML/KMZ از فولدر کاری:', pin.name, err);
    return null;
  }
}

const drawPins = async () => {
  const viewer = props.viewer
  const pins = props.pins

  if (!viewer) return

  // اگر می‌خواهی قبل از رسم جدید همه را پاک کنی:
  // viewer.entities.removeAll()
  // viewer.dataSources.removeAll()

  for (const pin of pins) {

    if (pin.type == 'group') {
      for (const ch_pin of pin.children) {

        if (ch_pin.type == 'draw') {
          const entity = drawShape(viewer, ch_pin)
          ch_pin.entity = entity;
        }

        else if (ch_pin.type == 'file')  {
          await drawKML(viewer, ch_pin)
        }

      }
    }

    // 1) اگر shape دارد → ترسیم روی Cesium
    if (pin.type == 'draw') {
      const entity = drawShape(viewer, pin)
      pin.entity = entity;
    }

    // 2) اگر فایل KML دارد → از فولدر کاری بخوان و لود کن
    else if (pin.type == 'file')  {
        await drawKML(viewer, pin)
    }
  }

}

const drawPin = async (pin , visible = false) => {
  const viewer = props.viewer

    if (pin.type == 'draw') {
      const entity = drawShape(viewer, pin , visible)
      pin.entity = entity;
    }

    // 2) اگر فایل KML دارد → از فولدر کاری بخوان و لود کن
    else if (pin.type == 'file')  {
        await drawKML(viewer, pin , visible)
    }

}

provide('drawPin', drawPin)

defineExpose({ fetchPins })
</script>

<style scoped>
.rev {
  transform: scaleX(-1); /* افقی برعکس */
}
</style>

