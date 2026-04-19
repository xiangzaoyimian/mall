import { useEffect, useMemo, useState } from 'react'
import client from './api/client'
import { getProfileById, type BodyProfile } from './api/bodyProfile'

type AdminTab =
  | 'admin-home'
  | 'admin-products'
  | 'admin-orders'
  | 'admin-after-sales'
  | 'admin-categories'
  | 'admin-profile'

type ProductItem = {
  id?: string
  name?: string
  categoryId?: string
  description?: string
  status?: string
  sales?: number
  coverUrl?: string
  minPrice?: number
  maxPrice?: number
  totalStock?: number
}

type ProductListResp = {
  total: number
  list: ProductItem[]
}

type CategoryItem = {
  id?: string
  name?: string
  parentId?: string
  sort?: number
  status?: string
}

type OrderListItem = {
  id?: string
  orderNo?: string
  userId?: string
  totalAmount?: number
  status?: string
  addressSnapshot?: string
  remark?: string
  createdAt?: string
}

type AfterSaleItem = {
  id?: string
  orderId?: string
  orderNo?: string
  userId?: string
  type?: string
  status?: string
  reason?: string
  description?: string
  adminRemark?: string
  createdAt?: string
}

type PageResp<T> = {
  total: number
  page: number
  size: number
  list: T[]
}

type RecommendItem = {
  spuId?: string
  skuId?: string
  name?: string
  spuName?: string
  coverUrl?: string
  image?: string
  price?: number
  stock?: number
  fitType?: string
  lengthCm?: number
  waistCm?: number
  reason?: string
  matchScore?: number
  recommendType?: 'BEST' | 'GOOD' | 'FALLBACK' | string
}

function countByStatus<T extends { status?: string }>(list: T[], status: string) {
  return list.filter((item) => String(item.status || '').toUpperCase() === status).length
}

function formatMoney(value: number) {
  return `¥${Number(value || 0)}`
}

function toDateKey(value?: string) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function getLocalTodayKey() {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

function resolveImageUrl(url?: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `http://localhost:8081${url}`
}

function getRecommendBadge(type?: string) {
  if (type === 'BEST') {
    return {
      text: '🔥 强推荐',
      bg: 'rgba(22,163,74,0.10)',
      color: '#15803d',
      border: '1px solid rgba(22,163,74,0.20)',
    }
  }
  if (type === 'GOOD') {
    return {
      text: '👍 推荐',
      bg: 'rgba(37,99,235,0.10)',
      color: '#2563eb',
      border: '1px solid rgba(37,99,235,0.20)',
    }
  }
  return {
    text: '💡 可参考',
    bg: 'rgba(245,158,11,0.12)',
    color: '#d97706',
    border: '1px solid rgba(245,158,11,0.24)',
  }
}

function getMatchColor(score?: number) {
  const s = Number(score ?? 0)
  if (s >= 80) return '#16a34a'
  if (s >= 65) return '#2563eb'
  return '#f59e0b'
}

function getMatchBg(score?: number) {
  const s = Number(score ?? 0)
  if (s >= 80) return 'rgba(22,163,74,0.08)'
  if (s >= 65) return 'rgba(37,99,235,0.08)'
  return 'rgba(245,158,11,0.10)'
}

function getReasonBoxStyle(score?: number): React.CSSProperties {
  const s = Number(score ?? 0)
  if (s >= 80) {
    return {
      marginTop: 12,
      padding: 14,
      borderRadius: 16,
      background: 'rgba(22,163,74,0.06)',
      border: '1px solid rgba(22,163,74,0.18)',
      color: '#166534',
      lineHeight: 1.8,
      fontSize: 14,
    }
  }
  if (s >= 65) {
    return {
      marginTop: 12,
      padding: 14,
      borderRadius: 16,
      background: 'rgba(37,99,235,0.06)',
      border: '1px solid rgba(37,99,235,0.18)',
      color: '#1d4ed8',
      lineHeight: 1.8,
      fontSize: 14,
    }
  }
  return {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.22)',
    color: '#b45309',
    lineHeight: 1.8,
    fontSize: 14,
  }
}

