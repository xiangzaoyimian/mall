import { useEffect, useMemo, useRef, useState } from 'react'
import client from './api/client'

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

type SkuForm = {
  rowId: string
  skuCode: string
  title: string
  price: string
  stock: string
  color: string
  size: string
  status: string
  lengthCm: string
  waistCm: string
  legOpeningCm: string
  fitType: string
}

type AdminSpuDetailResp = {
  id?: string
  name?: string
  categoryId?: string
  description?: string
  status?: string
  coverUrl?: string
  skus?: Array<{
    skuCode?: string
    title?: string
    price?: number
    stock?: number
    color?: string
    size?: string
    status?: string
    lengthCm?: number
    waistCm?: number
    legOpeningCm?: number
    fitType?: string
  }>
}

type CategoryOption = {
  id?: string
  name?: string
  parentId?: string
  sort?: number
  status?: string
}

function formatNumberInput(value: string) {
  return value.trim()
}

function toNumberOrNull(v: string) {
  const s = v.trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function toPositiveIntOrNull(v: string) {
  const n = toNumberOrNull(v)
  if (n == null) return null
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

function toNonNegativeNumberOrNull(v: string) {
  const n = toNumberOrNull(v)
  if (n == null || n < 0) return null
  return n
}

function toNonNegativeIntOrNull(v: string) {
  const n = toNumberOrNull(v)
  if (n == null || !Number.isInteger(n) || n < 0) return null
  return n
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

function formatPriceRange(min?: number, max?: number) {
  const hasMin = typeof min === 'number' && Number.isFinite(min)
  const hasMax = typeof max === 'number' && Number.isFinite(max)

  if (hasMin && hasMax) {
    if (min === max) return `¥${min}`
    return `¥${min} ~ ¥${max}`
  }
  if (hasMin) return `¥${min}`
  if (hasMax) return `¥${max}`
  return '--'
}

function formatStatusText(status?: string) {
  return String(status || '').toUpperCase() === 'ON' ? '上架中' : '已下架'
}

function createRowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function createEmptySku(): SkuForm {
  return {
    rowId: createRowId(),
    skuCode: '',
    title: '',
    price: '',
    stock: '',
    color: '',
    size: '',
    status: 'ON',
    lengthCm: '',
    waistCm: '',
    legOpeningCm: '',
    fitType: '',
  }
}

function normalizePageInput(value: string, fallback: number) {
  const s = value.trim()
  if (!s) return fallback
  const n = Number(s)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.floor(n))
}

function buildPaginationItems(current: number, total: number) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', total] as Array<number | 'ellipsis'>
  }

  if (current >= total - 3) {
    return [
      1,
      'ellipsis',
      total - 4,
      total - 3,
      total - 2,
      total - 1,
      total,
    ] as Array<number | 'ellipsis'>
  }

  return [
    1,
    'ellipsis',
    current - 1,
    current,
    current + 1,
    'ellipsis',
    total,
  ] as Array<number | 'ellipsis'>
}

function resolveImageUrl(url?: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `http://localhost:8081${url}`
}

