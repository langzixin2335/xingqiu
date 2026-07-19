<template>
  <div class="auth-page">
    <Starfield :star-count="36" />
    <div class="auth-container">
      <div class="brand-logo">✦ SHINING PLANET ✦</div>
      <h1 class="auth-title">微信<span>授权登录</span></h1>
      <p class="auth-subtitle">{{ statusText }}</p>
      <div class="divider"></div>
      <p v-if="error" class="error-text">{{ error }}</p>
      <button v-if="error" class="btn btn-primary" @click="router.push('/auth/login')">
        返回登录
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Starfield from '../../components/Starfield.vue'
import { useUserStore } from '../../stores/user'
import '../../assets/styles/auth.css'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const statusText = ref('正在完成微信授权...')
const error = ref('')

function redirectByStep() {
  const step = userStore.onboardingStep
  if (step === 'done') {
    router.replace('/home')
  } else {
    const map = {
      welcome: '/onboarding/wuxing-select',
      personality: '/onboarding/wuxing-select',
      plan: '/onboarding/plan-create',
    }
    router.replace(map[step] || '/onboarding/wuxing-select')
  }
}

onMounted(async () => {
  const code = route.query.code
  if (!code) {
    error.value = '未获取到微信授权码'
    statusText.value = '授权失败'
    return
  }
  try {
    await userStore.wechatLogin(code)
    redirectByStep()
  } catch (e) {
    error.value = e.response?.data?.detail || '微信登录失败'
    statusText.value = '授权失败'
  }
})
</script>
