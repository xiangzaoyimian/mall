import { useEffect, useMemo, useState, useCallback } from 'react'
import { getProductList } from './api/products'
import './styles/pants-list.css'

type Props = {
  onOpenDetail?: (spuId: string | number) => void
  onGoRecommend?: () => void
  initialKeyword?: string
  initialPantType?: string
  initialFitType?: string
  initialColor?: string
  initialSize?: string
  initialMinPrice?: string
  initialMaxPrice?: string
  initialSortBy?: string
  initialSortOrder?: string
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
  initialMinPrice = '',
  initialMaxPrice = '',
  initialSortBy = 'NEW',
  initialSortOrder = 'DESC',
}: Props) {
  const [keyword, setKeyword] = useState(initialKeyword)
  const [minPrice, setMinPrice] = useState(initialMinPrice)
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice)
  const [sortBy, setSortBy] = useState(initialSortBy)
  const [sortOrder, setSortOrder] = useState(initialSortOrder)
  const [pageSize, setPageSize] = useState('15')
  const [currentPage, setCurrentPage] = useState(1)

  // 新增筛选选项
  const [fitType, setFitType] = useState(initialFitType)
  const [color, setColor] = useState(initialColor)
  const [size, setSize] = useState(initialSize)
  const [showFilters, setShowFilters] = useState(false)

  // 动态筛选选项
  const [fitTypes, setFitTypes] = useState<string[]>([])
  const [colors, setColors] = useState<string[]>([])
  const [sizes, setSizes] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [searched, setSearched] = useState(false)
  const [total, setTotal] = useState(0)

  const countText = useMemo(() => {
    if (!searched) return '正在准备商品列表'
    if (loading) return '正在加载...'
    return `共找到 ${total} 个商品`
  }, [searched, loading, total])

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

      const data = await getProductList(params)
      const productList = Array.isArray(data.list) ? data.list : []
      setProducts(productList)
      setTotal(Number(data.total || 0))
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, keyword, minPrice, maxPrice, sortBy, sortOrder, fitType, color, size])

  async function loadDefaultProducts() {
    setLoading(true)
    try {
      const data = await getProductList({
        pageNo: 1,
        pageSize: 15,
        sortBy: 'NEW',
        sortOrder: 'DESC',
      })
      const productList = Array.isArray(data.list) ? data.list : []
      setProducts(productList)
      setTotal(Number(data.total || 0))
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
    // 重置新增筛选选项
    setColor('')
    setSize('')

    setTimeout(() => {
      loadDefaultProducts()
    }, 0)
  }

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



  useEffect(() => {
    setKeyword(initialKeyword)
    setFitType(initialFitType)

    if (initialKeyword.trim() || initialFitType) {
      loadProducts(initialKeyword)
    } else {
      loadDefaultProducts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeyword, initialFitType])

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
    </div>
  )
}

