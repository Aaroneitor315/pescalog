import { useState, useEffect } from 'react'
import { AlertTriangle, XCircle, X, BookOpen } from 'lucide-react'

function getEstado(vencimiento) {
  if (!vencimiento) return null
  const hoy = new Date()
  const venc = new Date(vencimiento)
  const dias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24))
  if (dias < 0) return { tipo: 'vencido', dias: Math.abs(dias) }
  if (dias <= 60) return { tipo: 'proximo', dias }
  return null
}

// Muestra una sola vez por sesión de navegador
const SESSION_KEY = 'bitacora_venc_visto'

export default function BannerVencimientos({ documentos = [], onIrLibreta }) {
  const [visible, setVisible] = useState(false)

  const alertas = documentos
    .map(d => ({ ...d, estado: getEstado(d.vencimiento) }))
    .filter(d => d.estado !== null)

  useEffect(() => {
    if (alertas.length > 0 && !sessionStorage.getItem(SESSION_KEY)) {
      setVisible(true)
    }
  }, [documentos.length])

  function cerrar() {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(false)
  }

  function irYCerrar() {
    cerrar()
    onIrLibreta()
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{background:'rgba(0,0,0,0.65)',backdropFilter:'blur(4px)'}}>
      <div className="w-full max-w-sm rounded-2xl border overflow-hidden"
        style={{background:'#0d1829',borderColor:'#ef444440'}}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{background:'#1a0a0a',borderBottom:'1px solid #ef444430'}}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" />
            <span className="text-sm font-bold text-red-400">
              {alertas.length === 1 ? '1 documento requiere atención' : `${alertas.length} documentos requieren atención`}
            </span>
          </div>
          <button onClick={cerrar} className="text-slate-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Lista */}
        <div className="px-4 py-3 space-y-2 max-h-56 overflow-y-auto">
          {alertas.map(d => (
            <div key={d.id} className="flex items-start gap-3 py-2 border-b border-navy-700/50 last:border-0">
              {d.estado.tipo === 'vencido'
                ? <XCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
                : <AlertTriangle size={15} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              }
              <div>
                <p className="text-sm font-semibold text-white">{d.nombre || 'Sin nombre'}</p>
                <p className="text-xs" style={{color: d.estado.tipo === 'vencido' ? '#f87171' : '#fbbf24'}}>
                  {d.estado.tipo === 'vencido'
                    ? `Venció hace ${d.estado.dias} día${d.estado.dias !== 1 ? 's' : ''}`
                    : `Vence en ${d.estado.dias} día${d.estado.dias !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 px-4 py-3 border-t border-navy-700">
          <button onClick={cerrar}
            className="flex-1 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
            style={{background:'#1a2740'}}>
            Más tarde
          </button>
          <button onClick={irYCerrar}
            className="flex-1 py-2 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors"
            style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)'}}>
            <BookOpen size={14} />
            Ir a Libreta
          </button>
        </div>
      </div>
    </div>
  )
}
