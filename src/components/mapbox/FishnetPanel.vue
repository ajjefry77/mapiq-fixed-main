<template>
  <div
    v-if="panelOpen"
    dir="rtl"
    class="absolute top-[calc(var(--top)+150px)] left-14 z-[60] w-[360px] max-w-[calc(100vw-24px)] bg-zinc-900 rounded-lg shadow-xl p-0 text-sm overflow-hidden"
    @click.stop
    @contextmenu.stop
  >
    <div class="flex items-center justify-between px-3 py-2 bg-orange-500 text-white">
      <h3 class="font-bold flex items-center gap-2">
        <i class="fas fa-th"></i>
        شبکه‌بندی (Fishnet)
      </h3>
      <button @click="$emit('clearFishnet')" class="hover:text-orange-100 transition" title="بستن">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="p-3 space-y-3">
      <p class="text-zinc-400 text-xs leading-relaxed bg-orange-50 border border-orange-100 rounded p-2">
        یک پلیگان را انتخاب کنید و اندازه سلول را وارد کنید (متر یا کیلومتر).
        شبکه دقیق متری در UTM، هم‌جهت شکل و قفل روی مرکز و گوشه‌ها ساخته و با مرز پلیگان برش می‌خورد.
      </p>

      <div>
        <label class="block text-xs font-semibold mb-1 text-zinc-400">پلیگان منبع</label>
        <select
          :value="selectedPinId"
          @change="$emit('update:selectedPinId', $event.target.value)"
          class="w-full border border-zinc-800 rounded-lg px-2 py-2 text-xs focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none bg-zinc-900"
        >
          <option value="">— انتخاب کنید —</option>
          <option v-for="opt in polygonOptions" :key="opt.id" :value="opt.id">
            {{ opt.name }} ({{ opt.typeLabel }})
          </option>
        </select>
      </div>

      <div class="flex gap-2">
        <div class="flex-1">
          <label class="block text-xs font-semibold mb-1 text-zinc-400">اندازه سلول</label>
          <input
            :value="cellSize"
            @input="$emit('update:cellSize', Number($event.target.value))"
            type="number"
            min="0.1"
            step="any"
            placeholder="مثلا 100"
            class="w-full border border-zinc-800 rounded-lg px-2 py-2 text-xs font-mono focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none"
            dir="ltr"
          />
        </div>
        <div class="w-28">
          <label class="block text-xs font-semibold mb-1 text-zinc-400">واحد</label>
          <select
            :value="cellUnit"
            @change="$emit('update:cellUnit', $event.target.value)"
            class="w-full border border-zinc-800 rounded-lg px-2 py-2 text-xs focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none bg-zinc-900"
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
          class="rounded border-zinc-800 text-orange-500 focus:ring-orange-400 w-4 h-4"
        />
        برش سلول‌ها با مرز پلیگان
      </label>

      <button
        @click="$emit('generate')"
        :disabled="!selectedPinId || generating"
        class="w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow transition"
      >
        <i class="fas fa-th"></i>
        {{ generating ? "در حال ساخت..." : "ساخت پیش‌نمایش شبکه" }}
      </button>

      <div v-if="cells.length" class="bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-xs text-orange-800">
        <div class="font-bold">{{ cells.length }} سلول برای «{{ sourceLabel }}» ساخته شد.</div>
        <div v-if="estSize" class="mt-0.5 text-orange-600">اندازه هر سلول: {{ estSize }}</div>
        <div class="mt-0.5 text-orange-600">زاویه گرید (هم‌جهت شکل): {{ angle }}°</div>
      </div>

      <div v-if="cells.length" class="flex gap-2">
        <button
          @click="$emit('save')"
          class="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-2 py-2 text-xs font-semibold flex items-center justify-center gap-1 shadow transition"
        >
          <i class="fas fa-save"></i> ذخیره سلول‌ها
        </button>
        <button
          @click="$emit('exportCSV')"
          class="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs flex items-center justify-center gap-1 transition"
        >
          <i class="fas fa-file-csv"></i> CSV
        </button>
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
});

defineEmits([
  "update:selectedPinId",
  "update:cellSize",
  "update:cellUnit",
  "update:clipToPolygon",
  "generate",
  "save",
  "exportCSV",
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

const polygonOptions = computed(() => {
  const all = flattenPins(props.pins);
  const opts = [];
  const typeLabel = { polygon: "پلیگان", circle: "دایره" };
  all.forEach((pin) => {
    const s = pin.shape;
    if (!s || s.show === false) return;
    if (s.type === "polygon" && s.positions?.length >= 3) {
      opts.push({ id: String(pin.id), name: pin.name || "(بدون نام)", typeLabel: typeLabel.polygon });
    } else if (s.type === "circle" && s.center && s.radius) {
      opts.push({ id: String(pin.id), name: pin.name || "(بدون نام)", typeLabel: typeLabel.circle });
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
