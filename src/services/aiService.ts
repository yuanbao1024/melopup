type OpenAIClient = any

let client: OpenAIClient | null = null

function getDefaultModel(): string {
  const config = getApiConfig()
  return config.model
}

function extractJson(text: string): string {
  const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonBlock) return jsonBlock[1].trim()

  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return text.slice(jsonStart, jsonEnd + 1)
  }

  return text.trim()
}

function extractJsonArray(text: string): string {
  const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonBlock) return jsonBlock[1].trim()

  const arrayStart = text.indexOf('[')
  const arrayEnd = text.lastIndexOf(']')
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    return text.slice(arrayStart, arrayEnd + 1)
  }

  return text.trim()
}

async function getClient(apiKey?: string): Promise<OpenAIClient> {
  const config = getApiConfig()
  const key = apiKey || config.apiKey
  const baseURL = config.baseURL

  if (client && key !== 'proxy') return client

  if (!key) {
    throw new Error('请先在设置中配置 API Key')
  }

  const OpenAI = (await import('openai')).default
  client = new OpenAI({
    apiKey: key === 'proxy' ? 'sk-proxy-placeholder' : key,
    baseURL,
    dangerouslyAllowBrowser: true,
    timeout: 60000,
    maxRetries: 2,
  })
  return client
}

function buildAnalysisPrompt(songName: string, artist: string, profileSummary?: string): string {
  let personalContext = ''
  if (profileSummary) {
    personalContext = `\n\n重要：以下是我的音乐画像，请结合我的听歌喜好来做个性化分析：\n${profileSummary}\n\n请特别说明这首歌为什么会吸引我这样的人，以及它与我的音乐品味之间的关系。`
  }

  return `你是一位充满洞察力的音乐评论家，文笔优美，见解独到。请对以下歌曲进行一次深入、自由、有温度的音乐分析：

歌曲：${songName}
艺术家：${artist}${personalContext}

要求：
1. 请以随笔/乐评的风格自由分析，不要拘泥于固定模块
2. 分析角度由你自由选择——可以是但不限于：创作故事、音乐风格、歌词意境、情感表达、历史背景、编曲亮点、文化影响
3. 请根据这首歌本身的特点来决定分析的角度和深度，每首歌的侧重点可以完全不同
4. 分析内容要有深度、有温度，读起来像一篇优质的乐评文章
5. 最后请给出一个总体评分（1-10分）
6. 最后写一段简短的个人感悟，像是老朋友在分享听后感${profileSummary ? '\n7. 结合用户的音乐画像，指出为什么这首歌可能与用户产生共鸣' : ''}

返回格式必须是严格的JSON（不要包含markdown代码块标记）：
{
  "songName": "${songName}",
  "artist": "${artist}",
  "sections": [
    { "title": "第一个分析角度", "content": "详细的分析内容，100-200字" },
    { "title": "第二个分析角度", "content": "详细的分析内容，100-200字" },
    { "title": "第三个分析角度", "content": "详细的分析内容，100-200字" }
  ],
  "rating": 8,
  "personalNote": "一段有温度的个人感悟，30-50字"
}

sections 数组中的元素数量由你根据歌曲特点决定，建议3-5个角度。每个角度的标题要精准且有吸引力。请确保只返回纯JSON，不要包含任何其他文字。`
}

function buildRecommendPrompt(songs: { name: string; artist: string }[]): string {
  const list = songs.map((s, i) => `${i + 1}. ${s.name} - ${s.artist}`).join('\n')
  return `以下是我喜欢的歌曲列表：
${list}

请根据这些歌曲的风格偏好，推荐10首我应该也会喜欢的歌曲。请以JSON数组格式返回：

[
  {
    "name": "推荐歌曲名",
    "artist": "艺术家",
    "reason": "为什么推荐这首歌（用中文，30字以内）",
    "matchScore": 85
  }
]

matchScore是匹配度分数（0-100）。请返回10首推荐歌曲。请确保只返回纯JSON数组，不要包含任何其他文字。`
}

function buildProfileRecommendPrompt(profileSummary: string): string {
  return `以下是系统根据你的收听历史生成的音乐画像：

${profileSummary}

请根据这个用户的音乐画像和偏好，推荐10首他/她可能会喜欢的歌曲。推荐的歌曲应该是真实存在的华语/英语/日语流行歌曲。

请以JSON数组格式返回：

[
  {
    "name": "推荐歌曲名",
    "artist": "艺术家",
    "reason": "为什么推荐这首歌（用中文，30字以内）",
    "matchScore": 85
  }
]

matchScore是匹配度分数（0-100）。请返回10首推荐歌曲。请确保只返回纯JSON数组，不要包含任何其他文字。`
}

