import api from '../../api'
import { useUserStore } from '../../stores/user'
import {
  bindRepeatOptionClicks,
  readDailyReminderForm,
  scheduleRemindersFromApi,
} from '../../utils/notifications.js'
import { formatApiError, showToast } from '../../utils/ui.js'

function readPersonalityFromLocation() {
  const fromSearch = new URLSearchParams(window.location.search).get('personality')
  if (fromSearch) return fromSearch
  const hash = window.location.hash || ''
  const q = hash.indexOf('?')
  if (q >= 0) {
    return new URLSearchParams(hash.slice(q + 1)).get('personality')
  }
  return null
}

const PERIOD_LABELS = {
  short: '短期 1-3个月',
  medium: '中期 3-6个月',
  long: '长期 6-12个月',
}

const TIME_LABELS = {
  survival: '生存星球',
  money: '赚钱星球',
  beauty: '好看星球',
  fun: '好玩星球',
  flow: '心流星球',
}

const PERSONALITY_LABELS = {
  wood: '木型 · 生发型',
  fire: '火型 · 传播型',
  earth: '土型 · 承载型',
  metal: '金型 · 决断型',
  water: '水型 · 洞察型',
}

let pendingGoals = []
let pendingReminders = []
let goalStatus = 'has-plan'
let personality = 'fire'
let aiDuration = '3个月'
let aiPhases = []
let previewEditMode = false
let goalUnderstanding = null
let pendingDailyTasks = []
let confirmingPlan = false

function getSelectedDuration() {
  const selected = document.querySelector('#no-plan-area .period-selector .period-btn.selected')
  return selected?.textContent?.trim() || '3个月'
}

function getSelectedTimeType() {
  const selected = document.querySelector('.time-type-tag.selected')
  if (!selected) return 'survival'
  const classes = ['survival', 'money', 'beauty', 'fun', 'flow']
  return classes.find((c) => selected.classList.contains(c)) || 'survival'
}

function getSelectedPeriod() {
  const selected = document.querySelector('#has-plan-area .period-btn.selected')
  const text = selected?.textContent || ''
  if (text.includes('中期')) return 'medium'
  if (text.includes('长期')) return 'long'
  return 'short'
}

function renderGoalList() {
  const list = document.getElementById('goalList')
  if (!list) return
  if (pendingGoals.length === 0) {
    list.innerHTML = ''
    return
  }
  const icons = { survival: '🌿', money: '💎', beauty: '✨', fun: '🎮', flow: '🧘' }
  list.innerHTML = pendingGoals
    .map(
      (g, i) => `
    <div class="goal-item" data-goal-index="${i}">
      <div class="goal-icon" style="background: rgba(45, 90, 61, 0.3);">${icons[g.time_type] || '🎯'}</div>
      <div class="goal-content">
        <div class="goal-title">${g.title}</div>
        <div class="goal-period">${TIME_LABELS[g.time_type]} | ${PERIOD_LABELS[g.period]}</div>
      </div>
      <button class="goal-delete" onclick="deleteGoal(${i})">×</button>
    </div>`
    )
    .join('')
}

function renderReminderList() {
  let box = document.getElementById('reminderList')
  if (!box) {
    const card = document.querySelector('.daily-goal-form')?.closest('.card')
    if (!card) return
    box = document.createElement('div')
    box.id = 'reminderList'
    box.style.cssText = 'margin-top:12px;display:flex;flex-direction:column;gap:10px;'
    card.querySelector('.daily-goal-form')?.after(box)
  }
  if (pendingReminders.length === 0) {
    box.innerHTML = ''
    return
  }
  box.innerHTML = pendingReminders
    .map(
      (r, i) => `
    <div class="goal-item">
      <div class="goal-icon" style="background: rgba(212, 185, 106, 0.2);">🔔</div>
      <div class="goal-content">
        <div class="goal-title">${r.title}</div>
        <div class="goal-period">${r.remind_time} · ${TIME_LABELS[r.time_type]}</div>
      </div>
      <button class="goal-delete" onclick="deleteReminder(${i})">×</button>
    </div>`
    )
    .join('')
}

