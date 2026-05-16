const express = require('express')
const cors = require('cors')
const axios = require('axios')

const app = express()
const PORT = 3456

app.use(cors())
app.use(express.json())

const COMMON_HEADERS = {
  'Referer': 'https://music.163.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

let userCookie = ''

const apiClient = axios.create({
  headers: COMMON_HEADERS,
  timeout: 15000,
})

apiClient.interceptors.request.use((config) => {
  if (userCookie) {
    config.headers.Cookie = userCookie
  } else {
    config.headers.Cookie = 'appver=2.0.2; os=pc;'
  }
  return config
})

app.post('/api/cookie', (req, res) => {
  try {
    const { cookie } = req.body
    if (cookie === undefined) {
      return res.status(400).json({ error: 'Missing cookie field' })
    }
    userCookie = cookie
    const masked = userCookie.substring(0, 20) + '...' + userCookie.slice(-10)
    console.log(`[Cookie] 已${cookie ? '更新' : '清除'} Cookie: ${cookie ? masked : '无'}`)
    res.json({ status: 'ok', hasCookie: !!userCookie })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/cookie', (req, res) => {
  res.json({ status: 'ok', hasCookie: !!userCookie, length: userCookie.length })
})

app.get('/api/search', async (req, res) => {
  try {
    const { keywords, limit = 30, offset = 0 } = req.query
    if (!keywords) return res.status(400).json({ error: 'Missing keywords' })

    const response = await apiClient.get('https://music.163.com/api/cloudsearch/pc', {
      params: { s: keywords, type: 1, offset: Number(offset), limit: Number(limit), total: offset > 0 ? false : true },
    })

    const data = response.data
    if (data.code !== 200) {
      return res.status(500).json({ error: 'API Error', code: data.code })
    }

    const songs = (data.result.songs || []).map((song) => ({
      id: song.id,
      name: song.name,
      artist: (song.ar || []).map((a) => a.name).join(' / '),
      artistId: song.ar?.[0]?.id,
      album: song.al?.name || '',
      cover: song.al?.picUrl || '',
      duration: Math.floor((song.dt || 0) / 1000),
    }))

    res.json({ songs, total: data.result.songCount || songs.length })
  } catch (err) {
    console.error('Search error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/song/url', async (req, res) => {
  try {
    const { id, br = 320000 } = req.query
    if (!id) return res.status(400).json({ error: 'Missing id' })

    const ids = String(id).split(',').filter(Boolean)
    const response = await apiClient.get('https://music.163.com/api/song/enhance/player/url', {
      params: { id: ids[0], ids: `[${ids.join(',')}]`, br: Number(br) },
    })

    res.json(response.data)
  } catch (err) {
    console.error('Song URL error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/proxy/audio', async (req, res) => {
  try {
    const { url } = req.query
    if (!url) return res.status(400).json({ error: 'Missing url' })

    const decodedUrl = decodeURIComponent(url)
    const response = await apiClient.get(decodedUrl, {
      responseType: 'stream',
      headers: {
        ...COMMON_HEADERS,
        'Referer': 'https://music.163.com/',
      },
    })

    const contentType = (response.headers['content-type'] || 'audio/mpeg').split(';')[0]
    res.set({
      'Content-Type': contentType,
      'Content-Length': response.headers['content-length'],
      'Accept-Ranges': 'bytes',
    })

    response.data.pipe(res)
  } catch (err) {
    console.error('Audio proxy error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/song/detail', async (req, res) => {
  try {
    const { ids } = req.query
    if (!ids) return res.status(400).json({ error: 'Missing ids' })

    const response = await apiClient.get('https://music.163.com/api/v3/song/detail', {
      params: { c: `[{"id":${ids}}]` },
    })

    const data = response.data
    if (data.code !== 200) {
      return res.status(500).json({ error: 'API Error', code: data.code })
    }

    const songs = (data.songs || []).map((song) => ({
      id: song.id,
      name: song.name,
      artist: (song.ar || []).map((a) => a.name).join(' / '),
      album: song.al?.name || '',
      cover: song.al?.picUrl || '',
      duration: Math.floor((song.dt || 0) / 1000),
    }))

    res.json({ songs })
  } catch (err) {
    console.error('Song detail error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/lyric', async (req, res) => {
  try {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Missing id' })

    const response = await apiClient.get('https://music.163.com/api/song/lyric', {
      params: { id: Number(id), lv: -1, kv: -1, tv: -1 },
    })

    res.json(response.data)
  } catch (err) {
    console.error('Lyric error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/playlist/detail', async (req, res) => {
  try {
    const { id, limit = 100, offset = 0 } = req.query
    if (!id) return res.status(400).json({ error: 'Missing id' })

    const response = await apiClient.get('https://music.163.com/api/v6/playlist/detail', {
      params: { id: Number(id), n: Number(limit), s: 8, offset: Number(offset) },
    })

    const data = response.data
    if (data.code !== 200) {
      return res.status(500).json({ error: 'API Error', code: data.code })
    }

    const playlist = data.playlist
    const tracks = (playlist.tracks || []).map((track) => ({
      id: track.id,
      name: track.name,
      artist: (track.ar || []).map((a) => a.name).join(' / '),
      album: track.al?.name || '',
      cover: track.al?.picUrl || '',
      duration: Math.floor((track.dt || 0) / 1000),
    }))

    res.json({
      playlist: {
        id: playlist.id,
        name: playlist.name,
        cover: playlist.coverImgUrl || '',
        description: playlist.description || '',
        tracks,
        trackCount: playlist.trackCount || tracks.length,
      },
    })
  } catch (err) {
    console.error('Playlist detail error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/recommend/playlists', async (req, res) => {
  try {
    const { limit = 30 } = req.query
    const response = await apiClient.get('https://music.163.com/api/personalized/playlist', {
      params: { limit: Number(limit) },
    })

    const data = response.data
    if (data.code !== 200) {
      return res.status(500).json({ error: 'API Error', code: data.code })
    }

    const playlists = (data.result || []).map((pl) => ({
      id: pl.id,
      name: pl.name,
      cover: pl.picUrl || '',
      trackCount: pl.trackCount || 0,
      playCount: pl.playCount || 0,
      description: pl.copywriter || '',
    }))

    res.json({ playlists })
  } catch (err) {
    console.error('Recommend playlists error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.listen(PORT, () => {
  console.log(`[Music API Proxy] 服务已启动: http://localhost:${PORT}`)
  console.log(`[Music API Proxy] 可用接口:`)
  console.log(`  GET /api/health`)
  console.log(`  GET /api/search?keywords=周杰伦&limit=30`)
  console.log(`  GET /api/song/url?id=123456&br=320000`)
  console.log(`  GET /api/playlist/detail?id=123456`)
  console.log(`  GET /api/recommend/playlists?limit=30`)
  console.log(`  GET /api/song/detail?ids=123,456`)
  console.log(`  GET /api/lyric?id=123456`)
})
