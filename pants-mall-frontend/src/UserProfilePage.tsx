import { useEffect, useMemo, useState } from 'react'
import { getMe, updateMyBody, updateMyNickname, type MeInfo } from './api/auth'
import { listOrders } from './api/orders'
import { listFavorites, removeFavorite } from './api/favorites'
import { listMyAddresses, saveAddress, deleteAddress, type AddressItem } from './api/address'
import { listProfiles } from './api/bodyProfile'
import type { Favorite } from './api/favorites'
import { chinaRegions, type Province, type City } from './utils/chinaRegions'

export default function UserProfilePage({
  onNicknameUpdated,
  onGoOrders,
  onGoFavorites,
  onGoAddress,
  onGoProfile,
}: {
  onNicknameUpdated?: (nickname: string) => void
  onGoOrders?: () => void
  onGoFavorites?: () => void
  onGoAddress?: () => void
  onGoProfile?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [savingNickname, setSavingNickname] = useState(false)
  const [savingBody, setSavingBody] = useState(false)

  const [msg, setMsg] = useState('')
  const [me, setMe] = useState<MeInfo | null>(null)

  const [nickname, setNickname] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [waistCm, setWaistCm] = useState('')
  const [legLengthCm, setLegLengthCm] = useState('')

  const [orderTotal, setOrderTotal] = useState(0)
  const [orderFinished, setOrderFinished] = useState(0)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [addressTotal, setAddressTotal] = useState(0)
  const [defaultReceiver, setDefaultReceiver] = useState('')
  const [profileTotal, setProfileTotal] = useState(0)
  const [latestProfileName, setLatestProfileName] = useState('')

  const [hoverOrders, setHoverOrders] = useState(false)
  const [hoverFavorites, setHoverFavorites] = useState(false)
  const [hoverAddress, setHoverAddress] = useState(false)
  const [hoverProfile, setHoverProfile] = useState(false)
  const [hoverSaveNickname, setHoverSaveNickname] = useState(false)
  const [hoverSaveBody, setHoverSaveBody] = useState(false)

  // 地址弹窗状态
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | number | null>(null)
  
  const [receiver, setReceiver] = useState('')
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [detail, setDetail] = useState('')
  const [isDefault, setIsDefault] = useState(false)

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

  const [focusNickname, setFocusNickname] = useState(false)
  const [focusHeight, setFocusHeight] = useState(false)
  const [focusWaist, setFocusWaist] = useState(false)
  const [password, setPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  async function loadMe() {
    setLoading(true)
    setMsg('')
    try {
      const res = await getMe()
      if (res.code === 200) {
        const data = res.data || {}
        setMe(data)
        setNickname(String(data.nickname || ''))
        setHeightCm(
          data.heightCm === null || data.heightCm === undefined
            ? ''
            : String(data.heightCm)
        )
        setWaistCm(
          data.waistCm === null || data.waistCm === undefined
            ? ''
            : String(data.waistCm)
        )
        setLegLengthCm(
          data.legLengthCm === null || data.legLengthCm === undefined
            ? ''
            : String(data.legLengthCm)
        )
      } else {
        setMsg(res.msg || '获取个人信息失败')
      }
    } catch (e: unknown) {
      setMsg((e as any)?.response?.data?.msg || (e as Error)?.message || '获取个人信息失败')
    } finally {
      setLoading(false)
    }
  }

  async function loadSummary() {
    setSummaryLoading(true)
    try {
      const [orderPage, favorites, addresses, profiles] = await Promise.all([
        listOrders(),
        listFavorites(),
        listMyAddresses(),
        listProfiles(),
      ])

      const orders = Array.isArray(orderPage?.list) ? orderPage.list : []
      setOrderTotal(orders.length)
      setOrderFinished(
        orders.filter((item) => String(item.status || '') === 'FINISHED').length
      )

      const favoriteList = Array.isArray(favorites) ? favorites : []
      setFavorites(favoriteList)

      const addressList = Array.isArray(addresses) ? addresses : []
      setAddressTotal(addressList.length)
      const defaultAddress =
        addressList.find((item) => Number(item.isDefault) === 1) || null
      setDefaultReceiver(String(defaultAddress?.receiver || '').trim())

      const profileList = Array.isArray(profiles) ? profiles : []
      setProfileTotal(profileList.length)
      const latest =
        profileList.length > 0 ? profileList[profileList.length - 1] : null
      setLatestProfileName(String(latest?.name || '').trim())
    } catch {
      // 摘要失败不打断主页面
    } finally {
      setSummaryLoading(false)
    }
  }

  // 地址相关函数
  function validateAddressForm() {
    if (!receiver.trim()) return '收货人不能为空'
    if (!phone.trim()) return '手机号不能为空'
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) return '手机号格式不正确'
    if (!province.trim()) return '省不能为空'
    if (!city.trim()) return '市不能为空'
    if (!district.trim()) return '区/县不能为空'
    if (!detail.trim()) return '详细地址不能为空'
    if (detail.trim().length < 5) return '详细地址至少需要5个字符'
    return ''
  }

  function resetAddressForm() {
    setReceiver('')
    setPhone('')
    setProvince('')
    setCity('')
    setDistrict('')
    setDetail('')
    setIsDefault(false)
    setEditingAddressId(null)
  }

  async function handleSaveAddress() {
    const errText = validateAddressForm()
    if (errText) {
      alert(errText)
      return
    }

    setSavingAddress(true)
    try {
      const addressData = {
        receiver: receiver.trim(),
        phone: phone.trim(),
        province: province.trim(),
        city: city.trim(),
        district: district.trim(),
        detail: detail.trim(),
        isDefault: isDefault ? 1 : 0,
        ...(editingAddressId ? { id: editingAddressId } : {})
      }
      
      const resp = await saveAddress(addressData)

      if (resp.code !== 200) {
        alert(resp.msg || '地址保存失败')
        return
      }

      resetAddressForm()
      setShowAddressModal(false)
      await loadSummary()
      alert(editingAddressId ? '地址更新成功' : '地址保存成功')
    } catch (e: unknown) {
      alert((e as any)?.response?.data?.msg || (e as Error)?.message || '地址保存失败')
    } finally {
      setSavingAddress(false)
    }
  }

  function handleEditAddress(address: AddressItem) {
    setEditingAddressId(address.id ?? null)
    setReceiver(address.receiver || '')
    setPhone(address.phone || '')
    setProvince(address.province || '')
    setCity(address.city || '')
    setDistrict(address.district || '')
    setDetail(address.detail || '')
    setIsDefault(Number(address.isDefault || 0) === 1)
    setShowAddressModal(true)
  }

  async function handleDeleteAddress(id: string | number) {
    if (!confirm('确定要删除这个地址吗？')) return

    try {
      const resp = await deleteAddress(id)
      if (resp.code !== 200) {
        alert(resp.msg || '地址删除失败')
        return
      }

      await loadSummary()
      alert('地址删除成功')
    } catch (e: unknown) {
      alert((e as any)?.response?.data?.msg || (e as Error)?.message || '地址删除失败')
    }
  }

  async function handleRemoveFavorite(spuId: string) {
    try {
      const res = await removeFavorite(spuId)
      if (res.code === 200) {
        setFavorites(prev => prev.filter(item => String(item.spuId) !== spuId))
        setMsg('移除收藏成功')
      } else {
        setMsg(res.msg || '移除收藏失败')
      }
    } catch (e: unknown) {
      setMsg((e as any)?.response?.data?.msg || (e as Error)?.message || '移除收藏失败')
    }
  }

  async function handleSaveNickname() {
    const nextNickname = String(nickname || '').trim()

    if (!nextNickname) {
      setMsg('昵称不能为空')
      return
    }

    setSavingNickname(true)
    setMsg('')
    try {
      const res = await updateMyNickname(nextNickname)
      if (res.code === 200) {
        localStorage.setItem('nickname', nextNickname)
        setMe((prev) =>
          prev
            ? {
                ...prev,
                nickname: nextNickname,
              }
            : prev
        )
        setMsg('昵称修改成功')
        onNicknameUpdated?.(nextNickname)
      } else {
        setMsg(res.msg || '昵称修改失败')
      }
    } catch (e: unknown) {
      setMsg((e as any)?.response?.data?.msg || (e as Error)?.message || '昵称修改失败')
    } finally {
      setSavingNickname(false)
    }
  }

  async function handleSaveBody() {
    const nextHeight = String(heightCm || '').trim()
    const nextWaist = String(waistCm || '').trim()
    const nextLeg = String(legLengthCm || '').trim()

    const payload: {
      heightCm?: number
      waistCm?: number
      legLengthCm?: number
    } = {}

    if (nextHeight) payload.heightCm = Number(nextHeight)
    if (nextWaist) payload.waistCm = Number(nextWaist)
    if (nextLeg) payload.legLengthCm = Number(nextLeg)

    if (
      (payload.heightCm !== undefined && Number.isNaN(payload.heightCm)) ||
      (payload.waistCm !== undefined && Number.isNaN(payload.waistCm)) ||
      (payload.legLengthCm !== undefined && Number.isNaN(payload.legLengthCm))
    ) {
      setMsg('身材信息请输入数字')
      return
    }

    setSavingBody(true)
    setMsg('')
    try {
      const res = await updateMyBody(payload)
      if (res.code === 200) {
        setMe((prev) =>
          prev
            ? {
                ...prev,
                heightCm: payload.heightCm,
                waistCm: payload.waistCm,
                legLengthCm: payload.legLengthCm,
              }
            : prev
        )
        setMsg('身材信息更新成功')
      } else {
        setMsg(res.msg || '身材信息更新失败')
      }
    } catch (e: unknown) {
      setMsg((e as any)?.response?.data?.msg || (e as Error)?.message || '身材信息更新失败')
    } finally {
      setSavingBody(false)
    }
  }

  async function handleSavePassword() {
    const nextPassword = String(password || '').trim()

    if (!nextPassword) {
      setMsg('密码不能为空')
      return
    }

    if (nextPassword.length < 6) {
      setMsg('密码长度至少6位')
      return
    }

    setSavingPassword(true)
    setMsg('')
    try {
      const res = await fetch('http://localhost:8081/api/user/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: nextPassword }),
      })

      const data = await res.json()
      if (data.code === 200) {
        setMsg('密码更新成功')
        setPassword('')
      } else {
        setMsg(data.msg || '密码更新失败')
      }
    } catch (e: unknown) {
      setMsg((e as any)?.response?.data?.msg || (e as Error)?.message || '密码更新失败')
    } finally {
      setSavingPassword(false)
    }
  }

  useEffect(() => {
    loadMe()
    loadSummary()
  }, [])

  const displayName =
    String(me?.nickname || '').trim() || String(me?.username || '-')

  const summaryText = useMemo(() => {
    if (summaryLoading) return '正在同步你的订单、收藏、地址和档案信息...'
    return '这里可以查看你的基础资料、身材信息，以及与你账号相关的功能总览。'
  }, [summaryLoading])

  return (
    <div style={pageStyle}>
      <section style={cardStyle}>
        <div style={badgeStyle}>ACCOUNT CENTER</div>
        <h2 style={titleStyle}>个人信息</h2>
        <div style={descStyle}>{summaryText}</div>

        {loading ? (
          <div style={loadingStyle}>加载中...</div>
        ) : (
          <>
            <div style={heroInfoStyle}>
              <div style={heroAvatarStyle}>👤</div>
              <div>
                <div style={heroNameStyle}>{displayName}</div>
                <div style={heroSubStyle}>登录账号：{me?.username || '-'}</div>
              </div>
            </div>

            <div style={sectionWrapStyle}>
              <div style={sectionTitleStyle}>功能总览</div>
              <div style={sectionDescStyle}>点击卡片可直接进入对应页面。</div>
              <div style={summaryGridStyle}>
                <button
                  type="button"
                  style={{
                    ...summaryCardStyle,
                    ...(hoverOrders ? hoverSummaryCardStyle : {}),
                  }}
                  onClick={onGoOrders}
                  onMouseEnter={() => setHoverOrders(true)}
                  onMouseLeave={() => setHoverOrders(false)}
                >
                  <div style={summaryLabelStyle}>订单摘要</div>
                  <div style={summaryValueStyle}>{orderTotal}</div>
                  <div style={summaryDescStyle}>
                    全部订单，已完成 {orderFinished} 单
                  </div>
                </button>

                <button
                  type="button"
                  style={{
                    ...summaryCardStyle,
                    ...(hoverFavorites ? hoverSummaryCardStyle : {}),
                  }}
                  onClick={onGoFavorites}
                  onMouseEnter={() => setHoverFavorites(true)}
                  onMouseLeave={() => setHoverFavorites(false)}
                >
                  <div style={summaryLabelStyle}>收藏摘要</div>
                  <div style={summaryValueStyle}>{favorites.length}</div>
                  <div style={summaryDescStyle}>
                    当前已收藏 {favorites.length} 件商品
                  </div>
                </button>

                <button
                  type="button"
                  style={{
                    ...summaryCardStyle,
                    ...(hoverAddress ? hoverSummaryCardStyle : {}),
                  }}
                  onClick={onGoAddress}
                  onMouseEnter={() => setHoverAddress(true)}
                  onMouseLeave={() => setHoverAddress(false)}
                >
                  <div style={summaryLabelStyle}>地址摘要</div>
                  <div style={summaryValueStyle}>{addressTotal}</div>
                  <div style={summaryDescStyle}>
                    {defaultReceiver
                      ? `默认收货人：${defaultReceiver}`
                      : '暂未识别默认收货地址'}
                  </div>
                </button>

                <button
                  type="button"
                  style={{
                    ...summaryCardStyle,
                    ...(hoverProfile ? hoverSummaryCardStyle : {}),
                  }}
                  onClick={onGoProfile}
                  onMouseEnter={() => setHoverProfile(true)}
                  onMouseLeave={() => setHoverProfile(false)}
                >
                  <div style={summaryLabelStyle}>档案摘要</div>
                  <div style={summaryValueStyle}>{profileTotal}</div>
                  <div style={summaryDescStyle}>
                    {latestProfileName
                      ? `最近档案：${latestProfileName}`
                      : '还没有身材档案'}
                  </div>
                </button>
              </div>
            </div>

            <div style={sectionWrapStyle}>
              <div style={sectionTitleStyle}>基础资料</div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-4)'
              }}>
                {/* 昵称编辑 */}
                <div style={{
                  display: 'flex',
                  gap: 'var(--spacing-4)'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={labelStyle}>昵称</div>
                    <input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="请输入昵称"
                      style={{
                        ...inputStyle,
                        ...(focusNickname ? focusedInputStyle : {}),
                        marginTop: 8
                      }}
                      maxLength={20}
                      disabled={savingNickname}
                      onFocus={() => setFocusNickname(true)}
                      onBlur={() => setFocusNickname(false)}
                    />
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    paddingBottom: 8
                  }}>
                    <button
                      type="button"
                      style={{
                        ...saveBtnStyle,
                        ...(hoverSaveNickname ? hoverSaveBtnStyle : {}),
                        whiteSpace: 'nowrap'
                      }}
                      onClick={handleSaveNickname}
                      disabled={savingNickname}
                      onMouseEnter={() => setHoverSaveNickname(true)}
                      onMouseLeave={() => setHoverSaveNickname(false)}
                    >
                      {savingNickname ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>

                {/* 登录账号 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-4)'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={labelStyle}>登录账号</div>
                    <div style={valueStyle}>{me?.username || '-'}</div>
                  </div>
                </div>

                {/* 密码更新 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-2)'
                }}>
                  <div style={labelStyle}>密码更新</div>
                  <div style={{
                    display: 'flex',
                    gap: 'var(--spacing-4)'
                  }}>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入新密码"
                      style={{
                        ...inputStyle,
                        flex: 1
                      }}
                      disabled={savingPassword}
                    />
                    <button
                      type="button"
                      style={{
                        ...saveBtnStyle,
                        whiteSpace: 'nowrap'
                      }}
                      onClick={handleSavePassword}
                      disabled={savingPassword}
                    >
                      {savingPassword ? '保存中...' : '更新密码'}
                    </button>
                  </div>
                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-tertiary)'
                  }}>
                    密码长度至少6位，建议包含字母和数字
                  </div>
                </div>
              </div>
            </div>

            <div style={sectionWrapStyle}>
              <div style={sectionTitleStyle}>身材信息</div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-4)'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 'var(--spacing-4)'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={labelStyle}>身高（cm）</div>
                    <input
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="例如 175"
                      style={{
                        ...inputStyle,
                        ...(focusHeight ? focusedInputStyle : {}),
                        marginTop: 8
                      }}
                      disabled={savingBody}
                      onFocus={() => setFocusHeight(true)}
                      onBlur={() => setFocusHeight(false)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={labelStyle}>腰围（cm）</div>
                    <input
                      value={waistCm}
                      onChange={(e) => setWaistCm(e.target.value)}
                      placeholder="例如 80"
                      style={{
                        ...inputStyle,
                        ...(focusWaist ? focusedInputStyle : {}),
                        marginTop: 8
                      }}
                      disabled={savingBody}
                      onFocus={() => setFocusWaist(true)}
                      onBlur={() => setFocusWaist(false)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={labelStyle}>腿长（cm）</div>
                    <input
                      value={legLengthCm}
                      onChange={(e) => setLegLengthCm(e.target.value)}
                      placeholder="例如 90"
                      style={{
                        ...inputStyle,
                        marginTop: 8
                      }}
                      disabled={savingBody}
                    />
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="button"
                    style={{
                      ...saveBtnStyle,
                      ...(hoverSaveBody ? hoverSaveBtnStyle : {}),
                    }}
                    onClick={handleSaveBody}
                    disabled={savingBody}
                    onMouseEnter={() => setHoverSaveBody(true)}
                    onMouseLeave={() => setHoverSaveBody(false)}
                  >
                    {savingBody ? '保存中...' : '保存身材信息'}
                  </button>
                </div>
              </div>
            </div>





            <div
              style={{
                ...msgStyle,
                ...(msg
                  ? msg.includes('成功')
                    ? successMsgStyle
                    : errorMsgStyle
                  : {}),
              }}
            >
              {msg}
            </div>

            {/* 新增/编辑地址弹窗 */}
            {showAddressModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                animation: 'fadeIn 0.3s ease-in-out'
              }}>
                <div style={{
                  background: '#ffffff',
                  borderRadius: 'var(--radius-2xl)',
                  boxShadow: 'var(--shadow-2xl)',
                  width: '90%',
                  maxWidth: 600,
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  animation: 'slideIn 0.3s ease-in-out'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--spacing-6)',
                    borderBottom: '1px solid var(--color-border-light)'
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: 'var(--font-weight-black)',
                        color: 'var(--color-text-primary)',
                        margin: 0
                      }}>
                        {editingAddressId ? '编辑收货地址' : '新增收货地址'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        resetAddressForm()
                        setShowAddressModal(false)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 'var(--font-size-2xl)',
                        cursor: 'pointer',
                        color: 'var(--color-text-tertiary)',
                        padding: 0,
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-full)',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-background)';
                        e.currentTarget.style.color = 'var(--color-text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.color = 'var(--color-text-tertiary)';
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ padding: 'var(--spacing-6)' }}>
                    <div style={{ marginBottom: 'var(--spacing-4)' }}>
                      <div style={{
                        marginBottom: 8,
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)'
                      }}>收货人</div>
                      <input
                        type="text"
                        value={receiver}
                        onChange={(e) => setReceiver(e.target.value)}
                        placeholder="请输入收货人姓名"
                        style={{
                          width: '100%',
                          height: 48,
                          padding: '0 var(--spacing-4)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-white)',
                          color: 'var(--color-text-primary)',
                          fontSize: 'var(--font-size-base)',
                          outline: 'none',
                          transition: 'var(--transition-fast)'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-border)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-4)' }}>
                      <div style={{
                        marginBottom: 8,
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)'
                      }}>手机号</div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="请输入手机号"
                        style={{
                          width: '100%',
                          height: 48,
                          padding: '0 var(--spacing-4)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-white)',
                          color: 'var(--color-text-primary)',
                          fontSize: 'var(--font-size-base)',
                          outline: 'none',
                          transition: 'var(--transition-fast)'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-border)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: 'var(--spacing-3)',
                      marginBottom: 'var(--spacing-4)'
                    }}>
                      <div>
                        <div style={{
                          marginBottom: 8,
                          fontWeight: 'var(--font-weight-bold)',
                          color: 'var(--color-text-primary)',
                          fontSize: 'var(--font-size-sm)'
                        }}>省</div>
                        <select
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          style={{
                            width: '100%',
                            height: 44,
                            padding: '0 var(--spacing-3)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-white)',
                            color: 'var(--color-text-primary)',
                            fontSize: 'var(--font-size-sm)',
                            outline: 'none',
                            transition: 'var(--transition-fast)',
                            cursor: 'pointer'
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">请选择省份</option>
                          {chinaRegions.map((p) => (
                            <option key={p.code} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div style={{
                          marginBottom: 8,
                          fontWeight: 'var(--font-weight-bold)',
                          color: 'var(--color-text-primary)',
                          fontSize: 'var(--font-size-sm)'
                        }}>市</div>
                        <select
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          disabled={!province}
                          style={{
                            width: '100%',
                            height: 44,
                            padding: '0 var(--spacing-3)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-border)',
                            background: province ? 'var(--color-white)' : 'var(--color-background)',
                            color: 'var(--color-text-primary)',
                            fontSize: 'var(--font-size-sm)',
                            outline: 'none',
                            transition: 'var(--transition-fast)',
                            cursor: province ? 'pointer' : 'not-allowed',
                            opacity: province ? 1 : 0.6
                          }}
                          onFocus={(e) => {
                            if (province) {
                              e.currentTarget.style.borderColor = 'var(--color-primary)';
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                            }
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">请选择城市</option>
                          {selectedProvince?.cities.map((c) => (
                            <option key={c.code} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div style={{
                          marginBottom: 8,
                          fontWeight: 'var(--font-weight-bold)',
                          color: 'var(--color-text-primary)',
                          fontSize: 'var(--font-size-sm)'
                        }}>区/县</div>
                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          disabled={!city}
                          style={{
                            width: '100%',
                            height: 44,
                            padding: '0 var(--spacing-3)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-border)',
                            background: city ? 'var(--color-white)' : 'var(--color-background)',
                            color: 'var(--color-text-primary)',
                            fontSize: 'var(--font-size-sm)',
                            outline: 'none',
                            transition: 'var(--transition-fast)',
                            cursor: city ? 'pointer' : 'not-allowed',
                            opacity: city ? 1 : 0.6
                          }}
                          onFocus={(e) => {
                            if (city) {
                              e.currentTarget.style.borderColor = 'var(--color-primary)';
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                            }
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">请选择区/县</option>
                          {selectedCity?.districts.map((d) => (
                            <option key={d.code} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-4)' }}>
                      <div style={{
                        marginBottom: 8,
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-primary)'
                      }}>详细地址</div>
                      <textarea
                        value={detail}
                        onChange={(e) => setDetail(e.target.value)}
                        placeholder="请输入详细地址，如街道、门牌号等"
                        rows={4}
                        style={{
                          width: '100%',
                          padding: 'var(--spacing-4)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-white)',
                          color: 'var(--color-text-primary)',
                          fontSize: 'var(--font-size-base)',
                          resize: 'vertical',
                          outline: 'none',
                          transition: 'var(--transition-fast)',
                          fontFamily: 'inherit'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-border)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: 'var(--spacing-6)'
                    }}>
                      <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: 'pointer'
                        }}
                      />
                      <label style={{
                        marginLeft: 'var(--spacing-2)',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer'
                      }}>
                        设置为默认地址
                      </label>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: 'var(--spacing-3)',
                    justifyContent: 'flex-end',
                    padding: 'var(--spacing-6)',
                    borderTop: '1px solid var(--color-border-light)'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        resetAddressForm()
                        setShowAddressModal(false)
                      }}
                      style={{
                        padding: 'var(--spacing-3) var(--spacing-6)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-white)',
                        color: 'var(--color-text-primary)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-bold)',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      disabled={savingAddress}
                      style={{
                        padding: 'var(--spacing-3) var(--spacing-6)',
                        borderRadius: 'var(--radius-lg)',
                        border: 'none',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                        color: 'var(--color-white)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-bold)',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)',
                        boxShadow: 'var(--shadow-md)',
                        opacity: savingAddress ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!savingAddress) {
                          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!savingAddress) {
                          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {savingAddress ? '保存中...' : '保存地址'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
}

const cardStyle: React.CSSProperties = {
  maxWidth: 980,
  margin: '0 auto',
  width: '100%',
  padding: 28,
  borderRadius: 24,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
  fontWeight: 800,
  fontSize: 12,
}

const titleStyle: React.CSSProperties = {
  margin: '14px 0 0',
  fontSize: 34,
  lineHeight: 1.2,
  color: '#111827',
}

const descStyle: React.CSSProperties = {
  marginTop: 12,
  color: '#6b7280',
  lineHeight: 1.8,
}

const loadingStyle: React.CSSProperties = {
  marginTop: 24,
  padding: 24,
  borderRadius: 18,
  background: '#f9fafb',
  color: '#6b7280',
  textAlign: 'center',
}

const heroInfoStyle: React.CSSProperties = {
  marginTop: 24,
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: 18,
  borderRadius: 20,
  background: 'linear-gradient(135deg, #eef6ff, #ffffff 60%, #fff8f1)',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 14px 30px rgba(15,23,42,0.04)',
}

const heroAvatarStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  background: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 30,
  boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
}

const heroNameStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  color: '#111827',
}

const heroSubStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#6b7280',
  lineHeight: 1.7,
}

const sectionWrapStyle: React.CSSProperties = {
  marginTop: 24,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: '#111827',
  marginBottom: 14,
}

const sectionDescStyle: React.CSSProperties = {
  marginTop: -4,
  marginBottom: 14,
  color: '#6b7280',
  lineHeight: 1.7,
}

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 14,
}

const summaryCardStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  border: '1px solid rgba(15,23,42,0.06)',
  background: '#f9fafb',
  cursor: 'pointer',
  textAlign: 'left',
  boxShadow: '0 10px 24px rgba(15,23,42,0.04)',
  transition: 'transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease',
}

const hoverSummaryCardStyle: React.CSSProperties = {
  transform: 'translateY(-6px)',
  boxShadow: '0 20px 38px rgba(15,23,42,0.10)',
  border: '1px solid rgba(37,99,235,0.14)',
}

const summaryLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#9ca3af',
  fontWeight: 700,
}

const summaryValueStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 28,
  color: '#111827',
  fontWeight: 900,
}

const summaryDescStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#6b7280',
  lineHeight: 1.7,
}

const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 14,
}

const bodyInfoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 14,
}

const infoCardStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 18,
  background: '#f9fafb',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 8px 18px rgba(15,23,42,0.03)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#9ca3af',
  fontWeight: 700,
  marginBottom: 8,
}

