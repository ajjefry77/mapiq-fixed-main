<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">دسترسی لایه‌ها</h1>
        <p class="page-subtitle">مدیریت فضاهای کاری و لایه‌های هر کاربر یا نقش</p>
      </div>
    </div>

    <div class="pl-grid">

      <!-- Users/Roles Column -->
      <div class="card pl-column">
        <div class="pl-header">
          <h3 class="pl-title">{{ activeTab === 'users' ? 'کاربران' : 'نقش‌ها' }}</h3>
          <button @click="activeTab === 'users' ? OpenUserList = true : OpenRoleList = true" class="pl-add-btn" title="اضافه کردن">
            <i class="fas fa-plus"></i>
          </button>
        </div>

        <div class="pl-tabs">
          <button
            class="pl-tab"
            :class="{ active: activeTab === 'users' }"
            @click="activeTab = 'users'">
            کاربران
          </button>
          <button
            class="pl-tab"
            :class="{ active: activeTab === 'roles' }"
            @click="activeTab = 'roles'">
            نقش‌ها
          </button>
        </div>

        <div v-if="activeTab === 'users'" class="pl-list">
          <div v-if="!users.length" class="empty-sm">کاربری یافت نشد</div>
          <div
            v-for="user in users"
            :key="user.id"
            @click="selectUser(user)"
            class="pl-list-item"
            :class="{ selected: entityId === user.id }">
            <i class="fas fa-user pl-list-icon"></i>
            {{ user.name }}
          </div>
        </div>

        <div v-else class="pl-list">
          <div v-if="!roles.length" class="empty-sm">نقشی یافت نشد</div>
          <div
            v-for="role in roles"
            :key="role.id"
            @click="selectRole(role)"
            class="pl-list-item"
            :class="{ selected: entityId === role.id }">
            <i class="fas fa-user-tag pl-list-icon"></i>
            {{ role.desc }}
          </div>
        </div>
      </div>

      <!-- Workspaces Column -->
      <div class="card pl-column">
        <div class="pl-header">
          <h3 class="pl-title">فضاهای کاری</h3>
          <button @click="showModal()" class="pl-add-btn" title="اضافه کردن فضای کاری">
            <i class="fas fa-plus"></i>
          </button>
        </div>

        <div v-if="!selectedEntity?.length" class="empty-sm">فضای کاری انتخاب نشده است</div>
        <div class="pl-list">
          <div
            v-for="work in selectedEntity || []"
            :key="work.id"
            @click="handleWorkspaceToggle(work)"
            class="pl-list-item"
            :class="{ selected: selectedWork === work.name }">
            <i class="fas fa-layer-group pl-list-icon"></i>
            <span class="pl-item-text">{{ translate(work.name) }}</span>
            <button class="pl-delete" @click.stop="removeWorkspace(work)" title="حذف">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Layers Column -->
      <div class="card pl-column">
        <div class="pl-header">
          <h3 class="pl-title">لایه‌ها</h3>
          <button @click="setLayer" class="btn btn-primary btn-sm" title="ثبت تغییرات">
            <i class="fas fa-check"></i> ثبت تغییرات
          </button>
        </div>

        <div v-if="!layers.length" class="empty-sm">
          یک فضای کاری انتخاب کنید
        </div>
        <div class="pl-layers">
          <label v-for="layer in layers" :key="layer" class="pl-layer-item">
            <input
              type="checkbox"
              :value="layer"
              v-model="selectedLayerNames"
              class="pl-checkbox"
              @change="changeLayer($event, layer)"
            />
            <span class="pl-layer-name">{{ layer }}</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Add Workspace (Modal)-->
    <div v-if="showUserModal" class="modal-backdrop" @click.self="closeUserModal">
      <div class="modal card">
        <h3 class="modal-title">افزودن فضاهای کاری</h3>
        <div class="pl-modal-list">
          <div
            v-for="work in workspaces"
            :key="work.id"
            @click="addWorkspace(work)"
            class="pl-list-item"
            :class="{ selected: selectedWork === work.name }">
            <i class="fas fa-layer-group pl-list-icon"></i>
            {{ translate(work.name) }}
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" @click="closeUserModal" class="btn btn-ghost">
            بستن
          </button>
        </div>
      </div>
    </div>

    <UserSelect :open="OpenUserList" @close="OpenUserList = false" @select="addUser"/>
    <RoleSelect :open="OpenRoleList" @close="OpenRoleList = false" @select="addRole"/>

    <Loading :active="loading" />
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'

