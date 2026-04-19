import { useEffect, useMemo, useState } from 'react'
import { getProductDetail } from './api/products'
import { getOptions } from './api/pants'
import client from './api/client'
import { addFavorite, listFavorites, removeFavorite } from './api/favorites'
import { createOrderWithAddress } from './api/orders'
import { listMyAddresses } from './api/address'
import { listReviewsBySpuId, type ReviewItemVO } from './api/review'
import './styles/product-detail.css'

type SkuItem = {
  id?: string | number
  skuId?: string | number
  spuId: string | number
  title: string
  price: number
  stock: number
  color: string
  size: string
  lengthCm: number
  waistCm: number
  legOpeningCm: number
  fitType: string
}

type Props = {
  spuId: string | number
  onBack?: () => void
  onGoOrders?: () => void
  sourceTab?: string
}

type ReviewFilterType = 'all' | 'good' | 'middle' | 'bad'

function formatPrice(v?: number) {
  if (typeof v !== 'number' || Number.isNaN(v)) return '--'
  return v.toFixed(2)
}

function formatDateText(v?: string) {
  if (!v) return '-'
  return String(v).replace('T', ' ')
}

function resolveImageUrl(url?: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `http://localhost:8081${url}`
}

function isSkuInStock(sku?: SkuItem | null) {
  return !!sku && Number(sku.stock) > 0
}

function parseCsv(v?: string) {
  if (!v) return []
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function pickBestSku(pool: SkuItem[]) {
  if (!pool.length) return null

  const sorted = [...pool].sort((a, b) => {
    const aInStock = Number(a.stock || 0) > 0 ? 1 : 0
    const bInStock = Number(b.stock || 0) > 0 ? 1 : 0
    if (bInStock !== aInStock) return bInStock - aInStock

    const stockDiff = Number(b.stock || 0) - Number(a.stock || 0)
    if (stockDiff !== 0) return stockDiff

    const priceDiff = Number(a.price || 0) - Number(b.price || 0)
    if (priceDiff !== 0) return priceDiff

    return String(a.skuId ?? a.id ?? '').localeCompare(
      String(b.skuId ?? b.id ?? '')
    )
  })

  return sorted[0] || null
}

function buildStructuredReviewTags(item: ReviewItemVO) {
  const tags: string[] = []

  if (item.purchaseSize) {
    tags.push(`购买尺码：${item.purchaseSize}`)
  }
  if (item.sizeFeel) {
    tags.push(`尺码：${item.sizeFeel}`)
  }
  if (item.lengthFeel) {
    tags.push(`裤长：${item.lengthFeel}`)
  }
  if (item.fitFeel) {
    tags.push(`版型：${item.fitFeel}`)
  }
  if (item.fabricFeel) {
    tags.push(`面料：${item.fabricFeel}`)
  }

  return tags
}

type ReviewSummaryTag = {
  label: string
  count: number
}

function buildReviewSummaryTags(reviews: ReviewItemVO[]): ReviewSummaryTag[] {
  const counter = new Map<string, number>()

  function add(label?: string | null) {
    const text = String(label || '').trim()
    if (!text) return
    counter.set(text, (counter.get(text) || 0) + 1)
  }

  reviews.forEach((item) => {
    if (item.sizeFeel) add(`尺码${item.sizeFeel}`)
    if (item.lengthFeel) add(`裤长${item.lengthFeel}`)
    if (item.fitFeel) add(`版型${item.fitFeel}`)
    if (item.fabricFeel) add(`面料${item.fabricFeel}`)
  })

  return Array.from(counter.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.label.localeCompare(b.label)
    })
    .slice(0, 6)
}

