import { useEffect, useMemo, useState } from 'react'
import {
  listProfiles,
  addProfile,
  deleteProfile,
  updateProfile,
  type BodyProfile,
} from './api/bodyProfile'

function toPositiveNumberOrNull(v: string) {
  const s = v.trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export default function BodyProfilePage() {
  const [list, setList] = useState<BodyProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')

  const [name, setName] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [leg, setLeg] = useState('')

  const [hoverRefresh, setHoverRefresh] = useState(false)
  const [hoverSubmit, setHoverSubmit] = useState(false)
  const [hoverDeleteId, setHoverDeleteId] = useState<string>('')
  const [hoverEditId, setHoverEditId] = useState<string>('')
  const [hoverCardId, setHoverCardId] = useState<string>('')

  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [focusName, setFocusName] = useState(false)
  const [focusHeight, setFocusHeight] = useState(false)
  const [focusWeight, setFocusWeight] = useState(false)
  const [focusWaist, setFocusWaist] = useState(false)
  const [focusLeg, setFocusLeg] = useState(false)

  const total = useMemo(() => list.length, [list])

  async function load() {
    setLoading(true)
    try {
      const data = await listProfiles()
      setList(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      setMsg((e as any)?.response?.data?.msg || (e as Error)?.message || '身材档案加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function resetForm() {
    setName('')
    setHeight('')
    setWeight('')
    setWaist('')
    setLeg('')
  }

  function validate() {
    if (!name.trim()) return '请输入档案名称，例如：我 / 爸爸 / 妈妈'
    if (toPositiveNumberOrNull(height) == null) return '身高必须是大于 0 的数字'
    if (toPositiveNumberOrNull(weight) == null) return '体重必须是大于 0 的数字'
    if (toPositiveNumberOrNull(waist) == null) return '腰围必须是大于 0 的数字'
    if (toPositiveNumberOrNull(leg) == null) return '腿长必须是大于 0 的数字'
    return ''
  }

  async function handleAdd() {
    const errText = validate()
    if (errText) {
      setMsg(errText)
      return
    }

    setSubmitting(true)
    setMsg('')

    try {
      const profileData = {
        name: name.trim(),
        heightCm: Number(height),
        weightKg: Number(weight),
        waistCm: Number(waist),
        legLengthCm: Number(leg),
      }

      let resp
      if (editingId) {
        resp = await updateProfile(editingId, profileData)
      } else {
        resp = await addProfile(profileData)
      }

      if (resp?.code !== 200) {
        setMsg(resp?.msg || (editingId ? '更新失败' : '新增失败'))
        return
      }

      resetForm()
      setEditingId(null)
      setMsg(editingId ? '身材档案更新成功' : '身材档案新增成功')
      await load()
    } catch (e: unknown) {
      setMsg((e as any)?.response?.data?.msg || (e as Error)?.message || (editingId ? '更新失败' : '新增失败'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id?: number | string) {
    if (id == null) return

    const ok = window.confirm('确定删除这个身材档案吗？')
    if (!ok) return

    setMsg('')
    try {
      const resp = await deleteProfile(id)
      if (resp?.code !== 200) {
        setMsg(resp?.msg || '删除失败')
        return
      }

      setMsg('删除成功')
      await load()
    } catch (e: unknown) {
      setMsg((e as any)?.response?.data?.msg || (e as Error)?.message || '删除失败')
    }
  }

  function handleEdit(profile: BodyProfile) {
    setEditingId(profile.id || null)
    setName(profile.name || '')
    setHeight(profile.heightCm?.toString() || '')
    setWeight(profile.weightKg?.toString() || '')
    setWaist(profile.waistCm?.toString() || '')
    setLeg(profile.legLengthCm?.toString() || '')
  }

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={heroTagStyle}>BODY PROFILE</div>
          <h1 style={heroTitleStyle}>我的身材档案</h1>
          <div style={heroDescStyle}>
            你可以录入多个家庭成员的身体信息，后续用于裤装推荐与尺码建议。
          </div>
        </div>

        <div style={heroStatsWrapStyle}>
          <div style={heroStatCardStyle}>
            <div style={heroStatLabelStyle}>档案数量</div>
            <div style={heroStatValueStyle}>{total}</div>
            <div style={heroStatDescStyle}>个已保存档案</div>
          </div>

          <button
            type="button"
            onClick={load}
            style={{
              ...refreshBtnStyle,
              ...(hoverRefresh ? hoverRefreshBtnStyle : {}),
            }}
            disabled={loading}
            onMouseEnter={() => setHoverRefresh(true)}
            onMouseLeave={() => setHoverRefresh(false)}
          >
            {loading ? '加载中...' : '刷新档案'}
          </button>
        </div>
      </section>

      <section style={formWrapStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={sectionKickerStyle}>PROFILE FORM</div>
            <h2 style={sectionTitleStyle}>新增身材档案</h2>
          </div>
        </div>

        <div style={tipBoxStyle}>
          <div style={tipTitleStyle}>说明</div>
          <div style={tipTextStyle}>
            档案名称建议填写“我 / 爸爸 / 妈妈 / 弟弟”等，方便后面做个性化推荐。
          </div>
        </div>

        <div style={gridStyle}>
          <div style={fieldBlockStyle}>
            <label style={labelStyle}>档案名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：我 / 妈妈"
              style={{
                ...inputStyle,
                ...(focusName ? focusedInputStyle : {}),
              }}
              onFocus={() => setFocusName(true)}
              onBlur={() => setFocusName(false)}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>身高（cm）</label>
            <input
              value={height}
              onChange={(e) => setHeight(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="例如：175"
              style={{
                ...inputStyle,
                ...(focusHeight ? focusedInputStyle : {}),
              }}
              onFocus={() => setFocusHeight(true)}
              onBlur={() => setFocusHeight(false)}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>体重（kg）</label>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="例如：70"
              style={{
                ...inputStyle,
                ...(focusWeight ? focusedInputStyle : {}),
              }}
              onFocus={() => setFocusWeight(true)}
              onBlur={() => setFocusWeight(false)}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>腰围（cm）</label>
            <input
              value={waist}
              onChange={(e) => setWaist(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="例如：80"
              style={{
                ...inputStyle,
                ...(focusWaist ? focusedInputStyle : {}),
              }}
              onFocus={() => setFocusWaist(true)}
              onBlur={() => setFocusWaist(false)}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>腿长（cm）</label>
            <input
              value={leg}
              onChange={(e) => setLeg(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="例如：100"
              style={{
                ...inputStyle,
                ...(focusLeg ? focusedInputStyle : {}),
              }}
              onFocus={() => setFocusLeg(true)}
              onBlur={() => setFocusLeg(false)}
            />
          </div>
        </div>

        <div style={submitRowStyle}>
          <button
            type="button"
            onClick={handleAdd}
            style={{
              ...submitBtnStyle,
              ...(hoverSubmit ? hoverSubmitBtnStyle : {}),
            }}
            disabled={submitting}
            onMouseEnter={() => setHoverSubmit(true)}
            onMouseLeave={() => setHoverSubmit(false)}
          >
            {submitting ? (editingId ? '更新中...' : '新增中...') : (editingId ? '更新档案' : '新增档案')}
          </button>
        </div>

        {msg ? (
          <div
            style={{
              ...msgStyle,
              ...(msg.includes('成功') ? successMsgStyle : errorMsgStyle),
            }}
          >
            {msg}
          </div>
        ) : null}
      </section>

      <section style={formWrapStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={sectionKickerStyle}>PROFILE LIST</div>
            <h2 style={sectionTitleStyle}>已保存档案</h2>
          </div>
        </div>

        {list.length === 0 ? (
          <div style={emptyStyle}>
            <div style={emptyTitleStyle}>还没有身材档案</div>
            <div style={emptySubStyle}>
              先新增一个，后续才能做裤装推荐。
            </div>
          </div>
        ) : (
          <div style={cardGridStyle}>
            {list.map((item, idx) => {
              const rawId = String(item.id ?? idx)
              const hovered = hoverCardId === rawId
              const deleteHovered = hoverDeleteId === rawId
              const editHovered = hoverEditId === rawId

              return (
                <div
                  key={rawId}
                  style={{
                    ...profileCardStyle,
                    ...(hovered ? hoverProfileCardStyle : {}),
                  }}
                  onMouseEnter={() => setHoverCardId(rawId)}
                  onMouseLeave={() => setHoverCardId('')}
                >
                  <div style={cardTopStyle}>
                    <div style={nameBadgeWrapStyle}>
                      <div style={profileNameStyle}>{item.name || '-'}</div>
                      <span style={profileTagStyle}>BODY</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        style={{
                          ...editBtnStyle,
                          ...(editHovered ? hoverEditBtnStyle : {}),
                        }}
                        onMouseEnter={() => setHoverEditId(rawId)}
                        onMouseLeave={() => setHoverEditId('')}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        style={{
                          ...deleteBtnStyle,
                          ...(deleteHovered ? hoverDeleteBtnStyle : {}),
                        }}
                        onMouseEnter={() => setHoverDeleteId(rawId)}
                        onMouseLeave={() => setHoverDeleteId('')}
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  <div style={metricsGridStyle}>
                    <div style={metricCardStyle}>
                      <div style={metricLabelStyle}>身高</div>
                      <div style={metricValueStyle}>
                        {item.heightCm ?? '-'} cm
                      </div>
                    </div>

                    <div style={metricCardStyle}>
                      <div style={metricLabelStyle}>体重</div>
                      <div style={metricValueStyle}>
                        {item.weightKg ?? '-'} kg
                      </div>
                    </div>

                    <div style={metricCardStyle}>
                      <div style={metricLabelStyle}>腰围</div>
                      <div style={metricValueStyle}>
                        {item.waistCm ?? '-'} cm
                      </div>
                    </div>

                    <div style={metricCardStyle}>
                      <div style={metricLabelStyle}>腿长</div>
                      <div style={metricValueStyle}>
                        {item.legLengthCm ?? '-'} cm
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
  display: 'grid',
  gridTemplateColumns: '1.2fr 0.8fr',
  gap: 20,
  padding: 28,
  borderRadius: 28,
  background: 'linear-gradient(135deg, #eef6ff, #ffffff 60%, #fff8f1)',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
}

const heroTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
}

const heroTitleStyle: React.CSSProperties = {
  margin: '14px 0 0',
  fontSize: 40,
  lineHeight: 1.15,
  color: '#111827',
}

const heroDescStyle: React.CSSProperties = {
  marginTop: 14,
  color: '#6b7280',
  lineHeight: 1.8,
  maxWidth: 640,
  fontSize: 15,
}

const heroStatsWrapStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 14,
  alignContent: 'start',
}

const heroStatCardStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 20,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 10px 24px rgba(15,23,42,0.04)',
}

const heroStatLabelStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: 12,
  fontWeight: 700,
}

const heroStatValueStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 28,
  fontWeight: 900,
  color: '#111827',
}

const heroStatDescStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#6b7280',
  fontSize: 13,
}

const refreshBtnStyle: React.CSSProperties = {
  height: 46,
  padding: '0 18px',
  borderRadius: 14,
  border: 'none',
  background: '#111827',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
  transition: 'transform 0.24s ease, box-shadow 0.24s ease',
}

const hoverRefreshBtnStyle: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 16px 28px rgba(15,23,42,0.18)',
}

const formWrapStyle: React.CSSProperties = {
  padding: 26,
  borderRadius: 28,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.05)',
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
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(255,122,0,0.10)',
  color: '#ff7a00',
  fontSize: 12,
  fontWeight: 800,
}

const sectionTitleStyle: React.CSSProperties = {
  margin: '12px 0 0',
  fontSize: 30,
  lineHeight: 1.2,
  color: '#111827',
}

const tipBoxStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  borderRadius: 18,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
}

const tipTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  color: '#111827',
}

const tipTextStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#6b7280',
  lineHeight: 1.8,
  fontSize: 14,
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 16,
  marginTop: 22,
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
  height: 46,
  padding: '0 14px',
  borderRadius: 14,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

const focusedInputStyle: React.CSSProperties = {
  border: '1px solid rgba(37,99,235,0.45)',
  boxShadow: '0 0 0 4px rgba(37,99,235,0.10)',
}

const submitRowStyle: React.CSSProperties = {
  marginTop: 22,
  display: 'flex',
  justifyContent: 'flex-end',
}

const submitBtnStyle: React.CSSProperties = {
  minWidth: 180,
  height: 48,
  padding: '0 18px',
  borderRadius: 14,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 900,
  boxShadow: '0 12px 24px rgba(37,99,235,0.18)',
  transition: 'transform 0.24s ease, box-shadow 0.24s ease',
}

const hoverSubmitBtnStyle: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 18px 30px rgba(37,99,235,0.24)',
}

const msgStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 16,
  whiteSpace: 'pre-wrap',
  fontWeight: 700,
}

const successMsgStyle: React.CSSProperties = {
  background: 'rgba(22,163,74,0.08)',
  border: '1px solid rgba(22,163,74,0.16)',
  color: '#16a34a',
}

const errorMsgStyle: React.CSSProperties = {
  background: 'rgba(234,88,12,0.08)',
  border: '1px solid rgba(234,88,12,0.16)',
  color: '#ea580c',
}

const emptyStyle: React.CSSProperties = {
  padding: 52,
  borderRadius: 24,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.05)',
  textAlign: 'center',
}

const emptyTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  color: '#111827',
}

const emptySubStyle: React.CSSProperties = {
  marginTop: 10,
  color: '#6b7280',
  lineHeight: 1.7,
}

const cardGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 18,
}

const profileCardStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 22,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
  transition: 'transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease',
}

const hoverProfileCardStyle: React.CSSProperties = {
  transform: 'translateY(-6px)',
  boxShadow: '0 22px 42px rgba(15,23,42,0.10)',
  border: '1px solid rgba(37,99,235,0.14)',
}

const cardTopStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 14,
  flexWrap: 'wrap',
}

const nameBadgeWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
}

const profileNameStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: '#111827',
}

const profileTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
}

const deleteBtnStyle: React.CSSProperties = {
  height: 42,
  padding: '0 16px',
  borderRadius: 12,
  border: 'none',
  background: '#fff7ed',
  color: '#ea580c',
  cursor: 'pointer',
  fontWeight: 800,
  transition: 'transform 0.22s ease, box-shadow 0.22s ease',
}

const hoverDeleteBtnStyle: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 14px 24px rgba(234,88,12,0.12)',
}

const editBtnStyle: React.CSSProperties = {
  height: 42,
  padding: '0 16px',
  borderRadius: 12,
  border: 'none',
  background: '#eff6ff',
  color: '#2563eb',
  cursor: 'pointer',
  fontWeight: 800,
  transition: 'transform 0.22s ease, box-shadow 0.22s ease',
}

const hoverEditBtnStyle: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 14px 24px rgba(37,99,235,0.12)',
}

const metricsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  marginTop: 18,
}

const metricCardStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderRadius: 16,
  background: '#f9fafb',
  border: '1px solid rgba(15,23,42,0.05)',
}

const metricLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#9ca3af',
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 8,
}

const metricValueStyle: React.CSSProperties = {
  color: '#111827',
  fontWeight: 800,
  lineHeight: 1.6,
}