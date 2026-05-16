import React, { useEffect, useRef } from 'react'
import { useAppState } from '../context/AppContext'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  alphaSpeed: number
  hue: number
}

export default function AmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef<number>(0)
  const { state } = useAppState()
  const { petMood, isPlaying } = state

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio
      canvas.height = canvas.offsetHeight * devicePixelRatio
    }
    resize()
    window.addEventListener('resize', resize)

    const count = 40
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3 - 0.1,
      size: Math.random() * 3 + 1.5,
      alpha: Math.random() * 0.4 + 0.1,
      alphaSpeed: (Math.random() - 0.5) * 0.005,
      hue: Math.random() * 60 + 250,
    }))

    const moodHueMap: Record<string, number> = {
      idle: 260,
      listening: 280,
      happy: 320,
      sleeping: 220,
      dancing: 340,
      thinking: 270,
    }

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.scale(devicePixelRatio, devicePixelRatio)

      const baseHue = moodHueMap[petMood] || 260

      const grad = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, w * 0.6)
      grad.addColorStop(0, `hsla(${baseHue}, 80%, 60%, ${isPlaying ? 0.06 : 0.03})`)
      grad.addColorStop(0.5, `hsla(${baseHue + 30}, 70%, 50%, 0.02)`)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      if (isPlaying) {
        const pulse = Math.sin(Date.now() / 1000) * 0.01 + 0.03
        const pulseGrad = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, w * 0.4)
        pulseGrad.addColorStop(0, `hsla(${baseHue + 40}, 90%, 70%, ${pulse})`)
        pulseGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = pulseGrad
        ctx.fillRect(0, 0, w, h)
      }

      const particles = particlesRef.current
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.alpha += p.alphaSpeed
        if (p.alpha > 0.5) p.alphaSpeed = -Math.abs(p.alphaSpeed)
        if (p.alpha < 0.05) p.alphaSpeed = Math.abs(p.alphaSpeed)

        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue + Math.sin(Date.now() / 2000 + p.x) * 10}, 70%, 70%, ${p.alpha})`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.alpha * 0.15})`
        ctx.fill()
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [petMood, isPlaying])

  return (
    <canvas
      ref={canvasRef}
      className="ambient-canvas"
    />
  )
}
