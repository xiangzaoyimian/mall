import { useEffect, useMemo, useState } from 'react'
import { listFavorites, removeFavorite, type Favorite } from './api/favorites'
import { getProductDetail, type ProductSpu } from './api/products'
import { getOptions } from './api/pants'
import './styles/favorites.css'

type Props = {
  onOpenDetail?: (spuId: number) => void
}

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

type FavoriteViewItem = Favorite & {
  product?: ProductSpu | null
  minPrice?: number
  maxPrice?: number
  totalStock?: number
}

function formatDateText(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function resolveImageUrl(url?: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `http://localhost:8081${url}`
}

function formatPrice(v?: number) {
  if (typeof v !== 'number' || Number.isNaN(v)) return '--'
  return v.toFixed(2)
}

function formatPriceRange(min?: number, max?: number) {
  const hasMin = typeof min === 'number' && Number.isFinite(min)
  const hasMax = typeof max === 'number' && Number.isFinite(max)

  if (hasMin && hasMax) {
    if (Number(min) === Number(max)) return `¥${formatPrice(min)}`
    return `¥${formatPrice(min)} ~ ¥${formatPrice(max)}`
  }

  if (hasMin) return `¥${formatPrice(min)}`
  if (hasMax) return `¥${formatPrice(max)}`
  return '--'
}

function calcSkuStats(skus: SkuItem[]) {
  if (!Array.isArray(skus) || skus.length === 0) {
    return {
      minPrice: undefined,
      maxPrice: undefined,
      totalStock: 0,
    }
  }

  const prices = skus
    .map((x) => Number(x.price))
    .filter((x) => Number.isFinite(x))

  const stocks = skus
    .map((x) => Number(x.stock))
    .filter((x) => Number.isFinite(x))

  return {
    minPrice: prices.length ? Math.min(...prices) : undefined,
    maxPrice: prices.length ? Math.max(...prices) : undefined,
    totalStock: stocks.reduce((sum, n) => sum + n, 0),
  }
}

function formatSales(v?: number) {
  if (typeof v !== 'number' || Number.isNaN(v)) return '0'
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return String(v)
}

export default function FavoritesPage({ onOpenDetail }: Props) {
  const [items, setItems] = useState<FavoriteViewItem[]>([])
  const [loading, setLoading] = useState(false)
  const [removingSpuId, setRemovingSpuId] = useState<string>('')

  const countText = useMemo(() => {
    if (loading) return '正在加载收藏列表...'
    return `共收藏 ${items.length} 个商品`
  }, [loading, items.length])

  async function load() {
    setLoading(true)
    try {
      const favorites = await listFavorites()
      const favoriteList = Array.isArray(favorites) ? favorites : []

      // 过滤掉已删除的收藏和指定商品
      const activeFavorites = favoriteList.filter(fav => 
        (!fav.deleted || fav.deleted === 0) && 
        String(fav.spuId) !== '2031529721216385000'
      )

      const mergedList = await Promise.all(
        activeFavorites.map(async (fav) => {
          try {
            const [product, options] = await Promise.all([
              getProductDetail(fav.spuId).catch(() => null),
              getOptions(fav.spuId).catch(() => null),
            ])

            const skus = Array.isArray(options?.skus) ? options.skus : []
            const stats = calcSkuStats(skus as SkuItem[])

            return {
              ...fav,
              product: product || null,
              minPrice: stats.minPrice,
              maxPrice: stats.maxPrice,
              totalStock: stats.totalStock,
            }
          } catch {
            return {
              ...fav,
              product: null,
              minPrice: undefined,
              maxPrice: undefined,
              totalStock: 0,
            }
          }
        })
      )

      setItems(mergedList)
    } catch (e: unknown) {
      alert((e as any)?.response?.data?.msg || (e as Error)?.message || '加载收藏列表失败')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(spuId: string | number) {
    const raw = String(spuId || '').trim()
    if (!raw) {
      alert('spuId 不存在')
      return
    }

    setRemovingSpuId(raw)
    try {
      const resp = await removeFavorite(raw)
      if (resp.code === 200) {
        // 重新加载收藏列表，确保与后端状态一致
        await load()
        alert('已取消收藏')
      } else {
        alert(resp.msg || '取消收藏失败')
      }
    } catch (e: unknown) {
      alert((e as any)?.response?.data?.msg || (e as Error)?.message || '取消收藏失败')
    } finally {
      setRemovingSpuId('')
    }
  }

  function handleOpenDetail(spuId: string | number) {
    const n = Number(spuId)
    if (!Number.isFinite(n) || n <= 0) {
      alert('spuId 不存在')
      return
    }

    if (onOpenDetail) {
      onOpenDetail(n)
    } else {
      alert(`当前商品 spuId = ${n}`)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="favorites-page">
      <section className="favorites-header">
        <div className="favorites-header-content">
          <div className="favorites-header-tag">MY FAVORITES</div>
          <h1 className="favorites-header-title">我的收藏</h1>
          <p className="favorites-header-sub">
            这里展示的是你已经收藏的商品，可以随时查看详情或取消收藏
          </p>
        </div>
        <div className="favorites-header-stats">
          <div className="favorites-stats-card">
            <div className="favorites-stats-value">{items.length}</div>
            <div className="favorites-stats-label">收藏商品</div>
          </div>
          <button
            className="favorites-refresh-btn"
            onClick={load}
            disabled={loading}
          >
            {loading ? '加载中...' : '刷新收藏'}
          </button>
        </div>
      </section>

      <section className="favorites-content">
        <div className="favorites-content-header">
          <h2 className="favorites-content-title">收藏列表</h2>
          <div className="favorites-content-count">{countText}</div>
        </div>

        {loading && items.length === 0 ? (
          <div className="favorites-empty">
            <div className="favorites-empty-icon">⏳</div>
            <div className="favorites-empty-title">正在加载收藏商品</div>
            <div className="favorites-empty-desc">请稍等，系统正在获取你的收藏商品信息</div>
          </div>
        ) : items.length === 0 ? (
          <div className="favorites-empty">
            <div className="favorites-empty-icon">💝</div>
            <div className="favorites-empty-title">暂无收藏商品</div>
            <div className="favorites-empty-desc">
              你可以先去商品详情页点击"收藏商品"，之后就能在这里快速回看
            </div>
          </div>
        ) : (
          <div className="favorites-grid">
            {items.map((it, idx) => {
              const rawSpuId = String(it.spuId || '').trim()
              const isRemoving = removingSpuId === rawSpuId
              const product = it.product || null
              const imageUrl = resolveImageUrl(product?.coverUrl)
              const productName =
                String(product?.name || '').trim() || `商品 #${rawSpuId}`

              return (
                <div
                  key={String(it.id ?? idx)}
                  className="favorites-card"
                >
                  <div className="favorites-card-image">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={productName}
                        className="favorites-card-img"
                      />
                    ) : (
                      <div className="favorites-card-placeholder">
                        <span className="favorites-card-placeholder-icon">👖</span>
                        <span className="favorites-card-placeholder-text">暂无图片</span>
                      </div>
                    )}
                    <div className="favorites-card-badge">已收藏</div>
                  </div>

                  <div className="favorites-card-body">
                    <h3 className="favorites-card-name">{productName}</h3>
                    
                    <div className="favorites-card-price">
                      {formatPriceRange(it.minPrice, it.maxPrice)}
                    </div>

                    <div className="favorites-card-meta">
                      <div className="favorites-card-meta-item">
                        <span className="favorites-card-meta-label">销量</span>
                        <span className="favorites-card-meta-value">{formatSales(product?.sales)}</span>
                      </div>
                      <div className="favorites-card-meta-item">
                        <span className="favorites-card-meta-label">库存</span>
                        <span className="favorites-card-meta-value">{it.totalStock ?? 0}</span>
                      </div>
                      <div className="favorites-card-meta-item">
                        <span className="favorites-card-meta-label">收藏时间</span>
                        <span className="favorites-card-meta-value">{formatDateText(it.createdAt)}</span>
                      </div>
                    </div>

                    <div className="favorites-card-actions">
                      <button
                        className="favorites-card-btn favorites-card-btn-primary"
                        onClick={() => handleOpenDetail(it.spuId)}
                        disabled={isRemoving}
                      >
                        查看详情
                      </button>
                      <button
                        className="favorites-card-btn favorites-card-btn-secondary"
                        onClick={() => handleRemove(it.spuId)}
                        disabled={isRemoving}
                      >
                        {isRemoving ? '取消中...' : '取消收藏'}
                      </button>
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
