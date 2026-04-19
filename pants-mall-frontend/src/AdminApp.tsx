import { useEffect, useMemo, useState } from 'react'
import AdminHomePage from './AdminHomePage'
import AdminProductPage from './AdminProductPage'
import AdminCategoryPage from './AdminCategoryPage'
import AdminOrdersPage from './AdminOrdersPage'
import AdminAfterSalePage from './AdminAfterSalePage'
import AdminProfilePage from './AdminProfilePage'
import client from './api/client'

type SearchResult = {
  type: 'product' | 'order' | 'category' | 'afterSale'
  id: string
  title: string
  subtitle?: string
  module: string
}

type SearchResults = {
  products: SearchResult[]
  orders: SearchResult[]
  categories: SearchResult[]
  afterSales: SearchResult[]
}

type AdminTab =
  | 'admin-home'
  | 'admin-products'
  | 'admin-orders'
  | 'admin-after-sales'
  | 'admin-categories'
  | 'admin-profile'

type TabItem = {
  key: AdminTab
  label: string
  desc: string
}

const TAB_LIST: TabItem[] = [
  {
    key: 'admin-home',
    label: '管理首页',
    desc: '查看后台整体概况',
  },
  {
    key: 'admin-products',
    label: '商品管理',
    desc: '维护商品与 SKU',
  },
  {
    key: 'admin-orders',
    label: '订单管理',
    desc: '查看订单并处理发货',
  },
  {
    key: 'admin-after-sales',
    label: '售后管理',
    desc: '处理退款与退货退款申请',
  },
  {
    key: 'admin-categories',
    label: '分类管理',
    desc: '维护商品分类体系',
  },
]

export default function AdminApp() {
  const [tab, setTab] = useState<AdminTab>('admin-home')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const username = localStorage.getItem('username') || 'admin'
  const userRole = localStorage.getItem('role') || 'admin'

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'SET_ADMIN_TAB') {
        const newTab = event.data.tab as AdminTab
        if (TAB_LIST.some(item => item.key === newTab)) {
          setTab(newTab)
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const currentTabMeta = useMemo(() => {
    return TAB_LIST.find((item) => item.key === tab) || TAB_LIST[0]
  }, [tab])

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('role')
    window.location.reload()
  }

  return (
    <div style={pageStyle}>
      <div style={bgGlowOneStyle} />
      <div style={bgGlowTwoStyle} />

      <header style={headerStyle}>
        <div style={brandWrapStyle}>
          <div style={brandLogoStyle}>管</div>
          <div>
            <div style={brandTitleStyle}>Pants Mall Admin</div>
            <div style={brandSubStyle}>后台管理系统</div>
          </div>
        </div>

        <div style={headerCenterStyle}>
          <div style={topBadgeStyle}>ADMIN PANEL</div>
          <div style={topTitleStyle}>{currentTabMeta.label}</div>
          <div style={topDescStyle}>{currentTabMeta.desc}</div>
        </div>

        <div style={headerRightStyle}>
          <div
            style={{
              ...adminUserCardStyle,
              position: 'relative',
              zIndex: 1000
            }}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div style={adminUserLabelStyle}>当前管理员</div>
            <div style={adminUserValueStyle}>👤 {username}</div>
            {showUserMenu && (
              <div 
                style={userDropdownStyle}
              >
                <div
                  style={userDropdownItemStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTab('admin-profile');
                    setShowUserMenu(false);
                  }}
                >
                  <span style={userDropdownIconStyle}>👤</span>
                  <span>个人中心</span>
                </div>
                <div
                  style={userDropdownDividerStyle}
                />
                <div
                  style={userDropdownItemStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                >
                  <span style={userDropdownIconStyle}>🚪</span>
                  <span>退出登录</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <section style={navWrapStyle}>
        <div style={breadcrumbStyle}>
          <span style={breadcrumbItemStyle}>后台管理</span>
          <span style={breadcrumbSeparatorStyle}> / </span>
          <span style={breadcrumbItemActiveStyle}>{currentTabMeta.label}</span>
        </div>
        <div style={navInnerStyle}>
          {TAB_LIST.map((item) => (
            <TopBtn
              key={item.key}
              active={tab === item.key}
              onClick={() => setTab(item.key)}
              desc={item.desc}
            >
              {item.label}
            </TopBtn>
          ))}
        </div>
      </section>

      <main style={mainStyle}>
        {tab === 'admin-home' && <AdminHomePage />}
        {tab === 'admin-products' && <AdminProductPage />}
        {tab === 'admin-orders' && <AdminOrdersPage />}
        {tab === 'admin-after-sales' && <AdminAfterSalePage />}
        {tab === 'admin-categories' && <AdminCategoryPage />}
        {tab === 'admin-profile' && <AdminProfilePage />}
      </main>
    </div>
  )
}

function TopBtn({
  active,
  onClick,
  children,
  desc,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  desc: string
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        ...navBtnStyle,
        ...(active ? navBtnActiveStyle : {}),
      }}
    >
      <div style={navBtnTitleStyle}>{children}</div>
      <div
        style={{
          ...navBtnDescStyle,
          ...(active ? navBtnDescActiveStyle : {}),
        }}
      >
        {desc}
      </div>
    </button>
  )
}

