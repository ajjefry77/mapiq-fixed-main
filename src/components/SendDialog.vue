<template>
  <transition name="fade">
    <div v-if="show"  class="fixed inset-0 flex items-center justify-center z-50" >
      <div class="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 relative">
        <h2 class="text-xl font-semibold mb-4 text-center">
          ارسال
        </h2>

        <!-- فیلد توضیحات -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">توضیحات</label>
          <textarea v-model="description"  rows="3" placeholder="توضیحات را وارد کنید..."
              class="w-full border rounded-lg p-2 focus:outline-none focus:ring focus:ring-blue-300"/>
        </div>

<!--        <UserSearch v-model="selectedUser"   />-->

        <input  v-model="search"  type="text" ref="inputRef"
                class="input w-full h-9 border border-gray-300 rounded px-2 text-sm"  placeholder="شماره همراه" />


        <!-- دکمه‌ها -->
        <div class="flex justify-end gap-2 mt-6">
          <button @click="onCancel" class="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">
            لغو
          </button>
          <button @click="onSubmit" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            ارسال
          </button>
        </div>

        <!-- دکمه بستن -->
        <button @click="onCancel" class="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-xl">
          ×
        </button>
      </div>
    </div>
  </transition>
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
  if (authStore.isAdmin || authStore.isGroupManager) {
    await Promise.all([load_Users()/*, load_Works()*/]);
  }
});

const load_Users = async () => {
  try {
    const response = await axios.get(SERVER + '/api/users');
    users.value = response.data;
  } catch (error) {
    console.log('Error loading users:', error);
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
  let fnd = users.value.find(a=> a.phone == search.value)
  if (fnd) {
    const payload = {
      tab: tab.value,
      description: description.value,
      selected : fnd.id
      //selected:
      //    tab.value === 'user' ? selectedUser.value : selectedWorkflow.value,
    }
    emit('submit', payload)
  } else {
    alert('کاربر مورد نظر پیدا نشد')
  }
}

const onCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>