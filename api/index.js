import axios from 'axios'
import { getFallbackCookie } from './cookie.js'

let userCookie = ''
const APPVER_COOKIE = 'appver=2.0.2; os=pc;'

function getCookie() {
  if (userCookie) return userCookie
  if (process.env['NETEASE_COOKIE'] || process.env['VITE_NETEASE_COOKIE']) {
    return process.env['NETEASE_COOKIE'] || process.env['VITE_NETEASE_COOKIE'] || ''
  }
  return getFallbackCookie()
}

userCookie = getCookie()

const COMMON_HEADERS = {
  'Referer': 'https://music.163.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

const apiClient = axios.create({
  headers: COMMON_HEADERS,
  timeout: 15000,
})

apiClient.interceptors.request.use((config) => {
  config.headers.Cookie = userCookie || APPVER_COOKIE
  return config
})

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')) }
      catch { resolve({}) }
    })
    req.on('error', reject)
  })
}

function getQuery(url) {
  const q = {}
  const idx = url.indexOf('?')
  if (idx === -1) return q
  for (const p of url.slice(idx + 1).split('&')) {
    const [k, v] = p.split('=')
    q[decodeURIComponent(k)] = decodeURIComponent(v || '')
  }
  return q
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(data))
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' })
    res.end()
    return
  }

  const url = req.url || ''
  const path = url.replace(/\?.*$/, '').replace(/^\/api/, '')
  const query = getQuery(url)

  // ===== NETEASE API PROXY =====
  try {
    if (path === '/cookie' && req.method === 'POST') {
      userCookie = (await parseBody(req)).cookie || ''
      json(res, { status: 'ok', hasCookie: !!userCookie })
      return
    }
    if (path === '/cookie' && req.method === 'GET') {
      json(res, { status: 'ok', hasCookie: !!userCookie, length: userCookie.length })
      return
    }
    if (path === '/health') {
      json(res, { status: 'ok', timestamp: Date.now() })
      return
    }
    if (path === '/search') {
      const { keywords, limit = 30, offset = 0 } = query
      if (!keywords) { json(res, { error: 'Missing keywords' }, 400); return }
      const response = await apiClient.get('https://music.163.com/api/cloudsearch/pc', {
        params: { s: keywords, type: 1, offset: Number(offset), limit: Number(limit), total: offset > 0 ? false : true },
      })
      const data = response.data
      if (data.code !== 200) { json(res, { error: 'API Error', code: data.code }, 500); return }
      json(res, {
        songs: (data.result.songs || []).map((song) => ({
          id: song.id, name: song.name, artist: (song.ar || []).map((a) => a.name).join(' / '),
          artistId: song.ar?.[0]?.id, album: song.al?.name || '', cover: song.al?.picUrl || '',
          duration: Math.floor((song.dt || 0) / 1000),
        })),
        total: data.result.songCount || 0,
      })
      return
    }
    if (path === '/song/url') {
      const { id, br = 320000 } = query
      if (!id) { json(res, { error: 'Missing id' }, 400); return }
      const response = await apiClient.get('https://music.163.com/api/song/enhance/player/url', {
        params: { id: String(id).split(',')[0], ids: `[${String(id).split(',').filter(Boolean).join(',')}]`, br: Number(br) },
      })
      json(res, response.data); return
    }
    if (path === '/proxy/audio') {
      if (!query.url) { json(res, { error: 'Missing url' }, 400); return }
      const response = await apiClient.get(decodeURIComponent(query.url), { responseType: 'stream' })
      res.writeHead(200, {
        'Content-Type': (response.headers['content-type'] || 'audio/mpeg').split(';')[0],
        'Content-Length': response.headers['content-length'] || '', 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*',
      })
      response.data.pipe(res); return
    }
    if (path === '/song/detail') {
      if (!query.ids) { json(res, { error: 'Missing ids' }, 400); return }
      const response = await apiClient.get('https://music.163.com/api/v3/song/detail', { params: { c: `[{"id":${query.ids}}]` } })
      const data = response.data
      if (data.code !== 200) { json(res, { error: 'API Error', code: data.code }, 500); return }
      json(res, { songs: (data.songs || []).map((song) => ({ id: song.id, name: song.name, artist: (song.ar || []).map((a) => a.name).join(' / '), album: song.al?.name || '', cover: song.al?.picUrl || '', duration: Math.floor((song.dt || 0) / 1000) })) })
      return
    }
    if (path === '/lyric') {
      if (!query.id) { json(res, { error: 'Missing id' }, 400); return }
      const response = await apiClient.get('https://music.163.com/api/song/lyric', { params: { id: Number(query.id), lv: -1, kv: -1, tv: -1 } })
      json(res, response.data); return
    }
    if (path === '/playlist/detail') {
      if (!query.id) { json(res, { error: 'Missing id' }, 400); return }
      const response = await apiClient.get('https://music.163.com/api/v6/playlist/detail', { params: { id: Number(query.id), n: Number(query.limit || 100), s: 8, offset: Number(query.offset || 0) } })
      const data = response.data
      if (data.code !== 200) { json(res, { error: 'API Error', code: data.code }, 500); return }
      const pl = data.playlist
      json(res, { playlist: { id: pl.id, name: pl.name, cover: pl.coverImgUrl || '', description: pl.description || '', tracks: (pl.tracks || []).map((track) => ({ id: track.id, name: track.name, artist: (track.ar || []).map((a) => a.name).join(' / '), album: track.al?.name || '', cover: track.al?.picUrl || '', duration: Math.floor((track.dt || 0) / 1000) })), trackCount: pl.trackCount || 0 } })
      return
    }
    if (path === '/recommend/playlists') {
      const response = await apiClient.get('https://music.163.com/api/personalized/playlist', { params: { limit: Number(query.limit || 30) } })
      const data = response.data
      if (data.code !== 200) { json(res, { error: 'API Error', code: data.code }, 500); return }
      json(res, { playlists: (data.result || []).map((pl) => ({ id: pl.id, name: pl.name, cover: pl.picUrl || '', trackCount: pl.trackCount || 0, playCount: pl.playCount || 0, description: pl.copywriter || '' })) })
      return
    }
  } catch (err) {
    console.error(`[API Error] ${path}:`, err.message)
    json(res, { error: err.message }, 500)
    return
  }

  // ===== AI CHAT COMPLETIONS PROXY (server-side, never exposed to browser) =====
  if (path === '/ai/v1/chat/completions' && req.method === 'POST') {
    try {
      const aiKey = process.env['OPENAI_API_KEY'] || process.env['VITE_OPENAI_API_KEY']
      const aiBaseURL = process.env['OPENAI_BASE_URL'] || process.env['VITE_OPENAI_BASE_URL'] || 'https://api.deepseek.com/v1'

      if (!aiKey) {
        console.error('[AI Proxy] OPENAI_API_KEY not configured on server')
        json(res, { error: 'Server AI proxy not configured' }, 500)
        return
      }

      let bodyStr = ''
      await new Promise((resolve) => {
        req.on('data', (chunk) => { bodyStr += chunk })
        req.on('end', resolve)
      })

      const response = await fetch(`${aiBaseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiKey}`,
        },
        body: bodyStr,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.error(`[AI Proxy] upstream ${response.status}: ${errorText.slice(0, 200)}`)
        res.writeHead(response.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
        res.end(JSON.stringify({ error: `AI API error: ${response.status}`, detail: errorText.slice(0, 500) }))
        return
      }

      const contentType = response.headers.get('content-type') || 'application/json'
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      })

      if (contentType.includes('text/event-stream')) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(decoder.decode(value, { stream: true }))
        }
        res.end()
      } else {
        const text = await response.text()
        res.end(text)
      }
    } catch (err) {
      console.error('[AI Proxy] error:', err.message)
      json(res, { error: err.message }, 500)
    }
    return
  }

  json(res, { error: 'Not Found' }, 404)
}
