<template>
  <Transition name="modal">
    <div v-if="show"  class="fixed inset-0 flex items-center justify-center z-50" >
      <div class="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 relative">
        <h2 class="text-xl font-semibold mb-4 text-center">
          ارسال
        </h2>

        <!-- فیلد توضیحات -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">توضیحات</label>
          <textarea v-model="description"  rows="3" placeholder="توضیحات را وارد کنید..."
              class="textarea"/>
        </div>

<!--        <UserSearch v-model="selectedUser"   />-->

        <input  v-model="search"  type="text" ref="inputRef"
                class="input"  placeholder="شماره همراه" />

        <!-- دکمه‌ها -->
        <div class="flex justify-end gap-2 mt-6">
          <button @click="onCancel" class="btn btn-ghost">
            لغو
          </button>
          <button @click="onSubmit" class="btn btn-primary">
            ارسال
          </button>
        </div>

        <!-- دکمه بستن -->
        <button @click="onCancel" class="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-xl">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, defineEmits, defineProps, onMounted } from 'vue'
import axios from 'axios';
import UserSearch from "./UserSearch.vue";
import {useAuthStore} from "../stores/auth";

const SERVER = import.meta.env.VITE_SERVER
const authStore = useAuthStore();

const users = ref([]);
const workflows = ref([]);
const search = ref("");

onMounted(async () => {
  // فقط برای نقش‌هایی که به /api/users دسترسی دارند لیست را می‌گیریم.
  // کاربر عادی با شماره همراه (rec_phone) ارسال می‌کند و نیازی به این لیست ندارد.
  if (authStore.isAdmin || authStore.isGroupManager) {
    await load_Users();
  }
});

const load_Users = async () => {
  try {
    const response = await axios.get(SERVER + '/api/users');
    users.value = response.data;
  } catch (error) {
    // 403 برای کاربر عادی طبیعی است؛ نادیده می‌گیریم
    console.log('Error loading users (permission denied is expected for normal users):', error?.response?.status || error);
  }
};

const load_Works = async () => {
  try {
    const response = await axios.get(SERVER + '/api/workflows');
    workflows.value = response.data;
  } catch (error) {
    console.log('Error loading users:', error);
  }
};


const props = defineProps({
  show: Boolean,
})

const emit = defineEmits(['submit', 'cancel'])

const tab = ref('user')
const description = ref('')
const selectedUser = ref('')
const selectedWorkflow = ref('')

watch(
    () => props.show,
    (val) => {
      if (val) {
        description.value = ''
        selectedUser.value = ''
        selectedWorkflow.value = ''
        tab.value = 'user'
      }
    }
)

const onSubmit = () => {
  const phone = (search.value || '').trim()
  if (!phone) {
    alert('شماره همراه را وارد کنید')
    return
  }
  // اگر لیست کاربران لود شده باشد (مثلاً ادمین/مدیر) از id استفاده می‌کنیم،
  // در غیر این صورت فقط شماره را می‌فرستیم تا بک‌اند با rec_phone کار کند
  // (کاربر عادی به /api/users دسترسی ندارد و 403 می‌گیرد)
  const fnd = users.value.find(a => a.phone == phone)
  const payload = {
    tab: tab.value,
    description: description.value,
    selected: fnd ? fnd.id : null,
    phone: phone,
  }
  emit('submit', payload)
}

const onCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
</style>