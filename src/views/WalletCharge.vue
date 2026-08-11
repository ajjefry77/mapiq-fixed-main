<template>
  <div class="page wallet-page" dir="rtl">
    <div class="wallet-shell">
      <div class="wallet-top">
        <button type="button" class="back-btn" @click="goBack" title="بازگشت">
          <i class="fas fa-arrow-right"></i>
        </button>
        <div>
          <h1 class="title">شارژ کیف پول</h1>
          <p class="sub">انتخاب مبلغ و پرداخت (فعلاً به‌صورت محلی)</p>
        </div>
      </div>

      <div class="balance-card">
        <div class="balance-label">موجودی فعلی</div>
        <div class="balance-row">
          <span class="balance-amount" dir="ltr">{{ formatMoney(walletBalance) }}</span>
          <span class="balance-unit">ریال</span>
        </div>
      </div>

      <div class="card">
        <h2 class="card-title">مبلغ شارژ</h2>
        <div class="presets">
          <button
            v-for="p in presets"
            :key="p"
            type="button"
            class="preset"
            :class="{ active: amount === p }"
            @click="amount = p"
          >
            {{ formatMoney(p) }}
          </button>
        </div>
        <label class="field-label">مبلغ دلخواه (ریال)</label>
        <input
          v-model.number="amount"
          type="number"
          min="10000"
          step="10000"
          class="input amount-input"
          dir="ltr"
          placeholder="مثلاً 100000"
        />
        <p class="hint">حداقل مبلغ: ۱۰٬۰۰۰ ریال</p>
      </div>

      <div class="card">
        <h2 class="card-title">روش پرداخت</h2>
        <label class="pay-option">
          <input type="radio" value="local" v-model="method" />
          <span>
            <strong>پرداخت آزمایشی (محلی)</strong>
            <small>بدون درگاه واقعی — موجودی در همین مرورگر ذخیره می‌شود</small>
          </span>
        </label>
        <label class="pay-option disabled">
          <input type="radio" value="gateway" disabled />
          <span>
            <strong>درگاه بانکی</strong>
            <small>به‌زودی فعال می‌شود</small>
          </span>
        </label>
      </div>

      <div class="summary">
        <div>
          <span>مبلغ قابل پرداخت</span>
          <strong dir="ltr">{{ formatMoney(amount || 0) }} ریال</strong>
        </div>
        <div>
          <span>موجودی پس از شارژ</span>
          <strong dir="ltr">{{ formatMoney((walletBalance || 0) + (Number(amount) || 0)) }} ریال</strong>
        </div>
      </div>

      <button
        type="button"
        class="pay-btn"
        :disabled="paying || !validAmount"
        @click="pay"
      >
        <i class="fas fa-credit-card"></i>
        {{ paying ? 'در حال پرداخت...' : 'پرداخت و افزایش موجودی' }}
      </button>

      <p v-if="message" class="msg" :class="messageType">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()
const SERVER = import.meta.env.VITE_SERVER

const walletBalance = ref(0)
const amount = ref(100000)
const method = ref('local')
const paying = ref(false)
const message = ref('')
const messageType = ref('ok')

const presets = [50000, 100000, 200000, 500000, 1000000]

const validAmount = computed(() => Number(amount.value) >= 10000)

function formatMoney(n) {
  return (Number(n) || 0).toLocaleString('fa-IR')
}

function walletKey() {
  return 'wallet_' + (authStore.user?.id || 'guest')
}

async function loadWallet() {
  if (!authStore.user?.id) return
  try {
    const res = await axios.get(SERVER + '/api/wallet/' + authStore.user.id, {
      headers: {
        Authorization: 'Bearer ' + (authStore.token || localStorage.getItem('token') || ''),
      },
    })
    walletBalance.value = res.data?.balance ?? res.data?.amount ?? 0
  } catch {
    walletBalance.value = Number(localStorage.getItem(walletKey()) || 0)
  }
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/mapbox')
}

