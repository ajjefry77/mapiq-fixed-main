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
      <button @click="$emit('cancel')" class="hover:text-gray-200 text-lg">✕</button>
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
            : 'text-gray-500 hover:text-gray-700'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="p-3 max-h-72 overflow-y-auto text-sm">
      <div v-if="activeTab === 'measurements'" class="space-y-3">
        <div class="flex items-center justify-between bg-gray-50 rounded p-2">
          <span class="text-xs text-gray-600">سیستم مختصات:</span>
          <div class="flex gap-1">
            <button
              @click="$emit('update:coordinateSystem', 'latlon')"
              :class="[
                'px-2 py-0.5 text-xs rounded transition',
                coordinateSystem === 'latlon'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              Lat/Long
            </button>
            <button
              @click="$emit('update:coordinateSystem', 'utm')"
              :class="[
                'px-2 py-0.5 text-xs rounded transition',
                coordinateSystem === 'utm'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              UTM
            </button>
          </div>
        </div>

        <div class="bg-gray-900 rounded p-2 text-xs space-y-1.5">
          <div class="flex justify-between items-center">
            <span class="text-gray-600">تعداد نقاط:</span>
            <span class="font-bold text-orange-600">{{ livePointCount }}</span>
          </div>
          <div
            v-if="drawMode === 'polyline' || drawMode === 'polygon' || shape?.type === 'polyline' || shape?.type === 'polygon'"
            class="flex justify-between items-center border-t border-orange-200 pt-1.5"
          >
            <span class="text-gray-600">طول کل:</span>
            <span class="font-bold text-orange-600">{{ liveTotalLength }}</span>
          </div>
          <div
            v-if="drawMode === 'polygon' || shape?.type === 'polygon'"
            class="flex justify-between items-center border-t border-orange-200 pt-1.5"
          >
            <span class="text-gray-600">مساحت:</span>
            <span class="font-bold text-green-600">{{ liveArea }}</span>
          </div>
          <div
            v-if="drawMode === 'circle' || shape?.type === 'circle'"
            class="flex justify-between items-center border-t border-orange-200 pt-1.5"
          >
            <span class="text-gray-600">شعاع:</span>
            <span class="font-bold text-purple-600">{{ liveRadius }}</span>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-medium mb-2 text-gray-700">
            {{ drawMode === 'multi_point' || shape?.type === 'multi_point' ? 'نقاط' : 'مختصات نقاط' }}:
          </h4>
          <div class="space-y-1 max-h-32 overflow-y-auto">
            <div
              v-for="(point, index) in displayPoints"
              :key="index"
              class="bg-gray-50 rounded p-1.5 text-xs flex justify-between items-center hover:bg-orange-50 transition group"
            >
              <span class="text-gray-600">نقطه {{ index + 1 }}</span>
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs">
                  {{ formatCoordinate(point) }}
                </span>
                <button
                  @click="$emit('copyCoordinates', point)"
                  class="text-gray-400 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition"
                  title="کپی مختصات"
                >
                  <i class="fas fa-copy text-xs"></i>
                </button>
              </div>
            </div>
          </div>
          <div v-if="displayPoints.length === 0" class="text-center py-4 text-gray-400 text-xs">
            <p>در حال ترسیم روی نقشه کلیک کنید</p>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'info'" class="space-y-2">
        <div>
          <label class="block text-xs mb-1 text-gray-600">نام ترسیم</label>
          <input
            :value="formData.name"
            @input="$emit('update:formData', { ...formData, name: $event.target.value })"
            :class="[
              'w-full border rounded p-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none',
              nameError ? 'border-red-500' : ''
            ]"
            placeholder="نام ترسیم را وارد کنید"
          />
          <p v-if="nameError" class="text-red-500 text-xs mt-1">نام اجباری است</p>
        </div>
        <div>
          <label class="block text-xs mb-1 text-gray-600">توضیحات</label>
          <textarea
            :value="formData.description"
            @input="$emit('update:formData', { ...formData, description: $event.target.value })"
            placeholder="توضیحات اضافی..."
            rows="2"
            class="w-full border rounded p-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          ></textarea>
        </div>
        <div v-if="drawMode === 'circle' || shape?.type === 'circle'">
          <label class="block text-xs mb-1 text-gray-600">فایل ضمیمه</label>
          <input type="file" @change="$emit('fileChange', $event)" class="w-full text-xs" />
          <p v-if="attchFileName" class="mt-1 text-xs text-green-600">
            {{ attchFileName }} انتخاب شد
          </p>
        </div>
      </div>

      <div v-if="activeTab === 'style'" class="space-y-3">
        <div v-if="shape">
          <label class="block text-xs mb-1 text-gray-600">رنگ</label>
          <div class="flex gap-1 items-center">
            <input type="color" :value="shape.color" @input="$emit('update:shapeColor', $event.target.value)" class="w-8 h-8 border rounded cursor-pointer" />
            <input
              :value="shape.color"
              @input="$emit('update:shapeColor', $event.target.value)"
              class="flex-1 border rounded p-1 text-xs font-mono focus:border-orange-500 outline-none"
              placeholder="#ff0000"
            />
          </div>
        </div>
        <div v-if="shape">
          <label class="block text-xs mb-1 text-gray-600">
            شفافیت: {{ Math.round(shape.opacity * 100) }}%
          </label>
          <input
            type="range"
            :value="shape.opacity"
            @input="$emit('update:shapeOpacity', parseFloat($event.target.value))"
            min="0"
            max="1"
            step="0.1"
            class="w-full accent-orange-500"
          />
        </div>
        <div v-if="shape && shape.type !== 'circle' && shape.type !== 'multi_point'">
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
            borderColor: shape.color
          }"
        >
          <span :style="{ color: shape.color }">پیش‌نمایش رنگ</span>
        </div>
        <div v-if="!shape" class="text-center py-4 text-gray-400 text-xs">
          <p>پس از اتمام ترسیم، استایل قابل تغییر است</p>
        </div>
      </div>
    </div>

    <div class="px-3 py-2 bg-gray-50 border-t flex justify-between items-center">
      <button
        @click="$emit('cancel')"
        class="px-3 py-1.5 text-gray-600 hover:text-red-600 text-xs transition"
      >
        انصراف
      </button>
      <button
        @click="$emit('save')"
        :disabled="!isSaveEnabled"
        :class="[
          'px-4 py-1.5 rounded text-xs transition shadow',
          isSaveEnabled
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        ]"
      >
        ذخیره ترسیم
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const panelEl = ref(null);

