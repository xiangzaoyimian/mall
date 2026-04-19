import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import * as productsApi from './api/products'
import './styles/pants-list.css'

type ProductItem = productsApi.ProductItem
type ProductCompareItem = productsApi.ProductCompareItem

type FilterState = {
  keyword?: string
  fitType?: string
  color?: string
  size?: string
  minPrice?: string
  maxPrice?: string
  sortBy?: string
  sortOrder?: string
}

type Props = {
  onOpenDetail?: (spuId: string | number) => void
  onGoRecommend?: () => void
  initialKeyword?: string
  initialPantType?: string
  initialFitType?: string
  initialColor?: string
  initialSize?: string
  initialBrand?: string
  initialMinPrice?: string
  initialMaxPrice?: string
  initialSortBy?: string
  initialSortOrder?: string
  savedFilters?: FilterState
  onFiltersChange?: (filters: FilterState) => void
  onResetFilters?: () => void
  compareIds?: Array<string | number>
  compareOpen?: boolean
  onCompareChange?: (compareIds: Array<string | number>, compareOpen: boolean) => void
}

function toNumberOrUndefined(v: string) {
  const s = v.trim()
  if (!s) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
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

function resolveImageUrl(url?: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `http://localhost:8081${url}`
}

function cleanParams(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    if (typeof v === 'string' && v.trim() === '') return
    out[k] = v
  })
  return out
}

function formatSales(v?: number) {
  if (typeof v !== 'number' || Number.isNaN(v)) return '0'
  return String(v)
}

function resolveSalesLevel(v?: number) {
  const sales = Number(v || 0)
  if (sales >= 100) return '热销'
  if (sales >= 50) return '畅销'
  if (sales >= 20) return '受欢迎'
  return '上新'
}

