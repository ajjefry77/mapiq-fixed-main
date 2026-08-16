<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت فرآیندها</h1>
        <p class="page-subtitle">تعریف و مدیریت فرآیند</p>
      </div>
    </div>

    <WorkflowStages />
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
