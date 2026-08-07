<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
    style="background: var(--bg)"
  >
    <!-- دایره‌های تزئینی پس‌زمینه -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20"
        style="background: linear-gradient(135deg, #f97316, #fb923c)"
      ></div>
      <div
        class="absolute -bottom-20 -left-20 w-96 h-96 rounded-full opacity-20"
        style="background: linear-gradient(135deg, #3b82f6, #8b5cf6)"
      ></div>
    </div>

    <!-- Toast پیام موفقیت -->
    <Transition name="toast">
      <div
        v-if="showToast"
        class="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-md"
        style="
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.3);
          color: #4ade80;
        "
      >
        <div class="relative">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center"
            style="background: rgba(34, 197, 94, 0.2)"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <span
            v-if="toastAnimating"
            class="absolute inset-0 rounded-full"
            style="
              background: rgba(34, 197, 94, 0.4);
              animation: ping-once 1s ease-out;
            "
          ></span>
        </div>
        <div class="flex flex-col">
          <span class="font-semibold text-sm">ارسال شد ✓</span>
          <span class="text-xs opacity-80">رمز به شماره شما ارسال گردید</span>
        </div>
      </div>
    </Transition>

    <!-- کارت ورود با افکت شیشه‌ای -->
    <div
      class="relative w-full max-w-md p-8 rounded-2xl backdrop-blur-md border shadow-2xl transition-all duration-300 login-card"
      style="
        background: rgba(var(--card-bg-rgb), 0.8);
        border-color: rgba(var(--border-rgb), 0.25);
      "
    >
      <!-- هدر -->
      <div class="text-center mb-8">
        <h2
          class="text-3xl font-bold tracking-tight"
          style="color: var(--text)"
        >
          خوش آمدید
        </h2>
        <p class="mt-2 text-sm" style="color: var(--text-muted)">
          برای ورود، نام کاربری و رمز عبور خود را وارد کنید
        </p>
      </div>

      <!-- فرم -->
      <form @submit.prevent="handleLogin" class="space-y-6">
        <!-- پیام خطا -->
        <Transition name="fade-slide">
          <div
            v-if="error"
            class="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-sm"
            style="color: var(--danger)"
          >
            <span>⚠️</span>
            <span>{{ error }}</span>
          </div>
        </Transition>

        <!-- فیلد نام کاربری -->
        <div>
          <label
            for="username"
            class="block text-sm font-medium mb-1.5"
            style="color: var(--text)"
          >
            نام کاربری
          </label>
          <div class="relative">
            <i class="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-xs" style="color: var(--text-faint)"></i>
            <input
              id="username"
              v-model="form.username"
              type="text"
              required
              class="login-input"
              style="border-color: var(--border); color: var(--text)"
              placeholder="شماره همراه یا ایمیل"
              @focus="(e) => (e.target.style.borderColor = '#f97316')"
              @blur="(e) => (e.target.style.borderColor = 'var(--border)')"
            />
          </div>
        </div>

        <!-- فیلد رمز عبور -->
        <div>
          <label
            for="password"
            class="block text-sm font-medium mb-1.5"
            style="color: var(--text)"
          >
            رمز عبور
          </label>
          <div class="relative">
            <i class="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-xs" style="color: var(--text-faint)"></i>
            <input
              id="password"
              v-model="form.password"
              type="password"
              class="login-input"
              style="border-color: var(--border); color: var(--text)"
              placeholder="رمز عبور خود را وارد کنید"
              @focus="(e) => (e.target.style.borderColor = '#f97316')"
              @blur="(e) => (e.target.style.borderColor = 'var(--border)')"
            />
          </div>
        </div>

        <!-- دکمه ورود -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          style="background: linear-gradient(135deg, #f97316, #fb923c)"
        >
          {{ loading ? "در حال ورود..." : "ورود به سامانه" }}
        </button>

        <!-- دکمه ارسال رمز با تایمر -->
        <div class="space-y-2">
          <button
            type="button"
            :disabled="countdown > 0 || loading || !form.username"
            class="w-full flex items-center justify-center gap-2 text-center transition-all duration-300 bg-transparent border-0 p-0 cursor-pointer text-sm group disabled:cursor-not-allowed disabled:opacity-60"
            :class="
              countdown > 0
                ? 'text-orange-400/60'
                : 'text-orange-400 hover:text-orange-200'
            "
            @click="send_code"
          >
            <!-- آیکون پیامک با انیمیشن -->
            <div class="relative">
              <svg
                class="w-4 h-4 transition-transform duration-300 group-hover:scale-110"
                :class="{ 'animate-sms-pulse': smsAnimating }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>

            <!-- متن پویا -->
            <span v-if="countdown > 0" class="font-medium tabular-nums">
              ارسال مجدد تا
              <span
                class="inline-block min-w-[3rem] text-center px-1.5 py-0.5 rounded-md mx-1"
                style="background: rgba(249, 115, 22, 0.15); color: #fb923c"
              >
                {{ formattedTime }}
              </span>
              دیگر
            </span>
            <span v-else class="hover:underline">
              ارسال رمز به شماره همراه
            </span>
          </button>

          <!-- Progress bar تایمر -->
          <Transition name="fade-slide">
            <div
              v-if="countdown > 0"
              class="h-1 rounded-full overflow-hidden"
              style="background: rgba(249, 115, 22, 0.1)"
            >
              <div
                class="h-full rounded-full transition-all duration-1000 ease-linear"
                style="background: linear-gradient(90deg, #f97316, #fb923c)"
                :style="{ width: progressPercent + '%' }"
              ></div>
            </div>
          </Transition>
        </div>

        <!-- لینک ثبت‌نام -->
        <div class="text-center mt-2">
          <span class="text-white/80">حساب کاربری ندارید؟</span>
          <router-link
            to="/register"
            class="text-orange-400 hover:text-orange-200 hover:underline transition-colors duration-200 mr-1"
          >
            ثبت نام کنید
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import axios from "axios";

