import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
      { path: 'users', name: 'users', component: () => import('../views/UsersView.vue') },
      { path: 'orders', name: 'orders', component: () => import('../views/OrdersView.vue') },
      { path: 'push', name: 'push', component: () => import('../views/PushView.vue') },
      { path: 'posts', name: 'posts', component: () => import('../views/PostsView.vue') },
      { path: 'products', name: 'products', component: () => import('../views/ProductsView.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn()) {
    return '/login'
  }
  if (to.meta.guest && auth.isLoggedIn()) {
    return '/dashboard'
  }
})

export default router
