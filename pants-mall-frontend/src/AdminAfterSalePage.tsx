import { useEffect, useState } from 'react'
import {
  adminListAfterSales,
  adminGetAfterSaleDetail,
  adminAuditAfterSale,
  adminReceiveAfterSaleRefund,
  type AfterSaleVO,
} from './api/afterSale'

function normalizePageInput(value: string, fallback: number) {
  const s = value.trim()
  if (!s) return fallback
  const n = Number(s)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.floor(n))
}

function formatDateText(v?: string) {
  if (!v) return '-'
  return String(v).replace('T', ' ')
}

function getAfterSaleTypeText(type?: string) {
  const t = String(type || '').toUpperCase()
  if (t === 'REFUND') return '退款'
  if (t === 'RETURN_REFUND') return '退货退款'
  return type || '-'
}

function getAfterSaleStatusText(status?: string, type?: string) {
  const s = String(status || '').toUpperCase()
  const t = String(type || '').toUpperCase()

  if (s === 'PENDING') return '待审核'
  if (s === 'APPROVED') {
    if (t === 'RETURN_REFUND') return '已通过，待用户退货'
    return '已通过'
  }
  if (s === 'RETURNED') return '用户已退货'
  if (s === 'COMPLETED') return '已完成'
  if (s === 'REJECTED') return '已拒绝'
  return status || '-'
}

