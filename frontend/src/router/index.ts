import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Devices from '../views/Devices.vue';
import Alerts from '../views/Alerts.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', component: Dashboard },
    { path: '/devices', component: Devices },
    { path: '/alerts', component: Alerts },
  ],
});

export default router;
