<script setup>
import { onMounted, ref } from 'vue'
import client from '../api/client'

const posts = ref([])
const loading = ref(true)
const showCreate = ref(false)
const saving = ref(false)

const timeTypeLabels = { survival: '生存', money: '赚钱', beauty: '好看', fun: '好玩', flow: '心流' }

const form = ref({
  author_name: '',
  avatar: '👩',
  content: '',
  task_title: '',
  time_type: 'survival',
})

async function load() {
  loading.value = true
  try {
    const { data } = await client.get('/admin/posts')
    posts.value = data
  } finally {
    loading.value = false
  }
}

async function createPost() {
  saving.value = true
  try {
    const { data } = await client.post('/admin/posts', form.value)
    posts.value.unshift(data)
    showCreate.value = false
    form.value = { author_name: '', avatar: '👩', content: '', task_title: '', time_type: 'survival' }
  } finally {
    saving.value = false
  }
}

async function deletePost(id) {
  if (!confirm('确定删除这条动态？')) return
  await client.delete(`/admin/posts/${id}`)
  posts.value = posts.value.filter((p) => p.id !== id)
}

function formatDate(d) {
  return new Date(d).toLocaleString('zh-CN')
}

onMounted(load)
</script>

<template>
  <div>
    <h2 class="page-title">社区动态</h2>
    <div class="toolbar">
      <button class="btn btn-primary" @click="showCreate = true">+ 发布动态</button>
    </div>

    <div class="card table-wrap">
      <div v-if="loading" class="empty">加载中…</div>
      <table v-else-if="posts.length">
        <thead>
          <tr>
            <th>ID</th>
            <th>作者</th>
            <th>内容</th>
            <th>关联任务</th>
            <th>时间类型</th>
            <th>点赞</th>
            <th>评论</th>
            <th>发布时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in posts" :key="p.id">
            <td>{{ p.id }}</td>
            <td>{{ p.author_name }}</td>
            <td class="content-cell">{{ p.content }}</td>
            <td>{{ p.task_title }}</td>
            <td><span class="badge">{{ timeTypeLabels[p.time_type] || p.time_type }}</span></td>
            <td>{{ p.likes_count }}</td>
            <td>{{ p.comments_count }}</td>
            <td>{{ formatDate(p.created_at) }}</td>
            <td><button class="btn btn-danger btn-sm" @click="deletePost(p.id)">删除</button></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无动态</div>
    </div>

    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <h3>发布社区动态</h3>
        <div class="form-group">
          <label>作者名</label>
          <input v-model="form.author_name" class="input" required />
        </div>
        <div class="form-group">
          <label>头像 Emoji</label>
          <input v-model="form.avatar" class="input" maxlength="4" />
        </div>
        <div class="form-group">
          <label>内容</label>
          <textarea v-model="form.content" class="input" rows="3" />
        </div>
        <div class="form-group">
          <label>关联任务</label>
          <input v-model="form.task_title" class="input" />
        </div>
        <div class="form-group">
          <label>时间类型</label>
          <select v-model="form.time_type" class="select" style="width: 100%">
            <option v-for="(label, key) in timeTypeLabels" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" @click="showCreate = false">取消</button>
          <button class="btn btn-primary" :disabled="saving" @click="createPost">{{ saving ? '发布中…' : '发布' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

textarea.input {
  resize: vertical;
}
</style>