export default function AdminProductPage() {
  const [editingId, setEditingId] = useState('')
  const isEdit = Boolean(editingId)

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('ON')
  const [coverUrl, setCoverUrl] = useState('')
  const [skus, setSkus] = useState<SkuForm[]>([createEmptySku()])
  const [selectedSkuIndex, setSelectedSkuIndex] = useState<number>(0)
  const [originalSkus, setOriginalSkus] = useState<SkuForm[]>([])

  const [keyword, setKeyword] = useState('')
  const [queryCategoryId, setQueryCategoryId] = useState('')
  const [queryStatus, setQueryStatus] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minSales, setMinSales] = useState('')
  const [maxSales, setMaxSales] = useState('')
  const [pageNo, setPageNo] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [previewImage, setPreviewImage] = useState<string>('')
  const [previewVisible, setPreviewVisible] = useState(false)

  const [list, setList] = useState<ProductItem[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  const [loadingList, setLoadingList] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [deletingId, setDeletingId] = useState<string>('')
  const [switchingId, setSwitchingId] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState('')

  const [hoverHeroCard, setHoverHeroCard] = useState('')
  const [hoverMainBtn, setHoverMainBtn] = useState('')
  const [hoverGhostBtn, setHoverGhostBtn] = useState('')
  const [hoverSkuCard, setHoverSkuCard] = useState('')
  const [hoverTableRow, setHoverTableRow] = useState('')
  const [focusedField, setFocusedField] = useState('')
  const [filterExpanded, setFilterExpanded] = useState(true)

  const skipNextPageEffectRef = useRef(false)

  const skuCount = useMemo(() => skus.length, [skus])

  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach((item) => {
      const key = String(item.id ?? '')
      if (key) {
        map[key] = item.name || `分类#${key}`
      }
    })
    return map
  }, [categories])

  async function loadList(nextPageNo?: number, nextPageSize?: number) {
    const realPageNo = nextPageNo ?? pageNo
    const realPageSize = nextPageSize ?? pageSize

    setLoadingList(true)
    try {
      const params = cleanParams({
        pageNo: realPageNo,
        pageSize: realPageSize,
        keyword: keyword.trim(),
        categoryId: toPositiveIntOrNull(queryCategoryId),
        status: queryStatus.trim() || undefined,
        minPrice: toNonNegativeNumberOrNull(minPrice),
        maxPrice: toNonNegativeNumberOrNull(maxPrice),
        minSales: toNonNegativeIntOrNull(minSales),
        maxSales: toNonNegativeIntOrNull(maxSales),
      })

      const resp = await client.get('/admin/spu', { params })
      const data: ProductListResp = resp?.data?.data || { total: 0, list: [] }

      const nextList = Array.isArray(data.list) ? data.list : []
      setList(nextList)
      setTotal(Number(data.total || 0))
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || '商品列表加载失败')
    } finally {
      setLoadingList(false)
    }
  }

  async function loadCategories() {
    setLoadingCategories(true)
    try {
      const resp = await client.get('/admin/categories')
      const data: CategoryOption[] = resp?.data?.data || []

      const nextList = Array.isArray(data) ? data : []
      setCategories(
        nextList.filter((item) => String(item.status || '').toUpperCase() === 'ON')
      )
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || '分类列表加载失败')
    } finally {
      setLoadingCategories(false)
    }
  }

  useEffect(() => {
    if (skipNextPageEffectRef.current) {
      skipNextPageEffectRef.current = false
      return
    }
    loadList()
  }, [pageNo, pageSize])

  useEffect(() => {
    loadCategories()
  }, [])

  function updateSku(index: number, key: keyof SkuForm, value: string) {
    setSkus((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    )
  }

  function addSkuRow() {
    setSkus((prev) => [...prev, createEmptySku()])
  }

  function removeSkuRow(index: number) {
    setSkus((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  function resetForm(options?: { keepMsg?: boolean }) {
    setEditingId('')
    setName('')
    setCategoryId('')
    setDescription('')
    setStatus('ON')
    setCoverUrl('')
    setSkus([createEmptySku()])
    setOriginalSkus([])
    setSelectedSkuIndex(0)

    if (!options?.keepMsg) {
      setMsg('')
    }
  }

  function handleSkuSelect(index: number) {
    setSelectedSkuIndex(index)
    if (originalSkus[index]) {
      setSkus([originalSkus[index]])
    }
  }

  // 当SKU信息更新时，同步更新originalSkus中对应的数据
  function updateSku(index: number, key: keyof SkuForm, value: string) {
    setSkus((prev) => {
      const updatedSkus = prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
      // 如果是编辑模式，同步更新originalSkus
      if (isEdit && originalSkus.length > 0) {
        const updatedOriginalSkus = [...originalSkus]
        updatedOriginalSkus[selectedSkuIndex] = { ...updatedOriginalSkus[selectedSkuIndex], [key]: value }
        setOriginalSkus(updatedOriginalSkus)
      }
      return updatedSkus
    })
  }

  function validate() {
    if (!name.trim()) return '商品名称不能为空'

    const catId = toPositiveIntOrNull(categoryId)
    if (catId == null) {
      return '请选择商品分类'
    }

    if (!status.trim()) return '商品状态不能为空'
    if (skus.length === 0) return '至少需要一个 SKU'

    const skuCodeSet = new Set<string>()

    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i]
      const rowNo = i + 1
      const skuCode = sku.skuCode.trim()

      if (!skuCode) return `第 ${rowNo} 个 SKU 的 skuCode 不能为空`
      if (skuCodeSet.has(skuCode)) return `第 ${rowNo} 个 SKU 的 skuCode 重复`
      skuCodeSet.add(skuCode)

      if (!sku.title.trim()) return `第 ${rowNo} 个 SKU 的标题不能为空`

      const price = toNonNegativeNumberOrNull(sku.price)
      if (price == null) return `第 ${rowNo} 个 SKU 的价格必须为大于等于 0 的数字`

      const stock = toNonNegativeIntOrNull(sku.stock)
      if (stock == null) return `第 ${rowNo} 个 SKU 的库存必须为大于等于 0 的整数`

      if (!sku.color.trim()) return `第 ${rowNo} 个 SKU 的颜色不能为空`
      if (!sku.size.trim()) return `第 ${rowNo} 个 SKU 的尺码不能为空`
      if (!sku.status.trim()) return `第 ${rowNo} 个 SKU 的状态不能为空`

      if (sku.lengthCm.trim() && toNonNegativeIntOrNull(sku.lengthCm) == null) {
        return `第 ${rowNo} 个 SKU 的裤长必须为大于等于 0 的整数`
      }

      if (sku.waistCm.trim() && toNonNegativeIntOrNull(sku.waistCm) == null) {
        return `第 ${rowNo} 个 SKU 的腰围必须为大于等于 0 的整数`
      }

      if (
        sku.legOpeningCm.trim() &&
        toNonNegativeIntOrNull(sku.legOpeningCm) == null
      ) {
        return `第 ${rowNo} 个 SKU 的裤脚口必须为大于等于 0 的整数`
      }
    }

    return ''
  }

  async function handleUploadCover(file?: File) {
    if (!file) return

    setUploadingCover(true)
    setMsg('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const resp = await client.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const uploadedUrl = resp?.data?.data || ''
      if (!uploadedUrl) {
        throw new Error('图片上传失败')
      }

      setCoverUrl(String(uploadedUrl))
      setMsg('商品图片上传成功')
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || '商品图片上传失败')
    } finally {
      setUploadingCover(false)
    }
  }

  async function handleSubmit() {
    const errText = validate()
    if (errText) {
      setMsg(errText)
      return
    }

    // 编辑模式下使用originalSkus，新增模式下使用skus
    const skusToSubmit = isEdit && originalSkus.length > 0 ? originalSkus : skus
    
    const payload = {
      name: name.trim(),
      categoryId: Number(categoryId),
      description: description.trim(),
      status: status.trim(),
      coverUrl: coverUrl.trim() || null,
      skus: skusToSubmit.map((sku) => ({
        skuCode: sku.skuCode.trim(),
        title: sku.title.trim(),
        price: Number(sku.price),
        stock: Number(sku.stock),
        color: sku.color.trim(),
        size: sku.size.trim(),
        status: sku.status.trim(),
        lengthCm: toNonNegativeIntOrNull(sku.lengthCm),
        waistCm: toNonNegativeIntOrNull(sku.waistCm),
        legOpeningCm: toNonNegativeIntOrNull(sku.legOpeningCm),
        fitType: sku.fitType.trim() || null,
      })),
    }

    setSubmitting(true)
    setMsg('')

    try {
      let successMsg = ''

      if (isEdit) {
        const resp = await client.put(`/admin/spu/${editingId}`, payload)
        successMsg = resp?.data?.msg || '商品更新成功'
      } else {
        const resp = await client.post('/admin/spu', payload)
        const newId = resp?.data?.data
        successMsg = newId ? `商品创建成功，spuId = ${newId}` : '商品创建成功'
      }

      resetForm({ keepMsg: true })
      setMsg(successMsg)

      if (pageNo !== 1) {
        setPageNo(1)
      } else {
        await loadList(1, pageSize)
      }
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

  async function handleEdit(id?: string) {
    if (id == null) return

    setLoadingDetail(true)
    setMsg('')

    try {
      const resp = await client.get(`/admin/spu/${id}`)
      const data: AdminSpuDetailResp = resp?.data?.data || {}

      setEditingId(String(data.id ?? id))
      setName(String(data.name || ''))
      setCategoryId(
        data.categoryId !== undefined && data.categoryId !== null
          ? String(data.categoryId)
          : ''
      )
      setDescription(String(data.description || ''))
      setStatus(String(data.status || 'ON'))
      setCoverUrl(String(data.coverUrl || ''))

      const detailSkus = Array.isArray(data.skus) ? data.skus : []

      if (detailSkus.length > 0) {
        const formattedSkus = detailSkus.map((sku) => ({
          rowId: createRowId(),
          skuCode: String(sku?.skuCode || ''),
          title: String(sku?.title || ''),
          price:
            sku?.price !== undefined && sku?.price !== null
              ? String(sku.price)
              : '',
          stock:
            sku?.stock !== undefined && sku?.stock !== null
              ? String(sku.stock)
              : '',
          color: String(sku?.color || ''),
          size: String(sku?.size || ''),
          status: String(sku?.status || 'ON'),
          lengthCm:
            sku?.lengthCm !== undefined && sku?.lengthCm !== null
              ? String(sku.lengthCm)
              : '',
          waistCm:
            sku?.waistCm !== undefined && sku?.waistCm !== null
              ? String(sku.waistCm)
              : '',
          legOpeningCm:
            sku?.legOpeningCm !== undefined && sku?.legOpeningCm !== null
              ? String(sku.legOpeningCm)
              : '',
          fitType: String(sku?.fitType || ''),
        }))
        setOriginalSkus(formattedSkus)
        setSkus([formattedSkus[0]])
        setSelectedSkuIndex(0)
      } else {
        setOriginalSkus([])
        setSkus([createEmptySku()])
        setSelectedSkuIndex(0)
      }

      window.scrollTo({ top: 0, behavior: 'smooth' })
      setMsg(`已加载商品 #${id}，现在可以编辑`)
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || '商品详情加载失败')
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleDelete(id?: string, productName?: string) {
    if (id == null) return

    const label = productName?.trim() ? `【${productName}】` : `#${id}`
    const ok = window.confirm(`确定删除商品 ${label} 吗？\n删除后不可恢复。`)
    if (!ok) return

    setDeletingId(String(id))
    setMsg('')

    try {
      const resp = await client.delete(`/admin/spu/${id}`)
      setMsg(resp?.data?.msg || `商品 ${label} 删除成功`)

      if (editingId && String(editingId) === String(id)) {
        resetForm({ keepMsg: true })
      }

      const nextTotal = Math.max(0, total - 1)
      const maxPageAfterDelete = Math.max(1, Math.ceil(nextTotal / pageSize))
      const nextPageNo = Math.min(pageNo, maxPageAfterDelete)

      if (nextPageNo !== pageNo) {
        setPageNo(nextPageNo)
      } else {
        await loadList(nextPageNo, pageSize)
      }
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

  async function handleSwitchStatus(
    id?: string,
    nextStatus?: 'ON' | 'OFF',
    productName?: string
  ) {
    if (id == null || !nextStatus) return

    const label = productName?.trim() ? `【${productName}】` : `#${id}`
    const actionText = nextStatus === 'ON' ? '上架' : '下架'
    const ok = window.confirm(`确定要${actionText}商品 ${label} 吗？`)
    if (!ok) return

    setSwitchingId(String(id))
    setMsg('')

    try {
      const url =
        nextStatus === 'ON' ? `/admin/spu/${id}/on` : `/admin/spu/${id}/off`

      const resp = await client.put(url)
      setMsg(resp?.data?.msg || `商品 ${label} ${actionText}成功`)

      if (editingId && String(editingId) === String(id)) {
        setStatus(nextStatus)
      }

      await loadList(pageNo, pageSize)
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || `${actionText}失败`)
    } finally {
      setSwitchingId('')
    }
  }

  async function handleSearch() {
    setMsg('')

    if (pageNo !== 1) {
      setPageNo(1)
      return
    }

    skipNextPageEffectRef.current = true
    await loadList(1, pageSize)
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
      setMsg('请选择要删除的商品')
      return
    }

    const ok = window.confirm(`确定删除选中的 ${ids.length} 个商品吗？\n删除后不可恢复。`)
    if (!ok) return

    setLoadingList(true)
    setMsg('')

    try {
      const promises = ids.map(id => client.delete(`/admin/spu/${id}`))
      await Promise.all(promises)
      setMsg(`成功删除 ${ids.length} 个商品`)
      setSelectedIds(new Set())
      await loadList(pageNo, pageSize)
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

  async function handleBatchSwitchStatus(status: 'ON' | 'OFF') {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      setMsg('请选择要操作的商品')
      return
    }

    const actionText = status === 'ON' ? '上架' : '下架'
    const ok = window.confirm(`确定要${actionText}选中的 ${ids.length} 个商品吗？`)
    if (!ok) return

    setLoadingList(true)
    setMsg('')

    try {
      const promises = ids.map(id => {
        const url = status === 'ON' ? `/admin/spu/${id}/on` : `/admin/spu/${id}/off`
        return client.put(url)
      })
      await Promise.all(promises)
      setMsg(`成功${actionText} ${ids.length} 个商品`)
      setSelectedIds(new Set())
      await loadList(pageNo, pageSize)
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { msg?: string } }
        message?: string
      }
      setMsg(err?.response?.data?.msg || err?.message || `批量${actionText}失败`)
    } finally {
      setLoadingList(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrevPage = pageNo > 1
  const canNextPage = pageNo < totalPages
  const paginationItems = buildPaginationItems(pageNo, totalPages)

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={heroTagStyle}>PRODUCT ADMIN</div>
          <h1 style={heroTitleStyle}>{isEdit ? '编辑商品' : '商品管理'}</h1>
          <div style={heroDescStyle}>
            后台商品管理以 SPU 为主体，一个商品可以挂多个 SKU。
            现在已支持商品主图上传、预览、保存与编辑回显。
          </div>
        </div>

        <div style={heroStatsWrapStyle}>
          <div
            style={{
              ...heroStatCardStyle,
              ...(hoverHeroCard === 'mode' ? heroStatCardHoverStyle : {}),
            }}
            onMouseEnter={() => setHoverHeroCard('mode')}
            onMouseLeave={() => setHoverHeroCard('')}
          >
            <div style={heroStatLabelStyle}>当前模式</div>
            <div style={heroStatValueStyle}>{isEdit ? 'EDIT' : 'CREATE'}</div>
            <div style={heroStatDescStyle}>{isEdit ? '编辑商品' : '新增商品'}</div>
          </div>

          <div
            style={{
              ...heroStatCardStyle,
              ...(hoverHeroCard === 'sku' ? heroStatCardHoverStyle : {}),
            }}
            onMouseEnter={() => setHoverHeroCard('sku')}
            onMouseLeave={() => setHoverHeroCard('')}
          >
            <div style={heroStatLabelStyle}>SKU 数量</div>
            <div style={heroStatValueStyle}>{skuCount}</div>
            <div style={heroStatDescStyle}>个规格明细</div>
          </div>
        </div>
      </section>

      <section style={formWrapStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={sectionKickerStyle}>PRODUCT MANAGEMENT</div>
            <h2 style={sectionTitleStyle}>商品管理</h2>
          </div>

          <div style={btnRowStyle}>
            {isEdit ? (
              <button
                type="button"
                onClick={() => resetForm()}
                style={{
                  ...ghostBtnStyle,
                  ...(hoverGhostBtn === 'exitEdit' ? ghostBtnHoverStyle : {}),
                }}
                onMouseEnter={() => setHoverGhostBtn('exitEdit')}
                onMouseLeave={() => setHoverGhostBtn('')}
              >
                退出编辑
              </button>
            ) : null}
          </div>
        </div>

        <div style={tipBoxStyle}>
          <div style={tipTitleStyle}>说明</div>
          <div style={tipTextStyle}>
            SPU 是商品主体，例如“经典直筒牛仔裤”；SKU 是具体规格，例如“蓝色 / M / 100cm”。
            现在商品支持主图上传，列表页会显示缩略图。
          </div>
        </div>

        <div style={productSectionStyle}>
          <div style={productSectionHeaderStyle}>
            <h3 style={productSectionTitleStyle}>商品基本信息 (SPU)</h3>
            <div style={productSectionDescStyle}>设置商品的基本信息，包括名称、分类、状态、主图和描述</div>
          </div>
          
          <div style={basicGridStyle}>
            <div style={fieldBlockStyle}>
              <label style={labelStyle}>商品名称</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：直筒牛仔裤"
                style={{
                  ...inputStyle,
                  ...(focusedField === 'name' ? inputFocusStyle : {}),
                }}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField('')}
              />
            </div>

            <div style={fieldBlockStyle}>
              <label style={labelStyle}>商品分类</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  ...inputStyle,
                  ...(focusedField === 'categoryId' ? inputFocusStyle : {}),
                }}
                disabled={loadingCategories}
                onFocus={() => setFocusedField('categoryId')}
                onBlur={() => setFocusedField('')}
              >
                <option value="">请选择分类</option>
                {categories.map((item) => (
                  <option key={String(item.id ?? '')} value={String(item.id ?? '')}>
                    {item.name || `分类#${item.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div style={fieldBlockStyle}>
              <label style={labelStyle}>商品状态</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  ...inputStyle,
                  ...(focusedField === 'status' ? inputFocusStyle : {}),
                }}
                onFocus={() => setFocusedField('status')}
                onBlur={() => setFocusedField('')}
              >
                <option value="ON">ON</option>
                <option value="OFF">OFF</option>
              </select>
            </div>

            <div style={{ ...fieldBlockStyle, gridColumn: '1 / -1' }}>
              <label style={labelStyle}>商品主图</label>
              <div style={coverUploadWrapStyle}>
                <label style={uploadBtnStyle}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadCover(e.target.files?.[0])}
                    disabled={uploadingCover}
                    style={fileInputHiddenStyle}
                  />
                  {uploadingCover ? '上传中...' : '选择图片'}
                </label>
                <div style={coverUploadTipStyle}>
                  {uploadingCover ? '图片上传中...' : '支持 JPG、PNG 等格式，编辑时可重新更换'}
                </div>

                {coverUrl ? (
                  <div style={coverPreviewWrapStyle}>
                    <img
                      src={resolveImageUrl(coverUrl)}
                      alt="商品主图"
                      style={coverPreviewStyle}
                    />
                    <div style={coverUrlTextStyle}>{coverUrl}</div>
                  </div>
                ) : (
                  <div style={coverEmptyStyle}>暂未上传商品主图</div>
                )}
              </div>
            </div>

            <div style={{ ...fieldBlockStyle, gridColumn: '1 / -1' }}>
              <label style={labelStyle}>商品描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入商品描述"
                style={{
                  ...textareaStyle,
                  ...(focusedField === 'description' ? inputFocusStyle : {}),
                }}
                onFocus={() => setFocusedField('description')}
                onBlur={() => setFocusedField('')}
              />
            </div>
          </div>
        </div>

        <div style={productSectionStyle}>
          <div style={productSectionHeaderStyle}>
            <h3 style={productSectionTitleStyle}>商品规格明细 (SKU)</h3>
            <div style={productSectionDescStyle}>为商品添加具体的规格信息，包括颜色、尺码、价格、库存等</div>
          </div>
          
          {isEdit && originalSkus.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>选择 SKU</label>
              <select
                value={selectedSkuIndex}
                onChange={(e) => handleSkuSelect(Number(e.target.value))}
                style={{
                  ...inputStyle,
                  ...(focusedField === 'selectedSku' ? inputFocusStyle : {}),
                }}
                onFocus={() => setFocusedField('selectedSku')}
                onBlur={() => setFocusedField('')}
              >
                {originalSkus.map((sku, index) => (
                  <option key={sku.rowId} value={index}>
                    SKU({sku.title || sku.skuCode || '未命名规格'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={skuExplainStyle}>
            {isEdit && originalSkus.length > 0 
              ? '选择一个 SKU 进行编辑，修改后会自动保存到商品规格集合中。' 
              : '每一张卡片代表一个 SKU。更新商品时，会以你当前页面中的 SKU 列表作为新的完整规格集合提交。'}
          </div>

          <div style={skuListStyle}>
            {skus.map((sku, index) => {
              const skuHoverKey = sku.rowId;
              return (
                <div
                  key={sku.rowId}
                  style={{
                    ...skuCardStyle,
                    ...(hoverSkuCard === skuHoverKey ? skuCardHoverStyle : {}),
                  }}
                  onMouseEnter={() => setHoverSkuCard(skuHoverKey)}
                  onMouseLeave={() => setHoverSkuCard('')}
                >
                <div style={skuCardTopStyle}>
                  <div style={skuCardTitleWrapStyle}>
                    <div style={skuCardTitleStyle}>{isEdit ? `当前编辑 SKU` : `规格`}</div>
                    <div style={skuCardSubStyle}>
                      {sku.title || sku.skuCode || '未命名规格'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSkuRow(index)}
                    style={ghostDangerBtnStyle}
                    disabled={skus.length === 1}
                  >
                    删除
                  </button>
                </div>

                <div style={skuGridStyle}>
                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>skuCode</label>
                    <input
                      value={sku.skuCode}
                      onChange={(e) => updateSku(index, 'skuCode', e.target.value)}
                      placeholder="例如：SKU-001"
                      style={{
                        ...inputStyle,
                        ...(focusedField === `${sku.rowId}_skuCode` ? inputFocusStyle : {}),
                      }}
                      onFocus={() => setFocusedField(`${sku.rowId}_skuCode`)}
                      onBlur={() => setFocusedField('')}
                    />
                  </div>

                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>标题</label>
                    <input
                      value={sku.title}
                      onChange={(e) => updateSku(index, 'title', e.target.value)}
                      placeholder="例如：蓝色 M"
                      style={{
                        ...inputStyle,
                        ...(focusedField === `${sku.rowId}_title` ? inputFocusStyle : {}),
                      }}
                      onFocus={() => setFocusedField(`${sku.rowId}_title`)}
                      onBlur={() => setFocusedField('')}
                    />
                  </div>

                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>价格</label>
                    <input
                      value={sku.price}
                      onChange={(e) =>
                        updateSku(index, 'price', formatNumberInput(e.target.value))
                      }
                      placeholder="例如：199"
                      style={{
                        ...inputStyle,
                        ...(focusedField === `${sku.rowId}_price` ? inputFocusStyle : {}),
                      }}
                      onFocus={() => setFocusedField(`${sku.rowId}_price`)}
                      onBlur={() => setFocusedField('')}
                    />
                  </div>

                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>库存</label>
                    <input
                      value={sku.stock}
                      onChange={(e) =>
                        updateSku(index, 'stock', formatNumberInput(e.target.value))
                      }
                      placeholder="例如：100"
                      style={{
                        ...inputStyle,
                        ...(focusedField === `${sku.rowId}_stock` ? inputFocusStyle : {}),
                      }}
                      onFocus={() => setFocusedField(`${sku.rowId}_stock`)}
                      onBlur={() => setFocusedField('')}
                    />
                  </div>

                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>颜色</label>
                    <input
                      value={sku.color}
                      onChange={(e) => updateSku(index, 'color', e.target.value)}
                      placeholder="例如：蓝"
                      style={{
                        ...inputStyle,
                        ...(focusedField === `${sku.rowId}_color` ? inputFocusStyle : {}),
                      }}
                      onFocus={() => setFocusedField(`${sku.rowId}_color`)}
                      onBlur={() => setFocusedField('')}
                    />
                  </div>

                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>尺码</label>
                    <input
                      value={sku.size}
                      onChange={(e) => updateSku(index, 'size', e.target.value)}
                      placeholder="例如：M"
                      style={{
                        ...inputStyle,
                        ...(focusedField === `${sku.rowId}_size` ? inputFocusStyle : {}),
                      }}
                      onFocus={() => setFocusedField(`${sku.rowId}_size`)}
                      onBlur={() => setFocusedField('')}
                    />
                  </div>

                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>SKU 状态</label>
                    <select
                      value={sku.status}
                      onChange={(e) => updateSku(index, 'status', e.target.value)}
                      style={{
                        ...inputStyle,
                        ...(focusedField === `${sku.rowId}_skuStatus`
                          ? inputFocusStyle
                          : {}),
                      }}
                      onFocus={() => setFocusedField(`${sku.rowId}_skuStatus`)}
                      onBlur={() => setFocusedField('')}
                    >
                      <option value="ON">ON</option>
                      <option value="OFF">OFF</option>
                    </select>
                  </div>

                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>版型</label>
                    <input
                      value={sku.fitType}
                      onChange={(e) => updateSku(index, 'fitType', e.target.value)}
                      placeholder="例如：修身、直筒、宽松"
                      style={{
                        ...inputStyle,
                        ...(focusedField === `${sku.rowId}_fitType` ? inputFocusStyle : {}),
                      }}
                      onFocus={() => setFocusedField(`${sku.rowId}_fitType`)}
                      onBlur={() => setFocusedField('')}
                    />
                  </div>

                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>裤长 cm</label>
                    <input
                      value={sku.lengthCm}
                      onChange={(e) =>
                        updateSku(index, 'lengthCm', formatNumberInput(e.target.value))
                      }
                      placeholder="例如：100"
                      style={{
                        ...inputStyle,
                        ...(focusedField === `${sku.rowId}_lengthCm` ? inputFocusStyle : {}),
                      }}
                      onFocus={() => setFocusedField(`${sku.rowId}_lengthCm`)}
                      onBlur={() => setFocusedField('')}
                    />
                  </div>

                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>腰围 cm</label>
                    <input
                      value={sku.waistCm}
                      onChange={(e) =>
                        updateSku(index, 'waistCm', formatNumberInput(e.target.value))
                      }
                      placeholder="例如：76"
                      style={{
                        ...inputStyle,
                        ...(focusedField === `${sku.rowId}_waistCm` ? inputFocusStyle : {}),
                      }}
                      onFocus={() => setFocusedField(`${sku.rowId}_waistCm`)}
                      onBlur={() => setFocusedField('')}
                    />
                  </div>

                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>裤脚口 cm</label>
                    <input
                      value={sku.legOpeningCm}
                      onChange={(e) =>
                        updateSku(index, 'legOpeningCm', formatNumberInput(e.target.value))
                      }
                      placeholder="例如：22"
                      style={{
                        ...inputStyle,
                        ...(focusedField === `${sku.rowId}_legOpeningCm`
                          ? inputFocusStyle
                          : {}),
                      }}
                      onFocus={() => setFocusedField(`${sku.rowId}_legOpeningCm`)}
                      onBlur={() => setFocusedField('')}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        </div>

        <div style={submitRowStyle}>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              ...submitBtnStyle,
              ...(hoverMainBtn === 'submit' ? submitBtnHoverStyle : {}),
            }}
            disabled={submitting || loadingDetail || uploadingCover}
            onMouseEnter={() => setHoverMainBtn('submit')}
            onMouseLeave={() => setHoverMainBtn('')}
          >
            {submitting
              ? isEdit
                ? '更新中...'
                : '创建中...'
              : isEdit
              ? '提交更新'
              : '创建商品'}
          </button>
        </div>

        {msg ? <div style={msgStyle}>{msg}</div> : null}
      </section>

      <section style={formWrapStyle}>
        <div style={sectionHeadStyle}>
          <div>
            <div style={sectionKickerStyle}>PRODUCT LIST</div>
            <h2 style={sectionTitleStyle}>商品列表</h2>
          </div>
          <button
            type="button"
            onClick={() => setFilterExpanded(!filterExpanded)}
            style={{
              ...ghostBtnStyle,
              ...(hoverMainBtn === 'toggleFilter' ? ghostBtnHoverStyle : {}),
            }}
            onMouseEnter={() => setHoverMainBtn('toggleFilter')}
            onMouseLeave={() => setHoverMainBtn('')}
          >
            {filterExpanded ? '收起筛选项' : '展开筛选项'}
          </button>
        </div>

        {filterExpanded && (
        <div style={filterGridStyle}>
          <div style={fieldBlockStyle}>
            <label style={labelStyle}>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="商品名称关键词"
              style={{
                ...inputStyle,
                ...(focusedField === 'keyword' ? inputFocusStyle : {}),
              }}
              onFocus={() => setFocusedField('keyword')}
              onBlur={() => setFocusedField('')}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>分类</label>
            <select
              value={queryCategoryId}
              onChange={(e) => setQueryCategoryId(e.target.value)}
              style={{
                ...inputStyle,
                ...(focusedField === 'queryCategoryId' ? inputFocusStyle : {}),
              }}
              disabled={loadingCategories}
              onFocus={() => setFocusedField('queryCategoryId')}
              onBlur={() => setFocusedField('')}
            >
              <option value="">全部分类</option>
              {categories.map((item) => (
                <option key={String(item.id ?? '')} value={String(item.id ?? '')}>
                  {item.name || `分类#${item.id}`}
                </option>
              ))}
            </select>
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
              <option value="">全部</option>
              <option value="ON">ON</option>
              <option value="OFF">OFF</option>
            </select>
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>最低价格</label>
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(formatNumberInput(e.target.value))}
              placeholder="0"
              style={{
                ...inputStyle,
                ...(focusedField === 'minPrice' ? inputFocusStyle : {}),
              }}
              onFocus={() => setFocusedField('minPrice')}
              onBlur={() => setFocusedField('')}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>最高价格</label>
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(formatNumberInput(e.target.value))}
              placeholder="9999"
              style={{
                ...inputStyle,
                ...(focusedField === 'maxPrice' ? inputFocusStyle : {}),
              }}
              onFocus={() => setFocusedField('maxPrice')}
              onBlur={() => setFocusedField('')}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>最低销量</label>
            <input
              value={minSales}
              onChange={(e) => setMinSales(formatNumberInput(e.target.value))}
              placeholder="0"
              style={{
                ...inputStyle,
                ...(focusedField === 'minSales' ? inputFocusStyle : {}),
              }}
              onFocus={() => setFocusedField('minSales')}
              onBlur={() => setFocusedField('')}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>最高销量</label>
            <input
              value={maxSales}
              onChange={(e) => setMaxSales(formatNumberInput(e.target.value))}
              placeholder="999999"
              style={{
                ...inputStyle,
                ...(focusedField === 'maxSales' ? inputFocusStyle : {}),
              }}
              onFocus={() => setFocusedField('maxSales')}
              onBlur={() => setFocusedField('')}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>页码</label>
            <input
              value={String(pageNo)}
              onChange={(e) => {
                setPageNo(normalizePageInput(e.target.value, 1))
              }}
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
              onChange={(e) => {
                setPageSize(normalizePageInput(e.target.value, 10))
              }}
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
                ...(hoverMainBtn === 'searchProduct' ? primaryBtnHoverStyle : {}),
              }}
              disabled={loadingList}
              onMouseEnter={() => setHoverMainBtn('searchProduct')}
              onMouseLeave={() => setHoverMainBtn('')}
            >
              搜索商品
            </button>
          </div>
        </div>
        )}

        <div style={tableTipStyle}>
          这里展示的是 SPU 列表，不是 SKU 列表。所以如果你数据库里有 50 个 SKU，
          但只有 3 个商品主体，这里显示 3 条是正常的。
        </div>

        {selectedIds.size > 0 && (
          <div style={batchActionStyle}>
            <div style={batchActionTextStyle}>
              已选择 {selectedIds.size} 个商品
            </div>
            <div style={batchActionBtnWrapStyle}>
              <button
                type="button"
                onClick={() => handleBatchSwitchStatus('ON')}
                style={batchActionBtnStyle}
                disabled={loadingList}
              >
                批量上架
              </button>
              <button
                type="button"
                onClick={() => handleBatchSwitchStatus('OFF')}
                style={batchActionBtnStyle}
                disabled={loadingList}
              >
                批量下架
              </button>
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
                <th style={thStyle}>图片</th>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>商品名称</th>
                <th style={thStyle}>分类</th>
                <th style={thStyle}>状态</th>
                <th style={thStyle}>价格区间</th>
                <th style={thStyle}>总库存</th>
                <th style={thStyle}>销量</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>

            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td style={emptyTdStyle} colSpan={10}>
                    暂无商品数据
                  </td>
                </tr>
              ) : (
                list.map((item) => {
                  const rowId = String(item.id ?? '')
                  const deleting = deletingId === rowId
                  const switching = switchingId === rowId
                  const rowStatus = String(item.status || '').toUpperCase()
                  const categoryText =
                    categoryNameMap[String(item.categoryId ?? '')] ||
                    String(item.categoryId ?? '-')

                  return (
                    <tr
                      key={rowId}
                      style={hoverTableRow === rowId ? tableRowHoverStyle : undefined}
                      onMouseEnter={() => setHoverTableRow(rowId)}
                      onMouseLeave={() => setHoverTableRow('')}
                    >
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(rowId)}
                          onChange={(e) => handleSelectItem(rowId, e.target.checked)}
                          disabled={loadingList || deleting || switching}
                        />
                      </td>
                      <td style={tdStyle}>
                        {item.coverUrl ? (
                          <img
                            src={resolveImageUrl(item.coverUrl)}
                            alt={String(item.name || '商品')}
                            style={tableThumbStyle}
                            onClick={() => {
                              setPreviewImage(resolveImageUrl(item.coverUrl))
                              setPreviewVisible(true)
                            }}
                          />
                        ) : (
                          <div style={tableThumbEmptyStyle}>🖼</div>
                        )}
                      </td>
                      <td style={tdStyle}>{item.id ?? '-'}</td>
                      <td style={tdStyle}>
                        <div style={nameCellStyle}>
                          <div style={nameMainStyle}>{item.name || '-'}</div>

                          <div style={nameTagRowStyle}>
                            {Number(item.sales || 0) > 50 ? (
                              <span style={hotTagStyle}>热销</span>
                            ) : null}
                            {rowStatus === 'ON' ? (
                              <span style={onTagStyle}>在售</span>
                            ) : null}
                          </div>

                          <div style={nameSubStyle}>
                            {item.description || '暂无描述'}
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>{categoryText}</td>
                      <td style={tdStyle}>
                        <span
                          style={
                            rowStatus === 'ON' ? statusOnBadgeStyle : statusOffBadgeStyle
                          }
                        >
                          {formatStatusText(rowStatus)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {formatPriceRange(item.minPrice, item.maxPrice)}
                      </td>
                      <td style={tdStyle}>{item.totalStock ?? '-'}</td>
                      <td style={tdStyle}>
                        {item.sales != null ? `${item.sales} 件` : '-'}
                      </td>
                      <td style={tdStyle}>
                        <div style={tableActionWrapStyle}>
                          <button
                            type="button"
                            onClick={() => handleEdit(item.id)}
                            style={tableActionBtnStyle}
                            disabled={loadingDetail || deleting || switching}
                          >
                            编辑
                          </button>

                          {rowStatus === 'ON' ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleSwitchStatus(item.id, 'OFF', item.name)
                              }
                              style={tableOffBtnStyle}
                              disabled={switching || deleting}
                            >
                              {switching ? '处理中...' : '下架'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleSwitchStatus(item.id, 'ON', item.name)
                              }
                              style={tableOnBtnStyle}
                              disabled={switching || deleting}
                            >
                              {switching ? '处理中...' : '上架'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.name)}
                            style={tableDeleteBtnStyle}
                            disabled={deleting || switching}
                          >
                            {deleting ? '删除中...' : '删除'}
                          </button>
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
              onClick={() => setPageNo(1)}
              style={{
                ...ghostBtnStyle,
                ...(hoverGhostBtn === 'firstPage' ? ghostBtnHoverStyle : {}),
                ...(!canPrevPage ? disabledBtnStyle : {}),
              }}
              disabled={!canPrevPage}
              onMouseEnter={() => setHoverGhostBtn('firstPage')}
              onMouseLeave={() => setHoverGhostBtn('')}
            >
              首页
            </button>

            <button
              type="button"
              onClick={() => canPrevPage && setPageNo((p) => Math.max(1, p - 1))}
              style={{
                ...ghostBtnStyle,
                ...(hoverGhostBtn === 'prevPage' ? ghostBtnHoverStyle : {}),
                ...(!canPrevPage ? disabledBtnStyle : {}),
              }}
              disabled={!canPrevPage}
              onMouseEnter={() => setHoverGhostBtn('prevPage')}
              onMouseLeave={() => setHoverGhostBtn('')}
            >
              上一页
            </button>

            {paginationItems.map((item, index) => {
              if (item === 'ellipsis') {
                return (
                  <span key={`ellipsis-${index}`} style={paginationEllipsisStyle}>
                    ...
                  </span>
                )
              }

              const active = item === pageNo
              const hoverKey = `page-${item}`

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPageNo(item)}
                  style={{
                    ...(active ? activePageBtnStyle : ghostBtnStyle),
                    ...(!active && hoverGhostBtn === hoverKey ? ghostBtnHoverStyle : {}),
                  }}
                  disabled={active}
                  onMouseEnter={() => !active && setHoverGhostBtn(hoverKey)}
                  onMouseLeave={() => setHoverGhostBtn('')}
                >
                  {item}
                </button>
              )
            })}

            <button
              type="button"
              onClick={() =>
                canNextPage && setPageNo((p) => Math.min(totalPages, p + 1))
              }
              style={{
                ...ghostBtnStyle,
                ...(hoverGhostBtn === 'nextPage' ? ghostBtnHoverStyle : {}),
                ...(!canNextPage ? disabledBtnStyle : {}),
              }}
              disabled={!canNextPage}
              onMouseEnter={() => setHoverGhostBtn('nextPage')}
              onMouseLeave={() => setHoverGhostBtn('')}
            >
              下一页
            </button>

            <button
              type="button"
              onClick={() => setPageNo(totalPages)}
              style={{
                ...ghostBtnStyle,
                ...(hoverGhostBtn === 'lastPage' ? ghostBtnHoverStyle : {}),
                ...(!canNextPage ? disabledBtnStyle : {}),
              }}
              disabled={!canNextPage}
              onMouseEnter={() => setHoverGhostBtn('lastPage')}
              onMouseLeave={() => setHoverGhostBtn('')}
            >
              末页
            </button>
          </div>
        </div>
      </section>

      {previewVisible && previewImage && (
        <div style={imagePreviewModalStyle} onClick={() => setPreviewVisible(false)}>
          <div style={imagePreviewContentStyle} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              style={imagePreviewCloseBtnStyle}
              onClick={() => setPreviewVisible(false)}
            >
              ×
            </button>
            <img
              src={previewImage}
              alt="商品图片预览"
              style={imagePreviewImageStyle}
            />
          </div>
        </div>
      )}
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
  transition: 'transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease',
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

const productSectionStyle: React.CSSProperties = {
  marginTop: 30,
  padding: 24,
  borderRadius: 24,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
}

const productSectionHeaderStyle: React.CSSProperties = {
  marginBottom: 22,
}

const productSectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  color: '#111827',
  marginBottom: 8,
}

const productSectionDescStyle: React.CSSProperties = {
  color: '#6b7280',
  lineHeight: 1.6,
  fontSize: 14,
}

const basicGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 16,
  marginTop: 22,
}

const filterGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
  gap: 16,
  marginTop: 22,
  '@media (maxWidth: 1200px)': {
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  },
  '@media (maxWidth: 768px)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  '@media (maxWidth: 480px)': {
    gridTemplateColumns: '1fr',
  },
}

const skuExplainStyle: React.CSSProperties = {
  marginTop: 18,
  color: '#6b7280',
  lineHeight: 1.8,
  fontSize: 14,
}

const skuListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  marginTop: 22,
}

const skuCardStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 22,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
  transition: 'transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease',
}

const skuCardHoverStyle: React.CSSProperties = {
  transform: 'translateY(-3px)',
  boxShadow: '0 18px 32px rgba(15,23,42,0.08)',
  border: '1px solid rgba(37,99,235,0.14)',
}

const skuCardTopStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  marginBottom: 18,
}

const skuCardTitleWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const skuCardTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  color: '#111827',
}

const skuCardSubStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: 13,
}

const skuGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 16,
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
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
}

const inputFocusStyle: React.CSSProperties = {
  border: '1px solid rgba(37,99,235,0.40)',
  boxShadow: '0 0 0 4px rgba(37,99,235,0.10)',
}

const textareaStyle: React.CSSProperties = {
  minHeight: 120,
  padding: 14,
  borderRadius: 14,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

const coverUploadWrapStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
}

