import { defineStore } from "pinia";
import { ref, computed } from "vue";

const KEY = "mapiq_notifications";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export const useNotificationsStore = defineStore("notifications", () => {
  const items = ref(load());
  const unreadCount = computed(() => items.value.filter((n) => !n.read).length);

  function add({ title, message, type = "info", ref = null, date = new Date() }) {
    const id = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
    items.value.unshift({
      id,
      title: title || "اعلان جدید",
      message: message || "",
      type,
      ref,
      read: false,
      date,
    });
    if (items.value.length > 100) items.value.length = 100;
    save(items.value);
  }

  function markAllRead() {
    items.value.forEach((n) => (n.read = true));
    save(items.value);
  }

  function markRead(id) {
    const n = items.value.find((x) => x.id === id);
    if (n && !n.read) {
      n.read = true;
      save(items.value);
    }
  }

  function remove(id) {
    items.value = items.value.filter((x) => x.id !== id);
    save(items.value);
  }

  function clear() {
    items.value = [];
    save(items.value);
  }

  return { items, unreadCount, add, markAllRead, markRead, remove, clear };
});
