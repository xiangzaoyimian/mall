import { useEffect, useState } from 'react'
import client from './api/client'

type UserItem = {
  id?: number | string
  username?: string
  nickname?: string
  phone?: string
  email?: string
  role?: string
  status?: string
  avatar?: string
  createdAt?: string
}

function formatDateText(v?: string) {
  if (!v) return '-'
  return String(v).replace('T', ' ')
}

export default function AdminProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'users'>('profile')
  const username = localStorage.getItem('username') || 'admin'
  const userRole = localStorage.getItem('role') || 'admin'

  const [profileForm, setProfileForm] = useState({
    nickname: '',
    password: '',
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  const [userList, setUserList] = useState<UserItem[]>([])
  const [userLoading, setUserLoading] = useState(false)
  const [userMsg, setUserMsg] = useState('')
  const [pageNo, setPageNo] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [editForm, setEditForm] = useState({
    nickname: '',
    role: '',
    status: '',
    password: '',
  })
  const [editLoading, setEditLoading] = useState(false)

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

  async function loadUsers() {
    setUserLoading(true)
    setUserMsg('')
    try {
      const resp = await client.get('/admin/users', {
        params: { page: pageNo, size: pageSize }
      })
      const data = resp?.data?.data
      setUserList(Array.isArray(data?.list) ? data.list : [])
      setTotal(Number(data?.total || 0))
    } catch (e: any) {
      setUserMsg(e?.response?.data?.msg || '用户列表加载失败')
    } finally {
      setUserLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers()
    }
  }, [activeTab, pageNo, pageSize])

  function handleEditUser(user: UserItem) {
    setEditingUser(user)
    setEditForm({
      nickname: user.nickname || '',
      phone: user.phone || '',
      email: user.email || '',
      role: user.role || '',
      status: user.status || '',
      password: '',
    })
  }

  async function handleUpdateUser() {
    if (!editingUser?.id) return
    setEditLoading(true)
    try {
      const updateData: any = {
        nickname: editForm.nickname,
        role: editForm.role,
        status: editForm.status,
      }
      if (editForm.password && editForm.password.trim()) {
        updateData.password = editForm.password
      }
      const resp = await client.put(`/admin/users/${editingUser.id}`, updateData)
      setUserMsg(resp?.data?.msg || '用户更新成功')
      setEditingUser(null)
      await loadUsers()
    } catch (e: any) {
      setUserMsg(e?.response?.data?.msg || '更新失败')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDeleteUser(id?: number | string) {
    if (!id) return
    const ok = window.confirm('确定删除该用户吗？')
    if (!ok) return
    try {
      const resp = await client.delete(`/admin/users/${id}`)
      setUserMsg(resp?.data?.msg || '删除成功')
      await loadUsers()
    } catch (e: any) {
      setUserMsg(e?.response?.data?.msg || '删除失败')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div style={heroGlowStyle} />
        <div style={heroContentStyle}>
          <div>
            <div style={heroTagStyle}>PROFILE CENTER</div>
            <h1 style={heroTitleStyle}>个人中心</h1>
            <div style={heroDescStyle}>
              在这里您可以编辑个人信息，查看和管理系统用户。
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
        <div style={tabContainerStyle}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              ...tabBtnStyle,
              ...(activeTab === 'profile' ? tabBtnActiveStyle : {}),
            }}
          >
            个人信息
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            style={{
              ...tabBtnStyle,
              ...(activeTab === 'users' ? tabBtnActiveStyle : {}),
            }}
          >
            用户管理
          </button>
        </div>

        {activeTab === 'profile' && (
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
        )}

        {activeTab === 'users' && (
          <div style={usersSectionStyle}>
            <div style={sectionHeadStyle}>
              <div>
                <div style={sectionKickerStyle}>USER MANAGEMENT</div>
                <h2 style={sectionTitleStyle}>用户列表</h2>
              </div>
              <button type="button" onClick={loadUsers} style={primaryBtnStyle}>
                {userLoading ? '加载中...' : '刷新列表'}
              </button>
            </div>

            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>用户ID</th>
                    <th style={thStyle}>用户名</th>
                    <th style={thStyle}>昵称</th>
                    <th style={thStyle}>角色</th>
                    <th style={thStyle}>状态</th>
                    <th style={thStyle}>注册时间</th>
                    <th style={thStyle}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.length === 0 ? (
                    <tr>
                      <td style={emptyTdStyle} colSpan={7}>
                        暂无用户数据
                      </td>
                    </tr>
                  ) : (
                    userList.map((user) => (
                      <tr key={String(user.id ?? '')}>
                        <td style={tdStyle}>{user.id ?? '-'}</td>
                        <td style={tdStyle}>{user.username ?? '-'}</td>
                        <td style={tdStyle}>{user.nickname ?? '-'}</td>
                        <td style={tdStyle}>{user.phone ?? '-'}</td>
                        <td style={tdStyle}>{user.email ?? '-'}</td>
                        <td style={tdStyle}>
                          <span style={user.role === 'admin' ? roleAdminBadgeStyle : roleUserBadgeStyle}>
                            {user.role === 'admin' ? '管理员' : '普通用户'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={user.status === 'ON' ? statusOnBadgeStyle : statusOffBadgeStyle}>
                            {user.status === 'ON' ? '正常' : '禁用'}
                          </span>
                        </td>
                        <td style={tdStyle}>{formatDateText(user.createdAt)}</td>
                        <td style={tdStyle}>
                          <div style={tableActionWrapStyle}>
                            <button
                              type="button"
                              onClick={() => handleEditUser(user)}
                              style={tableActionBtnStyle}
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.id)}
                              style={tableDeleteBtnStyle}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={listFootStyle}>
              <div style={listFootTextStyle}>
                总记录数：{total}　/　当前第 {pageNo} 页，共 {totalPages} 页
              </div>
              <div style={paginationWrapStyle}>
                <button
                  type="button"
                  onClick={() => pageNo > 1 && setPageNo((p) => p - 1)}
                  style={ghostBtnStyle}
                  disabled={pageNo <= 1}
                >
                  上一页
                </button>
                <button
                  type="button"
                  onClick={() => pageNo < totalPages && setPageNo((p) => p + 1)}
                  style={ghostBtnStyle}
                  disabled={pageNo >= totalPages}
                >
                  下一页
                </button>
              </div>
            </div>

            {userMsg ? <div style={msgStyle}>{userMsg}</div> : null}
          </div>
        )}
      </section>

      {editingUser && (
        <div style={maskStyle} onClick={() => setEditingUser(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeadStyle}>
              <div>
                <div style={sectionKickerStyle}>EDIT USER</div>
                <h2 style={modalTitleStyle}>编辑用户</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={ghostBtnStyle}
              >
                关闭
              </button>
            </div>

            <div style={formGridStyle}>
              <div style={fieldBlockStyle}>
                <label style={labelStyle}>用户名</label>
                <input
                  value={editingUser.username || ''}
                  disabled
                  style={{ ...inputStyle, background: '#f8fafc', cursor: 'not-allowed' }}
                />
              </div>
              <div style={fieldBlockStyle}>
                <label style={labelStyle}>昵称</label>
                <input
                  value={editForm.nickname}
                  onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div style={fieldBlockStyle}>
                <label style={labelStyle}>角色</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  style={inputStyle}
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div style={fieldBlockStyle}>
                <label style={labelStyle}>状态</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  style={inputStyle}
                >
                  <option value="ON">正常</option>
                  <option value="OFF">禁用</option>
                </select>
              </div>
              <div style={fieldBlockStyle}>
                <label style={labelStyle}>新密码（留空则不修改）</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="请输入新密码"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={modalActionRowStyle}>
              <button
                type="button"
                onClick={handleUpdateUser}
                style={submitBtnStyle}
                disabled={editLoading}
              >
                {editLoading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
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

const usersSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
}

const sectionHeadStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 20,
  flexWrap: 'wrap',
}

const sectionKickerStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '4px 10px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
  fontSize: 11,
  fontWeight: 800,
}

const sectionTitleStyle: React.CSSProperties = {
  margin: '10px 0 0',
  fontSize: 24,
  lineHeight: 1.2,
  color: '#111827',
}

const primaryBtnStyle: React.CSSProperties = {
  height: 42,
  padding: '0 18px',
  borderRadius: 12,
  border: 'none',
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 800,
  transition: 'all 0.2s ease',
}

const tableWrapStyle: React.CSSProperties = {
  marginTop: 18,
  overflowX: 'auto',
  borderRadius: 16,
  border: '1px solid rgba(15,23,42,0.06)',
  background: '#fff',
  boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  background: '#fff',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  fontSize: 12,
  color: '#6b7280',
  background: '#f8fafc',
  borderBottom: '1px solid rgba(15,23,42,0.06)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid rgba(15,23,42,0.06)',
  color: '#111827',
  fontSize: 14,
  verticalAlign: 'middle',
}

const emptyTdStyle: React.CSSProperties = {
  padding: '28px 14px',
  textAlign: 'center',
  color: '#6b7280',
}

const tableActionWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
}

const tableActionBtnStyle: React.CSSProperties = {
  height: 34,
  padding: '0 12px',
  borderRadius: 8,
  border: 'none',
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13,
}

const tableDeleteBtnStyle: React.CSSProperties = {
  height: 34,
  padding: '0 12px',
  borderRadius: 8,
  border: 'none',
  background: '#ef4444',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13,
}

const roleAdminBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 64,
  height: 26,
  padding: '0 8px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.12)',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
}

const roleUserBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 64,
  height: 26,
  padding: '0 8px',
  borderRadius: 999,
  background: 'rgba(107,114,128,0.12)',
  color: '#374151',
  fontSize: 12,
  fontWeight: 800,
}

const statusOnBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 56,
  height: 26,
  padding: '0 8px',
  borderRadius: 999,
  background: 'rgba(16,185,129,0.12)',
  color: '#059669',
  fontSize: 12,
  fontWeight: 800,
}

const statusOffBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 56,
  height: 26,
  padding: '0 8px',
  borderRadius: 999,
  background: 'rgba(239,68,68,0.12)',
  color: '#dc2626',
  fontSize: 12,
  fontWeight: 800,
}

const listFootStyle: React.CSSProperties = {
  marginTop: 16,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
}

const listFootTextStyle: React.CSSProperties = {
  color: '#6b7280',
  fontWeight: 700,
  fontSize: 14,
}

const paginationWrapStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const ghostBtnStyle: React.CSSProperties = {
  height: 40,
  padding: '0 16px',
  borderRadius: 12,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  cursor: 'pointer',
  fontWeight: 700,
  transition: 'all 0.2s ease',
}

const maskStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,0.38)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
}

const modalStyle: React.CSSProperties = {
  width: 'min(800px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto',
  background: '#fff',
  borderRadius: 24,
  padding: 24,
  boxShadow: '0 24px 60px rgba(15,23,42,0.20)',
}

const modalHeadStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 20,
  flexWrap: 'wrap',
  marginBottom: 24,
}

const modalTitleStyle: React.CSSProperties = {
  margin: '10px 0 0',
  fontSize: 24,
  lineHeight: 1.2,
  color: '#111827',
}

const modalActionRowStyle: React.CSSProperties = {
  marginTop: 24,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  flexWrap: 'wrap',
}
