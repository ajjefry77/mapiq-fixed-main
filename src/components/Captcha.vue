<template>
  <div class="captcha">
    <label class="captcha-label">کد امنیتی</label>

    <div class="captcha-row">
      <canvas
        ref="canvasRef"
        class="captcha-canvas"
        :width="W"
        :height="H"
        aria-label="عبارت امنیتی"
        @click="refresh"
      ></canvas>
      <div class="captcha-tools">
        <button
          type="button"
          class="captcha-btn"
          title="کد جدید"
          aria-label="کد جدید"
          @click.prevent="refresh"
        >
          <i class="fas fa-rotate-right"></i>
        </button>
        <button
          type="button"
          class="captcha-btn"
          title="شنیدن کد"
          aria-label="شنیدن کد"
          @click.prevent="speak"
        >
          <i class="fas fa-volume-high"></i>
        </button>
      </div>
    </div>

    <div class="relative">
      <i
        class="fas fa-shield-halved absolute left-4 top-1/2 -translate-y-1/2 text-xs"
        style="color: var(--text-faint)"
      ></i>
      <input
        v-model.trim="input"
        type="text"
        inputmode="latin"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        class="captcha-input"
        :style="{ borderColor }"
        placeholder="کد نمایش داده شده را وارد کنید"
        @input="handleInput"
        @focus="borderColor = '#f97316'"
        @blur="borderColor = 'var(--border)'"
      />
    </div>

    <Transition name="captcha-fade">
      <p v-if="errorMessage" class="captcha-error">
        <i class="fas fa-triangle-exclamation"></i>
        {{ errorMessage }}
      </p>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  generateChallenge,
  verifyAnswer,
  challengeString,
  challengeToSpeech,
} from '../utils/captcha'

const W = 180
const H = 56

const emit = defineEmits(['valid-change'])

const canvasRef = ref(null)
const input = ref('')
const errorMessage = ref('')
const valid = ref(false)
const challenge = ref(generateChallenge())
const borderColor = ref('var(--border)')

function pick(palette, i) {
  return palette[i % palette.length]
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, W, H)

  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, '#14161f')
  grad.addColorStop(1, '#23283d')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  const lineColors = ['#3a4060', '#e8843c', '#5ea3ff', '#3ecf8e', '#8b5cf6']
  ctx.lineWidth = 1
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = pick(lineColors, i)
    ctx.globalAlpha = 0.45
    ctx.beginPath()
    ctx.moveTo(0, Math.random() * H)
    ctx.bezierCurveTo(
      W * 0.33,
      Math.random() * H,
      W * 0.66,
      Math.random() * H,
      W,
      Math.random() * H
    )
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(232,132,60,0.4)' : 'rgba(255,255,255,0.25)'
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4)
  }

  const text = challengeString(challenge.value)
  const colors = ['#fb923c', '#e8eaf0', '#5ea3ff', '#3ecf8e', '#ff5572', '#c4b5fd']
  let x = 18
  ctx.textBaseline = 'middle'
  for (let i = 0; i < text.length; i++) {
    ctx.save()
    ctx.translate(x, H / 2 + (Math.random() - 0.5) * 8)
    ctx.rotate((Math.random() - 0.5) * 0.55)
    ctx.font = `700 ${22 + Math.floor(Math.random() * 4)}px Vazirmatn, Vazir, sans-serif`
    ctx.fillStyle = pick(colors, i)
    ctx.fillText(text[i], 0, 0)
    ctx.restore()
    x += 24 + Math.floor(Math.random() * 8)
  }
}

function refresh() {
  challenge.value = generateChallenge()
  input.value = ''
  errorMessage.value = ''
  valid.value = false
  emit('valid-change', false)
  draw()
}

function handleInput() {
  if (!input.value) {
    errorMessage.value = ''
    valid.value = false
    emit('valid-change', false)
    return
  }
  const ok = verifyAnswer(challenge.value, input.value)
  valid.value = ok
  if (ok) {
    errorMessage.value = ''
  }
  emit('valid-change', ok)
}

function validate() {
  const ok = verifyAnswer(challenge.value, input.value)
  if (ok) {
    errorMessage.value = ''
    valid.value = true
    emit('valid-change', true)
    return true
  }
  errorMessage.value = 'کد امنیتی صحیح نیست'
  challenge.value = generateChallenge()
  input.value = ''
  valid.value = false
  emit('valid-change', false)
  draw()
  return false
}

function speak() {
  try {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return
    const utter = new SpeechSynthesisUtterance(challengeToSpeech(challenge.value))
    utter.lang = 'en-US'
    utter.rate = 0.8
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  } catch (e) {
    // پشتیبانی‌نشده — نادیده می‌گیریم
  }
}

onMounted(() => {
  draw()
})

onBeforeUnmount(() => {
  try {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
  } catch (e) {
    // ignore
  }
})

defineExpose({ validate, refresh, valid })
</script>

<style scoped>
.captcha-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.captcha-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
  margin-bottom: 8px;
}

.captcha-canvas {
  width: 180px;
  height: 56px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  display: block;
}

.captcha-canvas:hover {
  border-color: var(--border-strong);
}

.captcha-tools {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.captcha-btn {
  flex: 1;
  min-width: 0;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.captcha-btn:hover {
  background: var(--surface3);
  color: var(--text);
  border-color: var(--border-strong);
}

.captcha-input {
  width: 100%;
  padding: 12px 14px 12px 40px;
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  background: rgba(26, 29, 39, 0.6);
  border-radius: var(--radius);
  outline: none;
  font-family: var(--font);
  font-size: 14px;
  transition: all 0.2s ease;
  direction: rtl;
}

.captcha-input:focus {
  background: rgba(26, 29, 39, 0.9);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.captcha-input::placeholder {
  color: var(--text-faint);
  font-size: 13px;
}

.captcha-error {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--danger);
  margin-top: 6px;
}

.captcha-fade-enter-active {
  animation: captcha-fade-in 0.3s ease-out;
}
.captcha-fade-leave-active {
  animation: captcha-fade-out 0.2s ease-in;
}

@keyframes captcha-fade-in {
  0% { opacity: 0; transform: translateY(-4px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes captcha-fade-out {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-4px); }
}
</style>