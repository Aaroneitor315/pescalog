import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, componentStack: '' }
  }
  static getDerivedStateFromError(e) { return { error: e } }
  componentDidCatch(error, info) {
    this.setState({ componentStack: info?.componentStack || '' })
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#080f1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
          <p style={{ color: '#f87171', fontSize: 12, fontFamily: 'monospace', textAlign: 'center' }}>
            {this.state.error?.message || String(this.state.error)}
          </p>
          <p style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxWidth: 360, textAlign: 'left', wordBreak: 'break-all' }}>
            {this.state.componentStack}
          </p>
          <button onClick={() => window.location.reload()} style={{ background: '#0891b2', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
