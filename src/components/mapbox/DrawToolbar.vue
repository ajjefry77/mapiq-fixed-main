<template>
  <div ref="toolbarEl" class="absolute top-[calc(var(--top)+150px)] left-1 z-50">
    <div @click.stop class="flex flex-col rounded shadow-md p-2 gap-2">
      <button
        @click="$emit('toggleMeasure')"
        title="اندازه گیری"
        style="margin: 0"
        class="w-8 h-8 rounded flex items-center justify-center shadow-md"
        :class="
          drawMode === 'measure'
            ? 'text-white bg-blue-500'
            : 'text-black bg-gray-200'
        "
      >
        <i class="fas fa-ruler m-1"></i>
      </button>
      <button
        @click="$emit('togglePointPick')"
        :class="[
          'w-8 h-8 rounded flex items-center justify-center shadow-md',
          pickForForm ? 'text-white bg-blue-500' : 'text-black bg-gray-200',
        ]"
        title="نقطه (انتخاب برای فرم)"
      >
        <i class="fas fa-location-pin"></i>
      </button>
      <button
        @click="$emit('setDrawMode', 'multi_point')"
        :class="[
          'w-8 h-8 rounded flex items-center justify-center shadow-md',
          drawMode === 'multi_point'
            ? 'text-white bg-blue-500'
            : 'text-black bg-gray-200',
        ]"
        title="چند نقطه"
      >
        <i class="fas fa-braille"></i>
      </button>
      <button
        @click="$emit('setDrawMode', 'polyline')"
        :class="[
          'w-8 h-8 rounded flex items-center justify-center shadow-md',
          drawMode === 'polyline'
            ? 'text-white bg-blue-500'
            : 'text-black bg-gray-200',
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
      <button
        @click="$emit('setDrawMode', 'polygon')"
        :class="[
          'w-8 h-8 rounded flex items-center justify-center shadow-md',
          drawMode === 'polygon'
            ? 'text-white bg-blue-500'
            : 'text-black bg-gray-200',
        ]"
        title="پلیگون"
      >
        <i class="fas fa-draw-polygon"></i>
      </button>
      <button
        @click="$emit('setDrawMode', 'circle')"
        :class="[
          'w-8 h-8 rounded flex items-center justify-center shadow-md',
          drawMode === 'circle'
            ? 'text-white bg-blue-500'
            : 'text-black bg-gray-200',
        ]"
        title="دایره"
      >
        <i class="fa fa-circle"></i>
      </button>
      <label
        class="w-8 h-8 flex items-center justify-center bg-gray-200 rounded shadow-md cursor-pointer"
        title="انتخاب رنگ"
      >
        <span class="w-5 h-5 rounded border" :style="{ backgroundColor: color }"></span>
        <input type="color" :value="color" @input="$emit('update:color', $event.target.value)" class="hidden" />
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const toolbarEl = ref(null);

defineProps({
  drawMode: { type: String, default: '' },
  pickForForm: { type: Boolean, default: false },
  color: { type: String, default: '#ff0000' },
});

defineEmits(['toggleMeasure', 'togglePointPick', 'setDrawMode', 'update:color']);

defineExpose({ toolbarEl });
</script>
