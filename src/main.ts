import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import 'tailwindcss/tailwind.css';
import 'daisyui/dist/full.css';
import './style.css'
// @ts-ignore
import VueTheMask from 'vue-the-mask';

createApp(App).use(createPinia()).use(VueTheMask).use(router).mount('#app');