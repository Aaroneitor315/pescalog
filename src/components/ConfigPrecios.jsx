import { useState } from 'react'
import { DollarSign, Save, Info } from 'lucide-react'
import { ESPECIES_LISTA } from '../hooks/usePrecios'

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

export default function ConfigPrecios({ config, guardarTodos }) {
  const [tc, setTc] = useState(String(config.tipoCambio || ''))
  const [precios, setPrecios] = useState(() => {
    const p = {}
    ESPECIES_LISTA.forEach(e => {
      const v = config.precios[e] || { ars: 0, usd: 0 }
      p[e] = { ars: String(v.ars || ''), usd: String(v.usd || '') }
    })
    return p
  })
  const [guardado, setGuardado] = useState(false)

  function setP(esp, campo, val) {
    setPrecios(prev => ({ ...prev, [esp]: { ...prev[esp], [campo]: val } }))
    setGuardado(false)
  }

  async function handleGuardar(e) {
    e.preventDefault()
    await guardarTodos(precios, tc)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign size={20} className="text-cyan-400" />
          <h2 className="text-xl font-semibold text-white">Precios y tipo de cambio</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Configurá el valor por cajón de cada especie en pesos y dólares.
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
            </div>
          </div>

          {/* Precios por especie */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Valor por cajón</h3>
            <div className="space-y-3">
              {ESPECIES_LISTA.map(esp => (
                <div key={esp} className="bg-navy-700/50 border border-navy-600 rounded-xl p-4">
                  <p className="text-sm font-medium text-white mb-3">{capitalize(esp)}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label>Precio en pesos (ARS)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="pl-7"
                          placeholder="0.00"
                          value={precios[esp]?.ars ?? ''}
                          onChange={e => setP(esp, 'ars', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label>Precio en dólares (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">U$D</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="pl-10"
                          placeholder="0.00"
                          value={precios[esp]?.usd ?? ''}
                          onChange={e => setP(esp, 'usd', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className={`btn-primary flex items-center gap-2 ${guardado ? 'bg-green-500 hover:bg-green-400' : ''}`}
          >
            <Save size={16} />
            {guardado ? '¡Guardado!' : 'Guardar configuración'}
          </button>
        </form>
      </div>
    </div>
  )
}
