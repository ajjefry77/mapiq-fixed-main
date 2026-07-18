<template>
  <div v-if="open" class="fixed inset-0 flex items-center justify-center bg-black/50">
    <div class="bg-white rounded-2xl p-6 w-96 shadow-lg">
      <h2 class="text-lg font-bold mb-4">انتخاب نقش</h2>

      <div v-if="loading" class="text-gray-500">در حال بارگذاری...</div>
      <div v-else-if="error" class="text-red-600">{{ error }}</div>
      <ul v-else class="space-y-2">
        <li v-for="role in roles" :key="role.id">
          <button
              class="w-full text-right px-4 py-2 rounded-lg border hover:bg-gray-100"
              @click="selectRole(role.id)"
          >
            {{ role.description }}
          </button>
        </li>
      </ul>

      <button
          class="mt-4 w-full py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
          @click="$emit('close')"
      >
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

const roles = ref([])
const loading = ref(false)
const error = ref(null)
const loadedOnce = ref(false)
const SERVER = import.meta.env.VITE_SERVER

async function loadRoles() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(SERVER + "/api/roles")
    if (!res.ok) throw new Error("خطا در دریافت لیست کاربران")
    roles.value = await res.json()
    loadedOnce.value = true
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function selectRole(id) {
  const role = roles.value.find(u => u.id === id)
  if (role) {
    emit("select", { id: role.id, name: role.name, desc : role.description }) // ارسال id و name
  }
  emit("close")
}

watchEffect(() => {
  if (open && !loadedOnce.value) {
    loadRoles()
  }
})

</script>
