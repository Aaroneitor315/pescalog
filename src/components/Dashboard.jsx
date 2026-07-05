import { useState, useMemo } from 'react'
import Sponsors from './Sponsors'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { TrendingUp, Fish, Package, Award, DollarSign, Banknote, Waves } from 'lucide-react'
import { calcularSingladuras } from '../hooks/useViajes'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function fmtPesos(n) {
  return `$ ${Math.round(n).toLocaleString('es-AR')}`
}

function fmtUSD(n) {
  return `USD ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
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

  const viajesFiltrados = useMemo(
    () => especieFiltro === 'todas' ? viajes : viajes.filter(v => v.especie === especieFiltro),
    [viajes, especieFiltro]
  )

  const stats = useMemo(() => {
    if (!viajesFiltrados.length) return null
    const total = viajesFiltrados.reduce((s, v) => s + v.cajones, 0)
    const promedio = Math.round(total / viajesFiltrados.length)
    const mejor = viajesFiltrados.reduce((m, v) => v.cajones > m.cajones ? v : m)
    const totalPesos = viajesFiltrados.reduce((s, v) => s + calcularTotalViaje(v).ars, 0)
    const totalUSD = viajesFiltrados.reduce((s, v) => s + calcularTotalViaje(v).usd, 0)
    const totalSingladuras = viajesFiltrados.reduce((s, v) => s + calcularSingladuras(v.fechaSalida, v.fechaRegreso), 0)
    const totalEmbarcado = viajesFiltrados.reduce((s, v) => s + calcularSingladuras(v.fechaEmbarco, v.fechaDesembarco), 0)
    // días embarcado por barco (suma de embarco-desembarco agrupado por nombre de barco)
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

  const hayPrecios = Object.values(config.precios).some(p => (p?.ars > 0 || p?.usd > 0))

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
        <h2 className="text-xl font-semibold text-white">Dashboard</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Filtrar por especie:</span>
          <select
            className="w-44 text-sm py-1.5"
            value={especieFiltro}
            onChange={e => setEspecieFiltro(e.target.value)}
          >
            {especies.map(e => (
              <option key={e} value={e}>{e === 'todas' ? 'Todas las especies' : capitalize(e)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats cajones */}
      {stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Package}
              label="Total cajones"
              value={stats.total.toLocaleString('es-AR')}
              sub={`${stats.cantidad} viaje${stats.cantidad !== 1 ? 's' : ''}`}
            />
            <StatCard
              icon={TrendingUp}
              label="Promedio por viaje"
              value={stats.promedio.toLocaleString('es-AR')}
              sub="cajones"
            />
            <StatCard
              icon={Award}
              label="Mejor viaje"
              value={stats.mejor.cajones.toLocaleString('es-AR')}
              sub={stats.mejor.barco}
              accent="text-yellow-400"
            />
            <StatCard
              icon={Fish}
              label="Viajes registrados"
              value={stats.cantidad}
              sub={especieFiltro !== 'todas' ? capitalize(especieFiltro) : 'todas las especies'}
            />
          </div>

          {/* Singladuras y días embarcado */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={Waves}
              label="Total singladuras"
              value={stats.totalSingladuras}
              sub="días navegados (acumulado)"
              accent="text-cyan-400"
            />
            <StatCard
              icon={Waves}
              label="Días embarcado"
              value={stats.totalEmbarcado}
              sub={`${stats.barcosUnicos} barco${stats.barcosUnicos !== 1 ? 's' : ''} distintos`}
            />
          </div>

          {/* Días embarcado por barco */}
          {stats.totalEmbarcado > 0 && (() => {
            const lista = Object.entries(stats.embarcadoPorBarco)
              .sort((a, b) => b[1].dias - a[1].dias)
            const maxDias = lista[0]?.[1].dias || 1
            return (
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3">Días embarcado por barco</h3>
                <div className="space-y-2">
                  {lista.map(([barco, { dias, viajes }]) => (
                    <div key={barco} className="flex items-center gap-3">
                      <span className="text-sm text-slate-300 w-32 shrink-0 truncate">{barco}</span>
                      <div className="flex-1 h-2 bg-navy-700 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full transition-all"
                          style={{ width: `${(dias / maxDias) * 100}%` }} />
                      </div>
                      <span className="text-sm text-cyan-400 w-16 text-right shrink-0 font-medium">{dias} días</span>
                      <span className="text-xs text-slate-500 w-14 text-right shrink-0">{viajes} viaje{viajes !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Stats financieras */}
          {hayPrecios ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card border-l-4 border-l-green-500">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total facturado (ARS)</p>
                    <p className="text-3xl font-bold mt-1 text-green-400">
                      {stats.totalPesos > 0 ? fmtPesos(stats.totalPesos) : <span className="text-slate-600 text-xl">Sin precio configurado</span>}
                    </p>
                    {stats.cantidad > 1 && stats.totalPesos > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Prom. {fmtPesos(stats.totalPesos / stats.cantidad)} / viaje
                      </p>
                    )}
                  </div>
                  <div className="bg-green-900/30 p-2 rounded-lg">
                    <Banknote size={20} className="text-green-400" />
                  </div>
                </div>
              </div>

              <div className="card border-l-4 border-l-blue-400">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total facturado (USD)</p>
                    <p className="text-3xl font-bold mt-1 text-blue-400">
                        {stats.totalUSD > 0 ? fmtUSD(stats.totalUSD) : <span className="text-slate-600 text-xl">Sin precio configurado</span>}
                      </p>
                  </div>
                  <div className="bg-blue-900/30 p-2 rounded-lg">
                    <DollarSign size={20} className="text-blue-400" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card border border-dashed border-navy-600 text-center py-5">
              <p className="text-slate-500 text-sm">
                Configurá el valor por cajón en la pestaña{' '}
                <span className="text-cyan-400 font-medium">Precios</span> para ver los totales en pesos y dólares.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-10 text-slate-500">
          No hay viajes con ese filtro.
        </div>
      )}

      {/* Gráfico */}
      <div className="card">
        <h3 className="text-base font-semibold text-white mb-6">
          Cajones por mes — últimos 12 meses
          {especieFiltro !== 'todas' && (
            <span className="text-cyan-400 font-normal ml-2">({capitalize(especieFiltro)})</span>
          )}
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={datosGrafico} barSize={28} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#163058" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={v => v === 0 ? '0' : v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#163058' }} />
            <Bar dataKey="cajones" radius={[4, 4, 0, 0]}>
              {datosGrafico.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.cajones === maxCajones && entry.cajones > 0 ? '#22d3ee' : '#0891b2'}
                  opacity={entry.cajones === 0 ? 0.2 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-600 mt-2 text-right">
          La barra más alta está resaltada en cyan
        </p>
      </div>

      {/* Top especies */}
      {especieFiltro === 'todas' && (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4">Cajones por especie</h3>
          <div className="space-y-3">
            {(() => {
              const por = {}
              viajes.forEach(v => { por[v.especie] = (por[v.especie] || 0) + v.cajones })
              const total = Object.values(por).reduce((s, n) => s + n, 0)
              return Object.entries(por)
                .sort((a, b) => b[1] - a[1])
                .map(([esp, n]) => (
                  <div key={esp}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{capitalize(esp)}</span>
                      <div className="flex gap-3">
                        {(config.precios[esp]?.usd > 0) && (
                          <span className="text-blue-400 text-xs">{fmtUSD(n * config.precios[esp].usd)}</span>
                        )}
                        {(config.precios[esp]?.ars > 0) && (
                          <span className="text-green-400 text-xs">{fmtPesos(n * config.precios[esp].ars)}</span>
                        )}
                        <span className="text-white font-medium">{n.toLocaleString('es-AR')} caj.</span>
                      </div>
                    </div>
                    <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all"
                        style={{ width: `${(n / total) * 100}%` }}
                      />
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
