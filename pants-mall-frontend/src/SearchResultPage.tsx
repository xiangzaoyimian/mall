import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  getProductCompare,
  getProductList,
  type ProductCompareItem,
  type ProductItem,
} from './api/products'
import type { SearchPageState } from './App'

type Props = {
  initialKeyword?: string
  savedState?: SearchPageState
  onStateChange?: (state: SearchPageState) => void
  onOpenDetail?: (spuId: string | number) => void
  onBackToAllProducts?: () => void
}

type SortType = 'default' | 'sales' | 'priceAsc' | 'priceDesc' | 'newest'
type FitType = '' | '直筒' | '修身' | '宽松'
type ColorFamilyType =
  | ''
  | '黑色系'
  | '灰色系'
  | '白色系'
  | '蓝色系'
  | '绿色系'
  | '卡其色系'
  | '棕色系'
type SizeType =
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
type ViewMode = 'grid' | 'list'

const defaultSavedState: SearchPageState = {
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

const SEARCH_HISTORY_KEY = 'pants_mall_search_history_v1'

const HOT_SEARCHES = [
  '牛仔裤',
  '直筒裤',
  '黑色裤子',
  '工装裤',
  '修身牛仔裤',
  '宽松长裤',
]

const PRICE_PRESETS = [
  { label: '¥0-99', min: '0', max: '99' },
  { label: '¥100-199', min: '100', max: '199' },
  { label: '¥200-299', min: '200', max: '299' },
  { label: '¥300+', min: '300', max: '' },
]

const WAIST_PRESETS = [
  { label: '70-74', min: '70', max: '74' },
  { label: '75-80', min: '75', max: '80' },
  { label: '81-86', min: '81', max: '86' },
  { label: '87+', min: '87', max: '' },
]

const LENGTH_PRESETS = [
  { label: '90-95', min: '90', max: '95' },
  { label: '96-100', min: '96', max: '100' },
  { label: '101-105', min: '101', max: '105' },
  { label: '106+', min: '106', max: '' },
]

function loadSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 8)
  } catch {
    return []
  }
}

function saveSearchHistoryKeyword(keyword: string) {
  const text = String(keyword || '').trim()
  if (!text) return

  try {
    const oldList = loadSearchHistory()
    const nextList = [text, ...oldList.filter((item) => item !== text)].slice(
      0,
      8
    )
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextList))
  } catch {
    // ignore
  }
}

function clearSearchHistoryStorage() {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY)
  } catch {
    // ignore
  }
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

function formatOptionalNumber(v?: number) {
  if (typeof v !== 'number' || Number.isNaN(v)) return '--'
  return String(v)
}

function formatRangeText(min?: number, max?: number, unit = '') {
  const hasMin = typeof min === 'number' && Number.isFinite(min)
  const hasMax = typeof max === 'number' && Number.isFinite(max)

  if (hasMin && hasMax) {
    if (Number(min) === Number(max)) return `${min}${unit}`
    return `${min}-${max}${unit}`
  }

  if (hasMin) return `${min}${unit}`
  if (hasMax) return `${max}${unit}`
  return '--'
}

function formatPercent(v?: number) {
  if (typeof v !== 'number' || Number.isNaN(v)) return '--'
  return `${v.toFixed(2)}%`
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

function resolveImageUrl(url?: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `http://localhost:8081${url}`
}

function cleanParams(obj: Record<string, any>) {
  const out: Record<string, any> = {}
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    if (typeof v === 'string' && v.trim() === '') return
    out[k] = v
  })
  return out
}

function resolveSortParams(sortType: SortType) {
  switch (sortType) {
    case 'sales':
      return { sortBy: 'SALES', sortOrder: 'DESC' }
    case 'priceAsc':
      return { sortBy: 'PRICE', sortOrder: 'ASC' }
    case 'priceDesc':
      return { sortBy: 'PRICE', sortOrder: 'DESC' }
    case 'newest':
      return { sortBy: 'NEW', sortOrder: 'DESC' }
    case 'default':
    default:
      return { sortBy: 'NEW', sortOrder: 'DESC' }
  }
}

function buildPageList(current: number, total: number) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total]
  }

  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  }

  return [1, '...', current - 1, current, current + 1, '...', total]
}

function isInvalidRange(min?: string, max?: string) {
  const minNum = toNumberOrUndefined(min || '')
  const maxNum = toNumberOrUndefined(max || '')
  if (minNum === undefined || maxNum === undefined) return false
  return minNum > maxNum
}

function renderHighlightedText(text: string | undefined, keyword: string) {
  const content = String(text || '')
  const trimmed = String(keyword || '').trim()

  if (!trimmed) return content
  if (!content) return content

  const safeKeyword = escapeRegExp(trimmed)
  const reg = new RegExp(`(${safeKeyword})`, 'gi')
  const parts = content.split(reg)

  return parts.map((part, index) => {
    if (part.toLowerCase() === trimmed.toLowerCase()) {
      return (
        <mark key={`${part}_${index}`} style={highlightMarkStyle}>
          {part}
        </mark>
      )
    }
    return <React.Fragment key={`${part}_${index}`}>{part}</React.Fragment>
  })
}

function compareFieldValues(
  products: ProductCompareItem[],
  getter: (item: ProductCompareItem) => string
) {
  const values = products.map((item) => getter(item).trim())
  const validValues = values.filter(Boolean)
  if (validValues.length <= 1) return false
  return new Set(validValues).size > 1
}

