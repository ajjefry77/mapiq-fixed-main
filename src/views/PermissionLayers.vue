<template>
  <div class="min-h-screen">
    <main class="flex-1 overflow-auto">

      <div class="p-6 grid grid-cols-3 gap-6">

        <!-- Users/Roles Column -->
        <div class="card">

          <button @click="activeTab === 'users' ? OpenUserList = true : OpenRoleList = true" class="p-2 rounded-lg text-sm float-left" style="background: var(--accent); color: #fff;" title="اضافه کردن فضای کاری">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10M19 14v6m3-3h-6"/>
            </svg>
          </button>


          <div class="flex space-x-2 mb-2">
            <button
                class="px-2 py-1 text-sm rounded"
                :class="activeTab === 'users' ? 'bg-blue-500 text-white' : 'bg-white border'"
                @click="activeTab = 'users'" >
              کاربران
            </button>
            <button
                class="px-2 py-1 text-sm rounded"
                :class="activeTab === 'roles' ? 'bg-blue-500 text-white' : 'bg-white border'"
                @click="activeTab = 'roles'" >
                نقش ها
            </button>
          </div>
          <hr style="border-color: var(--border);" class="mt-4 mb-2">
          <div v-if="activeTab === 'users'">
            <h3 class="font-bold text-lg mb-2">کاربران</h3>

            <ul class="mt-3"> <hr>
              <li
                  v-for="user in users"
                  :key="user.id"
                  @click="selectUser(user)"
                  :class="['cursor-pointer p-2 rounded', entityId === user.id ? 'bg-blue-100' : 'hover:bg-gray-200']"
              >
                {{ user.name }}
                <hr>
              </li>
            </ul>
          </div>

          <div v-if="activeTab === 'roles'">
            <h3 class="font-bold text-lg mb-2">نقش ها</h3>
            <ul class="mt-3">
              <li
                  v-for="role in roles"
                  :key="role.id"
                  @click="selectRole(role)"
                  :class="['cursor-pointer p-2 rounded', entityId === role.id ? 'bg-blue-100' : 'hover:bg-gray-200']"
              >
                {{ role.desc }}
              </li>
            </ul>
          </div>


        </div>

        <!-- Workspaces Column -->
        <div class="card">
          <h3 class="font-bold text-lg mb-2" style="display: inline-block">فضاهای کاری</h3>

          <button @click="showModal()" class="p-2 rounded-lg text-sm float-left" style="background: var(--accent); color: #fff;" title="اضافه کردن فضای کاری">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10M19 14v6m3-3h-6"/>
            </svg>
          </button>

          <br/>
          <hr style="border-color: var(--border);" class="mt-2">
          <ul class="mt-3">
            <li
                v-for="work in selectedEntity || []"
                :key="work.id"
                @click="handleWorkspaceToggle(work)"
                :class="['cursor-pointer p-2 rounded', selectedWork === work.name ? 'bg-blue-100' : 'hover:bg-gray-200']">
              {{translate(work.name) }}

              <button  class="text-red-600 hover:text-red-800 float-left"   @click.stop="removeWorkspace(work)" title="حذف">
                <span><i class="fa fa-trash"></i> </span>
              </button>
              <hr>
            </li>
          </ul>
        </div>

        <!-- Layers Column -->
        <div class="card">
          <h3 class="font-bold text-lg mb-2" style="display: inline-block">لایه ها</h3>
          <button @click="setLayer" class="p-2 rounded-lg text-sm float-left" style="background: var(--accent); color: #fff;" title="افزودن لایه های انتخابی">
            <i class="fas fa-check ml-1"></i>
            ثبت تغییرات
          </button>

          <br/>
          <hr style="border-color: var(--border);" class="mt-2 mb-4">
          <div v-for="layer in layers" :key="layer" class="flex items-center mb-2 border-gray-200 border-b-[1px]">
            <input
                type="checkbox"
                :value="layer"
                v-model="selectedLayerNames"
                class="mr-2"
                @change="changeLayer($event, layer)"
            /> &nbsp;
            <label> {{ layer }} </label>

          </div>
        </div>

        <!-- Add Workspace (Modal)-->
        <div v-if="showUserModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 class="font-bold text-lg mb-2" style="display: inline-block">افزودن فضاهای کاری</h3>
            <div class="overflow-y-auto">
              <ul>
                <li
                    v-for="work in workspaces"
                    :key="work.id"
                    @click="addWorkspace(work)"
                    :class="['cursor-pointer p-2 rounded', selectedWork === work.name ? 'bg-blue-100' : 'hover:bg-gray-100']">
                  {{ translate(work.name) }}
                </li>

              </ul>
            </div>
            <div class="flex justify-end space-x-4 space-x-reverse mt-6">
              <button  type="button"  @click="closeUserModal" class="btn btn-secondary">
                انصراف
              </button>
              <button type="submit" class="btn btn-primary" @click="addWorkspace(work)">
                اضافه کردن
              </button>
            </div>

          </div>
        </div>

        <UserSelect :open="OpenUserList"  @close="OpenUserList = false"   @select="addUser"/>
        <RoleSelect :open="OpenRoleList"  @close="OpenRoleList = false"   @select="addRole"/>

      </div>

      <Loading :active="loading" />
    </main>
  </div>
