<template>
  <div class="node-card">
    <span class="node-icon"><i class="fas fa-cog"></i></span>
    <h3 class="node-name">{{ node.name }}</h3>
    <p class="node-meta">عملیات : {{ node.operation }}</p>
    <p class="node-meta">{{ node.destination }}</p>
  </div>
</template>
<script setup>
defineProps({ node: Object })
</script>

<style scoped>
.node-card {
  background: linear-gradient(180deg, var(--surface), var(--bg-elevated));
  border: 1px solid var(--border);
  border-color: var(--accent-dim);
  border-radius: var(--radius-lg);
  padding: 16px;
  text-align: center;
  min-width: 160px;
  box-shadow: var(--shadow-md);
  position: relative;
  transition: all var(--transition-base);
}

.node-card:hover {
  transform: translateY(-3px);
  border-color: var(--accent);
  box-shadow: 0 8px 24px var(--accent-glow);
}

.node-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-glow);
  color: var(--accent);
  font-size: 14px;
  margin-bottom: 8px;
}

.node-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
  word-break: break-word;
}

.node-meta {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
}

@media (max-width: 480px) {
  .node-card { min-width: 130px; padding: 12px; }
}
</style>
