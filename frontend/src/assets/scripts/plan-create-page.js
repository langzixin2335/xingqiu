import api from '../../api'
import { useUserStore } from '../../stores/user'
import {
  bindRepeatOptionClicks,
  decodeEncourageTitle,
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

const VALID_PLANETS = ['survival', 'money', 'beauty', 'fun', 'flow']

/** 按目标文案推断主星球（与后端规则对齐） */
function inferPrimaryPlanetFromGoal(goal) {
  const text = String(goal || '')
  const rules = [
    ['beauty', ['减肥', '健身', '塑形', '瘦身', '体重', '运动', '跑步', '护肤', '穿搭', '仪容', '化妆', '形象', '好看', '美妆', '发型']],
    ['survival', ['作息', '睡眠', '饮食', '早起', '养生', '戒烟', '戒酒']],
    ['fun', ['兴趣', '旅行', '社交', '摄影', '爱好', '演讲', '表达', '朗读', '口才', '唱歌', '画画']],
    ['flow', ['冥想', '正念', '专注', '心流', '复盘', '情绪', '焦虑', '心理']],
    ['money', ['学习', '阅读', '考试', '技能', '工作', '赚钱', '英语', '考证', '副业', '写作']],
  ]
  for (const [timeType, keys] of rules) {
    if (keys.some((k) => text.includes(k))) return timeType
  }
  return 'money'
}

function normalizeActionForPlanet(action, timeType) {
  const label = TIME_LABELS[timeType] || '生存星球'
  const text = String(action || '').trim()
  if (!text) return `${label}：轻轻做一件小事`
  const prefixMatch = text.match(/^[^：:]{0,12}星球\s*[：:]\s*(.*)$/)
  if (prefixMatch) {
    return `${label}：${prefixMatch[1].trim() || '轻轻做一件小事'}`
  }
  return `${label}：${text}`
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
/** 已点开过「达成奖励」的目标下标，不再闪烁 */
const rewardSeenGoalIndexes = new Set()
let encourageMode = 'single'
let encouragePoolPhrases = []
let encourageAiPhrases = []
/** 后端提醒仍需 time_type；前端不再按星球区分，统一用此值 */
const ENCOURAGE_TIME_TYPE = 'survival'
const DAY_NAME_BY_NUM = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
}
let goalStatus = 'has-plan'
let personality = 'fire'
let aiDuration = '3个月'
let aiPhases = []
let previewEditMode = false
let goalUnderstanding = null
let pendingDailyTasks = []
let confirmingPlan = false

function getSelectedDuration() {
  const selected = document.querySelector('#aiDurationOptions .period-btn.selected')
  return selected?.dataset?.duration || selected?.textContent?.trim() || '3个月'
}

function getSelectedDailyBudget() {
  const selected = document.querySelector('#aiDailyBudgetOptions .period-btn.selected')
  return selected?.dataset?.budget || '30-60分钟'
}

function weeklyHoursFromBudget(budget) {
  const map = {
    '15-30分钟': 3,
    '30-60分钟': 5,
    '1-2小时': 8,
    '2小时以上': 12,
  }
  return map[budget] || 5
}

function getSelectedTimeType() {
  const selected = document.querySelector('#has-plan-area .time-type-tag.selected')
  return selected?.dataset?.type || null
}

function syncTimeTypeTags() {
  const activeTypes = new Set(pendingGoals.map((g) => g.time_type))
  document.querySelectorAll('#has-plan-area .time-type-tag').forEach((el) => {
    const type = el.dataset.type
    const hasGoal = activeTypes.has(type)
    const selected = el.classList.contains('selected')
    el.classList.toggle('has-goal', hasGoal)
    el.classList.toggle('is-lit', hasGoal || selected)
  })
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
    rewardSeenGoalIndexes.clear()
    syncTimeTypeTags()
    return
  }
  const icons = { survival: '🌿', money: '💎', beauty: '✨', fun: '🎮', flow: '🧘' }
  list.innerHTML = pendingGoals
    .map((g, i) => {
      const blinkClass = rewardSeenGoalIndexes.has(i) ? '' : ' is-blink'
      return `
    <div class="goal-item" data-goal-index="${i}">
      <div class="goal-icon" style="background: rgba(45, 90, 61, 0.3);">${icons[g.time_type] || '🎯'}</div>
      <div class="goal-content">
        <div class="goal-title">${g.title}</div>
        <div class="goal-period">${TIME_LABELS[g.time_type]} | ${PERIOD_LABELS[g.period]}</div>
      </div>
      <div class="goal-actions">
        <button type="button" class="goal-reward-btn${blinkClass}" onclick="openGoalRewardPack('${g.time_type}', ${i})">奖励礼包</button>
        <button type="button" class="goal-delete" onclick="deleteGoal(${i})">×</button>
      </div>
    </div>`
    })
    .join('')
  syncTimeTypeTags()
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderPhraseChips(listEl, phrases, removeFnName) {
  if (!listEl) return
  if (!phrases.length) {
    listEl.innerHTML = ''
    return
  }
  listEl.innerHTML = phrases
    .map(
      (p, i) => `
    <div class="encourage-phrase-chip">
      <span class="encourage-phrase-text">${escapeHtml(p)}</span>
      <button type="button" class="encourage-phrase-remove" onclick="${removeFnName}(${i})" aria-label="移除这句">×</button>
    </div>`
    )
    .join('')
}

function syncEncourageModeUi() {
  const form = document.querySelector('.daily-goal-form')
  if (!form) return
  form.dataset.encourageMode = encourageMode

  form.querySelectorAll('#encourageModeOptions .period-btn').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.mode === encourageMode)
  })

  form.querySelector('#encourageSingleBlock')?.classList.toggle('hidden', encourageMode !== 'single')
  form.querySelector('#encouragePoolBlock')?.classList.toggle('hidden', encourageMode !== 'pool')
  form.querySelector('#encourageAiBlock')?.classList.toggle('hidden', encourageMode !== 'ai')

  renderPhraseChips(
    form.querySelector('#encouragePhraseList'),
    encouragePoolPhrases,
    'removeEncouragePhrase'
  )
  renderPhraseChips(
    form.querySelector('#encourageAiPhraseList'),
    encourageAiPhrases,
    'removeAiEncouragePhrase'
  )
}