function blurActiveTarget(target?: EventTarget | null) {
  if (target && target instanceof HTMLElement) {
    target.blur()
    return
  }

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

export default function SearchResultPage({
  initialKeyword = '',
  savedState,
  onStateChange,
  onOpenDetail,
  onBackToAllProducts,
}: Props) {
  const restoredRef = useRef(false)

  const initState = useMemo(() => {
    const base = {
      ...defaultSavedState,
      ...(savedState || {}),
    }

    if (!base.keyword && initialKeyword) {
      base.keyword = initialKeyword
    }
    return base
  }, [savedState, initialKeyword])

  const [keyword, setKeyword] = useState(initState.keyword)
  const [minPrice, setMinPrice] = useState(initState.minPrice)
  const [maxPrice, setMaxPrice] = useState(initState.maxPrice)
  const [sortType, setSortType] = useState<SortType>(initState.sortType)
  const [onlyInStock, setOnlyInStock] = useState(initState.onlyInStock)
  const [fitType, setFitType] = useState<FitType>(initState.fitType)
  const [colorFamily, setColorFamily] = useState<ColorFamilyType>(
    initState.colorFamily
  )
  const [sizeType, setSizeType] = useState<SizeType>(initState.sizeType)
  const [waistMin, setWaistMin] = useState(initState.waistMin)
  const [waistMax, setWaistMax] = useState(initState.waistMax)
  const [lengthMin, setLengthMin] = useState(initState.lengthMin)
  const [lengthMax, setLengthMax] = useState(initState.lengthMax)
  const [pageNo, setPageNo] = useState<number>(initState.pageNo || 1)

  const [priceOpen, setPriceOpen] = useState(true)
  const [propertyOpen, setPropertyOpen] = useState(true)
  const [bodyOpen, setBodyOpen] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>(
    initState.viewMode || 'grid'
  )

  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [total, setTotal] = useState(0)
  const [searched, setSearched] = useState(false)
  const [pageReady, setPageReady] = useState(
    Number(savedState?.scrollY || 0) <= 0
  )

  const [searchHistory, setSearchHistory] = useState<string[]>(() =>
    loadSearchHistory()
  )
  const [compareIds, setCompareIds] = useState<Array<string | number>>(
    Array.isArray((initState as any).compareIds)
      ? (initState as any).compareIds
      : []
  )
  const [compareOpen, setCompareOpen] = useState<boolean>(
    Boolean((initState as any).compareOpen)
  )
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareProducts, setCompareProducts] = useState<ProductCompareItem[]>(
    []
  )
  const [hoveredCardId, setHoveredCardId] = useState<string | number | null>(
    null
  )
  const [hoveredListId, setHoveredListId] = useState<string | number | null>(
    null
  )

  const pageSize = 20
  const trimmedKeyword = String(keyword || '').trim()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const showPagination = searched && totalPages > 1

  const invalidPriceRange = isInvalidRange(minPrice, maxPrice)
  const invalidWaistRange = isInvalidRange(waistMin, waistMax)
  const invalidLengthRange = isInvalidRange(lengthMin, lengthMax)

  function emitState(partial?: Partial<SearchPageState>) {
    if (!onStateChange) return
    onStateChange({
      keyword: String(keyword || '').trim(),
      minPrice,
      maxPrice,
      sortType,
      onlyInStock,
      fitType,
      colorFamily,
      sizeType,
      waistMin,
      waistMax,
      lengthMin,
      lengthMax,
      pageNo,
      scrollY: window.scrollY,
      viewMode,
      compareIds,
      compareOpen,
      ...(partial || {}),
    })
  }

  const resultSummaryText = useMemo(() => {
    if (!searched) return '正在准备搜索结果'
    if (loading) return '正在加载...'
    if (!trimmedKeyword) return `共找到 ${total} 个商品`
    return `共找到 ${total} 个与“${trimmedKeyword}”相关的商品`
  }, [searched, loading, total, trimmedKeyword])

  const pageSummaryText = useMemo(() => {
    if (!searched || total <= 0) return '当前暂无结果'
    const start = (pageNo - 1) * pageSize + 1
    const end = Math.min(pageNo * pageSize, total)
    return `当前第 ${pageNo} 页，展示第 ${start}-${end} 个结果`
  }, [searched, total, pageNo])

  const selectedFilters = useMemo(() => {
    const arr: string[] = []

    if (trimmedKeyword) arr.push(`关键词：${trimmedKeyword}`)
    if (minPrice || maxPrice) {
      arr.push(`价格：${minPrice || '不限'} - ${maxPrice || '不限'}`)
    }
    if (onlyInStock) arr.push('只看有货')
    if (fitType) arr.push(`版型：${fitType}`)
    if (colorFamily) arr.push(`颜色：${colorFamily}`)
    if (sizeType) arr.push(`尺码：${sizeType}`)
    if (waistMin || waistMax) {
      arr.push(`腰围：${waistMin || '不限'} - ${waistMax || '不限'} cm`)
    }
    if (lengthMin || lengthMax) {
      arr.push(`裤长：${lengthMin || '不限'} - ${lengthMax || '不限'} cm`)
    }

    if (sortType === 'default') arr.push('排序：综合')
    if (sortType === 'sales') arr.push('排序：销量优先')
    if (sortType === 'priceAsc') arr.push('排序：价格低到高')
    if (sortType === 'priceDesc') arr.push('排序：价格高到低')
    if (sortType === 'newest') arr.push('排序：最新上架')

    return arr
  }, [
    trimmedKeyword,
    minPrice,
    maxPrice,
    onlyInStock,
    fitType,
    colorFamily,
    sizeType,
    waistMin,
    waistMax,
    lengthMin,
    lengthMax,
    sortType,
  ])

  useEffect(() => {
    let cancelled = false

    async function loadCompareData() {
      if (!compareIds.length) {
        setCompareProducts([])
        setCompareLoading(false)
        return
      }

      setCompareLoading(true)
      try {
        const data = await getProductCompare(compareIds)
        if (!cancelled && Array.isArray(data)) {
          setCompareProducts(data)
        }
      } catch {
        // 保留旧数据，避免对比区高度塌陷导致页面跳动
      } finally {
        if (!cancelled) {
          setCompareLoading(false)
        }
      }
    }

    loadCompareData()

    return () => {
      cancelled = true
    }
  }, [compareIds])

  const displayedCompareProducts = useMemo(() => {
    if (!compareIds.length || !compareProducts.length) return []

    const map = new Map(
      compareProducts.map((item) => [String(item.id), item] as const)
    )

    return compareIds
      .map((id) => map.get(String(id)))
      .filter(Boolean) as ProductCompareItem[]
  }, [compareIds, compareProducts])

  const canCompare = displayedCompareProducts.length >= 2

  async function loadProducts(
    nextKeyword?: string,
    nextPageNo?: number,
    override?: {
      minPrice?: string
      maxPrice?: string
      sortType?: SortType
      onlyInStock?: boolean
      fitType?: FitType
      colorFamily?: ColorFamilyType
      sizeType?: SizeType
      waistMin?: string
      waistMax?: string
      lengthMin?: string
      lengthMax?: string
    }
  ) {
    const realKeyword = String(nextKeyword ?? keyword).trim()
    const realPageNo = Number(nextPageNo ?? pageNo) || 1
    const realMinPrice = override?.minPrice ?? minPrice
    const realMaxPrice = override?.maxPrice ?? maxPrice
    const realSortType = override?.sortType ?? sortType
    const realOnlyInStock = override?.onlyInStock ?? onlyInStock
    const realFitType = override?.fitType ?? fitType
    const realColorFamily = override?.colorFamily ?? colorFamily
    const realSizeType = override?.sizeType ?? sizeType
    const realWaistMin = override?.waistMin ?? waistMin
    const realWaistMax = override?.waistMax ?? waistMax
    const realLengthMin = override?.lengthMin ?? lengthMin
    const realLengthMax = override?.lengthMax ?? lengthMax
    const sortParams = resolveSortParams(realSortType)

    if (isInvalidRange(realMinPrice, realMaxPrice)) {
      alert('价格区间填写不合法：最低价不能大于最高价')
      return
    }

    if (isInvalidRange(realWaistMin, realWaistMax)) {
      alert('腰围区间填写不合法：最小值不能大于最大值')
      return
    }

    if (isInvalidRange(realLengthMin, realLengthMax)) {
      alert('裤长区间填写不合法：最小值不能大于最大值')
      return
    }

    if (!realKeyword) {
      setProducts([])
      setTotal(0)
      setSearched(false)
      setPageNo(1)
      setPageReady(true)
      emitState({
        keyword: '',
        pageNo: 1,
      })
      return
    }

    setLoading(true)
    try {
      const params = cleanParams({
        pageNo: realPageNo,
        pageSize,
        keyword: realKeyword,
        minPrice: toNumberOrUndefined(realMinPrice),
        maxPrice: toNumberOrUndefined(realMaxPrice),
        onlyInStock: realOnlyInStock ? true : undefined,
        fitType: realFitType,
        colorFamily: realColorFamily,
        size: realSizeType,
        waistMin: toNumberOrUndefined(realWaistMin),
        waistMax: toNumberOrUndefined(realWaistMax),
        lengthMin: toNumberOrUndefined(realLengthMin),
        lengthMax: toNumberOrUndefined(realLengthMax),
        sortBy: sortParams.sortBy,
        sortOrder: sortParams.sortOrder,
      })

      const data = await getProductList(params)
      const nextList = Array.isArray(data.list) ? data.list : []
      setProducts(nextList)
      setTotal(Number(data.total || 0))
      setSearched(true)
      setPageNo(realPageNo)

      if (onStateChange) {
        onStateChange({
          keyword: realKeyword,
          minPrice: realMinPrice,
          maxPrice: realMaxPrice,
          sortType: realSortType,
          onlyInStock: realOnlyInStock,
          fitType: realFitType,
          colorFamily: realColorFamily,
          sizeType: realSizeType,
          waistMin: realWaistMin,
          waistMax: realWaistMax,
          lengthMin: realLengthMin,
          lengthMax: realLengthMax,
          pageNo: realPageNo,
          scrollY: savedState?.scrollY || window.scrollY,
          viewMode,
          compareIds,
          compareOpen,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  function handleSearch() {
    const nextKeyword = String(keyword || '').trim()
    if (!nextKeyword) {
      alert('请输入商品关键词')
      return
    }

    saveSearchHistoryKeyword(nextKeyword)
    setSearchHistory(loadSearchHistory())
    setPageReady(true)
    loadProducts(nextKeyword, 1)
  }

  function handleQuickSearch(nextKeyword: string) {
    const text = String(nextKeyword || '').trim()
    if (!text) return

    setKeyword(text)
    saveSearchHistoryKeyword(text)
    setSearchHistory(loadSearchHistory())
    setPageReady(true)
    loadProducts(text, 1)
  }

  function handleRemoveHistory(item: string) {
    const next = loadSearchHistory().filter((x) => x !== item)
    setSearchHistory(next)
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  function handleClearHistory() {
    clearSearchHistoryStorage()
    setSearchHistory([])
  }

  function toggleCompare(
    spuId?: string | number,
    event?: React.MouseEvent<HTMLButtonElement>
  ) {
    const raw = String(spuId || '').trim()
    if (!raw) return

    blurActiveTarget(event?.currentTarget)

    setCompareIds((prev) => {
      const exists = prev.some((id) => String(id) === raw)
      let nextIds = prev

      if (exists) {
        nextIds = prev.filter((id) => String(id) !== raw)
      } else {
        if (prev.length >= 3) {
          alert('最多只能对比 3 个商品')
          return prev
        }
        nextIds = [...prev, raw]
      }

      const nextOpen = nextIds.length > 0 ? compareOpen : false

      if (nextIds.length === 0) {
        setCompareOpen(false)
      }

      emitState({
        compareIds: nextIds,
        compareOpen: nextOpen,
        scrollY: window.scrollY,
      })

      return nextIds
    })
  }

  function resetFilters() {
    const nextKeyword = String(keyword || '').trim()

    setMinPrice('')
    setMaxPrice('')
    setSortType('default')
    setOnlyInStock(false)
    setFitType('')
    setColorFamily('')
    setSizeType('')
    setWaistMin('')
    setWaistMax('')
    setLengthMin('')
    setLengthMax('')

    if (!nextKeyword) {
      setProducts([])
      setTotal(0)
      setSearched(false)
      setPageNo(1)
      setPageReady(true)
      emitState({
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
      })
      return
    }

    setPageReady(true)
    loadProducts(nextKeyword, 1, {
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
    })
  }

  function clearPriceGroup() {
    setMinPrice('')
    setMaxPrice('')
    if (!trimmedKeyword) return
    setPageReady(true)
    loadProducts(trimmedKeyword, 1, {
      minPrice: '',
      maxPrice: '',
    })
  }

  function clearPropertyGroup() {
    setOnlyInStock(false)
    setFitType('')
    setColorFamily('')
    setSizeType('')
    if (!trimmedKeyword) return
    setPageReady(true)
    loadProducts(trimmedKeyword, 1, {
      onlyInStock: false,
      fitType: '',
      colorFamily: '',
      sizeType: '',
    })
  }

  function clearBodyGroup() {
    setWaistMin('')
    setWaistMax('')
    setLengthMin('')
    setLengthMax('')
    if (!trimmedKeyword) return
    setPageReady(true)
    loadProducts(trimmedKeyword, 1, {
      waistMin: '',
      waistMax: '',
      lengthMin: '',
      lengthMax: '',
    })
  }

  function handleOpenDetail(spuId?: string | number) {
    const raw = String(spuId || '').trim()
    if (!raw || !/^\d+$/.test(raw)) {
      alert('spuId 不存在')
      return
    }

    emitState({
      scrollY: window.scrollY,
      viewMode,
      compareIds,
      compareOpen,
    })

    if (onOpenDetail) {
      onOpenDetail(raw)
    } else {
      alert(`当前商品 spuId = ${raw}`)
    }
  }

  function handleSortChange(nextSortType: SortType) {
    setSortType(nextSortType)
    if (!trimmedKeyword) return
    setPageReady(true)
    loadProducts(trimmedKeyword, 1, {
      sortType: nextSortType,
    })
  }

  function handleOnlyInStockChange(nextValue: boolean) {
    setOnlyInStock(nextValue)
    if (!trimmedKeyword) return
    setPageReady(true)
    loadProducts(trimmedKeyword, 1, {
      onlyInStock: nextValue,
    })
  }

  function handleFitTypeChange(nextValue: FitType) {
    setFitType(nextValue)
    if (!trimmedKeyword) return
    setPageReady(true)
    loadProducts(trimmedKeyword, 1, {
      fitType: nextValue,
    })
  }

  function handleColorFamilyChange(nextValue: ColorFamilyType) {
    setColorFamily(nextValue)
    if (!trimmedKeyword) return
    setPageReady(true)
    loadProducts(trimmedKeyword, 1, {
      colorFamily: nextValue,
    })
  }

  function handleSizeChange(nextValue: SizeType) {
    setSizeType(nextValue)
    if (!trimmedKeyword) return
    setPageReady(true)
    loadProducts(trimmedKeyword, 1, {
      sizeType: nextValue,
    })
  }

  function handleApplyPriceFilter() {
    if (!trimmedKeyword) {
      alert('请输入商品关键词')
      return
    }
    setPageReady(true)
    loadProducts(trimmedKeyword, 1)
  }

  function handleApplyBodyFilter() {
    if (!trimmedKeyword) {
      alert('请输入商品关键词')
      return
    }
    setPageReady(true)
    loadProducts(trimmedKeyword, 1)
  }

  function applyPricePreset(min: string, max: string) {
    setMinPrice(min)
    setMaxPrice(max)
    if (!trimmedKeyword) return
    setPageReady(true)
    loadProducts(trimmedKeyword, 1, {
      minPrice: min,
      maxPrice: max,
    })
  }

  function applyWaistPreset(min: string, max: string) {
    setWaistMin(min)
    setWaistMax(max)
    if (!trimmedKeyword) return
    setPageReady(true)
    loadProducts(trimmedKeyword, 1, {
      waistMin: min,
      waistMax: max,
    })
  }

  function applyLengthPreset(min: string, max: string) {
    setLengthMin(min)
    setLengthMax(max)
    if (!trimmedKeyword) return
    setPageReady(true)
    loadProducts(trimmedKeyword, 1, {
      lengthMin: min,
      lengthMax: max,
    })
  }

  function handlePageChange(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || loading) return
    setPageReady(true)
    loadProducts(trimmedKeyword, nextPage)
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function handleViewModeChange(nextMode: ViewMode) {
    setViewMode(nextMode)
    if (!onStateChange) return
    onStateChange({
      keyword: String(keyword || '').trim(),
      minPrice,
      maxPrice,
      sortType,
      onlyInStock,
      fitType,
      colorFamily,
      sizeType,
      waistMin,
      waistMax,
      lengthMin,
      lengthMax,
      pageNo,
      scrollY: window.scrollY,
      viewMode: nextMode,
      compareIds,
      compareOpen,
    } as any)
  }

  function removeSelectedFilter(label: string) {
    if (label.startsWith('价格：')) {
      setMinPrice('')
      setMaxPrice('')
      if (trimmedKeyword) {
        setPageReady(true)
        loadProducts(trimmedKeyword, 1, {
          minPrice: '',
          maxPrice: '',
        })
      }
      return
    }

    if (label.startsWith('腰围：')) {
      setWaistMin('')
      setWaistMax('')
      if (trimmedKeyword) {
        setPageReady(true)
        loadProducts(trimmedKeyword, 1, {
          waistMin: '',
          waistMax: '',
        })
      }
      return
    }

    if (label.startsWith('裤长：')) {
      setLengthMin('')
      setLengthMax('')
      if (trimmedKeyword) {
        setPageReady(true)
        loadProducts(trimmedKeyword, 1, {
          lengthMin: '',
          lengthMax: '',
        })
      }
      return
    }

    if (label === '只看有货') {
      handleOnlyInStockChange(false)
      return
    }

    if (label.startsWith('版型：')) {
      handleFitTypeChange('')
      return
    }

    if (label.startsWith('颜色：')) {
      handleColorFamilyChange('')
      return
    }

    if (label.startsWith('尺码：')) {
      handleSizeChange('')
      return
    }

    if (label.startsWith('排序：')) {
      setSortType('default')
      if (trimmedKeyword) handleSortChange('default')
      return
    }
  }

  useEffect(() => {
    const finalKeyword = String(initState.keyword || '').trim()

    if (finalKeyword) {
      loadProducts(finalKeyword, initState.pageNo || 1, {
        minPrice: initState.minPrice || '',
        maxPrice: initState.maxPrice || '',
        sortType: initState.sortType || 'default',
        onlyInStock: Boolean(initState.onlyInStock),
        fitType: initState.fitType || '',
        colorFamily: initState.colorFamily || '',
        sizeType: initState.sizeType || '',
        waistMin: initState.waistMin || '',
        waistMax: initState.waistMax || '',
        lengthMin: initState.lengthMin || '',
        lengthMax: initState.lengthMax || '',
      })
    } else {
      setProducts([])
      setTotal(0)
      setSearched(false)
      setPageNo(1)
      setPageReady(true)
    }

    restoredRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!savedState?.viewMode) return
    setViewMode(savedState.viewMode)
  }, [savedState?.viewMode])

  useEffect(() => {
    const nextIds = Array.isArray(savedState?.compareIds)
      ? (savedState.compareIds as Array<string | number>)
      : []
    setCompareIds(nextIds)
  }, [savedState])

  useEffect(() => {
    setCompareOpen(Boolean(savedState?.compareOpen))
  }, [savedState])

  useLayoutEffect(() => {
    if (!searched || loading || restoredRef.current) return

    const y = Number(savedState?.scrollY || 0)
    const savedCompareOpen = Boolean(savedState?.compareOpen)
    const savedCompareIds = Array.isArray(savedState?.compareIds)
      ? (savedState.compareIds as Array<string | number>)
      : []

    const needWaitCompare = savedCompareOpen && savedCompareIds.length > 0

    if (needWaitCompare) {
      if (compareLoading) return
      if (displayedCompareProducts.length === 0) return
    }

    if (y <= 0) {
      restoredRef.current = true
      setPageReady(true)
      return
    }

    restoredRef.current = true

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: y,
          behavior: 'auto',
        })

        setTimeout(() => {
          window.scrollTo({
            top: y,
            behavior: 'auto',
          })
          setPageReady(true)
        }, 0)
      })
    })
  }, [
    searched,
    loading,
    products.length,
    savedState?.scrollY,
    compareOpen,
    compareLoading,
    displayedCompareProducts.length,
    compareIds.length,
    savedState,
  ])

  const pageList = buildPageList(pageNo, totalPages)

  const comparePriceDifferent = compareFieldValues(displayedCompareProducts, (item) =>
    formatPriceRange(item.minPrice, item.maxPrice)
  )
  const compareSalesDifferent = compareFieldValues(displayedCompareProducts, (item) =>
    String(item.sales ?? '-')
  )
  const compareStockDifferent = compareFieldValues(displayedCompareProducts, (item) =>
    String(item.totalStock ?? '-')
  )
  const compareInStockDifferent = compareFieldValues(displayedCompareProducts, (item) =>
    item.inStock ? '有货' : '无货'
  )
  const compareColorsDifferent = compareFieldValues(displayedCompareProducts, (item) =>
    Array.isArray(item.colors) && item.colors.length > 0
      ? item.colors.join(' / ')
      : '--'
  )
  const compareSizesDifferent = compareFieldValues(displayedCompareProducts, (item) =>
    Array.isArray(item.sizes) && item.sizes.length > 0
      ? item.sizes.join(' / ')
      : '--'
  )
  const compareFitsDifferent = compareFieldValues(displayedCompareProducts, (item) =>
    Array.isArray(item.fitTypes) && item.fitTypes.length > 0
      ? item.fitTypes.join(' / ')
      : '--'
  )
  const compareWaistDifferent = compareFieldValues(displayedCompareProducts, (item) =>
    formatRangeText(item.minWaistCm, item.maxWaistCm, 'cm')
  )
  const compareLengthDifferent = compareFieldValues(displayedCompareProducts, (item) =>
    formatRangeText(item.minLengthCm, item.maxLengthCm, 'cm')
  )
  const compareLegOpeningDifferent = compareFieldValues(
    displayedCompareProducts,
    (item) => formatRangeText(item.minLegOpeningCm, item.maxLegOpeningCm, 'cm')
  )
  const compareRatingDifferent = compareFieldValues(displayedCompareProducts, (item) =>
    typeof item.avgRating === 'number' ? item.avgRating.toFixed(2) : '--'
  )
  const compareReviewCountDifferent = compareFieldValues(
    displayedCompareProducts,
    (item) => String(item.reviewCount ?? 0)
  )
  const compareGoodReviewCountDifferent = compareFieldValues(
    displayedCompareProducts,
    (item) => String(item.goodReviewCount ?? 0)
  )
  const compareGoodRateDifferent = compareFieldValues(displayedCompareProducts, (item) =>
    formatPercent(item.goodReviewRate)
  )

  return (
    <div
      style={{
        ...pageStyle,
        visibility: pageReady ? 'visible' : 'hidden',
        minHeight: '100vh',
      }}
    >
      <section style={resultHeaderStyle}>
        <div style={resultHeaderLeftStyle}>
          <div style={headerKickerStyle}>SEARCH RESULTS</div>
          <h1 style={headerTitleStyle}>搜索结果</h1>
          <div style={headerDescStyle}>
            {trimmedKeyword ? (
              <>
                正在搜索关键词：
                <span style={keywordHighlightStyle}>“{trimmedKeyword}”</span>
              </>
            ) : (
              '请输入商品关键词开始搜索'
            )}
          </div>

          <div style={headerMetaRowStyle}>
            <span style={metaPillStyle}>{resultSummaryText}</span>
            <span style={metaPillStyle}>{pageSummaryText}</span>
            {searched && total > 0 ? (
              <span style={metaPillStyle}>
                每页 {pageSize} 条 · 第 {pageNo}/{totalPages} 页
              </span>
            ) : null}
          </div>
        </div>

        <div style={resultHeaderRightStyle}>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>总匹配数</div>
            <div style={statValueStyle}>{total}</div>
            <div style={statDescStyle}>当前条件下全部匹配商品</div>
          </div>

          <div style={statCardStyle}>
            <div style={statLabelStyle}>本页展示</div>
            <div style={statValueStyle}>{products.length}</div>
            <div style={statDescStyle}>当前页实际展示商品数</div>
          </div>
        </div>
      </section>

      <section style={filterPanelStyle}>
        <div style={filterTopBarStyle}>
          <div>
            <div style={panelKickerStyle}>SEARCH</div>
            <h2 style={panelTitleStyle}>搜索与筛选</h2>
          </div>

          <div style={topActionRowStyle}>
            <button onClick={handleSearch} style={primaryBtnStyle}>
              {loading ? '搜索中...' : '搜索商品'}
            </button>
            <button onClick={resetFilters} style={ghostBtnStyle}>
              重置筛选
            </button>
            <button onClick={onBackToAllProducts} style={ghostBtnStyle}>
              返回全部商品
            </button>
          </div>
        </div>

        <div style={searchBarRowStyle}>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入商品关键词，例如：牛仔裤 / 直筒 / 高腰 / 藏青"
            style={searchInputStyle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch()
              }
            }}
          />
          <button onClick={handleSearch} style={searchBtnLargeStyle}>
            {loading ? '搜索中...' : '立即搜索'}
          </button>
        </div>

        <div style={assistSectionStyle}>
          <div style={assistBlockStyle}>
            <div style={assistHeadStyle}>
              <div>
                <div style={assistTitleStyle}>热门搜索</div>
                <div style={assistDescStyle}>快速进入常见裤装搜索场景</div>
              </div>
            </div>
            <div style={assistTagWrapStyle}>
              {HOT_SEARCHES.map((item) => (
                <button
                  key={item}
                  type="button"
                  style={assistTagBtnStyle}
                  onClick={() => handleQuickSearch(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div style={assistBlockStyle}>
            <div style={assistHeadStyle}>
              <div>
                <div style={assistTitleStyle}>搜索历史</div>
                <div style={assistDescStyle}>保留最近搜索，方便继续筛选</div>
              </div>
              {searchHistory.length > 0 ? (
                <button
                  type="button"
                  style={miniGhostBtnStyle}
                  onClick={handleClearHistory}
                >
                  清空历史
                </button>
              ) : null}
            </div>

            {searchHistory.length > 0 ? (
              <div style={historyWrapStyle}>
                {searchHistory.map((item) => (
                  <div key={item} style={historyItemStyle}>
                    <button
                      type="button"
                      style={historyKeywordBtnStyle}
                      onClick={() => handleQuickSearch(item)}
                    >
                      {item}
                    </button>
                    <button
                      type="button"
                      style={historyRemoveBtnStyle}
                      onClick={() => handleRemoveHistory(item)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={assistEmptyStyle}>
                暂时还没有搜索历史，先搜一个关键词试试。
              </div>
            )}
          </div>
        </div>

        <div style={selectedBarStyle}>
          <div style={selectedTopRowStyle}>
            <div style={selectedBarLabelStyle}>
              已选条件（{selectedFilters.length}）
            </div>
            {selectedFilters.length > 0 ? (
              <button
                type="button"
                style={miniGhostBtnStyle}
                onClick={resetFilters}
              >
                一键清空筛选
              </button>
            ) : null}
          </div>
          <div style={selectedTagWrapStyle}>
            {selectedFilters.map((item) => (
              <button
                key={item}
                type="button"
                style={selectedTagStyle}
                onClick={() => removeSelectedFilter(item)}
              >
                {item} ×
              </button>
            ))}
          </div>
        </div>

        <div style={toolbarStyle}>
          <div style={toolbarLeftStyle}>
            <span style={toolbarInfoPillStyle}>
              {trimmedKeyword ? `关键词：${trimmedKeyword}` : '未输入关键词'}
            </span>
            <span style={toolbarInfoPillStyle}>当前结果：{total}</span>
            <span style={toolbarInfoPillStyle}>
              展示模式：{viewMode === 'grid' ? '卡片' : '列表'}
            </span>
          </div>
          <div style={toolbarRightStyle}>
            <span style={toolbarHintStyle}>
              你可以展开/收起筛选分组，减少页面干扰
            </span>
          </div>
        </div>

        <FilterSection
          title="价格筛选"
          desc="按价格范围快速过滤当前搜索结果。"
          open={priceOpen}
          onToggle={() => setPriceOpen((v) => !v)}
          onClear={clearPriceGroup}
        >
          <div style={priceInputRowStyle}>
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="最低价，如 99"
              style={filterInputStyle}
            />
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="最高价，如 299"
              style={filterInputStyle}
            />
            <button onClick={handleApplyPriceFilter} style={ghostBtnStyle}>
              应用价格筛选
            </button>
          </div>
          <div style={presetWrapStyle}>
            {PRICE_PRESETS.map((item) => (
              <button
                key={item.label}
                type="button"
                style={presetBtnStyle}
                onClick={() => applyPricePreset(item.min, item.max)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {invalidPriceRange ? (
            <div style={warningTextStyle}>最低价不能大于最高价</div>
          ) : null}
        </FilterSection>

        <FilterSection
          title="裤装属性"
          desc="版型、颜色族、尺码、是否有货都在这里集中控制。"
          open={propertyOpen}
          onToggle={() => setPropertyOpen((v) => !v)}
          onClear={clearPropertyGroup}
        >
          <div style={propertyWrapStyle}>
            <div style={propertyBlockStyle}>
              <div style={propertyLabelStyle}>版型</div>
              <div style={propertyTagWrapStyle}>
                <PropertyBtn
                  active={fitType === ''}
                  onClick={() => handleFitTypeChange('')}
                >
                  不限
                </PropertyBtn>
                <PropertyBtn
                  active={fitType === '直筒'}
                  onClick={() => handleFitTypeChange('直筒')}
                >
                  直筒
                </PropertyBtn>
                <PropertyBtn
                  active={fitType === '修身'}
                  onClick={() => handleFitTypeChange('修身')}
                >
                  修身
                </PropertyBtn>
                <PropertyBtn
                  active={fitType === '宽松'}
                  onClick={() => handleFitTypeChange('宽松')}
                >
                  宽松
                </PropertyBtn>
              </div>
            </div>

            <div style={propertyBlockStyle}>
              <div style={propertyLabelStyle}>颜色</div>
              <div style={propertyTagWrapStyle}>
                <PropertyBtn
                  active={colorFamily === ''}
                  onClick={() => handleColorFamilyChange('')}
                >
                  不限
                </PropertyBtn>
                <PropertyBtn
                  active={colorFamily === '黑色系'}
                  onClick={() => handleColorFamilyChange('黑色系')}
                >
                  黑色系
                </PropertyBtn>
                <PropertyBtn
                  active={colorFamily === '灰色系'}
                  onClick={() => handleColorFamilyChange('灰色系')}
                >
                  灰色系
                </PropertyBtn>
                <PropertyBtn
                  active={colorFamily === '白色系'}
                  onClick={() => handleColorFamilyChange('白色系')}
                >
                  白色系
                </PropertyBtn>
                <PropertyBtn
                  active={colorFamily === '蓝色系'}
                  onClick={() => handleColorFamilyChange('蓝色系')}
                >
                  蓝色系
                </PropertyBtn>
                <PropertyBtn
                  active={colorFamily === '绿色系'}
                  onClick={() => handleColorFamilyChange('绿色系')}
                >
                  绿色系
                </PropertyBtn>
                <PropertyBtn
                  active={colorFamily === '卡其色系'}
                  onClick={() => handleColorFamilyChange('卡其色系')}
                >
                  卡其色系
                </PropertyBtn>
                <PropertyBtn
                  active={colorFamily === '棕色系'}
                  onClick={() => handleColorFamilyChange('棕色系')}
                >
                  棕色系
                </PropertyBtn>
              </div>
            </div>

            <div style={propertyBlockStyle}>
              <div style={propertyLabelStyle}>尺码</div>
              <div style={propertyTagWrapStyle}>
                <PropertyBtn
                  active={sizeType === ''}
                  onClick={() => handleSizeChange('')}
                >
                  不限
                </PropertyBtn>
                {(
                  [
                    'XXS',
                    'XS',
                    'S',
                    'M',
                    'L',
                    'XL',
                    'XXL',
                    'XXXL',
                    'XXXXL',
                    'XXXXXL',
                  ] as SizeType[]
                ).map((item) => (
                  <PropertyBtn
                    key={item}
                    active={sizeType === item}
                    onClick={() => handleSizeChange(item)}
                  >
                    {item}
                  </PropertyBtn>
                ))}
              </div>
            </div>

            <div style={propertyBlockStyle}>
              <div style={propertyLabelStyle}>库存</div>
              <div style={propertyTagWrapStyle}>
                <PropertyBtn
                  active={!onlyInStock}
                  onClick={() => handleOnlyInStockChange(false)}
                >
                  不限
                </PropertyBtn>
                <PropertyBtn
                  active={onlyInStock}
                  onClick={() => handleOnlyInStockChange(true)}
                >
                  只看有货
                </PropertyBtn>
              </div>
            </div>
          </div>
        </FilterSection>

        <FilterSection
          title="身材筛选"
          desc="更适合裤装商城：按腰围与裤长缩小结果范围。"
          open={bodyOpen}
          onToggle={() => setBodyOpen((v) => !v)}
          onClear={clearBodyGroup}
        >
          <div style={advancedFilterGridStyle}>
            <div style={filterCardStyle}>
              <div style={filterCardTitleStyle}>腰围区间（cm）</div>
              <div style={filterCardDescStyle}>
                按 SKU 腰围字段筛选，更适合裤装场景。
              </div>
              <div style={priceInputRowStyle}>
                <input
                  value={waistMin}
                  onChange={(e) => setWaistMin(e.target.value)}
                  placeholder="最小腰围，如 72"
                  style={filterInputStyle}
                />
                <input
                  value={waistMax}
                  onChange={(e) => setWaistMax(e.target.value)}
                  placeholder="最大腰围，如 84"
                  style={filterInputStyle}
                />
              </div>
              <div style={presetWrapStyle}>
                {WAIST_PRESETS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    style={presetBtnStyle}
                    onClick={() => applyWaistPreset(item.min, item.max)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {invalidWaistRange ? (
                <div style={warningTextStyle}>最小腰围不能大于最大腰围</div>
              ) : null}
            </div>

            <div style={filterCardStyle}>
              <div style={filterCardTitleStyle}>裤长区间（cm）</div>
              <div style={filterCardDescStyle}>
                适合长裤、九分裤等更细的裤装选购需求。
              </div>
              <div style={priceInputRowStyle}>
                <input
                  value={lengthMin}
                  onChange={(e) => setLengthMin(e.target.value)}
                  placeholder="最小裤长，如 96"
                  style={filterInputStyle}
                />
                <input
                  value={lengthMax}
                  onChange={(e) => setLengthMax(e.target.value)}
                  placeholder="最大裤长，如 108"
                  style={filterInputStyle}
                />
                <button onClick={handleApplyBodyFilter} style={ghostBtnStyle}>
                  应用身材筛选
                </button>
              </div>
              <div style={presetWrapStyle}>
                {LENGTH_PRESETS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    style={presetBtnStyle}
                    onClick={() => applyLengthPreset(item.min, item.max)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {invalidLengthRange ? (
                <div style={warningTextStyle}>最小裤长不能大于最大裤长</div>
              ) : null}
            </div>
          </div>
        </FilterSection>
      </section>

      <section style={resultHeadStyle}>
        <div>
          <div style={panelKickerStyle}>PRODUCT GRID</div>
          <h2 style={resultTitleStyle}>商品结果</h2>
        </div>

        <div style={resultHeadActionsStyle}>
          <div style={resultCountStyle}>
            {trimmedKeyword
              ? `共找到 ${total} 个与“${trimmedKeyword}”相关的商品`
              : `共找到 ${total} 个商品`}
          </div>

          <div style={sortBarWrapStyle}>
            <button
              type="button"
              style={{
                ...sortChipStyle,
                ...(sortType === 'default' ? activeSortChipStyle : {}),
              }}
              onClick={() => handleSortChange('default')}
            >
              综合
            </button>
            <button
              type="button"
              style={{
                ...sortChipStyle,
                ...(sortType === 'sales' ? activeSortChipStyle : {}),
              }}
              onClick={() => handleSortChange('sales')}
            >
              销量
            </button>
            <button
              type="button"
              style={{
                ...sortChipStyle,
                ...(sortType === 'priceAsc' ? activeSortChipStyle : {}),
              }}
              onClick={() => handleSortChange('priceAsc')}
            >
              价格低到高
            </button>
            <button
              type="button"
              style={{
                ...sortChipStyle,
                ...(sortType === 'priceDesc' ? activeSortChipStyle : {}),
              }}
              onClick={() => handleSortChange('priceDesc')}
            >
              价格高到低
            </button>
            <button
              type="button"
              style={{
                ...sortChipStyle,
                ...(sortType === 'newest' ? activeSortChipStyle : {}),
              }}
              onClick={() => handleSortChange('newest')}
            >
              最新
            </button>
            <button
              type="button"
              style={{
                ...sortChipStyle,
                ...(onlyInStock ? activeSortChipStyle : {}),
              }}
              onClick={() => handleOnlyInStockChange(!onlyInStock)}
            >
              {onlyInStock ? '只看有货中' : '只看有货'}
            </button>
          </div>

          <div style={viewSwitchWrapStyle}>
            <button
              type="button"
              style={{
                ...viewBtnStyle,
                ...(viewMode === 'grid' ? activeViewBtnStyle : {}),
              }}
              onClick={() => handleViewModeChange('grid')}
            >
              卡片视图
            </button>
            <button
              type="button"
              style={{
                ...viewBtnStyle,
                ...(viewMode === 'list' ? activeViewBtnStyle : {}),
              }}
              onClick={() => handleViewModeChange('list')}
            >
              列表视图
            </button>
          </div>

          <button
            type="button"
            style={{
              ...compareEntryBtnStyle,
              ...(compareIds.length > 0 ? activeCompareEntryBtnStyle : {}),
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              blurActiveTarget(e.currentTarget)
              const nextOpen = !compareOpen
              setCompareOpen(nextOpen)
              emitState({
                compareOpen: nextOpen,
                compareIds,
                scrollY: window.scrollY,
              })
            }}
          >
            商品对比（{compareIds.length}）
          </button>
        </div>
      </section>

      {compareOpen ? (
        <section style={comparePanelStyle}>
          <div style={comparePanelHeadStyle}>
            <div>
              <div style={comparePanelTitleStyle}>商品对比</div>
              <div style={comparePanelDescStyle}>
                最多支持 3 个商品横向对比。对比会突出差异项，更适合毕业设计展示功能丰富度。
              </div>
            </div>

            <div style={comparePanelActionStyle}>
              {compareLoading && displayedCompareProducts.length > 0 ? (
                <span style={compareLoadingTextStyle}>正在刷新对比数据...</span>
              ) : null}

              {compareIds.length > 0 ? (
                <button
                  type="button"
                  style={miniGhostBtnStyle}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    blurActiveTarget(e.currentTarget)
                    setCompareIds([])
                    setCompareOpen(false)
                    setCompareProducts([])
                    emitState({
                      compareIds: [],
                      compareOpen: false,
                      scrollY: window.scrollY,
                    })
                  }}
                >
                  清空对比
                </button>
              ) : null}
              <button
                type="button"
                style={miniGhostBtnStyle}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  blurActiveTarget(e.currentTarget)
                  setCompareOpen(false)
                  emitState({
                    compareOpen: false,
                    compareIds,
                    scrollY: window.scrollY,
                  })
                }}
              >
                收起
              </button>
            </div>
          </div>

          {compareIds.length === 0 ? (
            <div style={assistEmptyStyle}>
              还没有加入对比的商品，先在商品卡片里点“加入对比”。
            </div>
          ) : displayedCompareProducts.length === 0 ? (
            <div style={assistEmptyStyle}>对比数据加载中...</div>
          ) : (
            <>
              {!canCompare ? (
                <div style={compareTipStyle}>
                  当前已选 {displayedCompareProducts.length} 个商品，至少选择 2
                  个商品更方便比较。
                </div>
              ) : null}

              <div style={compareTableWrapStyle}>
                <table style={compareTableStyle}>
                  <thead>
                    <tr>
                      <th style={compareThFirstStyle}>对比项</th>
                      {displayedCompareProducts.map((item) => (
                        <th key={String(item.id)} style={compareThStyle}>
                          <div style={compareTableProductHeadStyle}>
                            <div style={compareTableProductNameStyle}>
                              {item.name || '未命名商品'}
                            </div>
                            <div style={compareTableProductSubStyle}>
                              SPU {item.id}
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <CompareRow
                      label="价格区间"
                      products={displayedCompareProducts}
                      different={comparePriceDifferent}
                      renderValue={(item) =>
                        formatPriceRange(item.minPrice, item.maxPrice)
                      }
                    />
                    <CompareRow
                      label="销量"
                      products={displayedCompareProducts}
                      different={compareSalesDifferent}
                      renderValue={(item) => formatOptionalNumber(item.sales)}
                    />
                    <CompareRow
                      label="总库存"
                      products={displayedCompareProducts}
                      different={compareStockDifferent}
                      renderValue={(item) =>
                        typeof item.totalStock === 'number'
                          ? `${item.totalStock} 件`
                          : '--'
                      }
                    />
                    <CompareRow
                      label="是否有货"
                      products={displayedCompareProducts}
                      different={compareInStockDifferent}
                      renderValue={(item) => (item.inStock ? '有货' : '无货')}
                    />
                    <CompareRow
                      label="颜色"
                      products={displayedCompareProducts}
                      different={compareColorsDifferent}
                      renderValue={(item) =>
                        Array.isArray(item.colors) && item.colors.length > 0
                          ? item.colors.join(' / ')
                          : '--'
                      }
                    />
                    <CompareRow
                      label="尺码"
                      products={displayedCompareProducts}
                      different={compareSizesDifferent}
                      renderValue={(item) =>
                        Array.isArray(item.sizes) && item.sizes.length > 0
                          ? item.sizes.join(' / ')
                          : '--'
                      }
                    />
                    <CompareRow
                      label="版型"
                      products={displayedCompareProducts}
                      different={compareFitsDifferent}
                      renderValue={(item) =>
                        Array.isArray(item.fitTypes) && item.fitTypes.length > 0
                          ? item.fitTypes.join(' / ')
                          : '--'
                      }
                    />
                    <CompareRow
                      label="腰围范围"
                      products={displayedCompareProducts}
                      different={compareWaistDifferent}
                      renderValue={(item) =>
                        formatRangeText(item.minWaistCm, item.maxWaistCm, 'cm')
                      }
                    />
                    <CompareRow
                      label="裤长范围"
                      products={displayedCompareProducts}
                      different={compareLengthDifferent}
                      renderValue={(item) =>
                        formatRangeText(item.minLengthCm, item.maxLengthCm, 'cm')
                      }
                    />
                    <CompareRow
                      label="裤脚口范围"
                      products={displayedCompareProducts}
                      different={compareLegOpeningDifferent}
                      renderValue={(item) =>
                        formatRangeText(
                          item.minLegOpeningCm,
                          item.maxLegOpeningCm,
                          'cm'
                        )
                      }
                    />
                    <CompareRow
                      label="平均评分"
                      products={displayedCompareProducts}
                      different={compareRatingDifferent}
                      renderValue={(item) =>
                        typeof item.avgRating === 'number'
                          ? item.avgRating.toFixed(2)
                          : '--'
                      }
                    />
                    <CompareRow
                      label="评价数"
                      products={displayedCompareProducts}
                      different={compareReviewCountDifferent}
                      renderValue={(item) => String(item.reviewCount ?? 0)}
                    />
                    <CompareRow
                      label="好评数"
                      products={displayedCompareProducts}
                      different={compareGoodReviewCountDifferent}
                      renderValue={(item) => String(item.goodReviewCount ?? 0)}
                    />
                    <CompareRow
                      label="好评率"
                      products={displayedCompareProducts}
                      different={compareGoodRateDifferent}
                      renderValue={(item) => formatPercent(item.goodReviewRate)}
                    />
                    <tr>
                      <td style={compareLabelTdStyle}>操作</td>
                      {displayedCompareProducts.map((item) => (
                        <td key={String(item.id)} style={compareValueTdStyle}>
                          <div style={compareActionCellStyle}>
                            <button
                              type="button"
                              style={compareBtnStyle}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => toggleCompare(item.id, e)}
                            >
                              移出对比
                            </button>
                            <button
                              type="button"
                              style={detailBtnStyle}
                              onClick={() => handleOpenDetail(item.id)}
                            >
                              查看详情
                            </button>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : null}

      {!searched ? (
        <div style={emptyCardStyle}>
          <div style={emptyTitleStyle}>正在准备搜索结果</div>
          <div style={emptySubStyle}>
            系统会根据你从顶部带入的关键词加载商品列表。
          </div>
        </div>
      ) : products.length === 0 ? (
        <div style={emptyCardStyle}>
          <div style={emptyTitleStyle}>
            {trimmedKeyword
              ? `没有找到与“${trimmedKeyword}”相关的商品`
              : '没有找到匹配商品'}
          </div>
          <div style={emptySubStyle}>
            建议尝试更短的关键词，或者减少筛选条件后重新搜索。
          </div>

          <div style={emptyActionRowStyle}>
            <button onClick={handleSearch} style={primaryBtnStyle}>
              重新搜索
            </button>
            <button onClick={resetFilters} style={ghostBtnStyle}>
              清空筛选重试
            </button>
            <button onClick={onBackToAllProducts} style={ghostBtnStyle}>
              返回全部商品
            </button>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div style={cardGridStyle}>
              {products.map((x, idx) => {
                const imageUrl = resolveImageUrl(x.coverUrl)
                const compared = compareIds.some(
                  (id) => String(id) === String(x.id)
                )
                const hovered = String(hoveredCardId) === String(x.id)

                return (
                  <div
                    key={`${x.id ?? idx}`}
                    style={{
                      ...cardStyle,
                      transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
                      boxShadow: hovered
                        ? '0 24px 54px rgba(15,23,42,0.12)'
                        : cardStyle.boxShadow,
                      border: hovered
                        ? '1px solid rgba(234,88,12,0.18)'
                        : cardStyle.border,
                    }}
                    onMouseEnter={() => setHoveredCardId(x.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                  >
                    <div style={cardHoverWrapStyle}>
                      <div style={thumbStyle}>
                        {imageUrl ? (
                          <div style={thumbImageWrapStyle}>
                            <img
                              src={imageUrl}
                              alt={x.name || '商品图片'}
                              style={{
                                ...thumbImageStyle,
                                transform: hovered ? 'scale(1.05)' : 'scale(1)',
                              }}
                            />

                            <div style={thumbOverlayTopStyle}>
                              <span style={thumbBadgeStyle}>PANTS</span>
                              <div style={thumbOverlayRightStyle}>
                                <span style={stockPillStyle}>
                                  库存 {x.totalStock ?? '-'}
                                </span>
                                <span style={salesPillStyle}>
                                  {resolveSalesLevel(x.sales)} · 销量{' '}
                                  {formatSales(x.sales)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={thumbTopRowStyle}>
                              <span style={thumbBadgeStyle}>PANTS</span>
                              <div style={thumbOverlayRightStyle}>
                                <span style={stockPillStyle}>
                                  库存 {x.totalStock ?? '-'}
                                </span>
                                <span style={salesPillStyle}>
                                  {resolveSalesLevel(x.sales)} · 销量{' '}
                                  {formatSales(x.sales)}
                                </span>
                              </div>
                            </div>

                            <div>
                              <div style={thumbMainTitleStyle}>商品主图</div>
                              <div style={thumbSubStyle}>
                                当前商品暂未上传主图
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div style={cardBodyStyle}>
                        <div style={cardNameStyle}>
                          {renderHighlightedText(
                            x.name || '未命名商品',
                            trimmedKeyword
                          )}
                        </div>

                        <div style={cardMetaLineStyle}>
                          <span>SPU {x.id ?? '-'}</span>
                          <span style={metaSalesTextStyle}>
                            销量 {x.sales ?? 0}
                          </span>
                        </div>

                        <div style={descTextStyle}>
                          {renderHighlightedText(
                            x.description ||
                              '这是一款适合日常通勤与休闲穿搭的裤装商品。',
                            trimmedKeyword
                          )}
                        </div>

                        <div style={priceRowStyle}>
                          <div style={priceTextStyle}>
                            {formatPriceRange(x.minPrice, x.maxPrice)}
                          </div>
                        </div>

                        <div style={sellingPointsStyle}>
                          <span style={tagStyle}>搜索命中</span>
                          <span style={tagStyle}>支持选规格</span>
                          <span style={salesTagStyle}>销量 {x.sales ?? 0}</span>
                          {Number(x.totalStock || 0) > 0 ? (
                            <span style={tagStyle}>有货</span>
                          ) : (
                            <span style={tagStyle}>库存紧张</span>
                          )}
                        </div>

                        <div style={specListStyle}>
                          <div style={specItemStyle}>
                            <span style={specLabelStyle}>总库存</span>
                            <span style={specValueStyle}>
                              {x.totalStock ?? '-'} 件
                            </span>
                          </div>
                          <div style={specItemStyle}>
                            <span style={specLabelStyle}>商品状态</span>
                            <span style={specValueStyle}>{x.status ?? '-'}</span>
                          </div>
                          <div style={salesStatCardStyle}>
                            <span style={salesStatLabelStyle}>累计销量</span>
                            <span style={salesStatValueStyle}>
                              {x.sales ?? 0} 件
                            </span>
                          </div>
                          <div style={salesStatCardStyle}>
                            <span style={salesStatLabelStyle}>热度等级</span>
                            <span style={salesStatValueStyle}>
                              {resolveSalesLevel(x.sales)}
                            </span>
                          </div>
                        </div>

                        <div style={cardActionsStyle}>
                          <div style={cardDualActionStyle}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => toggleCompare(x.id, e)}
                              style={{
                                ...compareBtnStyle,
                                ...(compared ? activeCompareBtnStyle : {}),
                              }}
                            >
                              {compared ? '已加入对比' : '加入对比'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDetail(x.id)}
                              style={detailBtnStyle}
                            >
                              查看详情
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={listWrapStyle}>
              {products.map((x, idx) => {
                const imageUrl = resolveImageUrl(x.coverUrl)
                const compared = compareIds.some(
                  (id) => String(id) === String(x.id)
                )
                const hovered = String(hoveredListId) === String(x.id)

                return (
                  <div
                    key={`${x.id ?? idx}`}
                    style={{
                      ...listItemStyle,
                      transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
                      boxShadow: hovered
                        ? '0 20px 44px rgba(15,23,42,0.10)'
                        : listItemStyle.boxShadow,
                      border: hovered
                        ? '1px solid rgba(234,88,12,0.18)'
                        : listItemStyle.border,
                    }}
                    onMouseEnter={() => setHoveredListId(x.id)}
                    onMouseLeave={() => setHoveredListId(null)}
                  >
                    <div style={listImageBoxStyle}>
                      {imageUrl ? (
                        <div style={listImageWrapStyle}>
                          <img
                            src={imageUrl}
                            alt={x.name || '商品图片'}
                            style={{
                              ...listImageStyle,
                              transform: hovered ? 'scale(1.04)' : 'scale(1)',
                            }}
                          />
                          <div style={listImageOverlayStyle}>
                            <span style={salesPillStyle}>
                              {resolveSalesLevel(x.sales)} · 销量{' '}
                              {formatSales(x.sales)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div style={listImagePlaceholderStyle}>PANTS</div>
                      )}
                    </div>

                    <div style={listMainStyle}>
                      <div style={listTopRowStyle}>
                        <div style={listTitleStyle}>
                          {renderHighlightedText(
                            x.name || '未命名商品',
                            trimmedKeyword
                          )}
                        </div>
                        <div style={listPriceStyle}>
                          {formatPriceRange(x.minPrice, x.maxPrice)}
                        </div>
                      </div>

                      <div style={listMetaStyle}>
                        <span>SPU {x.id ?? '-'}</span>
                        <span style={metaSalesTextStyle}>
                          销量 {x.sales ?? 0}
                        </span>
                        <span>库存 {x.totalStock ?? '-'}</span>
                        <span>状态 {x.status ?? '-'}</span>
                      </div>

                      <div style={listDescStyle}>
                        {renderHighlightedText(
                          x.description ||
                            '这是一款适合日常通勤与休闲穿搭的裤装商品。',
                          trimmedKeyword
                        )}
                      </div>

                      <div style={sellingPointsStyle}>
                        <span style={tagStyle}>搜索命中</span>
                        <span style={tagStyle}>支持选规格</span>
                        <span style={salesTagStyle}>销量 {x.sales ?? 0}</span>
                        {Number(x.totalStock || 0) > 0 ? (
                          <span style={tagStyle}>有货</span>
                        ) : (
                          <span style={tagStyle}>库存紧张</span>
                        )}
                      </div>
                    </div>

                    <div style={listActionStyle}>
                      <div style={listActionInnerStyle}>
                        <div style={listSalesCardStyle}>
                          <span style={salesStatLabelStyle}>累计销量</span>
                          <span style={salesStatValueStyle}>
                            {x.sales ?? 0} 件
                          </span>
                        </div>

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => toggleCompare(x.id, e)}
                          style={{
                            ...compareBtnStyle,
                            ...(compared ? activeCompareBtnStyle : {}),
                          }}
                        >
                          {compared ? '已加入对比' : '加入对比'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDetail(x.id)}
                          style={detailBtnStyle}
                        >
                          查看详情
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {showPagination ? (
            <div style={paginationWrapStyle}>
              <button
                onClick={() => handlePageChange(pageNo - 1)}
                disabled={pageNo <= 1 || loading}
                style={{
                  ...pageBtnStyle,
                  ...(pageNo <= 1 || loading ? disabledPageBtnStyle : {}),
                }}
              >
                上一页
              </button>

              {pageList.map((item, index) =>
                item === '...' ? (
                  <span key={`ellipsis_${index}`} style={ellipsisStyle}>
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => handlePageChange(Number(item))}
                    disabled={loading}
                    style={{
                      ...pageBtnStyle,
                      ...(Number(item) === pageNo ? activePageBtnStyle : {}),
                      ...(loading ? disabledPageBtnStyle : {}),
                    }}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                onClick={() => handlePageChange(pageNo + 1)}
                disabled={pageNo >= totalPages || loading}
                style={{
                  ...pageBtnStyle,
                  ...(pageNo >= totalPages || loading
                    ? disabledPageBtnStyle
                    : {}),
                }}
              >
                下一页
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function CompareRow({
  label,
  products,
  different,
  renderValue,
}: {
  label: string
  products: ProductCompareItem[]
  different: boolean
  renderValue: (item: ProductCompareItem) => React.ReactNode
}) {
  return (
    <tr>
      <td style={compareLabelTdStyle}>{label}</td>
      {products.map((item) => (
        <td
          key={`${label}_${String(item.id)}`}
          style={{
            ...compareValueTdStyle,
            ...(different ? compareDifferentTdStyle : {}),
          }}
        >
          {renderValue(item)}
        </td>
      ))}
    </tr>
  )
}

function PropertyBtn({
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
      type="button"
      onClick={onClick}
      style={{
        ...propertyBtnStyle,
        ...(active ? activePropertyBtnStyle : {}),
      }}
    >
      {children}
    </button>
  )
}

function FilterSection({
  title,
  desc,
  open,
  onToggle,
  onClear,
  children,
}: {
  title: string
  desc: string
  open: boolean
  onToggle: () => void
  onClear: () => void
  children: React.ReactNode
}) {
  return (
    <section style={sectionCardStyle}>
      <div style={sectionHeadStyle}>
        <div>
          <div style={sectionTitleStyle}>{title}</div>
          <div style={sectionDescStyle}>{desc}</div>
        </div>

        <div style={sectionActionStyle}>
          <button type="button" style={miniGhostBtnStyle} onClick={onClear}>
            清空本组
          </button>
          <button type="button" style={miniGhostBtnStyle} onClick={onToggle}>
            {open ? '收起' : '展开'}
          </button>
        </div>
      </div>

      {open ? <div style={sectionBodyStyle}>{children}</div> : null}
    </section>
  )
}

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
}

const resultHeaderStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 0.8fr',
  gap: 20,
  padding: 28,
  borderRadius: 28,
  background: 'linear-gradient(135deg, #eef6ff, #ffffff 60%, #f7faff)',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
}

const resultHeaderLeftStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const headerKickerStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignSelf: 'flex-start',
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
}

const headerTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 38,
  lineHeight: 1.15,
  color: '#111827',
}

const headerDescStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: 15,
  lineHeight: 1.8,
}

const keywordHighlightStyle: React.CSSProperties = {
  marginLeft: 4,
  color: '#111827',
  fontWeight: 900,
}

const headerMetaRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 4,
}

const metaPillStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 999,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.08)',
  color: '#374151',
  fontSize: 13,
  fontWeight: 700,
}

const resultHeaderRightStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 14,
}

const statCardStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 22,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 10px 24px rgba(15,23,42,0.04)',
}

const statLabelStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: 12,
  fontWeight: 700,
}

const statValueStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 34,
  fontWeight: 900,
  color: '#111827',
}

const statDescStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#6b7280',
  fontSize: 13,
}

const filterPanelStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 28,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.05)',
}

const filterTopBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 20,
  flexWrap: 'wrap',
}

const panelKickerStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(37,99,235,0.10)',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
}

const panelTitleStyle: React.CSSProperties = {
  margin: '12px 0 0',
  fontSize: 30,
  lineHeight: 1.2,
  color: '#111827',
}

const topActionRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const searchBarRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 220px',
  gap: 12,
  marginTop: 22,
}

const searchInputStyle: React.CSSProperties = {
  height: 56,
  padding: '0 18px',
  borderRadius: 18,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#f8fafc',
  color: '#111827',
  outline: 'none',
  fontSize: 16,
  boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.03)',
}

const searchBtnLargeStyle: React.CSSProperties = {
  height: 56,
  borderRadius: 18,
  border: 'none',
  background: 'linear-gradient(135deg, #ff7a00, #ff9f43)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 900,
  fontSize: 18,
  boxShadow: '0 12px 24px rgba(255,122,0,0.20)',
}

const assistSectionStyle: React.CSSProperties = {
  marginTop: 18,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 14,
}

const assistBlockStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 20,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
}

const assistHeadStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  flexWrap: 'wrap',
}

const assistTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: '#111827',
}

const assistDescStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#6b7280',
  fontSize: 13,
  lineHeight: 1.7,
}

const assistTagWrapStyle: React.CSSProperties = {
  marginTop: 14,
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const assistTagBtnStyle: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 999,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  cursor: 'pointer',
  fontWeight: 700,
}

const historyWrapStyle: React.CSSProperties = {
  marginTop: 14,
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const historyItemStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  overflow: 'hidden',
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
}

const historyKeywordBtnStyle: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  border: 'none',
  background: '#fff',
  color: '#111827',
  cursor: 'pointer',
  fontWeight: 700,
}

const historyRemoveBtnStyle: React.CSSProperties = {
  width: 34,
  height: 36,
  border: 'none',
  borderLeft: '1px solid rgba(15,23,42,0.08)',
  background: '#fff',
  color: '#6b7280',
  cursor: 'pointer',
  fontWeight: 800,
}

const assistEmptyStyle: React.CSSProperties = {
  marginTop: 14,
  color: '#6b7280',
  fontSize: 13,
  lineHeight: 1.8,
}

const selectedBarStyle: React.CSSProperties = {
  marginTop: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const selectedTopRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
}

const selectedBarLabelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: '#374151',
}

const selectedTagWrapStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const selectedTagStyle: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 999,
  background: '#fff7ed',
  color: '#ea580c',
  border: '1px solid rgba(234,88,12,0.12)',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
}

const toolbarStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 16,
  borderRadius: 18,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
}

const toolbarLeftStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const toolbarRightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
}

const toolbarInfoPillStyle: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 999,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.08)',
  color: '#374151',
  fontSize: 12,
  fontWeight: 700,
}

const toolbarHintStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: 13,
  fontWeight: 600,
}

const sectionCardStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 18,
  borderRadius: 22,
  background: '#f8fafc',
  border: '1px solid rgba(15,23,42,0.06)',
}

const sectionHeadStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: '#111827',
}

const sectionDescStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#6b7280',
  fontSize: 13,
  lineHeight: 1.7,
}

const sectionActionStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
}

const sectionBodyStyle: React.CSSProperties = {
  marginTop: 16,
}

const advancedFilterGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 14,
}

const filterCardStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 20,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
}

const filterCardTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: '#111827',
}

const filterCardDescStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#6b7280',
  fontSize: 13,
  lineHeight: 1.7,
}

const priceInputRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  marginTop: 14,
  flexWrap: 'wrap',
}

const filterInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 160,
  height: 46,
  padding: '0 14px',
  borderRadius: 14,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  outline: 'none',
}

const propertyWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

const propertyBlockStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const propertyLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: '#374151',
}

const propertyTagWrapStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const propertyBtnStyle: React.CSSProperties = {
  height: 38,
  padding: '0 14px',
  borderRadius: 999,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  cursor: 'pointer',
  fontWeight: 700,
}

const activePropertyBtnStyle: React.CSSProperties = {
  background: '#111827',
  color: '#fff',
  border: '1px solid #111827',
}

const presetWrapStyle: React.CSSProperties = {
  marginTop: 12,
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const presetBtnStyle: React.CSSProperties = {
  height: 34,
  padding: '0 12px',
  borderRadius: 999,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#374151',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 12,
}

const warningTextStyle: React.CSSProperties = {
  marginTop: 10,
  color: '#dc2626',
  fontSize: 12,
  fontWeight: 700,
}

const primaryBtnStyle: React.CSSProperties = {
  height: 44,
  padding: '0 18px',
  borderRadius: 14,
  border: 'none',
  background: 'linear-gradient(135deg, #ff7a00, #ff9f43)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 800,
  boxShadow: '0 12px 24px rgba(255,122,0,0.18)',
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

const miniGhostBtnStyle: React.CSSProperties = {
  height: 34,
  padding: '0 12px',
  borderRadius: 12,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#374151',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 12,
}

const resultHeadStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'end',
  gap: 16,
  flexWrap: 'wrap',
  padding: '0 4px',
}

const resultHeadActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  flexWrap: 'wrap',
}

