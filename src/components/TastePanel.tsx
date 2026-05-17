import React, { useState, useEffect, useCallback } from 'react'
import { useAppState } from '../context/AppContext'
import { userProfile } from '../services/userProfile'
import { getTasteSummary, getProfileRecommendations } from '../services/aiService'
import { searchSongs, getSongUrl } from '../services/api'
import { musicService } from '../services/musicService'
import { Song } from '../types'
import './TastePanel.css'

interface RecSong {
  name: string
  artist: string
  reason: string
  matchScore: number
  cover?: string
  neteaseId?: string
}

interface TasteData {
  summary: string
  genres: { name: string; percentage: number; emoji: string }[]
  funFact: string
  vibe: string
  vibeColor: string
}

interface CacheData {
  timestamp: number
  tasteSummary: TasteData | null
  recommendedSongs: RecSong[]
}

const CACHE_KEY = 'taste_cache'
const CACHE_TTL = 1800000

const GENRE_COLORS = [
  'linear-gradient(135deg, #8b5cf6, #a78bfa)',
  'linear-gradient(135deg, #00e5ff, #26c6da)',
  'linear-gradient(135deg, #f472b6, #ec4899)',
  'linear-gradient(135deg, #fbbf24, #f59e0b)',
  'linear-gradient(135deg, #34d399, #10b981)',
]

function loadCache(): CacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const data: CacheData = JSON.parse(raw)
    if (Date.now() - data.timestamp < CACHE_TTL) {
      return data
    }
  } catch {
    // ignore
  }
  return null
}