const router = useRouter();
const authStore = useAuthStore();
const API_BASE_URL = import.meta.env.VITE_SERVER + "/api";

const loading = ref(false);
const error = ref("");

// وضعیت تایمر و Toast
const countdown = ref(0); // ثانیه‌های باقی‌مانده
const TOTAL_TIME = 120; // 2 دقیقه
let timerInterval = null;

const showToast = ref(false);
const toastAnimating = ref(false);
const smsAnimating = ref(false);
let toastTimeout = null;

const form = reactive({
  username: "",
  password: "",
});

// کلید localStorage برای تایمر
const TIMER_STORAGE_KEY = "verify_code_timer";

// محاسبه زمان به فرمت MM:SS
const formattedTime = computed(() => {
  const minutes = Math.floor(countdown.value / 60);
  const seconds = countdown.value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
});

// درصد پیشرفت progress bar
const progressPercent = computed(() => {
  return (countdown.value / TOTAL_TIME) * 100;
});

// شروع تایمر و ذخیره در localStorage
function startTimer() {
  const endTime = Date.now() + TOTAL_TIME * 1000;
  localStorage.setItem(TIMER_STORAGE_KEY, endTime.toString());

  countdown.value = TOTAL_TIME;
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const storedEndTime = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!storedEndTime) {
      clearInterval(timerInterval);
      countdown.value = 0;
      return;
    }

    const remaining = Math.floor(
      (parseInt(storedEndTime) - Date.now()) / 1000
    );

    if (remaining > 0) {
      countdown.value = remaining;
    } else {
      countdown.value = 0;
      clearInterval(timerInterval);
      timerInterval = null;
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }
  }, 1000);
}

// بازیابی تایمر از localStorage
function restoreTimer() {
  const storedEndTime = localStorage.getItem(TIMER_STORAGE_KEY);
  if (!storedEndTime) return;

  const endTime = parseInt(storedEndTime);
  const remaining = Math.floor((endTime - Date.now()) / 1000);

  if (remaining > 0) {
    countdown.value = remaining;

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      const storedEndTime = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!storedEndTime) {
        clearInterval(timerInterval);
        countdown.value = 0;
        return;
      }

      const remaining = Math.floor(
        (parseInt(storedEndTime) - Date.now()) / 1000
      );

      if (remaining > 0) {
        countdown.value = remaining;
      } else {
        countdown.value = 0;
        clearInterval(timerInterval);
        timerInterval = null;
        localStorage.removeItem(TIMER_STORAGE_KEY);
      }
    }, 1000);
  } else {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  }
}

