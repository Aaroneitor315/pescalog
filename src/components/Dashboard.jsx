import { useState, useMemo } from 'react'
import Sponsors from './Sponsors'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { TrendingUp, Fish, Package, Award, DollarSign, Banknote, Waves, Eye, EyeOff } from 'lucide-react'
import { calcularSingladuras } from '../hooks/useViajes'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function fmtPesos(n) {
  return `$ ${Math.round(n).toLocaleString('es-AR')}`
}

function fmtUSD(n) {
  return `USD ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function mesKey(v) {
  const d = new Date(v.fechaRegreso || v.fechaSalida || v.creadoEn)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function StatCard({ icon: Icon, label, value, sub, accent, iconBg }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${accent || 'text-white'}`}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`${iconBg || 'bg-navy-700'} p-2 rounded-lg`}>
          <Icon size={20} className={accent || 'text-cyan-400'} />
        </div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-sm">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-cyan-400 font-semibold">{payload[0].value.toLocaleString('es-AR')} cajones</p>
    </div>
  )
}

export default function Dashboard({ viajes, calcularTotalViaje, config }) {
  const especies = useMemo(() => {
    const set = new Set(viajes.map(v => v.especie))
    return ['todas', ...Array.from(set).sort()]
  }, [viajes])

  const [especieFiltro, setEspecieFiltro] = useState('todas')
  const [mesFiltro, setMesFiltro] = useState('todos')
  const [ocultarMontos, setOcultarMontos] = useState(() => localStorage.getItem('ocultarMontos') === 'true')

  function toggleOcultarMontos() {
    setOcultarMontos(prev => {
      const next = !prev
      localStorage.setItem('ocultarMontos', next)
      return next
    })
  }

  const monto = (txt) => ocultarMontos ? '••••••' : txt

  const mesesDisponibles = useMemo(() => {
    const keys = [...new Set(viajes.map(v => mesKey(v)))].sort().reverse()
    return keys.map(k => {
      const [y, m] = k.split('-')
      return { key: k, label: `${MESES[Number(m) - 1]} ${y.slice(2)}`, labelFull: `${MESES_FULL[Number(m) - 1]} ${y}` }
    })
  }, [viajes])

  const viajesFiltrados = useMemo(() => {
    let lista = especieFiltro === 'todas' ? viajes : viajes.filter(v => v.especie === especieFiltro)
    if (mesFiltro !== 'todos') lista = lista.filter(v => mesKey(v) === mesFiltro)
    return lista
  }, [viajes, especieFiltro, mesFiltro])

  const mesActual = mesesDisponibles.find(m => m.key === mesFiltro)

  const stats = useMemo(() => {
    if (!viajesFiltrados.length) return null
    const total = viajesFiltrados.reduce((s, v) => s + v.cajones, 0)
    const promedio = Math.round(total / viajesFiltrados.length)
    const mejor = viajesFiltrados.reduce((m, v) => v.cajones > m.cajones ? v : m)
    const totalPesos = viajesFiltrados.reduce((s, v) => s + calcularTotalViaje(v).ars, 0)
    const totalUSD = viajesFiltrados.reduce((s, v) => s + calcularTotalViaje(v).usd, 0)
    const totalSingladuras = viajesFiltrados.reduce((s, v) => s + calcularSingladuras(v.fechaSalida, v.fechaRegreso), 0)
    const totalEmbarcado = viajesFiltrados.reduce((s, v) => s + calcularSingladuras(v.fechaEmbarco, v.fechaDesembarco), 0)
    const embarcadoPorBarco = {}
    viajesFiltrados.forEach(v => {
      const nombre = v.barco?.trim() || '(sin nombre)'
      const dias = calcularSingladuras(v.fechaEmbarco, v.fechaDesembarco)
      if (!embarcadoPorBarco[nombre]) embarcadoPorBarco[nombre] = { dias: 0, viajes: 0 }
      embarcadoPorBarco[nombre].dias += dias
      embarcadoPorBarco[nombre].viajes += 1
    })
    const barcosUnicos = Object.keys(embarcadoPorBarco).length
    return { total, promedio, mejor, cantidad: viajesFiltrados.length, totalPesos, totalUSD, totalSingladuras, totalEmbarcado, embarcadoPorBarco, barcosUnicos }
  }, [viajesFiltrados, calcularTotalViaje, config])

  const datosComparativa = useMemo(() => {
    return mesesDisponibles.slice(0, 6).reverse().map(({ key, label }) => {
      const [y, m] = key.split('-')
      const cajones = viajes
        .filter(v => mesKey(v) === key && (especieFiltro === 'todas' || v.especie === especieFiltro))
        .reduce((s, v) => s + v.cajones, 0)
      const pesos = viajes
        .filter(v => mesKey(v) === key && (especieFiltro === 'todas' || v.especie === especieFiltro))
        .reduce((s, v) => s + calcularTotalViaje(v).ars, 0)
      return { mes: label, cajones, pesos }
    })
  }, [viajes, especieFiltro, calcularTotalViaje])

  const datosGrafico = useMemo(() => {
    const ahora = new Date()
    const resultado = []
    for (let i = 11; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      const mes = fecha.getMonth()
      const anio = fecha.getFullYear()
      const label = `${MESES[mes]} ${String(anio).slice(2)}`
      const cajones = viajesFiltrados
        .filter(v => {
          const d = new Date(v.fechaSalida)
          return d.getMonth() === mes && d.getFullYear() === anio
        })
        .reduce((s, v) => s + v.cajones, 0)
      resultado.push({ mes: label, cajones })
    }
    return resultado
  }, [viajesFiltrados])

  const maxCajones = Math.max(...datosGrafico.map(d => d.cajones), 1)
  const maxComparativa = Math.max(...datosComparativa.map(d => d.cajones), 1)

  if (!viajes.length) {
    return (
      <div className="card text-center py-16 text-slate-500">
        No hay datos para mostrar. Registrá tu primer viaje.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">
            {mesActual ? mesActual.labelFull : 'Todos los períodos'}
          </h2>
          <button onClick={toggleOcultarMontos} title={ocultarMontos ? 'Mostrar montos' : 'Ocultar montos'}
            className="text-slate-500 hover:text-slate-300 transition-colors">
            {ocultarMontos ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <select className="w-44 text-sm py-1.5" value={especieFiltro} onChange={e => setEspecieFiltro(e.target.value)}>
          {especies.map(e => (
            <option key={e} value={e}>{e === 'todas' ? 'Todas las especies' : capitalize(e)}</option>
          ))}
        </select>
      </div>

      {/* Pills de meses */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={() => setMesFiltro('todos')}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${mesFiltro === 'todos' ? 'bg-cyan-500 text-navy-900' : 'bg-navy-700/60 text-slate-400 border border-navy-600 hover:border-cyan-500/40'}`}>
          Todo
        </button>
        {mesesDisponibles.map(m => (
          <button key={m.key} onClick={() => setMesFiltro(m.key)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${mesFiltro === m.key ? 'bg-cyan-500 text-navy-900' : 'bg-navy-700/60 text-slate-400 border border-navy-600 hover:border-cyan-500/40'}`}>
            {m.label}
          </button>
        ))}
      </div>

      {stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Package} label="Total cajones" value={stats.total.toLocaleString('es-AR')} sub={`${stats.cantidad} viaje${stats.cantidad !== 1 ? 's' : ''}`} />
            <StatCard icon={TrendingUp} label="Promedio por viaje" value={stats.promedio.toLocaleString('es-AR')} sub="cajones" />
            <StatCard icon={Award} label="Mejor viaje" value={stats.mejor.cajones.toLocaleString('es-AR')} sub={stats.mejor.barco} accent="text-yellow-400" />
            <StatCard icon={Fish} label="Viajes registrados" value={stats.cantidad} sub={especieFiltro !== 'todas' ? capitalize(especieFiltro) : 'todas las especies'} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card border-l-4 border-l-green-500" style={{borderRadius:'0 12px 12px 0'}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total facturado (ARS)</p>
                  <p className="text-3xl font-bold mt-1 text-green-400">
                    {stats.totalPesos > 0 ? monto(fmtPesos(stats.totalPesos)) : <span className="text-slate-600 text-xl">Configurar precios</span>}
                  </p>
                  {stats.cantidad > 1 && stats.totalPesos > 0 && (
                    <p className="text-xs text-slate-500 mt-1">Prom. {monto(fmtPesos(stats.totalPesos / stats.cantidad))} / viaje</p>
                  )}
                </div>
                <div className="bg-green-900/30 p-2 rounded-lg"><Banknote size={20} className="text-green-400" /></div>
              </div>
            </div>
            <div className="card border-l-4 border-l-blue-400" style={{borderRadius:'0 12px 12px 0'}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total facturado (USD)</p>
                  <p className="text-3xl font-bold mt-1 text-blue-400">
                    {stats.totalUSD > 0 ? monto(fmtUSD(stats.totalUSD)) : <span className="text-slate-600 text-xl">Configurar precios</span>}
                  </p>
                  {stats.cantidad > 1 && stats.totalUSD > 0 && (
                    <p className="text-xs text-slate-500 mt-1">Prom. {monto(fmtUSD(stats.totalUSD / stats.cantidad))} / viaje</p>
                  )}
                </div>
                <div className="bg-blue-900/30 p-2 rounded-lg"><DollarSign size={20} className="text-blue-400" /></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card" style={{padding:'10px 14px'}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider" style={{fontSize:'10px'}}>Total singladuras</p>
                  <p className="text-lg font-semibold mt-0.5 text-cyan-400">{stats.totalSingladuras}</p>
                  <p className="text-slate-500" style={{fontSize:'10px',marginTop:'2px'}}>días navegados</p>
                </div>
                <Waves size={16} className="text-slate-600 mt-1" />
              </div>
            </div>
            <div className="card" style={{padding:'10px 14px'}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider" style={{fontSize:'10px'}}>Días embarcado</p>
                  <p className="text-lg font-semibold mt-0.5 text-white">{stats.totalEmbarcado}</p>
                  <p className="text-slate-500" style={{fontSize:'10px',marginTop:'2px'}}>{stats.barcosUnicos} barco{stats.barcosUnicos !== 1 ? 's' : ''} distintos</p>
                </div>
                <Waves size={16} className="text-slate-600 mt-1" />
              </div>
            </div>
          </div>

          {stats.totalEmbarcado > 0 && (() => {
            const lista = Object.entries(stats.embarcadoPorBarco).sort((a, b) => b[1].dias - a[1].dias)
            const maxDias = lista[0]?.[1].dias || 1
            return (
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3">Días embarcado por barco</h3>
                <div className="space-y-2">
                  {lista.map(([barco, { dias, viajes }]) => (
                    <div key={barco} className="flex items-center gap-3">
                      <span className="text-sm text-slate-300 w-32 shrink-0 truncate">{barco}</span>
                      <div className="flex-1 h-2 bg-navy-700 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${(dias / maxDias) * 100}%` }} />
                      </div>
                      <span className="text-sm text-cyan-400 w-16 text-right shrink-0 font-medium">{dias} días</span>
                      <span className="text-xs text-slate-500 w-14 text-right shrink-0">{viajes} viaje{viajes !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Comparativa mensual — solo visible en vista "todos" */}
          {mesFiltro === 'todos' && datosComparativa.some(d => d.cajones > 0) && (
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">Comparativa mensual</h3>
              <div className="space-y-3">
                {datosComparativa.map(d => (
                  <div key={d.mes} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-12 shrink-0">{d.mes}</span>
                    <div className="flex-1 h-2 bg-navy-700 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500/80 rounded-full transition-all"
                        style={{ width: `${(d.cajones / maxComparativa) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 w-24 text-right shrink-0 font-mono">
                      {d.cajones.toLocaleString('es-AR')} caj.
                    </span>
                    {d.pesos > 0 && (
                      <span className="text-xs text-green-400 w-28 text-right shrink-0 hidden sm:block">
                        {monto(fmtPesos(d.pesos))}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-10 text-slate-500">
          No hay viajes en este período.
        </div>
      )}

      {/* Gráfico cajones 12 meses */}
      <div className="card">
        <h3 className="text-base font-semibold text-white mb-6">
          Cajones por mes — últimos 12 meses
          {especieFiltro !== 'todas' && <span className="text-cyan-400 font-normal ml-2">({capitalize(especieFiltro)})</span>}
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={datosGrafico} barSize={28} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#163058" vertical={false} />
            <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={48}
              tickFormatter={v => v === 0 ? '0' : v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#163058' }} />
            <Bar dataKey="cajones" radius={[4, 4, 0, 0]}>
              {datosGrafico.map((entry, i) => (
                <Cell key={i} fill={entry.cajones === maxCajones && entry.cajones > 0 ? '#22d3ee' : '#0891b2'} opacity={entry.cajones === 0 ? 0.2 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-600 mt-2 text-right">La barra más alta está resaltada en cyan</p>
      </div>

      {especieFiltro === 'todas' && (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4">Cajones por especie</h3>
          <div className="space-y-3">
            {(() => {
              const por = {}
              viajesFiltrados.forEach(v => { por[v.especie] = (por[v.especie] || 0) + v.cajones })
              const total = Object.values(por).reduce((s, n) => s + n, 0)
              return Object.entries(por).sort((a, b) => b[1] - a[1]).map(([esp, n]) => (
                <div key={esp}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{capitalize(esp)}</span>
                    <div className="flex gap-3">
                      {config.precios[esp]?.usd > 0 && <span className="text-blue-400 text-xs">{monto(fmtUSD(n * config.precios[esp].usd))}</span>}
                      {config.precios[esp]?.ars > 0 && <span className="text-green-400 text-xs">{monto(fmtPesos(n * config.precios[esp].ars))}</span>}
                      <span className="text-white font-medium">{n.toLocaleString('es-AR')} caj.</span>
                    </div>
                  </div>
                  <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all" style={{ width: `${(n / total) * 100}%` }} />
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      <div className="border-t border-navy-700 pt-6">
        <Sponsors />
      </div>
    </div>
  )
}