export default function AdminHomePage() {
  const username = localStorage.getItem('username') || 'admin'
  const [tab, setTab] = useState<AdminTab>('admin-home')

  const [productTotal, setProductTotal] = useState(0)
  const [categoryTotal, setCategoryTotal] = useState(0)
  const [orderTotal, setOrderTotal] = useState(0)
  const [finishedOrderCount, setFinishedOrderCount] = useState(0)

  const [afterSaleTotal, setAfterSaleTotal] = useState(0)
  const [pendingAfterSaleCount, setPendingAfterSaleCount] = useState(0)
  const [approvedAfterSaleCount, setApprovedAfterSaleCount] = useState(0)
  const [rejectedAfterSaleCount, setRejectedAfterSaleCount] = useState(0)

  const [todayOrders, setTodayOrders] = useState(0)
  const [todayFinishedOrders, setTodayFinishedOrders] = useState(0)
  const [todayGmv, setTodayGmv] = useState(0)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const [profileId, setProfileId] = useState('')
  const [profileDetail, setProfileDetail] = useState<BodyProfile | null>(null)
  const [loadingRecommend, setLoadingRecommend] = useState(false)
  const [recommendList, setRecommendList] = useState<RecommendItem[]>([])
  const [recommendMsg, setRecommendMsg] = useState('')

  const [hoverRefreshStats, setHoverRefreshStats] = useState(false)
  const [hoverGetRecommend, setHoverGetRecommend] = useState(false)
  const [focusProfileInput, setFocusProfileInput] = useState(false)
  const [hoverQuickCard, setHoverQuickCard] = useState('')
  const [hoverStatCard, setHoverStatCard] = useState('')
  const [hoverRecommendCard, setHoverRecommendCard] = useState('')

  const dashboardStatusText = useMemo(() => {
    if (loading) return '统计加载中'
    if (msg) return '统计加载有提示'
    return '统计已就绪'
  }, [loading, msg])

  const recommendStatusText = useMemo(() => {
    if (loadingRecommend) return '推荐获取中'
    if (recommendMsg) return '推荐结果有提示'
    if (recommendList.length > 0) return '推荐结果已加载'
    return '等待调试'
  }, [loadingRecommend, recommendMsg, recommendList.length])

  function handleTabChange(newTab: AdminTab) {
    window.parent.postMessage({ type: 'SET_ADMIN_TAB', tab: newTab }, '*')
  }

  async function loadDashboard() {
    setLoading(true)
    setMsg('')

    try {
      const [productResp, categoryResp, orderResp, afterSaleResp] =
        await Promise.all([
          client.get('/admin/spu', {
            params: {
              pageNo: 1,
              pageSize: 1,
            },
          }),
          client.get('/admin/categories'),
          client.get('/admin/orders', {
            params: {
              page: 1,
              size: 200,
            },
          }),
          client.get('/admin/after-sales', {
            params: {
              page: 1,
              size: 200,
            },
          }),
        ])

      const productData: ProductListResp = productResp?.data?.data || {
        total: 0,
        list: [],
      }

      const categoryData: CategoryItem[] = categoryResp?.data?.data || []

      const orderData: PageResp<OrderListItem> = orderResp?.data?.data || {
        total: 0,
        page: 1,
        size: 200,
        list: [],
      }

      const afterSaleData: PageResp<AfterSaleItem> = afterSaleResp?.data?.data || {
        total: 0,
        page: 1,
        size: 200,
        list: [],
      }

      const safeCategoryList = Array.isArray(categoryData) ? categoryData : []
      const safeOrderList = Array.isArray(orderData.list) ? orderData.list : []
      const safeAfterSaleList = Array.isArray(afterSaleData.list)
        ? afterSaleData.list
        : []

      setProductTotal(Number(productData.total || 0))
      setCategoryTotal(safeCategoryList.length)
      setOrderTotal(Number(orderData.total || 0))
      setFinishedOrderCount(countByStatus(safeOrderList, 'FINISHED'))

      setAfterSaleTotal(Number(afterSaleData.total || 0))
      setPendingAfterSaleCount(countByStatus(safeAfterSaleList, 'PENDING'))
      setApprovedAfterSaleCount(countByStatus(safeAfterSaleList, 'APPROVED'))
      setRejectedAfterSaleCount(countByStatus(safeAfterSaleList, 'REJECTED'))

      const today = getLocalTodayKey()

      const todayOrderList = safeOrderList.filter((item) => {
        return toDateKey(item.createdAt) === today
      })

      setTodayOrders(todayOrderList.length)

      const finishedTodayList = todayOrderList.filter(
        (item) => String(item.status || '').toUpperCase() === 'FINISHED'
      )

      setTodayFinishedOrders(finishedTodayList.length)

      const gmv = finishedTodayList.reduce(
        (sum, item) => sum + Number(item.totalAmount || 0),
        0
      )
      setTodayGmv(gmv)
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || '首页统计加载失败')
    } finally {
      setLoading(false)
    }
  }

  async function loadRecommend() {
    const raw = profileId.trim()

    if (!raw) {
      setRecommendMsg('请输入 profileId')
      setRecommendList([])
      setProfileDetail(null)
      return
    }

    if (!/^\d+$/.test(raw)) {
      setRecommendMsg('profileId 必须为数字')
      setRecommendList([])
      setProfileDetail(null)
      return
    }

    setLoadingRecommend(true)
    setRecommendMsg('')
    setProfileDetail(null)
    setRecommendList([])

    let profileErrorMsg = ''
    let recommendErrorMsg = ''

    try {
      const profile = await getProfileById(raw)
      setProfileDetail(profile || null)
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setProfileDetail(null)
      profileErrorMsg = err?.response?.data?.msg || err?.message || '档案详情加载失败'
    }

    try {
      const resp = await client.get('/recommend/pants/by-profile', {
        params: {
          profileId: raw,
        },
      })

      const data: RecommendItem[] = resp?.data?.data || []
      const safeList = Array.isArray(data) ? data : []

      setRecommendList(safeList)

      if (safeList.length === 0) {
        recommendErrorMsg = '当前 profileId 暂无推荐结果'
      }
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setRecommendList([])
      recommendErrorMsg = err?.response?.data?.msg || err?.message || '推荐结果加载失败'
    } finally {
      const finalMsg = [profileErrorMsg, recommendErrorMsg].filter(Boolean).join('；')
      setRecommendMsg(finalMsg)
      setLoadingRecommend(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={heroKickerStyle}>ADMIN PANEL</div>
          <h1 style={heroTitleStyle}>管理后台</h1>
          <div style={heroDescStyle}>
            当前已进入管理员后台。现在首页会展示商品、分类、订单、售后与今日成交概况，
            方便你快速掌握后台运营状态，并支持在后台直接调试基于体型档案的推荐能力。
          </div>

          {msg ? <div style={msgStyle}>{msg}</div> : null}
        </div>

        <div style={heroSideWrapStyle}>
          <div style={heroSideCardStyle}>
            <div style={heroSideLabelStyle}>当前管理员</div>
            <div style={heroSideValueStyle}>{username}</div>
            <div style={heroSideDescStyle}>已登录后台系统</div>
          </div>

          <div style={heroSideCardStyle}>
            <div style={heroSideLabelStyle}>首页状态</div>
            <div style={heroSideValueStyle}>{dashboardStatusText}</div>
            <div style={heroSideDescStyle}>
              {loading ? '正在同步后台统计数据' : '当前首页统计已完成加载'}
            </div>
          </div>
        </div>
      </section>

      <section style={statsGridStyle}>
        {[
            {
              key: 'product',
              label: '商品总数',
              value: loading ? '...' : productTotal,
              desc: '当前后台商品主体（SPU）总量',
              color: '#10b981',
            },
            {
              key: 'category',
              label: '分类总数',
              value: loading ? '...' : categoryTotal,
              desc: '当前有效分类记录数量',
              color: '#10b981',
            },
            {
              key: 'order',
              label: '订单总数',
              value: loading ? '...' : orderTotal,
              desc: '后台订单记录总数',
              color: '#3b82f6',
            },
            {
              key: 'finished',
              label: '已完成订单',
              value: loading ? '...' : finishedOrderCount,
              desc: '状态为 FINISHED 的订单数',
              color: '#3b82f6',
            },
            {
              key: 'afterSaleTotal',
              label: '售后总数',
              value: loading ? '...' : afterSaleTotal,
              desc: '售后申请记录总数',
              color: '#f59e0b',
            },
            {
              key: 'afterSalePending',
              label: '待审核售后',
              value: loading ? '...' : pendingAfterSaleCount,
              desc: '当前待处理的售后申请',
              color: '#f59e0b',
            },
            {
              key: 'afterSaleApproved',
              label: '已通过售后',
              value: loading ? '...' : approvedAfterSaleCount,
              desc: '审核通过的售后申请数',
              color: '#f59e0b',
            },
            {
              key: 'afterSaleRejected',
              label: '已拒绝售后',
              value: loading ? '...' : rejectedAfterSaleCount,
              desc: '审核拒绝的售后申请数',
              color: '#f59e0b',
            },
            {
              key: 'todayOrder',
              label: '今日订单',
              value: loading ? '...' : todayOrders,
              desc: '今天创建的订单数量',
              color: '#8b5cf6',
            },
            {
              key: 'todayFinished',
              label: '今日成交',
              value: loading ? '...' : todayFinishedOrders,
              desc: '今天完成的订单数量',
              color: '#8b5cf6',
            },
            {
              key: 'todayGmv',
              label: '今日 GMV',
              value: loading ? '...' : formatMoney(todayGmv),
              desc: '今天已完成订单的成交金额',
              color: '#8b5cf6',
            },
            {
              key: 'recommendStatus',
              label: '推荐状态',
              value: recommendStatusText,
              desc: '推荐系统调试面板当前状态',
              small: true,
              color: '#ec4899',
            },
          ].map((item) => (
            <div
              key={item.key}
              style={{
                ...statCardStyle,
                borderLeft: `4px solid ${item.color}`,
                ...(hoverStatCard === item.key ? hoverStatCardStyle : {}),
              }}
              onMouseEnter={() => setHoverStatCard(item.key)}
              onMouseLeave={() => setHoverStatCard('')}
            >
              <div style={{
                ...statLabelStyle,
                color: item.color,
              }}>{item.label}</div>
              <div style={{
                ...(item.small ? statValueStyleSmall : statValueStyle),
                color: item.color,
              }}>
                {item.value}
              </div>
              <div style={statDescStyle}>{item.desc}</div>
            </div>
          ))}
      </section>

      <section style={sectionWrapStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={sectionKickerStyle}>QUICK OVERVIEW</div>
            <h2 style={sectionTitleStyle}>后台模块概览</h2>
          </div>
        </div>

        <div style={quickGridStyle}>
          {
            [
              {
                key: 'productQuick',
                tag: 'PRODUCT',
                title: '商品管理',
                desc: '已支持商品列表、商品编辑、SKU 维护、上下架与删除操作。',
                tab: 'admin-products' as AdminTab,
              },
              {
                key: 'orderQuick',
                tag: 'ORDER',
                title: '订单管理',
                desc: '已支持订单列表、详情查看、管理员发货与完成订单流程。',
                tab: 'admin-orders' as AdminTab,
              },
              {
                key: 'afterSaleQuick',
                tag: 'AFTER SALE',
                title: '售后管理',
                desc: '已支持退款、退货退款申请查看与管理员审核处理。',
                tab: 'admin-after-sales' as AdminTab,
              },
            ].map((item) => (
              <div
                key={item.key}
                style={{
                  ...quickCardStyle,
                  ...(hoverQuickCard === item.key ? hoverQuickCardStyle : {}),
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoverQuickCard(item.key)}
                onMouseLeave={() => setHoverQuickCard('')}
                onClick={() => handleTabChange(item.tab)}
              >
                <div style={quickCardTagStyle}>{item.tag}</div>
                <div style={quickCardTitleStyle}>{item.title}</div>
                <div style={quickCardDescStyle}>{item.desc}</div>
                <div style={quickCardActionStyle}>
                  查看详情 →
                </div>
              </div>
            ))
          }
        </div>
      </section>

      <section style={sectionWrapStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={sectionKickerStyle}>RECOMMEND DEBUG</div>
            <h2 style={sectionTitleStyle}>推荐系统调试</h2>
          </div>
        </div>

        <div style={recommendIntroStyle}>
          这里用于在后台直接验证"基于体型档案的裤品推荐"能力。输入用户体型档案
          档案 ID 后，系统会调用推荐接口返回推荐结果，便于演示和调试推荐链路。
          <br/><br/>
          <strong>功能说明：</strong>
          <ul style={recommendIntroListStyle}>
            <li>输入有效的档案 ID（数字格式）</li>
            <li>系统会自动加载对应档案的详细信息</li>
            <li>调用推荐接口获取个性化裤品推荐</li>
            <li>展示推荐结果的匹配度、推荐理由等详细信息</li>
            <li>支持查看推荐商品的图片、价格、库存等信息</li>
          </ul>
          <br/>
          <strong>示例：</strong> 输入 <code style={codeStyle}>30002</code> 查看示例档案的推荐结果
        </div>

        <div style={recommendFormWrapStyle}>
          <div style={recommendFieldStyle}>
            <label style={recommendLabelStyle}>档案ID</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                placeholder="请输入体型档案 ID，例如：30002"
                style={{
                  ...recommendInputStyle,
                  ...(focusProfileInput ? focusedInputStyle : {}),
                  flex: 1,
                }}
                onFocus={() => setFocusProfileInput(true)}
                onBlur={() => setFocusProfileInput(false)}
              />
              <button
                type="button"
                onClick={loadRecommend}
                style={{
                  ...refreshBtnStyle,
                  ...(hoverGetRecommend ? hoverRefreshBtnStyle : {}),
                }}
                disabled={loadingRecommend}
                onMouseEnter={() => setHoverGetRecommend(true)}
                onMouseLeave={() => setHoverGetRecommend(false)}
              >
                {loadingRecommend ? '获取中...' : '获取推荐'}
              </button>
            </div>

            {profileId.trim() ? (
              <div style={recommendProfileHintStyle}>
                当前档案：
                <span style={recommendProfileStrongStyle}>{profileId.trim()}</span>
                {profileDetail?.name ? (
                  <span style={recommendProfileNameStyle}> / {profileDetail.name}</span>
                ) : (
                  <span style={recommendProfileMutedStyle}> / 当前档案名暂不可见</span>
                )}
              </div>
            ) : null}

            {profileDetail ? (
              <div style={profileCardStyle}>
                <div style={profileCardTitleStyle}>当前档案信息</div>
                <div style={profileMetaRowStyle}>
                  <span style={recommendTagStyle}>档案名 {profileDetail.name || '-'}</span>
                  <span style={recommendTagStyle}>身高 {profileDetail.heightCm ?? '-'} cm</span>
                  <span style={recommendTagStyle}>体重 {profileDetail.weightKg ?? '-'} kg</span>
                  <span style={recommendTagStyle}>腰围 {profileDetail.waistCm ?? '-'} cm</span>
                  <span style={recommendTagStyle}>
                    腿长 {profileDetail.legLengthCm ?? '-'} cm
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {recommendMsg ? <div style={msgStyle}>{recommendMsg}</div> : null}

        <div style={recommendResultWrapStyle}>
          {recommendList.length === 0 ? (
            <div style={recommendEmptyStyle}>暂无推荐结果</div>
          ) : (
            recommendList.map((item, index) => {
              const title =
                item.name || item.spuName || `推荐商品 #${String(item.spuId || index + 1)}`
              const imageUrl = resolveImageUrl(item.coverUrl || item.image)
              const score = Number(item.matchScore ?? 0)
              const badge = getRecommendBadge(item.recommendType)
              const scoreColor = getMatchColor(score)
              const scoreBg = getMatchBg(score)
              const cardKey = `${String(item.spuId || '')}-${index}`

              return (
                <div
                  key={cardKey}
                  style={{
                    ...recommendCardStyle,
                    ...(hoverRecommendCard === cardKey ? hoverRecommendCardStyle : {}),
                  }}
                  onMouseEnter={() => setHoverRecommendCard(cardKey)}
                  onMouseLeave={() => setHoverRecommendCard('')}
                >
                  <div style={recommendCardTopStyle}>
                    <div>
                      <div style={recommendRankStyle}>TOP {index + 1}</div>
                      <div style={recommendTitleStyle}>{title}</div>
                      <div style={recommendMetaStyle}>
                        spuId: {item.spuId || '-'} ｜ skuId: {item.skuId || '-'}
                      </div>
                    </div>

                    <div
                      style={{
                        ...recommendBadgeStyle,
                        background: badge.bg,
                        color: badge.color,
                        border: badge.border,
                      }}
                    >
                      {badge.text}
                    </div>
                  </div>

                  <div style={recommendBodyStyle}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={title} style={recommendImageStyle} />
                    ) : (
                      <div style={recommendImageEmptyStyle}>暂无图片</div>
                    )}

                    <div style={recommendTextWrapStyle}>
                      <div
                        style={{
                          ...recommendScoreBoxStyle,
                          background: scoreBg,
                          border: `1px solid ${scoreColor}33`,
                        }}
                      >
                        <span
                          style={{
                            ...recommendScoreLabelStyle,
                            color: scoreColor,
                          }}
                        >
                          匹配度
                        </span>
                        <span
                          style={{
                            ...recommendScoreValueStyle,
                            color: scoreColor,
                          }}
                        >
                          {score}%
                        </span>
                      </div>

                      <div style={recommendTagRowStyle}>
                        <span style={recommendTagStyle}>{item.fitType || '未标注版型'}</span>
                        <span style={recommendTagStyle}>裤长 {item.lengthCm ?? '-'} cm</span>
                        <span style={recommendTagStyle}>腰围 {item.waistCm ?? '-'} cm</span>
                        <span style={recommendTagStyle}>库存 {item.stock ?? 0}</span>
                      </div>

                      <div style={recommendReasonTitleStyle}>推荐说明</div>
                      <div style={getReasonBoxStyle(score)}>
                        {item.reason || '综合匹配较好'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
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
  gridTemplateColumns: '1.3fr 0.9fr',
  gap: 20,
  padding: 30,
  borderRadius: 28,
  background: 'linear-gradient(135deg, #eff6ff, #ffffff 60%, #f8fafc)',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
}

const heroKickerStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
}

const heroTitleStyle: React.CSSProperties = {
  margin: '14px 0 0',
  fontSize: 42,
  lineHeight: 1.15,
  color: '#111827',
}

const heroDescStyle: React.CSSProperties = {
  marginTop: 14,
  maxWidth: 760,
  color: '#6b7280',
  fontSize: 15,
  lineHeight: 1.8,
}

const heroSideWrapStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 14,
}

const heroSideCardStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 22,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 10px 24px rgba(15,23,42,0.04)',
}

const heroSideLabelStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: 12,
  fontWeight: 700,
}

const heroSideValueStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 28,
  fontWeight: 900,
  color: '#111827',
  lineHeight: 1.2,
}

const heroSideDescStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#6b7280',
  fontSize: 13,
}

const msgStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 16,
  background: '#fff7ed',
  border: '1px solid rgba(251,146,60,0.25)',
  color: '#9a3412',
  whiteSpace: 'pre-wrap',
}

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 16,
  '@media (maxWidth: 1024px)': {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
  '@media (maxWidth: 768px)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  '@media (maxWidth: 480px)': {
    gridTemplateColumns: '1fr',
  },
}

const statCardStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 20,
  background: '#fff',
  borderTop: '1px solid rgba(15,23,42,0.06)',
  borderRight: '1px solid rgba(15,23,42,0.06)',
  borderBottom: '1px solid rgba(15,23,42,0.06)',
  borderLeft: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 8px 24px rgba(15,23,42,0.04)',
  transition: 'transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease',
  position: 'relative',
  overflow: 'hidden',
}

const hoverStatCardStyle: React.CSSProperties = {
  transform: 'translateY(-6px)',
  boxShadow: '0 24px 44px rgba(15,23,42,0.10)',
  borderTop: '1px solid rgba(37,99,235,0.14)',
  borderRight: '1px solid rgba(37,99,235,0.14)',
  borderBottom: '1px solid rgba(37,99,235,0.14)',
  borderLeft: '1px solid rgba(37,99,235,0.14)',
}

const statLabelStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: 12,
  fontWeight: 700,
}

const statValueStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 26,
  fontWeight: 900,
  color: '#111827',
  lineHeight: 1.2,
}

