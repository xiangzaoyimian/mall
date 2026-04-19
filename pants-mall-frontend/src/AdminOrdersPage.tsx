import { useEffect, useState } from 'react'
import client from './api/client'

type OrderListItem = {
  id?: number | string
  orderNo?: string
  userId?: number | string
  totalAmount?: number
  status?: string
  addressSnapshot?: string
  remark?: string
  paidAt?: string
  createdAt?: string
}

function exportToCsv(data: any[], filename: string) {
  if (!data || data.length === 0) return

  const headers = [
    '订单ID',
    '订单号',
    '用户ID',
    '金额',
    '状态',
    '支付时间',
    '创建时间',
    '地址快照',
    '备注'
  ]

  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      row.id || '',
      row.orderNo || '',
      row.userId || '',
      row.totalAmount || '',
      getStatusText(row.status),
      row.paidAt || '',
      row.createdAt || '',
      row.addressSnapshot || '',
      row.remark || ''
    ].join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

type PageResp<T> = {
  total: number
  page: number
  size: number
  list: T[]
}

type OrderDetailItem = {
  skuId?: number | string
  spuId?: number | string
  title?: string
  price?: number
  quantity?: number
  amount?: number
}

type AfterSaleInfo = {
  id?: number | string
  type?: string
  status?: string
  reason?: string
  description?: string
  adminRemark?: string
  createdAt?: string
}

type OrderDetailResp = {
  id?: number | string
  orderNo?: string
  userId?: number | string
  totalAmount?: number
  status?: string
  addressSnapshot?: string
  remark?: string
  paidAt?: string
  createdAt?: string
  items?: OrderDetailItem[]
  afterSale?: AfterSaleInfo | null
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

function normalizePageInput(value: string, fallback: number) {
  const s = value.trim()
  if (!s) return fallback
  const n = Number(s)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.floor(n))
}

function formatMoney(v?: number) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '--'
  return `¥${v.toFixed(2)}`
}

function formatDateText(v?: string) {
  if (!v) return '-'
  return String(v).replace('T', ' ')
}

function getStatusText(status?: string) {
  const s = String(status || '').toUpperCase()
  const map: Record<string, string> = {
    CREATED: '待支付',
    PAID: '已支付',
    SHIPPED: '已发货',
    FINISHED: '已完成',
    CANCELED: '已取消',
    REFUNDED: '已退款',
  }
  return map[s] || (status || '-')
}

function getAfterSaleTypeText(type?: string) {
  const t = String(type || '').toUpperCase()
  if (t === 'REFUND') return '退款'
  if (t === 'RETURN_REFUND') return '退货退款'
  return type || '-'
}

function getAfterSaleStatusText(status?: string) {
  const s = String(status || '').toUpperCase()
  if (s === 'PENDING') return '待审核'
  if (s === 'APPROVED') return '已通过'
  if (s === 'REJECTED') return '已拒绝'
  return status || '-'
}

