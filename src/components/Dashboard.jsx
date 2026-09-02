import { useState, useMemo } from 'react'
import Sponsors from './Sponsors'
import { TrendingUp, Fish, Package, Award, DollarSign, Banknote, Waves, Eye, EyeOff, RefreshCw, Plus, Lock, Newspaper, GraduationCap, Mail } from 'lucide-react'
import { calcularSingladuras } from '../hooks/useViajes'
import { useDolar } from '../hooks/useDolar'

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
  const iso = v.fechaRegreso || v.fechaSalida || v.creadoEn
  if (!iso || typeof iso !== 'string') return ''
  const [y, m] = iso.split('-')
  return `${y}-${m}`
}

function StatCard({ icon: Icon, label, value, sub, accent, iconBg }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</p>
          <p className={`text-3xl font-black mt-1 tracking-tight ${accent || 'text-white'}`}>{value}</p>
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

function DolarCards() {
  const { cotizaciones, cargando, error, actualizadoEn, recargar } = useDolar()
  const [flipKey, setFlipKey] = useState(0)

  const fmtHora = (d) => d ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''

  const colorClass = {
    blue:   { border: 'border-blue-500/40',   accent: 'text-blue-400',   bar: 'bg-blue-500' },
    cyan:   { border: 'border-cyan-500/40',    accent: 'text-cyan-400',   bar: 'bg-cyan-500' },
    purple: { border: 'border-purple-500/40',  accent: 'text-purple-400', bar: 'bg-purple-500' },
  }

  const items = cotizaciones ? ['oficial', 'blue', 'mep'].map(k => cotizaciones[k]).filter(Boolean) : []

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-navy-700">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cotización dólar</span>
        </div>
        <div className="flex items-center gap-2">
          {actualizadoEn && <span className="text-xs text-slate-600">{fmtHora(actualizadoEn)}</span>}
          <button onClick={recargar} className="btn-ghost p-1 rounded" title="Actualizar">
            <RefreshCw size={13} className="text-slate-500" />
          </button>
        </div>
      </div>

      {cargando && !cotizaciones && (
        <div className="grid grid-cols-3 divide-x divide-navy-700">
          {[0,1,2].map(i => (
            <div key={i} className="px-4 py-4 text-center">
              <div className="h-2.5 w-12 bg-navy-700 rounded animate-pulse mx-auto mb-2" />
              <div className="h-5 w-20 bg-navy-700 rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-slate-500 text-center py-3 px-4">Sin conexión · cotizaciones no disponibles</p>
      )}

      {cotizaciones && (
        <div className="grid grid-cols-3 gap-2 p-2">
          {items.map(item => {
            const c = colorClass[item.color] || colorClass.blue
            const borderColors = { blue: '#3b82f6', cyan: '#06b6d4', purple: '#8b5cf6' }
            return (
              <div key={item.key} className="rounded-xl px-3 py-3 bg-navy-900"
                style={{ borderLeft: `3px solid ${borderColors[item.color] || borderColors.blue}` }}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${c.accent}`}>{item.label}</p>
                <p className="text-lg font-black text-white tabular-nums tracking-tight flip-val" key={flipKey}>
                  ${(item.venta ?? 0).toLocaleString('es-AR')}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Compra ${(item.compra ?? 0).toLocaleString('es-AR')}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const SECTORES_INFO = [
  {
    id: 'maquinas',
    label: 'Máquinas',
    sub: 'Sala de máquinas',
    color: '#0891b2',
    textColor: 'text-cyan-400',
    border: 'border-cyan-500/25',
    bg: 'bg-cyan-500/8',
    Icon: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  {
    id: 'cubierta',
    label: 'Cubierta',
    sub: 'Aparejos y equipos',
    color: '#10b981',
    textColor: 'text-emerald-400',
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-500/8',
    Icon: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v6m0 0C8 8 5 11 5 15H2l10 7 10-7h-3c0-4-3-7-7-7z"/>
        <line x1="12" y1="8" x2="12" y2="22"/>
      </svg>
    ),
  },
  {
    id: 'puente',
    label: 'Puente',
    sub: 'Navegación e instrumental',
    color: '#a855f7',
    textColor: 'text-purple-400',
    border: 'border-purple-500/25',
    bg: 'bg-purple-500/8',
    Icon: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20M5 20V10l7-7 7 7v10M9 20v-5h6v5"/>
      </svg>
    ),
  },
]

function SectorCard({ s, esMio, onAbrirSector }) {
  return (
    <button
      onClick={() => onAbrirSector(s.id)}
      className="flex flex-col rounded-2xl overflow-hidden transition-all active:scale-95"
      style={{
        background: esMio ? s.color + '14' : s.color + '0d',
        border: `1.5px solid ${esMio ? s.color + '60' : s.color + '30'}`,
        boxShadow: esMio ? `0 0 18px ${s.color}18` : 'none',
      }}
    >
      <img
        src={`/sectores/${s.id}.webp`}
        alt=""
        width={600}
        height={354}
        decoding="async"
        fetchPriority="high"
        style={{ width: '100%', height: 'auto', display: 'block', aspectRatio: '600 / 354' }}
      />
      <div className="px-2 pt-1.5 pb-2.5 text-center">
        <p className="text-xs font-bold leading-tight" style={{ color: s.color }}>{s.label}</p>
        {esMio
          ? <span className="mt-1 inline-block text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: s.color + '20', color: s.color }}>Tu sector</span>
          : <p className="text-[9px] mt-0.5" style={{ color: '#2a4a6a' }}>{s.sub.split('·')[0].trim()}</p>
        }
      </div>
    </button>
  )
}

function SectoresHero({ perfil, onAbrirSector }) {
  const sorted = [...SECTORES_INFO].sort((a, b) => {
    if (perfil?.sector === a.id) return -1
    if (perfil?.sector === b.id) return 1
    return 0
  })
  return (
    <div>
      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2.5 px-0.5">Sectores a bordo</p>
      <div className="grid grid-cols-3 gap-2.5">
        {sorted.map(s => (
          <SectorCard key={s.id} s={s} esMio={perfil?.sector === s.id} onAbrirSector={onAbrirSector} />
        ))}
      </div>
    </div>
  )
}

// ── Novedades y comunidad: 3 cards grandes debajo de los sectores ────────────
const NOVEDADES_INFO = [
  { id: 'noticias', label: 'Noticias', sub: 'Novedades del sector', color: '#f59e0b', Icon: Newspaper, grad: 'linear-gradient(150deg,#3a2c0a,#1a1405)' },
  { id: 'cursos', label: 'Cursos', sub: 'Formación y seguridad', color: '#6366f1', Icon: GraduationCap, grad: 'linear-gradient(150deg,#1e1f45,#0d0e20)' },
  { id: 'buzon', label: 'Buzón', sub: 'Escribinos', color: '#f43f5e', Icon: Mail, grad: 'linear-gradient(150deg,#3a1420,#180a0f)' },
]

function NovedadCard({ n, onClick, badge }) {
  const Icon = n.Icon
  return (
    <button onClick={onClick}
      className="relative rounded-2xl overflow-hidden transition-all active:scale-95"
      style={{ border: `1.5px solid ${n.color}40` }}>
      {/* Fondo (placeholder: degradé + ícono grande atenuado; se reemplaza por la imagen real luego) */}
      <div className="relative" style={{ aspectRatio: '600 / 354', background: n.grad }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon size={64} strokeWidth={1.25} style={{ color: n.color, opacity: 0.35 }} />
        </div>
        {badge > 0 && (
          <span className="absolute top-1.5 right-1.5 z-10 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center"
            style={{ background: '#ef4444', border: '2px solid #080f1a' }}>{badge > 9 ? '9+' : badge}</span>
        )}
        {/* Degradé oscuro abajo para el texto */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(4,7,18,.92) 8%, rgba(4,7,18,.55) 45%, transparent)' }} />
        {/* Texto superpuesto */}
        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-4 text-left">
          <p className="text-[13px] font-extrabold leading-tight" style={{ color: n.color }}>{n.label}</p>
          <p className="text-[10px] leading-tight text-slate-300/90 truncate">{n.sub}</p>
        </div>
      </div>
    </button>
  )
}

function NovedadesHero({ onAbrirNoticias, onAbrirCursos, onAbrirBuzon, mensajesNuevos = 0 }) {
  const handlers = { noticias: onAbrirNoticias, cursos: onAbrirCursos, buzon: onAbrirBuzon }
  return (
    <div>
      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2.5 px-0.5">Novedades y comunidad</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {NOVEDADES_INFO.map(n => (
          <NovedadCard key={n.id} n={n} onClick={handlers[n.id]} badge={n.id === 'buzon' ? mensajesNuevos : 0} />
        ))}
      </div>
    </div>
  )
}

export default function Dashboard({ viajes, calcularTotalViaje, config, onAbrirSector, onNuevoViaje, perfil, esAdmin, onAbrirNoticias, onAbrirCursos, onAbrirBuzon, mensajesNuevos = 0 }) {
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


  if (!viajes.length) {
    return (
      <div className="space-y-6">
        <SectoresHero perfil={perfil} onAbrirSector={onAbrirSector} esAdmin={esAdmin} />
        <NovedadesHero onAbrirNoticias={onAbrirNoticias} onAbrirCursos={onAbrirCursos} onAbrirBuzon={onAbrirBuzon} mensajesNuevos={mensajesNuevos} />
        <DolarCards />
        <div className="card text-center py-12 px-6 flex flex-col items-center gap-4">
          <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(6,182,212,0.1)',border:'2px solid rgba(6,182,212,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l4-8 4 4 3-6 4 10H3z"/><path d="M3 21h18"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">¡Bienvenido a BitácoraAR!</h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">Registrá tu primer viaje y empezá a ver tus estadísticas, ganancias y stock a bordo en tiempo real.</p>
          </div>
          <button
            onClick={onNuevoViaje}
            className="btn-primary px-8 py-3 text-base font-bold rounded-xl flex items-center gap-2"
            style={{background:'linear-gradient(135deg,#06b6d4,#0891b2)',boxShadow:'0 4px 16px rgba(6,182,212,0.35)'}}>
            <Plus size={20} />
            Registrar mi primer viaje
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-2">
            {[
              { icon: Package, label: 'Cajones y capturas', desc: 'Registrá cada marea con fecha, barco y especie', color: 'text-cyan-400' },
              { icon: TrendingUp, label: 'Ganancias en ARS y USD', desc: 'Calculá tus liquidaciones con precios reales', color: 'text-green-400' },
              { icon: Fish, label: 'Stock por sector', desc: 'Inventario de repuestos para máquinas, cubierta y puente', color: 'text-purple-400' },
            ].map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className="bg-navy-900 rounded-xl p-4 border border-navy-700/50 text-left">
                <Icon size={20} className={`${color} mb-2`} />
                <p className="text-sm font-semibold text-white mb-1">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectoresHero perfil={perfil} onAbrirSector={onAbrirSector} />
      <NovedadesHero onAbrirNoticias={onAbrirNoticias} onAbrirCursos={onAbrirCursos} onAbrirBuzon={onAbrirBuzon} mensajesNuevos={mensajesNuevos} />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">
            {mesActual ? mesActual.labelFull : 'Todos los períodos'}
          </h2>
          <button onClick={toggleOcultarMontos}
            className="flex items-center gap-2 bg-navy-700/60 hover:bg-navy-700 border border-navy-600 hover:border-slate-500 text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg">
            {ocultarMontos ? <EyeOff size={18} /> : <Eye size={18} />}
            <span className="text-xs font-medium">{ocultarMontos ? 'Mostrar datos' : 'Ocultar datos'}</span>
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

      <DolarCards />

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

        </>
      ) : (
        <div className="card text-center py-10 text-slate-500">
          No hay viajes en este período.
        </div>
      )}

      <div className="border-t border-navy-700 pt-6">
        <Sponsors />
      </div>
    </div>
  )
}
