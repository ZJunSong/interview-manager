import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { initializeTheme } from './utils/theme';
import './assets/styles/global.css';

initializeTheme();
createApp(App).use(router).mount('#app');
