import React, { useEffect, useMemo, useState } from 'react'
import client from './api/client'

type CategoryItem = {
  id?: number | string
  name?: string
  parentId?: number | string
  sort?: number
  status?: string
  createdAt?: string
  updatedAt?: string
  deleted?: number
  children?: CategoryItem[]
}

function toNumberOrNull(v: string) {
  const s = v.trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function toNonNegativeIntOrNull(v: string) {
  const n = toNumberOrNull(v)
  if (n == null || !Number.isInteger(n) || n < 0) return null
  return n
}

function buildCategoryTree(categories: CategoryItem[]): CategoryItem[] {
  const map: Record<string, CategoryItem> = {}
  const roots: CategoryItem[] = []

  categories.forEach((item) => {
    const id = String(item.id ?? '')
    map[id] = { ...item, children: [] }
  })

  categories.forEach((item) => {
    const id = String(item.id ?? '')
    const parentId = String(item.parentId ?? 0)
    if (parentId === '0') {
      roots.push(map[id])
    } else if (map[parentId]) {
      map[parentId].children?.push(map[id])
    }
  })

  return roots
}

export default function AdminCategoryPage() {
  const [editingId, setEditingId] = useState('')
  const isEdit = Boolean(editingId)

  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('0')
  const [sort, setSort] = useState('0')
  const [status, setStatus] = useState('ON')

  const [list, setList] = useState<CategoryItem[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [msg, setMsg] = useState('')

  const [hoveredCard, setHoveredCard] = useState('')
  const [hoveredRow, setHoveredRow] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const total = useMemo(() => list.length, [list])
  const categoryTree = useMemo(() => buildCategoryTree(list), [list])

  async function loadList() {
    setLoadingList(true)
    try {
      const resp = await client.get('/admin/categories')
      const data: CategoryItem[] = resp?.data?.data || []
      setList(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || '分类列表加载失败')
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    loadList()
  }, [])

  function resetForm(options?: { keepMsg?: boolean }) {
    setEditingId('')
    setName('')
    setParentId('0')
    setSort('0')
    setStatus('ON')

    if (!options?.keepMsg) {
      setMsg('')
    }
  }

  function validate() {
    if (!name.trim()) return '分类名称不能为空'

    const parsedParentId = toNonNegativeIntOrNull(parentId)
    if (parsedParentId == null) return '父分类ID必须为大于等于 0 的整数'

    const parsedSort = toNonNegativeIntOrNull(sort)
    if (parsedSort == null) return '排序必须为大于等于 0 的整数'

    if (!status.trim()) return '分类状态不能为空'

    return ''
  }

  async function handleSubmit() {
    const errText = validate()
    if (errText) {
      setMsg(errText)
      return
    }

    const payload = {
      name: name.trim(),
      parentId: Number(parentId),
      sort: Number(sort),
      status: status.trim(),
    }

    setSubmitting(true)
    setMsg('')

    try {
      let successMsg = ''

      if (isEdit) {
        const resp = await client.put(`/admin/categories/${editingId}`, payload)
        successMsg = resp?.data?.msg || '分类更新成功'
      } else {
        const resp = await client.post('/admin/categories', payload)
        successMsg = resp?.data?.msg || '分类创建成功'
      }

      resetForm({ keepMsg: true })
      setMsg(successMsg)
      await loadList()
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(id?: number | string) {
    if (id == null) return

    setLoadingDetail(true)
    setMsg('')

    try {
      const rowId = String(id)
      const data = list.find((item) => String(item.id) === rowId)

      if (!data) {
        throw new Error('分类不存在')
      }

      setEditingId(rowId)
      setName(String(data.name || ''))
      setParentId(
        data.parentId !== undefined && data.parentId !== null
          ? String(data.parentId)
          : '0'
      )
      setSort(
        data.sort !== undefined && data.sort !== null ? String(data.sort) : '0'
      )
      setStatus(String(data.status || 'ON'))

      window.scrollTo({ top: 0, behavior: 'smooth' })
      setMsg(`已加载分类 #${id}，现在可以编辑`)
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.message || '分类详情加载失败')
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleDelete(id?: number | string, categoryName?: string) {
    if (id == null) return

    const label = categoryName?.trim() ? `【${categoryName}】` : `#${id}`
    const ok = window.confirm(`确定删除分类 ${label} 吗？`)
    if (!ok) return

    setDeletingId(String(id))
    setMsg('')

    try {
      const resp = await client.delete(`/admin/categories/${id}`)
      setMsg(resp?.data?.msg || `分类 ${label} 删除成功`)

      if (editingId && String(editingId) === String(id)) {
        resetForm({ keepMsg: true })
      }

      await loadList()
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || '删除失败')
    } finally {
      setDeletingId('')
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

  async function handleBatchDelete() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      setMsg('请选择要删除的分类')
      return
    }

    const ok = window.confirm(`确定删除选中的 ${ids.length} 个分类吗？`)
    if (!ok) return

    setLoadingList(true)
    setMsg('')

    try {
      const promises = ids.map(id => client.delete(`/admin/categories/${id}`))
      await Promise.all(promises)
      setMsg(`成功删除 ${ids.length} 个分类`)
      setSelectedIds(new Set())
      await loadList()
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || '批量删除失败')
    } finally {
      setLoadingList(false)
    }
  }

  function handleToggleNode(id: string) {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  function renderCategoryTree(items: CategoryItem[], level = 0) {
    return items.map((item) => {
      const rowId = String(item.id ?? '')
      const deleting = deletingId === rowId
      const rowStatus = String(item.status || '').toUpperCase()
      const hovered = hoveredRow === rowId
      const isExpanded = expandedNodes.has(rowId)
      const hasChildren = item.children && item.children.length > 0

      return (
        <React.Fragment key={rowId}>
          <tr
            style={{
              background: hovered ? '#fbfdff' : '#fff',
              transition: 'all 0.22s ease',
            }}
            onMouseEnter={() => setHoveredRow(rowId)}
            onMouseLeave={() => setHoveredRow('')}
          >
            <td style={tdStyle}>
              <input
                type="checkbox"
                checked={selectedIds.has(rowId)}
                onChange={(e) => handleSelectItem(rowId, e.target.checked)}
                disabled={loadingList || deleting}
              />
            </td>
            <td style={{
              ...tdStyle,
              paddingLeft: `${20 + level * 20}px`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {hasChildren && (
                  <span
                    style={{
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                    onClick={() => handleToggleNode(rowId)}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </span>
                )}
                <div
                  style={{
                    ...nameMainStyle,
                    transform: hovered
                      ? 'translateX(2px)'
                      : 'translateX(0)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {item.name || '-'}
                </div>
              </div>
            </td>
            <td style={tdStyle}>{item.sort ?? 0}</td>
            <td style={tdStyle}>
              <span
                style={
                  rowStatus === 'ON'
                    ? statusOnBadgeStyle
                    : statusOffBadgeStyle
                }
              >
                {rowStatus || '-'}
              </span>
            </td>
            <td style={tdStyle}>
              <div style={tableActionWrapStyle}>
                <button
                  type="button"
                  onClick={() => handleEdit(item.id)}
                  style={tableActionBtnStyle}
                  disabled={loadingDetail || deleting}
                >
                  编辑
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id, item.name)}
                  style={tableDeleteBtnStyle}
                  disabled={deleting}
                >
                  {deleting ? '删除中...' : '删除'}
                </button>
              </div>
            </td>
          </tr>
          {isExpanded && hasChildren && renderCategoryTree(item.children, level + 1)}
        </React.Fragment>
      )
    })
  }

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div style={heroGlowStyle} />
        <div style={heroContentStyle}>
          <div>
            <div style={heroTagStyle}>CATEGORY ADMIN</div>
            <h1 style={heroTitleStyle}>{isEdit ? '编辑分类' : '分类管理'}</h1>
            <div style={heroDescStyle}>
              后台分类管理用于维护商品分类。当前支持分类树展示、新增、编辑、删除和批量操作。
            </div>
          </div>

          <div style={heroStatsWrapStyle}>
            <div
              style={{
                ...heroStatCardStyle,
                transform:
                  hoveredCard === 'mode' ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow:
                  hoveredCard === 'mode'
                    ? '0 20px 40px rgba(15,23,42,0.10)'
                    : '0 10px 24px rgba(15,23,42,0.04)',
              }}
              onMouseEnter={() => setHoveredCard('mode')}
              onMouseLeave={() => setHoveredCard('')}
            >
              <div style={heroStatLabelStyle}>当前模式</div>
              <div style={heroStatValueStyle}>{isEdit ? 'EDIT' : 'CREATE'}</div>
              <div style={heroStatDescStyle}>
                {isEdit ? '编辑分类' : '新增分类'}
              </div>
            </div>

            <div
              style={{
                ...heroStatCardStyle,
                transform:
                  hoveredCard === 'total' ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow:
                  hoveredCard === 'total'
                    ? '0 20px 40px rgba(15,23,42,0.10)'
                    : '0 10px 24px rgba(15,23,42,0.04)',
              }}
              onMouseEnter={() => setHoveredCard('total')}
              onMouseLeave={() => setHoveredCard('')}
            >
              <div style={heroStatLabelStyle}>分类总数</div>
              <div style={heroStatValueStyle}>{total}</div>
              <div style={heroStatDescStyle}>当前后台分类记录</div>
            </div>
          </div>
        </div>
      </section>

      <section style={formWrapStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={sectionKickerStyle}>CATEGORY FORM</div>
            <h2 style={sectionTitleStyle}>分类表单</h2>
          </div>

          <div style={btnRowStyle}>
            {isEdit ? (
              <button
                type="button"
                onClick={() => resetForm()}
                style={ghostBtnStyle}
              >
                退出编辑
              </button>
            ) : null}
          </div>
        </div>

        <div style={tipBoxStyle}>
          <div style={tipTitleStyle}>说明</div>
          <div style={tipTextStyle}>
            分类管理支持树形结构展示，子分类会自动在分类树中展开。
          </div>
        </div>

        <div style={basicGridStyle}>
          <div style={fieldBlockStyle}>
            <label style={labelStyle}>分类名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：牛仔裤"
              style={inputStyle}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>排序</label>
            <input
              value={sort}
              onChange={(e) => setSort(e.target.value.trim())}
              placeholder="例如：10"
              style={inputStyle}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={inputStyle}
            >
              <option value="ON">ON</option>
              <option value="OFF">OFF</option>
            </select>
          </div>
        </div>

        <div style={submitRowStyle}>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              ...submitBtnStyle,
              transform:
                submitting || loadingDetail ? 'scale(0.99)' : 'scale(1)',
              opacity: submitting || loadingDetail ? 0.92 : 1,
            }}
            disabled={submitting || loadingDetail}
          >
            {submitting
              ? isEdit
                ? '更新中...'
                : '创建中...'
              : isEdit
              ? '提交更新'
              : '创建分类'}
          </button>
        </div>

        {msg ? (
          <div
            style={{
              ...msgStyle,
              color: msg.includes('成功') ? '#166534' : '#374151',
              background: msg.includes('成功') ? '#f0fdf4' : '#f8fafc',
              border: msg.includes('成功')
                ? '1px solid rgba(34,197,94,0.18)'
                : '1px solid rgba(15,23,42,0.06)',
            }}
          >
            {msg}
          </div>
        ) : null}
      </section>

      <section style={formWrapStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={sectionKickerStyle}>CATEGORY LIST</div>
            <h2 style={sectionTitleStyle}>分类列表</h2>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div style={batchActionStyle}>
            <div style={batchActionTextStyle}>
              已选择 {selectedIds.size} 个分类
            </div>
            <div style={batchActionBtnWrapStyle}>
              <button
                type="button"
                onClick={handleBatchDelete}
                style={batchActionDeleteBtnStyle}
                disabled={loadingList}
              >
                批量删除
              </button>
            </div>
          </div>
        )}

        <div style={tableTipStyle}>
          当前列表以树形结构展示分类，点击箭头可展开/折叠子分类。
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
                <th style={thStyle}>分类名称</th>
                <th style={thStyle}>排序</th>
                <th style={thStyle}>状态</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>

            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td style={emptyTdStyle} colSpan={5}>
                    暂无分类数据
                  </td>
                </tr>
              ) : (
                renderCategoryTree(categoryTree)
              )}
            </tbody>
          </table>
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
  position: 'relative',
  overflow: 'hidden',
  display: 'grid',
  gridTemplateColumns: '1.2fr 0.8fr',
  gap: 20,
  padding: 30,
  borderRadius: 28,
  background: 'linear-gradient(135deg, #eff6ff, #ffffff 60%, #f8fafc)',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
}

const heroGlowStyle: React.CSSProperties = {
  position: 'absolute',
  right: -80,
  top: -80,
  width: 220,
  height: 220,
  borderRadius: '50%',
  background: 'radial-gradient(rgba(37,99,235,0.14), transparent 70%)',
  pointerEvents: 'none',
}

const heroContentStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'contents',
}

const heroTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.3,
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
  transition: 'all 0.25s ease',
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
  transition: 'all 0.25s ease',
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

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const tipBoxStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  borderRadius: 18,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
}

const tipTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  color: '#111827',
}

const tipTextStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#6b7280',
  lineHeight: 1.8,
  fontSize: 14,
}

const basicGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 16,
  marginTop: 22,
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
  transition: 'all 0.2s ease',
  boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.03)',
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
  transition: 'all 0.2s ease',
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
  transition: 'all 0.2s ease',
}

const submitRowStyle: React.CSSProperties = {
  marginTop: 22,
  display: 'flex',
  justifyContent: 'flex-end',
}

const submitBtnStyle: React.CSSProperties = {
  minWidth: 180,
  height: 48,
  padding: '0 18px',
  borderRadius: 14,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 900,
  boxShadow: '0 12px 24px rgba(37,99,235,0.18)',
  transition: 'all 0.2s ease',
}

const msgStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 16,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
  color: '#374151',
  whiteSpace: 'pre-wrap',
  transition: 'all 0.2s ease',
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
  transition: 'all 0.2s ease',
}

const emptyTdStyle: React.CSSProperties = {
  padding: '28px 16px',
  textAlign: 'center',
  color: '#6b7280',
}

const nameCellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 220,
}

const nameMainStyle: React.CSSProperties = {
  color: '#111827',
  fontWeight: 800,
  transition: 'all 0.2s ease',
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
  transition: 'all 0.2s ease',
}

const tableDeleteBtnStyle: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 10,
  border: 'none',
  background: '#ef4444',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  transition: 'all 0.2s ease',
}

const statusOnBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 56,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  background: 'rgba(16,185,129,0.12)',
  color: '#059669',
  fontSize: 12,
  fontWeight: 800,
}

const statusOffBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 56,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  background: 'rgba(239,68,68,0.12)',
  color: '#dc2626',
  fontSize: 12,
  fontWeight: 800,
}

const batchActionStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 16,
  borderRadius: 12,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
  marginBottom: 16,
  gap: 16,
  flexWrap: 'wrap',
}

const batchActionTextStyle: React.CSSProperties = {
  color: '#374151',
  fontWeight: 700,
  fontSize: 14,
}

const batchActionBtnWrapStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const batchActionDeleteBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid rgba(239,68,68,0.20)',
  background: '#fff1f2',
  color: '#dc2626',
  cursor: 'pointer',
  fontWeight: 700,
  transition: 'all 0.2s ease',
}