</template>

<script setup>
import {ref, inject, onMounted} from 'vue'

import UserSelect from '../components/UserSelect.vue'
import RoleSelect from '../components/RoleSelect.vue'
import Loading from '../components/Loading.vue'
import { useToast } from "vue-toast-notification";
import axios from 'axios';
//import dict from '../lang.json'

const SERVER = import.meta.env.VITE_SERVER
const dict = inject('dict')
const mbtiles = inject('mbtiles')

const $toast = useToast();
const loading = ref(false)

let OpenUserList = ref(false);
let OpenRoleList = ref(false);

const users = ref([]);
const roles = ref([]);
const selectedEntity = ref(null)
const selectedRole = ref(null)
const selectedWork = ref(null)
const layers = ref([])
const workspaces = ref([]);
const selectedWorkLayers = ref([]);
const selectedLayerNames = ref([]);
const showUserModal = ref(false);
let entityId=1;
let Work=null;
let activeTab = ref("users")

function translate(word) {
  return  dict[word] || dict[word.toLowerCase()] || word;
}

onMounted(() => {
  loadUsers();
  loadRoles();
  //loadWorkspaces();
  fetchLayers()
});

const fetchLayers = async () => {
  const res = await axios.get(SERVER + '/api/layers');
  let layers = res.data;

  const workspaceMap = {}

  layers.forEach(l => {
    const [workspaceName, layerName] = l.name.split(':')

    if (!workspaceMap[workspaceName]) {
      workspaceMap[workspaceName] = []
    }

    workspaceMap[workspaceName].push(layerName)
  })

// تبدیل به آرایه دلخواه
  workspaces.value = Object.entries(workspaceMap).map(([name, layers]) => ({
    name,
    layers
  }))
  for (let item of mbtiles) {
    item.mbtile = 'tile';
    workspaces.value.push(item);
  }
};

const loadUsers = async () => {
  try {
    const response = await axios.get(SERVER + '/api/users3');
    users.value = response.data;
  } catch (error) {
    console.error('Error loading users:', error);
  }
};

const loadRoles = async () => {
  try {
    const response = await axios.get(SERVER + '/api/roles/works');
    roles.value = response.data;
  } catch (error) {
    console.error('Error loading users:', error);
  }
};

const handleWorkspaceToggle = (workspace) => {
  selectedWork.value = workspace.name;
  selectedWorkLayers.value = workspace.layers || [];
  selectedLayerNames.value = workspace.layers;
  //layers.value = workspace.layers;
  Work = workspaces.value.find(u => u.name === workspace.name);
  layers.value = Work.layers;

};

const selectUser = (user) => {
  selectedEntity.value = user.workspaces;
  entityId = user.id;
  selectedWork.value = null;
  selectedWorkLayers.value = [];
  layers.value = [];
}

