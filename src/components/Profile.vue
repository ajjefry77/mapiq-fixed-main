<!--'x-api-key': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjY0ZmJmNGVmZTAyYWMzNWM4OTlmYTI1MzA4NGFjODdjMTYzMjBhNGJmZTU1MTBhZGU5NjMyYjYwNTllYTQxNDJlYWYyMWE5YjY1MDg1ZmE1In0.eyJhdWQiOiIyNjc3NSIsImp0aSI6IjY0ZmJmNGVmZTAyYWMzNWM4OTlmYTI1MzA4NGFjODdjMTYzMjBhNGJmZTU1MTBhZGU5NjMyYjYwNTllYTQxNDJlYWYyMWE5YjY1MDg1ZmE1IiwiaWF0IjoxNzExNTIxNTM0LCJuYmYiOjE3MTE1MjE1MzQsImV4cCI6MTcxNDExMzUzNCwic3ViIjoiIiwic2NvcGVzIjpbImJhc2ljIl19.fi9nJpTLqS0UqeRHKx1rtd0H_Eg7Q67WA7RuGOl6ZegLggD3d7Q84G9sxFiRbfbPBcnLQulwnTvAlrjF8RhSW2hwB4L4I5IY3fpn4mRlIH4KqBMbLmhKHpUuqA6E9oGLqnOcIz-f3vTMEZEFf5_eYWnglebM18y-mBgPO6jIfgfTUnvaegSXKYFnV5HaZRMbIOynXLpP9VdCA9Wf5cIqS9nrwN-gufTMyC39T-1MaFIJyFF4bF1OLHdHLzdQ0Pwf5rZ7Z07i9kLhpMMP_84C3_2BHfY6vzwkvMcJNkwjOEbP84mv56pNxJ2ZZv7qxlJ_WghUBHNNaA_Cctpi-7CmSA'-->
<template>
  <div>
    <button
        @click="togglePanel"
        class= 'absolute top-[15px] left-[11px] h-9 bg-white rounded-full flex items-center justify-center shadow-md text-xs'
        :class="authStore.user ? 'w-9' : 'w-16'"
        title="مشخصات کاربری">
      <i class="fas fa-user text-sm"></i>
      <span :class="authStore.user ? '' : 'mr-2'">{{ authStore.user ? '' : 'ورود' }}</span>
    </button>

    <transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="transform translate-x-[-340px]"
        enter-to-class="transform translate-x-0"
        leave-active-class="transition-transform duration-300 ease-in"
        leave-from-class="transform translate-x-0"
        leave-to-class="transform translate-x-[-340px]">

      <div v-if="isOpen" class="fixed top-0 left-0 w-full h-full z-[1000]" @click="closePanel">
        <div
            class="fixed top-0 left-0  py-4 px-4 w-[340px] h-full bg-white shadow-2xl z-50 overflow-y-auto"
            dir="rtl"
            @click.stop>

          <button @click="closePanel" class="text-gray-700 hover:text-gray-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>

          <form @submit.prevent="saveUser">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">نام و نام خانوادگی</label>
                <input v-model="userForm.name" type="text" required class="form-input inp" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">موبایل</label>
                <input v-model="authStore.user.phone" type="tel" required class="form-input inp text-right"/>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">نام کاربری</label>
                <input v-model="authStore.user.username" type="text" required class="form-input inp" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">رمز عبور</label>
                <input v-model="userForm.password" type="password" required class="form-input inp"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">تکرار رمز عبور</label>
                <input v-model="userForm.re_password" type="password" required class="form-input inp"/>
              </div>

            </div>

            <div class="flex justify-end space-x-4 space-x-reverse mt-6">
              <!--<button type="button" @click="closeUserModal" class="btn btn-secondary">
                انصراف
              </button>-->
              <button type="submit" class="btn btn-primary">
               ثبت
              </button>
            </div>

            <div class="absolute bottom-2 left-0 p-4 text-sm w-full text-center space-y-2">
              <button type="button" @click="goToFormBuilder" class="btn btn-secondary p-2 w-full">
ورود به پنل مدیریت
              </button>
              <button type="button" @click="logout" class="btn btn-primary p-2 w-full">
                خروج از حساب کاربری
              </button>
            </div>
          </form>

        </div>

      </div>

    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from "vue-toast-notification";
import {useAuthStore} from '../stores/auth';
import axios from "axios";
import { useRouter } from 'vue-router'

const $toast = useToast();
const authStore = useAuthStore();
const SERVER = import.meta.env.VITE_SERVER
const router = useRouter()

// Emits
const emit = defineEmits(['location-selected'])

// State
const isOpen = ref(false)

const userForm = reactive({
  name: authStore.user?.name,
  password: '',
  re_password:  ''
});

const saveUser = async () => {
  try {
    if (userForm.password == userForm.re_password) {
      await axios.put(
          SERVER + `/api/users/${authStore.user.id}`,
          userForm
      );
      showMessage('تغییرات ثبت شد','success')
    } else {
      showMessage('پسورد و تکرارش مغایرت دارد','error')
    }

  } catch (error) {
    console.error('Error saving user:', error);
  }

};

const goToFormBuilder = async () => {
  isOpen.value = false;
  await authStore.syncFb()
  router.push('/forms')
}

const logout = async () => {
  isOpen.value = false;
  authStore.logout()
  router.push('/login');
}

const togglePanel = () => {
  if (authStore.user)
    isOpen.value = !isOpen.value
  else
    router.push('/login');
}

const closePanel = () => {
  isOpen.value = false
}

function showMessage(msg , type) {
  $toast.open({
    message: msg,
    type: type,
    duration: 4000   // ۲ ثانیه
  });

}


</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.inp {
  padding-top: 5px;
  padding-bottom: 5px;
  border-radius: 5px;
}

.max-h-96 {
  max-height: 24rem;
}

/* اسکرول بار */
.max-h-96::-webkit-scrollbar {
  width: 6px;
}

.max-h-96::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.max-h-96::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.max-h-96::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
</style>