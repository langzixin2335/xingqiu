<script setup>
import { onMounted, ref } from 'vue'
import client from '../api/client'

const products = ref([])
const loading = ref(true)
const editing = ref(null)
const isCreate = ref(false)
const saving = ref(false)

const categoryOptions = ['survival', 'money', 'beauty', 'fun', 'flow']
const categoryLabels = { survival: '生存', money: '赚钱', beauty: '好看', fun: '好玩', flow: '心流' }

const emptyForm = () => ({
  name: '',
  description: '',
  category: 'survival',
  subcategory: '',
  badge: '',
  emoji: '📦',
})

const form = ref(emptyForm())

async function load() {
  loading.value = true
  try {
    const { data } = await client.get('/admin/products')
    products.value = data
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = emptyForm()
  isCreate.value = true
  editing.value = true
}

function openEdit(product) {
  form.value = { ...product }
  isCreate.value = false
  editing.value = true
}

async function save() {
  saving.value = true
  try {
    if (isCreate.value) {
      const { data } = await client.post('/admin/products', form.value)
      products.value.push(data)
    } else {
      const { data } = await client.put(`/admin/products/${form.value.id}`, form.value)
      const idx = products.value.findIndex((p) => p.id === data.id)
      if (idx !== -1) products.value[idx] = data
    }
    editing.value = null
  } finally {
    saving.value = false
  }
}

async function deleteProduct(id) {
  if (!confirm('确定删除该产品？')) return
  await client.delete(`/admin/products/${id}`)
  products.value = products.value.filter((p) => p.id !== id)
}

onMounted(load)
</script>

<template>
  <div>
    <h2 class="page-title">能量产品</h2>
    <div class="toolbar">
      <button class="btn btn-primary" @click="openCreate">+ 新增产品</button>
    </div>

    <div class="card table-wrap">
      <div v-if="loading" class="empty">加载中…</div>
      <table v-else-if="products.length">
        <thead>
          <tr>
            <th>ID</th>
            <th>图标</th>
            <th>名称</th>
            <th>分类</th>
            <th>子分类</th>
            <th>标签</th>
            <th>描述</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.id">
            <td>{{ p.id }}</td>
            <td>{{ p.emoji }}</td>
            <td>{{ p.name }}</td>
            <td><span class="badge">{{ categoryLabels[p.category] || p.category }}</span></td>
            <td>{{ p.subcategory }}</td>
            <td>{{ p.badge || '—' }}</td>
            <td class="desc-cell">{{ p.description }}</td>
            <td>
              <button class="btn btn-ghost btn-sm" @click="openEdit(p)">编辑</button>
              <button class="btn btn-danger btn-sm" style="margin-left: 6px" @click="deleteProduct(p.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无产品</div>
    </div>

    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <div class="modal">
        <h3>{{ isCreate ? '新增产品' : '编辑产品' }}</h3>
        <div class="form-group">
          <label>名称</label>
          <input v-model="form.name" class="input" />
        </div>
        <div class="form-group">
          <label>Emoji 图标</label>
          <input v-model="form.emoji" class="input" maxlength="4" />
        </div>
        <div class="form-group">
          <label>分类</label>
          <select v-model="form.category" class="select" style="width: 100%">
            <option v-for="c in categoryOptions" :key="c" :value="c">{{ categoryLabels[c] }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>子分类</label>
          <input v-model="form.subcategory" class="input" />
        </div>
        <div class="form-group">
          <label>标签（可选）</label>
          <input v-model="form.badge" class="input" placeholder="如：热门、新品" />
        </div>
        <div class="form-group">
          <label>描述</label>
          <textarea v-model="form.description" class="input" rows="3" />
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" @click="editing = null">取消</button>
          <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.desc-cell {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

textarea.input {
  resize: vertical;
}
</style>
