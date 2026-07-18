<template>
  <div ref="root" class="relative w-full">
    <input  v-model="search"  @focus="handleFocus" type="text" ref="inputRef"
            class="input w-full h-9 border border-gray-300 rounded px-2 text-sm"  :placeholder="placeholder" />

    <div  v-if="open" class="absolute z-[1000] w-full bg-white border rounded mt-1 max-h-80 overflow-auto" >
      <div v-for="c in filtered"  :key="c.imei"
           @click="select(c)" class="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm" >
        {{ c.name }} - {{ c.phone }}
      </div>

      <div  v-if="filtered.length === 0" class="px-3 py-2 text-gray-400" >
        نتیجه‌ای پیدا نشد
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  modelValue: String,

  placeholder: {
    type: String,
    default: "جستجوی کاربر..."
  }
});

const emit = defineEmits(["update:modelValue"]);

const search = ref("");
const open = ref(false);
const root = ref(null);
const inputRef = ref(null);

const users = ref([])
const loading = ref(false)
const error = ref(null)
const loadedOnce = ref(false)
const SERVER = import.meta.env.VITE_SERVER

async function loadUsers() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(SERVER + "/api/users")
    if (!res.ok) throw new Error("خطا در دریافت لیست کاربران")
    users.value = await res.json()
    loadedOnce.value = true
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  const s = search.value.toLowerCase();

  return users.value.filter(c =>
      c.name?.includes(s) ||
      c.phone?.includes(s) ||
      c.username?.includes(s)
  );
});

const select = (c) => {
  search.value = `${c.name??''} - ${c.phone}`; //===================================
  emit("update:modelValue", c.id);
  open.value = false;
};

const handleFocus = () => {
  open.value = true;
  nextTick(() => {
    inputRef.value?.select();
  });
};

const handleClickOutside = (e) => {
  if (root.value && !root.value.contains(e.target)) {
    open.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  loadUsers();
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});

</script>
