import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('access_token') || '')

  const isLoggedIn = computed(() => !!token.value)
  const onboardingStep = computed(() => user.value?.onboarding_step || 'welcome')
  const personality = computed(() => user.value?.personality || null)

  function setToken(newToken) {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('access_token', newToken)
    } else {
      localStorage.removeItem('access_token')
    }
  }

  function setUser(data) {
    user.value = data
  }

  function setPersonality(value) {
    if (user.value) user.value.personality = value
  }

  function setOnboardingStep(step) {
    if (user.value) user.value.onboarding_step = step
  }

  async function fetchMe() {
    if (!token.value) return null
    try {
      const { data } = await api.get('/auth/me')
      user.value = data
      return data
    } catch {
      setToken('')
      user.value = null
      return null
    }
  }

  async function login(phone, password) {
    const { data } = await api.post('/auth/login', { phone, password })
    setToken(data.access_token)
    user.value = data.user
    return data.user
  }

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload)
    setToken(data.access_token)
    user.value = data.user
    return data.user
  }

  async function sendSmsCode(phone) {
    const { data } = await api.post('/auth/sms-code', { phone })
    return data
  }

  async function wechatLogin(code) {
    const { data } = await api.post('/auth/wechat/login', { code })
    setToken(data.access_token)
    user.value = data.user
    return data.user
  }

  function logout() {
    setToken('')
    user.value = null
  }

  return {
    user,
    token,
    isLoggedIn,
    onboardingStep,
    personality,
    setToken,
    setUser,
    setPersonality,
    setOnboardingStep,
    fetchMe,
    login,
    register,
    sendSmsCode,
    wechatLogin,
    logout,
  }
})
