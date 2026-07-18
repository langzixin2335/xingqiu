<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: '✦' },
  { path: '/users', label: '用户管理', icon: '👤' },
  { path: '/orders', label: '订单管理', icon: '🧾' },
  { path: '/push', label: '推送消息', icon: '🔔' },
  { path: '/posts', label: '社区动态', icon: '💬' },
  { path: '/products', label: '能量产品', icon: '🎁' },
]

const activePath = computed(() => route.path)

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-icon">🌟</span>
        <div>
          <div class="brand-title">闪耀星球</div>
          <div class="brand-sub">管理后台</div>
        </div>
      </div>
      <nav class="nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: activePath === item.path }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          {{ item.label }}
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <div class="admin-name">{{ auth.admin?.nickname || '管理员' }}</div>
        <button class="btn btn-ghost btn-sm" @click="logout">退出登录</button>
      </div>
    </aside>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px 24px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}

.brand-icon {
  font-size: 28px;
}

.brand-title {
  font-weight: 700;
  color: var(--gold-light);
  font-size: 15px;
}

.brand-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.nav {
  flex: 1;
  padding: 0 10px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  color: var(--text-muted);
  margin-bottom: 4px;
  transition: 0.2s;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.nav-item.active {
  background: rgba(212, 175, 55, 0.12);
  color: var(--gold-light);
}

.nav-icon {
  font-size: 16px;
}

.sidebar-footer {
  padding: 16px 20px 0;
  border-top: 1px solid var(--border);
  margin-top: auto;
}

.admin-name {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.main {
  flex: 1;
  padding: 28px 32px;
  overflow-y: auto;
}
</style>