export default function AdminAfterSalePage() {
  const [queryOrderNo, setQueryOrderNo] = useState('')
  const [queryStatus, setQueryStatus] = useState('')
  const [queryType, setQueryType] = useState('')
  const [pageNo, setPageNo] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [list, setList] = useState<AfterSaleVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const [detailVisible, setDetailVisible] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<AfterSaleVO | null>(null)

  const [auditStatus, setAuditStatus] = useState<'APPROVED' | 'REJECTED'>(
    'APPROVED'
  )
  const [adminRemark, setAdminRemark] = useState('')
  const [auditLoading, setAuditLoading] = useState(false)

  async function loadList(nextPageNo?: number, nextPageSize?: number) {
    const realPageNo = nextPageNo ?? pageNo
    const realPageSize = nextPageSize ?? pageSize

    setLoading(true)
    try {
      const data = await adminListAfterSales({
        page: realPageNo,
        size: realPageSize,
        status: queryStatus || undefined,
        type: queryType || undefined,
        orderNo: queryOrderNo.trim() || undefined,
      })

      setList(Array.isArray(data.list) ? data.list : [])
      setTotal(Number(data.total || 0))
    } catch (e: any) {
      setMsg(e?.response?.data?.msg || e?.message || '售后列表加载失败')
    } finally {
      setLoading(false)
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

  async function handleViewDetail(id?: string | number) {
    if (id == null) return

    setDetailLoading(true)
    setMsg('')
    try {
      const data = await adminGetAfterSaleDetail(id)
      setDetail(data || null)
      setDetailVisible(true)
      setAuditStatus('APPROVED')
      setAdminRemark(String(data?.adminRemark || ''))
    } catch (e: any) {
      setMsg(e?.response?.data?.msg || e?.message || '售后详情加载失败')
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleAudit() {
    if (!detail?.id) return

    const remark = String(adminRemark || '').trim()

    if (auditStatus === 'REJECTED' && !remark) {
      setMsg('拒绝售后时请填写审核备注')
      return
    }

    if (remark.length > 500) {
      setMsg('审核备注不能超过500个字符')
      return
    }

    setAuditLoading(true)
    setMsg('')
    try {
      const resp = await adminAuditAfterSale(detail.id, {
        status: auditStatus,
        adminRemark: remark,
      })

      if (resp?.code !== 200) {
        throw new Error(resp?.msg || '审核失败')
      }

      if (auditStatus === 'REJECTED') {
        setMsg('审核拒绝成功')
      } else {
        setMsg(
          String(detail?.type || '').toUpperCase() === 'REFUND'
            ? '退款审核通过，已完成退款'
            : '退货退款审核通过，等待用户退货'
        )
      }

      setDetailVisible(false)
      await loadList(pageNo, pageSize)
    } catch (e: any) {
      setMsg(e?.response?.data?.msg || e?.message || '审核失败')
    } finally {
      setAuditLoading(false)
    }
  }

  async function handleReceiveAndRefund() {
    if (!detail?.id) return

    setAuditLoading(true)
    setMsg('')
    try {
      const resp = await adminReceiveAfterSaleRefund(detail.id)

      if (resp?.code !== 200) {
        throw new Error(resp?.msg || '确认收货并退款失败')
      }

      setMsg('确认收货并退款成功')
      setDetailVisible(false)
      await loadList(pageNo, pageSize)
    } catch (e: any) {
      setMsg(e?.response?.data?.msg || e?.message || '确认收货并退款失败')
    } finally {
      setAuditLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={heroTagStyle}>AFTER SALE ADMIN</div>
          <h1 style={heroTitleStyle}>售后管理</h1>
          <div style={heroDescStyle}>
            在这里统一处理用户提交的退款与退货退款申请。对于退款申请，审核通过后直接完成退款；对于退货退款申请，审核通过后等待用户退货，再由管理员确认收货并退款。
          </div>
        </div>

        <div style={heroStatsWrapStyle}>
          <div style={heroStatCardStyle}>
            <div style={heroStatLabelStyle}>当前页申请数</div>
            <div style={heroStatValueStyle}>{list.length}</div>
            <div style={heroStatDescStyle}>本页售后记录数量</div>
          </div>

          <div style={heroStatCardStyle}>
            <div style={heroStatLabelStyle}>售后总数</div>
            <div style={heroStatValueStyle}>{total}</div>
            <div style={heroStatDescStyle}>系统售后申请总数</div>
          </div>
        </div>
      </section>

      <section style={formWrapStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={sectionKickerStyle}>AFTER SALE FILTER</div>
            <h2 style={sectionTitleStyle}>筛选条件</h2>
          </div>
        </div>

        <div style={filterGridStyle}>
          <div style={fieldBlockStyle}>
            <label style={labelStyle}>订单号</label>
            <input
              value={queryOrderNo}
              onChange={(e) => setQueryOrderNo(e.target.value)}
              placeholder="支持模糊查询"
              style={inputStyle}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>售后状态</label>
            <select
              value={queryStatus}
              onChange={(e) => setQueryStatus(e.target.value)}
              style={inputStyle}
            >
              <option value="">全部状态</option>
              <option value="PENDING">待审核</option>
              <option value="APPROVED">已通过</option>
              <option value="RETURNED">用户已退货</option>
              <option value="COMPLETED">已完成</option>
              <option value="REJECTED">已拒绝</option>
            </select>
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>售后类型</label>
            <select
              value={queryType}
              onChange={(e) => setQueryType(e.target.value)}
              style={inputStyle}
            >
              <option value="">全部类型</option>
              <option value="REFUND">退款</option>
              <option value="RETURN_REFUND">退货退款</option>
            </select>
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>页码</label>
            <input
              value={String(pageNo)}
              onChange={(e) => setPageNo(normalizePageInput(e.target.value, 1))}
              style={inputStyle}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>每页数量</label>
            <input
              value={String(pageSize)}
              onChange={(e) =>
                setPageSize(normalizePageInput(e.target.value, 10))
              }
              style={inputStyle}
            />
          </div>
        </div>

        <div style={searchActionWrapStyle}>
          <button
            type="button"
            onClick={handleSearch}
            style={primaryBtnStyle}
            disabled={loading}
          >
            搜索售后
          </button>
        </div>

        {msg ? <div style={msgStyle}>{msg}</div> : null}
      </section>

      <section style={formWrapStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={sectionKickerStyle}>AFTER SALE LIST</div>
            <h2 style={sectionTitleStyle}>售后申请列表</h2>
          </div>
        </div>

        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>售后ID</th>
                <th style={thStyle}>订单号</th>
                <th style={thStyle}>用户ID</th>
                <th style={thStyle}>类型</th>
                <th style={thStyle}>状态</th>
                <th style={thStyle}>申请原因</th>
                <th style={thStyle}>申请时间</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td style={emptyTdStyle} colSpan={8}>
                    暂无售后数据
                  </td>
                </tr>
              ) : (
                list.map((item) => {
                  const status = String(item.status || '').toUpperCase()

                  return (
                    <tr key={String(item.id ?? '')}>
                      <td style={tdStyle}>{item.id ?? '-'}</td>
                      <td style={tdStyle}>{item.orderNo ?? '-'}</td>
                      <td style={tdStyle}>{item.userId ?? '-'}</td>
                      <td style={tdStyle}>{getAfterSaleTypeText(item.type)}</td>
                      <td style={tdStyle}>
                        <span
                          style={
                            status === 'APPROVED'
                              ? statusApprovedBadgeStyle
                              : status === 'RETURNED'
                              ? statusReturnedBadgeStyle
                              : status === 'COMPLETED'
                              ? statusCompletedBadgeStyle
                              : status === 'REJECTED'
                              ? statusRejectedBadgeStyle
                              : statusPendingBadgeStyle
                          }
                        >
                          {getAfterSaleStatusText(item.status, item.type)}
                        </span>
                      </td>
                      <td style={tdStyle}>{item.reason || '-'}</td>
                      <td style={tdStyle}>{formatDateText(item.createdAt)}</td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => handleViewDetail(item.id)}
                          style={tableActionBtnStyle}
                        >
                          查看
                        </button>
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
              onClick={() => pageNo > 1 && setPageNo((p) => p - 1)}
              style={ghostBtnStyle}
              disabled={pageNo <= 1}
            >
              上一页
            </button>

            <button
              type="button"
              onClick={() => pageNo < totalPages && setPageNo((p) => p + 1)}
              style={ghostBtnStyle}
              disabled={pageNo >= totalPages}
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
                <div style={sectionKickerStyle}>AFTER SALE DETAIL</div>
                <h2 style={modalTitleStyle}>售后详情</h2>
              </div>

              <button
                type="button"
                onClick={() => setDetailVisible(false)}
                style={ghostBtnStyle}
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
                    <div style={detailLabelStyle}>售后ID</div>
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
                    <div style={detailLabelStyle}>售后状态</div>
                    <div style={detailValueStyle}>
                      {getAfterSaleStatusText(detail.status, detail.type)}
                    </div>
                  </div>
                </div>

                <div style={detailSectionStyle}>
                  <div style={detailSectionTitleStyle}>申请信息</div>
                  <div style={detailInfoTextStyle}>
                    售后类型：{getAfterSaleTypeText(detail.type)}
                  </div>
                  <div style={detailInfoTextStyle}>
                    申请原因：{detail.reason || '-'}
                  </div>
                  <div style={detailInfoTextStyle}>
                    申请说明：{detail.description || '-'}
                  </div>
                  <div style={detailInfoTextStyle}>
                    管理员备注：{detail.adminRemark || '-'}
                  </div>
                  <div style={detailInfoTextStyle}>
                    提交时间：{formatDateText(detail.createdAt)}
                  </div>
                </div>

                {String(detail.status || '').toUpperCase() === 'PENDING' ? (
                  <div style={auditPanelStyle}>
                    <div style={detailSectionTitleStyle}>审核处理</div>

                    <div style={detailInfoTextStyle}>
                      {String(detail.type || '').toUpperCase() === 'REFUND'
                        ? '当前申请类型为“退款”，审核通过后将直接完成退款。'
                        : '当前申请类型为“退货退款”，审核通过后需等待用户退货，用户退货后再由管理员确认收货并退款。'}
                    </div>

                    <div style={auditGridStyle}>
                      <div style={fieldBlockStyle}>
                        <label style={labelStyle}>审核结果</label>
                        <select
                          value={auditStatus}
                          onChange={(e) =>
                            setAuditStatus(
                              e.target.value as 'APPROVED' | 'REJECTED'
                            )
                          }
                          style={inputStyle}
                          disabled={auditLoading}
                        >
                          <option value="APPROVED">通过</option>
                          <option value="REJECTED">拒绝</option>
                        </select>
                      </div>

                      <div style={{ ...fieldBlockStyle, gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>审核备注</label>
                        <textarea
                          value={adminRemark}
                          onChange={(e) => setAdminRemark(e.target.value)}
                          placeholder="请输入审核备注（拒绝时必填）"
                          style={textareaStyle}
                          maxLength={500}
                          disabled={auditLoading}
                        />
                      </div>
                    </div>

                    <div style={modalActionRowStyle}>
                      <button
                        type="button"
                        onClick={handleAudit}
                        style={tableShipBtnStyle}
                        disabled={auditLoading}
                      >
                        {auditLoading ? '处理中...' : '提交审核'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {String(detail.status || '').toUpperCase() === 'RETURNED' &&
                String(detail.type || '').toUpperCase() === 'RETURN_REFUND' ? (
                  <div style={auditPanelStyle}>
                    <div style={detailSectionTitleStyle}>收货与退款处理</div>
                    <div style={detailInfoTextStyle}>
                      用户已标记为“已退货”，管理员确认收到退回商品后，可执行退款完成操作。
                    </div>

                    <div style={modalActionRowStyle}>
                      <button
                        type="button"
                        onClick={handleReceiveAndRefund}
                        style={tableShipBtnStyle}
                        disabled={auditLoading}
                      >
                        {auditLoading ? '处理中...' : '确认收货并退款'}
                      </button>
                    </div>
                  </div>
                ) : null}
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
}

const searchActionWrapStyle: React.CSSProperties = {
  marginTop: 16,
  display: 'flex',
  justifyContent: 'flex-end',
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
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 120,
  resize: 'vertical',
  borderRadius: 16,
  border: '1px solid #d1d5db',
  padding: 14,
  fontSize: 14,
  lineHeight: 1.8,
  color: '#111827',
  background: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
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

const emptyTdStyle: React.CSSProperties = {
  padding: '28px 16px',
  textAlign: 'center',
  color: '#6b7280',
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

const statusPendingBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 76,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  background: 'rgba(245,158,11,0.15)',
  color: '#d97706',
  fontSize: 12,
  fontWeight: 800,
}

const statusApprovedBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 96,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  background: 'rgba(16,185,129,0.15)',
  color: '#059669',
  fontSize: 12,
  fontWeight: 800,
}

const statusReturnedBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 96,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  background: 'rgba(59,130,246,0.12)',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
}

const statusCompletedBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 76,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  background: 'rgba(107,114,128,0.14)',
  color: '#374151',
  fontSize: 12,
  fontWeight: 800,
}

const statusRejectedBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 76,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  background: 'rgba(239,68,68,0.12)',
  color: '#dc2626',
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
  width: 'min(980px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto',
  background: '#fff',
  borderRadius: 28,
  padding: 26,
  boxShadow: '0 24px 60px rgba(15,23,42,0.20)',
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

const auditPanelStyle: React.CSSProperties = {
  marginTop: 24,
  padding: 20,
  borderRadius: 20,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
}

const auditGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 16,
  marginTop: 16,
}

const modalActionRowStyle: React.CSSProperties = {
  marginTop: 22,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  flexWrap: 'wrap',
}