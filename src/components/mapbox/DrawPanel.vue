<template>
  <div
    ref="panelEl"
    v-show="panelReady"
    class="fixed bg-white rounded-lg shadow-2xl w-80 overflow-hidden pointer-events-auto z-50"
    :class="{ invisible: !panelPositioned }"
    :style="{
      left: panelTranslate.x + 'px',
      top: panelTranslate.y + 'px',
    }"
  >
    <div
      class="bg-black text-white px-4 py-2 flex justify-between items-center cursor-move"
      @mousedown="$emit('startDrag', $event)"
    >
      <button @click="$emit('cancel')" class="hover:text-gray-200 text-lg">
        ✕
      </button>
      <h3 class="font-bold text-sm">{{ title }}</h3>
    </div>

    <div class="flex border-b bg-gray-50">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="$emit('update:activeTab', tab.key)"
        :class="[
          'flex-1 py-1.5 text-xs transition-colors',
          activeTab === tab.key
            ? 'border-b-2 border-orange-500 text-orange-600 bg-white font-medium'
            : 'text-gray-500 hover:text-gray-700',
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="p-3 max-h-72 overflow-y-auto text-sm">
      <div v-if="activeTab === 'measurements'" class="space-y-3">
        <div class="border border-gray-200 rounded p-2 space-y-2">
          <div>
            <label class="block text-xs mb-1 text-gray-600">نام ترسیم</label>
            <input
              :value="formData.name"
              @input="
                $emit('update:formData', {
                  ...formData,
                  name: $event.target.value,
                })
              "
              :class="[
                'w-full border rounded p-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none',
                nameError ? 'border-red-500' : '',
              ]"
              placeholder="نام ترسیم را وارد کنید"
            />
            <p v-if="nameError" class="text-red-500 text-xs mt-1">
              نام اجباری است
            </p>
          </div>
          <div>
            <label class="block text-xs mb-1 text-gray-600">توضیحات</label>
            <textarea
              :value="formData.description"
              @input="
                $emit('update:formData', {
                  ...formData,
                  description: $event.target.value,
                })
              "
              placeholder="توضیحات اضافی..."
              rows="2"
              class="w-full border rounded p-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            ></textarea>
          </div>
          <div v-if="drawMode === 'circle' || shape?.type === 'circle'">
            <label class="block text-xs mb-1 text-gray-600">فایل ضمیمه</label>
            <input
              type="file"
              @change="$emit('fileChange', $event)"
              class="w-full text-xs"
            />
            <p v-if="attchFileName" class="mt-1 text-xs text-green-600">
              {{ attchFileName }} انتخاب شد
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between bg-gray-50 rounded p-2">
          <span class="text-xs text-gray-600">سیستم مختصات:</span>
          <div class="flex gap-1">
            <button
              @click="$emit('update:coordinateSystem', 'latlon')"
              :class="[
                'px-2 py-0.5 text-xs rounded transition',
                coordinateSystem === 'latlon'
                  ? 'bg-accent text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
              ]"
            >
              Lat/Long
            </button>
            <button
              @click="$emit('update:coordinateSystem', 'utm')"
              :class="[
                'px-2 py-0.5 text-xs rounded transition',
                coordinateSystem === 'utm'
                  ? 'bg-accent text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
              ]"
            >
              UTM
            </button>
          </div>
        </div>

        <div class="bg-gray-900 rounded p-2 text-xs space-y-1.5">
          <div class="flex justify-between items-center">
            <span class="text-gray-400">تعداد نقاط:</span>
            <span class="font-bold text-orange-400">{{ livePointCount }}</span>
          </div>
          <div
            v-if="
              drawMode === 'polyline' ||
              drawMode === 'polygon' ||
              shape?.type === 'polyline' ||
              shape?.type === 'polygon'
            "
            class="flex justify-between items-center border-t border-gray-700 pt-1.5"
          >
            <span class="text-gray-400">طول کل:</span>
            <span class="font-bold text-orange-400">{{ liveTotalLength }}</span>
          </div>
          <div
            v-if="drawMode === 'polygon' || shape?.type === 'polygon'"
            class="flex justify-between items-center border-t border-gray-700 pt-1.5"
          >
            <span class="text-gray-400">مساحت:</span>
            <span class="font-bold text-green-400">{{ liveArea }}</span>
          </div>
          <div
            v-if="drawMode === 'circle' || shape?.type === 'circle'"
            class="flex justify-between items-center border-t border-gray-700 pt-1.5"
          >
            <span class="text-gray-400">شعاع:</span>
            <span class="font-bold text-accent">{{ liveRadius }}</span>
          </div>
          <div
            v-if="liveCenter && centerText"
            class="flex justify-between items-center border-t border-gray-700 pt-1.5 gap-2"
          >
            <span class="text-gray-400 shrink-0">مرکز:</span>
            <span class="font-mono text-[10px] text-blue-300 text-left break-all" dir="ltr">
              {{ centerText }}
            </span>
          </div>
        </div>

        <!-- بخش جدول مختصات -->
        <div>
          <h4 class="text-xs font-medium mb-2 text-gray-700">
            {{
              drawMode === "multi_point" || shape?.type === "multi_point"
                ? "نقاط"
                : drawMode === "measure"
                  ? "اندازه‌گیری"
                  : "مختصات نقاط"
            }}:
          </h4>
          <div class="max-h-40 overflow-y-auto border rounded">
            <table class="w-full text-xs">
              <thead class="bg-gray-100 text-gray-600 sticky top-0">
                <tr>
                  <th class="p-1.5 border-b text-center font-medium">id</th>
                  <th class="p-1.5 border-b text-center font-medium">
                    {{ coordinateSystem === "utm" ? "x" : "lon" }}
                  </th>
                  <th class="p-1.5 border-b text-center font-medium">
                    {{ coordinateSystem === "utm" ? "y" : "lat" }}
                  </th>
                  <th
                    v-if="coordinateSystem === 'utm'"
                    class="p-1.5 border-b text-center font-medium"
                  >
                    zone
                  </th>
                  <th class="p-1.5 border-b text-center w-8"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(point, index) in displayPoints"
                  :key="index"
                  class="hover:bg-orange-50 transition group border-b last:border-b-0"
                >
                  <td class="p-1.5 text-center text-gray-600">
                    {{ point.id || index + 1 }}
                  </td>

                  <td class="p-1.5 text-left font-mono text-[10px]" dir="ltr">
                    {{
                      getCoordValue(
                        point,
                        coordinateSystem === "utm" ? "x" : "lng",
                      )
                    }}
                  </td>

                  <td class="p-1.5 text-left font-mono text-[10px]" dir="ltr">
                    {{
                      getCoordValue(
                        point,
                        coordinateSystem === "utm" ? "y" : "lat",
                      )
                    }}
                  </td>

                  <td
                    v-if="coordinateSystem === 'utm'"
                    class="p-1.5 text-left font-mono text-[10px]"
                    dir="ltr"
                  >
                    {{ getCoordValue(point, "zone") }}
                  </td>

                  <td class="p-1.5 text-center">
                    <button
                      @click="$emit('copyCoordinates', point)"
                      class="text-gray-400 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition"
                      title="کپی مختصات"
                    >
                      <i class="fas fa-copy text-xs"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            v-if="displayPoints.length === 0"
            class="text-center py-4 text-gray-400 text-xs border rounded"
          >
            <p>در حال ترسیم روی نقشه کلیک کنید</p>
          </div>
        </div>
      </div>

      <!-- تب مختصات دستی UTM -->
      <div v-if="activeTab === 'manual'" class="space-y-3">
        <p class="text-xs text-gray-600 leading-relaxed">
          مختصات UTM نقاط را وارد کنید. پس از تکمیل، شکل روی نقشه ترسیم می‌شود.
        </p>
        <div class="flex items-center gap-2 text-xs">
          <label class="text-gray-600 shrink-0">Zone پیش‌فرض:</label>
          <input
            v-model.number="manualDefaultZone"
            type="number"
            min="1"
            max="60"
            class="w-16 border rounded px-1.5 py-1 text-xs font-mono focus:border-orange-500 outline-none"
          />
        </div>
        <div class="border rounded overflow-hidden">
          <table class="w-full text-xs">
            <thead class="bg-gray-100 text-gray-600">
              <tr>
                <th class="p-1.5 border-b text-center w-8">#</th>
                <th class="p-1.5 border-b text-center">Easting (X)</th>
                <th class="p-1.5 border-b text-center">Northing (Y)</th>
                <th class="p-1.5 border-b text-center w-14">Zone</th>
                <th class="p-1.5 border-b text-center w-8"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in manualRows"
                :key="idx"
                class="border-b last:border-b-0"
              >
                <td class="p-1 text-center text-gray-500">{{ idx + 1 }}</td>
                <td class="p-1">
                  <input
                    v-model="row.easting"
                    type="text"
                    inputmode="decimal"
                    placeholder="easting"
                    class="w-full border rounded px-1 py-0.5 text-[11px] font-mono focus:border-orange-500 outline-none"
                    dir="ltr"
                  />
                </td>
                <td class="p-1">
                  <input
                    v-model="row.northing"
                    type="text"
                    inputmode="decimal"
                    placeholder="northing"
                    class="w-full border rounded px-1 py-0.5 text-[11px] font-mono focus:border-orange-500 outline-none"
                    dir="ltr"
                  />
                </td>
                <td class="p-1">
                  <input
                    v-model.number="row.zone"
                    type="number"
                    min="1"
                    max="60"
                    class="w-full border rounded px-1 py-0.5 text-[11px] font-mono focus:border-orange-500 outline-none"
                    dir="ltr"
                  />
                </td>
                <td class="p-1 text-center">
                  <button
                    type="button"
                    @click="removeManualRow(idx)"
                    class="text-gray-400 hover:text-red-500"
                    title="حذف ردیف"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            @click="addManualRow"
            class="flex-1 px-2 py-1.5 text-xs border rounded hover:bg-gray-50 transition"
          >
            + افزودن نقطه
          </button>
          <button
            type="button"
            @click="applyManual"
            :disabled="!canApplyManual"
            :class="[
              'flex-1 px-2 py-1.5 text-xs rounded transition shadow',
              canApplyManual
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed',
            ]"
          >
            اعمال و ترسیم
          </button>
        </div>
        <p class="text-[10px] text-gray-400">
          حداقل نقاط:
          {{
            drawMode === 'polygon'
              ? '۳'
              : drawMode === 'polyline'
                ? '۲'
                : '۱'
          }}
        </p>
      </div>

      <div v-if="activeTab === 'style'" class="space-y-3">
        <div v-if="shape">
          <label class="block text-xs mb-1 text-gray-600">رنگ</label>
          <div class="flex gap-1 items-center">
            <input
              type="color"
              :value="shape.color"
              @input="$emit('update:shapeColor', $event.target.value)"
              class="w-8 h-8 border rounded cursor-pointer"
            />
            <input
              :value="shape.color"
              @input="$emit('update:shapeColor', $event.target.value)"
              class="flex-1 border rounded p-1 text-xs font-mono focus:border-orange-500 outline-none"
              placeholder="#ff0000"
            />
          </div>
        </div>
        <div v-if="shape && shape.type === 'polyline'">
          <label class="block text-xs mb-1 text-gray-600">نوع خط</label>
          <div class="grid grid-cols-4 gap-1">
            <button
              v-for="opt in lineStyleOptions"
              :key="opt.id"
              type="button"
              @click="$emit('update:lineStyle', opt.id)"
              :title="opt.label"
              :class="[
                'h-9 flex items-center justify-center border rounded transition px-1',
                (shape.dash || 'solid') === opt.id
                  ? 'ring-2 ring-orange-400 border-orange-400 bg-orange-50'
                  : 'hover:bg-gray-50',
              ]"
            >
              <span class="block w-full" :style="miniLineStyle(opt.id)"></span>
            </button>
          </div>
        </div>
        <div v-if="shape && shape.type === 'multi_point'">
          <label class="block text-xs mb-1 text-gray-600">شکل نقطه</label>
          <div class="grid grid-cols-6 gap-1">
            <button
              v-for="sym in pointSymbolOptions"
              :key="sym.id"
              type="button"
              @click="$emit('update:pointSymbol', sym.id)"
              :title="sym.label"
              :class="[
                'h-8 flex items-center justify-center border rounded transition text-gray-700',
                (shape.symbol || 'circle') === sym.id
                  ? 'ring-2 ring-orange-400 border-orange-400 bg-orange-50 text-orange-500'
                  : 'hover:bg-gray-50',
              ]"
            >
              <svg
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none"
                v-html="sym.svg"
              ></svg>
            </button>
          </div>
        </div>
        <div v-if="shape">
          <label class="block text-xs mb-1 text-gray-600">
            شفافیت: {{ Math.round(shape.opacity * 100) }}%
          </label>
          <input
            type="range"
            :value="shape.opacity"
            @input="
              $emit('update:shapeOpacity', parseFloat($event.target.value))
            "
            min="0"
            max="1"
            step="0.1"
            class="w-full accent-orange-500"
          />
        </div>
        <div
          v-if="
            shape && shape.type !== 'circle' && shape.type !== 'multi_point'
          "
        >
          <label class="block text-xs mb-1 text-gray-600">ضخامت خط</label>
          <input
            type="number"
            :value="shape.width"
            @input="$emit('update:shapeWidth', parseInt($event.target.value))"
            min="1"
            max="10"
            class="w-24 border rounded p-1 text-xs focus:border-orange-500 outline-none"
          />
        </div>
        <div
          v-if="shape"
          class="w-full h-16 rounded border-2 flex items-center justify-center text-xs"
          :style="{
            backgroundColor: shape.color + '30',
            borderColor: shape.color,
          }"
        >
          <span :style="{ color: shape.color }">پیش‌نمایش رنگ</span>
        </div>
        <div v-if="!shape" class="text-center py-4 text-gray-400 text-xs">
          <p>پس از اتمام ترسیم، استایل قابل تغییر است</p>
        </div>
      </div>
    </div>

    <div
      class="px-3 py-2 bg-gray-50 border-t flex justify-between items-center gap-2"
    >
      <button
        @click="$emit('cancel')"
        class="px-3 py-1.5 text-gray-600 hover:text-red-600 text-xs transition"
      >
        انصراف
      </button>
      <div class="flex gap-2">
        <button
          v-if="!shape && canFinishDrawing"
          type="button"
          @click="$emit('finish')"
          class="px-3 py-1.5 rounded text-xs transition shadow bg-blue-600 text-white hover:bg-blue-700"
          title="اتمام ترسیم (Enter)"
        >
          اتمام ترسیم
        </button>
        <button
          @click="$emit('save')"
          :disabled="!isSaveEnabled"
          :class="[
            'px-4 py-1.5 rounded text-xs transition shadow',
            isSaveEnabled
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed',
          ]"
        >
          ذخیره ترسیم
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const panelEl = ref(null);