const coverUploadTipStyle: React.CSSProperties = {
  marginTop: 10,
  color: '#6b7280',
  fontSize: 13,
}

const coverPreviewWrapStyle: React.CSSProperties = {
  marginTop: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const coverPreviewStyle: React.CSSProperties = {
  width: 180,
  height: 180,
  objectFit: 'cover',
  borderRadius: 16,
  border: '1px solid rgba(15,23,42,0.08)',
  background: '#fff',
  boxShadow: '0 12px 26px rgba(15,23,42,0.08)',
}

const coverUrlTextStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: 12,
  lineHeight: 1.6,
  wordBreak: 'break-all',
}

const coverEmptyStyle: React.CSSProperties = {
  marginTop: 14,
  color: '#9ca3af',
  fontSize: 13,
}

const uploadBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 40,
  padding: '0 16px',
  borderRadius: 12,
  border: 'none',
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 14,
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
}

const fileInputHiddenStyle: React.CSSProperties = {
  display: 'none',
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
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
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
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
}

const ghostBtnHoverStyle: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 12px 22px rgba(15,23,42,0.08)',
  border: '1px solid rgba(37,99,235,0.16)',
}

const activePageBtnStyle: React.CSSProperties = {
  height: 44,
  minWidth: 44,
  padding: '0 16px',
  borderRadius: 14,
  border: 'none',
  background: '#111827',
  color: '#fff',
  cursor: 'default',
  fontWeight: 800,
  boxShadow: '0 10px 20px rgba(15,23,42,0.16)',
}

