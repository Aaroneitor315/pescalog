import { useNetwork } from '../hooks/useNetwork'
import { WifiOff, Wifi } from 'lucide-react'

export default function NetworkBanner() {
  const { online, volvioCon } = useNetwork()

  if (online && !volvioCon) return null

  if (volvioCon) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: '#14532d', borderBottom: '1px solid #166534',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '8px 16px',
        animation: 'slideDown 0.3s ease',
      }}>
        <Wifi size={15} color="#4ade80" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>
          Conexión restaurada · Sincronizando datos...
        </span>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: '#1c1917', borderBottom: '1px solid #44403c',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, padding: '8px 16px',
      animation: 'slideDown 0.3s ease',
    }}>
      <WifiOff size={15} color="#f59e0b" />
      <span style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>
        Sin conexión · Los cambios se guardarán al reconectarte
      </span>
    </div>
  )
}
