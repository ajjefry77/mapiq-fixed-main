import { createApp } from 'vue';
import { createPinia } from 'pinia';
import axios from 'axios';
import { Icon } from '@iconify/vue';

import App from './App.vue';
import router from './router';
import { initSecurity } from './utils/security';
import { loadAppConfigs } from './utils/appConfig';
import { isPublicRoute } from './constants/publicRoutes';
import {
  initLogging,
  installGlobalErrorHandlers,
  setupApiLogging,
  logger,
  EV,
} from './logger';

import 'vue-toast-notification/dist/theme-sugar.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './style.css';

initSecurity();
initLogging();
setupApiLogging(axios);

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.method && ['post', 'put', 'patch'].includes(config.method)) {
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success === true && 'data' in response.data) {
      response.data = response.data.data;
    }

    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('fb_token');

      const path = window.location.pathname;

      if (!isPublicRoute(path) && path !== '/login') {
        window.location.href = '/login';
      }
    }

    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      logger.warn(EV.API_REQUEST_RATE_LIMITED, { retryAfter });
    }

    return Promise.reject(error);
  }
);

const app = createApp(App);
app.component('Icon', Icon);

installGlobalErrorHandlers(app);

const pinia = createPinia();
app.use(pinia);
app.use(router);

void loadAppConfigs(app).finally(() => {
  app.mount('#app');
});

logger.info(EV.APP_BOOT, {
  environment: import.meta.env.MODE,
  engine: 'mapiq',
});