const props = defineProps({
  panelReady: { type: Boolean, default: false },
  panelPositioned: { type: Boolean, default: false },
  panelTranslate: { type: Object, default: () => ({ x: 0, y: 0 }) },
  title: { type: String, default: "ترسیم جدید" },
  tabs: { type: Array, default: () => [] },
  activeTab: { type: String, default: "measurements" },
  drawMode: { type: String, default: "" },
  shape: { type: Object, default: null },
  coordinateSystem: { type: String, default: "latlon" },
  livePointCount: { type: Number, default: 0 },
  liveTotalLength: { type: String, default: "0 m" },
  liveArea: { type: String, default: "0 m²" },
  liveRadius: { type: String, default: "0 m" },
  liveCenter: { type: Object, default: null },
  canFinishDrawing: { type: Boolean, default: false },
  displayPoints: { type: Array, default: () => [] },
  formData: { type: Object, default: () => ({ name: "", description: "" }) },
  attchFileName: { type: String, default: "" },
  nameError: { type: Boolean, default: false },
  isSaveEnabled: { type: Boolean, default: false },
  formatCoordinate: { type: Function, default: () => "" },
});

const emit = defineEmits([
  "startDrag",
  "cancel",
  "save",
  "finish",
  "applyManualCoords",
  "update:activeTab",
  "update:coordinateSystem",
  "update:formData",
  "fileChange",
  "update:shapeColor",
  "update:shapeOpacity",
  "update:shapeWidth",
  "update:lineStyle",
  "update:pointSymbol",
  "copyCoordinates",
]);

