export const WELCOME_SESSION_KEY = 'sp_welcome_ok'

export function markWelcomePassed() {
  sessionStorage.setItem(WELCOME_SESSION_KEY, '1')
}

export function hasPassedWelcome() {
  return sessionStorage.getItem(WELCOME_SESSION_KEY) === '1'
}
