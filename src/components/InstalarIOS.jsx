import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'

// iPhone/iPad no tiene botón de "instalar": el usuario debe agregar la app a la
// pantalla de inicio desde Safari (Compartir → Agregar a inicio). Este aviso lo
// explica. Solo aparece en iOS, si la app todavía NO está instalada.
const CLAVE_CERRADO = 'instalar-ios-cerrado'

function detectar() {
  if (typeof navigator === 'undefined') return { mostrar: false }
  const ua = navigator.userAgent || ''
  const esIOS = /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPad iPadOS
  const instalada = window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  // En iOS solo instala Safari; los demás navegadores traen estos tokens.
  const esSafari = !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/i.test(ua)
  return { mostrar: esIOS && !instalada, esSafari }
}

// Ícono "Compartir" de iOS (cuadrado con flecha hacia arriba).
function IconoCompartir({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V3" />
      <path d="m8 7 4-4 4 4" />
      <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" />
    </svg>
  )
}

export default function InstalarIOS() {
  const [estado, setEstado] = useState({ mostrar: false, esSafari: true })

  useEffect(() => {
    if (localStorage.getItem(CLAVE_CERRADO)) return
    setEstado(detectar())
  }, [])

  if (!estado.mostrar) return null

  function cerrar() {
    localStorage.setItem(CLAVE_CERRADO, '1')
    setEstado(e => ({ ...e, mostrar: false }))
  }

  return (
    <div className="fixed left-0 right-0 z-40 px-4 flex justify-center pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)' }}>
      <div className="pointer-events-auto w-full max-w-md bg-navy-800 border border-cyan-500/40 rounded-2xl px-4 py-3.5 shadow-xl"
        style={{ boxShadow: '0 8px 28px rgba(6,182,212,0.25)' }}>
        <div className="flex items-start gap-3">
          <img src="/apple-touch-icon.png" alt="" width={38} height={38}
            className="rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">Instalá BitácoraAR en tu iPhone</p>
            {estado.esSafari ? (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Tocá <span className="inline-flex items-center align-middle text-cyan-400"><IconoCompartir /></span> <b className="text-slate-300">Compartir</b> abajo, y elegí
                <span className="inline-flex items-center align-middle gap-0.5 text-slate-300"> <Plus size={13} /> <b>Agregar a inicio</b></span>.
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Abrí <b className="text-slate-300">bitacoraar</b> en <b className="text-slate-300">Safari</b> y ahí tocá
                <span className="inline-flex items-center align-middle text-cyan-400"> <IconoCompartir /></span> <b className="text-slate-300">Compartir → Agregar a inicio</b>.
              </p>
            )}
          </div>
          <button onClick={cerrar} aria-label="Cerrar" className="text-slate-500 hover:text-slate-300 flex-shrink-0">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