const lineStyleOptions = [
  { id: "solid", label: "پیوسته" },
  { id: "dashed", label: "خط چین" },
  { id: "dotted", label: "نقطه‌چین" },
  { id: "dashdot", label: "نقطه-خط" },
];

function miniLineStyle(id) {
  if (id === "dashdot") {
    return {
      height: "2px",
      background:
        "repeating-linear-gradient(to right, #333 0 5px, transparent 5px 7px, #333 7px 9px, transparent 9px 12px)",
    };
  }
  return { borderTop: "2px " + (id === "dashed" ? "dashed" : id === "dotted" ? "dotted" : "solid") + " #333" };
}

const pointSymbolOptions = [
  { id: "circle", label: "دایره", svg: '<path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"/>' },
  { id: "square", label: "مربع", svg: '<path d="M3 3v18h18V3"/>' },
  { id: "triangle", label: "مثلث", svg: '<path d="M1 21h22L12 2"/>' },
  { id: "diamond", label: "لوزی", svg: '<path d="M6 2L2 8l10 14L22 8l-4-6z"/>' },
  { id: "star", label: "ستاره", svg: '<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2L9.19 8.62L2 9.24l5.45 4.73L5.82 21z"/>' },
  { id: "pin", label: "نشان", svg: '<path d="M12 11.5A2.5 2.5 0 0 1 9.5 9A2.5 2.5 0 0 1 12 6.5A2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7"/>' },
];

