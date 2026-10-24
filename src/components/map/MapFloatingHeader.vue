<template>
  <!-- هدر شناور روی نقشه — بدون نوار ثابت بالای صفحه (شبیه Google Maps) -->
  <div class="absolute top-0 inset-x-0 z-[700] pointer-events-none" dir="rtl">
    <div class="flex items-start justify-between gap-2 p-3 md:p-4">
      <!-- نام سایت + نوار جستجو — کنار هم در سمت راست -->
      <div class="pointer-events-auto flex items-start gap-2 min-w-0 flex-1">
        <router-link
          :to="authStore.isAuthenticated ? '/dashboard' : '/baseMap'"
          class="map-site-capsule shrink-0"
          title="Map IQ"
        >
          <span class="map-site-capsule-dot"></span>
          <span class="map-site-capsule-title">Map IQ</span>
        </router-link>

        <!-- نوار جستجو، بلافاصله کنار نام سایت -->
        <div class="min-w-0 flex-1 max-w-[320px]">
          <slot name="search" />
        </div>
      </div>

      <!-- پروفایل + ثبت‌نام — سمت چپ -->
      <div class="pointer-events-auto flex items-center gap-2 shrink-0">
        <!-- دکمه باز/بسته کردن سایدبار میز کار و لایه‌ها -->
        <button
          class="map-toggle-btn"
          :class="{ 'map-toggle-btn--active': sidebarOpen }"
          :title="sidebarOpen ? 'بستن میز کار' : 'باز کردن میز کار'"
          :aria-expanded="!!sidebarOpen"
          @click="$emit('toggle-sidebar')"
        >
          <i class="fas fa-bars"></i>
        </button>
        <Profile />
        <router-link
          v-if="!authStore.isAuthenticated"
          to="/register"
          class="map-signup-capsule"
          title="ثبت‌نام"
        >
          <i class="fas fa-user-plus text-xs"></i>
          <span>ثبت نام</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import Profile from "../Profile.vue";
import { useAuthStore } from "../../stores/auth";

const authStore = useAuthStore();

defineProps({
  /** وضعیت سایدبار میز کار (برای تغییر شکل دکمه) */
  sidebarOpen: { type: Boolean, default: false },
});

defineEmits(["toggle-sidebar"]);
</script>

<style scoped>
.map-site-capsule {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 18px;
  border-radius: 9999px;
  background: rgba(19, 21, 30, 0.88);
  backdrop-filter: blur(14px) saturate(1.15);
  -webkit-backdrop-filter: blur(14px) saturate(1.15);
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.08));
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.35)),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: var(--text, #fff);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.3px;
  white-space: nowrap;
  transition: all 0.18s ease-out;
}

.map-site-capsule:hover {
  transform: translateY(-1px);
  border-color: var(--accent, #e8843c);
}

.map-site-capsule-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-2, #e8843c), #d4a24a);
  box-shadow: 0 0 12px var(--brand-glow, rgba(232, 132, 60, 0.6));
  animation: pulse-dot 2.4s ease-in-out infinite;
}

.map-site-capsule-title {
  line-height: 1;
}

.map-toggle-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.08));
  background: rgba(19, 21, 30, 0.88);
  backdrop-filter: blur(14px) saturate(1.15);
  -webkit-backdrop-filter: blur(14px) saturate(1.15);
  color: var(--text-muted, #9ca3af);
  box-shadow: var(--shadow-md, 0 4px 14px rgba(0, 0, 0, 0.3));
  transition: all 0.18s ease-out;
}

.map-toggle-btn:hover {
  color: var(--accent, #e8843c);
  border-color: var(--accent, #e8843c);
  transform: translateY(-1px);
}

.map-toggle-btn--active {
  color: var(--accent, #e8843c);
  border-color: var(--accent, #e8843c);
}

.map-signup-capsule {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 9999px;
  background: var(--accent, #e8843c);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid var(--accent, #e8843c);
  box-shadow: var(--shadow-md, 0 4px 14px rgba(0, 0, 0, 0.3));
  transition: all 0.18s ease-out;
}

.map-signup-capsule:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
