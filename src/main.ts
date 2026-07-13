import { createApp , reactive} from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import axios from 'axios';

import ToastPlugin from "vue-toast-notification";
import "vue-toast-notification/dist/theme-sugar.css";
import "@fortawesome/fontawesome-free/css/all.min.css"
import './style.css';

import { Icon } from '@iconify/vue'

// Unwrap formbuilder-style {success, data} responses globally
axios.interceptors.response.use((response) => {
  if (response.data && response.data.success === true && 'data' in response.data) {
    response.data = response.data.data;
  }
  return response;
});

const app = createApp(App);
app.component('Icon', Icon);
const pinia = createPinia();

fetch('../dictionary.json')
    .then(res => res.json())
    .then(cfg => {
        const dict = reactive(cfg)
        app.provide('dict', dict)
    })
fetch('/features.json')
    .then(res => res.json())
    .then(cfg => {
        const features = reactive(cfg)
        app.provide('features', features)
    })
fetch('/mbtiles.json')
    .then(res => res.json())
    .then(cfg => {
        const features = reactive(cfg)
        app.provide('mbtiles', features)
    })

app.use(pinia);
app.use(router);
app.mount('#app');