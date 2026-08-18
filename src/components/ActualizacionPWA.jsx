import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

// Aviso de versión nueva. Con registerType:'prompt', el service worker nuevo
// espera; acá detectamos ese estado y ofrecemos aplicarlo al toque en vez de
// depender de que el usuario cierre la app.
const INTERVALO_CHEQUEO = 15 * 60 * 1000 // 15 min

export default function ActualizacionPWA() {
  const {
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, r) {
      // Revisa periódicamente si hay versión nueva, sin recargar la página.
      if (r) setInterval(() => r.update(), INTERVALO_CHEQUEO)
    },
  })

  if (!hayVersionNueva) return null

  return (
    <div
      className="fixed left-0 right-0 z-40 px-4 flex justify-center pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)' }}
    >
      <div className="pointer-events-auto w-full max-w-md flex items-center gap-3 bg-navy-800 border border-cyan-500/40 rounded-2xl px-4 py-3 shadow-xl"
        style={{ boxShadow: '0 8px 28px rgba(6,182,212,0.25)' }}>
        <div className="bg-cyan-500/15 border border-cyan-500/30 rounded-lg p-2 flex-shrink-0">
          <RefreshCw size={18} className="text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">Hay una versión nueva</p>
          <p className="text-xs text-slate-400">Actualizá para ver las últimas novedades.</p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="btn-primary flex-shrink-0 text-sm px-4 py-2"
        >
          Actualizar
        </button>
        <button
          onClick={() => setHayVersionNueva(false)}
          aria-label="Cerrar"
          className="text-slate-500 hover:text-slate-300 flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
