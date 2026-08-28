import { useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

// Aviso de versión nueva. Con registerType:'prompt', el service worker nuevo
// espera; acá detectamos ese estado y ofrecemos aplicarlo al toque.
//
// La recarga NO se delega en updateServiceWorker(), porque esa depende del
// evento `controllerchange`, que sin clients.claim() (que evitamos a propósito,
// ver CLAUDE.md) nunca se dispara y el botón "no hace nada". En su lugar
// mandamos SKIP_WAITING al worker en espera y recargamos cuando pasa a
// `activated`, con un fallback por timeout.
const INTERVALO_CHEQUEO = 15 * 60 * 1000 // 15 min

export default function ActualizacionPWA() {
  const regRef = useRef(null)
  const recargandoRef = useRef(false)

  const {
    needRefresh: [hayVersionNueva, setHayVersionNueva],
  } = useRegisterSW({
    onRegisteredSW(_url, r) {
      regRef.current = r
      if (r) setInterval(() => r.update(), INTERVALO_CHEQUEO)
    },
  })

  function recargarUnaVez() {
    if (recargandoRef.current) return
    recargandoRef.current = true
    window.location.reload()
  }

  function actualizar() {
    const r = regRef.current
    const enEspera = r && r.waiting
    if (enEspera) {
      // Recarga cuando el SW nuevo termina de activarse.
      enEspera.addEventListener('statechange', (e) => {
        if (e.target.state === 'activated') recargarUnaVez()
      })
      enEspera.postMessage({ type: 'SKIP_WAITING' })
      // Fallback: si por algún motivo no llega el statechange, recargá igual.
      setTimeout(recargarUnaVez, 2000)
    } else {
      // No hay worker en espera (ya se activó): recarga directa.
      recargarUnaVez()
    }
  }

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
          onClick={actualizar}
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