function defaultEncourageDraft() {
  return {
    mode: 'single',
    singleText: '',
    poolPhrases: [],
    aiPhrases: [],
    remindTime: '07:00',
    deliverMode: 'text',
    voicePersona: 'sister',
    repeatDays: [1, 2, 3, 4, 5],
    holidaySkip: false,
    smartEnabled: true,
  }
}

const TIME_WHEEL_ITEM_H = 32
const TIME_WHEEL_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

function pad2(n) {
  return String(n).padStart(2, '0')
}

function normalizeWheelTime(raw) {
  const m = String(raw || '07:00').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return '07:00'
  const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)))
  let mm = Math.min(59, Math.max(0, parseInt(m[2], 10)))
  mm = Math.round(mm / 5) * 5
  if (mm >= 60) mm = 55
  return `${pad2(hh)}:${pad2(mm)}`
}

function buildTimeWheelCol(col, values) {
  if (!col || col.dataset.ready === '1') return
  const frag = document.createDocumentFragment()
  const top = document.createElement('div')
  top.className = 'time-wheel__spacer'
  frag.appendChild(top)
  values.forEach((v) => {
    const item = document.createElement('div')
    item.className = 'time-wheel__item'
    item.dataset.value = pad2(v)
    item.textContent = pad2(v)
    frag.appendChild(item)
  })
  const bottom = document.createElement('div')
  bottom.className = 'time-wheel__spacer'
  frag.appendChild(bottom)
  col.appendChild(frag)
  col.dataset.ready = '1'
}

function getColSelectedValue(col) {
  if (!col) return '00'
  const idx = Math.round(col.scrollTop / TIME_WHEEL_ITEM_H)
  const items = [...col.querySelectorAll('.time-wheel__item')]
  const item = items[Math.max(0, Math.min(items.length - 1, idx))]
  return item?.dataset.value || '00'
}

function syncColActiveItem(col) {
  if (!col) return
  const value = getColSelectedValue(col)
  col.querySelectorAll('.time-wheel__item').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.value === value)
  })
}

function syncEncourageTimeDisplay(time) {
  const display = document.getElementById('encourageTimeDisplay')
  if (display) display.textContent = time
}

function syncEncourageTimeInputFromWheel() {
  const hourCol = document.getElementById('encourageHourCol')
  const minuteCol = document.getElementById('encourageMinuteCol')
  const input = document.getElementById('encourageTimeInput')
  const wheel = document.getElementById('encourageTimeWheel')
  if (!hourCol || !minuteCol || !input) return
  const time = `${getColSelectedValue(hourCol)}:${getColSelectedValue(minuteCol)}`
  input.value = time
  if (wheel) wheel.dataset.time = time
  syncEncourageTimeDisplay(time)
  syncColActiveItem(hourCol)
  syncColActiveItem(minuteCol)
}

function scrollColToValue(col, value, smooth = false) {
  if (!col) return
  const item = col.querySelector(`.time-wheel__item[data-value="${pad2(value)}"]`)
  if (!item) return
  const items = [...col.querySelectorAll('.time-wheel__item')]
  const idx = items.indexOf(item)
  if (idx < 0) return
  col.scrollTo({
    top: idx * TIME_WHEEL_ITEM_H,
    behavior: smooth ? 'smooth' : 'auto',
  })
  syncColActiveItem(col)
}

function setEncourageTimeWheel(time, { smooth = false } = {}) {
  const normalized = normalizeWheelTime(time)
  const [hh, mm] = normalized.split(':')
  const input = document.getElementById('encourageTimeInput')
  const wheel = document.getElementById('encourageTimeWheel')
  if (input) input.value = normalized
  if (wheel) wheel.dataset.time = normalized
  syncEncourageTimeDisplay(normalized)
  scrollColToValue(document.getElementById('encourageHourCol'), hh, smooth)
  scrollColToValue(document.getElementById('encourageMinuteCol'), mm, smooth)
}

function openEncourageTimePicker() {
  const panel = document.getElementById('encourageTimeWheelPanel')
  const btn = document.getElementById('encourageTimeDisplayBtn')
  if (!panel) return
  panel.classList.remove('hidden')
  btn?.classList.add('is-open')
  const current = document.getElementById('encourageTimeInput')?.value || '07:00'
  requestAnimationFrame(() => setEncourageTimeWheel(current))
}

function closeEncourageTimePicker() {
  syncEncourageTimeInputFromWheel()
  document.getElementById('encourageTimeWheelPanel')?.classList.add('hidden')
  document.getElementById('encourageTimeDisplayBtn')?.classList.remove('is-open')
}

function bindTimeWheelCol(col) {
  if (!col || col.dataset.bound === '1') return
  let timer = null
  const onScroll = () => {
    syncColActiveItem(col)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const value = getColSelectedValue(col)
      scrollColToValue(col, value, true)
      syncEncourageTimeInputFromWheel()
    }, 80)
  }
  col.addEventListener('scroll', onScroll, { passive: true })
  col.dataset.bound = '1'
}

function initEncourageTimeWheel() {
  const hourCol = document.getElementById('encourageHourCol')
  const minuteCol = document.getElementById('encourageMinuteCol')
  if (!hourCol || !minuteCol) return
  buildTimeWheelCol(
    hourCol,
    Array.from({ length: 24 }, (_, i) => i)
  )
  buildTimeWheelCol(minuteCol, TIME_WHEEL_MINUTES)
  bindTimeWheelCol(hourCol)
  bindTimeWheelCol(minuteCol)
  const initial = document.getElementById('encourageTimeInput')?.value || '07:00'
  requestAnimationFrame(() => setEncourageTimeWheel(initial))
}

function syncEncourageSaveButton() {
  const addBtn = document.getElementById('addEncourageBtn')
  if (!addBtn) return
  addBtn.textContent = pendingReminders.length
    ? '✓ 更新每日鼓励'
    : '+ 保存每日鼓励'
}

