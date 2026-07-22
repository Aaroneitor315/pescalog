import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp, Search, Pencil } from 'lucide-react'
import { calcularSingladuras } from '../hooks/useViajes'

const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmtFecha(iso) {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '-'
}

function fmtPesos(n) {
  if (!n || n === 0) return null
  return `$ ${Math.round(n).toLocaleString('es-AR')}`
}

function fmtUSD(n) {
  if (!n || n === 0) return null
  return `USD ${Math.round(n).toLocaleString('es-AR')}`
}

function mesKey(v) {
  const d = new Date(v.fechaRegreso || v.fechaSalida || v.creadoEn)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function mesLabel(key) {
  const [y, m] = key.split('-')
  return `${MESES_FULL[Number(m) - 1]} ${y}`
}

export default function HistorialViajes({ viajes, onEliminar, onEditar, calcularTotalViaje, config }) {
  const [busqueda, setBusqueda] = useState('')
  const [confirmarId, setConfirmarId] = useState(null)
  const [mesesColapsados, setMesesColapsados] = useState({})

  const hayPrecios = Object.values(config.precios).some(p => (p?.ars > 0 || p?.usd > 0))
  const hayPreciosUSD = Object.values(config.precios).some(p => p?.usd > 0)

  const filtrados = viajes
    .filter(v => {
      const q = busqueda.toLowerCase()
      return !q ||
        v.barco.toLowerCase().includes(q) ||
        (v.puertoPartida || '').toLowerCase().includes(q) ||
        (v.puertoLlegada || '').toLowerCase().includes(q) ||
        v.especie.toLowerCase().includes(q)
    })
    .sort((a, b) => (b.fechaSalida || '').localeCompare(a.fechaSalida || ''))

  // Agrupar por mes
  const grupos = {}
  filtrados.forEach(v => {
    const k = mesKey(v)
    if (!grupos[k]) grupos[k] = []
    grupos[k].push(v)
  })
  const clavesMeses = Object.keys(grupos).sort().reverse()

  const totalGeneral = {
    ars: filtrados.reduce((s, v) => s + calcularTotalViaje(v).ars, 0),
    usd: filtrados.reduce((s, v) => s + calcularTotalViaje(v).usd, 0),
  }
  const totalSingladuras = filtrados.reduce((s, v) => s + calcularSingladuras(v.fechaSalida, v.fechaRegreso), 0)

  function toggleMes(k) {
    setMesesColapsados(prev => ({ ...prev, [k]: !prev[k] }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold text-white">
          Historial de viajes <span className="text-slate-500 font-normal text-base">({viajes.length})</span>
        </h2>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Buscar barco, puerto, especie..."
            className="pl-9 w-64 text-sm" value={busqueda}
            onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {/* Totales generales */}
      <div className="flex gap-3 flex-wrap">
        <div className="bg-navy-700/50 border border-navy-600 rounded-lg px-4 py-2 flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Total singladuras</span>
          <span className="text-cyan-400 font-bold text-lg">{totalSingladuras}</span>
        </div>
        {hayPrecios && totalGeneral.ars > 0 && (
          <div className="bg-green-900/20 border border-green-800/40 rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Total ARS</span>
            <span className="text-green-400 font-bold text-lg">{fmtPesos(totalGeneral.ars)}</span>
          </div>
        )}
        {hayPreciosUSD && totalGeneral.usd > 0 && (
          <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Total USD</span>
            <span className="text-blue-400 font-bold text-lg">{fmtUSD(totalGeneral.usd)}</span>
          </div>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="card text-center py-16 text-slate-500">
          {busqueda ? 'No se encontraron viajes con ese criterio.' : 'Todavía no hay viajes registrados.'}
        </div>
      ) : (
        <div className="space-y-6">
          {clavesMeses.map(k => {
            const viajesMes = grupos[k]
            const colapsado = mesesColapsados[k]
            const totalMesARS = viajesMes.reduce((s, v) => s + calcularTotalViaje(v).ars, 0)
            const totalMesUSD = viajesMes.reduce((s, v) => s + calcularTotalViaje(v).usd, 0)
            const totalMesCajones = viajesMes.reduce((s, v) => s + v.cajones, 0)

            return (
              <div key={k}>
                {/* Encabezado del mes */}
                <button
                  onClick={() => toggleMes(k)}
                  className="w-full flex items-center justify-between mb-3 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{mesLabel(k)}</span>
                    <span className="text-xs text-slate-500">{viajesMes.length} viaje{viajesMes.length !== 1 ? 's' : ''}</span>
                  </div>
                  {colapsado ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronUp size={16} className="text-slate-500" />}
                </button>

                {/* Banda de subtotal del mes */}
                <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-xl px-4 py-3 mb-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Cajones</p>
                      <p className="text-base font-semibold text-white">{totalMesCajones.toLocaleString('es-AR')}</p>
                    </div>
                    {totalMesARS > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Total ARS</p>
                        <p className="text-base font-semibold text-green-400">{fmtPesos(totalMesARS)}</p>
                      </div>
                    )}
                    {totalMesUSD > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Total USD</p>
                        <p className="text-base font-semibold text-blue-400">{fmtUSD(totalMesUSD)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de viajes del mes */}
                {!colapsado && (
                  <div className="card p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-navy-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Salida</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Regreso</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Singladuras</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Barco</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">P. Partida</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">P. Llegada</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Embarco</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Desembarco</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Especie</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Cajones</th>
                          {hayPrecios && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Total ARS</th>}
                          {hayPreciosUSD && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Total USD</th>}
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Obs.</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-navy-700">
                        {viajesMes.map(v => {
                          const sing = calcularSingladuras(v.fechaSalida, v.fechaRegreso)
                          const totalViaje = calcularTotalViaje(v)
                          return (
                            <tr key={v.id} className="hover:bg-navy-700/50 transition-colors group">
                              <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmtFecha(v.fechaSalida)}</td>
                              <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmtFecha(v.fechaRegreso)}</td>
                              <td className="px-4 py-3 text-right">
                                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full text-xs font-semibold">{sing}d</span>
                              </td>
                              <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{v.barco}</td>
                              <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{v.puertoPartida || '—'}</td>
                              <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{v.puertoLlegada || '—'}</td>
                              <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtFecha(v.fechaEmbarco)}</td>
                              <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtFecha(v.fechaDesembarco)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full text-xs font-medium">{capitalize(v.especie)}</span>
                              </td>
                              <td className="px-4 py-3 text-white font-semibold whitespace-nowrap text-right">{v.cajones.toLocaleString('es-AR')}</td>
                              {hayPrecios && (
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  {fmtPesos(totalViaje.ars)
                                    ? <span className="text-green-400 font-medium">{fmtPesos(totalViaje.ars)}</span>
                                    : <span className="text-slate-600 text-xs">sin precio</span>}
                                </td>
                              )}
                              {hayPreciosUSD && (
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  {fmtUSD(totalViaje.usd)
                                    ? <span className="text-blue-400 text-sm">{fmtUSD(totalViaje.usd)}</span>
                                    : <span className="text-slate-600 text-xs">—</span>}
                                </td>
                              )}
                              <td className="px-4 py-3 text-slate-400 max-w-[140px]">
                                <span className="truncate block" title={v.observaciones}>{v.observaciones || <span className="italic text-slate-600">—</span>}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                                  <button onClick={() => onEditar(v)} className="btn-ghost p-1.5 rounded-lg" title="Editar viaje">
                                    <Pencil size={14} className="text-cyan-400" />
                                  </button>
                                  <button onClick={() => setConfirmarId(v.id)} className="btn-danger" title="Eliminar viaje">
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {confirmarId && (() => {
        const v = viajes.find(x => x.id === confirmarId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={() => setConfirmarId(null)}>
            <div className="bg-navy-800 border border-navy-600 rounded-2xl p-6 w-full max-w-sm shadow-xl"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-semibold text-base mb-1">¿Eliminar este viaje?</h3>
              {v && <p className="text-slate-400 text-sm mb-5">{v.barco || 'Sin barco'} · {fmtFecha(v.fechaSalida)} · {v.cajones} cajones</p>}
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmarId(null)} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
                <button onClick={() => { onEliminar(confirmarId); setConfirmarId(null) }}
                  className="bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                  <Trash2 size={15} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
