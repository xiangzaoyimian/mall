import { useEffect, useMemo, useRef, useState } from 'react'
import {
  listOrders,
  getOrderDetail,
  payOrder,
  cancelOrder,
  finishOrder,
  type OrderVO,
  type OrderItemVO,
} from './api/orders'
import {
  createAfterSale,
  markAfterSaleReturned,
  type AfterSaleType,
} from './api/afterSale'
import { createReview } from './api/review'
import client from './api/client'
import './styles/orders.css'

type Props = {
  initialSelectedId?: string | number | null
  shouldScrollIntoView?: boolean
  onDidScrollIntoView?: () => void
  onSelectOrder?: (id: string | number | null) => void
  onOpenDetail?: (spuId: number) => void
}

type ReviewDraft = {
  orderId: string | number
  spuId: string | number
  skuId: string | number
  title: string
  purchaseSize: string
  images: string[]
}

function formatDateText(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatPrice(v?: number) {
  if (typeof v !== 'number' || Number.isNaN(v)) return '--'
  return v.toFixed(2)
}

function resolveImageUrl(url?: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `http://localhost:8081${url}`
}

function buildUploadPreviewUrl(url?: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `http://localhost:8081${url}`
}

function getStatusText(status?: string) {
  const s = String(status || '').toUpperCase()
  const map: Record<string, string> = {
    CREATED: '待支付',
    PAID: '已支付',
    SHIPPED: '已发货',
    CANCELED: '已取消',
    FINISHED: '已完成',
    REFUNDED: '已退款',
  }
  return map[s] || status || '-'
}

function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    CREATED: 'status-badge-warning',
    PAID: 'status-badge-success',
    SHIPPED: 'status-badge-info',
    CANCELED: 'status-badge-danger',
    FINISHED: 'status-badge-primary',
    REFUNDED: 'status-badge-gray',
  }
  return map[status] || 'status-badge-gray'
}

function buildItemSpecText(item: OrderItemVO): string {
  const parts: string[] = []
  if (item.color) parts.push(String(item.color))
  if (item.size) parts.push(String(item.size))
  if (item.fitType) parts.push(String(item.fitType))
  return parts.join(' / ')
}

