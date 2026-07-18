<script setup>
import { onMounted, ref } from 'vue'
import client from '../api/client'

const users = ref([])
const loading = ref(true)
const search = ref('')
const editing = ref(null)
const saving = ref(false)

const tierOptions = ['free', 'basic', 'premium', 'vip']
const stepOptions = ['welcome', 'wuxing', 'plan', 'home', 'done']
const personalityOptions = ['wood', 'fire', 'earth', 'metal', 'water', '']

const tierLabels = { free: '免费', basic: '基础', premium: '高级', vip: 'VIP' }
const stepLabels = { welcome: '欢迎页', wuxing: '五行选择', plan: '制定计划', home: '主界面', done: '已完成' }
const personalityLabels = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }

async function load() {
  loading.value = true
  try {
    const { data } = await client.get('/admin/users', { params: { q: search.value } })
    users.value = data
  } finally {
    loading.value = false
  }
}

function openEdit(user) {
  editing.value = { ...user }
}

async function saveEdit() {
  saving.value = true
  try {
    const { id, nickname, member_tier, onboarding_step, personality } = editing.value
    const { data } = await client.patch(`/admin/users/${id}`, {
      nickname,
      member_tier,
      onboarding_step,
      personality: personality || null,
    })
    const idx = users.value.findIndex((u) => u.id === id)
    if (idx !== -1) users.value[idx] = data
    editing.value = null
  } finally {
    saving.value = false
  }
}

function formatDate(d) {
  return new Date(d).toLocaleString('zh-CN')
}

onMounted(load)
</script>

<template>
  <div>
    <h2 class="page-title">用户管理</h2>
    <div class="toolbar">
      <input v-model="search" class="input" style="max-width: 260px" placeholder="搜索手机号或昵称…" @keyup.enter="load" />
      <button class="btn btn-primary" @click="load">搜索</button>
    </div>

    <div class="card table-wrap">
      <div v-if="loading" class="empty">加载中…</div>
      <table v-else-if="users.length">
        <thead>
          <tr>
            <th>ID</th>
            <th>手机号</th>
            <th>昵称</th>
            <th>五行</th>
            <th>引导步骤</th>
            <th>会员</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.id }}</td>
            <td>{{ u.phone }}</td>
            <td>{{ u.nickname }}</td>
            <td>{{ personalityLabels[u.personality] || '—' }}</td>
            <td>{{ stepLabels[u.onboarding_step] || u.onboarding_step }}</td>
            <td><span class="badge">{{ tierLabels[u.member_tier] || u.member_tier }}</span></td>
            <td>{{ formatDate(u.created_at) }}</td>
            <td><button class="btn btn-ghost btn-sm" @click="openEdit(u)">编辑</button></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无用户</div>
    </div>

    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <div class="modal">
        <h3>编辑用户 #{{ editing.id }}</h3>
        <div class="form-group">
          <label>昵称</label>
          <input v-model="editing.nickname" class="input" />
        </div>
        <div class="form-group">
          <label>五行人格</label>
          <select v-model="editing.personality" class="select" style="width: 100%">
            <option value="">未设置</option>
            <option v-for="p in personalityOptions.filter(Boolean)" :key="p" :value="p">
              {{ personalityLabels[p] }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>引导步骤</label>
          <select v-model="editing.onboarding_step" class="select" style="width: 100%">
            <option v-for="s in stepOptions" :key="s" :value="s">{{ stepLabels[s] }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>会员等级</label>
          <select v-model="editing.member_tier" class="select" style="width: 100%">
            <option v-for="t in tierOptions" :key="t" :value="t">{{ tierLabels[t] }}</option>
          </select>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" @click="editing = null">取消</button>
          <button class="btn btn-primary" :disabled="saving" @click="saveEdit">{{ saving ? '保存中…' : '保存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
