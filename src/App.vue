<template>
  <div id="app" class="min-h-screen bg-[var(--bg)]">
    <!-- مسیرهای نقشه هدر شناور خودشان را دارند و از نوار بالای صفحه استفاده نمی‌کنند -->
    <AdminHeader v-if="!isMapRoute" />
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
import { onMounted, provide, ref, watch, nextTick, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import AdminHeader from './components/AdminHeader.vue';

const route = useRoute();
const authStore = useAuthStore();
const SelectGroup = ref(null)
provide('SelectGroup', SelectGroup)

// مسیرهای نقشه (Mapbox و Cesium) هدر شناور اختصاصی دارند
const isMapRoute = computed(() => route.path.startsWith('/baseMap') || route.path.startsWith('/map3D'));

const pageAnimate = ref(true)
watch(() => route.path, async () => {
  pageAnimate.value = false
  await nextTick()
  pageAnimate.value = true
})

onMounted(() => {
  authStore.checkAuth();
});
</script>
