<template>
  <div id="app" class="min-h-screen bg-[var(--bg)]">
    <AdminHeader />
    <router-view v-slot="{ Component }">
      <keep-alive include="MapCesium">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { onMounted, provide, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import AdminHeader from './components/AdminHeader.vue';

const route = useRoute();
const authStore = useAuthStore();
const SelectGroup = ref(null)
provide('SelectGroup', SelectGroup)

onMounted(() => {
  authStore.checkAuth();
});
</script>
