import { Song } from '../types'

class MusicService {
  private audioContext: AudioContext | null = null
  private audioElement: HTMLAudioElement | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private analyserNode: AnalyserNode | null = null
  private gainNode: GainNode | null = null
  private playlist: Song[] = []
  private currentIndex: number = -1
  private isPlaying: boolean = false
  private onTimeUpdate: ((time: number) => void) | null = null
  private onEnded: (() => void) | null = null
  private onPlayStateChange: ((playing: boolean) => void) | null = null
  private animationFrameId: number | null = null
  private listeners: Array<() => void> = []
  private _audioGraphReady = false

  private boundTimeUpdate: ((this: HTMLAudioElement, ev: Event) => void) | null = null
  private boundEnded: ((this: HTMLAudioElement, ev: Event) => void) | null = null
  private boundPlay: ((this: HTMLAudioElement, ev: Event) => void) | null = null
  private boundPause: ((this: HTMLAudioElement, ev: Event) => void) | null = null
  private boundError: ((this: HTMLAudioElement, ev: Event) => void) | null = null

  init(audioElement: HTMLAudioElement) {
    if (this.audioElement === audioElement && this._audioGraphReady) return

    if (this.audioElement && this.audioElement !== audioElement) {
      this._cleanupAudioGraph()
    }

    this.audioElement = audioElement
    this._audioGraphReady = false

    this.boundTimeUpdate = () => {
      if (this.onTimeUpdate) {
        this.onTimeUpdate(audioElement.currentTime)
      }
    }

    this.boundEnded = () => {
      this.isPlaying = false
      if (this.onEnded) this.onEnded()
      if (this.onPlayStateChange) this.onPlayStateChange(false)
      this.notify()
    }

    this.boundPlay = () => {
      this.isPlaying = true
      if (this.onPlayStateChange) this.onPlayStateChange(true)
      this.notify()
    }

    this.boundPause = () => {
      this.isPlaying = false
      if (this.onPlayStateChange) this.onPlayStateChange(false)
      this.notify()
    }

    this.boundError = () => {
      const mediaError = audioElement.error
      console.error('音频加载错误:', {
        code: mediaError?.code,
        message: mediaError?.message || '未知错误',
        src: audioElement.src?.slice(0, 100),
      })
    }

    audioElement.addEventListener('timeupdate', this.boundTimeUpdate)
    audioElement.addEventListener('ended', this.boundEnded)
    audioElement.addEventListener('play', this.boundPlay)
    audioElement.addEventListener('pause', this.boundPause)
    audioElement.addEventListener('error', this.boundError)
  }

  async ensureAudioGraph(): Promise<void> {
    if (this._audioGraphReady) return
    if (!this.audioElement) return

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    if (this.audioContext.state !== 'running') {
      console.warn('AudioContext 未能恢复运行状态:', this.audioContext.state)
      return
    }

    try {
      this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'InvalidStateError') {
        console.warn('MediaElementSource 已存在，继续使用当前连接')
      } else {
        throw e
      }
    }

    this.analyserNode = this.audioContext.createAnalyser()
    this.analyserNode.fftSize = 256
    this.gainNode = this.audioContext.createGain()

    if (this.sourceNode) {
      this.sourceNode.connect(this.analyserNode)
    }
    this.analyserNode.connect(this.gainNode)
    this.gainNode.connect(this.audioContext.destination)

