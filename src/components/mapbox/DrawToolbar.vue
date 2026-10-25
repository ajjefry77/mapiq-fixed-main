<template>
  <div
    ref="toolbarEl"
    class="absolute top-[calc(var(--top)+150px)] z-50 transition-all duration-300"
    :class="panelShifted ? 'left-[360px]' : 'left-1'"
  >
    <!-- قطب‌نما — بالای نوار ابزار -->
    <div class="mb-2 flex justify-center">
      <MapboxNorthIcon :map="map" />
    </div>
    <div @click.stop class="map-toolbar">
      <!-- اندازه‌گیری -->
      <button
        @click="$emit('toggleMeasure')"
        title="اندازه‌گیری"
        class="map-toolbar-btn"
        :class="
          drawMode === 'measure'
            ? 'map-toolbar-btn--active'
            : 'text-zinc-100 bg-zinc-800'
        "
      >
        <i class="fas fa-ruler m-1"></i>
      </button>

      <!-- انتخاب نقطه (فقط برای کاربر لاگین‌شده) -->
      <button
        v-if="authStore.isAuthenticated"
        @click="$emit('togglePointPick')"
        :class="[
          'map-toolbar-btn',
          pickForForm ? 'map-toolbar-btn--active' : '',
        ]"
        title="نقطه (انتخاب برای فرم)"
      >
        <i class="fas fa-location-pin"></i>
      </button>

      <!-- چند نقطه -->
      <button
        @click="$emit('setDrawMode', 'multi_point')"
        :class="[
          'map-toolbar-btn',
          drawMode === 'multi_point'
            ? 'map-toolbar-btn--active'
            : '',
        ]"
        title="چند نقطه"
      >
        <i class="fas fa-braille"></i>
      </button>

      <!-- خط -->
      <button
        @click="$emit('setDrawMode', 'polyline')"
        :class="[
          'map-toolbar-btn',
          drawMode === 'polyline'
            ? 'map-toolbar-btn--active'
            : '',
        ]"
        title="خط"
      >
        <svg
          width="35"
          height="35"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line
            x1="25"
            y1="75"
            x2="75"
            y2="25"
            stroke-width="6"
            stroke="currentColor"
          />
          <circle cx="25" cy="75" r="6" fill="currentColor" />
          <circle cx="75" cy="25" r="6" fill="currentColor" />
        </svg>
      </button>

      <!-- پلی‌گان -->
      <button
        @click="$emit('setDrawMode', 'polygon')"
        :class="[
          'map-toolbar-btn',
          drawMode === 'polygon'
            ? 'map-toolbar-btn--active'
            : '',
        ]"
        title="پلی‌گان"
      >
        <i class="fas fa-draw-polygon"></i>
      </button>

      <!-- دایره -->
      <button
        @click="$emit('setDrawMode', 'circle')"
        :class="[
          'map-toolbar-btn',
          drawMode === 'circle'
            ? 'map-toolbar-btn--active'
            : '',
        ]"
        title="دایره"
      >
        <i class="fa fa-circle"></i>
      </button>

      <!-- === دکمه جدید: برش (Cut) === -->
      <button
        @click="$emit('startCutMode')"
        :class="[
          'map-toolbar-btn',
          drawMode === 'cut'
            ? 'map-toolbar-btn--danger-active'
            : '',
        ]"
        title="برش پلی‌گان یا خط"
      >
        <i class="fas fa-scissors"></i>
      </button>
      <!-- ================================= -->

      <!-- === دکمه جدید: همپوشانی (Intersect) === -->
      <button
        v-if="authStore.isAdmin"
        @click="$emit('openIntersectPanel')"
        :class="[
          'map-toolbar-btn',
          drawMode === 'intersect' || intersectPanelOpen
            ? 'map-toolbar-btn--active'
            : '',
        ]"
        title="همپوشانی (Intersect)"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="38"
            cy="50"
            r="28"
            fill="none"
            stroke="currentColor"
            stroke-width="7"
          />
          <circle
            cx="62"
            cy="50"
            r="28"
            fill="none"
            stroke="currentColor"
            stroke-width="7"
          />
          <path
            d="M50 24.5 A28 28 0 0 1 50 75.5 A28 28 0 0 1 50 24.5 Z"
            fill="currentColor"
            opacity="0.45"
          />
        </svg>
      </button>
      <!-- ================================= -->

      <!-- === دکمه جدید: کروکی (چاپ) === -->
      <button
        v-if="authStore.isAdmin"
        @click="$emit('openKroki')"
        class="map-toolbar-btn"
        title="کروکی"
      >
        <i class="fas fa-print"></i>
      </button>
      <!-- ================================= -->

      <!-- === دکمه جدید: شبکه‌بندی (Fishnet) === -->
      <button
        v-if="authStore.isAdmin"
        @click="$emit('openFishnet')"
        :class="[
          'map-toolbar-btn',
          fishnetPanelOpen
            ? 'map-toolbar-btn--active'
            : '',
        ]"
        title="مثلث‌بندی پلیگان (Triangulation)"
      >
        <i class="fas fa-project-diagram"></i>
      </button>
      <!-- ================================= -->

      <!-- زوم -->
      <button
        @click="map?.zoomIn({ duration: 200 })"
        class="map-toolbar-btn font-bold"
        title="بزرگنمایی"
      >
        <i class="fas fa-plus text-sm"></i>
      </button>
      <button
        @click="map?.zoomOut({ duration: 200 })"
        class="map-toolbar-btn font-bold"
        title="کوچکنمایی"
      >
        <i class="fas fa-minus text-sm"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import MapboxNorthIcon from "@/components/mapbox/MapboxNorthIcon.vue";

const authStore = useAuthStore();
const toolbarEl = ref(null);

defineProps({
  map: { type: Object, default: null },
  drawMode: { type: String, default: "" },
  pickForForm: { type: Boolean, default: false },
  intersectPanelOpen: { type: Boolean, default: false }, // جدید
  fishnetPanelOpen: { type: Boolean, default: false },
  panelShifted: { type: Boolean, default: false },
});

// اضافه کردن startCutMode به لیست emitها
defineEmits([
  "toggleMeasure",
  "togglePointPick",
  "setDrawMode",
  "startCutMode",
  "openKroki",
  "openIntersectPanel",
  "openFishnet",
]);

defineExpose({ toolbarEl });
</script>
