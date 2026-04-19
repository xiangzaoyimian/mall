import { useState } from 'react'
import { login } from './api/auth'
import { parseJwt } from './utils/jwt'
import './styles/login.css'

export default function LoginPage({
  onLoginSuccess,
  onGoRegister,
}: {
  onLoginSuccess?: (role?: string) => void
  onGoRegister?: () => void
}) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('123456')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setMsg('请输入用户名和密码')
      return
    }

    setLoading(true)
    setMsg('')

    try {
      const res = await login(username.trim(), password)

      if (res.code === 200) {
        const token = res.data.token

        localStorage.setItem('token', token)
        localStorage.setItem('username', username.trim())

        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true')
        } else {
          localStorage.removeItem('rememberMe')
        }

        const payload = parseJwt(token)
        const nextRole = payload?.role || ''

        if (nextRole) {
          localStorage.setItem('role', nextRole)
        } else {
          localStorage.removeItem('role')
        }

        setMsg('登录成功')

        onLoginSuccess?.(nextRole)
      } else {
        setMsg(res.msg || '登录失败')
      }
    } catch (e: unknown) {
      setMsg((e as any)?.response?.data?.msg || (e as Error)?.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleLogin()
    }
  }

  return (
    <div className="login-page">
      {/* 左侧品牌宣传区 */}
      <div className="login-brand-section">
        <div className="login-brand-content">
          <div className="login-brand-logo">
            <div className="login-brand-icon">裤</div>
            <div className="login-brand-text">
              <h1 className="login-brand-title">Pants Mall</h1>
              <p className="login-brand-subtitle">专业裤品电商平台</p>
            </div>
          </div>
          
          <div className="login-brand-slogan">
            <h2 className="login-brand-heading">智能选裤，穿出你的风格</h2>
            <p className="login-brand-description">
              基于人体数据的智能推荐，为你找到最合身的裤装。
              AI 分析身材特征，匹配最适合的款式、尺码与版型，
              让每一条裤子都像为你量身定制。
            </p>
          </div>
          
          <div className="login-brand-features">
            <div className="login-brand-feature-item">
              <span className="login-brand-feature-icon">🤖</span>
              <span className="login-brand-feature-text">AI 智能推荐</span>
            </div>
            <div className="login-brand-feature-item">
              <span className="login-brand-feature-icon">📏</span>
              <span className="login-brand-feature-text">精准尺码匹配</span>
            </div>
            <div className="login-brand-feature-item">
              <span className="login-brand-feature-icon">👕</span>
              <span className="login-brand-feature-text">多样化选择</span>
            </div>
            <div className="login-brand-feature-item">
              <span className="login-brand-feature-icon">🛡️</span>
              <span className="login-brand-feature-text">品质保证</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 右侧登录表单区 */}
      <div className="login-form-section">
        <div className="login-form-container">
          <div className="login-form-header">
            <h2 className="login-form-title">欢迎登录</h2>
            <p className="login-form-subtitle">登录后享受更多服务</p>
          </div>
          
          <div className="login-form-body">
            <div className="login-form-field">
              <label className="login-form-label">用户名</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="请输入用户名"
                className="login-form-input"
                disabled={loading}
              />
            </div>

            <div className="login-form-field">
              <div className="login-form-field-header">
                <label className="login-form-label">密码</label>
                <button
                  type="button"
                  className="login-form-forgot"
                  disabled={loading}
                >
                  忘记密码？
                </button>
              </div>
              <div className="login-form-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="请输入密码"
                  className="login-form-input login-form-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="login-form-toggle-pwd"
                  disabled={loading}
                  title={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? '👁️' : '🔒'}
                </button>
              </div>
            </div>

            <div className="login-form-options">
              <label className="login-form-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span className="login-form-checkbox-label">记住我</span>
              </label>
            </div>

            <button
              onClick={handleLogin}
              type="button"
              className="login-form-submit"
              disabled={loading}
            >
              {loading ? '登录中...' : '立即登录'}
            </button>

            {msg && (
              <div className={`login-form-message ${msg.includes('成功') ? 'success' : 'error'}`}>
                {msg}
              </div>
            )}



            <div className="login-form-footer">
              还没有账号？
              <button
                type="button"
                className="login-form-register"
                onClick={onGoRegister}
                disabled={loading}
              >
                立即注册
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}