function normalizeReviewImages(images?: string[]) {
  if (!Array.isArray(images)) return []
  return images
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

export default function ProductDetailPage({
  spuId,
  onBack,
  onGoOrders,
  sourceTab,
}: Props) {
  const [spu, setSpu] = useState<Record<string, unknown> | null>(null)
  const [allSkus, setAllSkus] = useState<SkuItem[]>([])
  const [values, setValues] = useState<Record<string, unknown> | null>(null)
  const [favorited, setFavorited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [addingCart, setAddingCart] = useState(false)
  const [buyingNow, setBuyingNow] = useState(false)
  const [reviews, setReviews] = useState<ReviewItemVO[]>([])
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterType>('all')

  const [fitType, setFitType] = useState('')
  const [color, setColor] = useState('')
  const [size, setSize] = useState('')



  function handleBack() {
    if (typeof onBack === 'function') {
      onBack()
    }
  }

  async function loadFavoriteState(currentSpuId: string | number) {
    const favs = await listFavorites()
    const found = Array.isArray(favs) ? favs.some((f: Record<string, unknown>) => String(f.spuId) === String(currentSpuId)) : false
    setFavorited(found)
  }

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'auto',
    })
  }, [spuId])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const d = await getProductDetail(String(spuId))
        setSpu(d)

        const opt = await getOptions(String(spuId))
        const skus = Array.isArray(opt?.skus) ? opt.skus : []

        setAllSkus(skus)
        setValues(opt?.values || null)

        if (skus.length === 1) {
          const onlySku = skus[0]
          setFitType(onlySku.fitType || '')
          setColor(onlySku.color || '')
          setSize(onlySku.size || '')
        } else {
          setFitType('')
          setColor('')
          setSize('')
        }

        await loadFavoriteState(spuId)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [spuId])

  useEffect(() => {
    async function loadReviews() {
      setReviewLoading(true)
      try {
        const data = await listReviewsBySpuId(spuId)
        setReviews(Array.isArray(data) ? data : [])
        setReviewFilter('all')
      } catch {
        setReviews([])
        setReviewFilter('all')
      } finally {
        setReviewLoading(false)
      }
    }

    loadReviews()
  }, [spuId])

  const fitTypeOptions = useMemo(() => {
    if (allSkus.length === 1) {
      return Array.from(new Set(allSkus.map((s) => s.fitType).filter(Boolean)))
    }

    const fromValues = parseCsv(values?.fitTypes)
    if (fromValues.length > 0) return fromValues

    return Array.from(new Set(allSkus.map((s) => s.fitType).filter(Boolean)))
  }, [values, allSkus])

  const colorOptions = useMemo(() => {
    if (allSkus.length === 1) {
      return Array.from(new Set(allSkus.map((s) => s.color).filter(Boolean)))
    }

    const fromValues = parseCsv(values?.colors)
    if (fromValues.length > 0) return fromValues

    return Array.from(new Set(allSkus.map((s) => s.color).filter(Boolean)))
  }, [values, allSkus])

  const sizeOptions = useMemo(() => {
    if (allSkus.length === 1) {
      return Array.from(new Set(allSkus.map((s) => s.size).filter(Boolean)))
    }

    const fromValues = parseCsv(values?.sizes)
    if (fromValues.length > 0) return fromValues

    return Array.from(new Set(allSkus.map((s) => s.size).filter(Boolean)))
  }, [values, allSkus])

  function matchesSelections(
    sku: SkuItem,
    next: {
      fitType?: string
      color?: string
      size?: string
    }
  ) {
    if (next.fitType && sku.fitType !== next.fitType) return false
    if (next.color && sku.color !== next.color) return false
    if (next.size && sku.size !== next.size) return false
    return true
  }

  const availableFitTypeOptions = useMemo(() => {
    if (allSkus.length === 1) {
      return new Set(allSkus.map((s) => s.fitType).filter(Boolean))
    }

    return new Set(
      allSkus
        .filter((s) =>
          matchesSelections(s, {
            color,
            size,
          })
        )
        .map((s) => s.fitType)
    )
  }, [allSkus, color, size])

  const availableColorOptions = useMemo(() => {
    if (allSkus.length === 1) {
      return new Set(allSkus.map((s) => s.color).filter(Boolean))
    }

    return new Set(
      allSkus
        .filter((s) =>
          matchesSelections(s, {
            fitType,
            size,
          })
        )
        .map((s) => s.color)
    )
  }, [allSkus, fitType, size])

  const availableSizeOptions = useMemo(() => {
    if (allSkus.length === 1) {
      return new Set(allSkus.map((s) => s.size).filter(Boolean))
    }

    return new Set(
      allSkus
        .filter((s) =>
          matchesSelections(s, {
            fitType,
            color,
          })
        )
        .map((s) => s.size)
    )
  }, [allSkus, fitType, color])

  const selectedSku = useMemo(() => {
    if (allSkus.length === 1) {
      return allSkus[0]
    }

    if (!fitType || !color || !size) return null

    const exact = allSkus.filter(
      (s) => s.fitType === fitType && s.color === color && s.size === size
    )

    return pickBestSku(exact)
  }, [allSkus, fitType, color, size])

  const minPrice = useMemo(() => {
    if (!allSkus.length) return undefined
    return Math.min(...allSkus.map((s) => Number(s.price || 0)))
  }, [allSkus])

  const maxPrice = useMemo(() => {
    if (!allSkus.length) return undefined
    return Math.max(...allSkus.map((s) => Number(s.price || 0)))
  }, [allSkus])

  const totalStock = useMemo(() => {
    return allSkus.reduce((sum, s) => sum + Number(s.stock || 0), 0)
  }, [allSkus])

  const selectedText = useMemo(() => {
    if (allSkus.length === 1 && allSkus[0]) {
      const s = allSkus[0]
      const arr = [s.fitType, s.color, s.size].filter(Boolean)
      return arr.length > 0 ? arr.join(' / ') : '当前还未选择规格'
    }

    const arr = [fitType, color, size].filter(Boolean)
    return arr.length > 0 ? arr.join(' / ') : '当前还未选择规格'
  }, [allSkus, fitType, color, size])

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0
    const total = reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0)
    return total / reviews.length
  }, [reviews])

  const reviewSummaryTags = useMemo(() => {
    return buildReviewSummaryTags(reviews)
  }, [reviews])

  const reviewWithImagesCount = useMemo(() => {
    return reviews.filter(
      (item) => normalizeReviewImages(item.images).length > 0
    ).length
  }, [reviews])

  const goodReviewCount = useMemo(() => {
    return reviews.filter((item) => Number(item.rating || 0) >= 4).length
  }, [reviews])

  const middleReviewCount = useMemo(() => {
    return reviews.filter((item) => Number(item.rating || 0) === 3).length
  }, [reviews])

  const badReviewCount = useMemo(() => {
    return reviews.filter((item) => Number(item.rating || 0) <= 2).length
  }, [reviews])

  const filteredReviews = useMemo(() => {
    if (reviewFilter === 'good') {
      return reviews.filter((item) => Number(item.rating || 0) >= 4)
    }
    if (reviewFilter === 'middle') {
      return reviews.filter((item) => Number(item.rating || 0) === 3)
    }
    if (reviewFilter === 'bad') {
      return reviews.filter((item) => Number(item.rating || 0) <= 2)
    }
    return reviews
  }, [reviews, reviewFilter])

  const canAddCart = !!selectedSku && Number(selectedSku.stock) > 0
  const coverImageUrl = resolveImageUrl(spu?.coverUrl)

  async function handleAddCart() {
    if (!selectedSku) {
      alert('请先选择完整规格')
      return
    }

    const skuId = selectedSku.skuId ?? selectedSku.id
    if (!skuId) {
      alert('SKU 不存在')
      return
    }

    if (Number(selectedSku.stock) <= 0) {
      alert('当前规格库存不足，暂时无法加入购物车')
      return
    }

    setAddingCart(true)
    try {
      await client.post('/cart/items', {
        skuId,
        quantity: 1,
      })
      alert('已加入购物车')
    } catch (e: unknown) {
      alert((e as any)?.response?.data?.msg || (e as Error)?.message || '加入购物车失败')
    } finally {
      setAddingCart(false)
    }
  }

  async function handleBuyNow() {
    if (!selectedSku) {
      alert('请先选择完整规格')
      return
    }

    const skuId = selectedSku.skuId ?? selectedSku.id
    if (!skuId) {
      alert('SKU 不存在')
      return
    }

    if (Number(selectedSku.stock) <= 0) {
      alert('当前规格库存不足，暂时无法立即购买')
      return
    }

    setBuyingNow(true)
    try {
      const addresses = await listMyAddresses()
      const addressList = Array.isArray(addresses) ? addresses : []

      if (addressList.length === 0) {
        alert('请先新增收货地址，再使用立即购买')
        return
      }

      const defaultAddress =
        addressList.find((x: Record<string, unknown>) => Number((x?.isDefault as number || 0)) === 1) ||
        addressList[0]

      const orderId = await createOrderWithAddress({
        addressId: String(defaultAddress.id),
        items: [
          {
            skuId: String(skuId),
            quantity: 1,
          },
        ],
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
    } catch (e: unknown) {
      alert((e as any)?.response?.data?.msg || (e as Error)?.message || '立即购买失败')
    } finally {
      setBuyingNow(false)
    }
  }

  async function handleToggleFavorite() {
    try {
      if (favorited) {
        const resp = await removeFavorite(spuId)
        if (resp.code === 200) {
          setFavorited(false)
          alert('已取消收藏')
        } else {
          alert(resp.msg || '取消收藏失败')
        }
      } else {
        const resp = await addFavorite(spuId)
        if (resp.code === 200) {
          setFavorited(true)
          alert('已收藏')
        } else {
          alert(resp.msg || '收藏失败')
        }
      }
    } catch (e: unknown) {
      alert((e as any)?.response?.data?.msg || (e as Error)?.message || '操作失败')
    }
  }

  return (
    <div className="product-detail-page">
      <div className="product-top-action-bar">
        <button
          type="button"
          onClick={handleBack}
          className="product-back-btn"
        >
          ← {sourceTab === 'orders' ? '返回订单列表' : sourceTab === 'favorites' ? '返回收藏列表' : '返回商品列表'}
        </button>
      </div>

      <section className="product-hero">
        <div className="product-image-section">
          <div className="product-image-main">
            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt={spu?.name || '商品主图'}
                className="product-image"
              />
            ) : (
              <div className="product-image-placeholder">
                <div className="product-image-placeholder-content">
                  <span className="product-image-placeholder-text">商品图片</span>
                </div>
              </div>
            )}
          </div>
          <div className="product-image-thumbs">
            <div className="product-image-thumb active">
              {coverImageUrl ? (
                <img src={coverImageUrl} alt="缩略图" className="product-image-thumb-img" />
              ) : (
                <div className="product-image-thumb-placeholder">
                  <span>1</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="product-info-section">
          <div className="product-shop-info">
            <span className="product-shop-tag">Pants Mall 自营</span>
            <span className="product-shop-name">Pants Mall 官方旗舰店</span>
          </div>

          <h1 className="product-title">{spu?.name ?? '加载中...'}</h1>

          <div className="product-desc">
            {spu?.description || '这是一款适合日常通勤与休闲穿搭的裤装商品。'}
          </div>

          <div className="product-price-section">
            <div className="product-price-main">
              <span className="product-price-label">¥</span>
              <span className="product-price-value">
                {selectedSku ? (
                  formatPrice(selectedSku.price)
                ) : minPrice != null ? (
                  formatPrice(minPrice)
                ) : (
                  '--'
                )}
              </span>
              {!selectedSku && minPrice != null && maxPrice != null && Number(minPrice) !== Number(maxPrice) && (
                <span className="product-price-range">
                  - ¥{formatPrice(maxPrice)}
                </span>
              )}
            </div>
            <div className="product-price-extra">
              <span className="product-sales">销量 {spu?.sales ?? '-'}</span>
              <span className="product-stock">库存 {selectedSku ? selectedSku.stock ?? '-' : totalStock}</span>
            </div>
          </div>

          <div className="product-service-tags">
            <span className="product-service-tag">正品保障</span>
            <span className="product-service-tag">7天无理由退换</span>
            <span className="product-service-tag">闪电发货</span>
            <span className="product-service-tag">假一赔十</span>
          </div>

          <div className="product-rating-section">
            <div className="product-rating-main">
              <span className="product-rating-score">
                {reviews.length > 0 ? avgRating.toFixed(1) : '--'}
              </span>
              <div className="product-rating-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`product-rating-star ${avgRating >= n ? 'active' : ''}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="product-rating-count">
                {reviews.length > 0 ? `${reviews.length}条评价` : '暂无评价'}
              </span>
            </div>
            {reviewWithImagesCount > 0 && (
              <span className="product-rating-image-count">
                {reviewWithImagesCount}条含图
              </span>
            )}
          </div>

          <div className="product-spec-section">
            <div className="product-spec-group">
              <div className="product-spec-label">版型</div>
              <div className="product-spec-options">
                {fitTypeOptions.length === 0 ? (
                  <span className="product-spec-empty">暂无可选版型</span>
                ) : (
                  fitTypeOptions.map((item: string) => {
                    const enabled = availableFitTypeOptions.has(item)
                    const active =
                      allSkus.length === 1
                        ? item === allSkus[0]?.fitType
                        : item === fitType

                    return (
                      <button
                        key={item}
                        onClick={() => {
                          if (!enabled || allSkus.length === 1) return
                          setFitType((prev) => (prev === item ? '' : item))
                        }}
                        disabled={!enabled || allSkus.length === 1}
                        className={`product-spec-option ${active ? 'active' : ''}`}
                      >
                        {item}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div className="product-spec-group">
              <div className="product-spec-label">颜色</div>
              <div className="product-spec-options">
                {colorOptions.length === 0 ? (
                  <span className="product-spec-empty">暂无可选颜色</span>
                ) : (
                  colorOptions.map((item: string) => {
                    const enabled = availableColorOptions.has(item)
                    const active =
                      allSkus.length === 1
                        ? item === allSkus[0]?.color
                        : item === color

                    return (
                      <button
                        key={item}
                        onClick={() => {
                          if (!enabled || allSkus.length === 1) return
                          setColor((prev) => (prev === item ? '' : item))
                        }}
                        disabled={!enabled || allSkus.length === 1}
                        className={`product-spec-option ${active ? 'active' : ''}`}
                      >
                        {item}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div className="product-spec-group">
              <div className="product-spec-label">尺码</div>
              <div className="product-spec-options">
                {sizeOptions.length === 0 ? (
                  <span className="product-spec-empty">暂无可选尺码</span>
                ) : (
                  sizeOptions.map((item: string) => {
                    const enabled = availableSizeOptions.has(item)
                    const active =
                      allSkus.length === 1
                        ? item === allSkus[0]?.size
                        : item === size

                    return (
                      <button
                        key={item}
                        onClick={() => {
                          if (!enabled || allSkus.length === 1) return
                          setSize((prev) => (prev === item ? '' : item))
                        }}
                        disabled={!enabled || allSkus.length === 1}
                        className={`product-spec-option ${active ? 'active' : ''}`}
                      >
                        {item}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="product-selected-info">
            <div className="product-selected-header">
              <span className="product-selected-title">已选规格</span>
              <span className="product-selected-value">{selectedText}</span>
            </div>
            {selectedSku && (
              <div className="product-selected-details">
                <div className="product-selected-detail-item">
                  <span className="product-selected-detail-label">裤长</span>
                  <span className="product-selected-detail-value">{selectedSku.lengthCm ?? '-'} cm</span>
                </div>
                <div className="product-selected-detail-item">
                  <span className="product-selected-detail-label">腰围</span>
                  <span className="product-selected-detail-value">{selectedSku.waistCm ?? '-'} cm</span>
                </div>
                <div className="product-selected-detail-item">
                  <span className="product-selected-detail-label">裤脚口</span>
                  <span className="product-selected-detail-value">{selectedSku.legOpeningCm ?? '-'} cm</span>
                </div>
              </div>
            )}
            {!isSkuInStock(selectedSku) && selectedSku && (
              <div className="product-stock-warning">
                当前规格暂无库存，请选择其他规格
              </div>
            )}
          </div>

          <div className="product-action-section">
            <button
              onClick={handleToggleFavorite}
              className={`product-action-btn product-action-fav ${favorited ? 'favorited' : ''}`}
            >
              <div className="product-fav-icon">★</div>
              <div className="product-fav-text">{favorited ? '已收藏' : '收藏'}</div>
            </button>
            <button
              onClick={handleAddCart}
              className="product-action-btn product-action-cart"
              disabled={!canAddCart || addingCart || buyingNow}
            >
              {!selectedSku
                ? '请选择规格'
                : Number(selectedSku.stock) <= 0
                ? '无库存'
                : addingCart
                ? '加入中...'
                : '加入购物车'}
            </button>
            <button
              onClick={handleBuyNow}
              className="product-action-btn product-action-buy"
              disabled={!canAddCart || addingCart || buyingNow}
            >
              {!selectedSku
                ? '请选择规格'
                : Number(selectedSku.stock) <= 0
                ? '无法购买'
                : buyingNow
                ? '下单中...'
                : '立即购买'}
            </button>
          </div>
        </div>
      </section>

      <section className="product-detail-section-wrap">
        <div className="product-detail-section-card">
          <div className="product-detail-section-title">商品描述</div>
          <div className="product-detail-section-content">
            {spu?.description ||
              '这是一款适合日常通勤、休闲穿搭和多场景搭配的裤装商品。'}
          </div>
        </div>

        <div className="product-detail-section-card">
          <div className="product-detail-section-title">尺码信息</div>
          <div className="product-size-table-wrap">
            <table className="product-size-table">
              <thead>
                <tr>
                  <th className="product-size-table-th">尺码</th>
                  <th className="product-size-table-th">裤长(cm)</th>
                  <th className="product-size-table-th">腰围(cm)</th>
                  <th className="product-size-table-th">裤脚口(cm)</th>
                  <th className="product-size-table-th">版型</th>
                </tr>
              </thead>
              <tbody>
                {allSkus.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="product-empty-td">
                      暂无尺码数据
                    </td>
                  </tr>
                ) : (
                  allSkus.map((item, index) => (
                    <tr key={`${item.skuId ?? item.id ?? index}`}>
                      <td className="product-size-table-td">{item.size || '-'}</td>
                      <td className="product-size-table-td">{item.lengthCm ?? '-'}</td>
                      <td className="product-size-table-td">{item.waistCm ?? '-'}</td>
                      <td className="product-size-table-td">{item.legOpeningCm ?? '-'}</td>
                      <td className="product-size-table-td">{item.fitType || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="product-detail-section-card">
          <div className="product-review-header-row">
            <div>
              <div className="product-detail-section-title">商品评价</div>
              <div className="product-review-header-desc">
                这里展示已购买用户提交的真实评价内容，并增加了裤装相关的结构化参考信息。
              </div>
            </div>
            <div className="product-review-header-badge">
              {reviewLoading ? '加载中...' : `${filteredReviews.length} 条评价`}
            </div>
          </div>

          {!reviewLoading && reviews.length > 0 ? (
            <div className="product-review-filter-wrap">
              <button
                type="button"
                onClick={() => setReviewFilter('all')}
                className={`product-review-filter-btn ${reviewFilter === 'all' ? 'active' : ''}`}
              >
                全部（{reviews.length}）
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('good')}
                className={`product-review-filter-btn ${reviewFilter === 'good' ? 'active' : ''}`}
              >
                好评（{goodReviewCount}）
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('middle')}
                className={`product-review-filter-btn ${reviewFilter === 'middle' ? 'active' : ''}`}
              >
                中评（{middleReviewCount}）
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('bad')}
                className={`product-review-filter-btn ${reviewFilter === 'bad' ? 'active' : ''}`}
              >
                差评（{badReviewCount}）
              </button>
            </div>
          ) : null}

          {reviewLoading ? (
            <div className="product-review-empty">评价加载中...</div>
          ) : reviews.length === 0 ? (
            <div className="product-review-empty">暂无评价，欢迎下单后成为第一位评价用户。</div>
          ) : filteredReviews.length === 0 ? (
            <div className="product-review-empty">当前筛选下暂无评价</div>
          ) : (
            <>
              {reviewSummaryTags.length > 0 && reviewFilter === 'all' ? (
                <div className="product-review-summary-tag-panel">
                  <div className="product-review-summary-tag-title">评价标签汇总</div>
                  <div className="product-review-summary-tag-wrap">
                    {reviewSummaryTags.map((item) => (
                      <span
                        key={`${item.label}_${item.count}`}
                        className="product-review-summary-tag"
                      >
                        {item.label} · {item.count}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="product-review-list">
                {filteredReviews.map((item, index) => {
                  const structuredTags = buildStructuredReviewTags(item)
                  const reviewImages = normalizeReviewImages(item.images)

                  return (
                    <div
                      key={`${String(item.id ?? '')}_${index}`}
                      className="product-review-card"
                    >
                      <div className="product-review-card-top">
                        <div className="product-review-user">
                          {item.anonymous === 1 ? '匿名用户' : item.username || '用户'}
                        </div>
                        <div className="product-review-stars-line">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span
                              key={n}
                              className={`product-review-star ${Number(item.rating || 0) >= n ? 'active' : ''}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>

                      {structuredTags.length > 0 ? (
                        <div className="product-review-tag-wrap">
                          {structuredTags.map((tag) => (
                            <span key={tag} className="product-review-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="product-review-content">
                        {item.content?.trim() || '用户未填写文字评价。'}
                      </div>

                      {reviewImages.length > 0 ? (
                        <div className="product-review-image-list">
                          {reviewImages.map((img, imgIndex) => {
                            const resolved = resolveImageUrl(img)

                            return (
                              <img
                                key={`${img}_${imgIndex}`}
                                src={resolved}
                                alt={`评价图片${imgIndex + 1}`}
                                className="product-review-image"
                              />
                            )
                          })}
                        </div>
                      ) : null}

                      <div className="product-review-footer">
                        <span>评分：{item.rating ?? '-'} 分</span>
                        <span>{formatDateText(item.createdAt)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