function phaseToPeriod(index) {
  if (index >= 3) return 'long'
  if (index >= 2) return 'medium'
  return 'short'
}

function renderGoalUnderstanding(source = 'template') {
  const preview = document.getElementById('planPreview')
  if (!preview || !goalUnderstanding) return
  let card = document.getElementById('goalUnderstandingCard')
  if (!card) {
    card = document.createElement('div')
    card.id = 'goalUnderstandingCard'
    card.className = 'goal-understanding-card'
    preview.querySelector('.plan-preview')?.prepend(card)
  }
  const u = goalUnderstanding
  const sourceLabel = source === 'template' ? '本地模板（AI 未生效）' : 'AI生成'
  const sourceClass = source === 'template' ? 'understanding-tag--warn' : ''
  card.innerHTML = `
    <div class="understanding-title">🎯 AI 已理解你的目标</div>
    <div class="understanding-meta" style="margin-bottom:10px">
      <span class="understanding-tag ${sourceClass}">${sourceLabel}</span>
    </div>
    <div class="understanding-summary">${u.summary}</div>
    <div class="understanding-meta">
      <span class="understanding-tag">${u.category}</span>
      <span class="understanding-tag">每周约 ${u.weekly_hours} 小时</span>
    </div>
    <div class="understanding-row"><strong>成功标准：</strong>${u.success_criteria || '—'}</div>
    <div class="understanding-row"><strong>主要障碍：</strong>${u.main_obstacle || '—'}</div>
    ${source === 'template' ? '<div class="understanding-row understanding-warn">请检查 backend/.env 中 DEEPSEEK_API_KEY 是否有效</div>' : ''}
  `
}

function renderDailyTasksPreview() {
  const preview = document.getElementById('planPreview')
  if (!preview) return
  let box = document.getElementById('dailyTasksPreview')
  if (!box) {
    box = document.createElement('div')
    box.id = 'dailyTasksPreview'
    box.className = 'daily-tasks-preview'
    preview.querySelector('.plan-timeline')?.after(box)
  }
  if (!pendingDailyTasks.length) {
    box.innerHTML = ''
    return
  }
  box.innerHTML = `
    <div class="daily-tasks-title">📋 首周每日任务（确认后将进入今日待办）</div>
    ${pendingDailyTasks
      .map(
        (t) => `
      <div class="daily-task-chip">
        <span class="chip-time">${t.remind_time || '全天'}</span>
        <span class="chip-title">${t.title}</span>
        <span class="chip-type">${TIME_LABELS[t.time_type] || t.time_type}</span>
      </div>`
      )
      .join('')}
  `
}

function applyAiBundle(data) {
  goalUnderstanding = data.goal_understanding || null
  aiPhases = data.phases || []
  pendingDailyTasks = data.daily_tasks || []
  pendingGoals = aiPhases.map((p, i) => ({
    time_type: p.time_type || ['survival', 'money', 'fun', 'flow'][i] || 'survival',
    period: phaseToPeriod(i),
    phase_label: p.period || '',
    title: p.goal,
    action: p.action || '',
  }))
  renderGoalUnderstanding(data.source)
  renderAiPreview(aiPhases)
  renderDailyTasksPreview()
}

function syncPhasesToGoals() {
  pendingGoals = aiPhases.map((p, i) => ({
    time_type: p.time_type || ['survival', 'money', 'fun', 'flow'][i] || 'survival',
    period: phaseToPeriod(i),
    phase_label: p.period || '',
    title: p.goal,
    action: p.action || '',
  }))
}

