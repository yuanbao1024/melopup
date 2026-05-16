export interface Song {
  id: string
  name: string
  artist: string
  album?: string
  cover?: string
  duration: number
  path: string
  url?: string
}

export interface AIAnalysisSection {
  title: string
  content: string
}

export interface AIAnalysis {
  songName: string
  artist: string
  sections: AIAnalysisSection[]
  rating: number
  personalNote: string
}

export interface AIRecommendation {
  name: string
  artist: string
  reason: string
  matchScore: number
}

export type PetMood = 'idle' | 'listening' | 'happy' | 'sleeping' | 'dancing' | 'thinking'

export type PetAccessory = 'bowtie' | 'sunglasses' | 'hat' | 'collar'

export type AppView = 'pet' | 'player' | 'playlist' | 'ai' | 'taste'

export interface ListenRecord {
  songId: string
  songName: string
  artist: string
  timestamp: number
  count: number
}

export interface MusicPersonality {
  type: string
  emoji: string
  description: string
  traits: string[]
  lastAnalyzed: number
}

export interface UserProfile {
  listeningHistory: ListenRecord[]
  likedSongs: string[]
  likedSongDetails: { id: string; name: string; artist: string }[]
  topArtists: { name: string; count: number }[]
  totalPlays: number
  uniqueArtists: number
  personality: MusicPersonality
  lastUpdated: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}
