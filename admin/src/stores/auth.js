import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '../api/client'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const admin = ref(JSON.parse(localStorage.getItem('admin_info') || 'null'))

  async function login(username, password) {
    const { data } = await client.post('/admin/auth/login', { username, password })
    token.value = data.access_token
    admin.value = data.admin
    localStorage.setItem('admin_token', data.access_token)
    localStorage.setItem('admin_info', JSON.stringify(data.admin))
    return data
  }

  function logout() {
    token.value = ''
    admin.value = null
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_info')
  }

  async function fetchMe() {
    const { data } = await client.get('/admin/auth/me')
    admin.value = data
    localStorage.setItem('admin_info', JSON.stringify(data))
    return data
  }

  const isLoggedIn = () => !!token.value

  return { token, admin, login, logout, fetchMe, isLoggedIn }
})