const resultTitleStyle: React.CSSProperties = {
  margin: '12px 0 0',
  fontSize: 30,
  color: '#111827',
  lineHeight: 1.2,
}

const resultCountStyle: React.CSSProperties = {
  color: '#6b7280',
  fontWeight: 700,
  fontSize: 15,
}

const sortBarWrapStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
}

const sortChipStyle: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 999,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#374151',
  cursor: 'pointer',
  fontWeight: 700,
}

const activeSortChipStyle: React.CSSProperties = {
  background: '#111827',
  color: '#fff',
  border: '1px solid #111827',
}

const viewSwitchWrapStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
}

const viewBtnStyle: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#374151',
  cursor: 'pointer',
  fontWeight: 700,
}

const activeViewBtnStyle: React.CSSProperties = {
  background: '#111827',
  color: '#fff',
  border: '1px solid #111827',
}

const compareEntryBtnStyle: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  cursor: 'pointer',
  fontWeight: 700,
}

const activeCompareEntryBtnStyle: React.CSSProperties = {
  background: '#fff7ed',
  color: '#ea580c',
  border: '1px solid rgba(234,88,12,0.18)',
}

const comparePanelStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 24,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.05)',
}

const comparePanelHeadStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap',
}

const comparePanelTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: '#111827',
}