export async function analyzeSong(
  songName: string,
  artist: string,
  profileSummary?: string,
  onProgress?: (text: string) => void
): Promise<{
  songName: string
  artist: string
  sections: { title: string; content: string }[]
  rating: number
  personalNote: string
}> {
  let openai: OpenAIClient
  try {
    openai = await getClient()
  } catch (e: any) {
    throw new Error(e.message || '请先在设置中配置 API Key 和 API 地址')
  }

  const model = localStorage.getItem('OPENAI_MODEL') || getDefaultModel()

  let fullContent = ''

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位充满洞察力的音乐评论家，文笔优美如散文家，见解独到如乐评人。你擅长发现每首歌独特的魅力，并用有温度的文字表达出来。请始终使用中文回答，并以严格的JSON格式返回结果，不要包含markdown代码块或其他文字。',
        },
        {
          role: 'user',
          content: buildAnalysisPrompt(songName, artist, profileSummary),
        },
      ],
      stream: true,
      temperature: 0.8,
      max_tokens: 3072,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      fullContent += content
      if (onProgress) onProgress(fullContent)
    }
  } catch (e: any) {
    client = null
    if (e.status === 404) {
      throw new Error(`模型 "${model}" 不存在或 API 地址不正确，请在设置中检查模型名称和 API 地址`)
    }
    if (e.status === 401) {
      throw new Error('API Key 无效，请在设置中检查')
    }
    if (e.message?.includes('timed out') || e.message?.includes('timeout') || e.message?.includes('ETIMEDOUT')) {
      throw new Error('API 请求超时，请检查网络连接或 API 地址是否正确')
    }
    throw new Error(`AI 请求失败: ${e.message || '未知错误'}`)
  }

  const jsonStr = extractJson(fullContent)

  try {
    const parsed = JSON.parse(jsonStr)
    return {
      songName: parsed.songName || songName,
      artist: parsed.artist || artist,
      sections: Array.isArray(parsed.sections) ? parsed.sections : [{ title: '整体赏析', content: parsed.background || parsed.overall || fullContent }],
      rating: typeof parsed.rating === 'number' ? parsed.rating : 5,
      personalNote: parsed.personalNote || '',
    }
  } catch {
    if (onProgress) onProgress(fullContent)
    return {
      songName,
      artist,
      sections: [{ title: '整体赏析', content: fullContent || '无法解析 AI 返回结果，请重试' }],
      rating: 5,
      personalNote: '',
    }
  }
}

export async function getRecommendations(
  songs: { name: string; artist: string }[],
  onProgress?: (text: string) => void
): Promise<{ name: string; artist: string; reason: string; matchScore: number }[]> {
  let openai: OpenAIClient
  try {
    openai = await getClient()
  } catch (e: any) {
    throw new Error(e.message || '请先在设置中配置 API Key 和 API 地址')
  }

  const model = localStorage.getItem('OPENAI_MODEL') || getDefaultModel()

  let fullContent = ''

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的音乐推荐算法专家。请以严格的JSON数组格式返回推荐结果，不要包含markdown代码块或其他文字。',
        },
        {
          role: 'user',
          content: buildRecommendPrompt(songs),
        },
      ],
      stream: true,
      temperature: 0.8,
      max_tokens: 2048,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      fullContent += content
      if (onProgress) onProgress(fullContent)
    }
  } catch (e: any) {
    client = null
    if (e.status === 404) {
      throw new Error(`模型 "${model}" 不存在或 API 地址不正确，请在设置中检查模型名称和 API 地址`)
    }
    if (e.status === 401) {
      throw new Error('API Key 无效，请在设置中检查')
    }
    if (e.message?.includes('timed out') || e.message?.includes('timeout') || e.message?.includes('ETIMEDOUT')) {
      throw new Error('API 请求超时，请检查网络连接或 API 地址是否正确')
    }
    throw new Error(`AI 请求失败: ${e.message || '未知错误'}`)
  }

  const jsonStr = extractJsonArray(fullContent)

  try {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) return parsed
    if (parsed.recommendations) return parsed.recommendations
    return []
  } catch {
    return []
  }
}

