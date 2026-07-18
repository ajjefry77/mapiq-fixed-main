<template>
  <div>
    <h2 class="text-xl font-semibold text-blue-800 mb-4">وضعیت نامه‌ها</h2>
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="letter in letters" :key="letter.id"
           class="p-5 bg-white border border-gray-200 shadow-sm rounded-2xl hover:shadow-md transition">
        <h3 class="text-lg font-semibold text-gray-800">{{ letter.subject }}</h3>
        <p class="text-sm text-gray-500 mt-1">از: {{ letter.from }}</p>
        <p class="text-sm text-gray-500">به: {{ letter.to }}</p>
        <span class="inline-block mt-3 px-3 py-1 text-xs font-medium rounded-full"
              :class="statusColor(letter.status)">
          {{ letter.status }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
const letters = [
  { id: 1, subject: 'درخواست خرید', from: 'واحد فنی', to: 'مدیر مالی', status: 'در حال بررسی' },
  { id: 2, subject: 'درخواست مرخصی', from: 'کارمند ۲', to: 'مدیر منابع انسانی', status: 'تایید شده' },
  { id: 3, subject: 'ارسال فاکتور', from: 'حسابداری', to: 'مدیر کل', status: 'رد شده' }
]

function statusColor(status) {
  return {
    'در حال بررسی': 'bg-yellow-100 text-yellow-800',
    'تایید شده': 'bg-green-100 text-green-800',
    'رد شده': 'bg-red-100 text-red-800'
  }[status] || 'bg-gray-100 text-gray-800'
}
</script>
