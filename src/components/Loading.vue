<template>
  <div
      v-if="active"
      class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
  >
    <div
        class="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"
    ></div>
  </div>
</template>

<script setup>
defineProps({
  active: {
    type: Boolean,
    default: false
  }
})
</script>
