<template>
  <div 
    class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
    style="background: var(--bg);"
  >
    <!-- دایره‌های تزئینی پس‌زمینه -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20" 
           style="background: linear-gradient(135deg, #f97316, #fb923c);"></div>
      <div class="absolute -bottom-20 -left-20 w-96 h-96 rounded-full opacity-20"
           style="background: linear-gradient(135deg, #3b82f6, #8b5cf6);"></div>
    </div>

    <!-- کارت شیشه‌ای -->
    <div 
      class="relative w-full max-w-md p-8 rounded-2xl backdrop-blur-sm border shadow-2xl transition-all duration-300"
      style="background: rgba(var(--card-bg-rgb), 0.7); border-color: rgba(var(--border-rgb), 0.2);"
    >
      <!-- هدر -->
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold tracking-tight" style="color: var(--text);">
          ثبت نام
        </h2>
        <p class="mt-2 text-sm" style="color: var(--text-muted);">
          برای ایجاد حساب کاربری اطلاعات خود را وارد کنید
        </p>
      </div>

      <!-- فرم -->
      <form @submit.prevent="handleRegister" class="space-y-6">
        <!-- پیام خطا -->
        <Transition name="fade-slide">
          <div 
            v-if="error" 
            class="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-sm"
            style="color: var(--danger);"
          >
            <span>⚠️</span>
            <span>{{ error }}</span>
          </div>
        </Transition>

        <!-- فیلد نام و نام خانوادگی -->
        <div>
          <label for="name" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            نام و نام خانوادگی
          </label>
          <div class="relative">
            <i class="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-xs" style="color: var(--text-faint)"></i>
            <input
              id="name"
              v-model="form.name"
              type="text"
              required
              class="login-input"
              style="color: var(--text);"
              placeholder="نام کامل خود را وارد کنید"
              @focus="e => e.target.style.borderColor = '#f97316'"
              @blur="e => e.target.style.borderColor = 'var(--border)'"
            />
          </div>
        </div>

        <!-- فیلد شماره تلفن -->
        <div>
          <label for="phone" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            شماره تلفن
          </label>
          <div class="relative">
            <i class="fas fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-xs" style="color: var(--text-faint)"></i>
            <input
              id="phone"
              v-model="form.phone"
              type="tel"
              required
              class="login-input"
              style="color: var(--text);"
              placeholder="شماره تلفن خود را وارد کنید"
              @focus="e => e.target.style.borderColor = '#f97316'"
              @blur="e => e.target.style.borderColor = 'var(--border)'"
            />
          </div>
        </div>

        <!-- فیلد رمز عبور -->
        <div>
          <label for="password" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            رمز عبور
          </label>
          <div class="relative">
            <i class="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-xs" style="color: var(--text-faint)"></i>
            <input
              id="password"
              v-model="form.password"
              type="password"
              required
              class="login-input"
              style="color: var(--text);"
              placeholder="رمز عبور خود را وارد کنید"
              @focus="e => e.target.style.borderColor = '#f97316'"
              @blur="e => e.target.style.borderColor = 'var(--border)'"
            />
          </div>
        </div>

        <!-- دکمه ثبت نام (گرادیانی با سایه) -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          style="background: linear-gradient(135deg, #f97316, #fb923c);"
        >
          {{ loading ? 'در حال ثبت نام...' : 'ثبت نام' }}
        </button>

        <!-- لینک بازگشت به ورود -->
        <div class="text-center mt-2">
          <span class="text-white/80">حساب کاربری دارید؟</span>
          <router-link
            to="/login"
            class="text-orange-400 hover:text-orange-200 hover:underline transition-colors duration-200 mr-1"
          >
            وارد شوید
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="js">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const error = ref('');

const form = reactive({
  name: '',
  phone: '',
  username: '',
  password: '',
  code: ''
});

const handleRegister = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const result = await authStore.register(form);
    
    if (result.success) {
      router.push('/dashboard');
    } else {
      error.value = result.error;
    }
  } catch (err) {
    error.value = 'خطا در ثبت نام';
  }
  
  loading.value = false;
};
</script>

<style scoped>
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

/* انیمیشن fade-slide برای پیام خطا */
.fade-slide-enter-active {
  animation: fade-slide-in 0.4s ease-out;
}
.fade-slide-leave-active {
  animation: fade-slide-out 0.3s ease-in;
}

@keyframes fade-slide-in {
  0% { opacity: 0; transform: translateY(-8px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes fade-slide-out {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-8px); }
}
</style>