function saveCache(tasteSummary: TasteData | null, recommendedSongs: RecSong[]) {
  try {
    const data: CacheData = { timestamp: Date.now(), tasteSummary, recommendedSongs }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

export default function TastePanel() {
  const { state, dispatch } = useAppState()
  const apiConfigured = state.apiConfigured

  const [tasteSummary, setTasteSummary] = useState<TasteData | null>(null)
  const [isLoadingTaste, setIsLoadingTaste] = useState(false)
  const [tasteError, setTasteError] = useState<string | null>(null)

  const [recommendedSongs, setRecommendedSongs] = useState<RecSong[]>([])
  const [isLoadingRecs, setIsLoadingRecs] = useState(false)
  const [recError, setRecError] = useState<string | null>(null)

  const [profileState, setProfileState] = useState(() => userProfile.getProfile())
  const [lastRefresh, setLastRefresh] = useState(0)
  const [coverMap, setCoverMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const unsub = userProfile.subscribe(() => {
      setProfileState(userProfile.getProfile())
    })
    return () => { unsub() }
  }, [])

  const loadData = useCallback(async () => {
    if (!apiConfigured) return

    const cached = loadCache()
    if (cached) {
      setTasteSummary(cached.tasteSummary)
      setRecommendedSongs(cached.recommendedSongs)
      return
    }

    setIsLoadingTaste(true)
    setIsLoadingRecs(true)
    setTasteError(null)
    setRecError(null)

    const personalitySummary = userProfile.getPersonalitySummary()

    const [tasteResult, recResult] = await Promise.allSettled([
      getTasteSummary(personalitySummary),
      getProfileRecommendations(personalitySummary),
    ])

    let taste: TasteData | null = null
    let recs: RecSong[] = []

    if (tasteResult.status === 'fulfilled') {
      taste = tasteResult.value
      setTasteSummary(taste)
    } else {
      setTasteError(tasteResult.reason?.message || '加载品味分析失败')
    }

    if (recResult.status === 'fulfilled') {
      recs = recResult.value.slice(0, 10)
      setRecommendedSongs(recs)
    } else {
      setRecError(recResult.reason?.message || '加载推荐失败')
    }

    saveCache(taste, recs)

    setIsLoadingTaste(false)
    setIsLoadingRecs(false)
  }, [apiConfigured])

  useEffect(() => {
    if (apiConfigured) {
      setCoverMap({})
      loadData()
    }
  }, [apiConfigured, lastRefresh, loadData])

  useEffect(() => {
    if (recommendedSongs.length === 0) return

    let cancelled = false

    const loadCovers = async () => {
      const map: Record<string, string> = {}
      for (const song of recommendedSongs) {
        if (cancelled) break
        try {
          const result = await searchSongs(`${song.name} ${song.artist}`, 1)
          const found = result.songs[0]
          if (found?.cover) {
            map[`${song.name}-${song.artist}`] = found.cover
          }
        } catch {
          // ignore
        }
      }
      if (!cancelled) {
        setCoverMap(map)
      }
    }

    loadCovers()
    return () => { cancelled = true }
  }, [recommendedSongs])

  const handleRefresh = useCallback(() => {
    localStorage.removeItem(CACHE_KEY)
    setLastRefresh(Date.now())
  }, [])

  const handlePlayRecSong = useCallback(async (rec: RecSong) => {
    try {
      await musicService.ensureAudioGraph()
      await musicService.ensureGesture()
      let songToPlay: Song | null = null
      if (rec.neteaseId) {
        const url = await getSongUrl(rec.neteaseId)
        if (url) {
          songToPlay = {
            id: rec.neteaseId,
            name: rec.name,
            artist: rec.artist,
            cover: rec.cover,
            path: `netease://${rec.neteaseId}`,
            duration: 0,
            url,
          }
        }
      }
      if (!songToPlay) {
        const result = await searchSongs(`${rec.name} ${rec.artist}`, 1)
        const found = result.songs[0]
        if (found) {
          const url = await getSongUrl(found.id)
          if (url) songToPlay = { ...found, url }
        }
      }
      if (!songToPlay) return

      const allSongs: Song[] = recommendedSongs.map(r => ({
        id: r.neteaseId || r.name,
        name: r.name,
        artist: r.artist,
        cover: r.cover || coverMap[`${r.name}-${r.artist}`],
        path: r.neteaseId ? `netease://${r.neteaseId}` : r.name,
        duration: 0,
      }))

      const playIdx = allSongs.findIndex(s => s.id === songToPlay!.id)
      if (playIdx >= 0) {
        allSongs[playIdx] = songToPlay
        musicService.setPlaylist(allSongs)
        dispatch({ type: 'SET_PLAYLIST', payload: allSongs })
        await musicService.playSong(playIdx)
      } else {
        musicService.setPlaylist([songToPlay])
        dispatch({ type: 'SET_PLAYLIST', payload: [songToPlay] })
        await musicService.playSong(0)
      }
      dispatch({ type: 'SET_CURRENT_SONG', payload: musicService.getCurrentSong() })
      dispatch({ type: 'SET_IS_PLAYING', payload: true })
      dispatch({ type: 'SET_PET_MOOD', payload: 'listening' })
    } catch {
    }
  }, [dispatch, recommendedSongs, coverMap])

  const p = profileState.personality

  if (!apiConfigured) {
    return (
      <div className="taste-panel">
        <div className="taste-empty-state">
          <span className="taste-empty-icon">🤖</span>
          <h3>AI 品味推荐</h3>
          <p>请在设置中配置 AI API 密钥，解锁你的专属音乐品味分析</p>
        </div>
      </div>
    )
  }

  return (
    <div className="taste-panel">
      {/* ===== Merged Hero + Taste Summary ===== */}
      <div
        className="taste-hero-card"
        style={tasteSummary ? { background: `linear-gradient(135deg, ${tasteSummary.vibeColor}18, ${tasteSummary.vibeColor}08)` } : undefined}
      >
        <div className="taste-hero-top">
          <div className="taste-hero-identity">
            <span className="taste-hero-emoji">{p.emoji}</span>
            <div>
              <h2 className="taste-hero-type">{p.type}</h2>
              <p className="taste-hero-desc">{p.description}</p>
            </div>
          </div>
          <button className="taste-refresh-btn" onClick={handleRefresh} title="刷新分析">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
              <path d="M1 4v6h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="taste-hero-traits">
          {p.traits.map((trait, i) => (
            <span key={i} className="taste-hero-trait">{trait}</span>
          ))}
        </div>

        {/* AI Taste Summary inline */}
        {isLoadingTaste ? (
          <div className="taste-hero-loading">
            <div className="taste-loading-spinner" />
            <span>AI 正在分析你的音乐品味...</span>
          </div>
        ) : tasteError ? (
          <div className="taste-hero-error">
            <span>{tasteError}</span>
            <button className="taste-retry-btn" onClick={loadData}>重试</button>
          </div>
        ) : tasteSummary ? (
          <div className="taste-hero-analysis">
            <div className="taste-hero-summary">{tasteSummary.summary}</div>
            <div className="taste-hero-genres">
              {tasteSummary.genres.map((genre, i) => (
                <span key={genre.name} className="taste-hero-genre-tag" style={{ background: GENRE_COLORS[i % GENRE_COLORS.length] }}>
                  {genre.emoji} {genre.name}
                </span>
              ))}
            </div>
            <div className="taste-hero-footer">
              <span className="taste-vibe-badge" style={{ background: tasteSummary.vibeColor }}>
                ✦ {tasteSummary.vibe}
              </span>
              <span className="taste-fun-fact">
                <span className="taste-fun-fact-icon">💡</span>
                {tasteSummary.funFact}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* ===== AI Recommended Songs (60%) ===== */}
      <div className="taste-rec-section">
        <div className="taste-section-header">
          <span className="taste-section-icon">🎵</span>
          <span className="taste-section-title">AI 推荐曲目</span>
          <button className="taste-rec-refresh-btn" onClick={handleRefresh}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
              <path d="M1 4v6h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            换一批
          </button>
        </div>
        {isLoadingRecs ? (
          <div className="taste-rec-loading">
            <div className="taste-loading-spinner" />
            <p>AI 正在为你推荐歌曲...</p>
          </div>
        ) : recError ? (
          <div className="taste-rec-error">
            <p>{recError}</p>
            <button className="taste-retry-btn" onClick={loadData}>重试</button>
          </div>
        ) : recommendedSongs.length > 0 ? (
          <div className="taste-rec-list">
            {recommendedSongs.map((song, i) => (
              <div key={`${song.name}-${song.artist}-${i}`} className="taste-rec-item" onClick={() => handlePlayRecSong(song)}>
                {coverMap[`${song.name}-${song.artist}`] ? (
                  <img className="taste-rec-cover" src={coverMap[`${song.name}-${song.artist}`]} alt={song.name} />
                ) : (
                  <div className="taste-rec-cover-placeholder">♪</div>
                )}
                <div className="taste-rec-info">
                  <div className="taste-rec-name">{song.name}</div>
                  <div className="taste-rec-artist">{song.artist}</div>
                  <div className="taste-rec-reason">{song.reason}</div>
                </div>
                <div className="taste-rec-score-section">
                  <div className="taste-rec-score">{song.matchScore}%</div>
                  <div className="taste-rec-score-bar">
                    <div className="taste-rec-score-fill" style={{ width: `${song.matchScore}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="taste-rec-empty">
            <p>点击刷新获取 AI 推荐</p>
          </div>
        )}
      </div>
    </div>
  )
}
