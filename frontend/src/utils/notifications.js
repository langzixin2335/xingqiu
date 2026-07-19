import { Capacitor } from '@capacitor/core'
import api from '../api'

const DAY_MAP = { 周一: 1, 周二: 2, 周三: 3, 周四: 4, 周五: 5, 周六: 6, 周日: 7 }

const POOL_PREFIX = '__POOL__::'
const AI_PREFIX = '__AI__::'
const PHRASE_SEP = '||'

function parseRepeatDays(repeatDays) {
  if (!repeatDays) return [1, 2, 3, 4, 5]
  return repeatDays.split(',').map((n) => parseInt(n, 10)).filter(Boolean)
}

function nextTriggerDate(remindTime, weekday) {
  const [hh, mm] = remindTime.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(hh || 0, mm || 0, 0, 0)
  const currentDow = target.getDay() === 0 ? 7 : target.getDay()
  let delta = weekday - currentDow
  if (delta < 0 || (delta === 0 && target <= now)) delta += 7
  target.setDate(target.getDate() + delta)
  return target
}

async function getLocalNotifications() {
  const mod = await import('@capacitor/local-notifications')
  return mod.LocalNotifications
}

export function encodeEncourageTitle(mode, phrases) {
  const cleaned = (phrases || []).map((p) => String(p || '').trim()).filter(Boolean)
  if (!cleaned.length) return ''
  if (mode === 'pool') return `${POOL_PREFIX}${cleaned.join(PHRASE_SEP)}`
  if (mode === 'ai') return `${AI_PREFIX}${cleaned.join(PHRASE_SEP)}`
  return cleaned[0]
}

export function decodeEncourageTitle(raw) {
  const title = String(raw || '').trim()
  if (!title) return { mode: 'single', phrases: [], display: '', preview: '' }

  if (title.startsWith(POOL_PREFIX)) {
    const phrases = title
      .slice(POOL_PREFIX.length)
      .split(PHRASE_SEP)
      .map((p) => p.trim())
      .filter(Boolean)
    return {
      mode: 'pool',
      phrases,
      display: `多句随机 · 共${phrases.length}句`,
      preview: phrases[0] || '',
    }
  }

  if (title.startsWith(AI_PREFIX)) {
    const phrases = title
      .slice(AI_PREFIX.length)
      .split(PHRASE_SEP)
      .map((p) => p.trim())
      .filter(Boolean)
    return {
      mode: 'ai',
      phrases,
      display: `帮你生成 · 共${phrases.length}句`,
      preview: phrases[0] || '',
    }
  }

  return { mode: 'single', phrases: [title], display: title, preview: title }
}

export function pickEncourageBody(raw) {
  const { phrases } = decodeEncourageTitle(raw)
  if (!phrases.length) return '今天也值得被温柔对待'
  if (phrases.length === 1) return phrases[0]
  return phrases[Math.floor(Math.random() * phrases.length)]
}

export async function requestNotificationPermission() {
  if (!Capacitor.isNativePlatform()) {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    return
  }
  try {
    const LocalNotifications = await getLocalNotifications()
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions()
    }
  } catch (err) {
    console.warn('通知权限请求跳过', err)
  }
}

export async function scheduleRemindersFromApi() {
  try {
    // App 冷启动不主动弹权限，避免部分国产机 WebView 被系统杀掉
    if (!Capacitor.isNativePlatform()) return

    const LocalNotifications = await getLocalNotifications()
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return

    const { data } = await api.get('/reminders')
    if (!data?.length) return

    await LocalNotifications.cancel({ notifications: data.map((r) => ({ id: r.id })) })
    const notifications = []
    for (const reminder of data) {
      const weekdays = parseRepeatDays(reminder.repeat_days)
      for (const wd of weekdays) {
        notifications.push({
          id: reminder.id * 10 + wd,
          title: '闪耀星球 · 每日鼓励',
          body: pickEncourageBody(reminder.title),
          schedule: { at: nextTriggerDate(reminder.remind_time, wd), allowWhileIdle: true },
          sound: undefined,
        })
      }
    }
    if (notifications.length) {
      await LocalNotifications.schedule({ notifications })
    }
  } catch (err) {
    console.warn('提醒调度失败', err)
  }
}

export function bindRepeatOptionClicks(root) {
  root?.querySelectorAll('.repeat-option').forEach((el) => {
    el.addEventListener('click', () => el.classList.toggle('selected'))
  })
}

function normalizeRemindTime(raw) {
  const text = String(raw || '07:00').trim()
  const m = text.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return '07:00'
  const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)))
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)))
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function readDailyReminderForm(root, options = {}) {
  const form = root?.querySelector('.daily-goal-form')
  if (!form) return null

  const mode = options.mode || form.dataset.encourageMode || 'single'
  const poolPhrases = options.poolPhrases || []
  const aiPhrases = options.aiPhrases || []

  let title = ''
  if (mode === 'single') {
    title = encodeEncourageTitle('single', [
      form.querySelector('#encourageSingleInput')?.value?.trim() || '',
    ])
  } else if (mode === 'pool') {
    title = encodeEncourageTitle('pool', poolPhrases)
  } else if (mode === 'ai') {
    title = encodeEncourageTitle('ai', aiPhrases)
  }

  const remindTime = normalizeRemindTime(
    form.querySelector('#encourageTimeInput')?.value || '07:00'
  )
  const activePlanet =
    options.timeType ||
    form.querySelector('#encouragePlanetOptions .time-type-tag.selected')?.dataset?.type ||
    'survival'
  const timeType = ['survival', 'money', 'beauty', 'fun', 'flow'].includes(activePlanet)
    ? activePlanet
    : 'survival'
  const deliverBox = form.querySelector('#encourageDeliverModeOptions')
  const deliverModeRaw = deliverBox?.dataset.deliverMode || 'text'
  const deliverMode = deliverModeRaw === 'voice' ? 'voice' : 'text'
  const voicePersonaRaw = deliverBox?.dataset.voicePersona || 'sister'
  const voicePersona = voicePersonaRaw === 'brother' ? 'brother' : 'sister'

  const selectedDays = [...form.querySelectorAll('.repeat-option.selected')]
    .map((el) => DAY_MAP[el.textContent.trim()])
    .filter(Boolean)

  const switches = form.querySelectorAll('.switch-row .switch')
  const holidaySkip = switches[0]?.classList.contains('active') || false
  const smartEnabled = switches[1]?.classList.contains('active') ?? true

  if (!title) return null

  return {
    title,
    time_type: timeType,
    remind_time: remindTime,
    deliver_mode: deliverMode,
    voice_persona: deliverMode === 'voice' ? voicePersona : 'sister',
    repeat_days: (selectedDays.length ? selectedDays : [1, 2, 3, 4, 5]).join(','),
    holiday_skip: holidaySkip,
    smart_enabled: smartEnabled,
  }
}
