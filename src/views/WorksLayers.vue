<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">لایه‌ها و فضاهای کاری</h1>
        <p class="page-subtitle">مدیریت فضاهای کاری و لایه‌های دیتابیس محلی</p>
      </div>
    </div>

    <div class="works-grid">
      <div class="card works-card">
        <h3 class="works-title">
          <i class="fas fa-layer-group"></i> فضاهای کاری در دیتابیس محلی
        </h3>
        <div v-if="!workspaces.length" class="empty-sm">فضای کاری یافت نشد</div>
        <ul class="works-list">
          <li v-for="work in workspaces" :key="work.id" class="works-item">
            <span class="works-item-name"><i class="fas fa-folder"></i> {{ work.name }}</span>
            <button class="works-delete" @click.stop="removeWorkspace(work.id)" title="حذف">
              <i class="fas fa-trash"></i>
            </button>
          </li>
        </ul>
      </div>

      <div class="card works-card">
        <h3 class="works-title">
          <i class="fas fa-map-marked-alt"></i> لایه‌های موجود در دیتابیس محلی
        </h3>
        <div v-if="!layers.length" class="empty-sm">لایه‌ای یافت نشد</div>
        <ul class="works-list works-list--tall">
          <li v-for="layer in layers" :key="layer.id" class="works-item">
            <span class="works-item-name"><i class="fas fa-map"></i> {{ layer.name }}</span>
            <button class="works-delete" @click.stop="removeLayer(layer.id)" title="حذف">
              <i class="fas fa-trash"></i>
            </button>
          </li>
        </ul>
      </div>
    </div>

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
const dict = inject('dict')

const SERVER = import.meta.env.VITE_SERVER
const $toast = useToast();
const loading = ref(false)

const layers = ref([])
const workspaces = ref([]);

onMounted(() => {
  fetchWorks();
  fetchLayers()
});

const fetchWorks = async () => {
  const res = await axios.get(SERVER + '/api/workspaces');
  workspaces.value = res.data;
};

const fetchLayers = async () => {
  const res = await axios.get(SERVER + '/api/db_layers');
  layers.value = res.data;
};

const removeWorkspace = async (id) => {
  if (confirm('آیا از حذف این فضای کاری مطمئن هستید؟')) {
    const res = await axios.delete(SERVER + '/api/db_workspace/' + id);
    await fetchWorks();
  }
}

const removeLayer = async (id) => {
  if (confirm('آیا از حذف این لایه مطمئن هستید؟')) {
    const res = await axios.delete(SERVER + '/api/db_layer/' + id);
    await fetchLayers();
  }
}
</script>

<style scoped>
ul {
  list-style: none;
  padding: 0;
}

.works-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.works-card {
  padding: 20px;
}

.works-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.works-title i {
  color: var(--accent);
  font-size: 14px;
}

.empty-sm {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  padding: 24px 0;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
}

.works-list {
  display: flex;
  flex-direction: column;
  max-height: 60vh;
  overflow-y: auto;
  padding-inline-start: 0;
}

.works-list--tall {
  max-height: 60vh;
}

.works-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border-bottom: 1px solid var(--border);
  transition: background var(--transition-fast);
}

.works-item:hover {
  background: var(--surface2);
}

.works-item-name {
  font-size: 13px;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.works-item-name i {
  color: var(--text-muted);
  font-size: 12px;
  flex-shrink: 0;
}

.works-delete {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.works-delete:hover {
  color: var(--danger);
  background: var(--danger-glow);
}

@media (max-width: 900px) {
  .works-grid { grid-template-columns: 1fr; gap: 12px; }
}

@media (max-width: 480px) {
  .works-card { padding: 14px; }
  .works-item { padding: 8px 10px; }
}
</style>
