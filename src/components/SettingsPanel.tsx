import React, { useState, useEffect } from 'react'
import { useAppState } from '../context/AppContext'
import { saveApiConfig, getApiConfig } from '../services/aiService'
import { setNeteaseCookie, getNeteaseCookieStatus } from '../services/api'
import './SettingsPanel.css'

const COOKIE_STORAGE_KEY = 'netease_cloud_cookie'

interface ProviderTemplate {
  label: string
  baseURL: string
  model: string
}

const PROVIDERS: Record<string, ProviderTemplate> = {
  openai: {
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  deepseek: {
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  moonshot: {
    label: 'Moonshot / Kimi',
    baseURL: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
  },
}

export default function SettingsPanel() {
  const { dispatch } = useAppState()
  const config = getApiConfig()
  const [apiKey, setApiKey] = useState(config.apiKey)
  const [baseURL, setBaseURL] = useState(config.baseURL)
  const [model, setModel] = useState(config.model)
  const [saved, setSaved] = useState(false)
  const [activeProvider, setActiveProvider] = useState<string | null>(null)

  const [cookieInput, setCookieInput] = useState(() => localStorage.getItem(COOKIE_STORAGE_KEY) || '')
  const [cookieSaved, setCookieSaved] = useState(false)
  const [cookieActive, setCookieActive] = useState(false)
  const [cookieVerifying, setCookieVerifying] = useState(false)

  useEffect(() => {
    getNeteaseCookieStatus().then((status) => {
      setCookieActive(status.hasCookie)
    }).catch(() => {})
  }, [])

  const applyProvider = (key: string) => {
    const p = PROVIDERS[key]
    if (!p) return
    setBaseURL(p.baseURL)
    setModel(p.model)
    setActiveProvider(key)
  }

  const handleSave = () => {
    saveApiConfig(apiKey, baseURL, model)
    dispatch({ type: 'SET_API_CONFIGURED', payload: true })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    setApiKey('')
    setBaseURL(PROVIDERS.openai.baseURL)
    setModel(PROVIDERS.openai.model)
    saveApiConfig('', PROVIDERS.openai.baseURL, PROVIDERS.openai.model)
    dispatch({ type: 'SET_API_CONFIGURED', payload: false })
    setActiveProvider(null)
  }

  const handleCookieSave = async () => {
    try {
      const trimmed = cookieInput.trim()
      localStorage.setItem(COOKIE_STORAGE_KEY, trimmed)
      const hasCookie = await setNeteaseCookie(trimmed)
      setCookieActive(hasCookie)
      setCookieSaved(true)
      setTimeout(() => setCookieSaved(false), 2000)
    } catch (err) {
      console.error('保存 Cookie 失败:', err)
    }
  }

  const handleCookieClear = async () => {
    setCookieInput('')
    localStorage.removeItem(COOKIE_STORAGE_KEY)
    await setNeteaseCookie('')
    setCookieActive(false)
  }

  const handleVerify = async () => {
    setCookieVerifying(true)
    try {
      const status = await getNeteaseCookieStatus()
      setCookieActive(status.hasCookie)
      if (status.hasCookie) {
        const testRes = await fetch('/api/search?keywords=周杰伦&limit=1')
        const data = await testRes.json()
        if (data.songs && data.songs.length > 0) {
          alert('✅ Cookie 验证成功！VIP 歌曲已可播放')
        } else {
          alert('⚠️ Cookie 已设置，但搜索接口异常')
        }
      } else {
        alert('❌ Cookie 未生效，请检查后重试')
      }
    } catch {
      alert('❌ 验证失败，请确保后端服务运行正常')
    } finally {
      setCookieVerifying(false)
    }
  }

  return (
    <div className="settings-panel">
      <button className="settings-back-btn" onClick={() => dispatch({ type: 'SET_VIEW', payload: 'pet' })}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        返回
      </button>
      <div className="settings-header">
        <h2 className="settings-title">设置</h2>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h3>选择服务商</h3>
          <p className="section-desc">一键切换，自动填入 API 地址和模型名称</p>
          <div className="provider-grid">
            {Object.entries(PROVIDERS).map(([key, p]) => (
              <button
                key={key}
                className={`provider-card ${activeProvider === key ? 'active' : ''} ${baseURL === p.baseURL ? 'active' : ''}`}
                onClick={() => applyProvider(key)}
              >
                <span className={`provider-dot ${key}`} />
                <span className="provider-name">{p.label}</span>
                <span className="provider-model">{p.model}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h3>AI 服务配置</h3>
          <p className="section-desc">填写你的 API Key，所有信息仅保存在本地浏览器中</p>

          <div className="form-group">
            <label>API Key <span className="required">*</span></label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>API 地址</label>
            <input
              type="text"
              value={baseURL}
              onChange={(e) => { setBaseURL(e.target.value); setActiveProvider(null) }}
              placeholder="https://api.deepseek.com/v1"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>模型名称</label>
            <input
              type="text"
              value={model}
              onChange={(e) => { setModel(e.target.value); setActiveProvider(null) }}
              placeholder="deepseek-chat"
              className="form-input"
            />
          </div>

          <div className="settings-actions">
            <button className="save-btn" onClick={handleSave}>
              {saved ? '已保存 ✓' : '保存配置'}
            </button>
            <button className="clear-btn" onClick={handleClear}>
              清除
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>网易云音乐 VIP</h3>
          <p className="section-desc">
            登录网易云音乐网页版后，复制 Cookie 粘贴到下方以解锁 VIP 歌曲
          </p>

          <div className="cookie-status-bar">
            <span className={`cookie-dot ${cookieActive ? 'active' : ''}`} />
            <span className="cookie-status-text">
              {cookieActive ? 'Cookie 已生效，VIP 歌曲可播放' : '未设置 Cookie，仅免费歌曲可播'}
            </span>
          </div>

          <div className="form-group">
            <label>Cookie</label>
            <textarea
              value={cookieInput}
              onChange={(e) => setCookieInput(e.target.value)}
              placeholder="粘贴从浏览器复制的 Cookie..."
              className="form-textarea"
              rows={4}
            />
          </div>

          <div className="settings-actions">
            <button className="save-btn" onClick={handleCookieSave}>
              {cookieSaved ? '已保存 ✓' : '保存 Cookie'}
            </button>
            <button className="verify-btn" onClick={handleVerify} disabled={cookieVerifying}>
              {cookieVerifying ? '验证中...' : '验证'}
            </button>
            <button className="clear-btn" onClick={handleCookieClear}>
              清除
            </button>
          </div>

          <details className="cookie-guide">
            <summary className="cookie-guide-summary">
              📖 如何获取 Cookie？
            </summary>
            <div className="cookie-guide-content">
              <p><strong>第一步：</strong>打开浏览器，访问 <a href="https://music.163.com" target="_blank" rel="noopener noreferrer">music.163.com</a></p>
              <p><strong>第二步：</strong>登录你的网易云音乐账号（需要黑胶VIP会员）</p>
              <p><strong>第三步：</strong>按 <kbd>F12</kbd> 打开开发者工具 → 切换到 <strong>Network（网络）</strong> 标签</p>
              <p><strong>第四步：</strong>刷新页面，点击第一个请求（通常是 <code>music.163.com</code>）</p>
              <p><strong>第五步：</strong>在 <strong>Request Headers</strong> 中找到 <code>Cookie:</code> 那一行，右键 → <strong>Copy value</strong></p>
              <p><strong>第六步：</strong>粘贴到上面的输入框中，点击「保存 Cookie」</p>
              <p className="cookie-guide-note">
                ⚠️ Cookie 会过期，如果之后听不了歌了，重复以上步骤更新即可。
                你的 Cookie 只保存在你自己的电脑上，不会上传到任何第三方。
              </p>
            </div>
          </details>
        </div>

        <div className="settings-section">
          <h3>提示</h3>
          <ul className="tips-list">
            <li>使用 <strong>DeepSeek</strong>：前往 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer">platform.deepseek.com</a> 获取 Key</li>
            <li>使用 <strong>Moonshot/Kimi</strong>：前往 <a href="https://platform.moonshot.cn/console/api-keys" target="_blank" rel="noopener noreferrer">platform.moonshot.cn</a> 获取 Key</li>
            <li>所有 API Key 仅保存在你本地的浏览器中，安全可靠</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