const statValueStyleSmall: React.CSSProperties = {
  marginTop: 10,
  fontSize: 22,
  fontWeight: 900,
  color: '#111827',
  lineHeight: 1.3,
}

const statDescStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#6b7280',
  fontSize: 13,
  lineHeight: 1.7,
}

const sectionWrapStyle: React.CSSProperties = {
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

const refreshBtnStyle: React.CSSProperties = {
  height: 44,
  padding: '0 18px',
  borderRadius: 14,
  border: 'none',
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 800,
  transition: 'transform 0.24s ease, box-shadow 0.24s ease',
}

const hoverRefreshBtnStyle: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 16px 28px rgba(15,23,42,0.18)',
}

const quickGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 18,
  marginTop: 22,
  '@media (max-width: 768px)': {
    gridTemplateColumns: '1fr',
    gap: 14,
  },
}

const quickCardStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 22,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
  transition: 'transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease',
}

const hoverQuickCardStyle: React.CSSProperties = {
  transform: 'translateY(-5px)',
  boxShadow: '0 20px 36px rgba(15,23,42,0.08)',
  border: '1px solid rgba(37,99,235,0.14)',
}

const quickCardTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '6px 12px',
  borderRadius: 999,
  background: '#fff',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
  border: '1px solid rgba(37,99,235,0.12)',
}

