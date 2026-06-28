import { useState } from 'react'
import { DollarSign, Save, Info } from 'lucide-react'

const ESPECIES_FIJAS = ['merluza', 'calamar', 'langostino', 'centolla', 'polaca', 'abadejo']

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function fmtPesos(n) {
  return n > 0 ? `$ ${n.toLocaleString('es-AR')}` : '—'
}

export default function ConfigPrecios({ config, setPrecioEspecie, setTipoCambio, viajes }) {
  const [tc, setTc] = useState(String(config.tipoCambio || ''))
  const [precios, setPrecios] = useState(() => {
    const p = {}
    ESPECIES_FIJAS.forEach(e => { p[e] = String(config.precios[e] || '') })
    // incluir especies custom de viajes
    viajes.forEach(v => {
      if (!ESPECIES_FIJAS.includes(v.especie) && !(v.especie in p)) {
        p[v.especie] = String(config.precios[v.especie] || '')
      }
    })
    return p
  })
  const [guardado, setGuardado] = useState(false)

  const especiesCustom = [...new Set(viajes.map(v => v.especie))].filter(e => !ESPECIES_FIJAS.includes(e))

  function handleGuardar(e) {
    e.preventDefault()
    setTipoCambio(Number(tc) || 0)
    Object.entries(precios).forEach(([esp, val]) => setPrecioEspecie(esp, val))
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  function setP(esp, val) {
    setPrecios(prev => ({ ...prev, [esp]: val }))
    setGuardado(false)
  }

  const todasEspecies = [...ESPECIES_FIJAS, ...especiesCustom]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign size={20} className="text-cyan-400" />
          <h2 className="text-xl font-semibold text-white">Precios y tipo de cambio</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Configurá el valor por cajón de cada especie y el tipo de cambio para calcular los totales.
        </p>

        <form onSubmit={handleGuardar} className="space-y-6">
          {/* Tipo de cambio */}
          <div className="bg-navy-700/50 border border-navy-600 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              Dólar oficial
              <span className="flex items-center gap-1 text-xs text-slate-500 font-normal">
                <Info size={12} /> Actualizalo manualmente cuando cambie
              </span>
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label>$ ARS por 1 USD</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ej: 1000"
                  value={tc}
                  onChange={e => { setTc(e.target.value); setGuardado(false) }}
                />
              </div>
              {tc && Number(tc) > 0 && (
                <div className="text-sm text-slate-400 mt-5">
                  = <span className="text-cyan-400 font-medium">USD {(1).toLocaleString('es-AR')}</span> → <span className="text-white">$ {Number(tc).toLocaleString('es-AR')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Precios por especie */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Valor por cajón (en pesos)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {todasEspecies.map(esp => (
                <div key={esp}>
                  <label className="flex items-center justify-between">
                    <span>{capitalize(esp)}</span>
                    {precios[esp] && Number(precios[esp]) > 0 && tc && Number(tc) > 0 && (
                      <span className="text-xs text-slate-500 font-normal">
                        USD {(Number(precios[esp]) / Number(tc)).toFixed(2)}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      className="pl-7"
                      placeholder="0"
                      value={precios[esp] ?? ''}
                      onChange={e => setP(esp, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className={`btn-primary flex items-center gap-2 transition-all ${guardado ? 'bg-green-500 hover:bg-green-400' : ''}`}
          >
            <Save size={16} />
            {guardado ? '¡Guardado!' : 'Guardar configuración'}
          </button>
        </form>
      </div>

      {/* Preview de valores */}
      {Object.values(config.precios).some(p => p > 0) && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Precios configurados</h3>
          <div className="divide-y divide-navy-700">
            {todasEspecies.filter(e => config.precios[e] > 0).map(esp => (
              <div key={esp} className="flex items-center justify-between py-2.5">
                <span className="text-slate-300">{capitalize(esp)}</span>
                <div className="text-right">
                  <span className="text-white font-medium">{fmtPesos(config.precios[esp])} / cajón</span>
                  {config.tipoCambio > 0 && (
                    <span className="text-slate-500 text-xs ml-3">
                      USD {(config.precios[esp] / config.tipoCambio).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