export default function AdminOrdersPage() {
  const [keywordOrderNo, setKeywordOrderNo] = useState('')
  const [queryStatus, setQueryStatus] = useState('')
  const [pageNo, setPageNo] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [list, setList] = useState<OrderListItem[]>([])
  const [total, setTotal] = useState(0)

  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetailId, setLoadingDetailId] = useState('')
  const [actioningId, setActioningId] = useState('')
  const [msg, setMsg] = useState('')

  const [detailVisible, setDetailVisible] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<OrderDetailResp | null>(null)

  const [hoverStatCard, setHoverStatCard] = useState('')
  const [hoverBtn, setHoverBtn] = useState('')
  const [hoverGhostBtn, setHoverGhostBtn] = useState('')
  const [hoverRowId, setHoverRowId] = useState('')
  const [focusedField, setFocusedField] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  async function loadList(nextPageNo?: number, nextPageSize?: number) {
    const realPageNo = nextPageNo ?? pageNo
    const realPageSize = nextPageSize ?? pageSize

    setLoadingList(true)
    try {
      const params = cleanParams({
        page: realPageNo,
        size: realPageSize,
        status: queryStatus.trim() || undefined,
        orderNo: keywordOrderNo.trim() || undefined,
      })

      const resp = await client.get('/admin/orders', { params })
      const data: PageResp<OrderListItem> = resp?.data?.data || {
        total: 0,
        page: 1,
        size: 10,
        list: [],
      }

      setList(Array.isArray(data.list) ? data.list : [])
      setTotal(Number(data.total || 0))
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || '订单列表加载失败')
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    loadList()
  }, [pageNo, pageSize])

  async function handleSearch() {
    setMsg('')
    if (pageNo !== 1) {
      setPageNo(1)
      return
    }
    await loadList(1, pageSize)
  }

  async function handleViewDetail(id?: number | string) {
    if (id == null) return

    setLoadingDetailId(String(id))
    setDetailLoading(true)
    setMsg('')

    try {
      const resp = await client.get(`/admin/orders/${id}`)
      const data: OrderDetailResp = resp?.data?.data || null
      setDetail(data)
      setDetailVisible(true)
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || '订单详情加载失败')
    } finally {
      setLoadingDetailId('')
      setDetailLoading(false)
    }
  }

  async function handleShip(id?: number | string) {
    if (id == null) return

    const ok = window.confirm(`确定要将订单 #${id} 标记为已发货吗？`)
    if (!ok) return

    setActioningId(String(id))
    setMsg('')

    try {
      const resp = await client.put(`/admin/orders/${id}/ship`)
      setMsg(resp?.data?.msg || `订单 #${id} 发货成功`)
      await loadList(pageNo, pageSize)

      if (detailVisible && String(detail?.id ?? '') === String(id)) {
        await handleRefreshDetail(id)
      }
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || '发货失败')
    } finally {
      setActioningId('')
    }
  }

  async function handleRefreshDetail(id?: number | string) {
    if (id == null) return
    setDetailLoading(true)
    try {
      const resp = await client.get(`/admin/orders/${id}`)
      const data: OrderDetailResp = resp?.data?.data || null
      setDetail(data)
    } finally {
      setDetailLoading(false)
    }
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      const allIds = new Set(list.map(item => String(item.id ?? '')))
      setSelectedIds(allIds)
    } else {
      setSelectedIds(new Set())
    }
  }

  function handleSelectItem(id: string, checked: boolean) {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }

  async function handleBatchShip() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      setMsg('请选择要发货的订单')
      return
    }

    const ok = window.confirm(`确定要将选中的 ${ids.length} 个订单标记为已发货吗？`)
    if (!ok) return

    setLoadingList(true)
    setMsg('')

    try {
      const promises = ids.map(id => client.put(`/admin/orders/${id}/ship`))
      await Promise.all(promises)
      setMsg(`成功发货 ${ids.length} 个订单`)
      setSelectedIds(new Set())
      await loadList(pageNo, pageSize)
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || '批量发货失败')
    } finally {
      setLoadingList(false)
    }
  }

  function handleExportOrders() {
    if (list.length === 0) {
      setMsg('暂无订单数据可导出')
      return
    }

    exportToCsv(list, `orders_${new Date().toISOString().slice(0, 10)}.csv`)
    setMsg('订单导出成功')
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrevPage = pageNo > 1
  const canNextPage = pageNo < totalPages

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={heroTagStyle}>ORDER ADMIN</div>
          <h1 style={heroTitleStyle}>订单管理</h1>
          <div style={heroDescStyle}>
            后台订单管理支持订单列表、状态筛选、订单详情查看，以及管理员发货操作。
            当前版本按毕业设计交易闭环设计：用户支付，管理员发货，用户确认收货。
          </div>
        </div>

        <div style={heroStatsWrapStyle}>
          <div
            style={{
              ...heroStatCardStyle,
              ...(hoverStatCard === 'pageCount' ? heroStatCardHoverStyle : {}),
            }}
            onMouseEnter={() => setHoverStatCard('pageCount')}
            onMouseLeave={() => setHoverStatCard('')}
          >
            <div style={heroStatLabelStyle}>当前页订单数</div>
            <div style={heroStatValueStyle}>{list.length}</div>
            <div style={heroStatDescStyle}>当前列表返回条数</div>
          </div>

          <div
            style={{
              ...heroStatCardStyle,
              ...(hoverStatCard === 'totalCount' ? heroStatCardHoverStyle : {}),
            }}
            onMouseEnter={() => setHoverStatCard('totalCount')}
            onMouseLeave={() => setHoverStatCard('')}
          >
            <div style={heroStatLabelStyle}>订单总数</div>
            <div style={heroStatValueStyle}>{total}</div>
            <div style={heroStatDescStyle}>后台订单记录总数</div>
          </div>
        </div>
      </section>

      <section style={formWrapStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={sectionKickerStyle}>ORDER FILTER</div>
            <h2 style={sectionTitleStyle}>筛选条件</h2>
          </div>

          <div style={btnRowStyle}>
            <button
              type="button"
              onClick={handleExportOrders}
              style={{
                ...primaryBtnStyle,
                ...(hoverBtn === 'exportOrders' ? primaryBtnHoverStyle : {}),
              }}
              disabled={loadingList}
              onMouseEnter={() => setHoverBtn('exportOrders')}
              onMouseLeave={() => setHoverBtn('')}
            >
              导出订单
            </button>
          </div>
        </div>

        <div style={filterGridStyle}>
          <div style={fieldBlockStyle}>
            <label style={labelStyle}>订单号</label>
            <input
              value={keywordOrderNo}
              onChange={(e) => setKeywordOrderNo(e.target.value)}
              placeholder="支持模糊查询"
              style={{
                ...inputStyle,
                ...(focusedField === 'keywordOrderNo' ? inputFocusStyle : {}),
              }}
              onFocus={() => setFocusedField('keywordOrderNo')}
              onBlur={() => setFocusedField('')}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>状态</label>
            <select
              value={queryStatus}
              onChange={(e) => setQueryStatus(e.target.value)}
              style={{
                ...inputStyle,
                ...(focusedField === 'queryStatus' ? inputFocusStyle : {}),
              }}
              onFocus={() => setFocusedField('queryStatus')}
              onBlur={() => setFocusedField('')}
            >
              <option value="">全部状态</option>
              <option value="CREATED">待支付</option>
              <option value="PAID">已支付</option>
              <option value="SHIPPED">已发货</option>
              <option value="FINISHED">已完成</option>
              <option value="CANCELED">已取消</option>
              <option value="REFUNDED">已退款</option>
            </select>
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>页码</label>
            <input
              value={String(pageNo)}
              onChange={(e) => setPageNo(normalizePageInput(e.target.value, 1))}
              style={{
                ...inputStyle,
                ...(focusedField === 'pageNo' ? inputFocusStyle : {}),
              }}
              onFocus={() => setFocusedField('pageNo')}
              onBlur={() => setFocusedField('')}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>每页数量</label>
            <input
              value={String(pageSize)}
              onChange={(e) => setPageSize(normalizePageInput(e.target.value, 10))}
              style={{
                ...inputStyle,
                ...(focusedField === 'pageSize' ? inputFocusStyle : {}),
              }}
              onFocus={() => setFocusedField('pageSize')}
              onBlur={() => setFocusedField('')}
            />
          </div>

          <div style={{ ...fieldBlockStyle, justifyContent: 'end' }}>
            <label style={labelStyle}>&nbsp;</label>
            <button
              type="button"
              onClick={handleSearch}
              style={{
                ...primaryBtnStyle,
                ...(hoverBtn === 'searchOrder' ? primaryBtnHoverStyle : {}),
              }}
              disabled={loadingList}
              onMouseEnter={() => setHoverBtn('searchOrder')}
              onMouseLeave={() => setHoverBtn('')}
            >
              搜索订单
            </button>
          </div>
        </div>

        {msg ? <div style={msgStyle}>{msg}</div> : null}
      </section>

      <section style={formWrapStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={sectionKickerStyle}>ORDER LIST</div>
            <h2 style={sectionTitleStyle}>订单列表</h2>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div style={batchActionStyle}>
            <div style={batchActionTextStyle}>
              已选择 {selectedIds.size} 个订单
            </div>
            <div style={batchActionBtnWrapStyle}>
              <button
                type="button"
                onClick={handleBatchShip}
                style={batchActionBtnStyle}
                disabled={loadingList}
              >
                批量发货
              </button>
            </div>
          </div>
        )}

        <div style={tableTipStyle}>
          当前版本优先支持后台订单查看与发货操作。订单完成由用户在前台“确认收货”后进入已完成状态，更符合电商闭环。
        </div>

        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '60px' }}>
                  <input
                    type="checkbox"
                    checked={list.length > 0 && selectedIds.size === list.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={loadingList || list.length === 0}
                  />
                </th>
                <th style={thStyle}>订单ID</th>
                <th style={thStyle}>订单号</th>
                <th style={thStyle}>用户ID</th>
                <th style={thStyle}>金额</th>
                <th style={thStyle}>状态</th>
                <th style={thStyle}>支付时间</th>
                <th style={thStyle}>创建时间</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>

            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td style={emptyTdStyle} colSpan={9}>
                    暂无订单数据
                  </td>
                </tr>
              ) : (
                list.map((item) => {
                  const rowId = String(item.id ?? '')
                  const rowStatus = String(item.status || '').toUpperCase()
                  const isActioning = actioningId === rowId
                  const isLoadingDetail = loadingDetailId === rowId

                  return (
                    <tr
                      key={rowId}
                      style={hoverRowId === rowId ? tableRowHoverStyle : undefined}
                      onMouseEnter={() => setHoverRowId(rowId)}
                      onMouseLeave={() => setHoverRowId('')}
                    >
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(rowId)}
                          onChange={(e) => handleSelectItem(rowId, e.target.checked)}
                          disabled={loadingList || isActioning || isLoadingDetail}
                        />
                      </td>
                      <td style={tdStyle}>{item.id ?? '-'}</td>
                      <td style={tdStyle}>{item.orderNo ?? '-'}</td>
                      <td style={tdStyle}>{item.userId ?? '-'}</td>
                      <td style={tdStyle}>
                        {formatMoney(Number(item.totalAmount ?? 0))}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={
                            rowStatus === 'FINISHED'
                              ? statusFinishedBadgeStyle
                              : rowStatus === 'SHIPPED'
                              ? statusShippedBadgeStyle
                              : rowStatus === 'PAID'
                              ? statusPaidBadgeStyle
                              : rowStatus === 'CANCELED'
                              ? statusCanceledBadgeStyle
                              : rowStatus === 'REFUNDED'
                              ? statusRefundedBadgeStyle
                              : statusCreatedBadgeStyle
                          }
                        >
                          {getStatusText(rowStatus)}
                        </span>
                      </td>
                      <td style={tdStyle}>{formatDateText(item.paidAt)}</td>
                      <td style={tdStyle}>{formatDateText(item.createdAt)}</td>
                      <td style={tdStyle}>
                        <div style={tableActionWrapStyle}>
                          <button
                            type="button"
                            onClick={() => handleViewDetail(item.id)}
                            style={tableActionBtnStyle}
                            disabled={isLoadingDetail || isActioning}
                          >
                            {isLoadingDetail ? '加载中...' : '查看'}
                          </button>

                          {rowStatus === 'PAID' ? (
                            <button
                              type="button"
                              onClick={() => handleShip(item.id)}
                              style={tableShipBtnStyle}
                              disabled={isActioning || isLoadingDetail}
                            >
                              {isActioning ? '处理中...' : '发货'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={listFootStyle}>
          <div style={listFootTextStyle}>
            总记录数：{total}　/　当前第 {pageNo} 页，共 {totalPages} 页
          </div>

          <div style={paginationWrapStyle}>
            <button
              type="button"
              onClick={() => canPrevPage && setPageNo((p) => Math.max(1, p - 1))}
              style={{
                ...ghostBtnStyle,
                ...(hoverGhostBtn === 'prevPage' ? ghostBtnHoverStyle : {}),
              }}
              disabled={!canPrevPage}
              onMouseEnter={() => setHoverGhostBtn('prevPage')}
              onMouseLeave={() => setHoverGhostBtn('')}
            >
              上一页
            </button>

            <button
              type="button"
              onClick={() =>
                canNextPage && setPageNo((p) => Math.min(totalPages, p + 1))
              }
              style={{
                ...ghostBtnStyle,
                ...(hoverGhostBtn === 'nextPage' ? ghostBtnHoverStyle : {}),
              }}
              disabled={!canNextPage}
              onMouseEnter={() => setHoverGhostBtn('nextPage')}
              onMouseLeave={() => setHoverGhostBtn('')}
            >
              下一页
            </button>
          </div>
        </div>
      </section>

      {detailVisible ? (
        <div style={maskStyle} onClick={() => setDetailVisible(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeadStyle}>
              <div>
                <div style={sectionKickerStyle}>ORDER DETAIL</div>
                <h2 style={modalTitleStyle}>订单详情</h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailVisible(false)}
                style={{
                  ...ghostBtnStyle,
                  ...(hoverGhostBtn === 'closeModal' ? ghostBtnHoverStyle : {}),
                }}
                onMouseEnter={() => setHoverGhostBtn('closeModal')}
                onMouseLeave={() => setHoverGhostBtn('')}
              >
                关闭
              </button>
            </div>

            {detailLoading ? (
              <div style={detailLoadingStyle}>加载中...</div>
            ) : !detail ? (
              <div style={detailLoadingStyle}>暂无详情数据</div>
            ) : (
              <>
                <div style={detailGridStyle}>
                  <div style={detailCardStyle}>
                    <div style={detailLabelStyle}>订单ID</div>
                    <div style={detailValueStyle}>{detail.id ?? '-'}</div>
                  </div>

                  <div style={detailCardStyle}>
                    <div style={detailLabelStyle}>订单号</div>
                    <div style={detailValueStyle}>{detail.orderNo ?? '-'}</div>
                  </div>

                  <div style={detailCardStyle}>
                    <div style={detailLabelStyle}>用户ID</div>
                    <div style={detailValueStyle}>{detail.userId ?? '-'}</div>
                  </div>

                  <div style={detailCardStyle}>
                    <div style={detailLabelStyle}>订单状态</div>
                    <div style={detailValueStyle}>{getStatusText(detail.status)}</div>
                  </div>
                </div>

                <div style={detailSectionStyle}>
                  <div style={detailSectionTitleStyle}>订单基础信息</div>
                  <div style={detailInfoTextStyle}>
                    金额：{formatMoney(Number(detail.totalAmount ?? 0))}
                  </div>
                  <div style={detailInfoTextStyle}>
                    支付时间：{formatDateText(detail.paidAt)}
                  </div>
                  <div style={detailInfoTextStyle}>
                    创建时间：{formatDateText(detail.createdAt)}
                  </div>
                  <div style={detailInfoTextStyle}>
                    地址快照：{detail.addressSnapshot || '-'}
                  </div>
                  <div style={detailInfoTextStyle}>
                    备注：{detail.remark || '-'}
                  </div>
                </div>

                {detail.afterSale ? (
                  <div style={afterSaleSectionStyle}>
                    <div style={detailSectionTitleStyle}>售后信息</div>
                    <div style={detailInfoTextStyle}>
                      售后类型：{getAfterSaleTypeText(detail.afterSale.type)}
                    </div>
                    <div style={detailInfoTextStyle}>
                      售后状态：{getAfterSaleStatusText(detail.afterSale.status)}
                    </div>
                    <div style={detailInfoTextStyle}>
                      申请原因：{detail.afterSale.reason || '-'}
                    </div>
                    <div style={detailInfoTextStyle}>
                      申请说明：{detail.afterSale.description || '-'}
                    </div>
                    <div style={detailInfoTextStyle}>
                      审核备注：{detail.afterSale.adminRemark || '-'}
                    </div>
                    <div style={detailInfoTextStyle}>
                      提交时间：{formatDateText(detail.afterSale.createdAt)}
                    </div>
                  </div>
                ) : null}

                <div style={detailSectionStyle}>
                  <div style={detailSectionTitleStyle}>订单商品</div>

                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>SPU ID</th>
                          <th style={thStyle}>SKU ID</th>
                          <th style={thStyle}>标题</th>
                          <th style={thStyle}>单价</th>
                          <th style={thStyle}>数量</th>
                          <th style={thStyle}>金额</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!detail.items || detail.items.length === 0 ? (
                          <tr>
                            <td style={emptyTdStyle} colSpan={6}>
                              暂无商品明细
                            </td>
                          </tr>
                        ) : (
                          detail.items.map((item, index) => (
                            <tr key={`${item.skuId ?? 'sku'}-${index}`}>
                              <td style={tdStyle}>{item.spuId ?? '-'}</td>
                              <td style={tdStyle}>{item.skuId ?? '-'}</td>
                              <td style={tdStyle}>{item.title ?? '-'}</td>
                              <td style={tdStyle}>
                                {formatMoney(Number(item.price ?? 0))}
                              </td>
                              <td style={tdStyle}>{item.quantity ?? '-'}</td>
                              <td style={tdStyle}>
                                {formatMoney(Number(item.amount ?? 0))}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={modalActionRowStyle}>
                  {String(detail.status || '').toUpperCase() === 'PAID' ? (
                    <button
                      type="button"
                      onClick={() => handleShip(detail.id)}
                      style={tableShipBtnStyle}
                      disabled={actioningId === String(detail.id ?? '')}
                    >
                      {actioningId === String(detail.id ?? '') ? '处理中...' : '发货'}
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
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
  gridTemplateColumns: '1.2fr 0.8fr',
  gap: 20,
  padding: 30,
  borderRadius: 28,
  background: 'linear-gradient(135deg, #eff6ff, #ffffff 60%, #f8fafc)',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
}

const heroTagStyle: React.CSSProperties = {
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
  color: '#6b7280',
  fontSize: 15,
  lineHeight: 1.8,
  maxWidth: 760,
}

const heroStatsWrapStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 14,
}

const heroStatCardStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 22,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 10px 24px rgba(15,23,42,0.04)',
  transition:
    'transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease',
}

const heroStatCardHoverStyle: React.CSSProperties = {
  transform: 'translateY(-4px)',
  boxShadow: '0 18px 34px rgba(15,23,42,0.10)',
  border: '1px solid rgba(37,99,235,0.14)',
}

const heroStatLabelStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: 12,
  fontWeight: 700,
}

const heroStatValueStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 28,
  fontWeight: 900,
  color: '#111827',
}

const heroStatDescStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#6b7280',
  fontSize: 13,
}

const formWrapStyle: React.CSSProperties = {
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

const filterGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 16,
  marginTop: 22,
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

const fieldBlockStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#374151',
}

const inputStyle: React.CSSProperties = {
  height: 46,
  padding: '0 14px',
  borderRadius: 14,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

const inputFocusStyle: React.CSSProperties = {
  border: '1px solid rgba(37,99,235,0.40)',
  boxShadow: '0 0 0 4px rgba(37,99,235,0.10)',
}

const primaryBtnStyle: React.CSSProperties = {
  height: 44,
  padding: '0 18px',
  borderRadius: 14,
  border: 'none',
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 800,
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
}

const primaryBtnHoverStyle: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 14px 28px rgba(15,23,42,0.18)',
}

const ghostBtnStyle: React.CSSProperties = {
  height: 44,
  padding: '0 18px',
  borderRadius: 14,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  cursor: 'pointer',
  fontWeight: 800,
  transition:
    'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
}

const ghostBtnHoverStyle: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 12px 22px rgba(15,23,42,0.08)',
  border: '1px solid rgba(37,99,235,0.16)',
}

const msgStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 16,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
  color: '#374151',
  whiteSpace: 'pre-wrap',
}

const tableTipStyle: React.CSSProperties = {
  marginTop: 18,
  color: '#6b7280',
  fontSize: 14,
  lineHeight: 1.8,
}

const tableWrapStyle: React.CSSProperties = {
  marginTop: 22,
  overflowX: 'auto',
  borderRadius: 16,
  border: '1px solid rgba(15,23,42,0.06)',
  background: '#fff',
  boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  background: '#fff',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '14px 16px',
  fontSize: 13,
  color: '#6b7280',
  background: '#f8fafc',
  borderBottom: '1px solid rgba(15,23,42,0.06)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid rgba(15,23,42,0.06)',
  color: '#111827',
  fontSize: 14,
  verticalAlign: 'top',
}

const tableRowHoverStyle: React.CSSProperties = {
  background: '#fafcff',
}

const emptyTdStyle: React.CSSProperties = {
  padding: '28px 16px',
  textAlign: 'center',
  color: '#6b7280',
}

const tableActionWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
}

const tableActionBtnStyle: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 10,
  border: 'none',
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
}

const tableShipBtnStyle: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 10,
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
}

const statusCreatedBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 70,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  background: 'rgba(59,130,246,0.12)',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
}

const statusPaidBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 70,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  background: 'rgba(245,158,11,0.15)',
  color: '#d97706',
  fontSize: 12,
  fontWeight: 800,
}

const statusShippedBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 70,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  background: 'rgba(99,102,241,0.15)',
  color: '#4f46e5',
  fontSize: 12,
  fontWeight: 800,
}

const statusFinishedBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 70,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  background: 'rgba(16,185,129,0.15)',
  color: '#059669',
  fontSize: 12,
  fontWeight: 800,
}

const statusCanceledBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 70,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  background: 'rgba(239,68,68,0.12)',
  color: '#dc2626',
  fontSize: 12,
  fontWeight: 800,
}

const statusRefundedBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 70,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  background: 'rgba(107,114,128,0.14)',
  color: '#374151',
  fontSize: 12,
  fontWeight: 800,
}

const listFootStyle: React.CSSProperties = {
  marginTop: 14,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
}

const listFootTextStyle: React.CSSProperties = {
  color: '#6b7280',
  fontWeight: 700,
}

const paginationWrapStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const maskStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,0.38)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
}

const modalStyle: React.CSSProperties = {
  width: 'min(1080px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto',
  background: '#fff',
  borderRadius: 28,
  padding: 26,
  boxShadow: '0 24px 60px rgba(15,23,42,0.20)',
  animation: 'fadeInUp 0.25s ease',
}

const modalHeadStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 20,
  flexWrap: 'wrap',
}

const modalTitleStyle: React.CSSProperties = {
  margin: '12px 0 0',
  fontSize: 30,
  lineHeight: 1.2,
  color: '#111827',
}

const detailLoadingStyle: React.CSSProperties = {
  marginTop: 22,
  color: '#6b7280',
  fontSize: 15,
}

const detailGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 16,
  marginTop: 22,
}

const detailCardStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 20,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 8px 20px rgba(15,23,42,0.04)',
}

const detailLabelStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: 12,
  fontWeight: 700,
}

const detailValueStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 20,
  fontWeight: 900,
  color: '#111827',
  lineHeight: 1.4,
  wordBreak: 'break-all',
}

const detailSectionStyle: React.CSSProperties = {
  marginTop: 24,
}

const afterSaleSectionStyle: React.CSSProperties = {
  marginTop: 24,
  padding: 20,
  borderRadius: 20,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
}

const detailSectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: '#111827',
}

const detailInfoTextStyle: React.CSSProperties = {
  marginTop: 10,
  color: '#4b5563',
  lineHeight: 1.8,
  fontSize: 14,
}

const modalActionRowStyle: React.CSSProperties = {
  marginTop: 22,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  flexWrap: 'wrap',
}

const batchActionStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 18,
  borderRadius: 14,
  background: '#f0f9ff',
  border: '1px solid rgba(37,99,235,0.12)',
  marginBottom: 16,
  gap: 16,
  flexWrap: 'wrap',
  boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
}

const batchActionTextStyle: React.CSSProperties = {
  color: '#1e40af',
  fontWeight: 700,
  fontSize: 14,
}

const batchActionBtnWrapStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const batchActionBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 10,
  border: '1px solid rgba(37,99,235,0.20)',
  background: '#fff',
  color: '#2563eb',
  cursor: 'pointer',
  fontWeight: 700,
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 4px rgba(37,99,235,0.08)',
}

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}