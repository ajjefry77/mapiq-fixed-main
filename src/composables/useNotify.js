import { useToast } from "vue-toast-notification"

export function useNotify() {
  const $toast = useToast()

  function showMessage(msg, type = "info") {
    $toast.open({ message: msg, type, duration: 4000 })
  }

  function handleError(error) {
    console.error(error)

    const data = error?.response?.data

    let msg = "خطایی رخ داد"

    if (data?.message) {
      msg = data.message
    } else if (data?.error) {
      msg = data.error
    } else if (data?.errors) {
      msg = Object.values(data.errors).flat().join("\n")
    } else if (error?.message) {
      msg = error.message
    }

    showMessage(msg, "error")
  }

  function success(msg) { showMessage(msg, "success") }
  function error(msg) { showMessage(msg, "error") }
  function warning(msg) { showMessage(msg, "warning") }
  function info(msg) { showMessage(msg, "info") }

  return { showMessage, handleError, success, error, warning, info }
}
