import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
})

const AUTH_ALERT_KEY = 'auth_alert_shown_at'
const AUTH_ALERT_GAP = 3000

function shouldShowAuthAlert() {
  const last = Number(sessionStorage.getItem(AUTH_ALERT_KEY) || '0')
  const now = Date.now()
  if (now - last < AUTH_ALERT_GAP) {
    return false
  }
  sessionStorage.setItem(AUTH_ALERT_KEY, String(now))
  return true
}

client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const token = localStorage.getItem('token')

    // 只有“本地原本有 token，但后端仍返回 401/403”时，
    // 才认为是登录态失效；如果本来就没登录，则不要弹窗，避免死循环。
    if ((status === 401 || status === 403) && token) {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('nickname')
      localStorage.removeItem('role')

      if (shouldShowAuthAlert()) {
        alert('您还未登录，请先登录')
      }
    }

    return Promise.reject(error)
  }
)

export default client