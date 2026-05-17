import axios from 'axios'

let userCookie = ''
const APPVER_COOKIE = 'appver=2.0.2; os=pc;'

const NETEASE_COOKIE = 'JSESSIONID-WYYY=FR8cHIY%2B0co%2FdCR%2FJsGjP%2BO%5CmQcMaR9nJm0GhfcigdlTJp5g5q5nHdb%5CumIpz100rCf6n1r%2BxpEPSI9xksDWhmU%2BiecVBPjKKhyK%5CnYeUX7gDb1Jqbcif18peNDvZKd%2B2e%5C32XsaviA9ITm7op%2FMaRGCMANP8BkqJZnxRuuqPE8CflSV%3A1779017389617; _iuqxldmzr_=32; _ntes_nnid=8dcbaea8b7146f99a6991bbb1dcf8cc1,1779015589628; _ntes_nuid=8dcbaea8b7146f99a6991bbb1dcf8cc1; Hm_lvt_1483fb4774c02a30ffa6f0e2945e9b70=1779015590; HMACCOUNT=1A849E710D245D6B; NMTID=00O0qsHkLJIE5DSQEgxl7uFhjierrUAAAGeNZeeNg; WEVNSM=1.0.0; WNMCID=hkfcpt.1779015591035.01.0; __snaker__id=RJkMw5ddVi8s5W8K; WM_NI=spEp9mWd0GfyczYVYRj7AptEOQcpX2UTbcfIYh3pTu4RvYgEbZaG88Aqr%2Br6OD%2Fg0fJuvnV%2BNYTjtUXmZbxpGO3QI2%2Be0wN%2Fms40GfasKgce476XRYgn4gVHQqUioqAyT2c%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6ee96ee449b9484b5ef4193928fb6d14e869b9eb1c62186eba68db23e8b92fd89cf2af0fea7c3b92ab1b08b91bc6795bc00a8e573a1a697b7dc5aaae98f91f74f8d8fad91db3a978cae84e5439bb8fd91d77ff88ebabae64fa286afa8bb3483afbeccf13e8d9ce188b36e8aabba8fd5218e879c8bf75f9cb39683fb7c8591fdb2cc3ae9bb0098cd25afadfcd1c66ea3ad8588e26ff8e9fab9d153a5b2fc88d54493af9b8aee7b83a79cd3e237e2a3; WM_TID=p5FSMbhDi05AAFVVEALGqVszxm%2BNcmxf; gdxidpyhxdE=EhsG806X3hR3tf4ReP%2BrvBd83bRQpIx6%2FzC5aB91JalPiyS2tdbxql%2FGu49kwiTZIG01xPcghXz%2BEIWYwu%2F8myur08gfwQbTNyk%5CC1fknSTgR35OywW7uxxpN7QB3s%5ChC2z0Jz41iO%2F%2FJJkG58I3xuGwpdypbymfX9W3XnRxuzGtZ7zX%3A1779016492037; sDeviceId=YD-av4RNFsFt5NEF1AQQQOS7R8jwz6ZLmyX; ntes_utid=tid._.AR1UJ2lmjeNAEkQRUFKG6B9n1j%252FZK32X._.0; MUSIC_U=0076EF01356BE09580F5263EAB9A611BF51594017E1C2628EC7334EA933F24A891B9F2ABBE0AA4339528B685D46B7E8A83FCCC3590FB4D6AA68A91169C360BBD1996E2C6BFF44C58EEB7427F82D35413DA7E94C99577526A745793AA3C71073FDD1588CECE4A24515AB51886FF031964009318B102A8C972881D78CD6F377B1D6DB9F0D592DCD298AAB0D5E47DE8685557ADD08E9AF2557482C087287D5B325A831F33D90167D3763B77B391C9D0F4262F6C6EA50151BA79BB95E2A53FFEF46374E07FF04F6D5B26BC24E1D12D2F9D5BAF4B03B4E284FD5C8EBDD8CE092868E6ACE2EB8E334D15207CB5FCE6732D2AFE2E388C89F5AAE3C41CD5C4BBD5D048AA3BCB6F3620B2A106996E2949C066282E7F302B7E9D982E67020C476AE1476F6D238BA83155F638C79E5C5FA0E3677B4D3DBCA2B0C4BAD877673282CFB1A57EDA94EB348012FE415E4F2169848A1A005B8D9F42818B732A0EC30A61D41D422E3F91F2E4C3ADBA8354786EC779747B6A6DCBEE78D8EB1C9D0C935865B93EF515872DC22F5BEB792F526DADD571712101F9C947CEA7DDFD7C5DBA1D9E961EE2840954BF6738B1D418D2B4A25E55B4B3C24A26; __csrf=3dbcd669bb54d3d96f5147effa13d00b; Hm_lpvt_1483fb4774c02a30ffa6f0e2945e9b70=1779015610; ntes_kaola_ad=1'

function getCookie() {
  if (userCookie) return userCookie
  return NETEASE_COOKIE
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