export default function OrdersPage({
  initialSelectedId,
  shouldScrollIntoView,
  onDidScrollIntoView,
  onSelectOrder,
  onOpenDetail,
}: Props) {
  const [orders, setOrders] = useState<OrderVO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | number | null>(
    initialSelectedId ?? null
  )
  const [detail, setDetail] = useState<OrderVO | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [showDetailModal, setShowDetailModal] = useState(false)

  const [afterSaleVisible, setAfterSaleVisible] = useState(false)
  const [afterSaleType, setAfterSaleType] = useState<AfterSaleType>('REFUND')
  const [afterSaleReason, setAfterSaleReason] = useState('')
  const [afterSaleDescription, setAfterSaleDescription] = useState('')
  const [afterSaleSubmitting, setAfterSaleSubmitting] = useState(false)

  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewSizeFeel, setReviewSizeFeel] = useState('')
  const [reviewLengthFeel, setReviewLengthFeel] = useState('')
  const [reviewFitFeel, setReviewFitFeel] = useState('')
  const [reviewFabricFeel, setReviewFabricFeel] = useState('')
  const [reviewPurchaseSize, setReviewPurchaseSize] = useState('')
  const [reviewAnonymous, setReviewAnonymous] = useState(false)
  const [reviewImages, setReviewImages] = useState<string[]>([])
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewUploading, setReviewUploading] = useState(false)

  const layoutSectionRef = useRef<HTMLDivElement | null>(null)
  const orderListViewportRef = useRef<HTMLDivElement | null>(null)
  const orderCardRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const restoredOnceRef = useRef(false)

  const selectedOrder = useMemo(() => {
    if (selectedId == null) return null
    return orders.find((o) => String(o.id) === String(selectedId)) || null
  }, [orders, selectedId])

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders
    
    const statusMap: Record<string, string> = {
      'unpaid': 'CREATED',
      'paid': 'PAID',
      'shipped': 'SHIPPED',
      'finished': 'FINISHED',
      'canceled': 'CANCELED',
      'refunded': 'REFUNDED'
    }
    
    const targetStatus = statusMap[activeTab]
    if (!targetStatus) return orders
    
    return orders.filter((o) => String(o.status || '').toUpperCase() === targetStatus)
  }, [orders, activeTab])

  const totalOrders = orders.length
  const createdCount = orders.filter((o) =>
    String(o.status || '').toUpperCase() === 'CREATED'
  ).length
  const paidCount = orders.filter((o) =>
    String(o.status || '').toUpperCase() === 'PAID'
  ).length
  const finishedCount = orders.filter((o) =>
    String(o.status || '').toUpperCase() === 'FINISHED'
  ).length

  async function refreshList() {
    setLoading(true)
    setError('')
    try {
      const data = await listOrders()
      setOrders(Array.isArray(data.list) ? data.list : [])
    } catch (e: unknown) {
      setError((e as any)?.response?.data?.msg || (e as Error)?.message || '加载订单列表失败')
    } finally {
      setLoading(false)
    }
  }

  async function loadDetail(
    id: string | number,
    options?: { syncParent?: boolean }
  ) {
    setDetailLoading(true)
    try {
      const data = await getOrderDetail(id)
      setDetail(data || null)
      setSelectedId(id)
      if (options?.syncParent !== false) {
        onSelectOrder?.(id)
      }
      setShowDetailModal(true)
    } catch (e: unknown) {
      setError((e as any)?.response?.data?.msg || (e as Error)?.message || '加载订单详情失败')
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function doAction(action: 'pay' | 'cancel' | 'finish', id: string | number) {
    setError('')
    setActionLoading(true)
    try {
      if (action === 'pay') {
        const result = await payOrder(id)
        if (result.code !== 200) throw new Error(result.msg || '支付失败')
        alert('支付成功')
      }
      if (action === 'cancel') {
        const result = await cancelOrder(id)
        if (result.code !== 200) throw new Error(result.msg || '取消失败')
        alert('取消成功')
      }
      if (action === 'finish') {
        const result = await finishOrder(id)
        if (result.code !== 200) throw new Error(result.msg || '确认收货失败')
        alert('确认收货成功')
      }
      await refreshList()
      await loadDetail(id)
    } catch (e: unknown) {
      setError((e as any)?.response?.data?.msg || (e as Error)?.message || '操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  function getAfterSaleTypeText(type?: string) {
    const t = String(type || '').toUpperCase()
    if (t === 'REFUND') return '退款'
    if (t === 'RETURN_REFUND') return '退货退款'
    return type || '-'  
  }

  function getAfterSaleStatusText(status?: string, type?: string, orderStatus?: string) {
    const s = String(status || '').toUpperCase()
    const t = String(type || '').toUpperCase()
    const os = String(orderStatus || '').toUpperCase()

    if (s === 'PENDING') return '待审核'
    if (s === 'APPROVED') {
      if (t === 'RETURN_REFUND') return '审核通过，待退货'
      if (t === 'REFUND' && os === 'REFUNDED') return '退款完成'
      return '审核通过'
    }
    if (s === 'RETURNED') return '用户已退货，待商家确认收货退款'
    if (s === 'COMPLETED') return '售后已完成'
    if (s === 'REJECTED') return '审核已拒绝'
    return status || '-'  
  }

  function openAfterSaleDialog() {
    if (!detail?.id) {
      alert('订单信息不存在')
      return
    }

    const status = String(detail.status || '').toUpperCase()
    if (status === 'PAID') {
      setAfterSaleType('REFUND')
    } else if (status === 'SHIPPED' || status === 'FINISHED') {
      setAfterSaleType('RETURN_REFUND')
    } else {
      alert('当前订单状态不支持申请售后')
      return
    }

    setAfterSaleReason('')
    setAfterSaleDescription('')
    setAfterSaleVisible(true)
  }

  function closeAfterSaleDialog() {
    if (afterSaleSubmitting) return
    setAfterSaleVisible(false)
    setAfterSaleType('REFUND')
    setAfterSaleReason('')
    setAfterSaleDescription('')
  }

  async function submitAfterSale() {
    if (!detail?.id) return

    const reason = String(afterSaleReason || '').trim()
    const description = String(afterSaleDescription || '').trim()

    if (!reason) {
      alert('申请原因不能为空')
      return
    }
    if (reason.length < 2) {
      alert('申请原因至少填写2个字符')
      return
    }
    if (reason.length > 255) {
      alert('申请原因不能超过255个字符')
      return
    }
    if (description.length > 1000) {
      alert('申请说明不能超过1000个字符')
      return
    }

    setAfterSaleSubmitting(true)
    try {
      const resp = await createAfterSale(detail.id, {
        type: afterSaleType,
        reason,
        description,
      })

      if (resp?.code !== 200) {
        throw new Error(resp?.msg || '提交售后申请失败')
      }

      alert(
        afterSaleType === 'REFUND'
          ? '退款申请已提交，请等待管理员处理'
          : '退货退款申请已提交，请等待管理员审核'
      )
      closeAfterSaleDialog()
      await refreshList()
      await loadDetail(detail.id)
    } catch (e: unknown) {
      alert((e as any)?.response?.data?.msg || (e as Error)?.message || '提交售后申请失败')
    } finally {
      setAfterSaleSubmitting(false)
    }
  }

  async function submitReturned() {
    if (!detail?.id) return

    try {
      const ok = window.confirm('确认你已经将商品寄回了吗？')
      if (!ok) return

      const resp = await markAfterSaleReturned(detail.id)
      if (resp?.code !== 200) {
        throw new Error(resp?.msg || '提交退货状态失败')
      }

      alert('已标记为"我已退货"，请等待管理员确认收货并退款')
      await refreshList()
      await loadDetail(detail.id)
    } catch (e: unknown) {
      alert((e as any)?.response?.data?.msg || (e as Error)?.message || '提交退货状态失败')
    }
  }

  function extractPurchaseSize(item: OrderItemVO) {
    if (item.size) return String(item.size)
    const raw = String(item.skuTitle || '').trim()
    if (!raw) return ''
    const parts = raw.split(/\s+/).filter(Boolean)
    if (parts.length > 1) {
      return parts[parts.length - 1]
    }
    return ''
  }

  function openReviewDialog(item: OrderItemVO) {
    if (!detail?.id) {
      alert('订单信息不存在')
      return
    }

    const spuId = item.spuId
    const skuId = item.skuId

    if (!spuId || !skuId) {
      alert('当前商品缺少评价所需标识，无法评价')
      return
    }

    const autoPurchaseSize = extractPurchaseSize(item)

    setReviewDraft({
      orderId: detail.id,
      spuId,
      skuId,
      title: item.spuName || item.title || item.skuTitle || `SKU ${String(skuId)}`,
      purchaseSize: autoPurchaseSize,
      images: [],
    })
    setReviewRating(5)
    setReviewContent('')
    setReviewSizeFeel('')
    setReviewLengthFeel('')
    setReviewFitFeel('')
    setReviewFabricFeel('')
    setReviewPurchaseSize(autoPurchaseSize)
    setReviewAnonymous(false)
    setReviewImages([])
  }

  function closeReviewDialog() {
    if (reviewSubmitting || reviewUploading) return
    setReviewDraft(null)
    setReviewRating(5)
    setReviewContent('')
    setReviewSizeFeel('')
    setReviewLengthFeel('')
    setReviewFitFeel('')
    setReviewFabricFeel('')
    setReviewPurchaseSize('')
    setReviewAnonymous(false)
    setReviewImages([])
  }

  async function uploadReviewImage(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const resp = await client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    const data = resp?.data
    if (!data || (data.code !== 200 && data.code !== 0)) {
      throw new Error(data?.msg || '图片上传失败')
    }

    return String(data.data || '')
  }

  async function handleReviewImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''

    if (!files.length) return

    const remain = 3 - reviewImages.length
    if (remain <= 0) {
      alert('评价图片最多上传3张')
      return
    }

    const picked = files.slice(0, remain)
    if (files.length > remain) {
      alert('最多只能上传3张，已自动截取前3张')
    }

    setReviewUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of picked) {
        const url = await uploadReviewImage(file)
        if (url) uploaded.push(url)
      }
      setReviewImages((prev) => [...prev, ...uploaded].slice(0, 3))
    } catch (e: unknown) {
      alert((e as any)?.response?.data?.msg || (e as Error)?.message || '图片上传失败')
    } finally {
      setReviewUploading(false)
    }
  }

  function removeReviewImage(index: number) {
    setReviewImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function submitReview() {
    if (!reviewDraft) return

    const content = String(reviewContent || '').trim()
    const purchaseSize = String(reviewPurchaseSize || '').trim()

    if (reviewRating < 1 || reviewRating > 5) {
      alert('评分范围必须为1到5')
      return
    }
    if (reviewImages.length > 3) {
      alert('评价图片最多上传3张')
      return
    }

    setReviewSubmitting(true)
    try {
      const resp = await createReview({
        orderId: reviewDraft.orderId,
        spuId: reviewDraft.spuId,
        skuId: reviewDraft.skuId,
        rating: reviewRating,
        content,
        sizeFeel: reviewSizeFeel || undefined,
        lengthFeel: reviewLengthFeel || undefined,
        fitFeel: reviewFitFeel || undefined,
        fabricFeel: reviewFabricFeel || undefined,
        purchaseSize: purchaseSize || undefined,
        anonymous: reviewAnonymous ? 1 : 0,
        images: reviewImages,
      })

      if (resp?.code !== 200) {
        throw new Error(resp?.msg || '评价提交失败')
      }

      alert(resp?.data || '评价提交成功')
      closeReviewDialog()
      if (detail?.id != null) {
        await loadDetail(detail.id)
      }
    } catch (e: unknown) {
      alert((e as any)?.response?.data?.msg || (e as Error)?.message || '评价提交失败')
    } finally {
      setReviewSubmitting(false)
    }
  }

  function scrollOrderListToSelected(nextId: string | number | null) {
    if (nextId == null) return

    const layoutEl = layoutSectionRef.current
    const viewport = orderListViewportRef.current
    const target = orderCardRefs.current[String(nextId)]

    if (!layoutEl || !viewport || !target) return

    const layoutRect = layoutEl.getBoundingClientRect()
    const currentPageTop = window.scrollY || window.pageYOffset || 0
    const pageOffsetTop = 96
    const pageTop = Math.max(currentPageTop + layoutRect.top - pageOffsetTop, 0)

    window.scrollTo({
      top: pageTop,
      behavior: 'smooth',
    })

    window.setTimeout(() => {
      const targetTop = target.offsetTop
      const targetHeight = target.offsetHeight
      const viewportHeight = viewport.clientHeight

      const nextScrollTop = Math.max(
        targetTop - (viewportHeight - targetHeight) / 2,
        0
      )

      viewport.scrollTo({
        top: nextScrollTop,
        behavior: 'smooth',
      })
    }, 220)
  }

  useEffect(() => {
    refreshList()
  }, [])

  useEffect(() => {
    if (restoredOnceRef.current || initialSelectedId == null || orders.length === 0) {
      return
    }

    const exists = orders.some(
      (o) => String(o.id) === String(initialSelectedId)
    )

    if (!exists) {
      restoredOnceRef.current = true
      return
    }

    restoredOnceRef.current = true
    // 只设置选中的订单ID，不自动显示弹窗
    setSelectedId(initialSelectedId)
  }, [initialSelectedId, orders])

  useEffect(() => {
    if (initialSelectedId == null) return
    setSelectedId(initialSelectedId)
  }, [initialSelectedId])

  useEffect(() => {
    if (!shouldScrollIntoView) return
    if (!selectedId) return
    if (orders.length === 0) return

    const timer = window.setTimeout(() => {
      scrollOrderListToSelected(selectedId)
      onDidScrollIntoView?.()
    }, 120)

    return () => {
      window.clearTimeout(timer)
    }
  }, [shouldScrollIntoView, selectedId, orders, onDidScrollIntoView])

  const detailStatus = String(detail?.status || '').toUpperCase()
  const showPayBtn = detailStatus === 'CREATED'
  const showCancelBtn = detailStatus === 'CREATED'
  const showFinishBtn = detailStatus === 'SHIPPED'
  const showReviewBtn = detailStatus === 'FINISHED'

  const afterSaleInfo = detail?.afterSale || null
  const hasAfterSale = Boolean(afterSaleInfo)

  const showAfterSaleBtn = !hasAfterSale && (detailStatus === 'PAID' || detailStatus === 'SHIPPED' || detailStatus === 'FINISHED')
  const showMarkReturnedBtn = hasAfterSale && String(afterSaleInfo?.type || '').toUpperCase() === 'RETURN_REFUND' && String(afterSaleInfo?.status || '').toUpperCase() === 'APPROVED' && detailStatus !== 'REFUNDED'

  function getItemMainTitle(item: OrderItemVO) {
    return item.spuName || item.title || item.skuTitle || `SKU ${String(item.skuId)}`
  }

  function getItemSubTitle(item: OrderItemVO) {
    const specText = buildItemSpecText(item)
    if (specText) return specText
    if (item.spuName && item.skuTitle && item.spuName !== item.skuTitle) {
      return item.skuTitle
    }
    return ''
  }

  function isItemReviewed(item: OrderItemVO) {
    return Boolean(item.reviewed)
  }

  function openProductDetail(item: OrderItemVO) {
    if (!item.spuId) {
      alert('当前商品缺少 spuId，无法进入详情页')
      return
    }
    if (typeof onOpenDetail === 'function') {
      onOpenDetail(Number(item.spuId))
    }
  }

  return (
    <div className="orders-page">
      <section className="orders-header">
        <div className="orders-header-content">
          <div className="orders-header-tag">ORDER CENTER</div>
          <h1 className="orders-header-title">我的订单</h1>
          <p className="orders-header-sub">
            在这里查看订单状态、支付订单、取消订单、确认收货，并可在符合条件时提交退款或退货退款申请；退货退款审核通过后，还可继续提交"我已退货"。
          </p>
        </div>
        <div className="orders-header-stats">
          <div className="orders-stats-card">
            <div className="orders-stats-value">{totalOrders}</div>
            <div className="orders-stats-label">全部订单</div>
            <div className="orders-stats-desc">历史订单总数</div>
          </div>
          <div className="orders-stats-card">
            <div className="orders-stats-value">{createdCount}</div>
            <div className="orders-stats-label">待支付</div>
            <div className="orders-stats-desc">等待支付处理</div>
          </div>
          <div className="orders-stats-card">
            <div className="orders-stats-value">{paidCount}</div>
            <div className="orders-stats-label">已支付/待收货</div>
            <div className="orders-stats-desc">支付后进行中</div>
          </div>
          <div className="orders-stats-card">
            <div className="orders-stats-value">{finishedCount}</div>
            <div className="orders-stats-label">已完成</div>
            <div className="orders-stats-desc">已结束订单</div>
          </div>
          <button className="orders-refresh-btn" onClick={refreshList} disabled={loading}>
            {loading ? '刷新中...' : '刷新订单'}
          </button>
        </div>
      </section>

      {error && <div className="orders-error">{error}</div>}

      <div ref={layoutSectionRef} className="orders-layout">
        <section className="orders-panel">
          <div className="orders-panel-header">
            <div>
              <div className="orders-panel-kicker">ORDER LIST</div>
              <div className="orders-panel-title">订单列表</div>
            </div>
            <div className="orders-count-badge">{filteredOrders.length}</div>
          </div>

          {/* 订单分类标签 */}
          <div className="orders-tabs">
            <button
              className={`orders-tab ${activeTab === 'all' ? 'orders-tab-active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              全部
              <span className="orders-tab-count">{orders.length}</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'unpaid' ? 'orders-tab-active' : ''}`}
              onClick={() => setActiveTab('unpaid')}
            >
              待支付
              <span className="orders-tab-count">{orders.filter(o => String(o.status || '').toUpperCase() === 'CREATED').length}</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'paid' ? 'orders-tab-active' : ''}`}
              onClick={() => setActiveTab('paid')}
            >
              已支付
              <span className="orders-tab-count">{orders.filter(o => String(o.status || '').toUpperCase() === 'PAID').length}</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'shipped' ? 'orders-tab-active' : ''}`}
              onClick={() => setActiveTab('shipped')}
            >
              已发货
              <span className="orders-tab-count">{orders.filter(o => String(o.status || '').toUpperCase() === 'SHIPPED').length}</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'finished' ? 'orders-tab-active' : ''}`}
              onClick={() => setActiveTab('finished')}
            >
              已完成
              <span className="orders-tab-count">{orders.filter(o => String(o.status || '').toUpperCase() === 'FINISHED').length}</span>
            </button>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="orders-empty">暂无订单</div>
          ) : (
            <div ref={orderListViewportRef} className="orders-order-list-viewport">
              <div className="orders-order-list">
                {filteredOrders.map((o: OrderVO) => {
                  return (
                    <button
                      key={String(o.id)}
                      ref={(el) => {
                        orderCardRefs.current[String(o.id)] = el
                      }}
                      onClick={() => {
                        if (o.id != null) {
                          loadDetail(o.id)
                        }
                      }}
                      className="orders-order-card"
                      type="button"
                    >
                      <div className="orders-order-card-top">
                        <div className="orders-order-info-main">
                          <div className="orders-order-no">订单号：{o.orderNo || String(o.id)}</div>
                          <div className="orders-order-meta">创建时间：{formatDateText(o.createdAt)}</div>
                          <div className="orders-order-preview-text">点击查看订单详情与商品明细</div>
                        </div>
                        <div className={`status-badge ${getStatusClass(o.status || '-')}`}>
                          {getStatusText(o.status)}
                        </div>
                      </div>
                      <div className="orders-order-bottom">
                        <div>
                          <div className="orders-mini-label">订单金额</div>
                          <div className="orders-order-amount">¥{formatPrice(Number(o.totalAmount || 0))}</div>
                        </div>
                        <div className="orders-order-extra-meta">
                          <div className="orders-order-hint">点击查看详情</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>

      </div>

      {/* 订单详情弹窗 */}
      {showDetailModal && (
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
            maxWidth: 900,
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
                  订单详情
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
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
              {detailLoading ? (
                <div className="orders-empty-large">加载详情中...</div>
              ) : detail ? (
                <>
                  <div className="orders-detail-summary">
                    <div className="orders-detail-amount-block">
                      <div className="orders-detail-amount-label">订单总金额</div>
                      <div className="orders-detail-amount-value">¥{formatPrice(Number(detail.totalAmount || 0))}</div>
                    </div>
                    <div className="orders-detail-status-wrap">
                      <div className="orders-detail-label">当前状态</div>
                      <div className={`status-badge ${getStatusClass(detailStatus || '-')}`}>
                        {getStatusText(detail.status)}
                      </div>
                    </div>
                  </div>

                  <div className="orders-detail-grid">
                    <div className="orders-info-card">
                      <div className="orders-label">订单 ID</div>
                      <div className="orders-value">{String(detail.id)}</div>
                    </div>
                    <div className="orders-info-card">
                      <div className="orders-label">订单号</div>
                      <div className="orders-value">{detail.orderNo || '-'}</div>
                    </div>
                    <div className="orders-info-card">
                      <div className="orders-label">创建时间</div>
                      <div className="orders-value">{formatDateText(detail.createdAt)}</div>
                    </div>
                    <div className="orders-info-card">
                      <div className="orders-label">订单状态</div>
                      <div className="orders-value">{getStatusText(detail.status)}</div>
                    </div>
                  </div>

                  {afterSaleInfo && (
                    <div className="orders-after-sale-info-card">
                      <div className="orders-after-sale-info-head">
                        <div className="orders-after-sale-info-title">售后信息</div>
                        <div className="orders-after-sale-info-badge">
                          {getAfterSaleStatusText(afterSaleInfo.status, afterSaleInfo.type, detail?.status)}
                        </div>
                      </div>
                      <div className="orders-after-sale-info-text">售后类型：{getAfterSaleTypeText(afterSaleInfo.type)}</div>
                      <div className="orders-after-sale-info-text">申请原因：{afterSaleInfo.reason || '-'}</div>
                      <div className="orders-after-sale-info-text">申请说明：{afterSaleInfo.description || '-'}</div>
                      <div className="orders-after-sale-info-text">审核备注：{afterSaleInfo.adminRemark || '-'}</div>
                      <div className="orders-after-sale-info-text">提交时间：{formatDateText(afterSaleInfo.createdAt)}</div>
                    </div>
                  )}

                  {(showPayBtn || showCancelBtn || showFinishBtn || showAfterSaleBtn || showMarkReturnedBtn || hasAfterSale) && (
                    <div className="orders-action-bar">
                      {showPayBtn && (
                        <button
                          className="orders-pay-btn"
                          onClick={() => {
                            if (detail.id != null) {
                              doAction('pay', detail.id)
                            }
                          }}
                          disabled={actionLoading}
                          type="button"
                        >
                          {actionLoading ? '处理中...' : '立即支付'}
                        </button>
                      )}
                      {showCancelBtn && (
                        <button
                          className="orders-cancel-btn"
                          onClick={() => {
                            if (detail.id != null) {
                              doAction('cancel', detail.id)
                            }
                          }}
                          disabled={actionLoading}
                          type="button"
                        >
                          {actionLoading ? '处理中...' : '取消订单'}
                        </button>
                      )}
                      {showFinishBtn && (
                        <button
                          className="orders-finish-btn"
                          onClick={() => {
                            if (detail.id != null) {
                              doAction('finish', detail.id)
                            }
                          }}
                          disabled={actionLoading}
                          type="button"
                        >
                          {actionLoading ? '处理中...' : '确认收货'}
                        </button>
                      )}
                      {showAfterSaleBtn && (
                        <button
                          className="orders-after-sale-btn"
                          onClick={openAfterSaleDialog}
                          disabled={actionLoading}
                          type="button"
                        >
                          {detailStatus === 'PAID' ? '申请退款' : '申请退货退款'}
                        </button>
                      )}
                      {showMarkReturnedBtn && (
                        <button
                          className="orders-after-sale-btn"
                          onClick={submitReturned}
                          disabled={actionLoading}
                          type="button"
                        >
                          我已退货
                        </button>
                      )}
                      {hasAfterSale && (
                        <div className="orders-after-sale-tip-box">
                          <div className="orders-after-sale-tip-title">
                            已提交售后：{getAfterSaleTypeText(afterSaleInfo?.type)}
                          </div>
                          <div className="orders-after-sale-tip-desc">
                            当前状态：{getAfterSaleStatusText(afterSaleInfo?.status, afterSaleInfo?.type, detail?.status)}
                          </div>
                          {String(afterSaleInfo?.adminRemark || '').trim() && (
                            <div className="orders-after-sale-tip-desc">
                              审核备注：{String(afterSaleInfo?.adminRemark || '').trim()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="orders-items-box">
                    <div className="orders-items-header">
                      <div className="orders-items-title">商品明细</div>
                      <div className="orders-items-count">
                        {Array.isArray(detail.items) ? detail.items.length : 0} 项
                      </div>
                    </div>

                    {Array.isArray(detail.items) && detail.items.length > 0 ? (
                      <div className="orders-item-list">
                        {detail.items.map((it: OrderItemVO, idx: number) => {
                          const imageUrl = resolveImageUrl(it.coverUrl)
                          const specText = getItemSubTitle(it)
                          return (
                            <div key={idx} className="orders-item-card">
                              <div className="orders-item-visual">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={getItemMainTitle(it)}
                                    className="orders-item-image"
                                  />
                                ) : (
                                  <>
                                    <div className="orders-item-visual-badge">PANTS</div>
                                    <div className="orders-item-visual-title">{getItemMainTitle(it)}</div>
                                  </>
                                )}
                              </div>
                              <div className="orders-item-body">
                                <div className="orders-item-title-row">
                                  <div className="orders-item-title-block">
                                    <div className="orders-item-title">{getItemMainTitle(it)}</div>
                                    {specText && <div className="orders-item-sub-title">{specText}</div>}
                                    {String(it.spuDescription || '').trim() && (
                                      <div className="orders-item-desc">{String(it.spuDescription || '').trim()}</div>
                                    )}
                                  </div>
                                  <div className="orders-item-action-group">
                                    <button
                                      type="button"
                                      className="orders-view-product-btn"
                                      onClick={() => openProductDetail(it)}
                                    >
                                      查看商品
                                    </button>
                                    {showReviewBtn && (
                                      isItemReviewed(it) ? (
                                        <button
                                          type="button"
                                          className="orders-review-btn orders-reviewed-btn"
                                          disabled
                                        >
                                          已评价
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          className="orders-review-btn"
                                          onClick={() => openReviewDialog(it)}
                                        >
                                          去评价
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                                <div className="orders-item-meta-grid">
                                  <div className="orders-item-meta-card">
                                    <span className="orders-item-meta-label">SKU ID</span>
                                    <span className="orders-item-meta-value">{String(it.skuId ?? '-')}</span>
                                  </div>
                                  <div className="orders-item-meta-card">
                                    <span className="orders-item-meta-label">数量</span>
                                    <span className="orders-item-meta-value">{String(it.quantity ?? '-')}</span>
                                  </div>
                                  <div className="orders-item-meta-card">
                                    <span className="orders-item-meta-label">单价</span>
                                    <span className="orders-item-meta-value">
                                      {typeof it.price === 'number' ? `¥${formatPrice(it.price)}` : '-'}
                                    </span>
                                  </div>
                                  <div className="orders-item-meta-card">
                                    <span className="orders-item-meta-label">小计</span>
                                    <span className="orders-item-meta-value">
                                      {typeof it.amount === 'number' ? `¥${formatPrice(it.amount)}` : '-'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="orders-empty">这个订单详情接口没有返回 items</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="orders-empty-large">
                  未拿到详情
                  <div className="orders-empty-sub-note">当前选中：{String(selectedOrder?.id ?? selectedId)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {reviewDraft && (
        <div className="orders-modal-mask">
          <div className="orders-modal-card">
            <div className="orders-modal-header">
              <div>
                <div className="orders-modal-kicker">REVIEW</div>
                <div className="orders-modal-title">商品评价</div>
              </div>
              <button
                type="button"
                className="orders-modal-close-btn"
                onClick={closeReviewDialog}
                disabled={reviewSubmitting || reviewUploading}
              >
                ×
              </button>
            </div>
            <div className="orders-modal-body">
              <div className="orders-modal-item-info">
                当前评价商品：
                <span className="orders-modal-item-strong">{reviewDraft.title}</span>
              </div>
              <div className="orders-review-section">
                <div className="orders-review-label">评分</div>
                <div className="orders-rating-wrap">
                  <div className="orders-rating-stars-row">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className={`orders-star-btn ${reviewRating >= n ? 'orders-star-btn-active' : ''}`}
                        disabled={reviewSubmitting || reviewUploading}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <div className="orders-rating-text-center">{reviewRating} 分</div>
                </div>
              </div>
              <div className="orders-review-section">
                <div className="orders-review-label">穿着感受</div>
                <div className="orders-structured-grid">
                  <div className="orders-field-card">
                    <div className="orders-field-label">尺码感受</div>
                    <select
                      value={reviewSizeFeel}
                      onChange={(e) => setReviewSizeFeel(e.target.value)}
                      className="orders-field-select"
                      disabled={reviewSubmitting || reviewUploading}
                    >
                      <option value="">请选择（可不填）</option>
                      <option value="偏小">偏小</option>
                      <option value="合适">合适</option>
                      <option value="偏大">偏大</option>
                    </select>
                  </div>
                  <div className="orders-field-card">
                    <div className="orders-field-label">裤长感受</div>
                    <select
                      value={reviewLengthFeel}
                      onChange={(e) => setReviewLengthFeel(e.target.value)}
                      className="orders-field-select"
                      disabled={reviewSubmitting || reviewUploading}
                    >
                      <option value="">请选择（可不填）</option>
                      <option value="偏短">偏短</option>
                      <option value="合适">合适</option>
                      <option value="偏长">偏长</option>
                    </select>
                  </div>
                  <div className="orders-field-card">
                    <div className="orders-field-label">版型感受</div>
                    <select
                      value={reviewFitFeel}
                      onChange={(e) => setReviewFitFeel(e.target.value)}
                      className="orders-field-select"
                      disabled={reviewSubmitting || reviewUploading}
                    >
                      <option value="">请选择（可不填）</option>
                      <option value="修身">修身</option>
                      <option value="合适">合适</option>
                      <option value="宽松">宽松</option>
                    </select>
                  </div>
                  <div className="orders-field-card">
                    <div className="orders-field-label">面料感受</div>
                    <select
                      value={reviewFabricFeel}
                      onChange={(e) => setReviewFabricFeel(e.target.value)}
                      className="orders-field-select"
                      disabled={reviewSubmitting || reviewUploading}
                    >
                      <option value="">请选择（可不填）</option>
                      <option value="偏硬">偏硬</option>
                      <option value="适中">适中</option>
                      <option value="偏软">偏软</option>
                    </select>
                  </div>
                  <div className="orders-field-card orders-field-card-full">
                    <div className="orders-field-label">购买尺码</div>
                    <input
                      value={reviewPurchaseSize}
                      onChange={(e) => setReviewPurchaseSize(e.target.value)}
                      placeholder="例如：L / XL / 30（可不填）"
                      className="orders-field-input"
                      maxLength={32}
                      disabled={reviewSubmitting || reviewUploading}
                    />
                  </div>
                  <div className="orders-field-card orders-field-card-full">
                    <label className="orders-anonymous-label">
                      <input
                        type="checkbox"
                        checked={reviewAnonymous}
                        onChange={(e) => setReviewAnonymous(e.target.checked)}
                        disabled={reviewSubmitting || reviewUploading}
                        className="orders-anonymous-checkbox"
                      />
                      <span>匿名评价</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="orders-review-section">
                <div className="orders-review-label">评价内容</div>
                <textarea
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  placeholder="说说这条裤子的版型、舒适度、尺码体验吧（可不填）"
                  className="orders-review-textarea"
                  maxLength={512}
                  disabled={reviewSubmitting || reviewUploading}
                />
                <div className="orders-review-count">{String(reviewContent || '').length}/512</div>
              </div>
              <div className="orders-review-section">
                <div className="orders-review-label">评价图片（最多3张）</div>
                <div className="orders-review-upload-row">
                  <label
                    className={`orders-review-upload-btn ${(reviewImages.length >= 3 || reviewUploading || reviewSubmitting) ? 'orders-review-upload-btn-disabled' : ''}`}
                  >
                    {reviewUploading ? '上传中...' : '选择图片'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={handleReviewImageChange}
                      disabled={reviewImages.length >= 3 || reviewUploading || reviewSubmitting}
                    />
                  </label>
                  <div className="orders-review-upload-hint">已上传 {reviewImages.length}/3 张</div>
                </div>
                {reviewImages.length > 0 && (
                  <div className="orders-review-image-list">
                    {reviewImages.map((img, index) => (
                      <div key={`${img}-${index}`} className="orders-review-image-card">
                        <img
                          src={buildUploadPreviewUrl(img)}
                          alt={`评价图片${index + 1}`}
                          className="orders-review-image"
                        />
                        <button
                          type="button"
                          className="orders-review-image-delete-btn"
                          onClick={() => removeReviewImage(index)}
                          disabled={reviewUploading || reviewSubmitting}
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="orders-modal-action-row">
              <button
                type="button"
                className="orders-modal-cancel-btn"
                onClick={closeReviewDialog}
                disabled={reviewSubmitting || reviewUploading}
              >
                取消
              </button>
              <button
                type="button"
                className="orders-modal-submit-btn"
                onClick={submitReview}
                disabled={reviewSubmitting || reviewUploading}
              >
                {reviewSubmitting ? '提交中...' : '提交评价'}
              </button>
            </div>
          </div>
        </div>
      )}

      {afterSaleVisible && (
        <div className="orders-modal-mask">
          <div className="orders-modal-card">
            <div className="orders-modal-header">
              <div>
                <div className="orders-modal-kicker">AFTER SALE</div>
                <div className="orders-modal-title">申请售后</div>
              </div>
              <button
                type="button"
                className="orders-modal-close-btn"
                onClick={closeAfterSaleDialog}
                disabled={afterSaleSubmitting}
              >
                ×
              </button>
            </div>
            <div className="orders-modal-body">
              <div className="orders-modal-item-info">
                当前订单：
                <span className="orders-modal-item-strong">{detail?.orderNo || detail?.id || '-'}</span>
              </div>
              <div className="orders-review-section">
                <div className="orders-review-label">售后类型</div>
                <select
                  value={afterSaleType}
                  onChange={(e) => setAfterSaleType(e.target.value as AfterSaleType)}
                  className="orders-field-select"
                  disabled={afterSaleSubmitting || detailStatus === 'PAID' || detailStatus === 'SHIPPED' || detailStatus === 'FINISHED'}
                >
                  {detailStatus === 'PAID' ? (
                    <option value="REFUND">退款</option>
                  ) : detailStatus === 'SHIPPED' || detailStatus === 'FINISHED' ? (
                    <option value="RETURN_REFUND">退货退款</option>
                  ) : (
                    <>
                      <option value="REFUND">退款</option>
                      <option value="RETURN_REFUND">退货退款</option>
                    </>
                  )}
                </select>
                <div className="orders-after-sale-hint">
                  {detailStatus === 'PAID'
                    ? '当前订单为已付款未发货状态，仅支持申请退款。'
                    : detailStatus === 'SHIPPED' || detailStatus === 'FINISHED'
                    ? '当前订单已发货或已完成，仅支持申请退货退款。审核通过后，请先退货，商家收到货后再退款。'
                    : '请根据订单状态选择售后类型。'}
                </div>
              </div>
              <div className="orders-review-section">
                <div className="orders-review-label">申请原因</div>
                <input
                  value={afterSaleReason}
                  onChange={(e) => setAfterSaleReason(e.target.value)}
                  placeholder="例如：不想要了 / 商品与预期不符 / 尺码不合适"
                  className="orders-field-input"
                  maxLength={255}
                  disabled={afterSaleSubmitting}
                />
              </div>
              <div className="orders-review-section">
                <div className="orders-review-label">申请说明</div>
                <textarea
                  value={afterSaleDescription}
                  onChange={(e) => setAfterSaleDescription(e.target.value)}
                  placeholder="请补充说明售后原因（可不填）"
                  className="orders-review-textarea"
                  maxLength={1000}
                  disabled={afterSaleSubmitting}
                />
                <div className="orders-review-count">{String(afterSaleDescription || '').length}/1000</div>
              </div>
            </div>
            <div className="orders-modal-action-row">
              <button
                type="button"
                className="orders-modal-cancel-btn"
                onClick={closeAfterSaleDialog}
                disabled={afterSaleSubmitting}
              >
                取消
              </button>
              <button
                type="button"
                className="orders-modal-submit-btn"
                onClick={submitAfterSale}
                disabled={afterSaleSubmitting}
              >
                {afterSaleSubmitting ? '提交中...' : '提交申请'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
