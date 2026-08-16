<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">کارتابل من</h1>
        <p class="page-subtitle">وظایف و فرآیندهای در انتظار شما</p>
      </div>
    </div>

    <div v-if="!tasks.length" class="empty-state card">
      <i class="fas fa-inbox"></i>
      <p>فعلاً تسکی ندارید</p>
    </div>

    <div class="tasks-list">
      <div v-for="t in tasks" :key="t.id" class="task-card card">
        <div class="task-body">
          <div class="task-icon"><i class="fas fa-tasks"></i></div>
          <div class="task-info">
            <div class="task-title">{{ t.ProcessInstance?.Process?.name }}</div>
            <div class="task-meta">مرحله {{ t.step_id }} — وضعیت: {{ t.status }}</div>
          </div>
        </div>
        <div class="task-actions">
          <button @click="claim(t.id)" class="btn btn-ghost btn-sm">
            <i class="fas fa-hand-paper"></i> Claim
          </button>
          <button @click="complete(t.id)" class="btn btn-primary btn-sm">
            <i class="fas fa-check"></i> Complete
          </button>
        </div>
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

<style scoped>
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 720px;
}

.task-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px;
  flex-wrap: wrap;
}

.task-body {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.task-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  background: var(--accent-glow);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.task-info { min-width: 0; }

.task-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.task-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

@media (max-width: 560px) {
  .task-card { flex-direction: column; align-items: stretch; }
  .task-actions { justify-content: flex-end; }
}
</style>
