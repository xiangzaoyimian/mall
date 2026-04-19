import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import './styles/base.css'
import './styles/pants-list.css'
import PantsListPage from './PantsListPage'
import SearchResultPage from './SearchResultPage'
import ProductDetailPage from './ProductDetailPage'
import CartPage from './CartPage'
import OrdersPage from './OrdersPage'
import RecommendPage from './RecommendPage'
import FavoritesPage from './FavoritesPage'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import AdminApp from './AdminApp'
import AddressPage from './AddressPage'
import BodyProfilePage from './BodyProfilePage'
import UserProfilePage from './UserProfilePage'
import { getMe } from './api/auth'
import { getProductList, type ProductItem } from './api/products'

function resolveImageUrl(url?: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `http://localhost:8081${url}`
}

type Tab =
  | 'home'
  | 'pants'
  | 'search'
  | 'detail'
  | 'cart'
  | 'orders'
  | 'favorites'
  | 'address'
  | 'profile'
  | 'account'
  | 'login'
  | 'register'
  | 'recommend'

export type RecommendChatMessage = {
  id: string
  role: 'user' | 'ai'
  content: string
  loading?: boolean
  error?: boolean
  createdAt: number
}

export type SearchPageState = {
  keyword: string
  minPrice: string
  maxPrice: string
  sortType: 'default' | 'sales' | 'priceAsc' | 'priceDesc' | 'newest'
  onlyInStock: boolean
  fitType: '' | '直筒' | '修身' | '宽松'
  colorFamily:
    | ''
    | '黑色系'
    | '灰色系'
    | '白色系'
    | '蓝色系'
    | '绿色系'
    | '卡其色系'
    | '棕色系'
  sizeType:
    | ''
    | 'XXS'
    | 'XS'
    | 'S'
    | 'M'
    | 'L'
    | 'XL'
    | 'XXL'
    | 'XXXL'
    | 'XXXXL'
    | 'XXXXXL'
  waistMin: string
  waistMax: string
  lengthMin: string
  lengthMax: string
  pageNo: number
  scrollY: number
  viewMode: 'grid' | 'list'
  compareIds?: Array<string | number>
  compareOpen?: boolean
}

const SEARCH_PAGE_STATE_KEY = 'pants_mall_search_page_state_v4'

const defaultSearchPageState: SearchPageState = {
  keyword: '',
  minPrice: '',
  maxPrice: '',
  sortType: 'default',
  onlyInStock: false,
  fitType: '',
  colorFamily: '',
  sizeType: '',
  waistMin: '',
  waistMax: '',
  lengthMin: '',
  lengthMax: '',
  pageNo: 1,
  scrollY: 0,
  viewMode: 'grid',
}

function loadStoredSearchPageState(): SearchPageState {
  try {
    const raw = sessionStorage.getItem(SEARCH_PAGE_STATE_KEY)
    if (!raw) return defaultSearchPageState
    const parsed = JSON.parse(raw)
    return {
      ...defaultSearchPageState,
      ...(parsed || {}),
    }
  } catch {
    return defaultSearchPageState
  }
}

