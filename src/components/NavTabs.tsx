import React from 'react'
import { useAppState } from '../context/AppContext'
import { AppView } from '../types'
import './NavTabs.css'

interface Tab {
  id: AppView
  label: string
  icon: React.ReactNode
}

const StickerDog = () => (
  <svg viewBox="0 0 48 48" fill="none" className="nav-svg-icon">
    <defs>
      <linearGradient id="dogBg" x1="0" y1="0" x2="48" y2="48">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <linearGradient id="dogEarG" x1="0" y1="0" x2="0" y2="20">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#5b21b6" />
      </linearGradient>
      <linearGradient id="dogNoseG" x1="0" y1="0" x2="16" y2="16">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
      <radialGradient id="dogBlushG" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(244,114,182,0.35)" />
        <stop offset="100%" stopColor="rgba(244,114,182,0)" />
      </radialGradient>
    </defs>
    <rect x="3" y="3" width="42" height="42" rx="13" fill="rgba(167,139,250,0.12)" stroke="rgba(167,139,250,0.15)" strokeWidth="0.5" />
    <ellipse cx="24" cy="30" rx="15" ry="11" fill="url(#dogBg)" />
    <path d="M13 18c-4-3-7 3-5 10l4-4z" fill="url(#dogEarG)" />
    <path d="M35 18c4-3 7 3 5 10l-4-4z" fill="url(#dogEarG)" />
    <ellipse cx="24" cy="18" rx="13" ry="11" fill="url(#dogBg)" />
    <ellipse cx="18" cy="16" rx="4.5" ry="5.5" fill="#fff" opacity="0.95" />
    <ellipse cx="30" cy="16" rx="4.5" ry="5.5" fill="#fff" opacity="0.95" />
    <circle cx="19" cy="16" r="3.5" fill="#1e1b4b" />
    <circle cx="29" cy="16" r="3.5" fill="#1e1b4b" />
    <circle cx="17.8" cy="14.5" r="1.2" fill="#fff" />
    <circle cx="27.8" cy="14.5" r="1.2" fill="#fff" />
    <ellipse cx="24" cy="22" rx="3.5" ry="2.5" fill="url(#dogNoseG)" />
    <path d="M22.5 24.5c1 1.2 3 1.2 4 0" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
    <ellipse cx="15" cy="23" rx="5" ry="3.5" fill="url(#dogBlushG)" />
    <ellipse cx="33" cy="23" rx="5" ry="3.5" fill="url(#dogBlushG)" />
  </svg>
)

const StickerChat = () => (
  <svg viewBox="0 0 48 48" fill="none" className="nav-svg-icon">
    <defs>
      <linearGradient id="chatB" x1="0" y1="0" x2="48" y2="48">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="42" height="42" rx="13" fill="rgba(96,165,250,0.12)" stroke="rgba(96,165,250,0.15)" strokeWidth="0.5" />
    <path d="M9 14a6 6 0 016-6h18a6 6 0 016 6v11a6 6 0 01-6 6H21l-7 5.5v-5.5h-3a6 6 0 01-6-6V14z" fill="url(#chatB)" />
    <path d="M9 14a6 6 0 016-6h18a6 6 0 016 6v11a6 6 0 01-6 6H21l-7 5.5v-5.5h-3a6 6 0 01-6-6V14z" fill="#fff" opacity="0.15" />
    <circle cx="17" cy="18" r="2.5" fill="#fff" />
    <circle cx="24" cy="18" r="2.5" fill="#fff" />
    <circle cx="31" cy="18" r="2.5" fill="#fff" />
  </svg>
)