const selectRole = (role) => {
  selectedEntity.value = role.workspaces;
  entityId = role.id;
  selectedWork.value = null;
  selectedWorkLayers.value = [];
  layers.value = [];
}

const addUser = (user) => {
  let exist = users.value.find(a => a.id == user.id);
  if (!exist) {
    user.workspaces=[];
    users.value.push(user);
  }

}

const addRole = (role) => {
  let exist = roles.value.find(a => a.id == role.id);
  if (!exist) {
    role.workspaces=[];
    roles.value.push(role);
  }

}

const addWorkspace = (work) => {
  let exist = selectedEntity.value.find(a => a.name == work.name);
  if (!exist) selectedEntity.value.push(work)
  showUserModal.value = false;
}

const removeWorkspace =async (work) => {
  let workspace = {
    id: work.id,
    type: "user"
  }
  // if exist in database
  if (work.id) {
    if (activeTab.value == "roles") workspace.type = "role"
    loading.value = true;
    let result = await axios.delete(SERVER +`/api/user/${entityId}/workspace`, {params: {workspace: workspace}});
    loading.value = false;

    if (result.data.status == 0) {
      // remove from array with id
      selectedEntity.value = selectedEntity.value.filter(item => item.id !== work.id);

      if (activeTab.value == "roles") {
        const role = roles.value.find(u => u.id === entityId);
        if (role)
          role.workspaces = role.workspaces.filter(ws => ws.id !== work.id);
      } else {
        const user = users.value.find(u => u.id === entityId);
        if (user)
          user.workspaces = user.workspaces.filter(ws => ws.id !== work.id);
      }
    } else {
      alert('خطا در عملیات در سمت سرور')
    }
  } else {
    // remove from array with name - ( for name add worksapce )
    selectedEntity.value = selectedEntity.value.filter(item => item.name !== work.name);

    if (activeTab.value == "roles") {
      const role = roles.value.find(u => u.id === entityId);
      if (role)
        role.workspaces = role.workspaces.filter(ws => ws.name !== work.name);
    } else {
      const user = users.value.find(u => u.id === entityId);
      if (user)
        user.workspaces = user.workspaces.filter(ws => ws.name !== work.name);
    }

  }
  layers.value = [];
  showInfo("فضای کاری حذف شد");
}

const changeLayer = async (event, layer) => {
  const isChecked = event.target.checked;
  //let work=Work;
  let user = users.value.find(a => a.id == entityId)
  if (isChecked) {
    let work = user.workspaces.find(a => a.name == Work.name)
    work.layers.push(layer);
    let p =1 ;
    // await axios.post(SERVER + `/api/user/${workId}/layer`, {
    //   workspaceId : Work,
    //   layer : layer
    // });

  } else {
    // await axios.delete(SERVER + `/api/workspace/${workId}/layer`, {
    //   params: { layer : layer }
    // });

  }
};

const setLayer = async () => {
  let data = null;
  if (activeTab.value == "roles") {
    data =  roles.value.find(a => a.id == entityId);
    data.type = 'role';
  } else {
    data =  users.value.find(a => a.id == entityId);
    data.type = 'user';
  }
  loading.value = true;
  await axios.post(SERVER + `/api/user/${entityId}/layer`, data);
  loading.value = false;
  showSuccess("عملیات با موفقیت انجام شد");

}

const showModal = () => {
  showUserModal.value = true;
}

const closeUserModal = () => {
  showUserModal.value = false;
};

function showSuccess(msg) {
  $toast.open({
    message: msg,
    type: "success",
    duration: 4000   // ۲ ثانیه
  });

}

function showInfo(msg) {
  $toast.open({
    message: msg,
    type: "info",
    duration: 4000   // ۲ ثانیه
  });

}


</script>


<style scoped>
/* ظاهر ساده و قابل فهم برای ستون‌ها */
ul {
  list-style: none;
  padding: 0;
}
@media (max-width: 768px) {
  .grid-cols-3 {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
  .p-6 { padding: 14px !important; }
}
@media (max-width: 480px) {
  .p-6 { padding: 10px !important; }
}
</style>