function saveStoredSearchPageState(state: SearchPageState) {
  try {
    sessionStorage.setItem(SEARCH_PAGE_STATE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function readToken() {
  return localStorage.getItem('token') || ''
}

function readRole() {
  return localStorage.getItem('role') || ''
}

function readDisplayName() {
  return (
    localStorage.getItem('nickname') ||
    localStorage.getItem('username') ||
    ''
  )
}

function scrollPageTop() {
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch {
    window.scrollTo(0, 0)
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [detailSourceTab, setDetailSourceTab] = useState<Tab>('pants')
  const [spuIdInput, setSpuIdInput] = useState<string>('1')

  const [searchPageState, setSearchPageState] = useState<SearchPageState>(() =>
    loadStoredSearchPageState()
  )
  const [ordersSelectedId, setOrdersSelectedId] = useState<
    string | number | null
  >(null)
  const [ordersShouldScrollIntoView, setOrdersShouldScrollIntoView] =
    useState(false)
  const [authTick, setAuthTick] = useState(0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [role, setRole] = useState(readRole())
  const [displayName, setDisplayName] = useState(readDisplayName())
  const [recommendAiQuestion, setRecommendAiQuestion] = useState('')
  const [recommendAiMsg, setRecommendAiMsg] = useState('')
  const [recommendChatMessages, setRecommendChatMessages] = useState<
    RecommendChatMessage[]
  >([])
  const [showLoginModal, setShowLoginModal] = useState(false)

  const [pantsPageFilter, setPantsPageFilter] = useState<{
    pantType?: string
    fitType?: string
    color?: string
    size?: string
    brand?: string
    minPrice?: string
    maxPrice?: string
    sortBy?: string
    sortOrder?: string
  }>({})

  const [pantsPageSavedFilters, setPantsPageSavedFilters] = useState<{
    keyword?: string
    fitType?: string
    color?: string
    size?: string
    minPrice?: string
    maxPrice?: string
    sortBy?: string
    sortOrder?: string
  }>({})
  
  // 商品对比相关状态
  const [pantsPageCompareIds, setPantsPageCompareIds] = useState<Array<string | number>>([])
  const [pantsPageCompareOpen, setPantsPageCompareOpen] = useState(false)

  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const token = readToken()
  const isLoggedIn = Boolean(token)

  const navItems = useMemo(
    () => [
      { key: 'home' as Tab, label: '首页' },
      { key: 'recommend' as Tab, label: 'AI助手' },
      { key: 'pants' as Tab, label: '全部商品' },
      { key: 'cart' as Tab, label: '购物车' },
      { key: 'orders' as Tab, label: '订单' },
      { key: 'favorites' as Tab, label: '收藏' },
      { key: 'account' as Tab, label: '个人中心' },
    ],
    []
  )

  function updateSearchPageState(next: SearchPageState) {
    setSearchPageState(next)
    saveStoredSearchPageState(next)
  }

  function goTab(nextTab: Tab, options?: { scrollTop?: boolean }) {
    setTab(nextTab)
    if (options?.scrollTop !== false) {
      window.setTimeout(() => {
        scrollPageTop()
      }, 0)
    }
  }

  function refreshAuthState() {
    setAuthTick((v) => v + 1)
    setRole(readRole())
    setDisplayName(readDisplayName())
  }

  async function refreshMeDisplayName() {
    if (!readToken()) {
      setDisplayName('')
      return
    }

    try {
      const res = await getMe()
      if (res.code === 200) {
        const data = res.data || {}
        const nickname = String(data.nickname || '').trim()
        const username = String(data.username || '').trim()

        if (nickname) {
          localStorage.setItem('nickname', nickname)
          setDisplayName(nickname)
        } else {
          localStorage.removeItem('nickname')
          setDisplayName(username)
        }
      }
    } catch {
      setDisplayName(readDisplayName())
    }
  }

  function openDetail(nextSpuId: string | number, sourceTab: Tab = tab) {
    const raw = String(nextSpuId ?? '').trim()
    if (!raw) {
      alert('商品ID不能为空')
      return
    }

    if (sourceTab === 'orders') {
      setOrdersShouldScrollIntoView(true)
    }

    if (sourceTab === 'search') {
      const latestSearchState: SearchPageState = {
        ...searchPageState,
        scrollY: window.scrollY,
      }
      updateSearchPageState(latestSearchState)
    }

    setSpuIdInput(raw)
    setDetailSourceTab(sourceTab)
    goTab('detail', { scrollTop: true })
  }

  function handleBackFromDetail() {
    if (detailSourceTab === 'favorites') {
      goTab('favorites')
      return
    }
    if (detailSourceTab === 'home') {
      goTab('home')
      return
    }
    if (detailSourceTab === 'orders') {
      goTab('orders')
      return
    }
    if (detailSourceTab === 'search') {
      goTab('search')
      return
    }
    goTab('pants')
  }



  const clearRecommendAiState = useCallback(() => {
    setRecommendAiQuestion('')
    setRecommendAiMsg('')
    setRecommendChatMessages([])
  }, [])

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('nickname')
    localStorage.removeItem('role')
    setUserMenuOpen(false)
    setRole('')
    setDisplayName('')
    clearRecommendAiState()
    refreshAuthState()
    alert('已退出登录')
    goTab('home')
  }

  function requireLogin(
    nextTab: 'cart' | 'orders' | 'favorites' | 'address' | 'account'
  ) {
    if (!readToken()) {
      setShowLoginModal(true)
      return
    }
    goTab(nextTab)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  useEffect(() => {
    refreshMeDisplayName()
  }, [authTick])

  useEffect(() => {
    // 在首页且未登录时显示登录弹窗
    if (tab === 'home' && !isLoggedIn) {
      setTimeout(() => {
        setShowLoginModal(true)
      }, 1000) // 延迟1秒显示，让页面加载完成
    }
  }, [tab, isLoggedIn])

  if (role === 'ADMIN') {
    return <AdminApp />
  }

  return (
    <div className="mall-app">
      <div className="mall-bg mall-bg-1" />
      <div className="mall-bg mall-bg-2" />

      <header className="mall-header">
        <div
          className="mall-brand"
          onClick={() => goTab('home')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              goTab('home')
            }
          }}
        >
          <div className="mall-brand-logo">裤</div>
          <div>
            <div className="mall-brand-title">Pants Mall</div>
            <div className="mall-brand-sub">专业裤品电商平台</div>
          </div>
        </div>

        {/* 桌面导航 */}
        <nav className="mall-nav desktop-nav">
          {navItems.map((item) => {
            if (item.key === 'cart') {
              return (
                <TopBtn
                  key={item.key}
                  active={tab === item.key}
                  onClick={() => requireLogin('cart')}
                >
                  {item.label}
                </TopBtn>
              )
            }

            if (item.key === 'orders') {
              return (
                <TopBtn
                  key={item.key}
                  active={tab === item.key}
                  onClick={() => requireLogin('orders')}
                >
                  {item.label}
                </TopBtn>
              )
            }

            if (item.key === 'account') {
              return (
                <TopBtn
                  key={item.key}
                  active={tab === item.key}
                  onClick={() => requireLogin('account')}
                >
                  {item.label}
                </TopBtn>
              )
            }

            return (
              <TopBtn
                key={item.key}
                active={tab === item.key}
                onClick={() => goTab(item.key)}
              >
                {item.label}
              </TopBtn>
            )
          })}
        </nav>

        {/* 移动端菜单按钮 */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          type="button"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        <div className="header-action-wrap">

          {!isLoggedIn ? (
            <div className="auth-btn-wrap">
              <button
                className="mall-nav-btn"
                onClick={() => goTab('login')}
                type="button"
              >
                登录
              </button>
              <button
                className="mall-nav-btn"
                onClick={() => goTab('register')}
                type="button"
              >
                注册
              </button>
            </div>
          ) : (
            <div className="user-menu-container">
              <button
                type="button"
                className="mall-nav-btn user-menu-btn"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <span>👤 {displayName || '用户'}</span>
                <span className={`user-menu-arrow ${userMenuOpen ? 'rotate' : ''}`}>
                  ▼
                </span>
              </button>

              {userMenuOpen && (
                <div className="user-menu-panel">
                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      setUserMenuOpen(false)
                      goTab('account')
                    }}
                  >
                    个人信息
                  </button>

                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      setUserMenuOpen(false)
                      goTab('address')
                    }}
                  >
                    收货地址
                  </button>

                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      setUserMenuOpen(false)
                      goTab('profile')
                    }}
                  >
                    身材档案
                  </button>

                  <button
                    type="button"
                    className="menu-item menu-item-danger"
                    onClick={handleLogout}
                  >
                    退出登录
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <nav className="mobile-nav">
              {navItems.map((item) => {
                if (item.key === 'cart') {
                  return (
                    <button
                      key={item.key}
                      className={`mobile-nav-btn ${tab === item.key ? 'active' : ''}`}
                      onClick={() => {
                        requireLogin('cart')
                        setMobileMenuOpen(false)
                      }}
                    >
                      {item.label}
                    </button>
                  )
                }

                if (item.key === 'orders') {
                  return (
                    <button
                      key={item.key}
                      className={`mobile-nav-btn ${tab === item.key ? 'active' : ''}`}
                      onClick={() => {
                        requireLogin('orders')
                        setMobileMenuOpen(false)
                      }}
                    >
                      {item.label}
                    </button>
                  )
                }

                if (item.key === 'account') {
                  return (
                    <button
                      key={item.key}
                      className={`mobile-nav-btn ${tab === item.key ? 'active' : ''}`}
                      onClick={() => {
                        requireLogin('account')
                        setMobileMenuOpen(false)
                      }}
                    >
                      {item.label}
                    </button>
                  )
                }

                return (
                  <button
                    key={item.key}
                    className={`mobile-nav-btn ${tab === item.key ? 'active' : ''}`}
                    onClick={() => {
                      goTab(item.key)
                      setMobileMenuOpen(false)
                    }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="mall-main">
        {tab === 'home' && (
          <HomePage
            key={authTick}
            onGoProducts={() => {
              setPantsPageFilter({})
              setPantsPageSavedFilters({})
              goTab('pants')
            }}
            onGoRecommend={() => goTab('recommend')}
            onGoPantsWithFilter={(filter) => {
              setPantsPageFilter(filter)
              setPantsPageSavedFilters({
                ...pantsPageSavedFilters,
                ...filter,
              })
              goTab('pants')
            }}
            onOpenDetail={(id) => openDetail(id, 'home')}
          />
        )}

        {tab === 'pants' && (
          <PantsListPage
            onOpenDetail={(nextSpuId) => {
              openDetail(nextSpuId, 'pants')
            }}
            onGoRecommend={() => goTab('recommend')}
            initialPantType={pantsPageFilter.pantType}
            initialFitType={pantsPageFilter.fitType}
            initialColor={pantsPageFilter.color}
            initialSize={pantsPageFilter.size}
            initialBrand={pantsPageFilter.brand}
            initialMinPrice={pantsPageFilter.minPrice}
            initialMaxPrice={pantsPageFilter.maxPrice}
            initialSortBy={pantsPageFilter.sortBy}
            initialSortOrder={pantsPageFilter.sortOrder}
            savedFilters={pantsPageSavedFilters}
            onFiltersChange={setPantsPageSavedFilters}
            onResetFilters={() => setPantsPageSavedFilters({})}
            compareIds={pantsPageCompareIds}
            compareOpen={pantsPageCompareOpen}
            onCompareChange={(compareIds, compareOpen) => {
              setPantsPageCompareIds(compareIds)
              setPantsPageCompareOpen(compareOpen)
            }}
          />
        )}

        {tab === 'search' && (
          <SearchResultPage
            initialKeyword={searchPageState.keyword}
            savedState={searchPageState}
            onStateChange={updateSearchPageState}
            onOpenDetail={(nextSpuId) => {
              openDetail(nextSpuId, 'search')
            }}
            onBackToAllProducts={() => goTab('pants')}
          />
        )}

        {tab === 'detail' && (
          <ProductDetailPage
            key={spuIdInput}
            spuId={spuIdInput}
            onBack={handleBackFromDetail}
            onGoOrders={() => goTab('orders')}
            sourceTab={detailSourceTab}
          />
        )}

        {tab === 'cart' && (
          <CartPage key={authTick} onGoOrders={() => goTab('orders')} />
        )}

        {tab === 'orders' && (
          <OrdersPage
            key={authTick}
            initialSelectedId={ordersSelectedId}
            shouldScrollIntoView={ordersShouldScrollIntoView}
            onDidScrollIntoView={() => setOrdersShouldScrollIntoView(false)}
            onSelectOrder={setOrdersSelectedId}
            onOpenDetail={(nextSpuId) => {
              openDetail(nextSpuId, 'orders')
            }}
          />
        )}

        {tab === 'favorites' && (
          <FavoritesPage
            key={authTick}
            onOpenDetail={(nextSpuId) => {
              openDetail(nextSpuId, 'favorites')
            }}
          />
        )}

        {tab === 'address' && <AddressPage key={authTick} />}
        {tab === 'profile' && <BodyProfilePage key={authTick} />}

        {tab === 'account' && (
          <UserProfilePage
            key={authTick}
            onNicknameUpdated={(nickname) => {
              if (String(nickname || '').trim()) {
                localStorage.setItem('nickname', nickname)
              } else {
                localStorage.removeItem('nickname')
              }
              refreshAuthState()
            }}
            onGoOrders={() => goTab('orders')}
            onGoFavorites={() => goTab('favorites')}
            onGoAddress={() => goTab('address')}
            onGoProfile={() => goTab('profile')}
          />
        )}

        {tab === 'login' && (
          <LoginPage
            onLoginSuccess={(nextRole) => {
              setRole(nextRole || '')
              refreshAuthState()
              if (nextRole !== 'ADMIN') {
                goTab('home')
              }
            }}
            onGoRegister={() => goTab('register')}
          />
        )}

        {tab === 'register' && (
          <RegisterPage
            onRegisterSuccess={() => goTab('login')}
            onGoLogin={() => goTab('login')}
          />
        )}

        {tab === 'recommend' && (
          <RecommendPage
            isLoggedIn={isLoggedIn}
            onOpenProduct={(id) => openDetail(id, 'recommend')}
            aiQuestion={recommendAiQuestion}
            setAiQuestion={setRecommendAiQuestion}
            aiMsg={recommendAiMsg}
            setAiMsg={setRecommendAiMsg}
            chatMessages={recommendChatMessages}
            setChatMessages={setRecommendChatMessages}
            onClearAiState={clearRecommendAiState}
          />
        )}
      </main>

      {/* 登录弹窗 */}
      {showLoginModal && (
        <div className="login-modal-overlay">
          <div className="login-modal">
            <div className="login-modal-header">
              <h2 className="login-modal-title">欢迎来到 Pants Mall</h2>
              <button 
                className="login-modal-close" 
                onClick={() => setShowLoginModal(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="login-modal-body">
              <p className="login-modal-message">
                登录后可以享受更多服务，包括：
              </p>
              <ul className="login-modal-features">
                <li>保存身材档案，获得更精准的智能推荐</li>
                <li>收藏喜欢的商品，方便后续查看</li>
                <li>查看和管理您的订单</li>
                <li>享受会员专属优惠</li>
              </ul>
              <div className="login-modal-actions">
                <button 
                  className="login-modal-btn login-modal-btn-primary" 
                  onClick={() => {
                    setShowLoginModal(false)
                    goTab('login')
                  }}
                >
                  立即登录
                </button>
                <button 
                  className="login-modal-btn login-modal-btn-secondary" 
                  onClick={() => {
                    setShowLoginModal(false)
                    goTab('register')
                  }}
                >
                  注册账号
                </button>
                <button 
                  className="login-modal-btn login-modal-btn-outline" 
                  onClick={() => setShowLoginModal(false)}
                >
                  稍后登录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TopBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`mall-nav-btn ${active ? 'mall-nav-btn-active' : ''}`}
      type="button"
    >
      {children}
    </button>
  )
}

function HomePage({
  onGoProducts,
  onGoRecommend,
  onGoPantsWithFilter,
  onOpenDetail,
}: {
  onGoProducts: () => void
  onGoRecommend: () => void
  onGoPantsWithFilter: (filter: {
    pantType?: string
    color?: string
    size?: string
    brand?: string
    minPrice?: string
    maxPrice?: string
    sortBy?: string
    sortOrder?: string
  }) => void
  onOpenDetail: (spuId: string | number) => void
}) {
  const [hotProducts, setHotProducts] = useState<ProductItem[]>([])
  const [loadingHotProducts, setLoadingHotProducts] = useState(true)

  useEffect(() => {
    async function loadHotProducts() {
      try {
        const data = await getProductList({
          pageNo: 1,
          pageSize: 4,
          sortBy: 'SALES',
          sortOrder: 'DESC',
        })
        setHotProducts(data.list)
      } catch (error) {
        console.error('Failed to load hot products:', error)
      } finally {
        setLoadingHotProducts(false)
      }
    }
    loadHotProducts()
  }, [])

  return (
    <div className="home-page">
      {/* 英雄区 */}
      <section className="home-hero">
        <div className="home-hero-content">
          <div className="home-hero-tag">PANTS MALL</div>
          <h1 className="home-hero-title">智能选裤，穿出你的风格</h1>
          <p className="home-hero-sub">
            基于人体数据的智能推荐，为你找到最合身的裤装。AI 分析身材特征，
            匹配最适合的款式、尺码与版型，让每一条裤子都像为你量身定制。
          </p>
          <div className="home-hero-btn-group">
            <button type="button" className="home-hero-btn primary" onClick={onGoProducts}>
              浏览商品
            </button>
            <button type="button" className="home-hero-btn secondary" onClick={onGoRecommend}>
              AI推荐助手
            </button>
          </div>
        </div>
        <div className="home-hero-visual">
          <div className="home-hero-image">
            <img 
              src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20men%20pants%20fashion%20model%20wearing%20stylish%20pants%2C%20professional%20photography%2C%20clean%20background&image_size=landscape_16_9" 
              alt="智能选裤" 
            />
          </div>
        </div>
      </section>

      {/* 分类导航 */}
      <section className="home-category">
        <div className="home-category-header">
          <h2 className="home-section-title">版型分类</h2>
          <p className="home-section-sub">快速找到你需要的裤装版型</p>
        </div>
        <div className="home-category-grid">
          {
            [
              { name: '直筒', icon: '👖', color: '#3b82f6', desc: '经典百搭，舒适有型' },
              { name: '修身', icon: '👔', color: '#f97316', desc: '贴合身形，时尚修身' },
              { name: '宽松', icon: '🏃', color: '#8b5cf6', desc: '休闲舒适，活动自如' },
              { name: '休闲', icon: '👕', color: '#10b981', desc: '标准版型，适合大多数人' },
              { name: '阔腿', icon: '🩳', color: '#ef4444', desc: '宽松舒适，时尚潮流' },
            ].map((cat, idx) => (
              <button 
                key={idx} 
                className="home-category-card" 
                onClick={() => onGoPantsWithFilter({ fitType: cat.name })}
                style={{ '--cat-color': cat.color } as React.CSSProperties}
              >
                <div className="home-category-icon">{cat.icon}</div>
                <div className="home-category-name">{cat.name}</div>
                <div className="home-category-desc">{cat.desc}</div>
              </button>
            ))
          }
        </div>
      </section>

      {/* 热门推荐 */}
      <section className="home-recommend">
        <div className="home-recommend-header">
          <h2 className="home-section-title">热门推荐</h2>
          <p className="home-section-sub">精选优质裤装，为你推荐</p>
          <button 
            className="home-recommend-btn" 
            onClick={onGoProducts}
          >
            查看全部
          </button>
        </div>
        <div className="home-recommend-grid">
          {loadingHotProducts ? (
            <div className="home-recommend-loading">加载中...</div>
          ) : hotProducts.length === 0 ? (
            <div className="home-recommend-empty">暂无热门商品</div>
          ) : (
            hotProducts.map((item) => (
              <div key={item.id} className="home-recommend-card">
                <div className="home-recommend-image">
                  {item.coverUrl ? (
                    <img src={resolveImageUrl(item.coverUrl)} alt={item.name || ''} />
                  ) : (
                    <div className="home-recommend-placeholder">
                      <div className="home-recommend-placeholder-icon">👖</div>
                      <div className="home-recommend-placeholder-text">{item.name || '商品'}</div>
                    </div>
                  )}
                </div>
                <div className="home-recommend-content">
                  <h3 className="home-recommend-title">{item.name}</h3>
                  <div className="home-recommend-price">
                    {item.minPrice && item.maxPrice && item.minPrice !== item.maxPrice
                      ? `¥${item.minPrice.toFixed(2)} ~ ¥${item.maxPrice.toFixed(2)}`
                      : item.minPrice
                      ? `¥${item.minPrice.toFixed(2)}`
                      : '价格待定'}
                  </div>
                  <button 
                    className="home-recommend-action" 
                    onClick={() => onOpenDetail(item.id)}
                  >
                    查看详情
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 品牌优势 */}
      <section className="home-feature">
        <div className="home-feature-header">
          <h2 className="home-section-title">为什么选择我们？</h2>
          <p className="home-section-sub"><></>智能选裤的核心优势</p>
        </div>
        <div className="home-feature-grid">
          {[
            { 
              title: 'AI 智能推荐', 
              desc: '基于人体数据的智能分析，为你推荐最合身的裤装',
              icon: '🤖' 
            },
            { 
              title: '精准尺码匹配', 
              desc: '详细的尺码数据，确保每一条裤子都完美贴合',
              icon: '📏' 
            },
            { 
              title: '多样化选择', 
              desc: '丰富的款式和风格，满足不同场合的穿着需求',
              icon: '👕' 
            },
            { 
              title: '品质保证', 
              desc: '精选优质面料，舒适耐穿，彰显品质生活',
              icon: '🛡️' 
            },
          ].map((item, idx) => (
            <div key={idx} className="home-feature-card">
              <div className="home-feature-icon">{item.icon}</div>
              <h3 className="home-feature-title">{item.title}</h3>
              <p className="home-feature-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>



    </div>
  )
}

