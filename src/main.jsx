import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ActualizacionPWA from './components/ActualizacionPWA'
import InstalarIOS from './components/InstalarIOS'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(e) { return { error: e } }
  componentDidCatch(error, info) {
    // El detalle queda en consola para diagnóstico, no en pantalla.
    console.error('[BitácoraAR]', error, info?.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', boxSizing: 'border-box', background: '#080f1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32, textAlign: 'center' }}>
          <img src="/logo.png" alt="BitácoraAR" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 600, fontFamily: 'system-ui, sans-serif', margin: 0 }}>
              Algo no cargó bien
            </p>
            <p style={{ color: '#94a3b8', fontSize: 14, fontFamily: 'system-ui, sans-serif', margin: 0, lineHeight: 1.5, maxWidth: 300 }}>
              Tus datos están guardados. Probá de nuevo.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 32px', fontSize: 15, fontWeight: 700, fontFamily: 'system-ui, sans-serif', cursor: 'pointer', boxShadow: '0 4px 16px rgba(6,182,212,0.3)' }}>
            Reintentar
          </button>
          <p style={{ color: '#475569', fontSize: 12, fontFamily: 'system-ui, sans-serif', margin: 0, lineHeight: 1.6 }}>
            ¿Sigue fallando? Escribinos a<br />
            <a href="mailto:contacto@bitacoraar.com.ar" style={{ color: '#0e7490', textDecoration: 'none' }}>
              contacto@bitacoraar.com.ar
            </a>
          </p>
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
      <ActualizacionPWA />
      <InstalarIOS />
    </ErrorBoundary>
  </React.StrictMode>
)
