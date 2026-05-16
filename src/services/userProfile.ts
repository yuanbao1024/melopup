import { UserProfile, ListenRecord, MusicPersonality, Song } from '../types'

const STORAGE_KEY = 'solo_pet_user_profile'

const PERSONALITY_TYPES: { type: string; emoji: string; minArtists: number; description: string; traits: string[] }[] = [
  {
    type: '旋律鉴赏家',
    emoji: '🎵',
    minArtists: 0,
    description: '你拥有开阔的音乐视野，对不同风格的歌曲都能欣赏。你的耳朵是一台精密的乐器。',
    traits: ['品味广博', '旋律敏感', '审美多元'],
  },
  {
    type: '暗夜独行侠',
    emoji: '🌙',
    minArtists: 2,
    description: '你在音乐中寻找独处的浪漫，喜欢沉浸感强烈的旋律。夜晚是你的专属音乐时间。',
    traits: ['感性深沉', '喜欢氛围', '独处享受'],
  },
  {
    type: '节奏狂热者',
    emoji: '🔥',
    minArtists: 3,
    description: '节奏是你的脉搏，节拍是你的心跳。你总能找到最有律动感的音乐。',
    traits: ['充满活力', '热血沸腾', '律动大师'],
  },
  {
    type: '治愈系暖音控',
    emoji: '☀️',
    minArtists: 4,
    description: '你偏爱温暖治愈的声音，音乐是你生活中的一束光。你是一个内心柔软的人。',
    traits: ['温暖细腻', '情感丰富', '治愈系'],
  },
  {
    type: '怀旧收藏家',
    emoji: '📻',
    minArtists: 5,
    description: '你珍藏着那些经得起时间考验的声音，每一首歌都是一段时光的记忆。',
    traits: ['念旧深情', '品味经典', '感性回忆'],
  },
  {
    type: '情绪漫游者',
    emoji: '🎭',
    minArtists: 6,
    description: '你的歌单是一幅情绪地图，在不同心境下切换不同的音乐风景。',
    traits: ['情感丰富', '善变有趣', '随性自由'],
  },
  {
    type: '深度专注者',
    emoji: '🎧',
    minArtists: 7,
    description: '你一旦找到喜欢的音乐就会深入探索。专注是你最大的力量。',
    traits: ['专注投入', '精益求精', '深度体验'],
  },
  {
    type: '探索先锋',
    emoji: '🚀',
    minArtists: 8,
    description: '你永远在寻找新的声音，你的歌单里充满了惊喜。音乐世界的前沿阵地。',
    traits: ['好奇心强', '品味前卫', '永远新鲜'],
  },
]

function getDefaultProfile(): UserProfile {
  return {
    listeningHistory: [],
    likedSongs: [],
    likedSongDetails: [],
    topArtists: [],
    totalPlays: 0,
    uniqueArtists: 0,
    personality: {
      type: '旋律鉴赏家',
      emoji: '🎵',
      description: '你的音乐旅程刚刚开始，让我们一起探索更多好音乐吧！',
      traits: ['期待探索', '初入旅程', '无限可能'],
      lastAnalyzed: 0,
    },
    lastUpdated: Date.now(),
  }
}