export async function getProfileRecommendations(
  profileSummary: string,
  onProgress?: (text: string) => void
): Promise<{ name: string; artist: string; reason: string; matchScore: number }[]> {
  let openai: OpenAIClient
  try {
    openai = await getClient()
  } catch (e: any) {
    throw new Error(e.message || '请先在设置中配置 API Key 和 API 地址')
  }

  const model = localStorage.getItem('OPENAI_MODEL') || getDefaultModel()

  let fullContent = ''

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的音乐推荐算法专家。请以严格的JSON数组格式返回推荐结果，不要包含markdown代码块或其他文字。',
        },
        {
          role: 'user',
          content: buildProfileRecommendPrompt(profileSummary),
        },
      ],
      stream: true,
      temperature: 0.8,
      max_tokens: 2048,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      fullContent += content
      if (onProgress) onProgress(fullContent)
    }
  } catch (e: any) {
    client = null
    if (e.status === 404) {
      throw new Error(`模型 "${model}" 不存在或 API 地址不正确，请在设置中检查模型名称和 API 地址`)
    }
    if (e.status === 401) {
      throw new Error('API Key 无效，请在设置中检查')
    }
    if (e.message?.includes('timed out') || e.message?.includes('timeout') || e.message?.includes('ETIMEDOUT')) {
      throw new Error('API 请求超时，请检查网络连接或 API 地址是否正确')
    }
    throw new Error(`AI 请求失败: ${e.message || '未知错误'}`)
  }

  const jsonStr = extractJsonArray(fullContent)

  try {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) return parsed
    if (parsed.recommendations) return parsed.recommendations
    return []
  } catch {
    return []
  }
}

function buildTasteSummaryPrompt(profileSummary: string): string {
  return `以下是我的音乐画像：

${profileSummary}

请根据以上信息，用生动活泼的方式帮我总结我的音乐品味。要求：

1. 用一段话精彩描述我的音乐品味（summary），60字以内，要有画面感
2. 分析我可能喜欢的音乐风格（genres），列出3-5个，包括风格名称(name)、在你心中所占百分比(percentage, 0-100)和对应的emoji
3. 给我一个有趣的冷知识（funFact），比如最爱听歌的时间段、最常重复的歌曲模式等，30字以内
4. 用一句话描述我的音乐氛围（vibe），20字以内
5. 给我的音乐氛围一个代表色（vibeColor），用hex颜色代码

请以严格的JSON格式返回：
{
  "summary": "你的音乐品味像一场...",
  "genres": [
    { "name": "流行", "percentage": 70, "emoji": "🎤" },
    { "name": "摇滚", "percentage": 20, "emoji": "🎸" },
    { "name": "电子", "percentage": 10, "emoji": "🎹" }
  ],
  "funFact": "你最喜欢在深夜10点后听歌...",
  "vibe": "温暖而充满力量的深夜氛围",
  "vibeColor": "#8b5cf6"
}

请确保只返回纯JSON，不要包含任何其他文字。`
}

export async function getTasteSummary(
  profileSummary: string
): Promise<{
  summary: string
  genres: { name: string; percentage: number; emoji: string }[]
  funFact: string
  vibe: string
  vibeColor: string
}> {
  let openai: OpenAIClient
  try {
    openai = await getClient()
  } catch (e: any) {
    throw new Error(e.message || '请先在设置中配置 API Key 和 API 地址')
  }

  const model = localStorage.getItem('OPENAI_MODEL') || getDefaultModel()

  let fullContent = ''

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位充满创意和洞察力的音乐品味分析师。你擅长从用户的听歌数据中挖掘出有趣、生动的品味特征，并用活泼、热情的语言表达出来。请始终使用中文回答，并以严格的JSON格式返回结果。',
        },
        {
          role: 'user',
          content: buildTasteSummaryPrompt(profileSummary),
        },
      ],
      stream: true,
      temperature: 0.9,
      max_tokens: 1536,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      fullContent += content
    }
  } catch (e: any) {
    client = null
    if (e.status === 404) {
      throw new Error(`模型 "${model}" 不存在或 API 地址不正确，请在设置中检查模型名称和 API 地址`)
    }
    if (e.status === 401) {
      throw new Error('API Key 无效，请在设置中检查')
    }
    if (e.message?.includes('timed out') || e.message?.includes('timeout') || e.message?.includes('ETIMEDOUT')) {
      throw new Error('API 请求超时，请检查网络连接或 API 地址是否正确')
    }
    throw new Error(`AI 请求失败: ${e.message || '未知错误'}`)
  }

  const jsonStr = extractJson(fullContent)

  try {
    const parsed = JSON.parse(jsonStr)
    return {
      summary: parsed.summary || '你的音乐品味独特而丰富',
      genres: Array.isArray(parsed.genres) ? parsed.genres : [],
      funFact: parsed.funFact || '',
      vibe: parsed.vibe || '',
      vibeColor: parsed.vibeColor || '#8b5cf6',
    }
  } catch {
    return {
      summary: '你的音乐品味独特而丰富',
      genres: [],
      funFact: '',
      vibe: '',
      vibeColor: '#8b5cf6',
    }
  }
}

