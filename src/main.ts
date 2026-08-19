import { createApp, reactive } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import axios from 'axios';
import { initSecurity } from './utils/security';
import {
  initLogging,
  installGlobalErrorHandlers,
  setupApiLogging,
  logger,
  EV,
} from './logger';

import ToastPlugin from "vue-toast-notification";
import "vue-toast-notification/dist/theme-sugar.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import './style.css';

import { Icon } from '@iconify/vue'

initSecurity()

initLogging()

setupApiLogging(axios)

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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

    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after']
      logger.warn(EV.API_REQUEST_RATE_LIMITED, { retryAfter })
    }

    return Promise.reject(error)
  }
)

const app = createApp(App);
app.component('Icon', Icon);
const pinia = createPinia();

installGlobalErrorHandlers(app)

fetch('/dictionary.json')
  .then(res => res.json())
  .then(cfg => {
    const dict = reactive(cfg)
    app.provide('dict', dict)
  })
  .catch((err) => {
    logger.warn(EV.APP_CONFIG_LOAD_FAILED, { resource: 'dictionary.json' }, err)
  })

fetch('/features.json')
  .then(res => res.json())
  .then(cfg => {
    const features = reactive(cfg)
    app.provide('features', features)
  })
  .catch((err) => {
    logger.warn(EV.APP_CONFIG_LOAD_FAILED, { resource: 'features.json' }, err)
  })

fetch('/mbtiles.json')
  .then(res => res.json())
  .then(cfg => {
    const features = reactive(cfg)
    app.provide('mbtiles', features)
  })
  .catch((err) => {
    logger.warn(EV.APP_CONFIG_LOAD_FAILED, { resource: 'mbtiles.json' }, err)
  })

app.use(pinia);
app.use(router);
app.mount('#app');

logger.info(EV.APP_BOOT, {
  environment: import.meta.env.MODE,
  engine: 'mapiq',
});