function computePersonality(profile: UserProfile): MusicPersonality {
  const artistCount = profile.uniqueArtists
  const totalPlays = profile.totalPlays
  const historyCount = profile.listeningHistory.length

  let matchedIndex = 0
  for (let i = PERSONALITY_TYPES.length - 1; i >= 0; i--) {
    if (artistCount >= PERSONALITY_TYPES[i].minArtists) {
      matchedIndex = i
      break
    }
  }

  const p = PERSONALITY_TYPES[matchedIndex]

  if (totalPlays > 20 && artistCount > 3) {
    const repeatPlays = historyCount - profile.uniqueArtists
    const repeatRatio = historyCount > 0 ? repeatPlays / historyCount : 0

    if (repeatRatio > 0.5) {
      return {
        type: '深度专注者',
        emoji: '🎧',
        description: '你反复聆听喜爱的作品，每一次重播都是对音乐更深层的理解。你是一个深情的聆听者。',
        traits: ['专注投入', '精益求精', '深情品味'],
        lastAnalyzed: Date.now(),
      }
    }

    if (historyCount > 15) {
      return {
        type: '情绪漫游者',
        emoji: '🎭',
        description: '你的歌单是一幅情绪地图，在不同心境下切换不同的音乐风景。',
        traits: ['情感丰富', '随性自由', '探索不止'],
        lastAnalyzed: Date.now(),
      }
    }
  }

  return {
    type: p.type,
    emoji: p.emoji,
    description: artistCount <= 2
      ? '你的音乐旅程刚刚开始，让我们一起探索更多好音乐吧！'
      : p.description,
    traits: artistCount <= 2
      ? ['期待探索', '初入旅程', '无限可能']
      : p.traits,
    lastAnalyzed: Date.now(),
  }
}

export class UserProfileService {
  private profile: UserProfile
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.profile = this.load()
  }

  private load(): UserProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return { ...getDefaultProfile(), ...parsed }
      }
    } catch {
      console.warn('无法加载用户画像，使用默认设置')
    }
    return getDefaultProfile()
  }

  private save(): void {
    this.profile.lastUpdated = Date.now()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile))
    this.notify()
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb())
  }

  getProfile(): UserProfile {
    return { ...this.profile }
  }

  recordPlay(song: Song): void {
    const existing = this.profile.listeningHistory.find((r) => r.songId === song.id)
    if (existing) {
      existing.count += 1
      existing.timestamp = Date.now()
    } else {
      this.profile.listeningHistory.push({
        songId: song.id,
        songName: song.name,
        artist: song.artist,
        timestamp: Date.now(),
        count: 1,
      })
    }

    if (this.profile.listeningHistory.length > 200) {
      this.profile.listeningHistory.sort((a, b) => b.timestamp - a.timestamp)
      this.profile.listeningHistory = this.profile.listeningHistory.slice(0, 200)
    }

    this.profile.totalPlays += 1
    this.recomputeStats()
    this.profile.personality = computePersonality(this.profile)
    this.save()
  }

  private recomputeStats(): void {
    const artistMap = new Map<string, number>()
    const uniqueArtists = new Set<string>()

    for (const record of this.profile.listeningHistory) {
      uniqueArtists.add(record.artist)
      artistMap.set(record.artist, (artistMap.get(record.artist) || 0) + record.count)
    }

    this.profile.uniqueArtists = uniqueArtists.size
    this.profile.topArtists = Array.from(artistMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  likeSong(song: Song): void {
    if (!this.profile.likedSongs.includes(song.id)) {
      this.profile.likedSongs.push(song.id)
      this.profile.likedSongDetails.push({ id: song.id, name: song.name, artist: song.artist })
      this.save()
    }
  }

  unlikeSong(songId: string): void {
    this.profile.likedSongs = this.profile.likedSongs.filter((id) => id !== songId)
    this.profile.likedSongDetails = this.profile.likedSongDetails.filter((d) => d.id !== songId)
    this.save()
  }

  isLiked(songId: string): boolean {
    return this.profile.likedSongs.includes(songId)
  }

  getPlayCount(songId: string): number {
    return this.profile.listeningHistory.find((r) => r.songId === songId)?.count || 0
  }

  getPersonalitySummary(): string {
    const p = this.profile.personality
    const artistList = this.profile.topArtists.slice(0, 5).map((a) => a.name).join('、')
    const likedCount = this.profile.likedSongDetails.length

    let summary = `我听了 ${this.profile.totalPlays} 首歌，收藏了 ${likedCount} 首`

    if (this.profile.topArtists.length > 0) {
      summary += `，常听的艺人包括 ${artistList}`
    }

    summary += `。我的音乐人格是 ${p.emoji}「${p.type}」——${p.description}`

    return summary
  }

  clearHistory(): void {
    this.profile = getDefaultProfile()
    this.save()
  }
}

export const userProfile = new UserProfileService()
