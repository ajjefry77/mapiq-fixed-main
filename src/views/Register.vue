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
        <div 
          v-if="error" 
          class="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-sm"
          style="color: var(--danger);"
        >
          <span>⚠️</span>
          <span>{{ error }}</span>
        </div>

        <!-- فیلد نام و نام خانوادگی -->
        <div>
          <label for="name" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            نام و نام خانوادگی
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            class="w-full px-0 py-2 border-0 border-b-2 bg-transparent focus:ring-0 transition-colors duration-200 placeholder:text-sm"
            style="border-color: var(--border); color: var(--text);"
            placeholder="نام کامل خود را وارد کنید"
            @focus="e => e.target.style.borderColor = '#f97316'"
            @blur="e => e.target.style.borderColor = 'var(--border)'"
          />
        </div>

        <!-- فیلد شماره تلفن -->
        <div>
          <label for="phone" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            شماره تلفن
          </label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            required
            class="w-full px-0 py-2 border-0 border-b-2 bg-transparent focus:ring-0 transition-colors duration-200 placeholder:text-sm"
            style="border-color: var(--border); color: var(--text);"
            placeholder="شماره تلفن خود را وارد کنید"
            @focus="e => e.target.style.borderColor = '#f97316'"
            @blur="e => e.target.style.borderColor = 'var(--border)'"
          />
        </div>

        <!-- فیلد رمز عبور -->
        <div>
          <label for="password" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            رمز عبور
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            class="w-full px-0 py-2 border-0 border-b-2 bg-transparent focus:ring-0 transition-colors duration-200 placeholder:text-sm"
            style="border-color: var(--border); color: var(--text);"
            placeholder="رمز عبور خود را وارد کنید"
            @focus="e => e.target.style.borderColor = '#f97316'"
            @blur="e => e.target.style.borderColor = 'var(--border)'"
          />
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