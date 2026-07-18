<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const username = ref('admin')
const password = ref('admin123')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(username.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    error.value = e.response?.data?.detail || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="stars" />
    <div class="login-card">
      <div class="login-header">
        <span class="logo">🌟</span>
        <h1>闪耀星球</h1>
        <p>管理后台</p>
      </div>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>用户名</label>
          <input v-model="username" class="input" type="text" autocomplete="username" required />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="password" class="input" type="password" autocomplete="current-password" required />
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <button class="btn btn-primary login-btn" type="submit" :disabled="loading">
          {{ loading ? '登录中…' : '登 录' }}
        </button>
      </form>
      <p class="hint">默认账号 admin / admin123</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 0%, #1a2540 0%, var(--bg-deep) 60%);
  position: relative;
  overflow: hidden;
}

.stars {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1px 1px at 20% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(1px 1px at 60% 70%, rgba(255, 255, 255, 0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 80% 20%, rgba(255, 255, 255, 0.5) 0%, transparent 100%),
    radial-gradient(1px 1px at 40% 80%, rgba(255, 255, 255, 0.3) 0%, transparent 100%);
  pointer-events: none;
}

.login-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px 36px;
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 1;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  font-size: 40px;
  display: block;
  margin-bottom: 8px;
}

.login-header h1 {
  font-size: 22px;
  color: var(--gold-light);
  margin-bottom: 4px;
}

.login-header p {
  color: var(--text-muted);
  font-size: 13px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  margin-top: 8px;
  font-size: 15px;
}

.hint {
  text-align: center;
  margin-top: 16px;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
