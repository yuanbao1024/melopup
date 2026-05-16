import axios from 'axios'

let userCookie = ''
const APPVER_COOKIE = 'appver=2.0.2; os=pc;'

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
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' })
    res.end()
    return
  }

  const url = req.url || ''
  const path = url.replace(/\?.*$/, '').replace(/^\/api/, '')
  const query = getQuery(url)

  try {
    // Cookie
    if (path === '/cookie' && req.method === 'POST') {
      const body = await parseBody(req)
      userCookie = body.cookie || ''
      json(res, { status: 'ok', hasCookie: !!userCookie })
      return
    }
    if (path === '/cookie' && req.method === 'GET') {
      json(res, { status: 'ok', hasCookie: !!userCookie, length: userCookie.length })
      return
    }

    // Health
    if (path === '/health') {
      json(res, { status: 'ok', timestamp: Date.now() })
      return
    }

    // Search
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
          id: song.id,
          name: song.name,
          artist: (song.ar || []).map((a) => a.name).join(' / '),
          artistId: song.ar?.[0]?.id,
          album: song.al?.name || '',
          cover: song.al?.picUrl || '',
          duration: Math.floor((song.dt || 0) / 1000),
        })),
        total: data.result.songCount || 0,
      })
      return
    }

    // Song URL
    if (path === '/song/url') {
      const { id, br = 320000 } = query
      if (!id) { json(res, { error: 'Missing id' }, 400); return }

      const ids = String(id).split(',').filter(Boolean)
      const response = await apiClient.get('https://music.163.com/api/song/enhance/player/url', {
        params: { id: ids[0], ids: `[${ids.join(',')}]`, br: Number(br) },
      })
      json(res, response.data)
      return
    }

    // Audio Proxy (stream)
    if (path === '/proxy/audio') {
      const { url: audioUrl } = query
      if (!audioUrl) { json(res, { error: 'Missing url' }, 400); return }

      const decodedUrl = decodeURIComponent(audioUrl)
      const response = await apiClient.get(decodedUrl, {
        responseType: 'stream',
      })

      const contentType = (response.headers['content-type'] || 'audio/mpeg').split(';')[0]
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': response.headers['content-length'] || '',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      })
      response.data.pipe(res)
      return
    }

    // Song Detail
    if (path === '/song/detail') {
      const { ids } = query
      if (!ids) { json(res, { error: 'Missing ids' }, 400); return }

      const response = await apiClient.get('https://music.163.com/api/v3/song/detail', {
        params: { c: `[{"id":${ids}}]` },
      })
      const data = response.data
      if (data.code !== 200) { json(res, { error: 'API Error', code: data.code }, 500); return }

      json(res, {
        songs: (data.songs || []).map((song) => ({
          id: song.id,
          name: song.name,
          artist: (song.ar || []).map((a) => a.name).join(' / '),
          album: song.al?.name || '',
          cover: song.al?.picUrl || '',
          duration: Math.floor((song.dt || 0) / 1000),
        })),
      })
      return
    }

    // Lyric
    if (path === '/lyric') {
      const { id } = query
      if (!id) { json(res, { error: 'Missing id' }, 400); return }

      const response = await apiClient.get('https://music.163.com/api/song/lyric', {
        params: { id: Number(id), lv: -1, kv: -1, tv: -1 },
      })
      json(res, response.data)
      return
    }

    // Playlist Detail
    if (path === '/playlist/detail') {
      const { id, limit = 100, offset = 0 } = query
      if (!id) { json(res, { error: 'Missing id' }, 400); return }

      const response = await apiClient.get('https://music.163.com/api/v6/playlist/detail', {
        params: { id: Number(id), n: Number(limit), s: 8, offset: Number(offset) },
      })
      const data = response.data
      if (data.code !== 200) { json(res, { error: 'API Error', code: data.code }, 500); return }

      const playlist = data.playlist
      json(res, {
        playlist: {
          id: playlist.id,
          name: playlist.name,
          cover: playlist.coverImgUrl || '',
          description: playlist.description || '',
          tracks: (playlist.tracks || []).map((track) => ({
            id: track.id,
            name: track.name,
            artist: (track.ar || []).map((a) => a.name).join(' / '),
            album: track.al?.name || '',
            cover: track.al?.picUrl || '',
            duration: Math.floor((track.dt || 0) / 1000),
          })),
          trackCount: playlist.trackCount || 0,
        },
      })
      return
    }

    // Recommend Playlists
    if (path === '/recommend/playlists') {
      const { limit = 30 } = query

      const response = await apiClient.get('https://music.163.com/api/personalized/playlist', {
        params: { limit: Number(limit) },
      })
      const data = response.data
      if (data.code !== 200) { json(res, { error: 'API Error', code: data.code }, 500); return }

      json(res, {
        playlists: (data.result || []).map((pl) => ({
          id: pl.id,
          name: pl.name,
          cover: pl.picUrl || '',
          trackCount: pl.trackCount || 0,
          playCount: pl.playCount || 0,
          description: pl.copywriter || '',
        })),
      })
      return
    }

    json(res, { error: 'Not Found' }, 404)
  } catch (err) {
    console.error(`[API Error] ${path}:`, err.message)
    json(res, { error: err.message }, 500)
  }
}
