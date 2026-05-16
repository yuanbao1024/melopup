import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useAppState } from '../context/AppContext'
import { musicService } from '../services/musicService'
import PetSprite, { type SpriteState } from './PetSprite'
import './PetDog.css'

const MOOD_LABELS: Record<string, string> = {
  idle: '待命',
  listening: '音频输入中',
  happy: '能量满载',
  sleeping: '休眠中',
  dancing: '节奏同步',
  thinking: '运算中',
}

const MOOD_EMOJIS: Record<string, string> = {
  idle: '⚡',
  listening: '🎧',
  happy: '🔥',
  sleeping: '💤',
  dancing: '🎸',
  thinking: '💠',
}

const AVAILABLE_PETS = [
  { id: 'tiko', name: 'Tiko', src: 'https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev/pets/tiko-beefcdec1197/sprite.webp' },
  { id: 'doraemon', name: '哆啦A梦', src: 'https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev/pets/doraemon-58b12a5012e0/sprite.webp' },
  { id: 'boba', name: 'Boba', src: 'https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev/curated/boba/spritesheet.webp' },
  { id: 'eve', name: 'EVE', src: 'https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev/pets/eve-743f1e0e6b0d/sprite.webp' },
  { id: 'purplewolf', name: 'PurpleWolf', src: 'https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev/pets/purplewolf-77c7be3fdc4c/sprite.webp' },
]

function moodToSpriteState(mood: string): SpriteState {
  switch (mood) {
    case 'idle': return 'idle'
    case 'listening': return 'waiting'
    case 'happy': return 'waving'
    case 'sleeping': return 'idle'
    case 'dancing': return 'jumping'
    case 'thinking': return 'review'
    default: return 'idle'
  }
}

export default function PetDog() {
  const { state, dispatch } = useAppState()
  const { petMood, isPlaying } = state
  const [petting, setPetting] = useState(false)
  const [clickRing, setClickRing] = useState(false)
  const [beatActive, setBeatActive] = useState(false)
  const beatRef = useRef(false)
  const animFrameRef = useRef<number>(0)
  const [activePet, setActivePet] = useState(AVAILABLE_PETS[0])
  const petKeyRef = useRef(0)

  const handlePet = useCallback(() => {
    setPetting(true)
    setClickRing(true)
    dispatch({ type: 'SET_PET_MOOD', payload: 'happy' })

    setTimeout(() => setClickRing(false), 600)
    setTimeout(() => {
      setPetting(false)
      if (!isPlaying) {
        dispatch({ type: 'SET_PET_MOOD', payload: 'idle' })
      } else {
        dispatch({ type: 'SET_PET_MOOD', payload: 'listening' })
      }
    }, 1000)
  }, [dispatch, isPlaying])

  useEffect(() => {
    const updateBeat = () => {
      if (!isPlaying) {
        if (beatRef.current) {
          beatRef.current = false
          setBeatActive(false)
        }
        animFrameRef.current = requestAnimationFrame(updateBeat)
        return
      }
      const data = musicService.getAnalyserData()
      if (data.length > 0) {
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        const active = avg > 60
        if (active !== beatRef.current) {
          beatRef.current = active
          setBeatActive(active)
        }
      }
      animFrameRef.current = requestAnimationFrame(updateBeat)
    }
    animFrameRef.current = requestAnimationFrame(updateBeat)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isPlaying])

  const handleSelectPet = useCallback((petId: string) => {
    const pet = AVAILABLE_PETS.find(p => p.id === petId)
    if (pet) {
      setActivePet(pet)
      petKeyRef.current += 1
    }
  }, [])

  const spriteState = moodToSpriteState(petMood)

  return (
    <div className="pet-container">
      <div className="pet-mood-indicator">
        <div className="mood-indicator-glow" />
        <span className="mood-emoji">{MOOD_EMOJIS[petMood]}</span>
        <span className="mood-label">{MOOD_LABELS[petMood]}</span>
      </div>

      <div className="pet-card">
        <div className="pet-card-shine" />

        {clickRing && <div className="dog-click-ring" />}

        <div
          key={petKeyRef.current}
          className={`pet-sprite-wrapper ${beatActive && isPlaying ? 'beat-active' : ''}`}
          onClick={handlePet}
        >
          <PetSprite
            src={activePet.src}
            state={spriteState}
            scale={1.15}
          />
        </div>
      </div>

      <div className="pet-pick-list">
        {AVAILABLE_PETS.map((pet) => (
          <button
            key={pet.id}
            className={`pet-pick-btn ${activePet.id === pet.id ? 'active' : ''}`}
            onClick={() => handleSelectPet(pet.id)}
          >
            {pet.name}
          </button>
        ))}
      </div>
    </div>
  )
}