    this._audioGraphReady = true
    console.log('🎵 AudioGraph 就绪')
  }

  setPlaylist(songs: Song[]) {
    this.playlist = songs
    if (this.currentIndex === -1 && songs.length > 0) {
      this.currentIndex = 0
    }
  }

  addToPlaylist(songs: Song[]) {
    const existingPaths = new Set(this.playlist.map((s) => s.path))
    const newSongs = songs.filter((s) => !existingPaths.has(s.path))
    this.playlist = [...this.playlist, ...newSongs]
    return newSongs
  }

  getPlaylist(): Song[] {
    return this.playlist
  }

  getCurrentSong(): Song | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.playlist.length) return null
    return this.playlist[this.currentIndex]
  }

  getCurrentIndex(): number {
    return this.currentIndex
  }

  async ensureGesture(): Promise<void> {
    if (!this.audioElement) return
    if (this.audioElement.src && this.audioElement.src !== '') return

    const sampleRate = 8000
    const channels = 1
    const bitsPerSample = 8
    const duration = 0.05
    const dataSize = Math.floor(sampleRate * channels * (bitsPerSample / 8) * duration)
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)

    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
    }
    writeStr(0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeStr(8, 'WAVE')
    writeStr(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true)
    view.setUint16(32, channels * (bitsPerSample / 8), true)
    view.setUint16(34, bitsPerSample, true)
    writeStr(36, 'data')
    view.setUint32(40, dataSize, true)

    const blob = new Blob([buffer], { type: 'audio/wav' })
    const silentUrl = URL.createObjectURL(blob)
    this.audioElement.src = silentUrl
    try {
      await this.audioElement.play()
    } catch {
      this.audioElement.pause()
    }
  }

  async playSong(index: number): Promise<void> {
    if (index < 0 || index >= this.playlist.length) return
    this.currentIndex = index
    const song = this.playlist[index]

    if (!this.audioElement) return

    await this.ensureAudioGraph()

    if (song.url) {
      this.audioElement.crossOrigin = 'anonymous'
      this.audioElement.src = song.url
    } else if (song.path.startsWith('blob:') || song.path.startsWith('http')) {
      this.audioElement.src = song.path
    } else {
      this.audioElement.src = song.path
    }

    await this.audioElement.play()
    this.isPlaying = true
    this.notify()
  }

  async play(): Promise<void> {
    if (!this.audioElement) return

    if (!this.audioElement.src || this.currentIndex < 0) {
      if (this.playlist.length === 0) return
      const idx = this.currentIndex >= 0 ? this.currentIndex : 0
      this.currentIndex = idx
      await this.playSong(idx)
      return
    }

    await this.ensureAudioGraph()
    await this.audioElement.play()
    this.isPlaying = true
    this.notify()
  }

  pause() {
    if (!this.audioElement) return
    this.audioElement.pause()
    this.isPlaying = false
    this.notify()
  }

  togglePlay(): Promise<void> | void {
    if (this.isPlaying) {
      this.pause()
    } else {
      return this.play()
    }
  }

  async next(): Promise<void> {
    if (this.playlist.length === 0) return
    const nextIndex = (this.currentIndex + 1) % this.playlist.length
    await this.playSong(nextIndex)
  }

  async prev(): Promise<void> {
    if (this.playlist.length === 0) return
    const prevIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length
    await this.playSong(prevIndex)
  }

  seek(time: number) {
    if (!this.audioElement) return
    this.audioElement.currentTime = time
  }

  setVolume(volume: number) {
    if (!this.gainNode) return
    this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
  }

  getVolume(): number {
    if (!this.gainNode) return 1
    return this.gainNode.gain.value
  }

  getAnalyserData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(128)
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)
    this.analyserNode.getByteFrequencyData(dataArray)
    return dataArray
  }

  getCurrentTime(): number {
    if (!this.audioElement) return 0
    return this.audioElement.currentTime
  }

  getDuration(): number {
    if (!this.audioElement) return 0
    return this.audioElement.duration || 0
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  getVolumeValue(): number {
    return this.gainNode ? this.gainNode.gain.value : 0.5
  }

  onTimeUpdateCallback(cb: (time: number) => void) {
    this.onTimeUpdate = cb
  }

  onEndedCallback(cb: () => void) {
    this.onEnded = cb
  }

  onPlayStateChangeCallback(cb: (playing: boolean) => void) {
    this.onPlayStateChange = cb
  }

  subscribe(cb: () => void) {
    this.listeners.push(cb)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb)
    }
  }

  private notify() {
    this.listeners.forEach((cb) => cb())
  }

  private _cleanupAudioGraph() {
    if (this.audioElement) {
      if (this.boundTimeUpdate) this.audioElement.removeEventListener('timeupdate', this.boundTimeUpdate)
      if (this.boundEnded) this.audioElement.removeEventListener('ended', this.boundEnded)
      if (this.boundPlay) this.audioElement.removeEventListener('play', this.boundPlay)
      if (this.boundPause) this.audioElement.removeEventListener('pause', this.boundPause)
      if (this.boundError) this.audioElement.removeEventListener('error', this.boundError)
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect()
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect()
    }
    if (this.gainNode) {
      this.gainNode.disconnect()
    }
    this.sourceNode = null
    this.analyserNode = null
    this.gainNode = null
    this.boundTimeUpdate = null
    this.boundEnded = null
    this.boundPlay = null
    this.boundPause = null
    this.boundError = null
    this._audioGraphReady = false
  }

  destroy() {
    this._cleanupAudioGraph()
    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.src = ''
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    if (this.audioContext) {
      this.audioContext.close()
    }
    this.audioElement = null
    this.audioContext = null
  }
}

export const musicService = new MusicService()
