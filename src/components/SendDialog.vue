<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" draggable="false" class="fixed inset-0 flex items-center justify-center z-50" >
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
  </Teleport>
</template>

<script setup>
import { ref, watch, defineEmits, defineProps, onMounted } from 'vue'
import axios from 'axios';
import UserSearch from "./UserSearch.vue";
import { logger } from "@/logger"

const SERVER = import.meta.env.VITE_SERVER

const users = ref([]);
const workflows = ref([]);
const search = ref("");

const usersLoaded = ref(false);

// عادی‌سازی شماره همراه: حذف کاراکترهای غیرعددی و تبدیل +98/0098 به 09
const normalizePhone = (raw) => {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("98") && d.length === 12) d = "0" + d.slice(2);
  return d;
};

const ensureUsers = async () => {
  if (usersLoaded.value) return;
  usersLoaded.value = true;
  try {
    // برای همه نقش‌ها تلاش می‌کنیم؛ اگر بک‌اند دسترسی ندهد 403 می‌گیریم و نادیده می‌گیریم
    await load_Users();
  } catch {}
};

onMounted(() => {
  ensureUsers();
});

const load_Users = async () => {
  try {
    const response = await axios.get(SERVER + '/api/users');
    users.value = response.data;
  } catch (error) {
    // 403 برای کاربر عادی طبیعی است؛ نادیده می‌گیریم
    logger.debug("users.list.denied", { status: error?.response?.status }, error);
  }
};

const load_Works = async () => {
  try {
    const response = await axios.get(SERVER + '/api/workflows');
    workflows.value = response.data;
  } catch (error) {
    logger.debug("data.load.failed", { resource: "users" }, error);
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
        ensureUsers()
      }
    }
)

const onSubmit = () => {
  const phone = normalizePhone(search.value)
  if (!phone) {
    alert('شماره همراه را وارد کنید')
    return
  }
  // اگر لیست کاربران لود شده باشد (هر نقشی که دسترسی داشته باشد) از id استفاده می‌کنیم،
  // در غیر این صورت شماره عادی‌سازی‌شده را می‌فرستیم تا بک‌اند با rec_phone کار کند
  const fnd = users.value.find(a => normalizePhone(a.phone) === phone)
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