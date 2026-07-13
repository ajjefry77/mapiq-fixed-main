<template>
  <div class="min-h-screen flex items-center justify-center" style="background: var(--bg);">
    <div class="max-w-md w-full space-y-8 p-8">
      <div class="text-center">
        <h2 class="text-3xl font-bold mb-2" style="color: var(--text);">ورود به سامانه</h2>
        <p style="color: var(--text-muted);">لطفاً نام کاربری و رمز عبور خود را وارد کنید</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="card">
        <div v-if="error" class="bg-red-500/10 border border-red-500/20 px-4 py-3 rounded mb-4" style="color: var(--danger);">
          {{ error }}
        </div>
        
        <div class="space-y-4">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
              نام کاربری
            </label>
            <input id="username" v-model="form.username" type="text" required class="form-input" placeholder="شماره همراه" />
          </div>
          
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              رمز عبور
            </label>
            <input id="password" v-model="form.password" type="password" class="form-input" placeholder="رمز عبور" />
          </div>
        </div>

        <button type="button" class="w-full btn mt-6" @click="send_code">
          <span>ارسال رمز به شماره همراه</span>
        </button>
        <button type="submit" :disabled="loading" class="w-full btn btn-primary mt-6" >
          {{ loading ? 'در حال ورود...' : 'ورود' }}
        </button>
        
        <div class="text-center mt-4">
          <router-link to="/register" class="text-blue-600 hover:text-blue-800">
            حساب کاربری ندارید؟ ثبت نام کنید
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import axios from 'axios'

const router = useRouter();
const authStore = useAuthStore();
const API_BASE_URL = import.meta.env.VITE_SERVER + '/api'

const loading = ref(false);
const error = ref('');

const form = reactive({
  username: '',
  password: ''
});

async function send_code() {
  loading.value = true;
  error.value = '';

  try {
    const result = await axios.post(`${API_BASE_URL}/verify`, {
      number : form.username
    })

    if (result.success) {
      console.log(result);
    } else {
      error.value = result.error;
    }
  } catch (err) {
    error.value = 'خطا در ورود به سیستم';
  }
  
  loading.value = false;
};

const handleLogin = async () => {
  loading.value = true;
  error.value = '';

  try {
    const result = await authStore.login(form.username, form.password);

    if (result.success) {
      await router.push('/map');
    } else {
      error.value = result.error;
    }
  } catch (err) {
    error.value = 'خطا در ورود به سیستم';
  }

  loading.value = false;
};

</script>