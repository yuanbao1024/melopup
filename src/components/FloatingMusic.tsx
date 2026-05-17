import React, { useEffect, useRef, useState } from 'react'
import { useAppState } from '../context/AppContext'
import { musicService } from '../services/musicService'

interface MusicNote {
  x: number
  y: number
  symbol: string
  size: number
  speedY: number
  speedX: number
  rotation: number
  rotationSpeed: number
  opacity: number
  life: number
  maxLife: number
  hue: number
  wave: number
  waveFreq: number
}

interface Sparkle {
  x: number
  y: number
  size: number
  speedY: number
  speedX: number
  opacity: number
  life: number
  maxLife: number
}

const SYMBOLS = ['♪', '♫', '♩', '♬', '🎵', '✧', '✦', '∘']

export default function FloatingMusic() {
  const { state } = useAppState()
  const { isPlaying } = state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const notesRef = useRef<MusicNote[]>([])
  const sparklesRef = useRef<Sparkle[]>([])
  const animRef = useRef<number>(0)
  const frameRef = useRef(0)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const notes = notesRef.current
    const sparkles = sparklesRef.current
    const BASE_INTERVAL = isPlaying ? 12 : 25
    const SPARKLE_INTERVAL = isPlaying ? 8 : 18

    const render = () => {
      frameRef.current++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const w = canvas.width
      const h = canvas.height

      // Spawn music notes
      if (frameRef.current % BASE_INTERVAL === 0 && notes.length < (isPlaying ? 45 : 20)) {
        const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        notes.push({
          x: Math.random() * w * 0.6 + w * 0.2,
          y: h + 20,
          symbol,
          size: Math.random() * 18 + 14,
          speedY: -(Math.random() * 0.4 + 0.25),
          speedX: (Math.random() - 0.5) * 0.3,
          rotation: (Math.random() - 0.5) * 0.3,
          rotationSpeed: (Math.random() - 0.5) * 0.008,
          opacity: 0.5 + Math.random() * 0.5,
          life: 0,
          maxLife: 800 + Math.random() * 400,
          hue: 220 + Math.random() * 80,
          wave: Math.random() * Math.PI * 2,
          waveFreq: 0.005 + Math.random() * 0.01,
        })
      }

      // Spawn sparkles
      if (frameRef.current % SPARKLE_INTERVAL === 0 && sparkles.length < (isPlaying ? 60 : 25)) {
        sparkles.push({
          x: Math.random() * w,
          y: h + 5,
          size: Math.random() * 2 + 0.5,
          speedY: -(Math.random() * 0.6 + 0.2),
          speedX: (Math.random() - 0.5) * 0.2,
          opacity: 0.3 + Math.random() * 0.5,
          life: 0,
          maxLife: 400 + Math.random() * 300,
        })
      }

      // Draw and update notes
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i]
        n.wave += n.waveFreq
        n.y += n.speedY
        n.x += n.speedX + Math.sin(n.wave) * 0.15
        n.rotation += n.rotationSpeed
        n.life++

        const lifeRatio = n.life / n.maxLife
        const fadeOut = 1 - lifeRatio * lifeRatio
        const alpha = n.opacity * Math.min(1, fadeOut * 3)

        if (lifeRatio >= 1) {
          notes.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.translate(n.x, n.y)
        ctx.rotate(n.rotation)
        ctx.font = `${n.size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Glow
        ctx.shadowColor = `hsla(${n.hue}, 80%, 65%, ${alpha * 0.5})`
        ctx.shadowBlur = n.size * 0.8
        ctx.fillStyle = `hsla(${n.hue}, 80%, 75%, ${alpha})`
        ctx.fillText(n.symbol, 0, 0)

        // Inner bright core
        ctx.shadowBlur = 0
        ctx.fillStyle = `hsla(${n.hue}, 60%, 90%, ${alpha * 0.6})`
        ctx.fillText(n.symbol, 0, -1)

        ctx.restore()
      }

      // Draw sparkles
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i]
        s.y += s.speedY
        s.x += s.speedX
        s.life++

        const lifeRatio = s.life / s.maxLife
        const alpha = s.opacity * (1 - lifeRatio)

        if (lifeRatio >= 1) {
          sparkles.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`
        ctx.fill()

        // Glow
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 180, 255, ${alpha * 0.1})`
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(render)
    }

    render()
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [isPlaying])

  return (
    <canvas
      ref={canvasRef}
      className="pet-floating-music-canvas"
    />
  )
}
