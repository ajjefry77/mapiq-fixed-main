<template>
  <div v-if="open" class="fixed inset-0 flex items-center justify-center">
    <div class="bg-white rounded-2xl p-6 w-96 shadow-lg">
      <h2 class="text-lg font-bold mb-4">انتخاب کاربر</h2>

      <div v-if="loading" class="text-gray-500">در حال بارگذاری...</div>
      <div v-else-if="error" class="text-red-600">{{ error }}</div>
      <ul v-else class="space-y-2">
        <li v-for="user in users" :key="user.id">
          <button @click="selectUser(user.id)"
              class="w-full text-right px-4 py-2 rounded-lg border hover:bg-gray-100">
            {{ user.name }}
          </button>
        </li>
      </ul>

      <button @click="$emit('close')"
          class="mt-4 w-full py-2 rounded-lg bg-gray-200 hover:bg-gray-300">
        بستن
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watchEffect } from "vue"

defineProps({
  open: Boolean
})

const emit = defineEmits(["close", "select"])

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

function selectUser(id) {
  const user = users.value.find(u => u.id === id)
  if (user) {
    emit("select", { id: user.id, name: user.name }) // ارسال id و name
  }
  emit("close")
}

watchEffect(() => {
  if (open && !loadedOnce.value) {
    loadUsers()
  }
})

</script>