async function pay() {
  if (!validAmount.value) {
    message.value = 'مبلغ نامعتبر است'
    messageType.value = 'err'
    return
  }
  if (!authStore.user?.id) {
    message.value = 'لطفاً وارد حساب شوید'
    messageType.value = 'err'
    return
  }

  paying.value = true
  message.value = ''
  const add = Number(amount.value)

  try {
    await axios.post(
      SERVER + '/api/wallet/charge',
      { amount: add, userId: authStore.user.id },
      {
        headers: {
          Authorization: 'Bearer ' + (authStore.token || localStorage.getItem('token') || ''),
        },
      },
    )
    await loadWallet()
    message.value = 'شارژ با موفقیت انجام شد'
    messageType.value = 'ok'
  } catch {
    const cur = Number(localStorage.getItem(walletKey()) || 0)
    const next = cur + add
    localStorage.setItem(walletKey(), String(next))
    walletBalance.value = next
    message.value = 'پرداخت آزمایشی انجام شد و موجودی به‌صورت محلی افزایش یافت'
    messageType.value = 'ok'
  } finally {
    paying.value = false
  }
}

onMounted(loadWallet)
</script>

<style scoped>
.wallet-page {
  min-height: 100vh;
  background: #0f1117;
  padding: 24px 16px 48px;
  color: #e4e4e7;
}
.wallet-shell {
  max-width: 480px;
  margin: 0 auto;
}
.wallet-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}
.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #2a2d38;
  background: #1a1d27;
  color: #e4e4e7;
  cursor: pointer;
}
.back-btn:hover {
  border-color: #e8843c;
  color: #e8843c;
}
.title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #f4f4f5;
}
.sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: #a1a1aa;
}
.balance-card {
  background: linear-gradient(135deg, rgba(232, 132, 60, 0.18), rgba(232, 132, 60, 0.06));
  border: 1px solid rgba(232, 132, 60, 0.35);
  border-radius: 14px;
  padding: 16px 18px;
  margin-bottom: 14px;
}
.balance-label {
  font-size: 12px;
  color: #e8843c;
  margin-bottom: 6px;
}
.balance-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.balance-amount {
  font-size: 28px;
  font-weight: 800;
  color: #fb923c;
}
.balance-unit {
  font-size: 13px;
  color: #e8843c;
}
.card {
  background: #1a1d27;
  border: 1px solid #2a2d38;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
}
.card-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: #f4f4f5;
}
.presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}
.preset {
  border: 1px solid #2a2d38;
  background: #12141c;
  border-radius: 10px;
  padding: 10px 6px;
  font-size: 12px;
  cursor: pointer;
  color: #d4d4d8;
}
.preset:hover {
  border-color: #3f3f46;
}
.preset.active {
  border-color: #e8843c;
  background: rgba(232, 132, 60, 0.15);
  color: #fb923c;
  font-weight: 700;
}
.field-label {
  display: block;
  font-size: 12px;
  color: #a1a1aa;
  margin-bottom: 6px;
}
.amount-input {
  width: 100%;
  border: 1px solid #2a2d38;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 15px;
  background: #12141c;
  color: #f4f4f5;
  box-sizing: border-box;
}
.amount-input:focus {
  outline: none;
  border-color: #e8843c;
}
.hint {
  margin: 8px 0 0;
  font-size: 11px;
  color: #71717a;
}
.pay-option {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px;
  border: 1px solid #2a2d38;
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  background: #12141c;
}
.pay-option strong {
  display: block;
  font-size: 13px;
  color: #f4f4f5;
}
.pay-option small {
  display: block;
  font-size: 11px;
  color: #a1a1aa;
  margin-top: 2px;
}
.pay-option.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.summary {
  background: #1a1d27;
  border: 1px solid #2a2d38;
  border-radius: 14px;
  padding: 12px 16px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: #a1a1aa;
}
.summary > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.summary strong {
  color: #f4f4f5;
}
.pay-btn {
  width: 100%;
  border: none;
  border-radius: 12px;
  background: #e8843c;
  color: #0f1117;
  font-weight: 700;
  font-size: 14px;
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.pay-btn:hover:not(:disabled) {
  background: #f59a55;
}
.pay-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.msg {
  margin-top: 12px;
  text-align: center;
  font-size: 13px;
}
.msg.ok {
  color: #4ade80;
}
.msg.err {
  color: #f87171;
}
</style>