const centerText = computed(() => {
  const c = props.liveCenter;
  if (!c) return "";
  const x = Number(c.displayX);
  const y = Number(c.displayY);
  if (!isFinite(x) || !isFinite(y)) return "";
  if (c.system === "utm") return `${x.toFixed(2)} E, ${y.toFixed(2)} N`;
  return `${x.toFixed(6)}, ${y.toFixed(6)}`;
});

const getCoordValue = (point, type) => {
  if (!point) return "-";
  if (type === "x")
    return (
      point.displayX ??
      point.x ??
      point.easting ??
      point.lng ??
      point.lon ??
      point[0] ??
      "-"
    );
  if (type === "y")
    return (
      point.displayY ??
      point.y ??
      point.northing ??
      point.lat ??
      point[1] ??
      "-"
    );
  if (type === "zone") return point.zone ?? "-";
  return "-";
};

const manualDefaultZone = ref(39);
const manualRows = ref([
  { easting: "", northing: "", zone: 39 },
  { easting: "", northing: "", zone: 39 },
  { easting: "", northing: "", zone: 39 },
]);

watch(manualDefaultZone, (z) => {
  manualRows.value.forEach((r) => {
    if (r.zone == null || r.zone === "") r.zone = z;
  });
});

function addManualRow() {
  manualRows.value.push({
    easting: "",
    northing: "",
    zone: manualDefaultZone.value || 39,
  });
}

function removeManualRow(idx) {
  if (manualRows.value.length <= 1) {
    manualRows.value[0] = {
      easting: "",
      northing: "",
      zone: manualDefaultZone.value || 39,
    };
    return;
  }
  manualRows.value.splice(idx, 1);
}

const canApplyManual = computed(() => {
  const valid = manualRows.value.filter(
    (r) =>
      r.easting !== "" &&
      r.northing !== "" &&
      isFinite(Number(r.easting)) &&
      isFinite(Number(r.northing)),
  );
  const mode = props.drawMode;
  if (mode === "polygon") return valid.length >= 3;
  if (mode === "polyline") return valid.length >= 2;
  if (mode === "multi_point") return valid.length >= 1;
  return false;
});

function applyManual() {
  if (!canApplyManual.value) return;
  const rows = manualRows.value
    .filter(
      (r) =>
        r.easting !== "" &&
        r.northing !== "" &&
        isFinite(Number(r.easting)) &&
        isFinite(Number(r.northing)),
    )
    .map((r) => ({
      easting: Number(r.easting),
      northing: Number(r.northing),
      zone: Number(r.zone) || manualDefaultZone.value || 39,
    }));
  emit("applyManualCoords", rows);
}

defineExpose({ panelEl });
</script>