const valueStyle: React.CSSProperties = {
  fontSize: 16,
  color: '#111827',
  fontWeight: 800,
  lineHeight: 1.6,
  wordBreak: 'break-word',
}

const formGridStyle: React.CSSProperties = {
  marginTop: 24,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
}

const formWrapStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 20,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 10px 24px rgba(15,23,42,0.03)',
}

const formTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  color: '#111827',
}

const formHintStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#6b7280',
  lineHeight: 1.8,
}

const inputLabelStyle: React.CSSProperties = {
  marginBottom: 8,
  fontWeight: 700,
  color: '#374151',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 48,
  padding: '0 14px',
  borderRadius: 14,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

const focusedInputStyle: React.CSSProperties = {
  border: '1px solid rgba(37,99,235,0.45)',
  boxShadow: '0 0 0 4px rgba(37,99,235,0.10)',
}

const actionRowStyle: React.CSSProperties = {
  marginTop: 18,
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
}

const saveBtnStyle: React.CSSProperties = {
  minWidth: 130,
  height: 46,
  padding: '0 18px',
  borderRadius: 14,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
  color: '#fff',
  fontWeight: 900,
  cursor: 'pointer',
  boxShadow: '0 12px 24px rgba(37,99,235,0.18)',
  transition: 'transform 0.24s ease, box-shadow 0.24s ease',
}

const hoverSaveBtnStyle: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 18px 30px rgba(37,99,235,0.24)',
}

const msgStyle: React.CSSProperties = {
  marginTop: 18,
  minHeight: 24,
  fontWeight: 800,
  lineHeight: 1.7,
  transition: 'all 0.2s ease',
}

const successMsgStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 14,
  background: 'rgba(22,163,74,0.08)',
  border: '1px solid rgba(22,163,74,0.16)',
  color: '#16a34a',
}

const errorMsgStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 14,
  background: 'rgba(234,88,12,0.08)',
  border: '1px solid rgba(234,88,12,0.16)',
  color: '#ea580c',
}