const disabledBtnStyle: React.CSSProperties = {
  opacity: 0.45,
  cursor: 'not-allowed',
  boxShadow: 'none',
  transform: 'none',
}

const paginationEllipsisStyle: React.CSSProperties = {
  minWidth: 32,
  height: 44,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#9ca3af',
  fontWeight: 800,
}

const ghostDangerBtnStyle: React.CSSProperties = {
  height: 40,
  padding: '0 16px',
  borderRadius: 12,
  border: 'none',
  background: '#fff7ed',
  color: '#ea580c',
  cursor: 'pointer',
  fontWeight: 800,
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
  transition: 'transform 0.22s ease, box-shadow 0.22s ease',
}

const submitBtnHoverStyle: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 18px 34px rgba(37,99,235,0.24)',
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

const tableThumbStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  objectFit: 'cover',
  borderRadius: 12,
  border: '1px solid rgba(15,23,42,0.08)',
  background: '#fff',
  boxShadow: '0 8px 18px rgba(15,23,42,0.06)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
}

const tableThumbEmptyStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 12,
  border: '1px dashed rgba(15,23,42,0.10)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#9ca3af',
  fontSize: 20,
}

const imagePreviewModalStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
}

const imagePreviewContentStyle: React.CSSProperties = {
  position: 'relative',
  maxWidth: '90%',
  maxHeight: '90%',
  borderRadius: 12,
  overflow: 'hidden',
  background: '#fff',
  padding: 20,
}

const imagePreviewCloseBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  right: 10,
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: 'rgba(0,0,0,0.6)',
  color: '#fff',
  border: 'none',
  fontSize: 24,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
}

const imagePreviewImageStyle: React.CSSProperties = {
  maxWidth: '100%',
  maxHeight: '80vh',
  objectFit: 'contain',
  borderRadius: 8,
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
}

const nameTagRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
}

const hotTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 24,
  padding: '0 8px',
  borderRadius: 999,
  background: '#fee2e2',
  color: '#dc2626',
  fontSize: 12,
  fontWeight: 800,
}

const onTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 24,
  padding: '0 8px',
  borderRadius: 999,
  background: '#dcfce7',
  color: '#16a34a',
  fontSize: 12,
  fontWeight: 800,
}

const nameSubStyle: React.CSSProperties = {
  color: '#6b7280',
  lineHeight: 1.6,
  fontSize: 13,
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

const tableDeleteBtnStyle: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 10,
  border: 'none',
  background: '#ef4444',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
}

const tableOnBtnStyle: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 10,
  border: 'none',
  background: '#10b981',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
}

const tableOffBtnStyle: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 10,
  border: 'none',
  background: '#f59e0b',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
}

const statusOnBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 72,
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
  minWidth: 72,
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
  alignItems: 'center',
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

const batchActionDeleteBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 10,
  border: '1px solid rgba(239,68,68,0.20)',
  background: '#fff1f2',
  color: '#dc2626',
  cursor: 'pointer',
  fontWeight: 700,
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 4px rgba(239,68,68,0.08)',
}