const quickCardTitleStyle: React.CSSProperties = {
  marginTop: 14,
  fontSize: 24,
  fontWeight: 900,
  color: '#111827',
}

const quickCardDescStyle: React.CSSProperties = {
  marginTop: 10,
  color: '#6b7280',
  lineHeight: 1.8,
  fontSize: 14,
}

const quickCardActionStyle: React.CSSProperties = {
  marginTop: 14,
  color: '#2563eb',
  fontWeight: 800,
  fontSize: 14,
}

const recommendIntroStyle: React.CSSProperties = {
  marginTop: 18,
  color: '#6b7280',
  lineHeight: 1.8,
  fontSize: 14,
}

const recommendIntroListStyle: React.CSSProperties = {
  marginTop: 8,
  paddingLeft: 20,
}

const codeStyle: React.CSSProperties = {
  background: '#f3f4f6',
  padding: '2px 6px',
  borderRadius: 4,
  fontFamily: 'monospace',
}

const recommendFormWrapStyle: React.CSSProperties = {
  marginTop: 22,
  display: 'grid',
  gridTemplateColumns: 'minmax(260px, 420px)',
  gap: 16,
}

const recommendFieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const recommendLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#374151',
}

const recommendInputStyle: React.CSSProperties = {
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

const recommendProfileHintStyle: React.CSSProperties = {
  marginTop: 10,
  color: '#6b7280',
  fontSize: 14,
  lineHeight: 1.7,
}

const recommendProfileStrongStyle: React.CSSProperties = {
  marginLeft: 4,
  fontWeight: 800,
  color: '#111827',
}

const recommendProfileNameStyle: React.CSSProperties = {
  fontWeight: 700,
  color: '#2563eb',
}

const recommendProfileMutedStyle: React.CSSProperties = {
  color: '#9ca3af',
}

const profileCardStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 18,
  borderRadius: 18,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
}

const profileCardTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  color: '#111827',
}

const profileMetaRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 12,
}

const recommendResultWrapStyle: React.CSSProperties = {
  marginTop: 22,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

const recommendEmptyStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 18,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
  color: '#6b7280',
}

const recommendCardStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 22,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
  transition: 'transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease',
}

const hoverRecommendCardStyle: React.CSSProperties = {
  transform: 'translateY(-5px)',
  boxShadow: '0 22px 40px rgba(15,23,42,0.08)',
  border: '1px solid rgba(37,99,235,0.14)',
}

const recommendCardTopStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
}

const recommendRankStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '4px 10px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
}

const recommendTitleStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 22,
  fontWeight: 900,
  color: '#111827',
}

const recommendMetaStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#6b7280',
  fontSize: 13,
  lineHeight: 1.7,
}

const recommendBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 32,
  padding: '0 12px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 900,
  whiteSpace: 'nowrap',
}

const recommendBodyStyle: React.CSSProperties = {
  marginTop: 18,
  display: 'flex',
  gap: 18,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
}

const recommendImageStyle: React.CSSProperties = {
  width: 144,
  height: 144,
  objectFit: 'cover',
  borderRadius: 18,
  border: '1px solid rgba(15,23,42,0.08)',
  background: '#fff',
}

