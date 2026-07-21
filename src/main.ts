import { createApp, reactive } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import axios from 'axios';
import { initSecurity, sanitizeInput } from './utils/security';

import ToastPlugin from "vue-toast-notification";
import "vue-toast-notification/dist/theme-sugar.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import './style.css';

import { Icon } from '@iconify/vue'

initSecurity()

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (config.data && typeof config.data === 'object') {
      for (const [key, value] of Object.entries(config.data)) {
        if (typeof value === 'string') {
          config.data[key] = sanitizeInput(value)
        }
      }
    }

    if (config.method && ['post', 'put', 'patch'].includes(config.method)) {
      config.headers['X-Requested-With'] = 'XMLHttpRequest'
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

axios.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success === true && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('fb_token')

      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    if (error.response?.status === 403) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/dashboard'
      }
    }

    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after']
      console.warn(`Rate limited. Retry after ${retryAfter}s`)
    }

    return Promise.reject(error)
  }
)

const app = createApp(App);
app.component('Icon', Icon);
const pinia = createPinia();

fetch('/dictionary.json')
  .then(res => res.json())
  .then(cfg => {
    const dict = reactive(cfg)
    app.provide('dict', dict)
  })
  .catch(() => {})

fetch('/features.json')
  .then(res => res.json())
  .then(cfg => {
    const features = reactive(cfg)
    app.provide('features', features)
  })
  .catch(() => {})

fetch('/mbtiles.json')
  .then(res => res.json())
  .then(cfg => {
    const features = reactive(cfg)
    app.provide('mbtiles', features)
  })
  .catch(() => {})

app.use(pinia);
app.use(router);
app.mount('#app');
