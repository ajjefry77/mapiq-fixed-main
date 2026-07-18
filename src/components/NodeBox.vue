<template>
  <div class="bg-white shadow-md rounded-lg p-4 text-center min-w-[160px] border">
    <h3 class="font-semibold text-lg text-gray-800">{{ node.name }}</h3>
    <p class="text-sm text-gray-500">عملیات : {{ node.operation }}</p>
    <p class="text-sm text-gray-500">{{ node.destination }}</p>
  </div>
</template>
<script setup>
defineProps({ node: Object })
</script>
