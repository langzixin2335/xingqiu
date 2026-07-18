<script setup>
import { onMounted, ref } from 'vue'
import client from '../api/client'

const devices = ref([])
const messages = ref([])
const loading = ref(true)
const sending = ref(false)

const form = ref({
  title: '',
  body: '',
  target_type: 'all',
  user_id: null,
})

async function load() {
  loading.value = true
  try {
    const [devRes, msgRes] = await Promise.all([
      client.get('/admin/push/devices'),
      client.get('/admin/push/messages'),
    ])
    devices.value = devRes.data
    messages.value = msgRes.data
  } finally {
    loading.value = false
  }
}

async function sendPush() {
  if (!form.value.title.trim() || !form.value.body.trim()) {
    alert('请填写标题和内容')
    return
  }
  if (form.value.target_type === 'user' && !form.value.user_id) {
    alert('请填写目标用户 ID')
    return
  }
  sending.value = true
  try {
    const payload = {
      title: form.value.title,
      body: form.value.body,
      target_type: form.value.target_type,
      user_id: form.value.target_type === 'user' ? Number(form.value.user_id) : null,
    }
    const { data } = await client.post('/admin/push/send', payload)
    messages.value.unshift(data)
    form.value.title = ''
    form.value.body = ''
    alert(`发送完成：成功 ${data.sent_count} 条，失败 ${data.failed_count} 条`)
  } catch (e) {
    alert(e.response?.data?.detail || '发送失败')
  } finally {
    sending.value = false
  }
}

function formatDate(d) {
  return new Date(d).toLocaleString('zh-CN')
}

const targetLabels = { all: '全部用户', user: '指定用户' }
const statusLabels = { sent: '已发送', failed: '失败', recorded: '已记录(未配置FCM)' }

onMounted(load)
</script>

<template>
  <div>
    <h2 class="page-title">推送消息</h2>

    <div class="grid">
      <div class="card">
        <h3 class="section-title">发送推送</h3>
        <div class="form-group">
          <label>推送范围</label>
          <select v-model="form.target_type" class="select" style="width: 100%">
            <option value="all">全部已注册设备</option>
            <option value="user">指定用户</option>
          </select>
        </div>
        <div v-if="form.target_type === 'user'" class="form-group">
          <label>用户 ID</label>
          <input v-model="form.user_id" class="input" type="number" placeholder="输入用户 ID" />
        </div>
        <div class="form-group">
          <label>标题</label>
          <input v-model="form.title" class="input" maxlength="100" placeholder="如：今日任务提醒" />
        </div>
        <div class="form-group">
          <label>内容</label>
          <textarea v-model="form.body" class="input" rows="4" maxlength="500" placeholder="推送正文内容" />
        </div>
        <p class="hint">未配置 FCM_SERVER_KEY 时仅记录消息，不实际推送。</p>
        <button class="btn btn-primary" :disabled="sending" @click="sendPush">
          {{ sending ? '发送中…' : '发送推送' }}
        </button>
      </div>

      <div class="card">
        <h3 class="section-title">已注册设备（{{ devices.length }}）</h3>
        <div v-if="loading" class="empty">加载中…</div>
        <div v-else-if="devices.length" class="device-list">
          <div v-for="d in devices" :key="d.id" class="device-row">
            <div>
              <strong>{{ d.user_nickname }}</strong>
              <span class="sub"> · {{ d.user_phone }}</span>
            </div>
            <div class="sub">{{ d.platform }} · {{ d.token_preview }}</div>
          </div>
        </div>
        <div v-else class="empty">暂无设备 Token</div>
      </div>
    </div>

    <div class="card" style="margin-top: 20px">
      <h3 class="section-title">发送记录</h3>
      <div class="table-wrap">
        <table v-if="messages.length">
          <thead>
            <tr>
              <th>ID</th>
              <th>标题</th>
              <th>内容</th>
              <th>范围</th>
              <th>成功/失败</th>
              <th>状态</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in messages" :key="m.id">
              <td>{{ m.id }}</td>
              <td>{{ m.title }}</td>
              <td class="content-cell">{{ m.body }}</td>
              <td>{{ targetLabels[m.target_type] || m.target_type }}{{ m.user_id ? ` #${m.user_id}` : '' }}</td>
              <td>{{ m.sent_count }} / {{ m.failed_count }}</td>
              <td><span class="badge">{{ statusLabels[m.status] || m.status }}</span></td>
              <td>{{ formatDate(m.created_at) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">暂无发送记录</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.section-title {
  font-size: 15px;
  color: var(--gold-light);
  margin-bottom: 16px;
}

.hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.device-list {
  max-height: 280px;
  overflow-y: auto;
}

.device-row {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.device-row:last-child {
  border-bottom: none;
}

.sub {
  font-size: 12px;
  color: var(--text-muted);
}

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
