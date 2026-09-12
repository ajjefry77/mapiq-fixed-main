<template>
  <div v-if="active" class="loading-overlay" role="status" aria-live="polite" aria-label="در حال بارگذاری">
    <div class="loading-card">
      <div v-if="showBar" class="loading-ring" aria-hidden="true">
        <svg viewBox="0 0 64 64" class="loading-ring-svg">
          <circle cx="32" cy="32" r="26" class="loading-ring-track" />
          <circle
            cx="32" cy="32" r="26" class="loading-ring-fill"
            :stroke-dasharray="ringCirc"
            :stroke-dashoffset="ringOffset"
          />
        </svg>
        <span class="loading-ring-pct">{{ Math.round(clampedProgress) }}٪</span>
      </div>
      <div v-else class="loading-spinner" aria-hidden="true"></div>
      <div v-if="message" class="loading-msg">{{ message }}</div>
      <div v-if="sub" class="loading-sub">{{ sub }}</div>
      <div v-if="showBar" class="loading-bar" aria-hidden="true">
        <div class="loading-bar-fill" :style="{ width: clampedProgress + '%' }"></div>
      </div>
      <ol v-if="hasSteps" class="loading-steps">
        <li
          v-for="(s, i) in steps"
          :key="i"
          class="loading-step"
          :class="{
            'is-done': i < activeStep,
            'is-active': i === activeStep,
          }"
        >
          <span class="loading-step-dot">
            <i v-if="i < activeStep" class="fas fa-check"></i>
            <span v-else-if="i === activeStep" class="loading-step-pulse"></span>
            <span v-else class="loading-step-num">{{ toFa(i + 1) }}</span>
          </span>
          <span class="loading-step-label">{{ typeof s === 'string' ? s : s.label }}</span>
        </li>
      </ol>
      <span class="sr-only">در حال بارگذاری...</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  active: { type: Boolean, default: false },
  message: { type: String, default: '' },
  sub: { type: String, default: '' },
  progress: { type: Number, default: null },
  steps: { type: Array, default: () => [] },
  activeStep: { type: Number, default: 0 },
});

const clampedProgress = computed(() => {
  const v = Number(props.progress);
  if (!isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
});
const showBar = computed(() => props.progress !== null && props.progress !== undefined);
const hasSteps = computed(() => Array.isArray(props.steps) && props.steps.length > 0);

const ringCirc = 2 * Math.PI * 26;
const ringOffset = computed(() => ringCirc * (1 - clampedProgress.value / 100));

function toFa(n) {
  try { return Number(n).toLocaleString('fa-IR'); } catch { return String(n); }
}
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(9, 11, 18, 0.62);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  animation: overlayIn 0.2s ease-out;
}

@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  max-width: min(420px, calc(100vw - 40px));
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 40%), var(--surface, #1a1d27);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 18px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5), 0 0 32px var(--accent-glow, rgba(232, 132, 60, 0.08));
  padding: 26px 28px;
  animation: cardIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(14px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.loading-spinner {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 4px solid var(--border, #2e3348);
  border-top-color: var(--accent, #e8843c);
  border-right-color: var(--accent, #e8843c);
  animation: spin 0.8s linear infinite;
  box-shadow: 0 0 24px var(--accent-glow, rgba(232, 132, 60, 0.08));
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-ring {
  position: relative;
  width: 84px;
  height: 84px;
}

.loading-ring-svg {
  width: 84px;
  height: 84px;
  transform: rotate(-90deg);
}

.loading-ring-track {
  fill: none;
  stroke: var(--border, #2e3348);
  stroke-width: 7;
}

.loading-ring-fill {
  fill: none;
  stroke: var(--accent, #e8843c);
  stroke-width: 7;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.25s ease-out;
  filter: drop-shadow(0 0 6px var(--accent-glow-strong, rgba(232, 132, 60, 0.16)));
}

.loading-ring-pct {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 800;
  color: var(--text, #e8eaf0);
  font-variant-numeric: tabular-nums;
}

.loading-msg {
  font-size: 14px;
  font-weight: 700;
  color: var(--text, #e8eaf0);
  text-align: center;
  line-height: 1.8;
}

.loading-sub {
  font-size: 12px;
  color: var(--text-muted, #9aa1c0);
  text-align: center;
  line-height: 1.9;
  word-break: break-all;
}

.loading-bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: var(--surface2, #22263a);
  border: 1px solid var(--border, #2e3348);
  overflow: hidden;
  margin-top: 4px;
}

.loading-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--brand-1, #ea580c), var(--brand-2, #f97316), var(--brand-3, #fb923c));
  box-shadow: 0 0 12px var(--brand-glow, rgba(249, 115, 22, 0.45));
  transition: width 0.25s ease-out;
}

.loading-steps {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loading-step {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  color: var(--text-faint, #767da0);
  transition: color 0.25s ease;
}

.loading-step-dot {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  background: var(--surface2, #22263a);
  border: 1px solid var(--border, #2e3348);
  color: var(--text-faint, #767da0);
}

.loading-step.is-done {
  color: var(--success, #3ecf8e);
}

.loading-step.is-done .loading-step-dot {
  background: var(--success-glow, rgba(62, 207, 142, 0.12));
  border-color: rgba(62, 207, 142, 0.4);
  color: var(--success, #3ecf8e);
}

.loading-step.is-active {
  color: var(--text, #e8eaf0);
  font-weight: 700;
}

.loading-step.is-active .loading-step-dot {
  border-color: var(--accent, #e8843c);
  box-shadow: 0 0 0 3px var(--accent-glow, rgba(232, 132, 60, 0.08));
}

.loading-step-pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent, #e8843c);
  animation: stepPulse 1s ease-in-out infinite;
}

@keyframes stepPulse {
  0%, 100% { transform: scale(0.7); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 1; }
}

.loading-step-num {
  font-variant-numeric: tabular-nums;
}
</style>