import UserSelect from '../components/UserSelect.vue'
import RoleSelect from '../components/RoleSelect.vue'
import Loading from '../components/Loading.vue'
import { useToast } from "vue-toast-notification";
import axios from 'axios';

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
let entityId = 1;
let Work = null;
let activeTab = ref("users")

function translate(word) {
  return dict[word] || dict[word.toLowerCase()] || word;
}

onMounted(() => {
  loadUsers();
  loadRoles();
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
    user.workspaces = [];
    users.value.push(user);
  }
}

const addRole = (role) => {
  let exist = roles.value.find(a => a.id == role.id);
  if (!exist) {
    role.workspaces = [];
    roles.value.push(role);
  }
}

const addWorkspace = (work) => {
  let exist = selectedEntity.value.find(a => a.name == work.name);
  if (!exist) selectedEntity.value.push(work)
  showUserModal.value = false;
}

const removeWorkspace = async (work) => {
  let workspace = {
    id: work.id,
    type: "user"
  }
  if (work.id) {
    if (activeTab.value == "roles") workspace.type = "role"
    loading.value = true;
    let result = await axios.delete(SERVER + `/api/user/${entityId}/workspace`, { params: { workspace: workspace } });
    loading.value = false;

    if (result.data.status == 0) {
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
  let user = users.value.find(a => a.id == entityId)
  if (isChecked) {
    let work = user.workspaces.find(a => a.name == Work.name)
    work.layers.push(layer);
  }
};

const setLayer = async () => {
  let data = null;
  if (activeTab.value == "roles") {
    data = roles.value.find(a => a.id == entityId);
    data.type = 'role';
  } else {
    data = users.value.find(a => a.id == entityId);
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
    duration: 4000
  });
}

function showInfo(msg) {
  $toast.open({
    message: msg,
    type: "info",
    duration: 4000
  });
}
</script>

<style scoped>
.pl-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-items: start;
}

.pl-column {
  padding: 18px;
  display: flex;
  flex-direction: column;
  min-height: 320px;
}

.pl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.pl-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.pl-add-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 2px 8px var(--accent-glow);
}

.pl-add-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.pl-tabs {
  display: flex;
  gap: 6px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 4px;
  margin-bottom: 12px;
}

.pl-tab {
  flex: 1;
  padding: 7px 10px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  font-family: var(--font);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pl-tab:hover {
  color: var(--text);
}

.pl-tab.active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 2px 8px var(--accent-glow);
}

.pl-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 46vh;
  overflow-y: auto;
}

.pl-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.pl-list-item:hover {
  background: var(--surface2);
}

.pl-list-item.selected {
  background: var(--accent-glow);
  border-color: var(--accent-dim);
  color: var(--accent-soft);
}

.pl-list-icon {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-muted);
  width: 16px;
  text-align: center;
}

.pl-list-item.selected .pl-list-icon {
  color: var(--accent);
}

.pl-item-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl-delete {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pl-delete:hover {
  color: var(--danger);
  background: var(--danger-glow);
}

.pl-layers {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 46vh;
  overflow-y: auto;
}

.pl-layer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
  margin-bottom: 0;
}

.pl-layer-item:hover {
  background: var(--surface2);
}

.pl-checkbox {
  flex-shrink: 0;
}

.pl-layer-name {
  font-size: 13px;
  color: var(--text);
}

.empty-sm {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 24px 0;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
}

.pl-modal-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 50vh;
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .pl-grid { grid-template-columns: 1fr; gap: 12px; }
  .pl-column { min-height: auto; }
  .pl-list, .pl-layers { max-height: 320px; }
}
</style>
