<template>
  <div class="min-h-screen flex items-center justify-center" style="background: var(--bg);">
    <div class="max-w-md w-full space-y-8 p-8">
      <div class="text-center">
        <h2 class="text-3xl font-bold mb-2" style="color: var(--text);">ثبت نام</h2>
        <p style="color: var(--text-muted);">برای ایجاد حساب کاربری اطلاعات خود را وارد کنید</p>
      </div>
      
      <form @submit.prevent="handleRegister" class="card">
        <div v-if="error" class="bg-red-500/10 border border-red-500/20 px-4 py-3 rounded mb-4" style="color: var(--danger);">
          {{ error }}
        </div>
        
        <div class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
              نام و نام خانوادگی
            </label>
            <input id="name"  v-model="form.name"  type="text"  required class="form-input"  placeholder="نام کامل خود را وارد کنید"  />
          </div>
          
          <div>
            <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">
              شماره تلفن
            </label>
            <input id="phone" v-model="form.phone" type="tel" required class="form-input" placeholder="شماره تلفن خود را وارد کنید"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              رمز عبور
            </label>
            <input id="password" v-model="form.password" type="password" required class="form-input" placeholder="رمز عبور خود را وارد کنید"/>
          </div>
        </div>
        
        <button type="submit" :disabled="loading" class="w-full btn btn-primary mt-6" >
          {{ loading ? 'در حال ثبت نام...' : 'ثبت نام' }}
        </button>
        
        <div class="text-center mt-4">
          <router-link to="/login" class="text-blue-600 hover:text-blue-800">
            حساب کاربری دارید؟ وارد شوید
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