import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import Toast, { POSITION } from "vue-toastification";
import './style.css';
// @ts-ignore - vue-the-mask has no type definitions
import VueTheMask from 'vue-the-mask';

createApp(App)
  .use(createPinia())
  .use(router)
  .use(Toast, {position: POSITION.TOP_LEFT})
  .use(VueTheMask)
  .mount('#app');