const pageStyle: React.CSSProperties = {
  position: 'relative',
  minHeight: '100vh',
  padding: 24,
  background:
    'linear-gradient(180deg, #f8fbff 0%, #f8fafc 38%, #fdfdfd 100%)',
  overflow: 'hidden',
  '@media (maxWidth: 768px)': {
    padding: 12,
  },
}

const bgGlowOneStyle: React.CSSProperties = {
  position: 'absolute',
  top: -120,
  left: -80,
  width: 360,
  height: 360,
  borderRadius: '50%',
  background: 'rgba(37,99,235,0.10)',
  filter: 'blur(40px)',
  pointerEvents: 'none',
}

const bgGlowTwoStyle: React.CSSProperties = {
  position: 'absolute',
  top: 40,
  right: -120,
  width: 380,
  height: 380,
  borderRadius: '50%',
  background: 'rgba(255,122,0,0.10)',
  filter: 'blur(44px)',
  pointerEvents: 'none',
}

const headerStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1000,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr auto',
  gap: 18,
  alignItems: 'stretch',
  padding: 16,
  borderRadius: 20,
  background: 'linear-gradient(135deg, #eff6ff, #ffffff 60%, #fff8f1)',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 12px 28px rgba(15,23,42,0.06)',
  '@media (maxWidth: 1024px)': {
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: 'auto auto',
  },
  '@media (maxWidth: 768px)': {
    gridTemplateColumns: '1fr',
    gridTemplateRows: 'auto auto auto',
    padding: 12,
    gap: 10,
  },
}

const brandWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  minWidth: 0,
}

const brandLogoStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
  color: '#fff',
  fontSize: 22,
  fontWeight: 900,
  boxShadow: '0 8px 16px rgba(37,99,235,0.22)',
  flexShrink: 0,
}

const brandTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  color: '#111827',
  lineHeight: 1.2,
}

const brandSubStyle: React.CSSProperties = {
  marginTop: 4,
  color: '#6b7280',
  fontSize: 12,
  lineHeight: 1.5,
}

const headerCenterStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minWidth: 0,
}

const topBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignSelf: 'flex-start',
  padding: '4px 10px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
  fontSize: 11,
  fontWeight: 800,
}

const topTitleStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 22,
  fontWeight: 900,
  color: '#111827',
  lineHeight: 1.2,
}

const topDescStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#6b7280',
  fontSize: 13,
  lineHeight: 1.6,
}

const headerRightStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  alignItems: 'stretch',
  minWidth: 180,
}

const adminUserCardStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 8px 18px rgba(15,23,42,0.04)',
  cursor: 'pointer',
  position: 'relative',
  transition: 'all 0.2s ease',
}

const adminUserLabelStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: 11,
  fontWeight: 700,
}

const adminUserValueStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#111827',
  fontSize: 15,
  fontWeight: 900,
  lineHeight: 1.4,
  wordBreak: 'break-word',
}

const userDropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 8,
  borderRadius: 12,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.08)',
  boxShadow: '0 12px 28px rgba(15,23,42,0.14)',
  overflow: 'hidden',
  zIndex: 1000,
}

const userDropdownItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 14px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontSize: 14,
  fontWeight: 600,
  color: '#374151',
}

const userDropdownIconStyle: React.CSSProperties = {
  fontSize: 16,
}

const userDropdownDividerStyle: React.CSSProperties = {
  height: 1,
  background: 'rgba(15,23,42,0.06)',
  margin: '4px 0',
}

const logoutBtnStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: 'none',
  background: '#111827',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
}

const navWrapStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  marginTop: 14,
}

const navInnerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 12,
  '@media (maxWidth: 1024px)': {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
  '@media (maxWidth: 768px)': {
    gridTemplateColumns: '1fr',
    gap: 8,
  },
}

const navBtnStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 16,
  border: '1px solid rgba(15,23,42,0.06)',
  background: '#ffffff',
  color: '#111827',
  cursor: 'pointer',
  textAlign: 'left',
  boxShadow: '0 10px 22px rgba(15,23,42,0.04)',
  transition: 'all 0.2s ease',
}

const navBtnActiveStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #111827, #1f2937)',
  color: '#fff',
  boxShadow: '0 14px 28px rgba(15,23,42,0.16)',
  transform: 'translateY(-1px)',
}

const navBtnTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  lineHeight: 1.4,
}

const navBtnDescStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#6b7280',
  fontSize: 12,
  lineHeight: 1.6,
}

const navBtnDescActiveStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.78)',
}

const breadcrumbStyle: React.CSSProperties = {
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  color: '#6b7280',
}

const breadcrumbItemStyle: React.CSSProperties = {
  color: '#6b7280',
  cursor: 'pointer',
  transition: 'color 0.2s ease',
}

const breadcrumbItemActiveStyle: React.CSSProperties = {
  color: '#111827',
  fontWeight: 700,
}

const breadcrumbSeparatorStyle: React.CSSProperties = {
  color: '#9ca3af',
}

const mainStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  marginTop: 20,
}
