<template>
  <div class="bg-white shadow-xl rounded-2xl p-6 w-full max-w-xl mx-auto">
    <h2 class="text-2xl font-semibold text-accent mb-4">ایجاد فرآیند جدید</h2>

    <form @submit.prevent="submitForm" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">عنوان فرآیند</label>
        <input v-model="workflow.title" type="text"
               class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-accent outline-none"/>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
        <textarea v-model="workflow.description"
                  class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-accent outline-none"></textarea>
      </div>

      <button type="submit"
              class="bg-accent text-white px-5 py-2 rounded-lg hover:bg-accent-dim transition">
        ذخیره فرآیند
      </button>
    </form>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const workflow = reactive({
  title: '',
  description: ''
})

function submitForm() {
  console.log('workflow:', workflow)
  // می‌تونی API رو اینجا صدا بزنی
}
</script>
