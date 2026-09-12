<template>
  <div class="nf" role="alert" aria-label="صفحه یافت نشد">
    <div class="nf__grid" aria-hidden="true" />
    <div class="nf__glow" aria-hidden="true" />
    <div class="nf__pin nf__pin--1" aria-hidden="true"><Icon icon="mdi:map-marker" width="18" height="18" /></div>
    <div class="nf__pin nf__pin--2" aria-hidden="true"><Icon icon="mdi:map-marker-outline" width="16" height="16" /></div>
    <div class="nf__pin nf__pin--3" aria-hidden="true"><Icon icon="mdi:navigation" width="15" height="15" /></div>

    <div class="nf__card">
      <div class="badge">خطای ۴۰۴</div>

      <div class="nf__code" aria-hidden="true">
        <span>4</span>
        <span class="nf__radar">
          <span class="nf__sweep" />
          <span class="nf__rings" />
          <Icon icon="mdi:compass-outline" width="44" height="44" class="nf__compass" />
        </span>
        <span>4</span>
      </div>

      <h1 class="nf__title">این مختصات روی نقشه نیست!</h1>
      <p class="nf__desc">
        صفحه‌ای که دنبالش می‌گردی وجود ندارد یا جابه‌جا شده است.
        <span v-if="badPath" class="nf__path" dir="ltr">/{{ badPath }}</span>
      </p>
      <p class="nf__coords" dir="ltr" aria-hidden="true">{{ coords }}</p>

      <div class="nf__actions">
        <RouterLink to="/mapbox" class="btn btn-primary">بازگشت به نقشه</RouterLink>
        <button class="btn btn-secondary" @click="goBack">صفحه قبلی</button>
      </div>

      <div class="nf__links">
        <RouterLink to="/dashboard">داشبورد</RouterLink>
        <span class="nf__sep">•</span>
        <RouterLink to="/map">نقشه سه‌بعدی</RouterLink>
        <span class="nf__sep">•</span>
        <RouterLink to="/inbox">کارتابل</RouterLink>
        <span class="nf__sep">•</span>
        <RouterLink to="/forms">فرم‌ها</RouterLink>
      </div>

      <p class="nf__hint">برای بازگشت سریع کلید <span class="kbd">Home</span> را بزنید</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const badPath = computed(() => {
  const pm = route.params.pathMatch;
  if (Array.isArray(pm)) return pm.join('/');
  if (typeof pm === 'string') return pm.replace(/^\//, '');
  return (route.fullPath ?? '').replace(/^\//, '').slice(0, 120);
});

const coords = ref('35.6892° N, 51.3890° E');
onMounted(() => {
  const t = setInterval(() => {
    const lat = (35.6 + Math.random() * 0.2).toFixed(4);
    const lng = (51.3 + Math.random() * 0.2).toFixed(4);
    coords.value = `${lat}° N, ${lng}° E — signal lost`;
  }, 1600);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Home' || e.key === 'Escape') router.replace('/mapbox');
  };
  window.addEventListener('keydown', onKey);
  onUnmounted(() => {
    clearInterval(t);
    window.removeEventListener('keydown', onKey);
  });
});

function goBack() {
  if (window.history.length > 1) router.back();
  else router.replace('/mapbox');
}
</script>

<style scoped>
.nf {
  position: relative;
  min-height: calc(100vh - 60px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  overflow: hidden;
  isolation: isolate;
}
.nf__grid {
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 75%);
}
.nf__glow {
  position: absolute;
  z-index: -1;
  width: 560px;
  height: 320px;
  top: -60px;
  background: radial-gradient(closest-side, var(--accent-glow-strong), transparent);
  filter: blur(10px);
  pointer-events: none;
}
.nf__pin {
  position: absolute;
  color: var(--accent-soft);
  opacity: 0.55;
  animation: nf-float 4s ease-in-out infinite;
  filter: drop-shadow(0 4px 12px var(--accent-glow-strong));
}
.nf__pin--1 { top: 18%; right: 14%; }
.nf__pin--2 { top: 62%; right: 9%; color: var(--text-faint); animation-delay: -1.4s; }
.nf__pin--3 { top: 30%; left: 10%; color: var(--info); animation-delay: -2.6s; }
@keyframes nf-float {
  0%, 100% { transform: translateY(0) rotate(-6deg); }
  50% { transform: translateY(-10px) rotate(6deg); }
}
.nf__card {
  width: 100%;
  max-width: 540px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 30%), linear-gradient(180deg, var(--surface), var(--bg-elevated));
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  padding: 36px 32px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: nf-in 0.35s var(--ease-out);
}
@keyframes nf-in {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
.nf__code {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 78px;
  font-weight: 800;
  line-height: 1;
  direction: ltr;
  user-select: none;
  font-variant-numeric: tabular-nums;
}
.nf__radar {
  position: relative;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  background: radial-gradient(circle, var(--accent-glow-strong), var(--surface2) 70%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: var(--shadow-md), 0 0 24px var(--accent-glow);
}
.nf__rings {
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  border: 1px dashed var(--border-strong);
  animation: nf-spin 14s linear infinite;
}
.nf__sweep {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg, var(--accent) 0deg, transparent 90deg);
  opacity: 0.55;
  animation: nf-spin 2.4s linear infinite;
}
@keyframes nf-spin { to { transform: rotate(360deg); } }
.nf__compass { position: relative; color: var(--accent-soft); }
.nf__title { margin: 4px 0 0; font-size: 20px; font-weight: 800; }
.nf__desc { margin: 0; font-size: 13.5px; color: var(--text-muted); line-height: 2; }
.nf__path {
  display: inline-block;
  font-size: 11.5px;
  font-family: ui-monospace, monospace;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1px 8px;
  margin-inline-start: 6px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  direction: ltr;
}
.nf__coords {
  margin: 0;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: var(--text-faint);
  letter-spacing: 0.3px;
}
.nf__actions { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; justify-content: center; }
.nf__links { display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 12px; flex-wrap: wrap; justify-content: center; }
.nf__links a { color: var(--text-faint); }
.nf__links a:hover { color: var(--accent-soft); text-decoration: underline; }
.nf__sep { color: var(--border-strong); }
.nf__hint { margin: 6px 0 0; font-size: 11px; color: var(--text-faint); }
@media (max-width: 520px) {
  .nf__card { padding: 28px 20px 20px; }
  .nf__code { font-size: 60px; }
  .nf__radar { width: 74px; height: 74px; }
  .nf__pin--1 { right: 6%; }
}
</style>
