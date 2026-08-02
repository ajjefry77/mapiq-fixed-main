<template>
  <div
    v-if="panelOpen || drawMode === 'intersect'"
    class="absolute top-[calc(var(--top)+150px)] left-14 z-50 w-[320px] max-w-[calc(100vw-24px)] bg-white rounded shadow-md p-3 text-sm"
    @click.stop
    @contextmenu.stop
  >
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-bold text-gray-800">همپوشانی (Intersect)</h3>
      <button @click="$emit('clearIntersect')" class="text-gray-400 hover:text-red-500" title="بستن و پاک‌کردن">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- حالت ۱: در حال رسم دستی روی نقشه -->
    <div v-if="drawMode === 'intersect'" class="text-orange-600 bg-orange-50 rounded p-2">
      روی نقشه کلیک کنید تا رأس‌های پلیگان همپوشانی اضافه شود. برای پایان، دابل‌کلیک یا راست‌کلیک کنید (Esc برای لغو).
    </div>

    <!-- حالت ۲: در حال تحلیل -->
    <div v-else-if="analyzing" class="text-gray-500 text-center py-3">در حال تحلیل...</div>

    <!-- حالت ۳: نتیجه آماده است -->
    <template v-else-if="overlapSourceLabel">
      <div class="text-xs text-gray-500 mb-2">منبع محدوده: {{ overlapSourceLabel }}</div>

      <div class="grid grid-cols-2 gap-2 mb-2">
        <div class="bg-gray-50 rounded p-2 text-center">
          <div class="text-lg font-bold text-orange-600">{{ intersectSummary.pointCount }}</div>
          <div class="text-xs text-gray-500">نقطه</div>
        </div>
        <div class="bg-gray-50 rounded p-2 text-center">
          <div class="text-lg font-bold text-orange-600">{{ intersectSummary.lineCount }}</div>
          <div class="text-xs text-gray-500">خط</div>
        </div>
        <div class="bg-gray-50 rounded p-2 text-center col-span-2" v-if="intersectSummary.lineCount">
          <div class="text-xs text-gray-500">مجموع طول داخل محدوده</div>
          <div class="font-bold text-orange-600">{{ formatDistance(intersectSummary.totalLineLength) }}</div>
        </div>
        <div class="bg-gray-50 rounded p-2 text-center col-span-2" v-if="intersectSummary.polygonCount">
          <div class="text-xs text-gray-500">مجموع مساحت داخل محدوده ({{ intersectSummary.polygonCount }} پلیگان)</div>
          <div class="font-bold text-orange-600">{{ formatArea(intersectSummary.totalPolygonArea) }}</div>
        </div>
      </div>

      <div class="max-h-56 overflow-y-auto border rounded divide-y">
        <div v-if="!intersectResults.length" class="text-center text-gray-400 py-3 text-xs">
          هیچ عنصری در محدوده همپوشانی نیست
        </div>
        <div v-for="(r, i) in intersectResults" :key="i" class="p-2 text-xs">
          <div class="font-semibold text-gray-700">{{ r.pinName }}</div>
          <div v-if="r.kind === 'point'" class="text-gray-500">
            نقطه — {{ r.lat.toFixed(6) }}, {{ r.lon.toFixed(6) }} | UTM: {{ r.utmX.toFixed(1) }}, {{ r.utmY.toFixed(1) }} (Z{{ r.utmZone }})
          </div>
          <div v-else-if="r.kind === 'line'" class="text-gray-500">
            خط — {{ formatDistance(r.insideLengthMeters) }} از {{ formatDistance(r.totalLengthMeters) }} ({{ r.percentage.toFixed(1) }}%)
          </div>
          <div v-else-if="r.kind === 'polygon'" class="text-gray-500">
            {{ r.isCircle ? "دایره" : "پلیگان" }} — {{ formatArea(r.insideAreaSqMeters) }} از {{ formatArea(r.totalAreaSqMeters) }} ({{ r.percentage.toFixed(1) }}%)
          </div>
        </div>
      </div>

      <div class="flex gap-2 mt-3">
        <button
          @click="$emit('generateReport')"
          class="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded px-2 py-1.5 flex items-center justify-center gap-1"
        >
          <i class="fas fa-print"></i> تولید گزارش
        </button>
        <button
          @click="$emit('exportCSV')"
          class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded px-2 py-1.5 flex items-center justify-center gap-1"
        >
          <i class="fas fa-file-csv"></i> CSV
        </button>
      </div>
    </template>

    <!-- حالت ۴ (پیش‌فرض): پنل تازه باز شده، هنوز نه رسمی انجام شده نه فایلی آپلود -->
    <template v-else>
      <p class="text-gray-500 text-xs mb-3">
        محدوده‌ی همپوشانی را یا خودتان روی نقشه رسم کنید، یا یک فایل KML آماده بارگذاری کنید.
      </p>
      <div class="flex flex-col gap-2">
        <button
          @click="$emit('startIntersectMode')"
          class="bg-orange-500 hover:bg-orange-600 text-white rounded px-3 py-2 flex items-center justify-center gap-2"
        >
          <i class="fas fa-draw-polygon"></i> ترسیم دستی محدوده
        </button>
        <button
          @click="$refs.kmlInput.click()"
          class="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded px-3 py-2 flex items-center justify-center gap-2"
        >
          <i class="fas fa-file-upload"></i> آپلود فایل KML
        </button>
        <input ref="kmlInput" type="file" accept=".kml" class="hidden" @change="onKMLChange" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { formatDistance, formatArea } from "../../composables/useDrawingHelpers";

defineProps({
  panelOpen: { type: Boolean, default: false },
  drawMode: { type: String, default: "" },
  intersectResults: { type: Array, default: () => [] },
  intersectSummary: {
    type: Object,
    default: () => ({ pointCount: 0, lineCount: 0, polygonCount: 0, totalLineLength: 0, totalPolygonArea: 0 }),
  },
  overlapSourceLabel: { type: String, default: "" },
  analyzing: { type: Boolean, default: false },
});

const emit = defineEmits(["startIntersectMode", "uploadKML", "clearIntersect", "generateReport", "exportCSV"]);

function onKMLChange(e) {
  const file = e.target.files?.[0];
  if (file) emit("uploadKML", file);
  e.target.value = "";
}
</script>