<template>
  <div v-if="active" class="loading-overlay">
    <div class="loading-spinner"></div>
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

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(9, 11, 18, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: overlayIn 0.2s ease-out;
}

@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.loading-spinner {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 4px solid var(--border);
  border-top-color: var(--accent);
  border-right-color: var(--accent);
  animation: spin 0.8s linear infinite;
  box-shadow: 0 0 24px var(--accent-glow);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
