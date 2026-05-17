import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useAppState } from '../context/AppContext'
import { getLyric } from '../services/api'

interface LyricLine {
  time: number
  text: string
}

interface FloatingLine {
  id: number
  text: string
  side: 'left' | 'right'
  topOffset: number
  born: number
}

const FONT_STACK = '"Playfair Display", "Cormorant Garamond", "Georgia", "Times New Roman", serif'

export default function LyricArt() {
  const { state } = useAppState()
  const { currentSong, isPlaying, currentTime } = state
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [floatingLines, setFloatingLines] = useState<FloatingLine[]>([])
  const lastIndexRef = useRef(-1)
  const idRef = useRef(0)
  const lyricFetchRef = useRef<string | null>(null)

  useEffect(() => {
    if (!currentSong?.id) {
      setLyrics([])
      lastIndexRef.current = -1
      setFloatingLines([])
      return
    }

    if (lyricFetchRef.current === currentSong.id) return
    lyricFetchRef.current = currentSong.id

    lastIndexRef.current = -1
    setFloatingLines([])

    getLyric(currentSong.id).then((lines) => {
      setLyrics(lines)
    }).catch(() => {
      setLyrics([])
    })
  }, [currentSong?.id])

  const spawnLine = useCallback((text: string, index: number) => {
    idRef.current += 1
    const side = index % 2 === 0 ? 'left' : 'right'
    const topOffset = Math.random() * 10 - 5
    const newLine: FloatingLine = {
      id: idRef.current,
      text,
      side,
      topOffset,
      born: Date.now(),
    }
    setFloatingLines(prev => [...prev, newLine])

    setTimeout(() => {
      setFloatingLines(prev => prev.filter(l => l.id !== newLine.id))
    }, 7000)
  }, [])

  useEffect(() => {
    if (lyrics.length === 0 || !isPlaying) return

    let activeIdx = -1
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) {
        activeIdx = i
        break
      }
    }

    if (activeIdx > lastIndexRef.current) {
      for (let i = lastIndexRef.current + 1; i <= activeIdx; i++) {
        if (lyrics[i]?.text) {
          setTimeout(() => spawnLine(lyrics[i].text, i), 0)
        }
      }
      lastIndexRef.current = activeIdx
    }
  }, [currentTime, lyrics, isPlaying, spawnLine])

  if (!isPlaying || lyrics.length === 0) return null

  return (
    <div className="lyric-art-overlay">
      {floatingLines.map((line) => (
        <div
          key={line.id}
          className={`lyric-art-line lyric-art-${line.side}`}
          style={{
            fontFamily: FONT_STACK,
            '--top-offset': `${line.topOffset}px`,
          } as React.CSSProperties}
        >
          <span className="lyric-art-text">{line.text}</span>
        </div>
      ))}
    </div>
  )
}
