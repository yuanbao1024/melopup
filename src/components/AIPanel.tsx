import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAppState } from '../context/AppContext'
import { userProfile } from '../services/userProfile'
import { memoryService } from '../services/memoryService'
import { analyzeSong, chatWithMemory } from '../services/aiService'
import { ChatMessage } from '../types'
import './AIPanel.css'

export default function AIPanel() {
  const { state, dispatch } = useAppState()
  const { currentSong, analysis, isAnalyzing, apiConfigured, userProfile: profile } = state

  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatting, setIsChatting] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [streamResponse, setStreamResponse] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [modalType, setModalType] = useState<'history' | 'liked' | null>(null)

  useEffect(() => {
    setChatMessages(memoryService.getConversation())
    const unsub = memoryService.subscribe(() => {
      setChatMessages([...memoryService.getConversation()])
    })
    return () => { unsub() }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, streamResponse])

  const handleAnalyze = useCallback(async () => {
    if (!currentSong || !apiConfigured) return
    setAnalyzeError(null)
    dispatch({ type: 'SET_IS_ANALYZING', payload: true })
    dispatch({ type: 'SET_ANALYSIS', payload: null })

    try {
      const summary = userProfile.getPersonalitySummary()
      const analysisResult = await analyzeSong(
        currentSong.name,
        currentSong.artist,
        summary
      )
      dispatch({ type: 'SET_ANALYSIS', payload: analysisResult })
    } catch (err: any) {
      setAnalyzeError(err.message || '分析失败，请重试')
    } finally {
      dispatch({ type: 'SET_IS_ANALYZING', payload: false })
    }
  }, [currentSong, apiConfigured, dispatch])

  const handleSendMessage = useCallback(async () => {
    const msg = chatInput.trim()
    if (!msg || isChatting || !apiConfigured) return

    setChatInput('')
    setChatError(null)
    setStreamResponse('')

    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: Date.now() }
    memoryService.addMessage(userMsg)
    setChatMessages([...memoryService.getConversation()])

    setIsChatting(true)

    try {
      const conversationHistory = memoryService.getConversation().map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const result = await chatWithMemory(
        msg,
        {
          currentSong: currentSong
            ? { name: currentSong.name, artist: currentSong.artist }
            : undefined,
          userProfileSummary: userProfile.getPersonalitySummary(),
          memorySummary: memoryService.getMemorySummary(),
          conversationHistory: conversationHistory.slice(-8, -1),
        },
        (text) => {
          setStreamResponse(text)
        }
      )

      const aiMsg: ChatMessage = { role: 'assistant', content: result, timestamp: Date.now() }
      memoryService.addMessage(aiMsg)
      memoryService.extractMemoriesFromResponse(result)
      setStreamResponse('')
    } catch (err: any) {
      setChatError(err.message || '发送失败')
    } finally {
      setIsChatting(false)
    }
  }, [chatInput, isChatting, apiConfigured, currentSong])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearChat = () => {
    memoryService.clearConversation()
    setChatMessages([])
  }

  const p = profile.personality
  const totalPlays = profile.totalPlays
  const likedCount = profile.likedSongDetails.length

  const activeProfile = userProfile.getProfile()
  const historySongs = [...activeProfile.listeningHistory].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <h2 className="ai-title">MeloPup 交互</h2>
        <div className="ai-header-actions">
          <button
            className="ai-header-btn"
            onClick={() => memoryService.downloadMemoryMd()}
            title="导出记忆"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="ai-content">
        <div className="personality-card">
          <div className="personality-emoji">{p.emoji}</div>
          <div className="personality-info">
            <div className="personality-type">{p.type}</div>
            <div className="personality-traits">
              {p.traits.map((trait, i) => (
                <span key={i} className="trait-tag">{trait}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat-item clickable" onClick={() => historySongs.length > 0 && setModalType('history')}>
            <span className="stat-value">{totalPlays}</span>
            <span className="stat-label">累计播放</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">{profile.uniqueArtists}</span>
            <span className="stat-label">不同歌手</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item clickable" onClick={() => profile.likedSongDetails.length > 0 && setModalType('liked')}>
            <span className="stat-value">{likedCount}</span>
            <span className="stat-label">收藏歌曲</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">{profile.topArtists[0]?.name || '-'}</span>
            <span className="stat-label">最爱歌手</span>
          </div>
        </div>

        <div className="ai-split-layout">
          <div className="ai-section song-analysis-section">
            <div className="section-header">
              <span className="section-icon">🎵</span>
              <span>歌曲分析</span>
            </div>

            {analyzeError && (
              <div className="section-error">
                <span>⚠️ {analyzeError}</span>
              </div>
            )}

            {!currentSong ? (
              <div className="section-empty">
                <div className="section-empty-icon">🎤</div>
                <p>先播放一首歌，AI 将自动分析其风格与特点</p>
              </div>
            ) : isAnalyzing ? (
              <div className="analyze-streaming">
                <div className="stream-indicator">
                  <span className="stream-dot-static" />
                  <span>AI 正在分析「{currentSong.name}」...</span>
                </div>
              </div>
            ) : analysis && analysis.songName === currentSong.name ? (
              <div className="analysis-result">
                <div className="analysis-song-info">
                  <div className="analysis-song-cover">
                    {currentSong.name?.charAt(0) || '♪'}
                  </div>
                  <div className="analysis-song-meta">
                    <div className="analysis-song-name">{analysis.songName}</div>
                    <div className="analysis-song-artist">{analysis.artist}</div>
                  </div>
                </div>

                <div className="analysis-sections">
                  {analysis.sections.map((section, i) => (
                    <div key={i} className="analysis-section-item">
                      <div className="analysis-section-title">
                        {section.title}
                      </div>
                      <p className="analysis-section-content">{section.content}</p>
                    </div>
                  ))}
                </div>

                {analysis.personalNote && (
                  <div className="analysis-note">
                    <span className="analysis-note-label">💬 感悟</span>
                    <p>{analysis.personalNote}</p>
                  </div>
                )}

                <div className="analysis-rating">
                  <span className="analysis-rating-label">评分</span>
                  <div className="analysis-rating-stars">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={i < Math.floor(analysis.rating / 2) ? 'star-filled' : 'star-empty'}>
                        ★
                      </span>
                    ))}
                    <span className="analysis-rating-num">{analysis.rating}/10</span>
                  </div>
                  <div className="analysis-rating-bar">
                    <div className="analysis-rating-fill" style={{ width: `${analysis.rating * 10}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="section-empty">
                <div className="section-empty-icon">🎵</div>
                <p>正在播放：{currentSong.name}</p>
                <button className="analyze-btn" onClick={handleAnalyze}>
                  分析这首歌的风格特点
                </button>
              </div>
            )}
          </div>

          <div className="ai-section chat-section">
            <div className="section-header">
              <span className="section-icon">💬</span>
              <span>音乐对话</span>
              {chatMessages.length > 0 && (
                <button className="chat-clear-btn" onClick={handleClearChat} title="清空对话">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>

            {chatError && (
              <div className="section-error">
                <span>⚠️ {chatError}</span>
              </div>
            )}

            <div className="chat-messages">
              {chatMessages.length === 0 && !isChatting && (
                <div className="chat-empty">
                  <div className="chat-empty-icon">🐕</div>
                  <p>和 MeloPup 聊聊音乐吧！</p>
                  <p className="chat-empty-hint">比如「推荐几首适合现在心情的歌」</p>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.role}`}>
                  <div className="chat-msg-avatar">
                    {msg.role === 'user' ? '👤' : '🐕'}
                  </div>
                  <div className="chat-msg-content">
                    <div className="chat-msg-text">{msg.content}</div>
                    <div className="chat-msg-time">
                      {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {isChatting && streamResponse && (
                <div className="chat-msg assistant">
                  <div className="chat-msg-avatar">🐕</div>
                  <div className="chat-msg-content">
                    <div className="chat-msg-text streaming-text">{streamResponse}</div>
                  </div>
                </div>
              )}

              {isChatting && !streamResponse && (
                <div className="chat-msg assistant">
                  <div className="chat-msg-avatar">🐕</div>
                  <div className="chat-msg-content">
                    <div className="chat-msg-text">
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-area">
              <textarea
                className="chat-input"
                placeholder="聊聊音乐吧..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isChatting}
              />
              <button
                className="chat-send-btn"
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isChatting || !apiConfigured}
              >
                {isChatting ? (
                  <div className="chat-send-spinner" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalType === 'history' && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">累计播放 · 共 {totalPlays} 次</h3>
              <button className="modal-close" onClick={() => setModalType(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-song-list">
              {historySongs.length === 0 ? (
                <div className="modal-empty">
                  <div className="modal-empty-icon">🎵</div>
                  <p>还没有播放记录</p>
                </div>
              ) : (
                historySongs.map((record, i) => (
                  <div key={`${record.songId}-${i}`} className="modal-song-item">
                    <div className="modal-song-cover-placeholder">
                      {record.songName?.charAt(0) || '♪'}
                    </div>
                    <div className="modal-song-info">
                      <div className="modal-song-name">{record.songName}</div>
                      <div className="modal-song-artist">{record.artist}</div>
                    </div>
                    <div className="modal-song-count">播放 {record.count} 次</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {modalType === 'liked' && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">收藏歌曲 · 共 {likedCount} 首</h3>
              <button className="modal-close" onClick={() => setModalType(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-song-list">
              {profile.likedSongDetails.length === 0 ? (
                <div className="modal-empty">
                  <div className="modal-empty-icon">❤️</div>
                  <p>还没有收藏歌曲</p>
                </div>
              ) : (
                profile.likedSongDetails.map((detail, i) => (
                  <div key={`${detail.id}-${i}`} className="modal-song-item">
                    <div className="modal-song-cover-placeholder">
                      {detail.name?.charAt(0) || '♪'}
                    </div>
                    <div className="modal-song-info">
                      <div className="modal-song-name">{detail.name}</div>
                      <div className="modal-song-artist">{detail.artist}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
