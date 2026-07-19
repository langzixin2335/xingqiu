import { useUserStore } from '../../stores/user'
import { markWelcomePassed } from '../../utils/welcomeSession'

function resolveNextPath(userStore, redirect) {
  if (!userStore.isLoggedIn) {
    return redirect
      ? { path: '/auth/login', query: { redirect: String(redirect) } }
      : '/auth/login'
  }

  const step = userStore.onboardingStep
  if (step === 'done') return '/home'
  if (step === 'plan') return '/onboarding/plan-create'
  return '/onboarding/wuxing-select'
}

export function initWelcomeView(router) {
  window.enterApp = () => {
    markWelcomePassed()

    const container = document.querySelector('.welcome-container')
    if (container) {
      container.style.transition = 'all 0.6s ease'
      container.style.opacity = '0'
      container.style.transform = 'scale(0.95)'
    }

    setTimeout(() => {
      const userStore = useUserStore()
      const redirect = router.currentRoute.value.query.redirect
      router.push(resolveNextPath(userStore, redirect))
    }, 600)
  }

  return () => {
    delete window.enterApp
  }
}
