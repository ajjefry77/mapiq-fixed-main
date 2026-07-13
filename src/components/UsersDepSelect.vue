<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="emit('close')" >

    <div class="bg-white rounded-2xl shadow-lg w-96 max-h-[85vh] flex flex-col overflow-hidden">
      <!-- header -->
      <div class="flex justify-between items-center border-b px-4 py-3">
        <h2 class="text-lg">انتخاب کاربر یا دپارتمان</h2>
        <button @click="emit('close')" class="text-gray-500 hover:text-red-500 transition text-xl font-bold">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="loading" class="text-center text-gray-500 py-8">
          در حال بارگذاری...
        </div>

        <!-- error -->
        <div v-else-if="error" class="text-center text-red-500 py-8">
          خطا در دریافت اطلاعات 😞
        </div>

        <!-- List Sections with Users -------------->
        <template v-else>
          <!-- All item -->
          <div class="p-2 rounded cursor-pointer hover:bg-blue-50 flex items-center justify-between"
              :class="{ 'bg-blue-100': selected?.type === 'all' }"
              @click="selectItem({ id: 'all', type: 'all' })" >

            <span class="font-medium">همه</span>
            <i v-if="selected?.type === 'all'" class="fas fa-check text-blue-600"></i>
          </div>

          <!-- items -->
          <div v-for="(dept, index) in departments" :key="dept.id"   class="mt-2 border-b pb-1 last:border-none" >

            <!-- Section ------------------------------>
            <div class="flex justify-between items-center p-2 rounded hover:bg-blue-50"
                :class="{ 'bg-blue-100': selected?.id === dept.id && selected?.type === 'department' }" >
              <span class="font-semibold text-gray-800 cursor-pointer flex-1"
                  @click.stop="selectItem({ id: dept.id, type: 'department' })">
                {{ dept.name }}
              </span>

              <!-- open/close icon -->
              <button  @click.stop="toggleDepartment(index)" class="text-gray-500 hover:text-gray-700 transition ml-2" >
                <i :class="dept.open ? 'fa-chevron-up' : 'fa-chevron-down'"  class="fas text-sm" ></i>
              </button>
              <!-- Tik Select -->
              <i v-if="selected?.id === dept.id && selected?.type === 'department'" class="fas fa-check text-blue-600 ml-2"></i>
            </div>

            <!-- Users -------------------------------->
            <transition name="fade">
              <div v-if="dept.open" class="pr-6 mt-1 space-y-1">
                <div v-for="user in dept.users" :key="user.id" class="p-2 rounded cursor-pointer hover:bg-blue-50 flex justify-between"
                    :class="{ 'bg-blue-100': selected?.id === user.id && selected?.type === 'user' }"
                    @click="selectItem({ id: user.id, type: 'user' })">

                  <span class="text-gray-700">{{ user.name }}</span>
                  <i v-if="selected?.id === user.id && selected?.type === 'user'" class="fas fa-check text-blue-600"></i>

                </div>
              </div>

            </transition>

          </div>

        </template>
      </div>

      <!-- دکمه ارسال -->
      <div class="border-t px-4 py-3">
        <button @click="sendSelection" class="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition">
          تایید
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const SERVER = import.meta.env.VITE_SERVER;

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  //apiUrl: { type: String, required: true },
});

const emit = defineEmits(["update:selected", "close", "send"]);

const departments = ref([]);
const selected = ref(null);
const loading = ref(false);
const error = ref(false);

// واکشی داده‌ها از سرور
async function fetchDepartments() {
  loading.value = true;
  error.value = false;
  try {
    const res = await fetch(SERVER + "/api/SectionsWithUsers");
    if (!res.ok) throw new Error("خطا در دریافت اطلاعات");
    const data = await res.json();
    departments.value = data.map((d) => ({ ...d, open: false }));
  } catch (err) {
    error.value = true;
    console.error(err);
  } finally {
    loading.value = false;
  }
}

// باز و بسته کردن دپارتمان
function toggleDepartment(index) {
  departments.value[index].open = !departments.value[index].open;
}

// انتخاب آیتم (کاربر، دپارتمان یا همه)
function selectItem(item) {
  // پاک‌سازی انتخاب قبلی و تنظیم جدید
  selected.value = { id: item.id, type: item.type };
}

// ارسال انتخاب به والد
function sendSelection() {
  emit("update:selected", selected.value);
  emit("send", selected.value);
  emit("close");
}

// زمانی که مودال باز شد
watch(
    () => props.isOpen,
    (val) => {
      if (val) fetchDepartments();
    }
);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  max-height: 0;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  max-height: 500px;
}

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 4px;
}
</style>
