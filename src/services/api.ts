import { Song } from '../types'

const API_BASE = '/api'

interface NeteaseSong {
  id: number
  name: string
  artist: string
  artistId?: number
  album: string
  cover: string
  duration: number
}

interface NeteasePlaylist {
  id: number
  name: string
  cover: string
  trackCount: number
  playCount: number
  description: string
}

function neteaseSongToSong(s: NeteaseSong): Song {
  return {
    id: String(s.id),
    name: s.name,
    artist: s.artist,
    album: s.album,
    cover: s.cover,
    duration: s.duration,
    path: `netease://${s.id}`,
  }
}

export async function searchSongs(keywords: string, limit = 30, offset = 0): Promise<{ songs: Song[]; total: number }> {
  const res = await fetch(`${API_BASE}/search?keywords=${encodeURIComponent(keywords)}&limit=${limit}&offset=${offset}`)
  if (!res.ok) throw new Error(`搜索失败: ${res.status}`)
  const data = await res.json()
  return {
    songs: (data.songs || []).map(neteaseSongToSong),
    total: data.total || 0,
  }
}

export async function getSongUrl(id: string, br = 320000): Promise<string | null> {
  const res = await fetch(`${API_BASE}/song/url?id=${id}&br=${br}`)
  if (!res.ok) throw new Error(`获取播放地址失败: ${res.status}`)
  const data = await res.json()
  const songData = (data.data || []).find((d: any) => String(d.id) === String(id))
  if (songData && songData.url) {
    if (songData.fee && songData.fee > 0 && !songData.url) return null
    return songData.url
  }
  if (br > 128000) return getSongUrl(id, 128000)
  return null
}

export async function getPlaylistDetail(id: string): Promise<{
  name: string
  cover: string
  description: string
  tracks: Song[]
}> {
  const res = await fetch(`${API_BASE}/playlist/detail?id=${id}`)
  if (!res.ok) throw new Error(`获取歌单失败: ${res.status}`)
  const data = await res.json()
  const pl = data.playlist
  return {
    name: pl.name,
    cover: pl.cover,
    description: pl.description,
    tracks: (pl.tracks || []).map(neteaseSongToSong),
  }
}

export async function getRecommendPlaylists(): Promise<NeteasePlaylist[]> {
  const res = await fetch(`${API_BASE}/recommend/playlists?limit=30`)
  if (!res.ok) throw new Error(`获取推荐歌单失败: ${res.status}`)
  const data = await res.json()
  return data.playlists || []
}

export async function setNeteaseCookie(cookie: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/cookie`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cookie }),
  })
  if (!res.ok) throw new Error(`设置 Cookie 失败: ${res.status}`)
  const data = await res.json()
  return data.hasCookie
}

export async function getNeteaseCookieStatus(): Promise<{ hasCookie: boolean; length: number }> {
  const res = await fetch(`${API_BASE}/cookie`)
  if (!res.ok) throw new Error(`获取 Cookie 状态失败: ${res.status}`)
  const data = await res.json()
  return { hasCookie: data.hasCookie, length: data.length }
}

interface LyricLine {
  time: number
  text: string
}

export async function getLyric(id: string): Promise<LyricLine[]> {
  const res = await fetch(`${API_BASE}/lyric?id=${id}`)
  if (!res.ok) throw new Error(`获取歌词失败: ${res.status}`)
  const data = await res.json()
  const raw = data.lrc?.lyric
  if (!raw) return []

  const lines: LyricLine[] = []
  const lineRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/
  for (const line of raw.split('\n')) {
    const match = line.match(lineRegex)
    if (match) {
      const min = parseInt(match[1])
      const sec = parseInt(match[2])
      const ms = parseInt(match[3].padEnd(3, '0'))
      const text = match[4].trim()
      if (text) {
        lines.push({ time: min * 60 + sec + ms / 1000, text })
      }
    }
  }
  return lines
}
