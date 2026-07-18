<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold">🧱 ایجاد فرآیند جدید</h1>

    <div class="bg-white p-4 rounded-2xl shadow">
      <label class="block mb-2 font-semibold">نام فرآیند:</label>
      <input v-model="process.name" class="border p-2 rounded w-full" placeholder="مثلاً درخواست مرخصی" />
    </div>

    <div class="bg-white p-4 rounded-2xl shadow space-y-4">
      <h2 class="text-xl font-semibold mb-2">مراحل فرآیند</h2>
      <div v-for="(step, index) in process.steps" :key="index" class="border p-3 rounded mb-3">
        <div class="flex justify-between items-center">
          <input v-model="step.name" class="border p-2 rounded w-1/3" placeholder="نام مرحله" />
          <select v-model="step.type" class="border p-2 rounded">
            <option value="manual">دستی</option>
            <option value="automatic">خودکار</option>
            <option value="decision">شرطی</option>
          </select>
          <button @click="removeStep(index)" class="text-red-500 hover:underline">حذف</button>
        </div>

        <div v-if="step.type === 'decision'" class="mt-3">
          <label class="block font-semibold">شرط:</label>
          <input v-model="step.config.condition" class="border p-2 rounded w-full" placeholder="مثلاً approved == true" />
        </div>
      </div>

      <button @click="addStep" class="px-4 py-2 bg-blue-600 text-white rounded">➕ افزودن مرحله</button>
    </div>

    <div class="bg-white p-4 rounded-2xl shadow">
      <h2 class="text-xl font-semibold mb-2">روابط بین مراحل</h2>
      <div v-for="(rel, i) in process.relations" :key="i" class="flex gap-3 mb-2 items-center">
        <input v-model="rel.from_step_id" type="number" class="border p-2 w-24 rounded" placeholder="از" />
        <input v-model="rel.to_step_id" type="number" class="border p-2 w-24 rounded" placeholder="به" />
        <select v-model="rel.type" class="border p-2 rounded">
          <option value="sequence">توالی</option>
          <option value="parallel">موازی</option>
          <option value="conditional">شرطی</option>
        </select>
        <input v-if="rel.type==='conditional'" v-model="rel.condition" class="border p-2 rounded" placeholder="مثلاً approved==true" />
        <button @click="removeRelation(i)" class="text-red-500 hover:underline">حذف</button>
      </div>
      <button @click="addRelation" class="px-4 py-2 bg-blue-600 text-white rounded">➕ افزودن رابطه</button>
    </div>

    <div class="flex justify-end">
      <button @click="saveProcess" class="btn btn-primary">
        💾 ذخیره فرآیند
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { createProcess } from '../api'

const process = reactive({
  name: '',
  steps: [],
  relations: []
})

function addStep() { process.steps.push({ name: '', type: 'manual', config: {} }) }
function removeStep(i) { process.steps.splice(i, 1) }

function addRelation() { process.relations.push({ from_step_id: null, to_step_id: null, type: 'sequence' }) }
function removeRelation(i) { process.relations.splice(i, 1) }

async function saveProcess() {
  try {
    const res = await createProcess(process)
    alert('فرآیند با موفقیت ذخیره شد: ID ' + res.process.id)
  } catch (err) {
    alert('خطا در ذخیره فرآیند: ' + err.message)
  }
}
</script>
