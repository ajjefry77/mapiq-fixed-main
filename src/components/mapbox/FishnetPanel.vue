<template>
  <div
    v-if="panelOpen"
    dir="rtl"
    class="absolute top-[calc(var(--top)+150px)] left-14 z-[60] w-[360px] max-w-[calc(100vw-24px)] panel animate-pop-in text-sm"
    @click.stop
    @contextmenu.stop
  >
    <div class="panel-head">
      <h3 class="panel-title">
        <i class="fas fa-project-diagram"></i>
        مثلث‌بندی (Triangulation)
      </h3>
      <button @click="$emit('clearFishnet')" class="panel-close" title="بستن">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="panel-body space-y-3">
      <p class="panel-note">
        شبکه مثلث‌بندی ژئودتیک (Delaunay / TIN): همه گوشه‌های پلیگان حتما راس مثلث می‌شوند،
        اضلاع بلند مرزی متراکم و داخل کار با نقاط کمکی پر می‌شود تا خطای شکلی کمینه شود.
      </p>

      <div>
        <label class="block text-xs font-semibold mb-1 text-zinc-400">پلیگان منبع</label>
        <select
          :value="selectedPinId"
          @change="$emit('update:selectedPinId', $event.target.value)"
          class="select-native text-xs"
        >
          <option value="">— انتخاب کنید —</option>
          <option v-for="opt in polygonOptions" :key="opt.id" :value="opt.id">
            {{ opt.name }} ({{ opt.typeLabel }} — {{ opt.corners }} گوشه)
          </option>
        </select>
      </div>

      <div class="flex gap-2">
        <div class="flex-1">
          <label class="block text-xs font-semibold mb-1 text-zinc-400">طول ضلع تقریبی مثلث</label>
          <input
            :value="cellSize"
            @input="$emit('update:cellSize', Number($event.target.value))"
            type="number"
            min="0.1"
            step="any"
            placeholder="مثلا 100"
            class="input font-mono text-xs"
            dir="ltr"
          />
        </div>
        <div class="w-28">
          <label class="block text-xs font-semibold mb-1 text-zinc-400">واحد</label>
          <select
            :value="cellUnit"
            @change="$emit('update:cellUnit', $event.target.value)"
            class="select-native text-xs"
          >
            <option value="m">متر</option>
            <option value="km">کیلومتر</option>
          </select>
        </div>
      </div>

      <label class="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="clipToPolygon"
          @change="$emit('update:clipToPolygon', $event.target.checked)"
          class="rounded border-zinc-800 accent-orange-500 w-4 h-4"
        />
        برش مثلث‌ها با مرز پلیگان (پوشش دقیق لبه‌ها)
      </label>

      <button
        @click="$emit('generate')"
        :disabled="!selectedPinId || generating"
        class="btn btn-primary w-full"
      >
        <i class="fas fa-project-diagram"></i>
        {{ generating ? "در حال مثلث‌بندی..." : "ساخت پیش‌نمایش مثلث‌بندی" }}
      </button>

      <div v-if="cells.length" class="rounded-lg border border-orange-500/25 bg-orange-500/10 p-2.5 text-xs space-y-1">
        <div class="font-bold text-orange-300">{{ cells.length }} مثلث برای «{{ sourceLabel }}» ساخته شد.</div>
        <div v-if="estSize" class="text-orange-200/80">طول ضلع هدف: {{ estSize }}</div>
        <div v-if="stats" class="text-orange-200/80">
          {{ stats.cornerCount }} گوشه پوشش داده شد (ورودی: {{ stats.inputPoints }} نقطه)
        </div>
        <div v-if="stats" class="text-orange-200/80">
          میانگین کمترین زاویه: {{ stats.avgMinAngle }}° — بدترین: {{ stats.worstMinAngle }}°
        </div>
        <div v-if="stats?.pointCount" class="text-orange-200/80">
          {{ stats.pointCount }} نقطه یکتا (حداقل فاصله: {{ stats.minSep }} متر)
          <span v-if="stats.removedClose">— {{ stats.removedClose }} نقطه نزدیک حذف شد</span>
        </div>
        <div v-if="stats" class="font-bold" :class="stats.errorPct <= 15 ? 'text-emerald-300' : stats.errorPct <= 35 ? 'text-amber-300' : 'text-red-300'">
          خطای شکلی تقریبی: {{ stats.errorPct }}٪
          <span v-if="stats.skinnyCount">({{ stats.skinnyCount }} مثلث باریک)</span>
        </div>
        <div v-else class="text-orange-200/80">زاویه گرید: {{ angle }}°</div>
      </div>

      <div v-if="cells.length" class="flex gap-2">
        <button
          @click="$emit('save')"
          class="btn btn-primary btn-sm flex-1"
        >
          <i class="fas fa-save"></i> ذخیره مثلث‌ها
        </button>
        <button
          @click="$emit('exportCSV')"
          class="btn btn-ghost btn-sm flex-1"
        >
          <i class="fas fa-file-csv"></i> CSV مثلث‌ها
        </button>
      </div>

      <div v-if="cells.length" class="rounded-lg border border-zinc-700/60 bg-zinc-800/40 p-2.5 text-xs space-y-2">
        <div class="font-bold text-zinc-200">خروجی شکل و نقاط مثلث‌بندی‌شده</div>
        <div class="flex gap-2">
          <button
            @click="$emit('exportPointsKML')"
            class="btn btn-ghost btn-sm flex-1"
          >
            <i class="fas fa-globe"></i> شکل KML
          </button>
          <button
            @click="$emit('exportPointsCSV')"
            class="btn btn-ghost btn-sm flex-1"
          >
            <i class="fas fa-file-csv"></i> نقاط CSV
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  panelOpen: { type: Boolean, default: false },
  pins: { type: [Array, Object], default: () => [] },
  selectedPinId: { type: String, default: "" },
  cellSize: { type: Number, default: 100 },
  cellUnit: { type: String, default: "m" },
  clipToPolygon: { type: Boolean, default: true },
  generating: { type: Boolean, default: false },
  cells: { type: Array, default: () => [] },
  sourceLabel: { type: String, default: "" },
  angle: { type: Number, default: 0 },
  stats: { type: Object, default: null },
});

