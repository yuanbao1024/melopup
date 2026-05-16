import { ChatMessage } from '../types'

const MEMORY_KEY = 'melo_pup_memory'
const MEMORY_PREFERENCES_KEY = 'melo_pup_preferences'
const MEMORY_CONVERSATIONS_KEY = 'melo_pup_conversations'
const MAX_MEMORY_MESSAGES = 20

interface MemoryEntry {
  key: string
  value: string
  timestamp: number
}

export class MemoryService {
  private subscribers: Set<() => void> = new Set()

  subscribe(callback: () => void) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  private notify() {
    this.subscribers.forEach((cb) => cb())
  }

  getConversation(): ChatMessage[] {
    try {
      const raw = localStorage.getItem(MEMORY_CONVERSATIONS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  addMessage(msg: ChatMessage) {
    const conv = this.getConversation()
    conv.push(msg)
    if (conv.length > MAX_MEMORY_MESSAGES * 2) {
      conv.splice(0, conv.length - MAX_MEMORY_MESSAGES)
    }
    localStorage.setItem(MEMORY_CONVERSATIONS_KEY, JSON.stringify(conv))
    this.notify()
  }

  clearConversation() {
    localStorage.removeItem(MEMORY_CONVERSATIONS_KEY)
    this.notify()
  }

  getPreferences(): Record<string, string> {
    try {
      const raw = localStorage.getItem(MEMORY_PREFERENCES_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  setPreference(key: string, value: string) {
    const prefs = this.getPreferences()
    prefs[key] = value
    prefs._updatedAt = Date.now().toString()
    localStorage.setItem(MEMORY_PREFERENCES_KEY, JSON.stringify(prefs))
    this.notify()
  }

  private extractPreferences(text: string): Record<string, string> {
    const prefs: Record<string, string> = {}
    const lines = text.split('\n')
    for (const line of lines) {
      const match = line.match(/-\s*(喜欢|偏好|偏爱|爱听|常听|最爱|风格|偏好)?[:：]?\s*(.+)/)
      if (match) {
        const key = match[1] || '偏好'
        const value = match[2].trim()
        if (value.length > 2 && value.length < 50) {
          prefs[`${key}_${Date.now()}`] = value
        }
      }
    }
    return prefs
  }

  extractMemoriesFromResponse(aiResponse: string) {
    const extracted = this.extractPreferences(aiResponse)
    const existing = this.getPreferences()
    Object.assign(existing, extracted)
    localStorage.setItem(MEMORY_PREFERENCES_KEY, JSON.stringify(existing))
    this.notify()
  }

  getMemorySummary(): string {
    const prefs = this.getPreferences()
    const conv = this.getConversation()
    const parts: string[] = []

    const preferenceValues = Object.entries(prefs)
      .filter(([k]) => !k.startsWith('_'))
      .map(([, v]) => v)

    if (preferenceValues.length > 0) {
      parts.push('## 已知喜好')
      preferenceValues.slice(0, 10).forEach((v) => {
        parts.push(`- ${v}`)
      })
    }

    if (conv.length > 0) {
      parts.push(`\n## 最近对话 (${conv.length} 条)`)
      const recent = conv.slice(-6)
      recent.forEach((m) => {
        const label = m.role === 'user' ? '用户' : 'AI'
        const content = m.content.slice(0, 80)
        parts.push(`- ${label}: ${content}${m.content.length > 80 ? '...' : ''}`)
      })
    }

    return parts.join('\n')
  }

  exportAsMarkdown(): string {
    const prefs = this.getPreferences()
    const conv = this.getConversation()
    const now = new Date().toLocaleString('zh-CN')

    let md = `# MeloPup 记忆备份\n`
    md += `> 导出时间: ${now}\n\n`

    md += `## 🎵 音乐喜好\n\n`
    const prefValues = Object.entries(prefs).filter(([k]) => !k.startsWith('_'))
    if (prefValues.length === 0) {
      md += `*暂无记录*\n\n`
    } else {
      prefValues.forEach(([, v]) => {
        md += `- ${v}\n`
      })
      md += '\n'
    }

    md += `## 💬 对话记录\n\n`
    if (conv.length === 0) {
      md += `*暂无对话*\n\n`
    } else {
      conv.forEach((m, i) => {
        const role = m.role === 'user' ? '**你**' : '**MeloPup**'
        const time = new Date(m.timestamp).toLocaleString('zh-CN')
        md += `### ${role} (${time})\n\n${m.content}\n\n`
      })
    }

    md += `---\n*由 MeloPup 自动生成*\n`
    return md
  }

  downloadMemoryMd() {
    const md = this.exportAsMarkdown()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `melo_pup_memory_${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }
}

export const memoryService = new MemoryService()
