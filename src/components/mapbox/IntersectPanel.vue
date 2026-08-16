<template>
  <div
    v-if="panelOpen || drawMode === 'intersect'"
    class="absolute top-[calc(var(--top)+150px)] left-14 z-[60] w-[360px] max-w-[calc(100vw-24px)] bg-white rounded shadow-md p-3 text-sm"
    @click.stop
    @contextmenu.stop
  >
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-bold text-gray-800">همپوشانی (Intersect)</h3>
      <button
        @click="$emit('clearIntersect')"
        class="text-gray-400 hover:text-red-500"
        title="بستن و پاک‌کردن"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- حالت ۱: در حال رسم دستی روی نقشه -->
    <div
      v-if="drawMode === 'intersect'"
      class="text-orange-600 bg-orange-50 rounded p-2"
    >
      روی نقشه کلیک کنید تا رأس‌های پلیگان همپوشانی اضافه شود. برای پایان،
      دابل‌کلیک کنید (Esc برای لغو).
    </div>

    <!-- حالت ۲: در حال تحلیل -->
    <div v-else-if="analyzing" class="text-gray-500 text-center py-3">
      در حال تحلیل...
    </div>

    <!-- حالت ۳: نتیجه آماده است -->
    <template v-else-if="overlapSourceLabel">
      <div class="text-xs text-gray-500 mb-2">
        منبع محدوده: {{ overlapSourceLabel }}
      </div>

      <!-- خلاصه کلی -->
      <div class="grid grid-cols-2 gap-2 mb-2">
        <div class="bg-gray-50 rounded p-2 text-center">
          <div class="text-lg font-bold text-orange-600">
            {{ intersectSummary.pointCount }}
          </div>
          <div class="text-xs text-gray-500">نقطه</div>
        </div>
        <div class="bg-gray-50 rounded p-2 text-center">
          <div class="text-lg font-bold text-orange-600">
            {{ intersectSummary.lineCount }}
          </div>
          <div class="text-xs text-gray-500">خط</div>
        </div>
        <div
          class="bg-gray-50 rounded p-2 text-center col-span-2"
          v-if="intersectSummary.lineCount"
        >
          <div class="text-xs text-gray-500">مجموع طول داخل محدوده</div>
          <div class="font-bold text-orange-600">
            {{ formatDistance(intersectSummary.totalLineLength) }}
          </div>
        </div>
        <div
          class="bg-gray-50 rounded p-2 text-center col-span-2"
          v-if="intersectSummary.polygonCount"
        >
          <div class="text-xs text-gray-500">
            تعداد نواحی هم‌پوشان ({{ intersectSummary.polygonCount }})
          </div>
          <div class="font-bold text-orange-600">
            {{ formatArea(intersectSummary.totalPolygonArea) }}
          </div>
        </div>
      </div>

      <!-- لیست گروه‌بندی‌شده به‌ازای هر لایه -->
      <div
        v-if="layerOverlapGroups.length"
        class="max-h-64 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100 mb-2 bg-white"
        dir="rtl"
      >
        <div
          v-for="(grp, gi) in layerOverlapGroups"
          :key="'g-' + gi"
          class="p-2"
        >
          <div class="font-semibold text-gray-800 text-xs mb-1 flex items-center gap-1">
            <i class="fas fa-vector-square text-orange-500"></i>
            {{ grp.layerName }}
            <span class="text-[10px] font-normal text-gray-400" dir="ltr">
              (مساحت کل: {{ formatArea(grp.totalArea) }})
            </span>
          </div>
          <ul class="pr-2 space-y-1">
            <li
              v-for="(item, ii) in grp.items"
              :key="'i-' + ii"
              class="text-[11px] text-gray-700 bg-gray-50 rounded px-2 py-1.5 leading-relaxed"
            >
              همپوشانی با
              <span class="font-medium text-gray-900">«{{ item.otherName }}»</span>:
              <span class="text-orange-600 font-semibold" dir="ltr">
                {{ item.detail || formatArea(item.overlapArea) }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <!-- نتایج عادی (نقطه/خط یا وقتی گروه‌بندی لایه نداریم) -->
      <div
        v-else
        class="max-h-56 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100 bg-white"
        dir="rtl"
      >
        <div
          v-if="!intersectResults.length"
          class="text-center text-gray-400 py-3 text-xs"
        >
          هیچ عنصری در محدوده همپوشانی نیست
        </div>
        <div
          v-for="(r, i) in intersectResults"
          :key="i"
          class="p-2 text-xs"
        >
          <div class="font-semibold text-gray-800">{{ r.pinName }}</div>

          <div v-if="r.kind === 'point'" class="text-gray-500 mt-0.5" dir="ltr">
            نقطه — {{ r.lat.toFixed(6) }}, {{ r.lon.toFixed(6) }} | UTM:
            {{ r.utmX.toFixed(1) }}, {{ r.utmY.toFixed(1) }} (Z{{ r.utmZone }})
          </div>

          <div v-else-if="r.kind === 'line'" class="text-gray-500 mt-0.5">
            خط —
            <span dir="ltr">
              {{ formatDistance(r.insideLengthMeters) }} از
              {{ formatDistance(r.totalLengthMeters) }}
              ({{ r.percentage.toFixed(1) }}%)
            </span>
          </div>

          <div v-else-if="r.kind === 'polygon'" class="text-gray-500 mt-0.5">
            {{ r.isCircle ? "دایره" : "پلیگان" }} —
            <span dir="ltr">
              {{ formatArea(r.insideAreaSqMeters) }} از
              {{ formatArea(r.totalAreaSqMeters) }}
              ({{ r.percentage.toFixed(1) }}%)
            </span>
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

    <!-- حالت ۴ (پیش‌فرض): پنل تازه باز شده -->
    <template v-else>
      <p class="text-gray-500 text-xs mb-3">
        محدوده‌ی همپوشانی را با ترسیم دستی، آپلود KML، یا انتخاب چند لایه از
        Pinlist مشخص کنید.
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
        <input
          ref="kmlInput"
          type="file"
          accept=".kml"
          class="hidden"
          @change="onKMLChange"
        />

        <!-- انتخاب از لایه‌های Pinlist -->
        <div class="border rounded p-2 mt-1">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold text-gray-700">
              از لایه‌های Pinlist
            </span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="text-[10px] text-emerald-600 hover:underline"
                @click="selectAll"
                v-if="polygonPinOptions.length"
              >
                انتخاب همه
              </button>
              <button
                type="button"
                class="text-[10px] text-gray-400 hover:underline"
                @click="selectedPinIds = []"
                v-if="selectedPinIds.length"
              >
                پاک کردن
              </button>
              <span class="text-[10px] text-gray-400">
                {{ selectedPinIds.length }} انتخاب
              </span>
            </div>
          </div>
          <p class="text-[10px] text-gray-400 mb-2">
            نقطه، خط، پلیگان و دایره را انتخاب کنید (بدون محدودیت تعداد).
            همپوشانی بین هر جفت لایه (نقطه در پلیگان، خط داخل پلیگان، تقاطع
            خطوط و …) محاسبه و به‌ازای هر لایه لیست می‌شود.
          </p>
          <div
            v-if="!polygonPinOptions.length"
            class="text-center text-gray-400 text-xs py-2"
          >
            هیچ لایه قابل‌انتخابی در لیست نیست
          </div>
          <div
            v-else
            class="max-h-44 overflow-y-auto border rounded divide-y mb-2"
          >
            <label
              v-for="opt in polygonPinOptions"
              :key="String(opt.id)"
              class="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-orange-50 select-none"
            >
              <input
                type="checkbox"
                class="rounded border-gray-300 text-orange-500 focus:ring-orange-400 shrink-0"
                :checked="isSelected(opt.id)"
                @change="togglePin(opt.id, $event.target.checked)"
              />
              <span class="flex-1 truncate text-gray-700" :title="opt.name">
                {{ opt.name }}
              </span>
              <span class="text-[10px] text-gray-400 shrink-0">{{
                opt.typeLabel
              }}</span>
            </label>
          </div>
          <button
            type="button"
            :disabled="selectedPinIds.length < 1"
            @click="onUseSelectedPins"
            class="w-full rounded px-3 py-2 flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <i class="fas fa-layer-group"></i>
            محاسبه همپوشانی ({{ selectedPinIds.length }} لایه)
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import {
  formatDistance,
  formatArea,
} from "../../composables/useDrawingHelpers";

const props = defineProps({
  panelOpen: { type: Boolean, default: false },
  drawMode: { type: String, default: "" },
  intersectResults: { type: Array, default: () => [] },
  intersectSummary: {
    type: Object,
    default: () => ({
      pointCount: 0,
      lineCount: 0,
      polygonCount: 0,
      totalLineLength: 0,
      totalPolygonArea: 0,
    }),
  },
  overlapSourceLabel: { type: String, default: "" },
  analyzing: { type: Boolean, default: false },
  pins: { type: [Array, Object], default: () => [] },
});

const emit = defineEmits([
  "startIntersectMode",
  "uploadKML",
  "clearIntersect",
  "generateReport",
  "exportCSV",
  "usePinLayers",
]);

/** همیشه به‌صورت رشته نگه‌داری می‌شود تا مقایسه چک‌باکس پایدار باشد */
const selectedPinIds = ref([]);

function flattenPins(list, out = []) {
  const arr = Array.isArray(list) ? list : list?.value || [];
  (arr || []).forEach((pin) => {
    if (!pin) return;
    if (pin.type === "group") {
      flattenPins(pin.children, out);
      return;
    }
    out.push(pin);
  });
  return out;
}

const polygonPinOptions = computed(() => {
  const all = flattenPins(props.pins);
  const opts = [];
  const typeLabel = {
    point: "نقطه",
    multi_point: "چند‌نقطه",
    polyline: "خط",
    polygon: "پلیگان",
    circle: "دایره",
  };
  all.forEach((pin) => {
    const s = pin.shape;
    if (!s || !s.type) return;
    if (s.show === false) return;
    const t = s.type;
    let ok = false;
    if (t === "point" && s.lon != null && s.lat != null) ok = true;
    else if (t === "multi_point" && s.positions?.length) ok = true;
    else if (t === "polyline" && s.positions?.length >= 2) ok = true;
    else if (t === "polygon" && s.positions?.length >= 3) ok = true;
    else if (t === "circle" && s.center && s.radius) ok = true;
    if (!ok) return;
    opts.push({
      id: String(pin.id),
      name: pin.name || "(بدون نام)",
      typeLabel: typeLabel[t] || t,
    });
  });
  return opts;
});

function isSelected(id) {
  return selectedPinIds.value.includes(String(id));
}

function togglePin(id, checked) {
  const sid = String(id);
  if (checked) {
    if (!selectedPinIds.value.includes(sid)) {
      selectedPinIds.value = [...selectedPinIds.value, sid];
    }
  } else {
    selectedPinIds.value = selectedPinIds.value.filter((x) => x !== sid);
  }
}

function selectAll() {
  selectedPinIds.value = polygonPinOptions.value.map((o) => String(o.id));
}

/**
 * گروه‌بندی نتایج همپوشانی لایه‌ها:
 * برای هر لایه، لیست «با کدام لایه چقدر هم‌پوشانی دارد»
 */
const layerOverlapGroups = computed(() => {
  const rows = props.intersectResults || [];
  const pairRows = rows.filter(
    (r) => Array.isArray(r.pairNames) && r.pairNames.length === 2,
  );
  if (!pairRows.length) return [];

  const map = new Map();
  const ensure = (name, totalArea) => {
    if (!map.has(name)) {
      map.set(name, { layerName: name, totalArea: totalArea || 0, items: [] });
    }
    return map.get(name);
  };

  const detailText = (r, fromA) => {
    if (r.kind === "point") {
      return r.description || "نقطه در محدوده لایه مقابل";
    }
    if (r.kind === "line") {
      if (r.crossCount) return r.description || "تقاطع خطوط";
      if (r.insideLengthMeters != null) {
        return (
          (fromA ? "طول داخل لایه مقابل: " : "خط لایه مقابل داخل این لایه: ") +
          formatDistance(r.insideLengthMeters) +
          (r.percentage ? ` (${r.percentage.toFixed(1)}٪)` : "")
        );
      }
      return r.description || "تقاطع خط";
    }
    // polygon
    const area = r.insideAreaSqMeters || 0;
    const pct = fromA
      ? r.percentage || 0
      : r.otherTotalArea
        ? (area / r.otherTotalArea) * 100
        : 0;
    return `${formatArea(area)} (${pct.toFixed(1)}٪ از این لایه)`;
  };

  pairRows.forEach((r) => {
    const [aName, bName] = r.pairNames;
    const ga = ensure(aName, r.totalAreaSqMeters);
    ga.items.push({
      otherName: bName,
      overlapArea: r.insideAreaSqMeters || 0,
      percentage: r.percentage || 0,
      detail: detailText(r, true),
      kind: r.kind,
    });

    // برای پلیگان متقارن؛ برای نقطه/خط فقط یک‌بار از دید لایهٔ اول کافی است
    // ولی برای خوانایی هر دو طرف را می‌آوریم
    const pctB =
      r.otherTotalArea > 0 && r.insideAreaSqMeters
        ? (r.insideAreaSqMeters / r.otherTotalArea) * 100
        : r.kind === "point"
          ? 100
          : 0;
    const gb = ensure(bName, r.otherTotalArea || 0);
    gb.items.push({
      otherName: aName,
      overlapArea: r.insideAreaSqMeters || 0,
      percentage: pctB,
      detail: detailText(r, false),
      kind: r.kind,
    });
  });

  return Array.from(map.values());
});

watch(
  () => props.panelOpen,
  (open) => {
    if (!open) selectedPinIds.value = [];
  },
);

function onKMLChange(e) {
  const file = e.target.files?.[0];
  if (file) emit("uploadKML", file);
  e.target.value = "";
}

function onUseSelectedPins() {
  if (!selectedPinIds.value.length) return;
  // ارسال به‌صورت رشته؛ سمت composable با == / Set کار می‌کند
  emit("usePinLayers", [...selectedPinIds.value]);
}
</script>