function readEncourageFormDraft() {
  syncEncourageTimeInputFromWheel()
  const form = document.querySelector('.daily-goal-form')
  const selectedDays = [...(form?.querySelectorAll('.repeat-option.selected') || [])]
    .map((el) => {
      const name = el.textContent.trim()
      return Object.entries(DAY_NAME_BY_NUM).find(([, v]) => v === name)?.[0]
    })
    .map((n) => parseInt(n, 10))
    .filter(Boolean)
  const switches = form?.querySelectorAll('.switch-row .switch') || []
  return {
    mode: encourageMode,
    singleText: form?.querySelector('#encourageSingleInput')?.value?.trim() || '',
    poolPhrases: [...encouragePoolPhrases],
    aiPhrases: [...encourageAiPhrases],
    remindTime: form?.querySelector('#encourageTimeInput')?.value || '07:00',
    deliverMode:
      form?.querySelector('#encourageDeliverModeOptions')?.dataset.deliverMode === 'voice'
        ? 'voice'
        : 'text',
    voicePersona:
      form?.querySelector('#encourageDeliverModeOptions')?.dataset.voicePersona === 'brother'
        ? 'brother'
        : 'sister',
    repeatDays: selectedDays.length ? selectedDays : [1, 2, 3, 4, 5],
    holidaySkip: switches[0]?.classList.contains('active') || false,
    smartEnabled: switches[1]?.classList.contains('active') ?? true,
  }
}

function applyEncourageFormDraft(draft) {
  const form = document.querySelector('.daily-goal-form')
  if (!form || !draft) return
  encourageMode = draft.mode || 'single'
  encouragePoolPhrases = [...(draft.poolPhrases || [])]
  encourageAiPhrases = [...(draft.aiPhrases || [])]
  const single = form.querySelector('#encourageSingleInput')
  if (single) single.value = draft.singleText || ''
  const poolInput = form.querySelector('#encouragePoolInput')
  if (poolInput) poolInput.value = ''
  document.getElementById('encourageTimeWheelPanel')?.classList.add('hidden')
  document.getElementById('encourageTimeDisplayBtn')?.classList.remove('is-open')
  setEncourageTimeWheel(draft.remindTime || '07:00')
  window.setEncourageDeliverMode?.(draft.deliverMode || 'text', {
    voicePersona: draft.voicePersona || 'sister',
  })

  const daySet = new Set(draft.repeatDays || [1, 2, 3, 4, 5])
  form.querySelectorAll('.repeat-option').forEach((el) => {
    const name = el.textContent.trim()
    const num = Object.entries(DAY_NAME_BY_NUM).find(([, v]) => v === name)?.[0]
    el.classList.toggle('selected', daySet.has(parseInt(num, 10)))
  })
  const switches = form.querySelectorAll('.switch-row .switch')
  switches[0]?.classList.toggle('active', !!draft.holidaySkip)
  switches[1]?.classList.toggle('active', draft.smartEnabled !== false)
  syncEncourageModeUi()
}

function reminderToEncourageDraft(reminder) {
  const decoded = decodeEncourageTitle(reminder.title)
  return {
    mode: decoded.mode || 'single',
    singleText: decoded.mode === 'single' ? decoded.phrases[0] || '' : '',
    poolPhrases: decoded.mode === 'pool' ? [...decoded.phrases] : [],
    aiPhrases: decoded.mode === 'ai' ? [...decoded.phrases] : [],
    remindTime: reminder.remind_time || '07:00',
    deliverMode: reminder.deliver_mode === 'voice' ? 'voice' : 'text',
    voicePersona: reminder.voice_persona === 'brother' ? 'brother' : 'sister',
    repeatDays: String(reminder.repeat_days || '1,2,3,4,5')
      .split(',')
      .map((n) => parseInt(n, 10))
      .filter(Boolean),
    holidaySkip: !!reminder.holiday_skip,
    smartEnabled: reminder.smart_enabled !== false,
  }
}

function resetEncourageForm() {
  applyEncourageFormDraft(defaultEncourageDraft())
}