defineEmits([
  "update:selectedPinId",
  "update:cellSize",
  "update:cellUnit",
  "update:clipToPolygon",
  "generate",
  "save",
  "exportCSV",
  "exportPointsCSV",
  "exportPointsKML",
  "clearFishnet",
]);

function flattenPins(list, out = []) {
  const arr = Array.isArray(list) ? list : list?.value || [];
  (arr || []).forEach((pin) => {
    if (!pin) return;
    if (pin.type === "group" || pin.type === "folder") {
      flattenPins(pin.children, out);
      return;
    }
    out.push(pin);
  });
  return out;
}

function cornerCount(pin) {
  try {
    const s = pin.shape;
    if (s?.type === "polygon" && Array.isArray(s.positions)) return s.positions.length;
    if (s?.type === "circle") return 0;
  } catch (e) {}
  return 0;
}

const polygonOptions = computed(() => {
  const all = flattenPins(props.pins);
  const opts = [];
  const typeLabel = { polygon: "پلیگان", circle: "دایره" };
  all.forEach((pin) => {
    const s = pin.shape;
    if (!s || s.show === false) return;
    if (s.type === "polygon" && s.positions?.length >= 3) {
      opts.push({ id: String(pin.id), name: pin.name || "(بدون نام)", typeLabel: typeLabel.polygon, corners: cornerCount(pin) });
    } else if (s.type === "circle" && s.center && s.radius) {
      opts.push({ id: String(pin.id), name: pin.name || "(بدون نام)", typeLabel: typeLabel.circle, corners: "—" });
    }
  });
  return opts;
});

const estSize = computed(() => {
  const v = Number(props.cellSize);
  if (!isFinite(v) || v <= 0) return "";
  return props.cellUnit === "km" ? `${v} km (${(v * 1000).toLocaleString("fa-IR")} m)` : `${v} m`;
});
</script>