const comparePanelDescStyle: React.CSSProperties = {
  marginTop: 8,
  color: '#6b7280',
  fontSize: 13,
  lineHeight: 1.8,
}

const comparePanelActionStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  alignItems: 'center',
}

const compareLoadingTextStyle: React.CSSProperties = {
  color: '#ea580c',
  fontSize: 12,
  fontWeight: 700,
}

const compareTipStyle: React.CSSProperties = {
  marginTop: 14,
  padding: '12px 14px',
  borderRadius: 14,
  background: '#fff7ed',
  color: '#9a3412',
  fontSize: 13,
  fontWeight: 700,
  border: '1px solid rgba(234,88,12,0.12)',
}

const compareTableWrapStyle: React.CSSProperties = {
  marginTop: 18,
  overflowX: 'auto',
  borderRadius: 18,
  border: '1px solid rgba(15,23,42,0.06)',
}

const compareTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  background: '#fff',
  minWidth: 860,
}

const compareThFirstStyle: React.CSSProperties = {
  minWidth: 160,
  textAlign: 'left',
  padding: '16px 14px',
  background: '#f8fafc',
  borderBottom: '1px solid rgba(15,23,42,0.06)',
  color: '#6b7280',
  fontSize: 13,
  fontWeight: 800,
  verticalAlign: 'top',
}

