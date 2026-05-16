import React from 'react'

export type SpriteState = 'idle' | 'running-right' | 'running-left' | 'waving' | 'jumping' | 'failed' | 'waiting' | 'running' | 'review'

type StateConfig = {
  row: number
  frames: number
  durationMs: number
}

const SPRITE_STATES: Record<SpriteState, StateConfig> = {
  idle: { row: 0, frames: 6, durationMs: 1100 },
  'running-right': { row: 1, frames: 8, durationMs: 1060 },
  'running-left': { row: 2, frames: 8, durationMs: 1060 },
  waving: { row: 3, frames: 4, durationMs: 700 },
  jumping: { row: 4, frames: 5, durationMs: 840 },
  failed: { row: 5, frames: 8, durationMs: 1220 },
  waiting: { row: 6, frames: 6, durationMs: 1010 },
  running: { row: 7, frames: 6, durationMs: 820 },
  review: { row: 8, frames: 6, durationMs: 1030 },
}

const FRAME_W = 192
const FRAME_H = 208
const SHEET_COLS = 8
const SHEET_ROWS = 9

type PetSpriteProps = {
  src: string
  state?: SpriteState
  scale?: number
  className?: string
}

export default function PetSprite({ src, state = 'idle', scale = 1, className = '' }: PetSpriteProps) {
  const config = SPRITE_STATES[state]
  return (
    <div
      className={`pet-sprite-frame ${className}`}
      style={{ '--pet-scale': scale } as React.CSSProperties}
    >
      <div
        className="pet-sprite-anim"
        style={{
          '--sprite-url': `url("${src}")`,
          '--sprite-row': config.row,
          '--sprite-frames': config.frames,
          '--sprite-duration': `${config.durationMs}ms`,
          '--sprite-y': `calc(${config.row} * -${FRAME_H}px)`,
          '--sprite-end-x': `calc(${config.frames} * -${FRAME_W}px)`,
        } as React.CSSProperties}
      />
    </div>
  )
}