const StickerSparkle = () => (
  <svg viewBox="0 0 48 48" fill="none" className="nav-svg-icon">
    <defs>
      <linearGradient id="sparkleG" x1="0" y1="0" x2="48" y2="48">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="sparkleG2" x1="0" y1="0" x2="24" y2="24">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
      <linearGradient id="sparkleG3" x1="0" y1="0" x2="24" y2="24">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="42" height="42" rx="13" fill="rgba(251,191,36,0.12)" stroke="rgba(251,191,36,0.15)" strokeWidth="0.5" />
    <path d="M24 7l2.5 7.5L34 17l-7.5 2.5L24 27l-2.5-7.5L14 17l7.5-2.5z" fill="url(#sparkleG)" />
    <path d="M37 31l-1.5 3-3 1.5 3 1.5 1.5 3 1.5-3 3-1.5-3-1.5z" fill="url(#sparkleG2)" />
    <path d="M11 33l-1.2 2.8L7 37l2.8 1.2L11 41l1.2-2.8L15 37l-2.8-1.2z" fill="url(#sparkleG3)" />
    <path d="M37 17l-1 2-2 1 2 1 1 2 1-2 2-1-2-1z" fill="url(#sparkleG2)" opacity="0.8" />
    <circle cx="13" cy="14" r="2.5" fill="#fde68a" opacity="0.7" />
  </svg>
)

const StickerMusic = () => (
  <svg viewBox="0 0 48 48" fill="none" className="nav-svg-icon">
    <defs>
      <linearGradient id="musicG" x1="0" y1="0" x2="48" y2="48">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="50%" stopColor="#ec4899" />
        <stop offset="100%" stopColor="#db2777" />
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="42" height="42" rx="13" fill="rgba(244,114,182,0.12)" stroke="rgba(244,114,182,0.15)" strokeWidth="0.5" />
    <path d="M20 33V14l16-3v15" stroke="url(#musicG)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="16" cy="34" r="4.5" fill="url(#musicG)" />
    <circle cx="32" cy="31" r="4.5" fill="url(#musicG)" />
    <circle cx="16" cy="34" r="1.8" fill="#fff" opacity="0.4" />
    <circle cx="32" cy="31" r="1.8" fill="#fff" opacity="0.4" />
    <path d="M21 19l12-2" stroke="url(#musicG)" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const StickerPlaylist = () => (
  <svg viewBox="0 0 48 48" fill="none" className="nav-svg-icon">
    <defs>
      <linearGradient id="listG" x1="0" y1="0" x2="48" y2="48">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="50%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="42" height="42" rx="13" fill="rgba(52,211,153,0.12)" stroke="rgba(52,211,153,0.15)" strokeWidth="0.5" />
    <circle cx="13" cy="15" r="2" fill="url(#listG)" />
    <path d="M19 15h16" stroke="url(#listG)" strokeWidth="2.8" strokeLinecap="round" />
    <circle cx="13" cy="24" r="2" fill="url(#listG)" />
    <path d="M19 24h16" stroke="url(#listG)" strokeWidth="2.8" strokeLinecap="round" />
    <circle cx="13" cy="33" r="2" fill="url(#listG)" />
    <path d="M19 33h10" stroke="url(#listG)" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M37 28l-8 5v-10l8 5z" fill="url(#listG)" />
    <path d="M37 28l-8 5v-10l8 5z" fill="#fff" opacity="0.15" />
  </svg>
)

const tabs: Tab[] = [
  { id: 'pet', label: '宠物', icon: <StickerDog /> },
  { id: 'ai', label: 'MeloPup交互', icon: <StickerChat /> },
  { id: 'taste', label: 'AI品味推荐', icon: <StickerSparkle /> },
  { id: 'player', label: '播放', icon: <StickerMusic /> },
  { id: 'playlist', label: '歌单', icon: <StickerPlaylist /> },
]

export default function NavTabs() {
  const { state, dispatch } = useAppState()
  const { view } = state

  return (
    <nav className="nav-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab ${view === tab.id ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_VIEW', payload: tab.id })}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
          {view === tab.id && <span className="tab-indicator" />}
        </button>
      ))}
    </nav>
  )
}