const compareThStyle: React.CSSProperties = {
  minWidth: 220,
  textAlign: 'left',
  padding: '16px 14px',
  background: '#f8fafc',
  borderBottom: '1px solid rgba(15,23,42,0.06)',
  borderLeft: '1px solid rgba(15,23,42,0.04)',
  verticalAlign: 'top',
}

const compareTableProductHeadStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const compareTableProductNameStyle: React.CSSProperties = {
  color: '#111827',
  fontSize: 16,
  fontWeight: 900,
  lineHeight: 1.5,
}

const compareTableProductSubStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: 12,
  fontWeight: 700,
}

const compareLabelTdStyle: React.CSSProperties = {
  padding: '14px',
  background: '#fcfcfd',
  borderBottom: '1px solid rgba(15,23,42,0.06)',
  color: '#374151',
  fontSize: 13,
  fontWeight: 800,
  verticalAlign: 'top',
}

const compareValueTdStyle: React.CSSProperties = {
  padding: '14px',
  borderBottom: '1px solid rgba(15,23,42,0.06)',
  borderLeft: '1px solid rgba(15,23,42,0.04)',
  color: '#111827',
  fontSize: 14,
  lineHeight: 1.8,
  verticalAlign: 'top',
  background: '#fff',
}

const compareDifferentTdStyle: React.CSSProperties = {
  background: '#fff7ed',
}

const compareActionCellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const emptyCardStyle: React.CSSProperties = {
  padding: 34,
  borderRadius: 24,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.05)',
}

const emptyTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  color: '#111827',
  marginBottom: 8,
}

const emptySubStyle: React.CSSProperties = {
  color: '#6b7280',
  lineHeight: 1.8,
}

const emptyActionRowStyle: React.CSSProperties = {
  marginTop: 18,
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
}

const cardGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 18,
}

const cardStyle: React.CSSProperties = {
  borderRadius: 24,
  overflow: 'hidden',
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
  transition: 'transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease',
}

const cardHoverWrapStyle: React.CSSProperties = {
  height: '100%',
  transition: 'transform 0.28s ease',
}

const thumbStyle: React.CSSProperties = {
  minHeight: 240,
  padding: 18,
  background:
    'linear-gradient(135deg, rgba(255,122,0,0.18), rgba(255,225,200,0.10), rgba(59,130,246,0.06))',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}

const thumbImageWrapStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 240,
  borderRadius: 18,
  overflow: 'hidden',
}

const thumbImageStyle: React.CSSProperties = {
  width: '100%',
  height: 240,
  objectFit: 'cover',
  borderRadius: 18,
  background: '#fff',
  transition: 'transform 0.35s ease',
}

const thumbOverlayTopStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  right: 12,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 10,
}

const thumbOverlayRightStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  alignItems: 'flex-end',
}

const thumbTopRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
}

const thumbBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  background: '#fff',
  color: '#ff7a00',
  fontSize: 12,
  fontWeight: 800,
}

const stockPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.90)',
  color: '#4b5563',
  fontSize: 12,
  fontWeight: 700,
}

const salesPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  background: 'rgba(17,24,39,0.82)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 800,
  boxShadow: '0 10px 22px rgba(17,24,39,0.18)',
}

const thumbMainTitleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  color: '#111827',
}

const thumbSubStyle: React.CSSProperties = {
  marginTop: 10,
  color: '#4b5563',
  fontWeight: 600,
}

const cardBodyStyle: React.CSSProperties = {
  padding: 18,
}

const cardNameStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: '#111827',
  lineHeight: 1.35,
}

const cardMetaLineStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 10,
  color: '#6b7280',
  fontSize: 13,
}

const metaSalesTextStyle: React.CSSProperties = {
  color: '#ea580c',
  fontWeight: 800,
}

const descTextStyle: React.CSSProperties = {
  marginTop: 12,
  color: '#6b7280',
  lineHeight: 1.8,
  fontSize: 14,
  minHeight: 52,
}

const priceRowStyle: React.CSSProperties = {
  marginTop: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const priceTextStyle: React.CSSProperties = {
  color: '#ff4d4f',
  fontSize: 28,
  fontWeight: 900,
}

const sellingPointsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginTop: 14,
}

const tagStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 999,
  background: '#f3f4f6',
  color: '#374151',
  fontSize: 12,
  fontWeight: 700,
}

const salesTagStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 999,
  background: '#fff7ed',
  color: '#ea580c',
  fontSize: 12,
  fontWeight: 800,
  border: '1px solid rgba(234,88,12,0.12)',
}

const specListStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
  marginTop: 16,
}

const specItemStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 16,
  background: '#f9fafb',
  border: '1px solid rgba(15,23,42,0.05)',
}

const salesStatCardStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 16,
  background: 'linear-gradient(135deg, #fff7ed, #ffffff)',
  border: '1px solid rgba(234,88,12,0.10)',
}

const specLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#9ca3af',
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 8,
}

const specValueStyle: React.CSSProperties = {
  color: '#111827',
  fontSize: 15,
  fontWeight: 800,
}

const salesStatLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#9a3412',
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 8,
}

const salesStatValueStyle: React.CSSProperties = {
  color: '#ea580c',
  fontSize: 16,
  fontWeight: 900,
}

const cardActionsStyle: React.CSSProperties = {
  marginTop: 18,
}

const cardDualActionStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
}

const detailBtnStyle: React.CSSProperties = {
  width: '100%',
  height: 46,
  borderRadius: 14,
  border: 'none',
  background: '#111827',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
}

const compareBtnStyle: React.CSSProperties = {
  width: '100%',
  height: 46,
  borderRadius: 14,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  fontWeight: 800,
  cursor: 'pointer',
}

const activeCompareBtnStyle: React.CSSProperties = {
  background: '#fff7ed',
  color: '#ea580c',
  border: '1px solid rgba(234,88,12,0.18)',
}

const listWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}

const listItemStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '160px 1fr 170px',
  gap: 18,
  alignItems: 'stretch',
  padding: 18,
  borderRadius: 22,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.06)',
  boxShadow: '0 14px 30px rgba(15,23,42,0.05)',
  transition: 'transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease',
}

const listImageBoxStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 140,
}

const listImageWrapStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
}

const listImageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: 140,
  objectFit: 'cover',
  borderRadius: 16,
  background: '#fff',
  transition: 'transform 0.35s ease',
}

const listImageOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  left: 10,
}

const listImagePlaceholderStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 140,
  borderRadius: 16,
  background: 'linear-gradient(135deg, #fff1e8, #f3f4f6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ff7a00',
  fontWeight: 900,
  fontSize: 24,
}

const listMainStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: 12,
}

const listTopRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap',
}

const listTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: '#111827',
  lineHeight: 1.35,
  flex: 1,
}

const listPriceStyle: React.CSSProperties = {
  color: '#ff4d4f',
  fontSize: 28,
  fontWeight: 900,
  whiteSpace: 'nowrap',
}

const listMetaStyle: React.CSSProperties = {
  display: 'flex',
  gap: 14,
  flexWrap: 'wrap',
  color: '#6b7280',
  fontSize: 13,
  fontWeight: 700,
}

const listDescStyle: React.CSSProperties = {
  color: '#6b7280',
  lineHeight: 1.8,
  fontSize: 14,
}

const listActionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const listActionInnerStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const listSalesCardStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 16,
  background: 'linear-gradient(135deg, #fff7ed, #ffffff)',
  border: '1px solid rgba(234,88,12,0.10)',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const paginationWrapStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 8,
  paddingBottom: 8,
}

const pageBtnStyle: React.CSSProperties = {
  minWidth: 44,
  height: 42,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#fff',
  color: '#111827',
  cursor: 'pointer',
  fontWeight: 800,
}

const activePageBtnStyle: React.CSSProperties = {
  background: '#111827',
  color: '#fff',
  border: '1px solid #111827',
}

const disabledPageBtnStyle: React.CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed',
}

const ellipsisStyle: React.CSSProperties = {
  minWidth: 30,
  textAlign: 'center',
  color: '#9ca3af',
  fontWeight: 800,
}

const highlightMarkStyle: React.CSSProperties = {
  background: '#fff3bf',
  color: '#111827',
  padding: '0 2px',
  borderRadius: 4,
}