<template>
  <div>
    <h2 class="letters-title">وضعیت نامه‌ها</h2>
    <div class="letters-grid">
      <div v-for="letter in letters" :key="letter.id" class="letter-card card">
        <h3 class="letter-subject">{{ letter.subject }}</h3>
        <div class="letter-row">
          <span class="letter-label">از:</span>
          <span class="letter-value">{{ letter.from }}</span>
        </div>
        <div class="letter-row">
          <span class="letter-label">به:</span>
          <span class="letter-value">{{ letter.to }}</span>
        </div>
        <span class="letter-status" :class="statusClass(letter.status)">
          {{ letter.status }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
const letters = [
  { id: 1, subject: 'درخواست خرید', from: 'واحد فنی', to: 'مدیر مالی', status: 'در حال بررسی' },
  { id: 2, subject: 'درخواست مرخصی', from: 'کارمند ۲', to: 'مدیر منابع انسانی', status: 'تایید شده' },
  { id: 3, subject: 'ارسال فاکتور', from: 'حسابداری', to: 'مدیر کل', status: 'رد شده' }
]

function statusClass(status) {
  return {
    'در حال بررسی': 'status-review',
    'تایید شده': 'status-approved',
    'رد شده': 'status-rejected'
  }[status] || 'status-default'
}
</script>

<style scoped>
.letters-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.letters-title::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
}

.letters-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.letter-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.letter-subject {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.letter-row {
  display: flex;
  gap: 6px;
  font-size: 13px;
}

.letter-label {
  color: var(--text-faint);
  flex-shrink: 0;
}

.letter-value {
  color: var(--text-muted);
}

.letter-status {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin-top: 8px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.status-review {
  background: var(--warning-glow);
  color: var(--warning);
}

.status-approved {
  background: var(--success-glow);
  color: var(--success);
}

.status-rejected {
  background: var(--danger-glow);
  color: var(--danger);
}

.status-default {
  background: rgba(123, 130, 160, 0.12);
  color: var(--text-muted);
}

@media (max-width: 480px) {
  .letters-grid { grid-template-columns: 1fr; }
}
</style>
