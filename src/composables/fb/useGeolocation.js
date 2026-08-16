// composables/fb/useGeolocation.js
import { ref } from 'vue'

export function useGeolocation() {
  const lat = ref(null)
  const lng = ref(null)
  const accuracy = ref(null)
  const locating = ref(false)
  const geoError = ref(null)
  let watchId = null

  function locate(onSuccess) {
    if (!navigator.geolocation) {
      geoError.value = 'مرورگر شما از GPS پشتیبانی نمی‌کند'
      return
    }
    locating.value = true
    geoError.value = null

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lat.value = +pos.coords.latitude.toFixed(6)
        lng.value = +pos.coords.longitude.toFixed(6)
        accuracy.value = Math.round(pos.coords.accuracy)
        locating.value = false
        onSuccess?.({ lat: lat.value, lng: lng.value })
      },
      (err) => {
        geoError.value =
          err.code === 1 ? 'دسترسی به موقعیت رد شد' :
          err.code === 2 ? 'موقعیت در دسترس نیست' :
          'خطا در دریافت موقعیت'
        locating.value = false
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  function stopWatch() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
  }

  return { lat, lng, accuracy, locating, geoError, locate, stopWatch }
}