defineProps({
  panelReady: { type: Boolean, default: false },
  panelPositioned: { type: Boolean, default: false },
  panelTranslate: { type: Object, default: () => ({ x: 0, y: 0 }) },
  title: { type: String, default: 'ترسیم جدید' },
  tabs: { type: Array, default: () => [] },
  activeTab: { type: String, default: 'measurements' },
  drawMode: { type: String, default: '' },
  shape: { type: Object, default: null },
  coordinateSystem: { type: String, default: 'latlon' },
  livePointCount: { type: Number, default: 0 },
  liveTotalLength: { type: String, default: '0 m' },
  liveArea: { type: String, default: '0 m²' },
  liveRadius: { type: String, default: '0 m' },
  displayPoints: { type: Array, default: () => [] },
  formData: { type: Object, default: () => ({ name: '', description: '' }) },
  attchFileName: { type: String, default: '' },
  nameError: { type: Boolean, default: false },
  isSaveEnabled: { type: Boolean, default: false },
  formatCoordinate: { type: Function, default: () => '' },
});

defineEmits([
  'startDrag',
  'cancel',
  'save',
  'update:activeTab',
  'update:coordinateSystem',
  'update:formData',
  'fileChange',
  'update:shapeColor',
  'update:shapeOpacity',
  'update:shapeWidth',
  'copyCoordinates',
]);

defineExpose({ panelEl });
</script>
