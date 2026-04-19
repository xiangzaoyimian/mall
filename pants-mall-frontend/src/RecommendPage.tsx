import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { getRecommendByProfile, type RecommendItem } from './api/recommend'
import { listProfiles, type BodyProfile } from './api/bodyProfile'
import { chatWithAi } from './api/ai'
import type { RecommendChatMessage } from './App'
import './styles/recommend.css'

// 骨架屏组件
const SkeletonLoader = React.memo(({ type, className = '' }: { type: 'card' | 'chat' | 'input' | 'profile'; className?: string }) => {
  return (
    <div className={`skeleton ${className}`}>
      {type === 'card' && (
        <div className="skeleton-card">
          <div className="skeleton-card-image"></div>
          <div className="skeleton-card-content">
            <div className="skeleton-card-title"></div>
            <div className="skeleton-card-price"></div>
            <div className="skeleton-card-tags">
              <div className="skeleton-card-tag"></div>
              <div className="skeleton-card-tag"></div>
              <div className="skeleton-card-tag"></div>
            </div>
            <div className="skeleton-card-btn"></div>
          </div>
        </div>
      )}
      {type === 'chat' && (
        <div className="skeleton-chat">
          <div className="skeleton-chat-avatar"></div>
          <div className="skeleton-chat-bubble">
            <div className="skeleton-chat-line"></div>
            <div className="skeleton-chat-line"></div>
            <div className="skeleton-chat-line"></div>
          </div>
        </div>
      )}
      {type === 'input' && (
        <div className="skeleton-input"></div>
      )}
      {type === 'profile' && (
        <div className="skeleton-profile">
          <div className="skeleton-profile-select"></div>
          <div className="skeleton-profile-hint"></div>
        </div>
      )}
    </div>
  )
})

SkeletonLoader.displayName = 'SkeletonLoader'

type Props = {
  isLoggedIn: boolean
  onOpenProduct: (spuId: string | number) => void
  aiQuestion: string
  setAiQuestion: React.Dispatch<React.SetStateAction<string>>
  aiMsg: string
  setAiMsg: React.Dispatch<React.SetStateAction<string>>
  chatMessages: RecommendChatMessage[]
  setChatMessages: React.Dispatch<React.SetStateAction<RecommendChatMessage[]>>
  onClearAiState: () => void
}

function formatPrice(v?: number) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n.toFixed(2) : '--'
}

function getMatchLevel(userValue?: number, itemValue?: number) {
  if (userValue == null || itemValue == null) {
    return { text: '-', color: '#9ca3af' }
  }

  const diff = Math.abs(userValue - itemValue)

  if (diff === 0) {
    return { text: '完全匹配', color: '#16a34a' }
  }
  if (diff <= 2) {
    return { text: '接近匹配', color: '#2563eb' }
  }
  if (diff <= 4) {
    return { text: '基本合适', color: '#f59e0b' }
  }
  return { text: '偏差较大', color: '#ef4444' }
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



function createMessage(
  role: 'user' | 'ai',
  content: string,
  extra?: Partial<RecommendChatMessage>
): RecommendChatMessage {
  return {
    id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now(),
    ...extra,
  }
}

function formatMessageTime(ts: number) {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function splitAiSections(text?: string) {
  const raw = String(text || '').trim()
  if (!raw) {
    return {
      conclusion: '',
      reasons: [] as string[],
      scene: '',
      suggestion: '',
      fallbackLines: [] as string[],
    }
  }

  const normalized = raw.replace(/\r/g, '')

  const getSection = (startTitle: string, endTitles: string[]) => {
    const startIndex = normalized.indexOf(startTitle)
    if (startIndex === -1) return ''

    const contentStart = startIndex + startTitle.length
    let endIndex = normalized.length

    for (const endTitle of endTitles) {
      const idx = normalized.indexOf(endTitle, contentStart)
      if (idx !== -1 && idx < endIndex) {
        endIndex = idx
      }
    }

    return normalized.slice(contentStart, endIndex).trim()
  }

  const conclusion = getSection('【结论】', ['【原因】', '【适合场景】', '【优先建议】'])
  const reasonText = getSection('【原因】', ['【适合场景】', '【优先建议】'])
  const scene = getSection('【适合场景】', ['【优先建议】'])
  const suggestion = getSection('【优先建议】', [])

  const reasons = reasonText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const parts = line
        .split(/(?=\d+\.)/)
        .map((part) => part.trim())
        .filter(Boolean)
      return parts.length > 0 ? parts : [line]
    })
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)

  const hasStructured =
    Boolean(conclusion) || reasons.length > 0 || Boolean(scene) || Boolean(suggestion)

  return {
    conclusion,
    reasons,
    scene,
    suggestion,
    fallbackLines: hasStructured
      ? []
      : normalized
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
  }
}

