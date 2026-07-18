import { Capacitor } from '@capacitor/core'
import api from '../api'

const DAY_MAP = { 周一: 1, 周二: 2, 周三: 3, 周四: 4, 周五: 5, 周六: 6, 周日: 7 }

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
          title: '闪耀星球 · 每日提醒',
          body: reminder.title,
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

export function readDailyReminderForm(root) {
  const form = root?.querySelector('.daily-goal-form')
  if (!form) return null

  const inputs = [...form.querySelectorAll('input.input-field')]
  const title = inputs[0]?.value?.trim()
  const remindTime = normalizeRemindTime(inputs[1]?.value || '07:00')
  const typeSelect = form.querySelector('select.input-field')
  const typeText = typeSelect?.selectedOptions?.[0]?.text || '生存星球'
  const typeMap = {
    生存星球: 'survival',
    赚钱星球: 'money',
    好看星球: 'beauty',
    好玩星球: 'fun',
    心流星球: 'flow',
  }

  const selectedDays = [...form.querySelectorAll('.repeat-option.selected')]
    .map((el) => DAY_MAP[el.textContent.trim()])
    .filter(Boolean)

  const switches = form.querySelectorAll('.switch-row .switch')
  const holidaySkip = switches[0]?.classList.contains('active') || false
  const smartEnabled = switches[1]?.classList.contains('active') ?? true

  if (!title) return null

  return {
    title,
    time_type: typeMap[typeText] || 'survival',
    remind_time: remindTime,
    repeat_days: (selectedDays.length ? selectedDays : [1, 2, 3, 4, 5]).join(','),
    holiday_skip: holidaySkip,
    smart_enabled: smartEnabled,
  }
}
