<template>
  <Transition name="modal">
    <div v-if="visible" class="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div class="bg-white rounded-2xl p-6 w-96 shadow-xl">
        <h2 class="text-lg font-bold mb-3">یک نام برای ذخیره را وارد کنید</h2>

        <input v-model="fileName" type="text" placeholder="نام فایل خروجی"
            class="input" />

        <select v-model="exportType" class="select-native mt-4">
          <option disabled value="">انتخاب نوع خروجی</option>
          <option value="kml">خروجی با فرمت KML</option>
          <option value="csv">خروجی نقاط با فرمت CSV</option>
          <option value="dxf">خروجی با فرمت DXF</option>
        </select>

        <div class="flex justify-end gap-3 mt-4">
          <button @click="cancel" class="btn btn-ghost">
            لغو
          </button>
          <button @click="confirm" class="btn btn-primary">
            تایید
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean, // کنترل نمایش مودال
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = ref(props.modelValue)
const fileName = ref('')
const exportType = ref('kml')

watch(() => props.modelValue, (val) => (visible.value = val))

const cancel = () => emit('update:modelValue', false)

const confirm = () => {
  if (!fileName.value.trim()) return alert('لطفاً نام فایل را وارد کنید!')
  emit('confirm', fileName.value, exportType.value)
  emit('update:modelValue', false)
}
</script>
