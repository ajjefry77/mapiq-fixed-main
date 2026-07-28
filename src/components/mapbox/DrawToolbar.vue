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

      <div class="relative">
        <button
          @click.stop="expanded = !expanded"
          :class="[
            'w-8 h-8 rounded flex items-center justify-center shadow-md',
            expanded ? 'text-white bg-blue-500' : 'text-black bg-gray-200',
          ]"
          title="نقشه پایه"
        >
          <i class="fas fa-layer-group"></i>
        </button>
        <div
          v-show="expanded"
          @click.stop
          class="absolute top-0 left-full ml-2 w-[260px] max-w-[calc(100vw-24px)] p-2 bg-white border border-gray-300 rounded shadow-md z-50"
        >
          <div class="flex gap-2 flex-wrap">
            <div
              v-for="basemap in baseMaps"
              :key="basemap.name"
              @click="$emit('setBaseLayer', basemap); expanded = false"
              class="w-20 h-20 rounded border cursor-pointer overflow-hidden shadow hover:shadow-lg relative shrink-0"
              :title="basemap.name"
            >
              <img :src="basemap.thumbnail" class="w-full h-full object-cover"/>
              <span class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1">{{ basemap.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        @click="map?.zoomIn({ duration: 200 })"
        class="w-8 h-8 rounded flex items-center justify-center shadow-md text-black bg-gray-200 font-bold"
        title="بزرگنمایی"
      >
        +
      </button>
      <button
        @click="map?.zoomOut({ duration: 200 })"
        class="w-8 h-8 rounded flex items-center justify-center shadow-md text-black bg-gray-200 font-bold"
        title="کوچکنمایی"
      >
        −
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const toolbarEl = ref(null);
const expanded = ref(false);

defineProps({
  map: { type: Object, default: null },
  drawMode: { type: String, default: '' },
  pickForForm: { type: Boolean, default: false },
  baseMaps: { type: Array, default: () => [] },
});

defineEmits(['toggleMeasure', 'togglePointPick', 'setDrawMode', 'setBaseLayer']);

defineExpose({ toolbarEl });
</script>