const recommendImageEmptyStyle: React.CSSProperties = {
  width: 144,
  height: 144,
  borderRadius: 18,
  border: '1px dashed rgba(15,23,42,0.10)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#9ca3af',
  fontSize: 12,
  background: '#fff',
}

const recommendTextWrapStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 260,
}

const recommendScoreBoxStyle: React.CSSProperties = {
  height: 68,
  borderRadius: 18,
  padding: '0 18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const recommendScoreLabelStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
}

const recommendScoreValueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
}

const recommendTagRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 14,
}

const recommendTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 34,
  padding: '0 14px',
  borderRadius: 999,
  background: '#f3f4f6',
  color: '#374151',
  fontSize: 14,
  fontWeight: 800,
}

const recommendReasonTitleStyle: React.CSSProperties = {
  marginTop: 14,
  fontSize: 14,
  fontWeight: 900,
  color: '#111827',
}

const bottomGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 18,
  '@media (maxWidth: 768px)': {
    gridTemplateColumns: '1fr',
    gap: 14,
  },
}

const panelStyle: React.CSSProperties = {
  padding: 26,
  borderRadius: 26,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.05)',
}

const panelKickerStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(255,122,0,0.10)',
  color: '#ff7a00',
  fontSize: 12,
  fontWeight: 800,
}

const panelTitleStyle: React.CSSProperties = {
  marginTop: 14,
  fontSize: 28,
  fontWeight: 900,
  color: '#111827',
}

const panelDescStyle: React.CSSProperties = {
  marginTop: 12,
  color: '#6b7280',
  lineHeight: 1.9,
  fontSize: 15,
}

const todoListStyle: React.CSSProperties = {
  marginTop: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const todoItemStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 16,
  background: '#f9fafb',
  border: '1px solid rgba(15,23,42,0.05)',
  color: '#374151',
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.6,
}