import { useState } from 'react'
import { Trash2, ChevronUp, ChevronDown, Search } from 'lucide-react'
import { calcularSingladuras } from '../hooks/useViajes'

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

export default function HistorialViajes({ viajes, onEliminar, calcularTotalViaje, config }) {
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState({ col: 'fechaSalida', asc: false })
  const [confirmarId, setConfirmarId] = useState(null)

  const hayPrecios = Object.values(config.precios).some(p => (p?.ars > 0 || p?.usd > 0))
  const hayPreciosUSD = Object.values(config.precios).some(p => p?.usd > 0)

  function toggleOrden(col) {
    setOrden(prev => prev.col === col ? { col, asc: !prev.asc } : { col, asc: false })
  }

  const filtrados = viajes
    .filter(v => {
      const q = busqueda.toLowerCase()
      return !q ||
        v.barco.toLowerCase().includes(q) ||
        (v.puertoPartida || '').toLowerCase().includes(q) ||
        (v.puertoLlegada || '').toLowerCase().includes(q) ||
        v.especie.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      let va, vb
      if (orden.col === 'cajones') { va = Number(a.cajones); vb = Number(b.cajones) }
      else if (orden.col === 'singladuras') {
        va = calcularSingladuras(a.fechaSalida, a.fechaRegreso)
        vb = calcularSingladuras(b.fechaSalida, b.fechaRegreso)
      }
      else if (orden.col === 'totalPesos') {
        va = calcularTotalViaje(a).ars; vb = calcularTotalViaje(b).ars
      }
      else { va = a[orden.col]; vb = b[orden.col] }
      if (va < vb) return orden.asc ? -1 : 1
      if (va > vb) return orden.asc ? 1 : -1
      return 0
    })

  const totalGeneral = {
    ars: filtrados.reduce((s, v) => s + calcularTotalViaje(v).ars, 0),
    usd: filtrados.reduce((s, v) => s + calcularTotalViaje(v).usd, 0),
  }
  const totalSingladuras = filtrados.reduce((s, v) => s + calcularSingladuras(v.fechaSalida, v.fechaRegreso), 0)

  function SortIcon({ col }) {
    if (orden.col !== col) return <ChevronUp size={14} className="opacity-20" />
    return orden.asc
      ? <ChevronUp size={14} className="text-cyan-400" />
      : <ChevronDown size={14} className="text-cyan-400" />
  }

  function TH({ col, children, right }) {
    return (
      <th
        className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 select-none whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
        onClick={() => toggleOrden(col)}
      >
        <span className={`flex items-center gap-1 ${right ? 'justify-end' : ''}`}>
          {children} <SortIcon col={col} />
        </span>
      </th>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold text-white">
          Historial de viajes <span className="text-slate-500 font-normal text-base">({viajes.length})</span>
        </h2>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar barco, puerto, especie..."
            className="pl-9 w-64 text-sm"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* Totales */}
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
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-700">
              <tr>
                <TH col="fechaSalida">Salida</TH>
                <TH col="fechaRegreso">Regreso</TH>
                <TH col="singladuras" right>Singladuras</TH>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Barco</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Puerto partida</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Puerto llegada</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Embarco</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Desembarco</th>
                <TH col="especie">Especie</TH>
                <TH col="cajones" right>Cajones</TH>
                {hayPrecios && <TH col="totalPesos" right>Total ARS</TH>}
                {hayPreciosUSD && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Total USD</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Observaciones</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700">
              {filtrados.map(v => {
                const sing = calcularSingladuras(v.fechaSalida, v.fechaRegreso)
                const totalViaje = calcularTotalViaje(v)
                return (
                  <tr key={v.id} className="hover:bg-navy-700/50 transition-colors group">
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmtFecha(v.fechaSalida)}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmtFecha(v.fechaRegreso)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {sing}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{v.barco}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{v.puertoPartida || '—'}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{v.puertoLlegada || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtFecha(v.fechaEmbarco)}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtFecha(v.fechaDesembarco)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full text-xs font-medium">
                        {capitalize(v.especie)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-semibold whitespace-nowrap text-right">
                      {v.cajones.toLocaleString('es-AR')}
                    </td>
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
                    <td className="px-4 py-3 text-slate-400 max-w-[160px]">
                      <span className="truncate block" title={v.observaciones}>
                        {v.observaciones || <span className="italic text-slate-600">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {confirmarId === v.id ? (
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-slate-400">¿Eliminar?</span>
                          <button onClick={() => { onEliminar(v.id); setConfirmarId(null) }}
                            className="text-xs text-red-400 hover:text-red-300 font-medium">Sí</button>
                          <button onClick={() => setConfirmarId(null)}
                            className="text-xs text-slate-500 hover:text-slate-300">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmarId(v.id)}
                          className="btn-danger opacity-0 group-hover:opacity-100" title="Eliminar viaje">
                          <Trash2 size={15} />
                        </button>
                      )}
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
}
