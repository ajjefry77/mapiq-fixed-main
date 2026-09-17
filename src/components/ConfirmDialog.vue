<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 flex items-center justify-center z-[9999]" @click.self="$emit('cancel')">
        <div class="fixed inset-0 bg-black/60"></div>
        <div class="bg-zinc-800 rounded-2xl shadow-xl w-full max-w-sm p-6 relative z-10 border border-zinc-700">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <i class="fas fa-exclamation-triangle text-red-400 text-lg"></i>
            </div>
            <p class="text-zinc-200 text-sm leading-relaxed">{{ message }}</p>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <button @click="$emit('cancel')" class="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-600 transition">
              {{ cancelText }}
            </button>
            <button @click="$emit('confirm')" class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  message: { type: String, default: 'آیا مطمئن هستید؟' },
  confirmText: { type: String, default: 'بله' },
  cancelText: { type: String, default: 'خیر' },
});

defineEmits(['confirm', 'cancel']);
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
