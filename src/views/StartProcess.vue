<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">🚀 شروع فرآیند</h1>

    <select v-model="selected" class="border p-2 rounded mb-3 w-full">
      <option disabled value="">انتخاب فرآیند...</option>
      <option v-for="p in processes" :key="p.id" :value="p.id">{{ p.name }}</option>
    </select>

    <div class="mt-4">
      <label class="block mb-2 font-semibold">توضیحات / ورودی:</label>
      <textarea v-model="context.reason" class="border p-2 rounded w-full" rows="3"></textarea>
    </div>

    <button @click="start" class="btn btn-primary">شروع فرآیند</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getProcesses, startProcess } from '../api'

const processes = ref([])
const selected = ref('')
const context = ref({ reason: '' })

async function start() {
  if (!selected.value) return alert('ابتدا فرآیند را انتخاب کنید')
  const res = await startProcess(selected.value, { started_by: 1, context: context.value })
  alert('نمونه فرآیند ایجاد شد با ID: ' + res.instanceId)
}

onMounted(async () => {
  processes.value = await getProcesses()
})
</script>