export default function PantsListPage({
  onOpenDetail,
  onGoRecommend,
  initialKeyword = '',
  initialPantType = '',
  initialFitType = '',
  initialColor = '',
  initialSize = '',
  initialBrand = '',
  initialMinPrice = '',
  initialMaxPrice = '',
  initialSortBy = 'NEW',
  initialSortOrder = 'DESC',
  savedFilters,
  onFiltersChange,
  onResetFilters,
  compareIds = [],
  compareOpen = false,
  onCompareChange,
}: Props) {
  const getInitialValue = (key: keyof FilterState, defaultValue: string) => {
    if (savedFilters && key in savedFilters) {
      return savedFilters[key] ?? defaultValue
    }
    switch (key) {
      case 'fitType': return initialFitType
      case 'color': return initialColor
      case 'size': return initialSize
      case 'minPrice': return initialMinPrice
      case 'maxPrice': return initialMaxPrice
      case 'sortBy': return initialSortBy
      case 'sortOrder': return initialSortOrder
      default: return defaultValue
    }
  }

  const [keyword, setKeyword] = useState(getInitialValue('keyword', ''))
  const [minPrice, setMinPrice] = useState(getInitialValue('minPrice', ''))
  const [maxPrice, setMaxPrice] = useState(getInitialValue('maxPrice', ''))
  const [sortBy, setSortBy] = useState(getInitialValue('sortBy', 'NEW'))
  const [sortOrder, setSortOrder] = useState(getInitialValue('sortOrder', 'DESC'))
  const [pageSize, setPageSize] = useState('15')
  const [currentPage, setCurrentPage] = useState(1)
  const [fitType, setFitType] = useState(getInitialValue('fitType', ''))
  const [color, setColor] = useState(getInitialValue('color', ''))
  const [size, setSize] = useState(getInitialValue('size', ''))
  const [showFilters, setShowFilters] = useState(false)

  // 动态筛选选项
  const [fitTypes, setFitTypes] = useState<string[]>([])
  const [colors, setColors] = useState<string[]>([])
  const [sizes, setSizes] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [searched, setSearched] = useState(false)
  const [total, setTotal] = useState(0)
  
  // 商品对比相关状态
  const [compareProducts, setCompareProducts] = useState<ProductCompareItem[]>([])
  const [compareLoading, setCompareLoading] = useState(false)

  const countText = useMemo(() => {
    if (!searched) return '正在准备商品列表'
    if (loading) return '正在加载...'
    return `共找到 ${total} 个商品`
  }, [searched, loading, total])

  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({
        keyword,
        fitType,
        color,
        size,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder,
      })
    }
  }, [keyword, fitType, color, size, minPrice, maxPrice, sortBy, sortOrder, onFiltersChange])

  const loadProducts = useCallback(async (nextKeyword?: string) => {
    const realKeyword = typeof nextKeyword === 'string' ? nextKeyword : keyword

    setLoading(true)
    try {
      const params = cleanParams({
        pageNo: currentPage,
        pageSize: toNumberOrUndefined(pageSize) ?? 15,
        keyword: realKeyword.trim(),
        minPrice: toNumberOrUndefined(minPrice),
        maxPrice: toNumberOrUndefined(maxPrice),
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        // 新增筛选参数
        fitType: fitType || undefined,
        color: color || undefined,
        size: size || undefined,
      })

      const data = await productsApi.getProductList(params)
      const productList = Array.isArray(data.list) ? data.list : []
      setProducts(productList)
      setTotal(Number(data.total || 0))
      setSearched(true)
    } catch (error) {
      console.error('Failed to load products:', error)
      setProducts([])
      setTotal(0)
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, keyword, minPrice, maxPrice, sortBy, sortOrder, fitType, color, size])

  async function loadDefaultProducts() {
    setLoading(true)
    try {
      const data = await productsApi.getProductList({
        pageNo: 1,
        pageSize: 15,
        sortBy: 'NEW',
        sortOrder: 'DESC',
      })
      const productList = Array.isArray(data.list) ? data.list : []
      setProducts(productList)
      setTotal(Number(data.total || 0))
      setSearched(true)
    } catch (error) {
      console.error('Failed to load default products:', error)
      setProducts([])
      setTotal(0)
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  // 提取筛选选项
  const extractFilterOptions = useCallback((productList: ProductItem[]) => {
    const fitTypeSet = new Set<string>()
    const colorSet = new Set<string>()
    const sizeSet = new Set<string>()

    productList.forEach(product => {
      // 尝试从不同可能的字段中提取筛选选项
      // 检查product对象中是否有这些字段
      if (product.fitTypes && Array.isArray(product.fitTypes)) {
        product.fitTypes.forEach(ft => fitTypeSet.add(ft))
      }
      if (product.colors && Array.isArray(product.colors)) {
        product.colors.forEach(c => colorSet.add(c))
      }
      if (product.sizes && Array.isArray(product.sizes)) {
        product.sizes.forEach(s => sizeSet.add(s))
      }
      
      // 从skus中提取选项
      if (product.skus && Array.isArray(product.skus)) {
        product.skus.forEach(sku => {
          if (sku.fitType) fitTypeSet.add(sku.fitType)
          if (sku.color) colorSet.add(sku.color)
          if (sku.size) sizeSet.add(sku.size)
        })
      }
    })

    const uniqueFitTypes = new Set(fitTypeSet)

    if (uniqueFitTypes.size === 0) {
      ['直筒', '修身', '宽松', '阔腿', '休闲'].forEach(ft => uniqueFitTypes.add(ft))
    }
    if (colorSet.size === 0) {
      ['黑色', '蓝色', '灰色', '白色', '卡其', '军绿', '棕色'].forEach(c => colorSet.add(c))
    }
    if (sizeSet.size === 0) {
      ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].forEach(s => sizeSet.add(s))
    }

    setFitTypes(Array.from(uniqueFitTypes))
    setColors(Array.from(colorSet))
    setSizes(Array.from(sizeSet))
  }, [])

  // 当products变化时，提取筛选选项
  useEffect(() => {
    if (products.length > 0) {
      extractFilterOptions(products)
    }
  }, [products, extractFilterOptions])

  function resetFilters() {
    setKeyword('')
    setMinPrice('')
    setMaxPrice('')
    setSortBy('NEW')
    setSortOrder('DESC')
    setPageSize('15')
    setCurrentPage(1)
    setFitType('')
    setColor('')
    setSize('')

    // 标记用户已点击重置按钮
    hasResetRef.current = true

    if (onResetFilters) {
      onResetFilters()
    }

    loadDefaultProducts()
  }

  function handleCompare(id: string | number) {
    const currentCompareIds = [...(compareIds || [])]
    const index = currentCompareIds.findIndex((item) => String(item) === String(id))
    
    let nextCompareIds: Array<string | number>
    
    if (index >= 0) {
      // 已存在，移除
      nextCompareIds = currentCompareIds.filter((item) => String(item) !== String(id))
    } else {
      // 不存在，添加
      if (currentCompareIds.length >= 3) {
        alert('最多只能对比 3 个商品')
        return
      }
      nextCompareIds = [...currentCompareIds, id]
    }
    
    if (onCompareChange) {
      onCompareChange(nextCompareIds, nextCompareIds.length >= 2)
    }
  }

  function isInCompare(id: string | number) {
    return (compareIds || []).some((item) => String(item) === String(id))
  }

  // 加载对比数据
  const loadCompareData = useCallback(async () => {
    if (!compareIds || compareIds.length === 0) {
      setCompareProducts([])
      setCompareLoading(false)
      return
    }

    setCompareLoading(true)
    try {
      const data = await productsApi.getProductCompare(compareIds)
      if (Array.isArray(data)) {
        setCompareProducts(data)
      }
    } catch (error) {
      console.error('加载对比数据失败:', error)
      // 保留旧数据，避免对比区高度塌陷
    } finally {
      setCompareLoading(false)
    }
  }, [compareIds])

  // 当对比商品ID变化时，加载对比数据
  useEffect(() => {
    loadCompareData()
  }, [loadCompareData])

  // 显示对比弹窗的商品
  const displayedCompareProducts = useMemo(() => {
    if (!compareIds || compareIds.length === 0 || !compareProducts.length) return []

    const map = new Map(
      compareProducts.map((item) => [String(item.id), item] as const)
    )

    return compareIds
      .map((id) => map.get(String(id)))
      .filter(Boolean) as ProductCompareItem[]
  }, [compareIds, compareProducts])

  // 是否可以进行对比（至少2个商品）
  const canCompare = displayedCompareProducts.length >= 2

  function handleOpenDetail(spuId?: string | number) {
    const raw = String(spuId || '').trim()
    if (!raw || !/^\d+$/.test(raw)) {
      alert('spuId 不存在')
      return
    }

    if (onOpenDetail) {
      onOpenDetail(raw)
    } else {
      alert(`当前商品 spuId = ${raw}`)
    }
  }



  const isMountedRef = useRef(false)
  const hasResetRef = useRef(false)

  useEffect(() => {
    // 检查savedFilters是否为空对象
    const isEmptySavedFilters = !savedFilters || Object.keys(savedFilters).length === 0
    
    if (isEmptySavedFilters) {
      // 只有在首次渲染且用户没有点击重置按钮时才使用initial值
      if (!isMountedRef.current && !hasResetRef.current) {
        setKeyword(initialKeyword || '')
        setFitType(initialFitType || '')
        setColor('')
        setSize('')
        setMinPrice('')
        setMaxPrice('')

        if (initialKeyword?.trim() || initialFitType) {
          loadProducts(initialKeyword)
        } else {
          loadDefaultProducts()
        }
        isMountedRef.current = true
      } else {
        // 非首次渲染且savedFilters为空，说明是用户点击了重置按钮
        // 清空所有筛选条件并加载默认商品
        setKeyword('')
        setFitType('')
        setColor('')
        setSize('')
        setMinPrice('')
        setMaxPrice('')
        loadDefaultProducts()
      }
    } else {
      // 有保存的筛选条件时，直接加载商品
      loadProducts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeyword, initialFitType, savedFilters])

  useEffect(() => {
    if (searched) {
      loadProducts()
    }
  }, [currentPage, pageSize, sortBy, sortOrder, keyword, minPrice, maxPrice, fitType, color, size, searched, loadProducts])

  return (
    <div className="pants-list-page">
      {/* 搜索区域 */}
      <section className="pants-search-section">
        <div className="pants-search-container">
          <div className="pants-search-bar">
            <input
              placeholder="输入商品关键词，例如：牛仔裤 / 直筒 / 黑色"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pants-search-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  loadProducts()
                }
              }}
            />
            <button
              className="pants-search-btn"
              onClick={() => loadProducts()}
            >
              {loading ? '搜索中...' : '搜索'}
            </button>
          </div>
        </div>
      </section>

      {/* 筛选与排序 */}
      <section className="pants-filter-section">
        <div className="pants-filter-container">
          {/* 热卖商品标签和展开筛选按钮 */}
          <div className="pants-filter-header">
            <div className="pants-hot-tag">
              <span className="pants-hot-icon">🔥</span>
              <span className="pants-hot-text">热卖商品</span>
            </div>
            <div className="pants-filter-actions">
              <button
                className="pants-toggle-filters-btn"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? '收起筛选' : '展开筛选'}
              </button>
            </div>
          </div>

          {/* 筛选选项（展开时显示） */}
          {showFilters && (
            <>
              {/* 新增筛选选项 */}
              <div className="pants-advanced-filters">
                {/* 第一行：裤型、颜色、尺码、品牌、排序 */}
                <div className="pants-filter-row">
                  {/* 版型筛选 */}
                  <div className="pants-filter-group">
                    <span className="pants-filter-label">版型：</span>
                    <select
                      value={fitType}
                      onChange={(e) => {
                        setFitType(e.target.value)
                        loadProducts()
                      }}
                      className="pants-sort-select"
                    >
                      <option value="">全部</option>
                      {fitTypes.map((ft) => (
                        <option key={ft} value={ft}>{ft}</option>
                      ))}
                    </select>
                  </div>

                  {/* 颜色筛选 */}
                  <div className="pants-filter-group">
                    <span className="pants-filter-label">颜色：</span>
                    <select
                      value={color}
                      onChange={(e) => {
                        setColor(e.target.value)
                        loadProducts()
                      }}
                      className="pants-sort-select"
                    >
                      <option value="">全部</option>
                      {colors.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* 尺码筛选 */}
                  <div className="pants-filter-group">
                    <span className="pants-filter-label">尺码：</span>
                    <select
                      value={size}
                      onChange={(e) => {
                        setSize(e.target.value)
                        loadProducts()
                      }}
                      className="pants-sort-select"
                    >
                      <option value="">全部</option>
                      {sizes.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* 排序筛选 */}
                  <div className="pants-filter-group">
                    <span className="pants-filter-label">排序：</span>
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value)
                        loadProducts()
                      }}
                      className="pants-sort-select"
                    >
                      <option value="NEW">最新上架</option>
                      <option value="SALES">销量优先</option>
                      <option value="PRICE">价格排序</option>
                    </select>
                    <select
                      value={sortOrder}
                      onChange={(e) => {
                        setSortOrder(e.target.value)
                        loadProducts()
                      }}
                      className="pants-sort-select"
                    >
                      <option value="DESC">从高到低</option>
                      <option value="ASC">从低到高</option>
                    </select>
                  </div>
                </div>

                {/* 第二行：价格区间 */}
                <div className="pants-filter-row">
                  <div className="pants-price-filter">
                    <span className="pants-filter-label">价格区间：</span>
                    <input
                      placeholder="最低价"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="pants-price-input"
                    />
                    <span className="pants-price-separator">-</span>
                    <input
                      placeholder="最高价"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="pants-price-input"
                    />
                    <button
                      className="pants-filter-btn"
                      onClick={() => loadProducts()}
                    >
                      确定
                    </button>
                    <button
                      className="pants-reset-btn"
                      onClick={resetFilters}
                    >
                      重置
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}


        </div>
      </section>

      {/* 商品结果 */}
      <section className="pants-result-section">
        <div className="pants-result-header">
          <h2 className="pants-result-title">商品列表</h2>
          <div className="pants-result-count">{countText}</div>
        </div>

        {!searched ? (
          <div className="pants-empty-state">
            <div className="pants-empty-icon">📦</div>
            <div className="pants-empty-title">正在准备商品列表</div>
            <div className="pants-empty-sub">稍等一下，系统正在加载默认商品。</div>
          </div>
        ) : products.length === 0 ? (
          <div className="pants-empty-state">
            <div className="pants-empty-icon">🔍</div>
            <div className="pants-empty-title">没有找到匹配商品</div>
            <div className="pants-empty-sub">
              建议减少筛选条件，或者直接输入商品关键词重新搜索。
            </div>
          </div>
        ) : (
          <>
            <div className="pants-product-grid">
              {products.map((x, idx) => {
                const imageUrl = resolveImageUrl(x.coverUrl)
                const salesLevel = resolveSalesLevel(x.sales)

                return (
                  <div
                    key={`${x.id ?? idx}`}
                    className="pants-product-card"
                    onClick={() => handleOpenDetail(x.id)}
                  >
                    <div className="pants-product-image">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={x.name || '商品图片'}
                          className="pants-product-img"
                        />
                      ) : (
                        <div className="pants-product-image-placeholder">
                          <div className="pants-placeholder-icon">👖</div>
                          <div className="pants-placeholder-text">商品图片</div>
                        </div>
                      )}
                      {salesLevel === '热销' && (
                        <div className="pants-hot-badge">热销</div>
                      )}
                    </div>

                    <div className="pants-product-info">
                      <h3 className="pants-product-name">{x.name || '未命名商品'}</h3>
                      
                      <div className="pants-product-price">
                        <span className="pants-price-symbol">¥</span>
                        <span className="pants-price-value">{formatPriceRange(x.minPrice, x.maxPrice)}</span>
                      </div>
                      
                      <div className="pants-product-meta">
                        <span className="pants-sales">销量 {formatSales(x.sales)}</span>
                        <span className="pants-stock">库存 {x.totalStock ?? 0}</span>
                      </div>
                      
                      <div className="pants-product-tags">
                        <span className="pants-tag">裤品精选</span>
                        {salesLevel && <span className="pants-tag sales-tag">{salesLevel}</span>}
                      </div>
                      
                      <div className="pants-product-actions">
                        <button
                          className={`pants-compare-btn ${isInCompare(x.id) ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation() // 阻止事件冒泡，避免触发卡片点击
                            handleCompare(x.id)
                          }}
                        >
                          {isInCompare(x.id) ? '取消对比' : '加入对比'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 分页组件 */}
            <div className="pants-pagination">
              <div className="pants-pagination-container">
                <button
                  className="pants-pagination-btn"
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  disabled={currentPage <= 1 || loading}
                >
                  上一页
                </button>
                
                <div className="pants-pagination-info">
                  第 {currentPage} 页，共 {Math.ceil(total / (toNumberOrUndefined(pageSize) ?? 15))} 页
                </div>
                
                <div className="pants-pagination-numbers">
                  {(() => {
                    const totalPages = Math.ceil(total / (toNumberOrUndefined(pageSize) ?? 15))
                    const pages = []
                    
                    // 总是显示第一页
                    pages.push(
                      <button
                        key={1}
                        className={`pants-pagination-number-btn ${currentPage === 1 ? 'active' : ''}`}
                        onClick={() => setCurrentPage(1)}
                        disabled={loading}
                      >
                        1
                      </button>
                    )
                    
                    // 如果当前页大于3，显示省略号
                    if (currentPage > 3) {
                      pages.push(
                        <span key="ellipsis1" className="pants-pagination-ellipsis">
                          ...
                        </span>
                      )
                    }
                    
                    // 显示当前页左右各一个页码
                    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                      pages.push(
                        <button
                          key={i}
                          className={`pants-pagination-number-btn ${currentPage === i ? 'active' : ''}`}
                          onClick={() => setCurrentPage(i)}
                          disabled={loading}
                        >
                          {i}
                        </button>
                      )
                    }
                    
                    // 如果当前页小于总页数-2，显示省略号
                    if (currentPage < totalPages - 2) {
                      pages.push(
                        <span key="ellipsis2" className="pants-pagination-ellipsis">
                          ...
                        </span>
                      )
                    }
                    
                    // 总是显示最后一页
                    if (totalPages > 1) {
                      pages.push(
                        <button
                          key={totalPages}
                          className={`pants-pagination-number-btn ${currentPage === totalPages ? 'active' : ''}`}
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={loading}
                        >
                          {totalPages}
                        </button>
                      )
                    }
                    
                    return pages
                  })()}
                </div>
                
                <button
                  className="pants-pagination-btn"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= Math.ceil(total / (toNumberOrUndefined(pageSize) ?? 15)) || loading}
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 悬浮式AI推荐助手 */}
      <div className="pants-ai-floating">
        <button 
          className="pants-ai-floating-btn"
          onClick={() => {
            // 跳转到AI助手页面
            if (onGoRecommend) {
              onGoRecommend()
            }
          }}
          title="AI推荐助手"
        >
          <span className="pants-ai-floating-icon">🤖</span>
          <span className="pants-ai-floating-text">AI助手</span>
        </button>
      </div>

      {/* 商品对比按钮 */}
      {compareIds && compareIds.length > 0 && (
        <div className="pants-compare-button-container">
          <button
            className="pants-compare-button"
            onClick={() => {
              if (onCompareChange) {
                onCompareChange(compareIds, true)
              }
            }}
          >
            商品对比（{compareIds.length}）
          </button>
        </div>
      )}

      {/* 商品对比弹窗 */}
      {compareOpen && (
        <div className="pants-compare-modal">
          <div className="pants-compare-modal-content">
            <div className="pants-compare-modal-header">
              <h3>商品对比</h3>
              <button
                className="pants-compare-modal-close"
                onClick={() => {
                  if (onCompareChange) {
                    onCompareChange(compareIds || [], false)
                  }
                }}
              >
                ×
              </button>
            </div>
            <div className="pants-compare-modal-body">
              {compareLoading ? (
                <div className="pants-compare-loading">加载对比数据中...</div>
              ) : compareIds && compareIds.length === 0 ? (
                <div className="pants-compare-empty">还没有加入对比的商品</div>
              ) : (
                <div className="pants-compare-table-container">
                  <table className="pants-compare-table">
                    <thead>
                      <tr>
                        <th>对比项</th>
                        {displayedCompareProducts.map((item) => (
                          <th key={String(item.id)}>
                            <div className="pants-compare-product-name">{item.name || '未命名商品'}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>商品图片</td>
                        {displayedCompareProducts.map((item) => (
                          <td key={String(item.id)}>
                            {item.coverUrl ? (
                              <img 
                                src={resolveImageUrl(item.coverUrl)} 
                                alt={item.name} 
                                className="pants-compare-product-image"
                              />
                            ) : (
                              <div className="pants-compare-image-placeholder">无图片</div>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td>价格</td>
                        {displayedCompareProducts.map((item) => (
                          <td key={String(item.id)}>
                            ¥{item.minPrice || 0} - ¥{item.maxPrice || 0}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td>销量</td>
                        {displayedCompareProducts.map((item) => (
                          <td key={String(item.id)}>
                            {item.sales || 0}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td>库存</td>
                        {displayedCompareProducts.map((item) => (
                          <td key={String(item.id)}>
                            {item.totalStock || 0}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td>颜色</td>
                        {displayedCompareProducts.map((item) => (
                          <td key={String(item.id)}>
                            {item.colors && item.colors.length > 0 ? item.colors.join(', ') : '无'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td>尺码</td>
                        {displayedCompareProducts.map((item) => (
                          <td key={String(item.id)}>
                            {item.sizes && item.sizes.length > 0 ? item.sizes.join(', ') : '无'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td>版型</td>
                        {displayedCompareProducts.map((item) => (
                          <td key={String(item.id)}>
                            {item.fitTypes && item.fitTypes.length > 0 ? item.fitTypes.join(', ') : '无'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="pants-compare-modal-footer">
              {compareIds && compareIds.length > 0 && (
                <button
                  className="pants-compare-clear"
                  onClick={() => {
                    if (onCompareChange) {
                      onCompareChange([], false)
                    }
                  }}
                >
                  清空对比
                </button>
              )}
              <button
                className="pants-compare-close-btn"
                onClick={() => {
                  if (onCompareChange) {
                    onCompareChange(compareIds || [], false)
                  }
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

