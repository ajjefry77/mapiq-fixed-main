<template>
  <label class="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" class="sr-only peer"
      :checked="modelValue" @change="$emit('update:modelValue', $event.target.checked)">
    <div :class="modelValue ? 'text-left' : 'text-right'"
      class="w-12 h-6 bg-blue-600 px-1 py-0.5 rounded-full peer peer-checked:bg-blue-600
           after:content-[''] after:absolute after:top-[2px] after:left-[2px]
           after:bg-white after:border-gray-300 after:border after:rounded-full
           after:h-5 after:w-5 after:transition-all
           peer-checked:after:translate-x-6 peer-checked:after:border-white">
      <span v-if="left || right" class="w-full text-xs text-white">{{modelValue ? right : left}}</span>
    </div>
  </label>
</template>
<script setup>
defineProps({ modelValue: Boolean, left: String, right: String })
defineEmits(['update:modelValue'])
</script>
