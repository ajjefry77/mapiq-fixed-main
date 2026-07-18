<template>
  <div v-if="visible" class="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
    <div class="bg-white rounded-2xl p-6 w-96 shadow-xl">
      <h2 class="text-lg font-bold mb-3">یک نام برای ذخیره را وارد کنید</h2>

      <input
          v-model="fileName"
          type="text"
          class="border w-full p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div class="flex justify-end gap-3 mt-4">
        <button
            @click="cancel"
            class="px-4 py-1 bg-gray-200 rounded-md hover:bg-gray-300 transition"
        >
          لغو
        </button>
        <button
            @click="confirm"
            class="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          تایید
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean, // کنترل نمایش مودال
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = ref(props.modelValue)
const fileName = ref('')

watch(() => props.modelValue, (val) => (visible.value = val))

const cancel = () => emit('update:modelValue', false)

const confirm = () => {
  if (!fileName.value.trim()) return alert('لطفاً نام فایل را وارد کنید!')
  emit('confirm', fileName.value)
  emit('update:modelValue', false)
}
</script>