export default function RecommendPage({
  isLoggedIn,
  onOpenProduct,
  aiQuestion,
  setAiQuestion,
  aiMsg,
  setAiMsg,
  chatMessages,
  setChatMessages,
  onClearAiState,
}: Props) {
  const [profiles, setProfiles] = useState<BodyProfile[]>([])
  const [profileId, setProfileId] = useState<string>('')
  const [list, setList] = useState<RecommendItem[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [loadingAi, setLoadingAi] = useState(false)
  const [isProductsExpanded, setIsProductsExpanded] = useState(true)



  const chatListRef = useRef<HTMLDivElement | null>(null)

  const resetRecommendState = useCallback((showLoginMsg = false) => {
    setProfiles([])
    setProfileId('')
    setList([])
    setLoading(false)
    setLoadingAi(false)
    setMsg(showLoginMsg ? '您还未登录，请先登录后查看档案和推荐。' : '')
    setAiMsg('')
    onClearAiState()
  }, [onClearAiState, setAiMsg])

  const loadRecommend = useCallback(async (currentProfileId: string) => {
    if (!isLoggedIn) {
      resetRecommendState(true)
      return
    }

    const id = String(currentProfileId || '').trim()
    if (!id) {
      setList([])
      setMsg('你可以先新增身材档案，或切换其他档案查看推荐。')
      return
    }

    setLoading(true)
    setMsg('')
    try {
      const data = await getRecommendByProfile(id)
      const arr = Array.isArray(data) ? data : []
      setList(arr)

      if (arr.length === 0) {
        setMsg('暂无推荐结果')
      } else {
        setMsg('')
      }
    } catch (e: unknown) {
      const errorMsg = (e as any)?.response?.data?.msg || (e as Error)?.message || '推荐加载失败'
      setList([])
      setMsg(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn, resetRecommendState])

  const appendChatMessage = useCallback((message: RecommendChatMessage) => {
    setChatMessages((prev) => [...prev, message])
  }, [setChatMessages])

  const replaceLastAiLoading = useCallback((content: string, isError?: boolean) => {
    setChatMessages((prev) => {
      const next = [...prev]
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i].role === 'ai' && next[i].loading) {
          next[i] = {
            ...next[i],
            content,
            loading: false,
            error: Boolean(isError),
            createdAt: Date.now(),
          }
          return next
        }
      }
      next.push(
        createMessage('ai', content, {
          loading: false,
          error: Boolean(isError),
        })
      )
      return next
    })
  }, [setChatMessages])

  const handleAiAsk = useCallback(async (questionText?: string) => {
    if (!isLoggedIn) {
      setAiMsg('您还未登录，请先登录')
      return
    }

    const id = String(profileId || '').trim()
    const q = String(questionText ?? aiQuestion).trim()

    if (!id) {
      setAiMsg('请先选择档案')
      return
    }

    if (!q) {
      setAiMsg('请输入你想咨询的问题')
      return
    }

    setLoadingAi(true)
    setAiMsg('')

    appendChatMessage(createMessage('user', q))
    appendChatMessage(
      createMessage('ai', 'AI 正在结合当前体型档案与推荐结果分析，请稍候...', {
        loading: true,
      })
    )

    setAiQuestion('')

    try {
      const data = await chatWithAi({
        question: q,
        profileId: id,
      })
      const answer = String(data?.answer || '').trim() || 'AI 暂时没有返回内容'
      replaceLastAiLoading(answer, false)
    } catch (e: unknown) {
      const errorText =
        (e as any)?.response?.data?.msg || (e as Error)?.message || 'AI 服务暂时不可用，请稍后重试'
      setAiMsg(errorText)
      replaceLastAiLoading(errorText, true)
    } finally {
      setLoadingAi(false)
    }
  }, [isLoggedIn, profileId, aiQuestion, appendChatMessage, replaceLastAiLoading, setAiMsg, setAiQuestion])

  const clearChat = useCallback(() => {
    onClearAiState()
  }, [onClearAiState])

  useEffect(() => {
    async function init() {
      if (!isLoggedIn) {
        resetRecommendState(true)
        return
      }

      setLoading(true)
      try {
        const data = await listProfiles()
        const arr = Array.isArray(data) ? data : []
        setProfiles(arr)

        if (arr.length > 0) {
          const firstId = String(arr[0].id ?? '')
          setProfileId(firstId)

          const rec = await getRecommendByProfile(firstId)
          const recArr = Array.isArray(rec) ? rec : []
          setList(recArr)

          if (recArr.length === 0) {
            setMsg('暂无推荐结果')
          } else {
            setMsg('')
          }
        } else {
          setProfileId('')
          setList([])
          setMsg('你可以先新增身材档案，或切换其他档案查看推荐。')
        }
      } catch (e: unknown) {
        const errorMsg = (e as any)?.response?.data?.msg || (e as Error)?.message || '推荐加载失败'
        setProfiles([])
        setProfileId('')
        setList([])
        setMsg(errorMsg)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [isLoggedIn, resetRecommendState])

  useEffect(() => {
    const el = chatListRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [chatMessages, loadingAi])

  const profileOptions = useMemo(() => {
    return profiles.map((item) => ({
      value: String(item.id ?? ''),
      label: item.name || `档案 ${String(item.id ?? '')}`,
    }))
  }, [profiles])

  const currentProfile = useMemo(() => {
    return profiles.find((item) => String(item.id ?? '') === profileId) || null
  }, [profiles, profileId])

  const aiRecommendItems = useMemo(() => {
    if (!Array.isArray(list) || list.length === 0) return []
    return list.slice(0, 2)
  }, [list])

  return (
    <div className="recommend-page">
      <div className="recommend-header">
        <div className="recommend-header-content">
          <div className="recommend-header-tag">SMART PICKS</div>
          <h1 className="recommend-header-title">智能推荐</h1>
        </div>
      </div>

      <div className="recommend-toolbar">
        <div className="recommend-toolbar-left">
          <label className="recommend-toolbar-label">选择档案</label>
          {loading ? (
            <SkeletonLoader type="profile" />
          ) : (
            <>
              <select
                className="recommend-profile-select"
                value={profileId}
                onChange={async (e) => {
                  const nextId = e.target.value
                  setProfileId(nextId)
                  clearChat()
                  await loadRecommend(nextId)
                }}
                disabled={!isLoggedIn || profileOptions.length === 0}
              >
                {!isLoggedIn ? (
                  <option value="">请先登录</option>
                ) : profileOptions.length === 0 ? (
                  <option value="">暂无档案</option>
                ) : (
                  profileOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))
                )}
              </select>

              {profileId ? (
                <div className="recommend-profile-hint">
                  <div className="recommend-profile-hint-title">当前档案</div>
                  <div className="recommend-profile-hint-text">
                    <span className="recommend-profile-hint-strong">ID：{profileId}</span>
                    <span className="recommend-profile-hint-split">｜</span>
                    <span>
                      名称：
                      <span className="recommend-profile-hint-name">
                        {currentProfile?.name || '未识别'}
                      </span>
                    </span>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <button
          type="button"
          className="recommend-refresh-btn"
          onClick={() => loadRecommend(profileId)}
          disabled={loading || !isLoggedIn}
        >
          {loading ? '加载中...' : '刷新推荐'}
        </button>
      </div>

      {/* 推荐商品区域 - 可展开/收起 */}
      {list.length > 0 && (
        <section className="recommend-products-section">
          <div 
            className="recommend-products-header"
            onClick={() => setIsProductsExpanded(!isProductsExpanded)}
          >
            <div className="recommend-products-header-left">
              <span className="recommend-products-icon">👖</span>
              <h2 className="recommend-products-title">为你推荐</h2>
              <span className="recommend-products-count">({list.length}件商品)</span>
            </div>
            <button 
              type="button"
              className="recommend-products-toggle-btn"
              onClick={(e) => {
                e.stopPropagation()
                setIsProductsExpanded(!isProductsExpanded)
              }}
            >
              {isProductsExpanded ? '收起 ▲' : '展开 ▼'}
            </button>
          </div>
          
          {isProductsExpanded && (
            <div className="recommend-products-content">
              {loading ? (
                <div className="recommend-grid">
                  {[1, 2, 3, 4].map((index) => (
                    <SkeletonLoader key={`skeleton_${index}`} type="card" />
                  ))}
                </div>
              ) : (
                <div className="recommend-grid">
                  {list.map((item, index) => {
                    const cover = resolveImageUrl(item.coverUrl)
                    const badge = getRecommendBadge(item.recommendType)
                    const score = Number(item.matchScore ?? 0)
                    const scoreColor = getMatchColor(score)
                    const scoreBg = getMatchBg(score)
                    const waistMatch = getMatchLevel(currentProfile?.waistCm, item.waistCm)
                    const lengthMatch = getMatchLevel(currentProfile?.legLengthCm, item.lengthCm)
                    const cardKey = `${String(item.spuId ?? '')}_${index}`

                    return (
                      <div
                        key={cardKey}
                        className="recommend-card"
                        onClick={() => {
                          const spuId = item.spuId
                          if (!spuId) {
                            alert('spuId 不存在')
                            return
                          }
                          onOpenProduct(spuId)
                        }}
                      >
                        <div className="recommend-card-image">
                          {cover ? (
                            <img
                              src={cover}
                              alt={item.name || '商品主图'}
                              className="recommend-card-img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="recommend-card-empty-image">PANTS</div>
                          )}
                        </div>

                        <div className="recommend-card-body">
                          <div className="recommend-card-title-row">
                            <div className="recommend-card-title">{item.name || '推荐商品'}</div>
                            <div
                              className="recommend-card-badge"
                              style={{
                                background: badge.bg,
                                color: badge.color,
                                border: badge.border,
                              }}
                            >
                              {badge.text}
                            </div>
                          </div>

                          <div className="recommend-card-price">¥{formatPrice(Number(item.price ?? 0))}</div>

                          <div
                            className="recommend-card-score"
                            style={{
                              background: scoreBg,
                              border: `1px solid ${scoreColor}33`,
                              color: scoreColor,
                            }}
                          >
                            <span>匹配度</span>
                            <span>{score}%</span>
                          </div>

                          <div className="recommend-card-tags">
                            <span className="recommend-card-tag">{item.fitType || '-'}</span>
                            <span className="recommend-card-tag">
                              腰围 {item.waistCm ?? '-'} cm
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 11,
                                  color: waistMatch.color,
                                  fontWeight: 700,
                                }}
                              >
                                {waistMatch.text}
                              </span>
                            </span>
                            <span className="recommend-card-tag">
                              裤长 {item.lengthCm ?? '-'} cm
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 11,
                                  color: lengthMatch.color,
                                  fontWeight: 700,
                                }}
                              >
                                {lengthMatch.text}
                              </span>
                            </span>
                            <span className="recommend-card-tag">库存 {item.stock ?? 0}</span>
                          </div>

                          <div
                            className="recommend-card-reason"
                            style={{
                              background: scoreBg,
                              border: `1px solid ${scoreColor}33`,
                              color: scoreColor,
                            }}
                          >
                            推荐理由：{item.reason || '综合匹配较好'}
                          </div>

                          <button
                            type="button"
                            className="recommend-card-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              const spuId = item.spuId
                              if (!spuId) {
                                alert('spuId 不存在')
                                return
                              }
                              onOpenProduct(spuId)
                            }}
                          >
                            查看详情
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {msg && (
        <div className="recommend-empty">
          <h3 className="recommend-empty-title">
            {msg === '暂无推荐结果' ? '暂无推荐结果' : msg}
          </h3>
          <p className="recommend-empty-desc">
            {!isLoggedIn
              ? '登录后可根据你的身材档案展示个性化推荐。'
              : '你可以先新增身材档案，或切换其他档案查看推荐。'}
          </p>
        </div>
      )}

      <section className="recommend-ai-card">
        <div className="recommend-ai-header">
          <div className="recommend-ai-header-content">
            <h2 className="recommend-ai-title">智能选裤助手</h2>
            <p className="recommend-ai-desc">
              基于当前体型档案与推荐结果，AI 可以帮你解释推荐原因，并给出选裤建议。
            </p>
          </div>

          <div className="recommend-ai-actions">
            <button
              type="button"
              className="recommend-clear-chat-btn"
              onClick={clearChat}
              disabled={loadingAi || chatMessages.length === 0}
            >
              清空对话
            </button>
          </div>
        </div>

        <div className="recommend-quick-ask">
          <button
            type="button"
            className="recommend-quick-ask-btn"
            onClick={() => handleAiAsk('为什么优先推荐前两条裤子？')}
            disabled={loadingAi || !isLoggedIn}
          >
            为什么优先推荐前两条裤子？
          </button>
          <button
            type="button"
            className="recommend-quick-ask-btn"
            onClick={() => handleAiAsk('结合我的体型，我更适合直筒还是修身？')}
            disabled={loadingAi || !isLoggedIn}
          >
            结合我的体型，我更适合直筒还是修身？
          </button>
          <button
            type="button"
            className="recommend-quick-ask-btn"
            onClick={() => handleAiAsk('这几条里哪条更适合日常通勤穿着？')}
            disabled={loadingAi || !isLoggedIn}
          >
            哪条更适合日常通勤？
          </button>
          <button
            type="button"
            className="recommend-quick-ask-btn"
            onClick={() => handleAiAsk('我的腿型偏O型，应该选择哪种版型？')}
            disabled={loadingAi || !isLoggedIn}
          >
            O型腿适合哪种版型？
          </button>
          <button
            type="button"
            className="recommend-quick-ask-btn"
            onClick={() => handleAiAsk('夏季高温天气，哪条裤子更透气舒适？')}
            disabled={loadingAi || !isLoggedIn}
          >
            夏季哪条更透气？
          </button>
          <button
            type="button"
            className="recommend-quick-ask-btn"
            onClick={() => handleAiAsk('这些裤子中，哪条性价比最高？')}
            disabled={loadingAi || !isLoggedIn}
          >
            哪条性价比最高？
          </button>
        </div>

        <div className="recommend-ai-input">
          <input
            className="recommend-ai-input-field"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loadingAi) {
                handleAiAsk()
              }
            }}
            placeholder="例如：我腿长95cm，应该优先选哪一条？"
            disabled={!isLoggedIn}
          />
          <button
            type="button"
            className="recommend-ai-send-btn"
            onClick={() => handleAiAsk()}
            disabled={loadingAi || !isLoggedIn}
          >
            {loadingAi ? '分析中...' : '发送提问'}
          </button>
        </div>

        {aiMsg ? <div className="recommend-ai-msg">{aiMsg}</div> : null}

        <div className="recommend-chat">
          <div className="recommend-chat-header">
            <h3 className="recommend-chat-header-title">对话记录</h3>
            <p className="recommend-chat-header-desc">
              你可以连续提问，AI 会基于当前档案给出选裤建议
            </p>
          </div>

          <div ref={chatListRef} className="recommend-chat-list">
            {chatMessages.length === 0 ? (
              <div className="recommend-chat-empty">
                <h4 className="recommend-chat-empty-title">还没有开始对话</h4>
                <p className="recommend-chat-empty-desc">
                  点击上方快捷问题，或输入你想咨询的选裤问题试试
                </p>
              </div>
            ) : (
              chatMessages.map((message) => {
                const aiSections = splitAiSections(message.content)

                if (message.role === 'user') {
                  return (
                    <div key={message.id} className="recommend-message-user">
                      <div className="recommend-message-user-bubble">
                        <div className="recommend-message-meta">
                          <span className="recommend-message-role recommend-message-role-user">你</span>
                          <span className="recommend-message-time">
                            {formatMessageTime(message.createdAt)}
                          </span>
                        </div>
                        <div className="recommend-message-text">{message.content}</div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={message.id} className="recommend-message-ai">
                    <div className="recommend-message-ai-avatar">AI</div>
                    <div
                      className={`recommend-message-ai-bubble ${message.error ? 'recommend-message-ai-bubble-error' : ''}`}
                    >
                      <div className="recommend-message-meta">
                        <span className="recommend-message-role recommend-message-role-ai">
                          {message.loading ? 'AI 分析中' : 'AI 助手'}
                        </span>
                        <span className="recommend-message-time recommend-message-ai-time">
                          {formatMessageTime(message.createdAt)}
                        </span>
                      </div>

                      {message.loading ? (
                        <div className="recommend-message-thinking">
                          <span className="recommend-message-thinking-dot">●</span>
                          <span>正在结合体型档案与推荐结果生成建议...</span>
                        </div>
                      ) : message.error ? (
                        <div className="recommend-message-text">
                          {message.content}
                          <div className="recommend-message-error-actions">
                            <button
                              type="button"
                              className="recommend-message-retry-btn"
                              onClick={() => {
                                const lastUserMessage = [...chatMessages].reverse().find(msg => msg.role === 'user')
                                if (lastUserMessage) {
                                  handleAiAsk(lastUserMessage.content)
                                }
                              }}
                              disabled={loadingAi}
                            >
                              重试
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="recommend-ai-answer">
                          {aiSections.fallbackLines.length > 0 ? (
                            aiSections.fallbackLines.map((line, idx) => (
                              <div key={`${message.id}_${idx}`} className="recommend-ai-answer-line">
                                {line}
                              </div>
                            ))
                          ) : (
                            <>
                              {aiSections.conclusion ? (
                                <div className="recommend-ai-section">
                                  <div className="recommend-ai-section-title">结论</div>
                                  <div className="recommend-ai-answer-line">{aiSections.conclusion}</div>
                                </div>
                              ) : null}

                              {aiSections.reasons.length > 0 ? (
                                <div className="recommend-ai-section">
                                  <div className="recommend-ai-section-title">原因</div>
                                  <div className="recommend-ai-reason-list">
                                    {aiSections.reasons.map((reason, idx) => (
                                      <div
                                        key={`${message.id}_reason_${idx}`}
                                        className="recommend-ai-reason-item"
                                      >
                                        <span className="recommend-ai-reason-index">{idx + 1}</span>
                                        <span className="recommend-ai-reason-text">{reason}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {aiSections.scene ? (
                                <div className="recommend-ai-section">
                                  <div className="recommend-ai-section-title">适合场景</div>
                                  <div className="recommend-ai-answer-line">{aiSections.scene}</div>
                                </div>
                              ) : null}

                              {aiSections.suggestion ? (
                                <div className="recommend-ai-section">
                                  <div className="recommend-ai-section-title">优先建议</div>
                                  <div className="recommend-ai-answer-line">{aiSections.suggestion}</div>
                                </div>
                              ) : null}
                            </>
                          )}



                          {!message.error && aiRecommendItems.length > 0 ? (
                            <div className="recommend-ai-products">
                              <div className="recommend-ai-products-title">
                                👇 推荐商品
                              </div>

                              <div className="recommend-ai-products-grid">
                                {aiRecommendItems.map((item, index) => {
                                  const cover = resolveImageUrl(item.coverUrl)
                                  const badge = getRecommendBadge(item.recommendType)
                                  const score = Number(item.matchScore ?? 0)
                                  const waistMatch = getMatchLevel(
                                    currentProfile?.waistCm,
                                    item.waistCm
                                  )
                                  const cardKey = `${String(item.spuId ?? '')}_${index}_ai`

                                  return (
                                    <div
                                      key={cardKey}
                                      className="recommend-ai-product-card"
                                      onClick={() => {
                                        const spuId = item.spuId
                                        if (!spuId) return
                                        onOpenProduct(spuId)
                                      }}
                                    >
                                      <div className="recommend-ai-product-image">
                                        {cover ? (
                                          <img
                                            src={cover}
                                            alt={item.name || '推荐商品'}
                                            className="recommend-ai-product-img"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="recommend-ai-product-empty-image">PANTS</div>
                                        )}
                                      </div>

                                      <div className="recommend-ai-product-body">
                                        <div className="recommend-ai-product-title-row">
                                          <div className="recommend-ai-product-title">
                                            {item.name || '推荐商品'}
                                          </div>
                                          <div
                                            className="recommend-ai-product-badge"
                                            style={{
                                              background: badge.bg,
                                              color: badge.color,
                                              border: badge.border,
                                            }}
                                          >
                                            {badge.text}
                                          </div>
                                        </div>

                                        <div className="recommend-ai-product-price">
                                          ¥{formatPrice(Number(item.price ?? 0))}
                                        </div>

                                        <div className="recommend-ai-product-meta">
                                          <span className="recommend-ai-product-meta-tag">
                                            {item.fitType || '-'}
                                          </span>
                                          <span className="recommend-ai-product-meta-tag">
                                            匹配 {score}%
                                          </span>
                                          <span
                                            className="recommend-ai-product-meta-tag"
                                            style={{
                                              color: waistMatch.color,
                                              borderColor: `${waistMatch.color}33`,
                                              background: '#fff',
                                            }}
                                          >
                                            腰围 {item.waistCm ?? '-'} cm
                                          </span>
                                        </div>

                                        <button
                                          type="button"
                                          className="recommend-ai-product-btn"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            const spuId = item.spuId
                                            if (!spuId) return
                                            onOpenProduct(spuId)
                                          }}
                                        >
                                          查看详情
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>

      {msg ? (
        <div className="recommend-empty">
          <h3 className="recommend-empty-title">
            {msg === '暂无推荐结果' ? '暂无推荐结果' : msg}
          </h3>
          <p className="recommend-empty-desc">
            {!isLoggedIn
              ? '登录后可根据你的身材档案展示个性化推荐。'
              : '你可以先新增身材档案，或切换其他档案查看推荐。'}
          </p>
        </div>
      ) : null}

    </div>
  )
}