// 🆕 ریست کردن تایمر (بعد از لاگین موفق)
function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  countdown.value = 0;
  localStorage.removeItem(TIMER_STORAGE_KEY);
}

// نمایش Toast با انیمیشن
function showSuccessToast() {
  showToast.value = false;
  toastAnimating.value = false;

  setTimeout(() => {
    showToast.value = true;
    toastAnimating.value = true;

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      showToast.value = false;
      toastAnimating.value = false;
    }, 3000);
  }, 50);
}

async function send_code() {
  if (countdown.value > 0 || !form.username) return;

  loading.value = true;
  error.value = "";
  smsAnimating.value = true;

  try {
    const result = await axios.post(`${API_BASE_URL}/verify`, {
      number: form.username,
    });

    // ✅ چک کردن انعطاف‌پذیر پاسخ سرور
    const data = result.data;
    const isSuccess =
      result.status >= 200 &&
      result.status < 300 &&
      (data?.success === true ||
        data?.success === "true" ||
        data?.status === "success" ||
        data?.status === "ok" ||
        data?.code === 200 ||
        typeof data === "string" ||
        data === null ||
        data === undefined);

    if (isSuccess) {
      showSuccessToast();
      startTimer();
    } else {
      error.value =
        data?.error || data?.message || "خطا در ارسال رمز، دوباره تلاش کنید";
    }
  } catch (err) {
    console.error("❌ خطای ارسال رمز:", err.response?.data || err.message);
    error.value =
      err.response?.data?.error ||
      err.response?.data?.message ||
      "خطا در ارسال رمز، دوباره تلاش کنید";
  } finally {
    loading.value = false;
    setTimeout(() => {
      smsAnimating.value = false;
    }, 1000);
  }
}

const handleLogin = async () => {
  loading.value = true;
  error.value = "";

  try {
    const result = await authStore.login(form.username, form.password);

    if (result.success) {
      // 🆕 ریست تایمر بعد از لاگین موفق
      resetTimer();
      await router.push("/mapbox");
    } else {
      error.value = result.error;
    }
  } catch (err) {
    error.value = "خطا در ورود به سیستم";
  }

  loading.value = false;
};

// بازیابی تایمر هنگام لود صفحه
onMounted(() => {
  restoreTimer();
});

// پاکسازی هنگام unmount
onBeforeUnmount(() => {
  if (timerInterval) clearInterval(timerInterval);
  if (toastTimeout) clearTimeout(toastTimeout);
});
</script>

<style scoped>
/* ورودی‌های فرم ورود */
.login-input {
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

.login-input:focus {
  background: rgba(26, 29, 39, 0.9);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.login-input::placeholder {
  color: var(--text-faint);
  font-size: 13px;
}

.login-card {
  animation: loginCardIn 0.4s ease-out;
}

@keyframes loginCardIn {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* انیمیشن ورود Toast */
.toast-enter-active {
  animation: toast-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-leave-active {
  animation: toast-out 0.4s cubic-bezier(0.55, 0, 0.55, 0.2);
}

@keyframes toast-in {
  0% {
    opacity: 0;
    transform: translate(-50%, -30px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
}

@keyframes toast-out {
  0% {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -20px) scale(0.95);
  }
}

/* انیمیشن ping یکبار */
@keyframes ping-once {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

/* انیمیشن پالس آیکون پیامک */
.animate-sms-pulse {
  animation: sms-pulse 1s ease-in-out;
}

@keyframes sms-pulse {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
  }
  25% {
    transform: scale(1.2) rotate(-10deg);
  }
  50% {
    transform: scale(1.3) rotate(10deg);
  }
  75% {
    transform: scale(1.1) rotate(-5deg);
  }
}

/* انیمیشن fade-slide برای پیام خطا و progress bar */
.fade-slide-enter-active {
  animation: fade-slide-in 0.4s ease-out;
}
.fade-slide-leave-active {
  animation: fade-slide-out 0.3s ease-in;
}

@keyframes fade-slide-in {
  0% {
    opacity: 0;
    transform: translateY(-8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-slide-out {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-8px);
  }
}
</style>