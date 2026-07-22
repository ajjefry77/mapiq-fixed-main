<template>
  <button class="absolute top-32 md:top-20 right-[5px] md:right-[350px] w-10 h-10 rounded-full flex items-center justify-center border-[1px] border-gray-500 shadow-lg" style="background: rgba(26,29,39,.85);"
    @click="resetNorth" title="Reset to North">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-600 absolute top-1" viewBox="0 0 24 24" fill="currentColor"
      :style="{transform: `rotate(${rotation}deg)`, 'transform-origin': '50% 120%'}">
      <path d="M12 2l6 12H6l6-12z" />
    </svg>
    <span class="font-bold text-gray-700 z-10" style="margin-top:8px">N</span>
  </button>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from "vue";
const props = defineProps({ map: { type: Object, required: true } });
const rotation = ref(0);
let listener;
onMounted(() => {
  listener = () => {
    if (props.map) rotation.value = -props.map.getBearing();
  };
  props.map.on('rotate', listener);
});
onUnmounted(() => { if (listener && props.map) props.map.off('rotate', listener); });
function resetNorth() {
  if (props.map) {
    props.map.rotateTo(0, { duration: 1500 });
  }
}
</script>