function readPhasesFromPreviewDom() {
  const items = document.querySelectorAll('#planPreview .timeline-item')
  aiPhases = Array.from(items).map((item, i) => {
    if (previewEditMode) {
      return {
        period: item.querySelector('[data-field="period"]')?.value?.trim() || '',
        goal: item.querySelector('[data-field="goal"]')?.value?.trim() || '',
        action: item.querySelector('[data-field="action"]')?.value?.trim() || '',
      }
    }
    return {
      period: item.querySelector('.timeline-period')?.textContent?.trim() || aiPhases[i]?.period || '',
      goal: item.querySelector('.timeline-goal')?.textContent?.trim() || aiPhases[i]?.goal || '',
      action: item.querySelector('.timeline-action')?.textContent?.trim() || aiPhases[i]?.action || '',
    }
  })
  syncPhasesToGoals()
}

function renderAiPreview(phases) {
  aiPhases = phases.map((p) => ({ ...p }))
  const timeline = document.querySelector('#planPreview .plan-timeline')
  if (!timeline) return

  if (previewEditMode) {
    timeline.innerHTML = aiPhases
      .map(
        (p, i) => `
    <div class="timeline-item" data-phase-index="${i}">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <input class="preview-edit-input" data-field="period" value="${escapeAttr(p.period)}" placeholder="阶段名称" />
        <input class="preview-edit-input preview-edit-goal" data-field="goal" value="${escapeAttr(p.goal)}" placeholder="阶段目标" />
        <input class="preview-edit-input preview-edit-action" data-field="action" value="${escapeAttr(p.action)}" placeholder="关联星球行动" />
      </div>
    </div>`
      )
      .join('')
    return
  }

  timeline.innerHTML = aiPhases
    .map(
      (p) => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-period">${p.period}</div>
        <div class="timeline-goal">${p.goal}</div>
        <div class="timeline-action">${p.action}</div>
      </div>
    </div>`
    )
    .join('')
}

function escapeAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

function showPersonalityTag() {
  const header = document.querySelector('.legacy-page--plan-create .header')
  if (!header || header.querySelector('.personality-tag')) return
  const label = PERSONALITY_LABELS[personality]
  if (!label) return
  const tag = document.createElement('div')
  tag.className = 'personality-tag'
  tag.style.cssText = 'display:flex;justify-content:center;margin-bottom:16px;'
  tag.innerHTML = `<span style="font-size:14px;color:var(--accent-gold);">当前人格：${label}</span>`
  header.appendChild(tag)
}

export function initPlanCreateView(router) {
  const userStore = useUserStore()
  personality = readPersonalityFromLocation() || userStore.personality || 'fire'

  pendingGoals = [
    { time_type: 'survival', period: 'short', title: '每天运动30分钟，保持规律作息' },
  ]
  pendingReminders = []

  try {
    renderGoalList()
    showPersonalityTag()
  } catch (err) {
    console.warn('plan-create render failed', err)
  }

  const pageRoot = document.querySelector('.legacy-page--plan-create')
  try {
    bindRepeatOptionClicks(pageRoot?.querySelector('.daily-goal-form'))
  } catch (err) {
    console.warn('bind reminder form failed', err)
  }

  const addDailyBtn = pageRoot
    ?.querySelector('.daily-goal-form')
    ?.closest('.card')
    ?.querySelector('.btn-secondary')
  addDailyBtn?.addEventListener('click', () => window.addDailyReminder())

  pageRoot?.querySelector('#no-plan-area .period-selector')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.period-btn')
    if (!btn) return
    pageRoot.querySelectorAll('#no-plan-area .period-btn').forEach((el) => el.classList.remove('selected'))
    btn.classList.add('selected')
    aiDuration = btn.textContent.trim()
  })

  pageRoot?.querySelector('#planPreview .edit-btn')?.addEventListener('click', () => {
    window.toggleEditPreview()
  })

  window.selectGoalStatus = (status) => {
    goalStatus = status
    document.querySelectorAll('.status-option').forEach((el) => el.classList.remove('selected'))
    document.getElementById(`status-${status}`)?.classList.add('selected')

    if (status === 'has-plan') {
      document.getElementById('has-plan-area')?.classList.remove('hidden')
      document.getElementById('no-plan-area')?.classList.add('hidden')
      if (pendingGoals.length === 0) {
        pendingGoals = [
          { time_type: 'survival', period: 'short', title: '每天运动30分钟，保持规律作息' },
        ]
        renderGoalList()
      }
    } else {
      document.getElementById('has-plan-area')?.classList.add('hidden')
      document.getElementById('no-plan-area')?.classList.remove('hidden')
      document.getElementById('no-plan-area')?.classList.add('fade-in')
      pendingGoals = []
      renderGoalList()
    }
  }

  const setScanBusy = (busy) => {
    document.querySelector('.scan-area')?.classList.toggle('scanning', busy)
  }

  const closeScanSheet = () => {
    document.getElementById('scanSheetOverlay')?.classList.add('hidden')
  }

  const uploadScanFile = async (file) => {
    if (!file) return
    setScanBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/plans/ocr', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const textarea = document.querySelector('#has-plan-area textarea.input-field')
      if (textarea) textarea.value = data.text
      if (data.goals?.length) {
        pendingGoals.push(...data.goals)
        renderGoalList()
      }
      alert(`📷 OCR识别完成（${data.source}）`)
    } catch (e) {
      alert(e.response?.data?.detail || '📷 扫描失败，请稍后重试')
    } finally {
      setScanBusy(false)
    }
  }

  const pickFileViaInput = (accept, capture) =>
    new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = accept
      if (capture) input.setAttribute('capture', capture)
      let settled = false
      const done = (file) => {
        if (settled) return
        settled = true
        resolve(file)
      }
      input.onchange = () => done(input.files?.[0] || null)
      input.addEventListener('cancel', () => done(null))
      input.click()
    })

  window.closeScanSheet = (event) => {
    if (event && event.target !== event.currentTarget) return
    closeScanSheet()
  }

  window.simulateScan = () => {
    document.getElementById('scanSheetOverlay')?.classList.remove('hidden')
  }

  window.pickScanSource = async (source) => {
    closeScanSheet()
    try {
      const { isNativeApp, pickImage, webPathToFile } = await import('../../utils/camera.js')

      if (source === 'camera') {
        if (isNativeApp()) {
          const path = await pickImage('camera')
          if (!path) return
          await uploadScanFile(await webPathToFile(path, 'handbook-camera.jpg'))
          return
        }
        const file = await pickFileViaInput('image/*', 'environment')
        await uploadScanFile(file)
        return
      }

      if (source === 'photos') {
        if (isNativeApp()) {
          const path = await pickImage('photos')
          if (!path) return
          await uploadScanFile(await webPathToFile(path, 'handbook-album.jpg'))
          return
        }
        const file = await pickFileViaInput('image/*')
        await uploadScanFile(file)
        return
      }

      // 文件选择：PDF / 图片
      const file = await pickFileViaInput('image/*,application/pdf,text/plain')
      await uploadScanFile(file)
    } catch (e) {
      if (String(e?.message || e).includes('cancelled') || e?.message === 'User cancelled photos app') {
        return
      }
      alert(e?.message || '无法打开选择器，请检查相机/相册权限后重试')
    }
  }

  window.selectTimeType = () => {
    document.querySelectorAll('.time-type-tag').forEach((el) => el.classList.remove('selected'))
    event.target.classList.add('selected')
  }

  window.selectPeriod = () => {
    document.querySelectorAll('#has-plan-area .period-btn').forEach((el) => el.classList.remove('selected'))
    event.target.classList.add('selected')
  }

  window.addGoal = () => {
    const input = document.getElementById('goalInput')
    if (!input?.value.trim()) {
      alert('请输入目标内容')
      return
    }
    pendingGoals.push({
      time_type: getSelectedTimeType(),
      period: getSelectedPeriod(),
      title: input.value.trim(),
    })
    renderGoalList()
    input.value = ''
  }

  window.deleteGoal = (index) => {
    pendingGoals.splice(index, 1)
    renderGoalList()
  }

  window.addDailyReminder = () => {
    const reminder = readDailyReminderForm(pageRoot)
    if (!reminder) {
      alert('请填写每日提醒目标')
      return
    }
    pendingReminders.push(reminder)
    renderReminderList()
  }

  window.deleteReminder = (index) => {
    pendingReminders.splice(index, 1)
    renderReminderList()
  }

  window.toggleSwitch = (el) => {
    el.classList.toggle('active')
  }

  window.toggleEditPreview = () => {
    if (previewEditMode) {
      readPhasesFromPreviewDom()
      previewEditMode = false
      renderAiPreview(aiPhases)
      const btn = document.querySelector('#planPreview .edit-btn')
      if (btn) btn.textContent = '编辑'
      return
    }
    previewEditMode = true
    renderAiPreview(aiPhases)
    const btn = document.querySelector('#planPreview .edit-btn')
    if (btn) btn.textContent = '完成'
  }

  window.generatePlan = async () => {
    const textarea = document.querySelector('#no-plan-area textarea.input-field')
    const coreGoal = textarea?.value.trim()
    if (!coreGoal) {
      showToast('请先输入你的核心目标')
      return
    }
    const duration = getSelectedDuration()
    aiDuration = duration

    const generateBtn = document.querySelector('#no-plan-area .btn.btn-primary')
    const generateBtnDefaultText = generateBtn?.textContent?.trim() || '✨ 生成我的专属计划'
    let elapsedSeconds = 0
    let generateTimer = null
    if (generateBtn) {
      generateBtn.disabled = true
      generateBtn.textContent = 'AI生成中..0s'
      generateTimer = setInterval(() => {
        elapsedSeconds += 1
        generateBtn.textContent = `AI生成中..${elapsedSeconds}s`
      }, 1000)
    }

    try {
      const { data } = await api.post(
        '/plans/ai-generate',
        {
          core_goal: coreGoal,
          duration,
          personality,
        },
        { timeout: 120000 }
      )
      applyAiBundle(data)
    } catch {
      showToast('AI 生成失败，已使用本地模板预览')
      applyAiBundle({
        goal_understanding: {
          summary: `在${duration}内围绕「${coreGoal}」建立可执行的成长节奏`,
          category: '个人成长',
          success_criteria: `完成与「${coreGoal}」直接相关的阶段性成果`,
          weekly_hours: 5,
          main_obstacle: '时间碎片化',
        },
        phases: [
          { period: '第1-2周 · 启动期', goal: `围绕「${coreGoal}」建立每日15分钟微习惯`, action: '生存星球：每晚固定15分钟练习', time_type: 'survival' },
          { period: '第3-4周 · 积累期', goal: '每周2次专项练习并记录成长', action: '赚钱星球：学习相关技能30分钟', time_type: 'money' },
          { period: '第2个月 · 突破期', goal: '完成一次可见成果输出', action: '好玩星球：完成一次轻量实战', time_type: 'fun' },
          { period: `${duration} · 绽放期`, goal: `达成「${coreGoal}」阶段性目标`, action: '心流星球：专注复盘15分钟', time_type: 'flow' },
        ],
        daily_tasks: [
          { title: '每晚21:00专项练习15分钟', time_type: 'survival', remind_time: '21:00' },
          { title: '阅读相关主题30分钟', time_type: 'money', remind_time: '08:00' },
          { title: '正念冥想10分钟', time_type: 'flow', remind_time: '06:30' },
        ],
        source: 'template',
      })
    } finally {
      if (generateTimer) clearInterval(generateTimer)
      if (generateBtn) {
        generateBtn.disabled = false
        generateBtn.textContent = generateBtnDefaultText
      }
    }
    previewEditMode = false
    const editBtn = document.querySelector('#planPreview .edit-btn')
    if (editBtn) editBtn.textContent = '编辑'
    const preview = document.getElementById('planPreview')
    preview?.classList.remove('hidden')
    preview?.classList.add('fade-in')
    preview?.scrollIntoView({ behavior: 'smooth' })
  }

  window.confirmPlan = async () => {
    if (confirmingPlan) return
    const confirmBtns = [
      document.getElementById('btnConfirmPlan'),
      document.querySelector('.bottom-bar .btn-primary'),
    ].filter(Boolean)

    if (previewEditMode) {
      readPhasesFromPreviewDom()
      previewEditMode = false
    }
    if (goalStatus === 'no-plan' && pendingGoals.length === 0 && pendingDailyTasks.length === 0) {
      showToast('请先点击「生成我的专属计划」')
      return
    }
    if (pendingGoals.length === 0 && pendingDailyTasks.length === 0) {
      showToast('请至少添加一个成长目标')
      return
    }

    // 规范化 AI 任务字段，避免校验失败后看起来像“没反应”
    const safeGoals = pendingGoals
      .filter((g) => g?.title)
      .map((g) => ({
        time_type: ['survival', 'money', 'beauty', 'fun', 'flow'].includes(g.time_type)
          ? g.time_type
          : 'survival',
        period: ['short', 'medium', 'long'].includes(g.period) ? g.period : 'short',
        title: String(g.title).slice(0, 255),
        phase_label: String(g.phase_label || '').slice(0, 255),
        action: String(g.action || '').slice(0, 255),
      }))
    const safeTasks = pendingDailyTasks
      .filter((t) => t?.title)
      .map((t) => ({
        title: String(t.title).slice(0, 255),
        time_type: ['survival', 'money', 'beauty', 'fun', 'flow'].includes(t.time_type)
          ? t.time_type
          : 'survival',
        remind_time: /^\d{2}:\d{2}$/.test(t.remind_time || '') ? t.remind_time : '07:00',
        repeat_days: t.repeat_days || '1,2,3,4,5,6,7',
        requires_photo: !!t.requires_photo,
      }))

    if (safeGoals.length === 0 && safeTasks.length === 0) {
      showToast('计划内容为空，请重新生成')
      return
    }

    const coreGoal =
      document.querySelector('#has-plan-area textarea.input-field')?.value?.trim() ||
      document.querySelector('#no-plan-area textarea.input-field')?.value?.trim() ||
      goalUnderstanding?.summary ||
      safeGoals[0]?.title ||
      ''

    confirmingPlan = true
    confirmBtns.forEach((btn) => {
      btn.disabled = true
      btn.dataset.prevText = btn.textContent || ''
      btn.textContent = '保存中...'
    })

    try {
      await api.post(
        '/plans',
        {
          goal_status: goalStatus === 'no-plan' ? 'no-plan' : 'has-plan',
          core_goal: coreGoal,
          goals: safeGoals,
          daily_tasks: safeTasks,
          reminders: pendingReminders,
        },
        { timeout: 45000 }
      )
      const { data } = await api.post('/user/onboarding', { onboarding_step: 'done' })
      userStore.setUser(data)
      // 勿阻塞跳转：通知权限弹窗在部分机型会卡住
      scheduleRemindersFromApi().catch(() => {})
      showToast('计划已确认，正在进入星球首页')
      await router.replace('/home')
    } catch (e) {
      confirmingPlan = false
      showToast(formatApiError(e, '保存计划失败，请检查网络后重试'))
      confirmBtns.forEach((btn) => {
        btn.disabled = false
        btn.textContent = btn.dataset.prevText || '确认计划'
      })
    }
  }

  const handlers = [
    'selectGoalStatus',
    'simulateScan',
    'pickScanSource',
    'closeScanSheet',
    'selectTimeType',
    'selectPeriod',
    'addGoal',
    'deleteGoal',
    'addDailyReminder',
    'deleteReminder',
    'toggleSwitch',
    'generatePlan',
    'confirmPlan',
    'toggleEditPreview',
  ]

  return () => {
    pendingGoals = []
    pendingReminders = []
    pendingDailyTasks = []
    aiPhases = []
    goalUnderstanding = null
    previewEditMode = false
    handlers.forEach((name) => delete window[name])
  }
}
