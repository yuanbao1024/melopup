import React, { useEffect, useRef } from 'react'
import { AppProvider, useAppState } from './context/AppContext'
import { musicService } from './services/musicService'
import { setNeteaseCookie } from './services/api'
import { userProfile } from './services/userProfile'
import PetDog from './components/PetDog'
import AmbientCanvas from './components/AmbientCanvas'
import MusicPlayer from './components/MusicPlayer'
import PlaylistPanel from './components/PlaylistPanel'
import AIPanel from './components/AIPanel'
import TastePanel from './components/TastePanel'
import SettingsPanel from './components/SettingsPanel'
import NavTabs from './components/NavTabs'
import './App.css'

const COOKIE_STORAGE_KEY = 'netease_cloud_cookie'

function AppContent() {
  const { state, dispatch } = useAppState()
  const { view, currentSong } = state
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (audioRef.current) {
      musicService.init(audioRef.current)
    }

    const savedCookie = localStorage.getItem(COOKIE_STORAGE_KEY)
    if (savedCookie) {
      setNeteaseCookie(savedCookie).catch(() => {})
    }

    musicService.onTimeUpdateCallback((time) => {
      dispatch({ type: 'SET_CURRENT_TIME', payload: time })
    })

    musicService.onEndedCallback(() => {
      musicService.next().then(() => {
        dispatch({ type: 'SET_CURRENT_SONG', payload: musicService.getCurrentSong() })
      })
    })

    musicService.onPlayStateChangeCallback((playing) => {
      dispatch({ type: 'SET_IS_PLAYING', payload: playing })
      if (playing) {
        dispatch({ type: 'SET_PET_MOOD', payload: 'listening' })
        const song = musicService.getCurrentSong()
        if (song) {
          dispatch({ type: 'SET_CURRENT_SONG', payload: song })
        }
      } else {
        dispatch({ type: 'SET_PET_MOOD', payload: 'sleeping' })
      }
    })

    musicService.subscribe(() => {
      const song = musicService.getCurrentSong()
      if (song) {
        dispatch({ type: 'SET_CURRENT_SONG', payload: song })
      }
      dispatch({ type: 'SET_DURATION', payload: musicService.getDuration() })
      dispatch({ type: 'SET_CURRENT_TIME', payload: musicService.getCurrentTime() })
    })

    return () => {
      musicService.onTimeUpdate = null
      musicService.onEnded = null
      musicService.onPlayStateChange = null
    }
  }, [dispatch])

  useEffect(() => {
    if (currentSong && currentSong.id && currentSong.url) {
      userProfile.recordPlay(currentSong)
      dispatch({ type: 'SET_USER_PROFILE', payload: userProfile.getProfile() })
    }
  }, [currentSong?.id])

  const renderContent = () => {
    switch (view) {
      case 'pet':
        return (
          <div className="pet-view">
            <PetDog />
            {currentSong && (
              <div className="pet-song-bar" onClick={() => dispatch({ type: 'SET_VIEW', payload: 'player' })}>
                <div className="pet-song-bar-cover">
                  {currentSong.name?.charAt(0) || '♪'}
                </div>
                <div className="pet-song-bar-info">
                  <div className="pet-song-bar-name">{currentSong.name}</div>
                  <div className="pet-song-bar-artist">{currentSong.artist}</div>
                </div>
                <div className={`pet-song-bar-indicator ${state.isPlaying ? 'playing' : ''}`}>
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>
        )
      case 'player':
        return <MusicPlayer />
      case 'playlist':
        return <PlaylistPanel />
      case 'ai':
        return <AIPanel />
      case 'taste':
        return <TastePanel />
      case 'settings':
        return <SettingsPanel />
      default:
        return <PetDog />
    }
  }

  return (
    <div className="app">
      <div className="app-background">
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
        <div className="bg-orb orb-3" />
        <div className="bg-grid" />
      </div>

      <audio ref={audioRef} preload="metadata" />

      <div className="app-container">
        <div className="app-header">
          <div className="title-section">
            <svg viewBox="0 0 28 28" fill="none" className="app-logo-svg">
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <rect width="28" height="28" rx="8" fill="url(#logoGrad)" />
              <ellipse cx="14" cy="18" rx="8" ry="6" fill="#fff" opacity="0.2" />
              <ellipse cx="14" cy="11" rx="7" ry="6" fill="#fff" opacity="0.9" />
              <circle cx="11" cy="10" r="2" fill="#1e1b4b" />
              <circle cx="17" cy="10" r="2" fill="#1e1b4b" />
              <circle cx="10.5" cy="9" r="0.7" fill="#fff" />
              <circle cx="16.5" cy="9" r="0.7" fill="#fff" />
              <ellipse cx="14" cy="14" rx="2" ry="1.5" fill="#f472b6" />
            </svg>
            <span className="app-title">MeloPup</span>
          </div>
          <button
            className="settings-icon-btn"
            onClick={() =>
              dispatch({
                type: 'SET_VIEW',
                payload: view === 'settings' ? 'pet' : 'settings',
              })
            }
            title="设置"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.611 3.611 0 0112 15.6z" />
            </svg>
          </button>
        </div>

        <div className="app-content">
          {renderContent()}
        </div>

        {view !== 'settings' && (
          <div className="app-nav">
            <NavTabs />
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
