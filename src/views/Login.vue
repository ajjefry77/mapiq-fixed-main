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

    <!-- کارت ورود با افکت شیشه‌ای -->
    <div
      class="relative w-full max-w-md p-8 rounded-2xl backdrop-blur-sm border shadow-2xl transition-all duration-300"
      style="
        background: rgba(var(--card-bg-rgb), 0.7);
        border-color: rgba(var(--border-rgb), 0.2);
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
        <div
          v-if="error"
          class="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-sm"
          style="color: var(--danger)"
        >
          <span>⚠️</span>
          <span>{{ error }}</span>
        </div>

        <!-- فیلد نام کاربری -->
        <div>
          <label
            for="username"
            class="block text-sm font-medium mb-1.5"
            style="color: var(--text)"
          >
            نام کاربری
          </label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            required
            class="w-full px-0 py-2 border-0 border-b-2 bg-transparent focus:ring-0 transition-colors duration-200 placeholder:text-sm"
            style="border-color: var(--border); color: var(--text)"
            placeholder="شماره همراه یا ایمیل"
            @focus="(e) => (e.target.style.borderColor = '#f97316')"
            @blur="(e) => (e.target.style.borderColor = 'var(--border)')"
          />
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
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="w-full px-0 py-2 border-0 border-b-2 bg-transparent focus:ring-0 transition-colors duration-200 placeholder:text-sm"
            style="border-color: var(--border); color: var(--text)"
            placeholder="رمز عبور خود را وارد کنید"
            @focus="(e) => (e.target.style.borderColor = '#f97316')"
            @blur="(e) => (e.target.style.borderColor = 'var(--border)')"
          />
        </div>

        <!-- دکمه ورود (گرادیانی با سایه) -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          style="background: linear-gradient(135deg, #f97316, #fb923c)"
        >
          {{ loading ? "در حال ورود..." : "ورود به سامانه" }}
        </button>

        <!-- دکمه ارسال رمز (لینک‌گونه) -->
        <button
          type="button"
          class="w-full text-center text-orange-400 hover:text-orange-200 hover:underline transition-all duration-200 bg-transparent border-0 p-0 cursor-pointer text-sm"
          @click="send_code"
        >
          ارسال رمز به شماره همراه
        </button>

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
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import axios from "axios";

const router = useRouter();
const authStore = useAuthStore();
const API_BASE_URL = import.meta.env.VITE_SERVER + "/api";

const loading = ref(false);
const error = ref("");

const form = reactive({
  username: "",
  password: "",
});

async function send_code() {
  loading.value = true;
  error.value = "";

  try {
    const result = await axios.post(`${API_BASE_URL}/verify`, {
      number: form.username,
    });

    if (result.data?.success) {
      console.log(result);
    } else {
      error.value = result.data?.error;
    }
  } catch (err) {
    error.value = "خطا در ارسال رمز";
  }

  loading.value = false;
}

const handleLogin = async () => {
  loading.value = true;
  error.value = "";

  try {
    const result = await authStore.login(form.username, form.password);

    if (result.success) {
      await router.push("/mapbox");
    } else {
      error.value = result.error;
    }
  } catch (err) {
    error.value = "خطا در ورود به سیستم";
  }

  loading.value = false;
};
</script>
