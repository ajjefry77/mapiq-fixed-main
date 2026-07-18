<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">📥 کارتابل من</h1>
    <div v-if="tasks.length === 0" class="text-gray-500">فعلاً تسکی ندارید</div>

    <div v-for="t in tasks" :key="t.id" class="p-4 mb-3 border rounded-lg shadow-sm bg-white">
      <div class="font-semibold">{{ t.ProcessInstance?.Process?.name }}</div>
      <div class="text-sm text-gray-500">مرحله {{ t.step_id }} — وضعیت: {{ t.status }}</div>
      <div class="mt-2 space-x-2">
        <button @click="claim(t.id)" class="bg-blue-500 text-white px-3 py-1 rounded">Claim</button>
        <button @click="complete(t.id)" class="btn btn-primary btn-sm">Complete</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getTasks, claimTask, completeTask } from '../api'
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const tasks = ref([])

async function load() {
  const res = await getTasks(authStore.user.id)
  tasks.value = res
}

async function claim(id) {
  await claimTask(authStore.user.id, id)
  await load()
}

async function complete(id) {
  const output = { approved: true }
  await completeTask(id, { output })
  await load()
}

onMounted(load)
</script>
