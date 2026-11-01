<template>
  <!-- هدر شناور روی نقشه — بدون نوار ثابت بالای صفحه (شبیه Google Maps) -->
  <div class="absolute top-0 inset-x-0 z-[700] pointer-events-none" dir="rtl">
    <div class="flex flex-wrap items-start gap-2 p-3 md:p-4">
      <!-- نام سایت — کپسول در سمت راست -->
      <div class="pointer-events-auto order-1 shrink-0">
        <router-link
          :to="authStore.isAuthenticated ? '/dashboard' : '/baseMap'"
          class="map-site-capsule"
          title="Map IQ"
        >
          <span class="map-site-capsule-dot"></span>
          <span class="map-site-capsule-title">Map IQ</span>
        </router-link>
      </div>

      <!-- نوار جستجو و لینک‌های خدمات -->
      <div
        class="pointer-events-auto order-3 sm:order-2 w-full sm:w-auto min-w-0 flex flex-wrap items-start gap-2"
      >
        <div class="w-full min-w-0 sm:w-[320px]">
          <slot name="search" />
        </div>
        <div class="shrink-0 flex items-start gap-2">
          <component
            :is="service.secure ? 'button' : 'a'"
            v-for="service in externalMapServices"
            :key="service.label"
            :href="service.secure ? undefined : buildSharedMapRouteUrl(service.url, '#/draw')"
            :type="service.secure ? 'button' : undefined"
            :disabled="service.secure && linkPending"
            :aria-busy="service.secure && linkPending"
            @click="onServiceClick($event, service)"
            @auxclick="onServiceClick($event, service)"
            @contextmenu="!service.secure && refreshSharedLink($event, service.url)"
            :target="service.secure ? undefined : '_blank'"
            rel="noopener noreferrer"
            class="map-service-capsule"
          >
            {{ service.secure && linkPending ? 'در حال انتقال…' : service.label }}
          </component>
        </div>
        <div class="shrink-0 flex items-start gap-2">
          <slot name="tools" />
        </div>
      </div>

      <!-- پروفایل یا دکمه واحد ورود / ثبت‌نام — سمت چپ -->
      <div class="pointer-events-auto order-2 sm:order-3 flex items-center gap-2 shrink-0 ms-auto">
        <Profile v-if="authStore.isAuthenticated" />
        <router-link
          v-else
          to="/login"
          class="map-signup-capsule"
          title="ورود / ثبت نام"
        >
          <i class="fas fa-user text-xs"></i>
          <span>ورود / ثبت نام</span>
        </router-link>
      </div>
    </div>
    <div v-if="linkError" role="alert" class="pointer-events-auto mx-3 mb-2 rounded-lg bg-red-950 text-white px-3 py-2 text-sm">
      {{ linkError }}
    </div>
  </div>
</template>

<script setup>
import { inject, ref } from "vue";
import Profile from "../Profile.vue";
import { useAuthStore } from "../../stores/auth";
import { buildSharedMapRouteUrl, createSecureMapRouteUrl } from "../../utils/mapSharedLink";

const authStore = useAuthStore();
// The href rendered at mount can be stale: map movement updates history without
// rerendering this header. Synchronize the live map and rebuild the anchor
// before the browser performs its native navigation (also middle-click/copy).
const syncSharedMapView = inject("syncSharedMapView", () => {});
const linkPending = ref(false);
const linkError = ref("");
function refreshSharedLink(event, baseUrl) {
  syncSharedMapView();
  event.currentTarget.href = buildSharedMapRouteUrl(baseUrl, "#/draw");
}

async function onServiceClick(event, service) {
  if (!service.secure) return refreshSharedLink(event, service.url);
  event.preventDefault();
  if (linkPending.value || (event.type === "auxclick" && event.button !== 1)) return;
  linkError.value = "";
  // Reserve the tab during the user gesture, before the asynchronous request.
  const tab = window.open("about:blank", "_blank");
  if (!tab) {
    linkError.value = "لطفاً اجازهٔ بازشدن تب جدید را بدهید و دوباره کروکی را بزنید.";
    return;
  }
  tab.opener = null;
  linkPending.value = true;
  try {
    syncSharedMapView();
    const url = await createSecureMapRouteUrl(service.url);
    tab.location.replace(url);
  } catch (error) {
    tab.close();
    linkError.value = error?.message || "انتقال امن نقشه انجام نشد؛ دوباره تلاش کنید.";
  } finally {
    linkPending.value = false;
  }
}

const externalMapServices = [
  { label: "کروکی", url: "http://localhost:5174", secure: true },
  { label: "استعلام", url: "https://e.mapiq.ir" },
];
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

.map-service-capsule {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 14px;
  border-radius: 9999px;
  background: rgba(19, 21, 30, 0.88);
  backdrop-filter: blur(14px) saturate(1.15);
  -webkit-backdrop-filter: blur(14px) saturate(1.15);
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.08));
  box-shadow: var(--shadow-md, 0 4px 14px rgba(0, 0, 0, 0.3));
  color: var(--text, #fff);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  transition: all 0.18s ease-out;
}

.map-service-capsule:hover {
  transform: translateY(-1px);
  border-color: var(--accent, #e8843c);
  color: var(--accent, #e8843c);
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
