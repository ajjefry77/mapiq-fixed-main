<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">شروع فرآیند</h1>
        <p class="page-subtitle">فرآیند موردنظر را انتخاب و شروع کنید</p>
      </div>
    </div>

    <div class="card start-card">
      <div class="form-row">
        <label>انتخاب فرآیند</label>
        <select v-model="selected" class="select-native">
          <option disabled value="">انتخاب فرآیند...</option>
          <option v-for="p in processes" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>

      <div class="form-row">
        <label>توضیحات / ورودی</label>
        <textarea v-model="context.reason" class="textarea" rows="4" placeholder="توضیحات اولیه فرآیند..."></textarea>
      </div>

      <button @click="start" class="btn btn-primary btn-lg" :disabled="!selected">
        <i class="fas fa-play"></i> شروع فرآیند
      </button>
    </div>
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

<style scoped>
.start-card {
  max-width: 560px;
  padding: 24px;
}
</style>
