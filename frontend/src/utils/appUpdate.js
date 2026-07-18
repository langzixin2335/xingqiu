import { Capacitor } from '@capacitor/core'
import api from '../api'

const SNOOZE_KEY = 'app_update_snooze_until'
const SNOOZE_MS = 24 * 60 * 60 * 1000

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

async function readLocalVersionCode() {
  try {
    const { App } = await import('@capacitor/app')
    const info = await App.getInfo()
    const code = Number.parseInt(String(info.build || ''), 10)
    if (Number.isFinite(code) && code > 0) return { code, version: info.version || '' }
  } catch {
    // 旧壳未集成 @capacitor/app 时，按首版壳处理
  }
  return { code: 1, version: '1.0' }
}

function isSnoozed() {
  const until = Number(localStorage.getItem(SNOOZE_KEY) || 0)
  return until > Date.now()
}

export function snoozeAppUpdate() {
  localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
}

export async function openUpdateUrl(url) {
  if (!url) return
  try {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
    return
  } catch {
    // 未安装 Browser 插件时走系统打开
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * 原生 App 启动时检查是否有新 APK。
 * @returns {Promise<null | { latest_version, latest_version_code, download_url, force, message, localVersion, localCode }>}
 */
export async function checkAppUpdate() {
  if (!isNativeApp()) return null

  const local = await readLocalVersionCode()
  const { data } = await api.get('/app/version')
  const latestCode = Number(data.latest_version_code) || 0
  const minCode = Number(data.min_version_code) || 1
  if (local.code >= latestCode) return null

  const force = Boolean(data.force) || local.code < minCode
  if (!force && isSnoozed()) return null

  return {
    latest_version: data.latest_version,
    latest_version_code: latestCode,
    download_url: data.download_url,
    force,
    message: data.message || '发现新版本，建议更新',
    localVersion: local.version,
    localCode: local.code,
  }
}
