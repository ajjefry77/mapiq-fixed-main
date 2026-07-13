<template>
  <div class="min-h-screen">
    <main class="flex-1 overflow-auto">

      <div class="p-6 grid grid-cols-3 gap-6">

        <!-- Workspaces Column -->
        <div class="card border-r-2 border-purple-400/60">
          <h3 class="font-bold text-lg mb-4">فضاهای کاری در دیتابیس محلی</h3>
          <ul class="mt-3 space-y-1">
            <li v-for="work in workspaces" :key="work.id"  class="cursor-pointer p-2 rounded flex justify-between items-center border-b border-[var(--border)]">
              {{work.name}}
              <button  class="text-red-600 hover:text-red-800" @click.stop="removeWorkspace(work.id)" title="حذف">
                <span><i class="fa fa-trash"></i> </span>
              </button>
            </li>
          </ul>
        </div>

        <!-- Layers Column -->
        <div class="card border-r-2 border-blue-400/60">
          <h3 class="font-bold text-lg mb-4">لایه های موجود در دیتابیس محلی</h3>
          <ul class="mt-3 overflow-auto max-h-[78vh] space-y-1">
            <li v-for="layer in layers" :key="layer.id" class="cursor-pointer p-2 rounded flex justify-between items-center border-b border-[var(--border)]">
              {{layer.name}}
              <button  class="text-red-600 hover:text-red-800" @click.stop="removeLayer(layer.id)" title="حذف">
                <span><i class="fa fa-trash"></i> </span>
              </button>
            </li>
          </ul>

        </div>

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
//import dict from '../dictionary.json'
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
  }
}

const removeLayer = async (id) => {
  if (confirm('آیا از حذف این لایه مطمئن هستید؟')) {
    const res = await axios.delete(SERVER + '/api/db_layer/' + id);
  }
}
</script>


<style scoped>
/* ظاهر ساده و قابل فهم برای ستون‌ها */
ul {
  list-style: none;
  padding: 0;
}
</style>
