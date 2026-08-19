import { defineStore } from 'pinia'
import { ref } from 'vue'
import { logger } from '@/logger'

export const AppStore = defineStore('app', {
  state: () => ({
    value: null
  }),
  actions: {
    setValue(val) {
      this.value = val
    }
  }
})

const extendedIds = ref([])
const visibleIds = ref([])

export function useSharedArray() {
  const getExtendedIds = async () => {
    try {
      extendedIds.value = JSON.parse(localStorage.getItem("expandedIds") || "[]");
    } catch (error) {
      logger.warn('storage.read.failed', { key: 'expandedIds' }, error);
      extendedIds.value = [];
    }
  }

  const setExtendedIds = () => {
    try {
      // ✅ اصلاح شده: استفاده از extendedIds.value
      localStorage.setItem("expandedIds", JSON.stringify(extendedIds.value));
    } catch (error) {
      logger.warn('storage.write.failed', { key: 'expandedIds' }, error);
    }
  }

  const isExtended = (id) => {
    return extendedIds.value.includes(id)
  }

  const getVisibleIds = () => {
    try {
      visibleIds.value = JSON.parse(localStorage.getItem("visibleIds") || "[]");
    } catch (error) {
      logger.warn('storage.read.failed', { key: 'visibleIds' }, error);
      visibleIds.value = [];
    }
  }

  const setVisibleIds = async () => {
    try {
      // ✅ اصلاح شده: استفاده از visibleIds.value
      localStorage.setItem("visibleIds", JSON.stringify(visibleIds.value));
    } catch (error) {
      logger.warn('storage.write.failed', { key: 'visibleIds' }, error);
    }
  }

  const isVisible = (id) => {
    return visibleIds.value.includes(id)
  }

  // اضافه کردن توابع کمکی مفید
  const addExtendedId = (id) => {
    if (!extendedIds.value.includes(id)) {
      extendedIds.value.push(id)
      setExtendedIds() // خودکار ذخیره شود
    }
  }

  const removeExtendedId = (id) => {
    const index = extendedIds.value.indexOf(id)
    if (index !== -1) {
      extendedIds.value.splice(index, 1)
      setExtendedIds() // خودکار ذخیره شود
    }
  }

  const toggleExtended = (id) => {
    if (isExtended(id)) {
      removeExtendedId(id)
    } else {
      addExtendedId(id)
    }
  }

  const addVisibleId = (id) => {
    if (!visibleIds.value.includes(id)) {
      visibleIds.value.push(id)
      setVisibleIds()
    }
  }

  const removeVisibleId = (id) => {
    const index = visibleIds.value.indexOf(id)
    if (index !== -1) {
      visibleIds.value.splice(index, 1)
      setVisibleIds()
    }
  }

  const toggleVisible = (id) => {
    if (isVisible(id)) {
      removeVisibleId(id)
    } else {
      addVisibleId(id)
    }
  }

  const setVisible = (id, visible) => {
    if (visible) {
      addVisibleId(id)
    } else {
      removeVisibleId(id)
    }
  }

  return {
    extendedIds,
    visibleIds,

    isExtended,
    isVisible,
    getExtendedIds,
    setExtendedIds,
    getVisibleIds,
    setVisibleIds,

    addExtendedId,
    removeExtendedId,
    toggleExtended,
    addVisibleId,
    removeVisibleId,
    toggleVisible,
    setVisible
  }
}