import { useEffect, useMemo, useState } from 'react'
import {
  deleteAddress,
  listMyAddresses,
  saveAddress,
  setDefaultAddress,
  type AddressItem,
} from './api/address'
import { chinaRegions, type Province, type City } from './utils/chinaRegions'

function emptyForm() {
  return {
    receiver: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    isDefault: 0,
  }
}

export default function AddressPage() {
  const [items, setItems] = useState<AddressItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')

  const [receiver, setReceiver] = useState('')
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [detail, setDetail] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  const [hoverRefresh, setHoverRefresh] = useState(false)
  const [hoverSubmit, setHoverSubmit] = useState(false)

  const [focusReceiver, setFocusReceiver] = useState(false)
  const [focusPhone, setFocusPhone] = useState(false)
  const [focusProvince, setFocusProvince] = useState(false)
  const [focusCity, setFocusCity] = useState(false)
  const [focusDistrict, setFocusDistrict] = useState(false)
  const [focusDetail, setFocusDetail] = useState(false)

  const [hoverSetDefaultId, setHoverSetDefaultId] = useState<string>('')
  const [hoverDeleteId, setHoverDeleteId] = useState<string>('')
  const [hoverCardId, setHoverCardId] = useState<string>('')

  // 级联下拉相关逻辑
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)

  // 当省份改变时，重置城市和区县
  useEffect(() => {
    if (province) {
      const foundProvince = chinaRegions.find(p => p.name === province)
      setSelectedProvince(foundProvince || null)
      setCity('')
      setDistrict('')
      setSelectedCity(null)
    } else {
      setSelectedProvince(null)
      setCity('')
      setDistrict('')
      setSelectedCity(null)
    }
  }, [province])

  // 当城市改变时，重置区县
  useEffect(() => {
    if (city && selectedProvince) {
      const foundCity = selectedProvince.cities.find(c => c.name === city)
      setSelectedCity(foundCity || null)
      setDistrict('')
    } else {
      setSelectedCity(null)
      setDistrict('')
    }
  }, [city, selectedProvince])

  const total = useMemo(() => items.length, [items])

  async function load() {
    setLoading(true)
    try {
      const data = await listMyAddresses()
      setItems(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setMsg(e?.response?.data?.msg || e?.message || '地址列表加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function resetForm(options?: { keepMsg?: boolean }) {
    const next = emptyForm()
    setReceiver(next.receiver)
    setPhone(next.phone)
    setProvince(next.province)
    setCity(next.city)
    setDistrict(next.district)
    setDetail(next.detail)
    setIsDefault(Boolean(next.isDefault))

    if (!options?.keepMsg) {
      setMsg('')
    }
  }

  function validate() {
    if (!receiver.trim()) return '收货人不能为空'
    if (!phone.trim()) return '手机号不能为空'
    if (!province.trim()) return '省不能为空'
    if (!city.trim()) return '市不能为空'
    if (!district.trim()) return '区不能为空'
    if (!detail.trim()) return '详细地址不能为空'
    return ''
  }

  async function handleSubmit() {
    const errText = validate()
    if (errText) {
      setMsg(errText)
      return
    }

    setSubmitting(true)
    setMsg('')

    try {
      const resp = await saveAddress({
        receiver: receiver.trim(),
        phone: phone.trim(),
        province: province.trim(),
        city: city.trim(),
        district: district.trim(),
        detail: detail.trim(),
        isDefault: isDefault ? 1 : 0,
      })

      if (resp.code === 200) {
        resetForm({ keepMsg: true })
        setMsg('地址保存成功')
        await load()
      } else {
        setMsg(resp.msg || '地址保存失败')
      }
    } catch (e: any) {
      setMsg(e?.response?.data?.msg || e?.message || '地址保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id?: number | string) {
    if (id == null) return

    const ok = window.confirm('确定删除这个收货地址吗？')
    if (!ok) return

    setMsg('')
    try {
      const resp = await deleteAddress(id)
      if (resp.code === 200) {
        setMsg('地址删除成功')
        await load()
      } else {
        setMsg(resp.msg || '地址删除失败')
      }
    } catch (e: any) {
      setMsg(e?.response?.data?.msg || e?.message || '地址删除失败')
    }
  }

  async function handleSetDefault(id?: number | string) {
    if (id == null) return

    setMsg('')
    try {
      const resp = await setDefaultAddress(id)
      if (resp.code === 200) {
        setMsg('默认地址设置成功')
        await load()
      } else {
        setMsg(resp.msg || '默认地址设置失败')
      }
    } catch (e: any) {
      setMsg(e?.response?.data?.msg || e?.message || '默认地址设置失败')
    }
  }

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={heroTag}>MY ADDRESS</div>
          <h1 style={heroTitle}>收货地址</h1>
          <div style={heroSub}>
            这里用于维护你的收货地址。后续购物车下单和立即购买都会从这里选择地址。
          </div>
        </div>

        <div style={heroRight}>
          <div style={heroInfoCard}>
            <div style={heroInfoLabel}>地址数量</div>
            <div style={heroInfoValue}>{total}</div>
            <div style={heroInfoDesc}>个已保存地址</div>
          </div>

          <button
            style={{
              ...refreshBtnStyle,
              ...(hoverRefresh ? hoverRefreshBtnStyle : {}),
            }}
            onClick={load}
            disabled={loading}
            onMouseEnter={() => setHoverRefresh(true)}
            onMouseLeave={() => setHoverRefresh(false)}
          >
            {loading ? '加载中...' : '刷新地址'}
          </button>
        </div>
      </section>

      <section style={formWrapStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={sectionKickerStyle}>ADDRESS FORM</div>
            <h2 style={sectionTitleStyle}>新增收货地址</h2>
          </div>
        </div>

        <div style={tipBoxStyle}>
          <div style={tipTitleStyle}>说明</div>
          <div style={tipTextStyle}>
            当前版本先支持新增、删除、设为默认地址，后续下单时会直接复用这里的地址信息。
          </div>
        </div>

        <div style={gridStyle}>
          <div style={fieldBlockStyle}>
            <label style={labelStyle}>收货人</label>
            <input
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              placeholder="例如：张三"
              style={{
                ...inputStyle,
                ...(focusReceiver ? focusedInputStyle : {}),
              }}
              onFocus={() => setFocusReceiver(true)}
              onBlur={() => setFocusReceiver(false)}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>手机号</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="例如：13800138000"
              style={{
                ...inputStyle,
                ...(focusPhone ? focusedInputStyle : {}),
              }}
              onFocus={() => setFocusPhone(true)}
              onBlur={() => setFocusPhone(false)}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>省</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              style={{
                ...inputStyle,
                ...(focusProvince ? focusedInputStyle : {}),
                cursor: 'pointer'
              }}
              onFocus={() => setFocusProvince(true)}
              onBlur={() => setFocusProvince(false)}
            >
              <option value="">请选择省份</option>
              {chinaRegions.map((p) => (
                <option key={p.code} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>市</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!province}
              style={{
                ...inputStyle,
                ...(focusCity ? focusedInputStyle : {}),
                background: province ? 'var(--color-white)' : 'var(--color-background)',
                cursor: province ? 'pointer' : 'not-allowed',
                opacity: province ? 1 : 0.6
              }}
              onFocus={() => setFocusCity(true)}
              onBlur={() => setFocusCity(false)}
            >
              <option value="">请选择城市</option>
              {selectedProvince?.cities.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>区/县</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={!city}
              style={{
                ...inputStyle,
                ...(focusDistrict ? focusedInputStyle : {}),
                background: city ? 'var(--color-white)' : 'var(--color-background)',
                cursor: city ? 'pointer' : 'not-allowed',
                opacity: city ? 1 : 0.6
              }}
              onFocus={() => setFocusDistrict(true)}
              onBlur={() => setFocusDistrict(false)}
            >
              <option value="">请选择区/县</option>
              {selectedCity?.districts.map((d) => (
                <option key={d.code} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ ...fieldBlockStyle, gridColumn: '1 / -1' }}>
            <label style={labelStyle}>详细地址</label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="例如：中山东路1号"
              style={{
                ...textareaStyle,
                ...(focusDetail ? focusedTextareaStyle : {}),
              }}
              onFocus={() => setFocusDetail(true)}
              onBlur={() => setFocusDetail(false)}
            />
          </div>
        </div>

        <div style={checkRowStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            <span>设为默认地址</span>
          </label>
        </div>

        <div style={submitRowStyle}>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              ...submitBtnStyle,
              ...(hoverSubmit ? hoverSubmitBtnStyle : {}),
            }}
            disabled={submitting}
            onMouseEnter={() => setHoverSubmit(true)}
            onMouseLeave={() => setHoverSubmit(false)}
          >
            {submitting ? '保存中...' : '保存地址'}
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
            <div style={sectionKickerStyle}>ADDRESS LIST</div>
            <h2 style={sectionTitleStyle}>我的地址</h2>
          </div>
        </div>

        {items.length === 0 ? (
          <div style={emptyStyle}>
            <div style={emptyTitleStyle}>还没有收货地址</div>
            <div style={emptySubStyle}>先新增一个地址，后续下单时就能直接选择。</div>
          </div>
        ) : (
          <div style={cardGridStyle}>
            {items.map((item, idx) => {
              const fullAddress = `${item.province || ''}${item.city || ''}${item.district || ''}${item.detail || ''}`
              const rawId = String(item.id ?? idx)
              const isDefaultItem = Number(item.isDefault || 0) === 1
              const cardHovered = hoverCardId === rawId
              const defaultHovered = hoverSetDefaultId === rawId
              const deleteHovered = hoverDeleteId === rawId

              return (
                <div
                  key={rawId}
                  style={{
                    ...addressCardStyle,
                    ...(cardHovered ? hoverAddressCardStyle : {}),
                    ...(isDefaultItem ? defaultAddressCardStyle : {}),
                  }}
                  onMouseEnter={() => setHoverCardId(rawId)}
                  onMouseLeave={() => setHoverCardId('')}
                >
                  <div style={addressTopStyle}>
                    <div style={nameWrapStyle}>
                      <div style={receiverStyle}>{item.receiver || '-'}</div>
                      {isDefaultItem ? (
                        <span style={defaultBadgeStyle}>默认地址</span>
                      ) : null}
                    </div>

                    <div style={phoneStyle}>{item.phone || '-'}</div>
                  </div>

                  <div style={addressBodyStyle}>{fullAddress || '-'}</div>

                  <div style={addressActionRowStyle}>
                    {!isDefaultItem ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(item.id)}
                        style={{
                          ...setDefaultBtnStyle,
                          ...(defaultHovered ? hoverSetDefaultBtnStyle : {}),
                        }}
                        onMouseEnter={() => setHoverSetDefaultId(rawId)}
                        onMouseLeave={() => setHoverSetDefaultId('')}
                      >
                        设为默认
                      </button>
                    ) : (
                      <button type="button" style={defaultBtnDisabledStyle} disabled>
                        当前默认
                      </button>
                    )}

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
                      删除地址
                    </button>
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
  alignItems: 'stretch',
  padding: 28,
  borderRadius: 28,
  background: 'linear-gradient(135deg, #eef6ff, #ffffff 60%, #fff8f1)',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
}

const heroTag: React.CSSProperties = {
  display: 'inline-flex',
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
}

const heroTitle: React.CSSProperties = {
  margin: '14px 0 0',
  fontSize: 40,
  lineHeight: 1.15,
  color: '#111827',
}

const heroSub: React.CSSProperties = {
  marginTop: 14,
  color: '#6b7280',
  lineHeight: 1.8,
  maxWidth: 640,
  fontSize: 15,
}

const heroRight: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 14,
  alignContent: 'start',
}

const heroInfoCard: React.CSSProperties = {
  padding: 18,
  borderRadius: 20,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 10px 24px rgba(15,23,42,0.04)',
}

const heroInfoLabel: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: 12,
  fontWeight: 700,
}

const heroInfoValue: React.CSSProperties = {
  marginTop: 10,
  fontSize: 28,
  fontWeight: 900,
  color: '#111827',
}

const heroInfoDesc: React.CSSProperties = {
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
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
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
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
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

const textareaStyle: React.CSSProperties = {
  minHeight: 110,
  padding: 14,
  borderRadius: 14,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

const focusedTextareaStyle: React.CSSProperties = {
  border: '1px solid rgba(37,99,235,0.45)',
  boxShadow: '0 0 0 4px rgba(37,99,235,0.10)',
}

const checkRowStyle: React.CSSProperties = {
  marginTop: 18,
}

const checkboxLabelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  color: '#374151',
  fontWeight: 700,
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

const addressCardStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 22,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
  transition: 'transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease',
}

const hoverAddressCardStyle: React.CSSProperties = {
  transform: 'translateY(-6px)',
  boxShadow: '0 22px 42px rgba(15,23,42,0.10)',
  border: '1px solid rgba(37,99,235,0.14)',
}

const defaultAddressCardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #f8fbff, #ffffff)',
  border: '1px solid rgba(37,99,235,0.16)',
}

const addressTopStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 14,
  flexWrap: 'wrap',
}

const nameWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
}

const receiverStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  color: '#111827',
}

const defaultBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
}

const phoneStyle: React.CSSProperties = {
  color: '#4b5563',
  fontWeight: 700,
}

const addressBodyStyle: React.CSSProperties = {
  marginTop: 16,
  color: '#6b7280',
  lineHeight: 1.8,
  fontSize: 14,
  minHeight: 76,
}

const addressActionRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 16,
}

const setDefaultBtnStyle: React.CSSProperties = {
  height: 42,
  padding: '0 16px',
  borderRadius: 12,
  border: 'none',
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 800,
  transition: 'transform 0.22s ease, box-shadow 0.22s ease',
}

const hoverSetDefaultBtnStyle: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 14px 24px rgba(15,23,42,0.18)',
}

const defaultBtnDisabledStyle: React.CSSProperties = {
  height: 42,
  padding: '0 16px',
  borderRadius: 12,
  border: 'none',
  background: '#dbeafe',
  color: '#2563eb',
  fontWeight: 800,
  cursor: 'default',
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