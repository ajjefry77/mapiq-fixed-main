import { defineStore } from 'pinia'
import { ref } from 'vue'

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

const extentedIds = ref([])
const visibleIds = ref([])

export function useSharedArray() {
  const getExtentedIds = async () => {
    try {
      extentedIds.value = JSON.parse(localStorage.getItem("expandedIds") || "[]");
    } catch (error) {
      console.error('Error loading expandedIds:', error);
      extentedIds.value = [];
    }
  }

  const setExtentedIds = () => {
    try {
      // ✅ اصلاح شده: استفاده از extentedIds.value
      localStorage.setItem("expandedIds", JSON.stringify(extentedIds.value));
    } catch (error) {
      console.error('Error saving expandedIds:', error);
    }
  }

  const isExtented = (id) => {
    return extentedIds.value.includes(id)
  }

  const getVisibleIds = () => {
    try {
      visibleIds.value = JSON.parse(localStorage.getItem("visibleIds") || "[]");
    } catch (error) {
      console.error('Error loading visibleIds:', error);
      visibleIds.value = [];
    }
  }

  const setVisibleIds = async () => {
    try {
      // ✅ اصلاح شده: استفاده از visibleIds.value
      localStorage.setItem("visibleIds", JSON.stringify(visibleIds.value));
    } catch (error) {
      console.error('Error saving visibleIds:', error);
    }
  }

  const isVisible = (id) => {
    return visibleIds.value.includes(id)
  }

  // اضافه کردن توابع کمکی مفید
  const addExtentedId = (id) => {
    if (!extentedIds.value.includes(id)) {
      extentedIds.value.push(id)
      setExtentedIds() // خودکار ذخیره شود
    }
  }

  const removeExtentedId = (id) => {
    const index = extentedIds.value.indexOf(id)
    if (index !== -1) {
      extentedIds.value.splice(index, 1)
      setExtentedIds() // خودکار ذخیره شود
    }
  }

  const toggleExtented = (id) => {
    if (isExtented(id)) {
      removeExtentedId(id)
    } else {
      addExtentedId(id)
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
    extentedIds,
    visibleIds,

    isExtented,
    isVisible,
    getExtentedIds,
    setExtentedIds,
    getVisibleIds,
    setVisibleIds,

    addExtentedId,
    removeExtentedId,
    toggleExtented,
    addVisibleId,
    removeVisibleId,
    toggleVisible,
    setVisible
  }
}