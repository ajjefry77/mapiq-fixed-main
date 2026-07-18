<template>
  <div class="min-h-screen">
    <main class="flex-1 overflow-y-auto">
      <div class="p-8">
        <div class="flex justify-between items-center mb-8">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">مدیریت فرآیندها</h2>
            <p class="text-gray-600">تعریف و مدیریت فرآیند</p>
          </div>
        </div>

            <WorkflowStages />

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import WorkflowForm from '../components/WorkflowForm.vue'
import WorkflowStages from '../components/WorkflowStages.vue'

import LettersDashboard from '../components/LettersDashboard.vue'

const workflowId = ref(null)

function onWorkflowCreated(id) {
  workflowId.value = id
}
</script>