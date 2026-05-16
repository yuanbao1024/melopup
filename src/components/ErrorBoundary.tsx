import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('应用错误:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0f0a1a',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐛</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>应用出了点问题</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 20px', fontSize: 14, textAlign: 'center' }}>
            请按 F12 打开控制台查看详细错误信息
          </p>
          <div style={{
            padding: 16,
            background: 'rgba(255,0,0,0.1)',
            border: '1px solid rgba(255,0,0,0.2)',
            borderRadius: 12,
            maxWidth: 400,
            width: '100%',
            marginBottom: 20,
          }}>
            <pre style={{
              fontSize: 12,
              color: '#f87171',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
              lineHeight: 1.5,
            }}>
              {this.state.error?.message || '未知错误'}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 28px',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            重新加载
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
