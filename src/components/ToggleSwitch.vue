<template>
  <label class="toggle-wrap">
    <input
      type="checkbox"
      class="toggle-input"
      :checked="modelValue"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
    <span class="toggle-track" :class="{ 'toggle-track--on': modelValue }">
      <span class="toggle-thumb"></span>
      <span v-if="left || right" class="toggle-label" :class="{ 'toggle-label--on': modelValue }">
        {{ modelValue ? right : left }}
      </span>
    </span>
  </label>
</template>
<script setup>
defineProps({ modelValue: Boolean, left: String, right: String })
defineEmits(['update:modelValue'])
</script>

<style scoped>
.toggle-wrap {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.toggle-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  width: 46px;
  height: 24px;
  background: var(--surface3);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2px;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  position: relative;
}

.toggle-track--on {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 10px var(--accent-glow);
}

.toggle-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  transition: transform var(--transition-fast);
  flex-shrink: 0;
}

.toggle-track--on .toggle-thumb {
  transform: translateX(-20px);
}

.toggle-label {
  position: absolute;
  font-size: 9px;
  font-weight: 700;
  color: var(--text-muted);
  left: 6px;
  transition: all var(--transition-fast);
  pointer-events: none;
  white-space: nowrap;
}

.toggle-label--on {
  color: rgba(255, 255, 255, 0.9);
  left: auto;
  right: 6px;
}
</style>
