import { useState } from 'react'
import client from './api/client'
import './styles/register.css'

type Result<T> = {
  code: number
  msg: string
  data: T
}

export default function RegisterPage({
  onRegisterSuccess,
  onGoLogin,
}: {
  onRegisterSuccess?: () => void
  onGoLogin?: () => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  async function handleRegister() {
    if (!username.trim() || !password.trim()) {
      setMsg('用户名和密码不能为空')
      return
    }

    if (!agreeTerms) {
      setMsg('请阅读并同意用户协议和隐私政策')
      return
    }

    setLoading(true)
    setMsg('')

    try {
      const resp = await client.post<Result<any>>('/auth/register', {
        username: username.trim(),
        password,
        nickname: nickname.trim(),
      })

      if (resp.data.code === 200) {
        setMsg('注册成功，请登录')
        onRegisterSuccess?.()
      } else {
        setMsg(resp.data.msg || '注册失败')
      }
    } catch (e: unknown) {
      setMsg((e as any)?.response?.data?.msg || (e as Error)?.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleRegister()
    }
  }

  return (
    <div className="register-page">
      {/* 左侧品牌宣传区 */}
      <div className="register-brand-section">
        <div className="register-brand-content">
          <div className="register-brand-logo">
            <div className="register-brand-icon">裤</div>
            <div className="register-brand-text">
              <h1 className="register-brand-title">Pants Mall</h1>
              <p className="register-brand-subtitle">专业裤品电商平台</p>
            </div>
          </div>
          
          <div className="register-brand-slogan">
            <h2 className="register-brand-heading">加入我们，开启智能购物体验</h2>
            <p className="register-brand-description">
              注册账号，享受AI智能推荐、个性化购物体验、专属优惠活动，
              让每一次购物都更加便捷、高效、愉悦。
            </p>
          </div>
          
          <div className="register-brand-features">
            <div className="register-brand-feature-item">
              <span className="register-brand-feature-icon">🎁</span>
              <span className="register-brand-feature-text">新用户专享优惠</span>
            </div>
            <div className="register-brand-feature-item">
              <span className="register-brand-feature-icon">📱</span>
              <span className="register-brand-feature-text">多端同步</span>
            </div>
            <div className="register-brand-feature-item">
              <span className="register-brand-feature-icon">🔒</span>
              <span className="register-brand-feature-text">安全保障</span>
            </div>
            <div className="register-brand-feature-item">
              <span className="register-brand-feature-icon">⚡</span>
              <span className="register-brand-feature-text">快速注册</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 右侧注册表单区 */}
      <div className="register-form-section">
        <div className="register-form-container">
          <div className="register-form-header">
            <h2 className="register-form-title">创建账号</h2>
            <p className="register-form-subtitle">注册后享受更多服务</p>
          </div>
          
          <div className="register-form-body">
            <div className="register-form-field">
              <label className="register-form-label">用户名</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="请输入用户名"
                className="register-form-input"
                disabled={loading}
              />
              <p className="register-form-hint">建议使用字母、数字组合，易于记忆</p>
            </div>

            <div className="register-form-field">
              <label className="register-form-label">昵称</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="请输入昵称（可选）"
                className="register-form-input"
                disabled={loading}
              />
              <p className="register-form-hint">用于个人资料展示，可随时修改</p>
            </div>

            <div className="register-form-field">
              <label className="register-form-label">密码</label>
              <div className="register-form-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="请输入密码"
                  className="register-form-input register-form-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="register-form-toggle-pwd"
                  disabled={loading}
                  title={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? '👁️' : '🔒'}
                </button>
              </div>
              <p className="register-form-hint">密码长度建议8-20位，包含字母和数字</p>
            </div>

            <div className="register-form-options">
              <label className="register-form-checkbox">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  disabled={loading}
                />
                <span className="register-form-checkbox-label">
                  我已阅读并同意 <a href="#" className="register-form-link" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}>用户协议</a> 和 <a href="#" className="register-form-link" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }}>隐私政策</a>
                </span>
              </label>
            </div>

            <button
              onClick={handleRegister}
              type="button"
              className="register-form-submit"
              disabled={loading}
            >
              {loading ? '注册中...' : '立即注册'}
            </button>

            {msg && (
              <div className={`register-form-message ${msg.includes('成功') ? 'success' : 'error'}`}>
                {msg}
              </div>
            )}



            <div className="register-form-footer">
              已有账号？
              <button
                type="button"
                className="register-form-login"
                onClick={onGoLogin}
                disabled={loading}
              >
                去登录
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 用户协议弹窗 */}
      {showTermsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">用户协议</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowTermsModal(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-text">
                <h4>1. 协议的接受</h4>
                <p>欢迎使用Pants Mall电商平台。通过注册、登录或使用本平台，您同意遵守本用户协议的所有条款和条件。</p>
                
                <h4>2. 用户账号</h4>
                <p>您需要创建一个账号才能使用本平台的全部功能。您有责任保持账号信息的安全，不得将账号转借他人使用。</p>
                
                <h4>3. 用户行为</h4>
                <p>您在使用本平台时，不得发布违法、违规、侵权或其他不当内容，不得干扰平台的正常运行。</p>
                
                <h4>4. 知识产权</h4>
                <p>本平台的所有内容、商标、专利等知识产权均归Pants Mall所有，未经授权不得使用。</p>
                
                <h4>5. 服务变更</h4>
                <p>我们有权随时修改、暂停或终止部分或全部服务，无需事先通知。</p>
                
                <h4>6. 责任限制</h4>
                <p>我们不对因使用本平台而产生的任何直接或间接损失承担责任，除非法律另有规定。</p>
                
                <h4>7. 协议修改</h4>
                <p>我们有权随时修改本协议，修改后的协议自发布之日起生效。</p>
                
                <h4>8. 法律适用</h4>
                <p>本协议的订立、执行、解释及争议的解决均适用中华人民共和国法律。</p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn" 
                onClick={() => setShowTermsModal(false)}
                type="button"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 隐私政策弹窗 */}
      {showPrivacyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">隐私政策</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowPrivacyModal(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-text">
                <h4>1. 隐私政策的适用范围</h4>
                <p>本隐私政策适用于您使用Pants Mall平台时的个人信息收集、使用和保护。</p>
                
                <h4>2. 收集的信息</h4>
                <p>我们可能收集您的个人信息，包括但不限于：用户名、密码、昵称、联系方式、购物记录、浏览历史等。</p>
                
                <h4>3. 信息的使用</h4>
                <p>我们使用收集的信息为您提供服务、改进用户体验、处理订单、发送通知等。</p>
                
                <h4>4. 信息的保护</h4>
                <p>我们采取各种安全措施保护您的个人信息，防止信息泄露、滥用或篡改。</p>
                
                <h4>5. 信息的共享</h4>
                <p>我们不会向第三方共享您的个人信息，除非法律要求或您的明确授权。</p>
                
                <h4>6.  cookies的使用</h4>
                <p>我们使用cookies来改善您的浏览体验，您可以在浏览器设置中管理cookies。</p>
                
                <h4>7. 您的权利</h4>
                <p>您有权访问、修改或删除您的个人信息，有权拒绝我们收集某些信息。</p>
                
                <h4>8. 隐私政策的修改</h4>
                <p>我们有权随时修改本隐私政策，修改后的政策自发布之日起生效。</p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn" 
                onClick={() => setShowPrivacyModal(false)}
                type="button"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}