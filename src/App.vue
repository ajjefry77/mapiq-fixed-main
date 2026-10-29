<template>
  <div id="app" class="min-h-screen bg-[var(--bg)]">
    <AdminHeader v-if="!isMapLayout" />
    <div :class="['page-fade', { 'page-fade--in': pageAnimate }]">
      <router-view v-slot="{ Component }">
        <keep-alive include="MapCesium">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, provide, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import AdminHeader from './components/AdminHeader.vue';
import { useAuthStore } from './stores/auth';
import { isMapRoute } from './constants/publicRoutes';

const currentRoute = useRoute();
const authStore = useAuthStore();
const selectedGroup = ref<number | null>(null);
const pageAnimate = ref(true);

provide('SelectGroup', selectedGroup);

const isMapLayout = computed(() => isMapRoute(currentRoute.path));

watch(
  () => currentRoute.path,
  async () => {
    pageAnimate.value = false;
    await nextTick();
    pageAnimate.value = true;
  }
);

onMounted(() => {
  authStore.checkAuth();
});
</script>