export function saveApiConfig(apiKey: string, baseURL?: string, model?: string) {
  if (apiKey) {
    localStorage.setItem('OPENAI_API_KEY', apiKey)
  } else {
    localStorage.removeItem('OPENAI_API_KEY')
  }
  if (baseURL !== undefined) localStorage.setItem('OPENAI_BASE_URL', baseURL)
  if (model !== undefined) localStorage.setItem('OPENAI_MODEL', model)
  client = null
}

export function getApiConfig() {
  const userKey = localStorage.getItem('OPENAI_API_KEY')
  const userBaseURL = localStorage.getItem('OPENAI_BASE_URL')
  const userModel = localStorage.getItem('OPENAI_MODEL')

  if (userKey) {
    return {
      apiKey: userKey,
      baseURL: userBaseURL || 'https://api.openai.com/v1',
      model: userModel || 'gpt-4o-mini',
    }
  }

  return {
    apiKey: 'proxy',
    baseURL: '/api/ai/v1',
    model: 'deepseek-v4-flash',
  }
}

export async function chatWithMemory(
  userMessage: string,
  context: {
    currentSong?: { name: string; artist: string }
    userProfileSummary: string
    memorySummary: string
    conversationHistory: { role: string; content: string }[]
  },
  onProgress?: (text: string) => void
): Promise<string> {
  let openai: OpenAIClient
  try {
    openai = await getClient()
  } catch (e: any) {
    throw new Error(e.message || '请先在设置中配置 API Key 和 API 地址')
  }

  const model = localStorage.getItem('OPENAI_MODEL') || getDefaultModel()

  const nowPlaying = context.currentSong
    ? `\n当前正在播放: ${context.currentSong.name} - ${context.currentSong.artist}`
    : '\n当前没有播放歌曲'

  const systemPrompt = `你是 MeloPup 的音乐伙伴，一个懂音乐、有记忆、有个性的 AI 聊天助手。

你的核心能力：
1. **音乐知识** — 熟悉各种音乐风格、艺术家、专辑、乐理知识
2. **个性化推荐** — 根据用户的喜好和记忆提供精准推荐
3. **有记忆的对话** — 记住用户说过的偏好，在后续对话中体现
4. **音乐分享** — 自然地推荐歌曲，并解释为什么适合用户

用户画像：${context.userProfileSummary}

记忆信息：${context.memorySummary}

${nowPlaying}

对话风格：
- 自然、热情、像朋友一样聊音乐
- 当用户提到喜欢的歌曲/风格时，记住并融入后续对话
- 推荐歌曲时给出推荐理由，可以反问用户的感受
- 如果用户聊到非音乐话题，温和地引导回音乐主题
- 始终使用中文回复
- 回复简洁自然，一般不超过 150 字
- 推荐歌曲时用格式：【歌名 - 歌手】`

  let fullContent = ''

  try {
    const messages: any[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ]

    const recentHistory = context.conversationHistory.slice(-6)
    recentHistory.forEach((m) => {
      messages.push({ role: m.role, content: m.content })
    })

    messages.push({ role: 'user', content: userMessage })

    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
      temperature: 0.8,
      max_tokens: 1024,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      fullContent += content
      if (onProgress) onProgress(fullContent)
    }
  } catch (e: any) {
    client = null
    if (e.status === 404) {
      throw new Error(`模型 "${model}" 不存在或 API 地址不正确，请在设置中检查`)
    }
    if (e.status === 401) {
      throw new Error('API Key 无效，请在设置中检查')
    }
    if (e.message?.includes('timed out') || e.message?.includes('timeout') || e.message?.includes('ETIMEDOUT')) {
      throw new Error('API 请求超时，请检查网络连接')
    }
    throw new Error(`AI 请求失败: ${e.message || '未知错误'}`)
  }

  return fullContent
}
