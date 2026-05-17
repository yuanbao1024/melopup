import React, { useEffect, useRef, useState } from 'react'
import { useAppState } from '../context/AppContext'
import { musicService } from '../services/musicService'
import { userProfile } from '../services/userProfile'
import { getSongUrl, getLyric } from '../services/api'
import { Song } from '../types'
import './MusicPlayer.css'

interface LyricLine {
  time: number
  text: string
}

export default function MusicPlayer() {
  const { state, dispatch } = useAppState()
  const { currentSong, isPlaying, currentTime, duration, volume } = state
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [lyricLoaded, setLyricLoaded] = useState(false)
  const [showVol, setShowVol] = useState(false)
  const [likeTick, setLikeTick] = useState(0)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    const fetchLyric = async () => {
      if (!currentSong?.id) {
        setLyrics([])
        setActiveIndex(-1)
        setLyricLoaded(false)
        return
      }
      setLyricLoaded(false)
      try {
        const lines = await getLyric(currentSong.id)
        setLyrics(lines)
        setActiveIndex(-1)
      } catch {
        setLyrics([])
      } finally {
        setLyricLoaded(true)
      }
    }
    fetchLyric()
  }, [currentSong?.id])

  useEffect(() => {
    if (lyrics.length === 0 || !isPlaying) return
    let idx = -1
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) {
        idx = i
        break
      }
    }
    if (idx !== activeIndex) {
      setActiveIndex(idx)
    }
  }, [currentTime, lyrics, isPlaying, activeIndex])

  useEffect(() => {
    if (activeIndex < 0 || !lyricsRef.current || !activeRef.current) return
    const container = lyricsRef.current
    const activeEl = activeRef.current
    const containerRect = container.getBoundingClientRect()
    const activeRect = activeEl.getBoundingClientRect()
    const offset = activeRect.top - containerRect.top - containerRect.height / 2 + activeRect.height / 2
    container.scrollBy({ top: offset, behavior: 'smooth' })
  }, [activeIndex])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      const data = musicService.getAnalyserData()
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const bars = 32
      const barWidth = canvas.width / bars - 2

      for (let i = 0; i < bars; i++) {
        const value = data[i] || 0
        const height = isPlaying ? (value / 255) * canvas.height * 0.8 : 1.5
        const x = i * (barWidth + 2)
        const t = (i / bars) * 0.5
        const r = Math.round(139 + (236 - 139) * t)
        const g = Math.round(92 + (72 - 92) * t)
        const b = Math.round(246 + (153 - 246) * t)

        ctx.fillStyle = isPlaying ? `rgb(${r},${g},${b})` : 'rgba(255,255,255,0.05)'
        ctx.beginPath()
        ctx.roundRect(x, canvas.height - height, barWidth, height, [1, 1, 0, 0])
        ctx.fill()
      }

      animationRef.current = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationRef.current)
  }, [isPlaying])

  const handleProgressClick = (e: React.MouseEvent) => {
    const rect = progressBarRef.current?.getBoundingClientRect()
    if (!rect || duration <= 0) return
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    musicService.seek(pct * duration)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const resolveSongUrl = async (song: Song): Promise<Song> => {
    if (song.url) return song
    if (!song.path.startsWith('netease://')) return song
    const url = await getSongUrl(song.id).catch(() => null)
    if (!url) return song
    return { ...song, url }
  }

  const handlePrev = async () => {
    const list = [...musicService.getPlaylist()]
    const idx = musicService.getCurrentIndex()
    if (list.length === 0) return
    const prevIdx = (idx - 1 + list.length) % list.length
    if (list[prevIdx]?.path.startsWith('netease://') && !list[prevIdx]?.url) {
      const resolved = await resolveSongUrl(list[prevIdx])
      list[prevIdx] = resolved
      musicService.setPlaylist(list)
      dispatch({ type: 'SET_PLAYLIST', payload: list })
    }
    await musicService.prev()
    dispatch({ type: 'SET_CURRENT_SONG', payload: musicService.getCurrentSong() })
    dispatch({ type: 'SET_IS_PLAYING', payload: musicService.getIsPlaying() })
  }

  const handleNext = async () => {
    const list = [...musicService.getPlaylist()]
    const idx = musicService.getCurrentIndex()
    if (list.length === 0) return
    const nextIdx = (idx + 1) % list.length
    if (list[nextIdx]?.path.startsWith('netease://') && !list[nextIdx]?.url) {
      const resolved = await resolveSongUrl(list[nextIdx])
      list[nextIdx] = resolved
      musicService.setPlaylist(list)
      dispatch({ type: 'SET_PLAYLIST', payload: list })
    }
    await musicService.next()
    dispatch({ type: 'SET_CURRENT_SONG', payload: musicService.getCurrentSong() })
    dispatch({ type: 'SET_IS_PLAYING', payload: musicService.getIsPlaying() })
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const firstChar = currentSong?.name?.trim().charAt(0)?.toUpperCase() || '?'

  return (
    <div className="lyrics-player">
      <div className="lp-header">
        <div className="lp-cover-wrap">
          <div className="lp-cover-avatar">
            <span className="lp-cover-char">{firstChar}</span>
          </div>
          <div className={`lp-cover-ring ${isPlaying ? 'spinning' : ''}`}>
            <svg viewBox="0 0 100 100" width="100%" height="100%">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="46" fill="none" stroke="url(#ringGrad)" strokeWidth="2" strokeDasharray="4 6" opacity="0.3" />
            </svg>
          </div>
        </div>
        <div className="lp-header-info">
          <div className="lp-song-name">{currentSong?.name || '未选择歌曲'}</div>
          <div className="lp-artist-name">{currentSong?.artist || '点击下方导入歌单'}</div>
        </div>
        <button
          className="lp-like-btn"
          onClick={() => {
            if (currentSong) {
              if (userProfile.isLiked(currentSong.id)) {
                userProfile.unlikeSong(currentSong.id)
              } else {
                userProfile.likeSong(currentSong)
              }
              setLikeTick(t => t + 1)
            }
          }}
          title={currentSong && userProfile.isLiked(currentSong.id) ? '取消收藏' : '收藏歌曲'}
        >
          <svg viewBox="0 0 24 24" fill={currentSong && userProfile.isLiked(currentSong.id) ? '#ec4899' : 'none'} stroke={currentSong && userProfile.isLiked(currentSong.id) ? '#ec4899' : 'rgba(255,255,255,0.3)'} strokeWidth="2" width="20" height="20">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>

      <div className="lp-progress-section">
        <div className="lp-progress-bar" ref={progressBarRef} onClick={handleProgressClick}>
          <div className="lp-progress-track">
            <div className="lp-progress-fill" style={{ width: `${progress}%` }} />
            <div className="lp-progress-thumb" style={{ left: `${progress}%` }} />
          </div>
        </div>
        <div className="lp-time-row">
          <span>{formatTime(currentTime)}</span>
          <canvas ref={canvasRef} width={120} height={20} className="lp-minibar" />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="lp-controls">
        <button className="lp-ctrl-btn" onClick={handlePrev} title="上一首">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        <button
          className={`lp-play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={() => musicService.togglePlay()}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button className="lp-ctrl-btn" onClick={handleNext} title="下一首">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>

        <div className="lp-vol-wrap">
          <button className="lp-ctrl-btn lp-vol-btn" onClick={() => setShowVol(!showVol)} title="音量">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              {volume === 0 ? (
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              ) : volume < 0.5 ? (
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm-2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              ) : (
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              )}
            </svg>
          </button>
          {showVol && (
            <div className="lp-vol-slider-wrap">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  musicService.setVolume(v)
                  dispatch({ type: 'SET_VOLUME', payload: v })
                }}
                className="lp-vol-slider"
              />
            </div>
          )}
        </div>
      </div>

      <div className="lp-lyrics-area" ref={lyricsRef}>
        {!currentSong ? (
          <div className="lp-lyrics-empty">
            <div className="lp-empty-icon">🎵</div>
            <p>选择一首歌曲开始欣赏</p>
          </div>
        ) : !lyricLoaded ? (
          <div className="lp-lyrics-empty">
            <div className="lp-loading-ring" />
            <p>加载歌词中...</p>
          </div>
        ) : lyrics.length === 0 ? (
          <div className="lp-lyrics-empty">
            <div className="lp-empty-equalizer">
              <span /><span /><span /><span /><span />
            </div>
            <p>暂无歌词</p>
            <span className="lp-empty-sub">静静享受音乐吧</span>
          </div>
        ) : (
          <div className="lp-lyrics-list">
            <div className="lp-lyrics-spacer" />
            {lyrics.map((line, i) => (
              <div
                key={i}
                ref={i === activeIndex ? activeRef : undefined}
                className={`lp-lyric-line ${i === activeIndex ? 'active' : ''} ${i < activeIndex ? 'past' : ''} ${i > activeIndex ? 'future' : ''}`}
              >
                <span className="lp-lyric-text">{line.text}</span>
                {i === activeIndex && <span className="lp-lyric-indicator">♪</span>}
              </div>
            ))}
            <div className="lp-lyrics-spacer" />
          </div>
        )}
      </div>
    </div>
  )
}
