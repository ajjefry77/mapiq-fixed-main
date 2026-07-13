<template>
  <div class="flex flex-col items-center" dir="ltr">
    <div class="flex items-center">
      <template v-for="(len, index) in maskPattern" :key="index">
        <input ref="inputs" type="text" v-model="parts[index]" :maxlength="len" @input="onInput(index)"
          @keydown.backspace="onBackspace(index, $event)" :style="{ width: `${len * 0.5 + 1.5}rem` }"
          class="text-center font-mono text-lg border border-gray-300 py-2 rounded-none" />
      </template>
      <label class="text-gray-700 text-xs px-1"> : کد نوسازی </label>
    </div>
  </div>
</template>
<script setup>
import { ref, nextTick } from 'vue'
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
const maskPattern = [2, 2, 3, 4]
const parts = ref(maskPattern.map(() => ''))
const inputs = ref([])
const onInput = (index) => {
  parts.value[index] = parts.value[index].replace(/\D/g, '')
  if (parts.value[index].length === maskPattern[index] && index < maskPattern.length - 1)
    nextTick(() => inputs.value[index + 1]?.focus())
  emit('update:modelValue', (parts.value.filter(Boolean).join('-')))
}
const onBackspace = (index) => {
  if (parts.value[index] === '' && index > 0) nextTick(() => inputs.value[index - 1]?.focus())
}
</script>
<style scoped>
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type="number"] { -moz-appearance: textfield; }
</style>
