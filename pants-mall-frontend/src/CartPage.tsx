import { useEffect, useMemo, useState } from 'react'
import {
  listCart,
  removeCartItem,
  updateCartItem,
  type CartItem,
} from './api/cart'
import { createOrderWithAddress } from './api/orders'
import {
  listMyAddresses,
  saveAddress,
  deleteAddress,
  type AddressItem,
} from './api/address'
import { chinaRegions, type Province, type City, type Region } from './utils/chinaRegions'
import './styles/cart.css'

function formatPrice(v: number) {
  if (!Number.isFinite(v)) return '--'
  return v.toFixed(2)
}

function resolveImageUrl(url?: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `http://localhost:8081${url}`
}

function getDisplayTitle(item: CartItem) {
  if (item.spuName && String(item.spuName).trim()) return String(item.spuName)
  if (item.title && String(item.title).trim()) return String(item.title)
  return '裤装商品'
}

function buildAddressText(item: AddressItem) {
  return `${item.province || ''}${item.city || ''}${item.district || ''}${item.detail || ''}`
}

type Props = {
  onGoOrders?: () => void
}

export default function CartPage({ onGoOrders }: Props) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [changingId, setChangingId] = useState<string | number | null>(null)

  const [addresses, setAddresses] = useState<AddressItem[]>([])
  const [addressLoading, setAddressLoading] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<
    string | number | null
  >(null)

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

  const [selectedItemIds, setSelectedItemIds] = useState<(string | number)[]>(
    []
  )

  async function load() {
    setLoading(true)
    try {
      const data = await listCart()
      const next = Array.isArray(data) ? data : []
      setItems(next)

      setSelectedItemIds((prev) => {
        const validIds = next
          .map((item) => item.id)
          .filter((id): id is string | number => id !== undefined && id !== null)

        if (prev.length === 0) {
          return validIds
        }

        return prev.filter((id) =>
          validIds.some((validId) => String(validId) === String(id))
        )
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadAddresses() {
    setAddressLoading(true)
    try {
      const data = await listMyAddresses()
      const next = Array.isArray(data) ? data : []
      setAddresses(next)

      const defaultOne =
        next.find((x) => Number(x.isDefault || 0) === 1) || next[0] || null

      setSelectedAddressId((prev) => {
        if (prev != null && next.some((x) => String(x.id) === String(prev))) {
          return prev
        }
        return defaultOne?.id ?? null
      })
    } finally {
      setAddressLoading(false)
    }
  }

  useEffect(() => {
    load()
    loadAddresses()
  }, [])

  const selectedItems = useMemo(() => {
    return items.filter((item) =>
      selectedItemIds.some((id) => String(id) === String(item.id))
    )
  }, [items, selectedItemIds])

  const totalPrice = useMemo(() => {
    return selectedItems.reduce((sum, x) => {
      const price = Number(x.price || 0)
      const qty = Number(x.quantity || 0)
      return sum + price * qty
    }, 0)
  }, [selectedItems])

  const allSelectableIds = useMemo(() => {
    return items
      .map((item) => item.id)
      .filter((id): id is string | number => id !== undefined && id !== null)
  }, [items])

  const isAllSelected = useMemo(() => {
    if (allSelectableIds.length === 0) return false
    return allSelectableIds.every((id) =>
      selectedItemIds.some((selectedId) => String(selectedId) === String(id))
    )
  }, [allSelectableIds, selectedItemIds])

  function toggleSelectItem(id?: string | number) {
    if (id === undefined || id === null) return

    setSelectedItemIds((prev) => {
      const exists = prev.some((x) => String(x) === String(id))
      if (exists) {
        return prev.filter((x) => String(x) !== String(id))
      }
      return [...prev, id]
    })
  }

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedItemIds([])
      return
    }
    setSelectedItemIds(allSelectableIds)
  }

  async function handleRemove(id?: string | number) {
    if (id === undefined || id === null) {
      alert('购物车项 id 不存在')
      return
    }

    setChangingId(id)
    try {
      await removeCartItem(id)
      setSelectedItemIds((prev) =>
        prev.filter((selectedId) => String(selectedId) !== String(id))
      )
      await load()
    } finally {
      setChangingId(null)
    }
  }

  async function handleChangeQuantity(
    id: string | number | undefined,
    nextQty: number
  ) {
    if (id === undefined || id === null) {
      alert('购物车项 id 不存在')
      return
    }

    if (!Number.isFinite(nextQty)) {
      alert('数量格式不正确')
      return
    }

    setChangingId(id)
    try {
      await updateCartItem(id, nextQty)
      await load()
    } finally {
      setChangingId(null)
    }
  }

  async function handleMinus(item: CartItem) {
    const id = item.id
    const qty = Number(item.quantity || 0)
    const nextQty = qty - 1

    if (nextQty <= 0) {
      await handleRemove(id)
      return
    }

    await handleChangeQuantity(id, nextQty)
  }

  async function handlePlus(item: CartItem) {
    const id = item.id
    const qty = Number(item.quantity || 0)
    const stock = Number(item.stock || 0)

    if (stock <= 0) {
      alert('当前商品已无库存')
      return
    }

    const nextQty = qty + 1
    if (nextQty > stock) {
      alert(`购买数量不能超过库存，当前库存为 ${stock}`)
      return
    }

    await handleChangeQuantity(id, nextQty)
  }

  async function handleQtyInputBlur(
    id: string | number | undefined,
    value: string
  ) {
    const trimmed = value.trim()

    const current = items.find((x) => String(x.id) === String(id))
    const stock = Number(current?.stock || 0)

    if (trimmed === '') {
      await handleRemove(id)
      return
    }

    const nextQty = Number(trimmed)

    if (!Number.isInteger(nextQty)) {
      alert('数量必须是整数')
      await load()
      return
    }

    if (nextQty <= 0) {
      await handleRemove(id)
      return
    }

    if (stock > 0 && nextQty > stock) {
      alert(`购买数量不能超过库存，当前库存为 ${stock}`)
      await load()
      return
    }

    await handleChangeQuantity(id, nextQty)
  }

  function handleQtyInputChange(
    id: string | number | undefined,
    value: string
  ) {
    setItems((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(id)) return item

        if (value === '') {
          return { ...item, quantity: '' as never }
        }

        const onlyDigits = value.replace(/[^\d]/g, '')
        return {
          ...item,
          quantity: onlyDigits === '' ? ('' as never) : Number(onlyDigits),
        }
      })
    )
  }

  function resetAddressForm() {
    setReceiver('')
    setPhone('')
    setProvince('')
    setCity('')
    setDistrict('')
    setDetail('')
    setIsDefault(false)
  }

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

  async function handleSaveAddress() {
    const errText = validateAddressForm()
    if (errText) {
      alert(errText)
      return
    }

    setSavingAddress(true)
    try {
      const addressData: any = {
        receiver: receiver.trim(),
        phone: phone.trim(),
        province: province.trim(),
        city: city.trim(),
        district: district.trim(),
        detail: detail.trim(),
        isDefault: isDefault ? 1 : 0,
      }
      
      if (editingAddressId) {
        addressData.id = editingAddressId
      }
      
      const resp = await saveAddress(addressData)

      if (resp.code !== 200) {
        alert(resp.msg || '地址保存失败')
        return
      }

      resetAddressForm()
      setShowAddressModal(false)
      setEditingAddressId(null)
      await loadAddresses()
      alert(editingAddressId ? '地址更新成功' : '地址保存成功')
    } catch (e: any) {
      alert(e?.response?.data?.msg || e?.message || '地址保存失败')
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

      await loadAddresses()
      alert('地址删除成功')
    } catch (e: any) {
      alert(e?.response?.data?.msg || e?.message || '地址删除失败')
    }
  }

  async function handleCheckout() {
    if (items.length === 0) {
      alert('购物车为空')
      return
    }

    if (selectedAddressId == null) {
      alert('请先选择收货地址')
      return
    }

    if (selectedItems.length === 0) {
      alert('请先勾选要下单的商品')
      return
    }

    const orderItems: { skuId: string | number; quantity: number }[] = []

    for (const x of selectedItems) {
      const skuId = x.skuId ?? x.id
      if (skuId === undefined || skuId === null) continue

      orderItems.push({
        skuId: String(skuId),
        quantity: Number(x.quantity || 1),
      })
    }

    if (orderItems.length === 0) {
      alert('没有可下单的商品')
      return
    }

    setSubmitting(true)
    try {
      const orderId = await createOrderWithAddress({
        addressId: String(selectedAddressId),
        items: orderItems,
      })

      if (
        orderId === null ||
        orderId === undefined ||
        String(orderId).trim() === ''
      ) {
        throw new Error('后端没有返回订单ID，本次下单视为失败')
      }

      alert(`下单成功，订单ID：${orderId}`)
      if (typeof onGoOrders === 'function') {
        onGoOrders()
      }
    } catch (e: any) {
      alert(e?.response?.data?.msg || e?.message || '下单失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="cart-page">
      <section className="cart-header">
        <div className="cart-header-content">
          <h1 className="cart-header-title">购物车</h1>
          <div className="cart-header-sub">
            共 {items.length} 件商品
          </div>
        </div>
        <button className="cart-refresh-btn" onClick={load}>
          {loading ? '加载中...' : '刷新'}
        </button>
      </section>

      <section className="cart-address-section">
        <div className="cart-section-header">
          <h2 className="cart-section-title">收货地址</h2>
          <button
            type="button"
            className="cart-add-address-btn"
            onClick={() => setShowAddressModal(true)}
          >
            新增地址
          </button>
        </div>

        {addressLoading ? (
          <div className="cart-address-empty">地址加载中...</div>
        ) : addresses.length === 0 ? (
          <div className="cart-address-empty">暂无收货地址，请先新增地址</div>
        ) : (
          <div className="cart-address-grid">
            {addresses.map((addr, idx) => {
              const active =
                selectedAddressId != null &&
                String(selectedAddressId) === String(addr.id)

              return (
                <div key={String(addr.id ?? idx)} className={`cart-address-card ${active ? 'active' : ''}`}>
                  <div style={{
                    width: '100%',
                    height: '100%'
                  }}>
                    <button
                      type="button"
                      onClick={() => setSelectedAddressId(addr.id ?? null)}
                      className="cart-address-select-btn"
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        padding: 0,
                        marginBottom: 12
                      }}
                    >
                      <div className="cart-address-card-top">
                        <div className="cart-address-name">
                          {addr.receiver || '-'}　{addr.phone || '-'}
                        </div>
                        {Number(addr.isDefault || 0) === 1 ? (
                          <span className="cart-default-badge">默认</span>
                        ) : null}
                      </div>

                      <div className="cart-address-text">
                        {buildAddressText(addr) || '-'}
                      </div>
                    </button>
                    <div className="cart-address-actions" style={{
                      display: 'flex',
                      gap: 'var(--spacing-2)',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAddress(addr);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-white)',
                          color: 'var(--color-text-primary)',
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-bold)',
                          cursor: 'pointer',
                          boxShadow: 'var(--shadow-sm)',
                          transition: 'var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAddress(addr.id!);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--color-error)',
                          background: 'var(--color-white)',
                          color: 'var(--color-error)',
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-bold)',
                          cursor: 'pointer',
                          boxShadow: 'var(--shadow-sm)',
                          transition: 'var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 新增地址弹窗 */}
      {showAddressModal && (
        <div className="cart-modal-overlay">
          <div className="cart-modal">
            <div className="cart-modal-header">
              <h3 className="cart-modal-title">{editingAddressId ? '编辑收货地址' : '新增收货地址'}</h3>
              <button
                type="button"
                className="cart-modal-close"
                onClick={() => {
                  resetAddressForm()
                  setEditingAddressId(null)
                  setShowAddressModal(false)
                }}
              >
                ✕
              </button>
            </div>
            <div className="cart-modal-body">
              <div className="cart-address-form-grid">
                <div className="cart-field-block">
                  <label className="cart-field-label">收货人</label>
                  <input
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    placeholder="例如：张三"
                    className="cart-input"
                  />
                </div>

                <div className="cart-field-block">
                  <label className="cart-field-label">手机号</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="例如：13800138000"
                    className="cart-input"
                  />
                </div>

                <div className="cart-field-block">
                  <label className="cart-field-label">省</label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="cart-input"
                  >
                    <option value="">请选择省份</option>
                    {chinaRegions.map((p) => (
                      <option key={p.code} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cart-field-block">
                  <label className="cart-field-label">市</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="cart-input"
                    disabled={!province}
                  >
                    <option value="">请选择城市</option>
                    {selectedProvince?.cities.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cart-field-block">
                  <label className="cart-field-label">区/县</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="cart-input"
                    disabled={!city}
                  >
                    <option value="">请选择区/县</option>
                    {selectedCity?.districts.map((d) => (
                      <option key={d.code} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cart-field-block full-width">
                  <label className="cart-field-label">详细地址</label>
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="例如：中山东路1号"
                    className="cart-textarea"
                  />
                </div>
              </div>

              <label className="cart-checkbox-wrap">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <span>设为默认地址</span>
              </label>
            </div>
            <div className="cart-modal-footer">
              <button
                type="button"
                className="cart-modal-btn cart-modal-btn-secondary"
                onClick={() => {
                  resetAddressForm()
                  setEditingAddressId(null)
                  setShowAddressModal(false)
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="cart-modal-btn cart-modal-btn-primary"
                onClick={handleSaveAddress}
                disabled={savingAddress}
              >
                {savingAddress ? '保存中...' : '保存地址'}
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="cart-empty-box">
          <div className="cart-empty-title">购物车还是空的</div>
          <div className="cart-empty-sub">
            去商品页挑几条更适合你的裤子，再回来统一结算。
          </div>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-main">
            <div className="cart-select-bar">
              <label className="cart-select-all">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="cart-checkbox"
                />
                <span className="cart-select-all-text">全选</span>
              </label>
              <div className="cart-select-info">
                已选择 {selectedItems.length} 件商品
              </div>
            </div>

            <div className="cart-item-list">
              {items.map((x, idx) => {
                const price = Number(x.price || 0)
                const qty = Number(x.quantity || 0)
                const subtotal = price * qty
                const isChanging =
                  changingId !== null && String(changingId) === String(x.id)
                const isChecked = selectedItemIds.some(
                  (id) => String(id) === String(x.id)
                )

                const imageUrl = resolveImageUrl(x.coverUrl)

                return (
                  <div key={String(x.id ?? idx)} className="cart-item">
                    <div className="cart-item-check">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectItem(x.id)}
                        className="cart-checkbox"
                      />
                    </div>

                    <div className="cart-item-image">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={getDisplayTitle(x)}
                          className="cart-item-img"
                        />
                      ) : (
                        <div className="cart-item-image-placeholder">
                          <span className="cart-item-image-text">商品图片</span>
                        </div>
                      )}
                    </div>

                    <div className="cart-item-info">
                      <div className="cart-item-title">{getDisplayTitle(x)}</div>
                      <div className="cart-item-spec">
                        <span className="cart-item-spec-item">颜色：{x.color || '-'}</span>
                        <span className="cart-item-spec-item">尺码：{x.size || '-'}</span>
                        <span className="cart-item-spec-item">裤长：{x.lengthCm ?? '-'}cm</span>
                      </div>
                    </div>

                    <div className="cart-item-price">
                      <div className="cart-item-price-value">¥{formatPrice(price)}</div>
                    </div>

                    <div className="cart-item-quantity">
                      <div className="cart-item-quantity-control">
                        <button
                          type="button"
                          className="cart-item-quantity-btn cart-item-quantity-minus"
                          onClick={() => handleMinus(x)}
                          disabled={isChanging}
                        >
                          -
                        </button>
                        <input
                          value={String(x.quantity ?? '')}
                          onChange={(e) =>
                            handleQtyInputChange(x.id, e.target.value)
                          }
                          onBlur={(e) =>
                            handleQtyInputBlur(x.id, e.target.value)
                          }
                          className="cart-item-quantity-input"
                          disabled={isChanging}
                        />
                        <button
                          type="button"
                          className="cart-item-quantity-btn cart-item-quantity-plus"
                          onClick={() => handlePlus(x)}
                          disabled={
                            isChanging ||
                            Number(x.quantity || 0) >= Number(x.stock || 0)
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="cart-item-subtotal">
                      <div className="cart-item-subtotal-value">¥{formatPrice(subtotal)}</div>
                    </div>

                    <div className="cart-item-action">
                      <button
                        className="cart-item-remove-btn"
                        onClick={() => handleRemove(x.id)}
                        disabled={isChanging}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <aside className="cart-sidebar">
            <div className="cart-sidebar-header">
              <h3 className="cart-sidebar-title">订单结算</h3>
            </div>

            <div className="cart-sidebar-content">
              <div className="cart-sidebar-row">
                <span className="cart-sidebar-label">商品金额</span>
                <span className="cart-sidebar-value">¥{formatPrice(totalPrice)}</span>
              </div>
              
              <div className="cart-sidebar-row">
                <span className="cart-sidebar-label">运费</span>
                <span className="cart-sidebar-value">¥0.00</span>
              </div>

              <div className="cart-sidebar-total">
                <span className="cart-sidebar-total-label">合计</span>
                <span className="cart-sidebar-total-value">¥{formatPrice(totalPrice)}</span>
              </div>

              <div className="cart-sidebar-address">
                <span className="cart-sidebar-address-label">收货地址</span>
                <span className="cart-sidebar-address-value">
                  {selectedAddressId == null ? '未选择' : '已选择'}
                </span>
              </div>

              <button
                className="cart-checkout-btn"
                onClick={handleCheckout}
                disabled={submitting || selectedItems.length === 0}
              >
                {submitting ? '正在下单...' : `结算(${selectedItems.length})`}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

