/** 统一轻提示：App 内避免 alert（部分 Android WebView 会卡死/闪退） */
export function showToast(message, { duration = 2200 } = {}) {
  const text = String(message || '').trim() || '已完成'
  const existing = document.getElementById('app-toast')
  if (existing) existing.remove()

  const el = document.createElement('div')
  el.id = 'app-toast'
  el.textContent = text
  el.setAttribute('role', 'status')
  Object.assign(el.style, {
    position: 'fixed',
    left: '50%',
    bottom: '88px',
    transform: 'translateX(-50%)',
    zIndex: '9999',
    maxWidth: '86vw',
    padding: '12px 16px',
    borderRadius: '12px',
    background: 'rgba(20, 20, 28, 0.92)',
    color: '#f5e6b8',
    fontSize: '14px',
    lineHeight: '1.4',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    pointerEvents: 'none',
    textAlign: 'center',
  })
  document.body.appendChild(el)
  setTimeout(() => el.remove(), duration)
}

export function formatApiError(error, fallback = '请求失败，请稍后重试') {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail) return detail
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((item) => item?.msg || item?.message || JSON.stringify(item))
      .join('；')
  }
  return error?.message || fallback
}
