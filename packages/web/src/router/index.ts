import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import Dashboard from '../views/Dashboard.vue';
import Admin from '../views/Admin.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'Login', component: Login, meta: { guest: true } },
    { path: '/register', name: 'Register', component: Register, meta: { guest: true } },
    { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/admin', name: 'Admin', component: Admin, meta: { requiresAuth: true, requiresAdmin: true } }
  ]
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let user: any = null;
  
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch {
    user = null;
  }
  
  if (to.meta.requiresAuth && !token) {
    next('/login');
  } else if (to.meta.guest && token) {
    next('/dashboard');
  } else if (to.meta.requiresAdmin && (!user || user.role !== 'admin')) {
    next('/dashboard');
  } else {
    next();
  }
});

export default router;
