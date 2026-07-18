import api from '../../api'

export function initWelcomeView(router) {
  window.enterApp = async () => {
    try {
      await api.post('/user/onboarding', { onboarding_step: 'personality' })
    } catch {
      /* 离线演示 */
    }

    const container = document.querySelector('.welcome-container')
    if (container) {
      container.style.transition = 'all 0.6s ease'
      container.style.opacity = '0'
      container.style.transform = 'scale(0.95)'
    }
    setTimeout(() => {
      router.push('/onboarding/wuxing-select')
    }, 600)
  }

  return () => {
    delete window.enterApp
  }
}
