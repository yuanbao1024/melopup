import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { musicService } from '../services/musicService'
import { searchSongs, getSongUrl, getRecommendPlaylists, getPlaylistDetail } from '../services/api'
import { Song } from '../types'
import './PlaylistPanel.css'

interface RecommendPlaylist {
  id: number
  name: string
  cover: string
  trackCount: number
  playCount: number
  description: string
}

export default function PlaylistPanel() {
  const { state, dispatch } = useApp()
  const { currentSong, isPlaying } = state

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Song[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [recommendPlaylists, setRecommendPlaylists] = useState<RecommendPlaylist[]>([])
  const [selectedPlaylistSongs, setSelectedPlaylistSongs] = useState<Song[]>([])
  const [selectedPlaylistName, setSelectedPlaylistName] = useState('')
  const [loadingUrl, setLoadingUrl] = useState<number | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (recommendPlaylists.length === 0 && !hasSearched) {
      getRecommendPlaylists()
        .then((list) => setRecommendPlaylists(list))
        .catch(() => {})
    }
  }, [recommendPlaylists.length, hasSearched])

  const doSearch = useCallback(async (keywords: string) => {
    if (!keywords.trim()) return
    setIsSearching(true)
    setHasSearched(true)
    setSelectedPlaylistSongs([])
    setSelectedPlaylistName('')
    try {
      const result = await searchSongs(keywords, 30)
      setSearchResults(result.songs)
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!value.trim()) {
      setSearchResults([])
      setHasSearched(false)
      return
    }
    searchTimer.current = setTimeout(() => doSearch(value), 400)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (searchTimer.current) clearTimeout(searchTimer.current)
      doSearch(searchQuery)
    }
  }

  const handlePlaylistClick = async (pl: RecommendPlaylist) => {
    setIsSearching(true)
    setSearchResults([])
    setSearchQuery('')
    setHasSearched(true)
    try {
      const detail = await getPlaylistDetail(String(pl.id))
      setSelectedPlaylistName(detail.name)
      setSelectedPlaylistSongs(detail.tracks)
    } catch {
      setSelectedPlaylistSongs([])
    } finally {
      setIsSearching(false)
    }
  }

  const handlePlaySong = async (song: Song, index: number) => {
    if (loadingUrl !== null) return
    setLoadingUrl(index)

    try {
      await musicService.ensureAudioGraph()
      await musicService.ensureGesture()

      if (song.path.startsWith('netease://') && !song.url) {
        const url = await getSongUrl(song.id)
        if (!url) {
          console.error('无法获取播放地址（可能为VIP歌曲）')
          setLoadingUrl(null)
          return
        }
        song = { ...song, url }
      }

      const sourceList = selectedPlaylistSongs.length > 0 ? selectedPlaylistSongs : searchResults
      const updatedSource = sourceList.map((s, i) =>
        i === index ? song : s
      )

      if (selectedPlaylistSongs.length > 0) {
        setSelectedPlaylistSongs(updatedSource)
      } else {
        setSearchResults(updatedSource)
      }

      musicService.setPlaylist(updatedSource)
      dispatch({ type: 'SET_PLAYLIST', payload: updatedSource })

      await musicService.playSong(index)
      dispatch({ type: 'SET_CURRENT_SONG', payload: musicService.getCurrentSong() })
      dispatch({ type: 'SET_IS_PLAYING', payload: true })
      dispatch({ type: 'SET_PET_MOOD', payload: 'listening' })
    } catch (err) {
      console.error('播放失败:', err)
      dispatch({ type: 'SET_PET_MOOD', payload: 'idle' })
      dispatch({ type: 'SET_IS_PLAYING', payload: false })
    } finally {
      setLoadingUrl(null)
    }
  }

  const handlePlayAll = async () => {
    const songs = selectedPlaylistSongs.length > 0 ? selectedPlaylistSongs : searchResults
    if (songs.length === 0) return

    try {
      await musicService.ensureAudioGraph()
      await musicService.ensureGesture()

      const songsWithUrls = await Promise.all(
        songs.map(async (song) => {
          if (song.path.startsWith('netease://') && !song.url) {
            const url = await getSongUrl(song.id, 320000)
            return { ...song, url: url || '' }
          }
          return song
        })
      )

      const validSongs = songsWithUrls.filter((s) => s.url)
      if (validSongs.length === 0) return

      musicService.addToPlaylist(validSongs)
      const fullPlaylist = musicService.getPlaylist()
      dispatch({ type: 'SET_PLAYLIST', payload: fullPlaylist })

      const songIndex = fullPlaylist.length - validSongs.length
      await musicService.playSong(songIndex)
      dispatch({ type: 'SET_CURRENT_SONG', payload: musicService.getCurrentSong() })
      dispatch({ type: 'SET_IS_PLAYING', payload: true })
      dispatch({ type: 'SET_PET_MOOD', payload: 'listening' })
    } catch (err) {
      console.error('播放失败:', err)
      dispatch({ type: 'SET_PET_MOOD', payload: 'idle' })
      dispatch({ type: 'SET_IS_PLAYING', payload: false })
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatPlayCount = (count: number) => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
    return String(count)
  }

  const currentSongId = currentSong?.id
  const displaySongs = selectedPlaylistSongs.length > 0 ? selectedPlaylistSongs : searchResults

  return (
    <div className="playlist-panel">
      <div className="search-bar">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="搜索歌曲、歌手、专辑..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); setHasSearched(false) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="playlist-content">
        {isSearching ? (
          <div className="loading-state">
            <div className="loading-ring" />
            <p>搜索中...</p>
          </div>
        ) : displaySongs.length > 0 ? (
          <>
            {selectedPlaylistName && (
              <button className="playlist-back-btn" onClick={() => { setSelectedPlaylistSongs([]); setSelectedPlaylistName(''); setHasSearched(false) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                返回歌单推荐
              </button>
            )}
            <div className="playlist-subheader">
              <span className="playlist-subtitle">
                {selectedPlaylistName || `搜索结果"${searchQuery}"`}
              </span>
              <span className="song-count">{displaySongs.length} 首</span>
            </div>
            {!selectedPlaylistName && displaySongs.length > 0 && (
              <button className="play-all-btn" onClick={handlePlayAll}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M8 5v14l11-7z" />
                </svg>
                全部播放
              </button>
            )}
            <div className="song-list">
              {displaySongs.map((song, i) => {
                const isActive = song.id === currentSongId
                const isLoading = loadingUrl === i
                return (
                  <div
                    key={`${song.id}-${i}`}
                    className={`song-item${isActive ? ' active' : ''}`}
                    onClick={() => handlePlaySong(song, i)}
                  >
                    <div className="song-index">
                      {isActive ? (
                        <div className="playing-indicator"><span /><span /><span /></div>
                      ) : isLoading ? (
                        <div className="loading-spinner" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    {song.cover && (
                      <img src={song.cover} alt="" className="song-cover" />
                    )}
                    <div className="song-details">
                      <div className="song-name">{song.name}</div>
                      <div className="song-artist">{song.artist || '未知艺术家'}</div>
                    </div>
                    <div className="song-duration">{formatDuration(song.duration)}</div>
                  </div>
                )
              })}
            </div>
          </>
        ) : recommendPlaylists.length > 0 && !hasSearched ? (
          <div className="recommend-section">
            <div className="recommend-header">
              <span className="recommend-title">推荐歌单</span>
            </div>
            <div className="recommend-grid">
              {recommendPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  className="recommend-card"
                  onClick={() => handlePlaylistClick(pl)}
                >
                  <div className="recommend-cover-wrap">
                    <img src={pl.cover} alt={pl.name} className="recommend-cover" />
                    <div className="recommend-overlay">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <span className="recommend-playcount">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      {formatPlayCount(pl.playCount)}
                    </span>
                  </div>
                  <div className="recommend-name">{pl.name}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🎵</div>
            <p>搜索你喜欢的歌曲</p>
            <p className="empty-hint">支持网易云音乐海量曲库</p>
          </div>
        )}
      </div>
    </div>
  )
}