function renderReminderList() {
  const box = document.getElementById('reminderList')
  if (!box) return
  if (pendingReminders.length === 0) {
    box.innerHTML = ''
    syncEncourageSaveButton()
    return
  }
  box.innerHTML = pendingReminders
    .map((r, i) => {
      const decoded = decodeEncourageTitle(r.title)
      const deliverLabel =
        r.deliver_mode === 'voice'
          ? r.voice_persona === 'brother'
            ? '弟弟语音'
            : '潇洒姐语音'
          : '文字'
      const randomHint = decoded.mode === 'single' ? '' : ' · 每天随机一句'
      const subtitle = `${r.remind_time} · ${deliverLabel}${randomHint}`
      const preview =
        decoded.mode === 'single'
          ? ''
          : decoded.preview
            ? `<div class="goal-period encourage-preview">例如：${escapeHtml(decoded.preview)}</div>`
            : ''
      return `
    <div class="goal-item">
      <div class="goal-icon" style="background: rgba(212, 185, 106, 0.2);">${decoded.mode === 'ai' ? '✨' : '💓'}</div>
      <div class="goal-content">
        <div class="goal-title">${escapeHtml(decoded.display)}</div>
        <div class="goal-period">${subtitle}</div>
        ${preview}
      </div>
      <button class="goal-delete" onclick="event.stopPropagation();deleteReminder(${i})">×</button>
    </div>`
    })
    .join('')
  syncEncourageSaveButton()
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
      <span class="understanding-tag">${TIME_LABELS[u.primary_time_type] || '主星球'}</span>
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
    <div class="daily-tasks-title">📋 每日行动建议</div>
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

function resolvePrimaryPlanet(data, fallbackGoal = '') {
  const fromUnderstanding = data?.goal_understanding?.primary_time_type
  if (VALID_PLANETS.includes(fromUnderstanding)) {
    return fromUnderstanding
  }
  const fromPhase = data?.phases?.[0]?.time_type
  if (VALID_PLANETS.includes(fromPhase)) {
    return fromPhase
  }
  return inferPrimaryPlanetFromGoal(
    fallbackGoal || data?.goal_understanding?.summary || ''
  )
}

function syncEncourageAreaVisibility() {
  const area = document.getElementById('encourageArea')
  if (!area) return
  if (goalStatus === 'has-plan') {
    area.classList.remove('hidden')
    return
  }
  // 愿望路径：生成计划后才展示鼓励设置
  const previewReady =
    !!aiPhases.length ||
    !document.getElementById('planPreview')?.classList.contains('hidden')
  area.classList.toggle('hidden', !previewReady)
}

async function refreshSavedPlansCard() {
  const card = document.getElementById('savedPlansCard')
  const listEl = document.getElementById('savedPlansList')
  if (!card || !listEl) return
  try {
    const { data } = await api.get('/plans')
    const plans = data?.plans || []
    if (!plans.length) {
      card.classList.add('hidden')
      listEl.innerHTML = ''
      return
    }
    listEl.innerHTML = plans
      .map((p, idx) => {
        const title = p.core_goal || `计划 ${idx + 1}`
        const meta = p.is_active ? '当前聚焦' : `含 ${p.phase_count || 0} 个阶段`
        return `
        <div class="saved-plan-item${p.is_active ? ' is-active' : ''}">
          <div class="saved-plan-index">${idx + 1}</div>
          <div class="saved-plan-body">
            <div class="saved-plan-title">${escapeHtml(title)}</div>
            <div class="saved-plan-meta">${escapeHtml(meta)}</div>
          </div>
        </div>`
      })
      .join('')
    card.classList.remove('hidden')
  } catch {
    // 列表失败不影响主流程
  }
}

function applyAiBundle(data, fallbackGoal = '') {
  const primary = resolvePrimaryPlanet(data, fallbackGoal)
  goalUnderstanding = {
    ...(data.goal_understanding || {}),
    primary_time_type: primary,
  }
  aiPhases = (data.phases || []).map((p) => ({
    ...p,
    time_type: primary,
    action: normalizeActionForPlanet(p.action, primary),
  }))
  pendingDailyTasks = (data.daily_tasks || []).map((t) => ({ ...t, time_type: primary }))
  pendingGoals = aiPhases.map((p, i) => ({
    time_type: primary,
    period: phaseToPeriod(i),
    phase_label: p.period || '',
    title: p.goal,
    action: p.action || '',
  }))
  renderGoalUnderstanding(data.source)
  renderAiPreview(aiPhases)
  renderDailyTasksPreview()
  syncEncourageAreaVisibility()
  const area = document.getElementById('encourageArea')
  if (area && goalStatus === 'no-plan') {
    setTimeout(() => {
      area.scrollIntoView({ behavior: 'smooth', block: 'start' })
      showToast('路径已生成，接着设置每日爱的鼓励吧')
    }, 280)
  }
}

function syncPhasesToGoals() {
  const primary =
    (VALID_PLANETS.includes(goalUnderstanding?.primary_time_type)
      ? goalUnderstanding.primary_time_type
      : null) ||
    (VALID_PLANETS.includes(aiPhases[0]?.time_type) ? aiPhases[0].time_type : null) ||
    inferPrimaryPlanetFromGoal(goalUnderstanding?.summary || '')
  pendingGoals = aiPhases.map((p, i) => ({
    time_type: primary,
    period: phaseToPeriod(i),
    phase_label: p.period || '',
    title: p.goal,
    action: normalizeActionForPlanet(p.action, primary),
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
  const primary =
    (VALID_PLANETS.includes(goalUnderstanding?.primary_time_type)
      ? goalUnderstanding.primary_time_type
      : null) ||
    (VALID_PLANETS.includes(phases?.[0]?.time_type) ? phases[0].time_type : null) ||
    'money'
  aiPhases = (phases || []).map((p) => ({
    ...p,
    time_type: primary,
    action: normalizeActionForPlanet(p.action, primary),
  }))
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
        <div class="timeline-period">${escapeAttr(p.period)}</div>
        <div class="timeline-goal">${escapeAttr(p.goal)}</div>
        <div class="timeline-action">${escapeAttr(p.action)}</div>
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
  pendingDailyTasks = []
  aiPhases = []
  goalUnderstanding = null
  previewEditMode = false
  encourageMode = 'single'
  encouragePoolPhrases = []
  encourageAiPhrases = []

  try {
    renderGoalList()
    showPersonalityTag()
    syncEncourageModeUi()
    syncEncourageSaveButton()
    initEncourageTimeWheel()
  } catch (err) {
    console.warn('plan-create render failed', err)
  }

  const pageRoot = document.querySelector('.legacy-page--plan-create')
  try {
    bindRepeatOptionClicks(pageRoot?.querySelector('.daily-goal-form'))
    const poolInput = pageRoot?.querySelector('#encouragePoolInput')
    poolInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        window.addEncouragePhrase()
      }
    })
  } catch (err) {
    console.warn('bind reminder form failed', err)
  }

  const addDailyBtn = pageRoot?.querySelector('#addEncourageBtn')
  addDailyBtn?.addEventListener('click', () => window.addDailyReminder())

  pageRoot?.querySelector('#aiDurationOptions')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.period-btn')
    if (!btn) return
    pageRoot.querySelectorAll('#aiDurationOptions .period-btn').forEach((el) => el.classList.remove('selected'))
    btn.classList.add('selected')
    aiDuration = btn.dataset.duration || btn.textContent.trim()
  })

  pageRoot?.querySelector('#aiDailyBudgetOptions')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.period-btn')
    if (!btn) return
    pageRoot
      .querySelectorAll('#aiDailyBudgetOptions .period-btn')
      .forEach((el) => el.classList.remove('selected'))
    btn.classList.add('selected')
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
      renderGoalList()
      syncTimeTypeTags()
    } else {
      document.getElementById('has-plan-area')?.classList.add('hidden')
      document.getElementById('no-plan-area')?.classList.remove('hidden')
      document.getElementById('no-plan-area')?.classList.add('fade-in')
      pendingGoals = []
      rewardSeenGoalIndexes.clear()
      renderGoalList()
    }
    syncEncourageAreaVisibility()
  }

  let handbookBound = false

  const syncHandbookUi = () => {
    const bindStep = document.getElementById('handbookStepBind')
    const bindStatus = document.getElementById('handbookBindStatus')
    const uploadHint = document.getElementById('handbookUploadHint')
    const uploadBtn = document.getElementById('handbookUploadBtn')
    if (handbookBound) {
      bindStep?.classList.add('is-done')
      if (bindStatus) bindStatus.textContent = '已轻轻绑定'
      if (uploadHint) uploadHint.textContent = '可以拍照或从相册上传啦'
      if (uploadBtn) uploadBtn.disabled = false
    } else {
      bindStep?.classList.remove('is-done')
      if (bindStatus) bindStatus.textContent = '还没绑定哦'
      if (uploadHint) uploadHint.textContent = '绑定后就可以上传啦'
      if (uploadBtn) uploadBtn.disabled = true
    }
  }

  const setScanBusy = (busy) => {
    document.getElementById('handbookSteps')?.classList.toggle('is-scanning', busy)
    document.getElementById('handbookStepUpload')?.classList.toggle('is-busy', busy)
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

  window.bindHandbookQr = async () => {
    try {
      const { isNativeApp, pickImage } = await import('../../utils/camera.js')
      // 扫码绑定：先打开相机对准手册背面二维码（正式环境可接条码 SDK）
      if (isNativeApp()) {
        const path = await pickImage('camera')
        if (!path) return
      } else {
        const file = await pickFileViaInput('image/*', 'environment')
        if (!file) return
      }
      handbookBound = true
      syncHandbookUi()
      alert('身份绑定成功，可以上传效率手册内容了')
    } catch (e) {
      if (String(e?.message || e).includes('cancelled') || e?.message === 'User cancelled photos app') {
        return
      }
      // 开发预览无相机时，允许直接完成绑定以便联调后续流程
      if (confirm('无法打开相机扫码。是否以测试模式完成身份绑定？')) {
        handbookBound = true
        syncHandbookUi()
      } else if (e?.message) {
        alert(e.message)
      }
    }
  }

  window.simulateScan = () => {
    if (!handbookBound) {
      alert('请先完成第一步：扫一扫手册背面二维码进行身份绑定')
      return
    }
    document.getElementById('scanSheetOverlay')?.classList.remove('hidden')
  }

  window.pickScanSource = async (source) => {
    closeScanSheet()
    if (!handbookBound) {
      alert('请先完成身份绑定')
      return
    }
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
      }
    } catch (e) {
      if (String(e?.message || e).includes('cancelled') || e?.message === 'User cancelled photos app') {
        return
      }
      alert(e?.message || '无法打开选择器，请检查相机/相册权限后重试')
    }
  }

  syncHandbookUi()

  let goalInputMode = 'voice'
  let goalSpeechRecognition = null

  function stopGoalSpeechRecognition() {
    try {
      goalSpeechRecognition?.stop?.()
    } catch {
      /* ignore */
    }
    goalSpeechRecognition = null
    document.getElementById('goalModeVoice')?.classList.remove('is-listening')
  }

  function updateGoalModeHint() {
    const hint = document.getElementById('goalModeHint')
    const input = document.getElementById('goalInput')
    if (!hint || !input) return
    if (goalInputMode === 'voice') {
      input.placeholder = '请温柔地说出你的计划...'
      hint.textContent = '想说就说，点麦克风，我听着'
    } else {
      input.placeholder = '轻轻写下你的计划...'
      hint.textContent = '已选文字输入，慢慢写就好'
    }
  }

  function startGoalSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const input = document.getElementById('goalInput')
    const voiceBtn = document.getElementById('goalModeVoice')
    if (!SpeechRecognition) {
      alert('当前环境不支持语音识别，请改用文字输入')
      window.setGoalInputMode('text')
      return
    }
    stopGoalSpeechRecognition()
    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => voiceBtn?.classList.add('is-listening')
    recognition.onend = () => {
      voiceBtn?.classList.remove('is-listening')
      goalSpeechRecognition = null
    }
    recognition.onerror = () => {
      voiceBtn?.classList.remove('is-listening')
      goalSpeechRecognition = null
      alert('没有听清，请再说一次或改用文字输入')
    }
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript?.trim()
      if (text && input) {
        input.value = text
        input.focus()
      }
    }
    goalSpeechRecognition = recognition
    recognition.start()
  }

  window.setGoalInputMode = (mode) => {
    goalInputMode = mode === 'text' ? 'text' : 'voice'
    document.getElementById('goalModeVoice')?.classList.toggle('is-active', goalInputMode === 'voice')
    document.getElementById('goalModeText')?.classList.toggle('is-active', goalInputMode === 'text')
    updateGoalModeHint()

    if (goalInputMode === 'text') {
      stopGoalSpeechRecognition()
      document.getElementById('goalInput')?.focus()
      return
    }

    // 语音模式：再次点击麦克风开始识别
    startGoalSpeechRecognition()
  }

  updateGoalModeHint()

  const DEFAULT_REWARD_PACK = {
    survival: [
      { icon: '🎟️', name: '线下训练营200元抵扣券', desc: '完成本期目标可获得' },
      { icon: '🎓', name: '线上课限时3天体验券', desc: '点亮星球后开启礼包可抽得' },
    ],
    money: [
      { icon: '🧩', name: '赚钱星球能量碎片 ×1', desc: '完成本期目标可获得' },
      { icon: '🏕️', name: '线下训练营9折折扣券', desc: '点亮星球后开启礼包可抽得' },
    ],
    beauty: [
      { icon: '🧩', name: '好看星球能量碎片 ×1', desc: '完成本期目标可获得' },
      { icon: '🎓', name: '线上课限时3天体验券', desc: '点亮星球后开启礼包可抽得' },
    ],
    fun: [
      { icon: '🧩', name: '好玩星球能量碎片 ×1', desc: '完成本期目标可获得' },
      { icon: '🏕️', name: '线下训练营9折折扣券', desc: '点亮星球后开启礼包可抽得' },
    ],
    flow: [
      { icon: '🧩', name: '心流星球能量碎片 ×1', desc: '完成本期目标可获得' },
      { icon: '🎓', name: '线上课限时3天体验券', desc: '点亮星球后开启礼包可抽得' },
    ],
  }

  let packRewardsCache = []

  function escapeRewardText(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function renderRewardPackItems(items, emptyText) {
    if (!items?.length) {
      return emptyText
        ? `<div class="reward-pack-empty">${escapeRewardText(emptyText)}</div>`
        : ''
    }
    return items
      .map(
        (item) => `
      <div class="reward-pack-item">
        <div class="reward-pack-icon">${item.icon || '🎁'}</div>
        <div class="reward-pack-info">
          <div class="reward-pack-name">${escapeRewardText(item.name)}</div>
          <div class="reward-pack-desc">${escapeRewardText(item.desc || '')}</div>
        </div>
        ${item.tag ? `<div class="reward-pack-tag">${escapeRewardText(item.tag)}</div>` : ''}
      </div>`
      )
      .join('')
  }

  async function refreshRewardPackCustomList() {
    const customList = document.getElementById('rewardPackCustomList')
    if (!customList) return
    try {
      if (!packRewardsCache.length) {
        const { data } = await api.get('/home/dashboard')
        packRewardsCache = data?.rewards || []
      }
    } catch {
      packRewardsCache = []
    }
    const custom = packRewardsCache.map((r) => ({
      icon: '✨',
      name: r.name,
      desc: r.description || '悦己奖励',
      tag: r.status === 'locked' ? '待解锁' : '已解锁',
    }))
    customList.innerHTML = renderRewardPackItems(custom, '暂无悦己奖励，可在下方添加')
  }

  function buildPackRewardConditionText() {
    const type = document.getElementById('packRewardConditionType')?.value || 'completion_rate'
    const raw = document.getElementById('packRewardConditionValue')?.value
    const value = Number.parseInt(String(raw || ''), 10)
    if (!Number.isFinite(value) || value <= 0) return ''
    if (type === 'planet_light') return `该星球已点亮${value}次`
    return `完成率达成${Math.min(100, value)}%`
  }

  window.syncPackRewardConditionUi = () => {
    const type = document.getElementById('packRewardConditionType')?.value || 'completion_rate'
    const unit = document.getElementById('packRewardConditionUnit')
    const input = document.getElementById('packRewardConditionValue')
    if (unit) unit.textContent = type === 'planet_light' ? '次' : '%'
    if (input) {
      input.max = type === 'planet_light' ? '99' : '100'
      input.placeholder = 'XX'
    }
  }

  window.closeRewardPackModal = () => {
    document.getElementById('rewardPackModalOverlay')?.classList.add('hidden')
  }

  window.openGoalRewardPack = async (type, goalIndex) => {
    if (Number.isInteger(goalIndex)) {
      rewardSeenGoalIndexes.add(goalIndex)
      document
        .querySelector(`.goal-item[data-goal-index="${goalIndex}"] .goal-reward-btn`)
        ?.classList.remove('is-blink')
    }
    const titleEl = document.getElementById('rewardPackModalTitle')
    const defaultList = document.getElementById('rewardPackDefaultList')
    if (titleEl) titleEl.textContent = '完成即可得奖励礼包'
    if (defaultList) {
      defaultList.innerHTML = renderRewardPackItems(
        DEFAULT_REWARD_PACK[type] || DEFAULT_REWARD_PACK.survival,
        '暂无随机奖励',
      )
    }
    packRewardsCache = []
    await refreshRewardPackCustomList()
    window.syncPackRewardConditionUi()
    document.getElementById('rewardPackModalOverlay')?.classList.remove('hidden')
  }

  const SHOP_PICK_APPS = {
    taobao: {
      appUrl: 'taobao://',
      webUrl: 'https://m.taobao.com/',
    },
    dewu: {
      appUrl: 'dewuapp://',
      webUrl: 'https://m.dewu.com/',
    },
    smzdm: {
      appUrl: 'smzdm://',
      webUrl: 'https://m.smzdm.com/',
    },
  }

  window.openShopPick = (shop) => {
    const cfg = SHOP_PICK_APPS[shop]
    if (!cfg) return
    const startedAt = Date.now()
    try {
      window.location.href = cfg.appUrl
    } catch {
      window.open(cfg.webUrl, '_blank', 'noopener,noreferrer')
      return
    }
    window.setTimeout(() => {
      if (Date.now() - startedAt < 1800) {
        window.open(cfg.webUrl, '_blank', 'noopener,noreferrer')
      }
    }, 900)
  }

  window.addPackReward = async () => {
    const name = document.getElementById('packRewardName')?.value?.trim()
    const desc = document.getElementById('packRewardDesc')?.value?.trim()
    const condition = buildPackRewardConditionText()
    if (!name) {
      alert('请输入奖励名称')
      return
    }
    if (!condition) {
      alert('请填写达成标准中的数值 XX')
      return
    }
    try {
      const description = [condition, desc].filter(Boolean).join(' · ') || '悦己奖励'
      await api.post('/rewards', { name, description })
      packRewardsCache = []
      await refreshRewardPackCustomList()
      const nameInput = document.getElementById('packRewardName')
      const descInput = document.getElementById('packRewardDesc')
      const valueInput = document.getElementById('packRewardConditionValue')
      if (nameInput) nameInput.value = ''
      if (descInput) descInput.value = ''
      if (valueInput) valueInput.value = ''
      window.syncPackRewardConditionUi()
    } catch (err) {
      alert(err.response?.data?.detail || '添加奖励失败，请稍后重试')
    }
  }

  document.getElementById('rewardPackModalOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'rewardPackModalOverlay') window.closeRewardPackModal()
  })

  window.selectTimeType = (type) => {
    document.querySelectorAll('#has-plan-area .time-type-tag').forEach((el) => {
      el.classList.toggle('selected', el.dataset.type === type)
    })
    syncTimeTypeTags()
  }

  window.selectPeriod = () => {
    document.querySelectorAll('#has-plan-area .period-btn').forEach((el) => el.classList.remove('selected'))
    event.target.classList.add('selected')
  }

  window.addGoal = () => {
    const input = document.getElementById('goalInput')
    const timeType = getSelectedTimeType()
    if (!timeType) {
      alert('先选一颗想点亮的星球吧')
      return
    }
    if (!input?.value.trim()) {
      alert('把想对自己说的计划写下来吧')
      return
    }
    pendingGoals.push({
      time_type: timeType,
      period: getSelectedPeriod(),
      title: input.value.trim(),
    })
    renderGoalList()
    input.value = ''
  }

  window.deleteGoal = (index) => {
    pendingGoals.splice(index, 1)
    const nextSeen = new Set()
    rewardSeenGoalIndexes.forEach((i) => {
      if (i < index) nextSeen.add(i)
      else if (i > index) nextSeen.add(i - 1)
    })
    rewardSeenGoalIndexes.clear()
    nextSeen.forEach((i) => rewardSeenGoalIndexes.add(i))
    renderGoalList()
  }

  syncTimeTypeTags()

  let encourageInputMode = 'voice'
  let encourageSpeechRecognition = null

  function getActiveEncourageInput() {
    if (encourageMode === 'pool') return document.getElementById('encouragePoolInput')
    return document.getElementById('encourageSingleInput')
  }

  function getEncourageVoiceButtons() {
    return [
      document.getElementById('encourageModeVoice'),
      document.getElementById('encouragePoolModeVoice'),
    ].filter(Boolean)
  }

  function stopEncourageSpeechRecognition() {
    try {
      encourageSpeechRecognition?.stop?.()
    } catch {
      /* ignore */
    }
    encourageSpeechRecognition = null
    getEncourageVoiceButtons().forEach((btn) => btn.classList.remove('is-listening'))
  }

  function updateEncourageModeHint() {
    const hints = [
      document.getElementById('encourageModeHint'),
      document.getElementById('encouragePoolModeHint'),
    ].filter(Boolean)
    const single = document.getElementById('encourageSingleInput')
    const pool = document.getElementById('encouragePoolInput')
    if (encourageInputMode === 'voice') {
      if (single) single.placeholder = '例如：今天也值得被温柔对待'
      if (pool) pool.placeholder = '说出一句，回车或点添加'
      hints.forEach((el) => {
        el.textContent = '想说就说，点麦克风，我听着'
      })
    } else {
      if (single) single.placeholder = '轻轻写下想对自己说的话...'
      if (pool) pool.placeholder = '写下这句，回车或点添加'
      hints.forEach((el) => {
        el.textContent = '已选文字输入，慢慢写就好'
      })
    }
  }

  function syncEncourageInputModeButtons() {
    const voiceActive = encourageInputMode === 'voice'
    document.getElementById('encourageModeVoice')?.classList.toggle('is-active', voiceActive)
    document.getElementById('encourageModeText')?.classList.toggle('is-active', !voiceActive)
    document.getElementById('encouragePoolModeVoice')?.classList.toggle('is-active', voiceActive)
    document.getElementById('encouragePoolModeText')?.classList.toggle('is-active', !voiceActive)
    updateEncourageModeHint()
  }

  function startEncourageSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const input = getActiveEncourageInput()
    if (!SpeechRecognition) {
      showToast('当前环境不支持语音识别，请改用文字输入')
      window.setEncourageInputMode('text')
      return
    }
    stopEncourageSpeechRecognition()
    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      getEncourageVoiceButtons().forEach((btn) => {
        if (!btn.closest('.hidden')) btn.classList.add('is-listening')
      })
    }
    recognition.onend = () => {
      getEncourageVoiceButtons().forEach((btn) => btn.classList.remove('is-listening'))
      encourageSpeechRecognition = null
    }
    recognition.onerror = () => {
      getEncourageVoiceButtons().forEach((btn) => btn.classList.remove('is-listening'))
      encourageSpeechRecognition = null
      showToast('没有听清，请再说一次或改用文字输入')
    }
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript?.trim()
      if (text && input) {
        input.value = text
        input.focus()
      }
    }
    encourageSpeechRecognition = recognition
    recognition.start()
  }

  window.setEncourageInputMode = (mode) => {
    encourageInputMode = mode === 'text' ? 'text' : 'voice'
    syncEncourageInputModeButtons()

    if (encourageInputMode === 'text') {
      stopEncourageSpeechRecognition()
      getActiveEncourageInput()?.focus()
      return
    }

    if (encourageMode === 'ai') return
    startEncourageSpeechRecognition()
  }

  window.setEncourageVoicePersona = (persona) => {
    const voicePersona = persona === 'brother' ? 'brother' : 'sister'
    const box = document.getElementById('encourageDeliverModeOptions')
    if (box) box.dataset.voicePersona = voicePersona
    document.querySelectorAll('#encourageVoicePersonaOptions .period-btn').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.persona === voicePersona)
    })
  }

  window.toggleEncourageTimePicker = () => {
    const panel = document.getElementById('encourageTimeWheelPanel')
    if (!panel) return
    if (panel.classList.contains('hidden')) openEncourageTimePicker()
    else closeEncourageTimePicker()
  }

  window.closeEncourageTimePicker = () => {
    closeEncourageTimePicker()
  }

  window.setEncourageDeliverMode = (mode, options = {}) => {
    const deliverMode = mode === 'voice' ? 'voice' : 'text'
    const box = document.getElementById('encourageDeliverModeOptions')
    if (!box) return
    box.dataset.deliverMode = deliverMode
    box.querySelectorAll('.period-btn').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.mode === deliverMode)
    })
    const personaBox = document.getElementById('encourageVoicePersonaOptions')
    personaBox?.classList.toggle('hidden', deliverMode !== 'voice')
    if (options.voicePersona) {
      window.setEncourageVoicePersona(options.voicePersona)
    } else if (deliverMode === 'voice' && !box.dataset.voicePersona) {
      window.setEncourageVoicePersona('sister')
    } else if (deliverMode === 'voice') {
      window.setEncourageVoicePersona(box.dataset.voicePersona || 'sister')
    }
  }

  window.setEncourageMode = (mode) => {
    if (!['single', 'pool', 'ai'].includes(mode)) return
    stopEncourageSpeechRecognition()
    encourageMode = mode
    syncEncourageModeUi()
    syncEncourageInputModeButtons()
  }

  window.addEncouragePhrase = () => {
    const input = document.querySelector('#encouragePoolInput')
    const text = input?.value?.trim()
    if (!text) {
      showToast('先写下一句想对自己说的话吧')
      return
    }
    if (encouragePoolPhrases.includes(text)) {
      showToast('这句已经在列表里啦')
      return
    }
    if (encouragePoolPhrases.length >= 12) {
      showToast('先留这十几句就够温柔啦')
      return
    }
    encouragePoolPhrases.push(text)
    if (input) input.value = ''
    syncEncourageModeUi()
  }

  window.removeEncouragePhrase = (index) => {
    encouragePoolPhrases.splice(index, 1)
    syncEncourageModeUi()
  }

  window.removeAiEncouragePhrase = (index) => {
    encourageAiPhrases.splice(index, 1)
    syncEncourageModeUi()
  }

  window.generateEncourageByAi = async () => {
    const btn = document.querySelector('#encourageAiBtn')
    const prev = btn?.textContent || '✨ 帮我生成'
    if (btn) {
      btn.disabled = true
      btn.textContent = '伙伴书写中…'
    }
    try {
      const { data } = await api.post('/reminders/encourage-phrases', {
        time_type: ENCOURAGE_TIME_TYPE,
        count: 5,
      })
      const phrases = (data?.phrases || []).map((p) => String(p).trim()).filter(Boolean)
      if (!phrases.length) {
        showToast('这会儿有点卡，再试一次好吗')
        return
      }
      encourageAiPhrases = phrases
      syncEncourageModeUi()
      showToast(
        data?.source === 'ai'
          ? '生成好啦，每天会随机送一句'
          : '先用温柔模板陪你，也可以再点一次重写'
      )
    } catch {
      showToast('生成失败了，稍后再试一次')
    } finally {
      if (btn) {
        btn.disabled = false
        btn.textContent = prev
      }
    }
  }

  window.addDailyReminder = () => {
    syncEncourageTimeInputFromWheel()
    if (encourageMode === 'pool' && encouragePoolPhrases.length < 2) {
      showToast('多句随机至少录入两句哦')
      return
    }
    if (encourageMode === 'ai' && encourageAiPhrases.length < 2) {
      showToast('先点「帮我生成」，再添加鼓励')
      return
    }

    const reminder = readDailyReminderForm(pageRoot, {
      mode: encourageMode,
      poolPhrases: encouragePoolPhrases,
      aiPhrases: encourageAiPhrases,
      timeType: ENCOURAGE_TIME_TYPE,
    })
    if (!reminder) {
      showToast(
        encourageMode === 'single'
          ? '写下一句想对自己说的话吧'
          : '还没有可用的鼓励短句哦'
      )
      return
    }
    // 不区分星球：只保留一条每日鼓励，到设定时间发送
    pendingReminders = [reminder]
    renderReminderList()
    syncEncourageSaveButton()
    showToast('每日鼓励已保存，将在设定时间送达')
  }

  window.deleteReminder = (index) => {
    pendingReminders.splice(index, 1)
    renderReminderList()
    applyEncourageFormDraft(defaultEncourageDraft())
    syncEncourageSaveButton()
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
    const dailyTimeBudget = getSelectedDailyBudget()
    aiDuration = duration
    const weeklyHours = weeklyHoursFromBudget(dailyTimeBudget)

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
          daily_time_budget: dailyTimeBudget,
          personality,
        },
        { timeout: 120000 }
      )
      applyAiBundle(data, coreGoal)
    } catch {
      showToast('AI 生成失败，已使用本地模板预览')
      const planet = inferPrimaryPlanetFromGoal(coreGoal)
      const planetLabel = TIME_LABELS[planet]
      applyAiBundle(
        {
          goal_understanding: {
            summary: `在${duration}内围绕「${coreGoal}」建立可执行的成长节奏（每日约${dailyTimeBudget}）`,
            category: '个人成长',
            success_criteria: `完成与「${coreGoal}」直接相关的阶段性成果`,
            weekly_hours: weeklyHours,
            main_obstacle: '时间碎片化',
            primary_time_type: planet,
          },
          phases: [
            {
              period: '第1-2周 · 启动期',
              goal: `围绕「${coreGoal}」建立每日微习惯`,
              action: `${planetLabel}：按你的可支配时间轻量练习`,
              time_type: planet,
            },
            {
              period: '第3-4周 · 积累期',
              goal: '每周加练并记录一点点进步',
              action: `${planetLabel}：完成专项练习并留痕`,
              time_type: planet,
            },
            {
              period: '第2个月 · 突破期',
              goal: '完成一次可见成果输出',
              action: `${planetLabel}：做一次稍有挑战的实战`,
              time_type: planet,
            },
            {
              period: `${duration} · 绽放期`,
              goal: `达成「${coreGoal}」阶段性目标`,
              action: `${planetLabel}：复盘并固化习惯`,
              time_type: planet,
            },
          ],
          daily_tasks: [
            { title: `按每日${dailyTimeBudget}推进一点点`, time_type: planet, remind_time: '21:00' },
            { title: '用片刻时间做目标相关练习', time_type: planet, remind_time: '08:00' },
            { title: '睡前花几分钟复盘今天', time_type: planet, remind_time: '22:00' },
          ],
          source: 'template',
        },
        coreGoal
      )
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
      confirmingPlan = false
      // 保存成功后直接进首页，不再弹「计划已安放」
      showToast('计划已保存，正在进入星球')
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

  window.goHomeAfterPlan = async () => {
    document.getElementById('planSavedOverlay')?.classList.add('hidden')
    await router.replace('/home')
  }

  window.startAnotherPlan = async () => {
    document.getElementById('planSavedOverlay')?.classList.add('hidden')
    pendingGoals = []
    pendingReminders = []
    pendingDailyTasks = []
    aiPhases = []
    goalUnderstanding = null
    previewEditMode = false
    rewardSeenGoalIndexes.clear()
    encourageMode = 'single'
    encouragePoolPhrases = []
    encourageAiPhrases = []

    document.querySelectorAll('#has-plan-area textarea.input-field, #no-plan-area textarea.input-field').forEach((el) => {
      el.value = ''
    })
    const preview = document.getElementById('planPreview')
    preview?.classList.add('hidden')
    const goalsList = document.getElementById('goalsList')
    if (goalsList) goalsList.innerHTML = ''
    const remindersList = document.getElementById('reminderList')
    if (remindersList) remindersList.innerHTML = ''
    syncEncourageAreaVisibility()
    await refreshSavedPlansCard()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    showToast('之前的计划还在上方「已安放的计划」里')
  }

  const handlers = [
    'selectGoalStatus',
    'bindHandbookQr',
    'simulateScan',
    'pickScanSource',
    'closeScanSheet',
    'selectTimeType',
    'selectPeriod',
    'setGoalInputMode',
    'addGoal',
    'deleteGoal',
    'openGoalRewardPack',
    'closeRewardPackModal',
    'syncPackRewardConditionUi',
    'addPackReward',
    'openShopPick',
    'setEncourageMode',
    'setEncourageDeliverMode',
    'setEncourageVoicePersona',
    'toggleEncourageTimePicker',
    'closeEncourageTimePicker',
    'setEncourageInputMode',
    'addEncouragePhrase',
    'removeEncouragePhrase',
    'removeAiEncouragePhrase',
    'generateEncourageByAi',
    'addDailyReminder',
    'deleteReminder',
    'toggleSwitch',
    'generatePlan',
    'confirmPlan',
    'toggleEditPreview',
    'goHomeAfterPlan',
    'startAnotherPlan',
  ]

  syncEncourageInputModeButtons()
  syncEncourageAreaVisibility()
  refreshSavedPlansCard()

  return () => {
    pendingGoals = []
    pendingReminders = []
    pendingDailyTasks = []
    aiPhases = []
    goalUnderstanding = null
    previewEditMode = false
    rewardSeenGoalIndexes.clear()
    encourageMode = 'single'
    encouragePoolPhrases = []
    encourageAiPhrases = []
    encourageInputMode = 'voice'
    stopEncourageSpeechRecognition()
    stopGoalSpeechRecognition()
    handlers.forEach((name) => delete window[name])
  }
}
