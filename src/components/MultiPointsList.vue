<template>
  <div v-if ="pointList.length"
       class="fixed bottom-2 right-[1px] md:right-[350px] z-49 w-96 bg-zinc-900 rounded-lg shadow-lg border">
    <button @click="close" class="absolute top-[10px] left-[15px] text-zinc-400 hover:text-red-600" >
      ✖
    </button>

    <div class="px-4 py-3 border-b font-bold">
      مختصات نقاط
    </div>

    <div class="max-h-80 overflow-y-auto">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-zinc-800">
        <tr>
          <th class="p-2 border">ردیف</th>
          <th class="p-2 border">X (UTM)</th>
          <th class="p-2 border">Y (UTM)</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="point in pointList" :key="point.id" class="hover:bg-neutral-950" >
          <td class="p-2 border text-center"> {{ point.row }} </td>
          <td class="p-2 border text-left font-mono"> {{ point.x }} </td>
          <td class="p-2 border text-left font-mono"> {{ point.y }} </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import {ref} from "vue"
const props = defineProps({
  pointList : { type: Array, required: true }
});
const emit = defineEmits(['close'])

function close() {
  emit('close')
}
</script>

<style scoped>

</style>