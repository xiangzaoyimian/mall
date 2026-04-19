import { useEffect, useState } from 'react'
import client from './api/client'

export default function AdminProfilePage() {
  const username = localStorage.getItem('username') || 'admin'
  const userRole = localStorage.getItem('role') || 'admin'

  const [profileForm, setProfileForm] = useState({
    nickname: '',
    password: '',
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  useEffect(() => {
    loadCurrentUserProfile()
  }, [])

  async function loadCurrentUserProfile() {
    setProfileLoading(true)
    try {
      const resp = await client.get('/admin/users/me')
      const data = resp?.data?.data
      if (data) {
        setProfileForm({
          nickname: data.nickname || username,
          password: '',
        })
      }
    } catch (e: any) {
      setProfileMsg('加载个人信息失败')
    } finally {
      setProfileLoading(false)
    }
  }

  async function handleUpdateProfile() {
    setProfileLoading(true)
    setProfileMsg('')
    try {
      const updateData: any = {
        nickname: profileForm.nickname,
        phone: profileForm.phone,
        email: profileForm.email,
      }
      if (profileForm.password && profileForm.password.trim()) {
        updateData.password = profileForm.password
      }
      const resp = await client.put('/admin/users/me', updateData)
      setProfileMsg(resp?.data?.msg || '个人信息更新成功')
      if (profileForm.password && profileForm.password.trim()) {
        setProfileForm({ ...profileForm, password: '' })
      }
      localStorage.setItem('username', profileForm.nickname || username)
    } catch (e: any) {
      setProfileMsg(e?.response?.data?.msg || '更新失败')
    } finally {
      setProfileLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div style={heroGlowStyle} />
        <div style={heroContentStyle}>
          <div>
            <div style={heroTagStyle}>PROFILE CENTER</div>
            <h1 style={heroTitleStyle}>个人中心</h1>
            <div style={heroDescStyle}>
              在这里您可以编辑个人信息。
            </div>
          </div>
          <div style={heroStatsWrapStyle}>
            <div style={heroStatCardStyle}>
              <div style={heroStatLabelStyle}>当前角色</div>
              <div style={heroStatValueStyle}>{userRole === 'admin' ? '管理员' : '普通用户'}</div>
            </div>
          </div>
        </div>
      </section>

      <section style={formWrapStyle}>
        <div style={profileSectionStyle}>
          <div style={profileHeaderStyle}>
            <div style={profileAvatarStyle}>👤</div>
            <div style={profileInfoStyle}>
              <div style={profileNameStyle}>{username}</div>
              <div style={profileRoleStyle}>{userRole === 'admin' ? '管理员' : '普通用户'}</div>
            </div>
          </div>

          <div style={formGridStyle}>
            <div style={fieldBlockStyle}>
              <label style={labelStyle}>用户名</label>
              <input
                value={username}
                disabled
                style={{ ...inputStyle, background: '#f8fafc', cursor: 'not-allowed' }}
              />
            </div>
            <div style={fieldBlockStyle}>
              <label style={labelStyle}>昵称</label>
              <input
                value={profileForm.nickname}
                onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })}
                placeholder="请输入昵称"
                style={inputStyle}
              />
            </div>
            <div style={fieldBlockStyle}>
              <label style={labelStyle}>新密码（留空则不修改）</label>
              <input
                type="password"
                value={profileForm.password}
                onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                placeholder="请输入新密码"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={submitRowStyle}>
            <button
              type="button"
              onClick={handleUpdateProfile}
              style={submitBtnStyle}
              disabled={profileLoading}
            >
              {profileLoading ? '保存中...' : '保存修改'}
            </button>
          </div>

          {profileMsg ? <div style={msgStyle}>{profileMsg}</div> : null}
        </div>
      </section>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 22,
}

const heroStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  display: 'grid',
  gridTemplateColumns: '1.2fr 0.8fr',
  gap: 20,
  padding: 24,
  borderRadius: 24,
  background: 'linear-gradient(135deg, #eff6ff, #ffffff 60%, #f8fafc)',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 14px 32px rgba(15,23,42,0.06)',
}

const heroGlowStyle: React.CSSProperties = {
  position: 'absolute',
  right: -60,
  top: -60,
  width: 180,
  height: 180,
  borderRadius: '50%',
  background: 'radial-gradient(rgba(37,99,235,0.14), transparent 70%)',
  pointerEvents: 'none',
}

const heroContentStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'contents',
}

const heroTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '4px 10px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
  fontSize: 11,
  fontWeight: 800,
}

const heroTitleStyle: React.CSSProperties = {
  margin: '10px 0 0',
  fontSize: 32,
  lineHeight: 1.15,
  color: '#111827',
}

const heroDescStyle: React.CSSProperties = {
  marginTop: 10,
  color: '#6b7280',
  fontSize: 14,
  lineHeight: 1.7,
  maxWidth: 600,
}

const heroStatsWrapStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 12,
  alignContent: 'center',
}

const heroStatCardStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 8px 20px rgba(15,23,42,0.04)',
}

const heroStatLabelStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: 11,
  fontWeight: 700,
}

const heroStatValueStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 20,
  fontWeight: 900,
  color: '#111827',
}

const formWrapStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 24,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 14px 32px rgba(15,23,42,0.05)',
}

const tabContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 24,
  borderBottom: '1px solid rgba(15,23,42,0.06)',
  paddingBottom: 16,
}

const tabBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 12,
  border: 'none',
  background: 'transparent',
  color: '#6b7280',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 15,
  transition: 'all 0.2s ease',
}

const tabBtnActiveStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
  color: '#fff',
  boxShadow: '0 8px 18px rgba(37,99,235,0.20)',
}

const profileSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
}

const profileHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 20,
  padding: 24,
  borderRadius: 20,
  background: 'linear-gradient(135deg, #f0f9ff, #ffffff)',
  border: '1px solid rgba(15,23,42,0.06)',
}

const profileAvatarStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 32,
  color: '#fff',
  boxShadow: '0 12px 24px rgba(37,99,235,0.20)',
}

const profileInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const profileNameStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  color: '#111827',
}

const profileRoleStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#6b7280',
}

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 20,
}

const fieldBlockStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#374151',
}

const inputStyle: React.CSSProperties = {
  height: 44,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  outline: 'none',
  transition: 'all 0.2s ease',
}

const submitRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
}

const submitBtnStyle: React.CSSProperties = {
  minWidth: 160,
  height: 46,
  padding: '0 20px',
  borderRadius: 14,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 800,
  boxShadow: '0 10px 22px rgba(37,99,235,0.18)',
  transition: 'all 0.2s ease',
}

const msgStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 14,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
  color: '#374151',
  fontSize: 14,
}
