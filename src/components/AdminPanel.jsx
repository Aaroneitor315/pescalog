import { useState } from 'react'
import { useAdmin } from '../hooks/useAdmin'
import { useConvenio } from '../hooks/useConvenio'
import { useAdminUsuarios } from '../hooks/useAdminUsuarios'
import { Shield, Package, ToggleLeft, ToggleRight, Save, Star, FileText, Users, RefreshCw, TrendingUp, CheckCircle, Activity, Wrench, Anchor, Navigation, Inbox } from 'lucide-react'
import { BandejaMensajes } from './Buzon'

function fmtNum(n) {
  return (n || 0).toLocaleString('es-AR')
}

function fmtFechaCorta(date) {
  if (!date) return '—'
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AdminPanel({ mensajes = [], actualizarMensaje }) {
  const { stats, sponsors, guardarSponsors, cargando } = useAdmin()
  const nuevosMsg = mensajes.filter(m => (m.estado || 'nuevo') === 'nuevo').length
  const { convenio, guardarVersion } = useConvenio()
  const { usuarios, metricas, cargando: cargandoUsuarios, error: errorUsuarios, recargar } = useAdminUsuarios()
  const [editConvenio, setEditConvenio] = useState(null)
  const [guardadoConvenio, setGuardadoConvenio] = useState(false)

  const cv = editConvenio || convenio

  function setCv(campo, valor) {
    setEditConvenio(prev => ({ ...(prev || convenio), [campo]: valor }))
    setGuardadoConvenio(false)
  }

  async function handleGuardarConvenio() {
    const next = { ...cv }
    Object.keys(next).forEach(k => {
      if (k !== 'fecha_vigencia_desde') next[k] = Number(next[k]) || 0
    })
    await guardarVersion(next)
    setEditConvenio(null)
    setGuardadoConvenio(true)
    setTimeout(() => setGuardadoConvenio(false), 2000)
  }
  const [editSponsors, setEditSponsors] = useState(null)
  const [guardado, setGuardado] = useState(false)

  const sp = editSponsors || sponsors

  function setSp(next) { setEditSponsors(next); setGuardado(false) }

  function toggleBanner() {
    setSp({ ...sp, banner: { ...sp.banner, activo: !sp.banner.activo } })
  }

  function setBanner(campo, valor) {
    setSp({ ...sp, banner: { ...sp.banner, [campo]: valor } })
  }

  function toggleSlot(id) {
    setSp({ ...sp, slots: sp.slots.map(s => s.id === id ? { ...s, activo: !s.activo } : s) })
  }

  function setSlot(id, campo, valor) {
    setSp({ ...sp, slots: sp.slots.map(s => s.id === id ? { ...s, [campo]: valor } : s) })
  }

  async function handleGuardar() {
    await guardarSponsors(sp)
    setEditSponsors(null)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-lg">
          <Shield size={20} className="text-yellow-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Panel de administración</h2>
          <p className="text-xs text-slate-500">BitácoraAR · datos en tiempo real</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total viajes</p>
              <p className="text-2xl font-bold mt-1 text-white">{fmtNum(stats?.totalViajes)}</p>
              <p className="text-xs text-slate-500 mt-1">todos los usuarios</p>
            </div>
            <div className="bg-navy-700 p-2 rounded-lg"><Package size={18} className="text-cyan-400" /></div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total cajones</p>
              <p className="text-2xl font-bold mt-1 text-cyan-400">{fmtNum(stats?.totalCajones)}</p>
              <p className="text-xs text-slate-500 mt-1">acumulado global</p>
            </div>
            <div className="bg-navy-700 p-2 rounded-lg"><Package size={18} className="text-cyan-400" /></div>
          </div>
        </div>
        <div className="stat-card col-span-2 sm:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Sponsors activos</p>
              <p className="text-2xl font-bold mt-1 text-yellow-400">
                {[sp.banner, ...sp.slots].filter(s => s.activo).length}
              </p>
              <p className="text-xs text-slate-500 mt-1">de {1 + sp.slots.length} slots</p>
            </div>
            <div className="bg-navy-700 p-2 rounded-lg"><Star size={18} className="text-yellow-400" /></div>
          </div>
        </div>
      </div>


      {/* Buzón — mensajes recibidos */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Inbox size={18} className="text-rose-400" />
          <h2 className="text-lg font-semibold text-white">Buzón · Mensajes</h2>
          {nuevosMsg > 0 && (
            <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: '#ef4444' }}>{nuevosMsg} nuevo{nuevosMsg !== 1 ? 's' : ''}</span>
          )}
        </div>
        <BandejaMensajes mensajes={mensajes} actualizarEstado={actualizarMensaje} />
      </div>

      {/* Métricas de usuarios */}
      {metricas && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-cyan-400" />
              <h3 className="text-base font-semibold text-white">Métricas de usuarios</h3>
            </div>
            <button onClick={recargar} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors">
              <RefreshCw size={13} className={cargandoUsuarios ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>

          {/* Fila 1 — números clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Usuarios totales', value: metricas.totalUsuarios, icon: Users, color: '#06b6d4' },
              { label: 'Onboarding completo', value: metricas.onboardingCompleto, icon: CheckCircle, color: '#34d399', sub: `${metricas.totalUsuarios - metricas.onboardingCompleto} pendientes` },
              { label: 'Activos últimos 30d', value: metricas.activosUltimos30, icon: Activity, color: '#f59e0b' },
              { label: 'Con viajes cargados', value: metricas.conViajes, icon: Package, color: '#a78bfa' },
            ].map(m => {
              const Icon = m.icon
              return (
                <div key={m.label} className="bg-navy-700/50 border border-navy-600 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500 leading-tight">{m.label}</p>
                    <Icon size={14} style={{ color: m.color }} />
                  </div>
                  <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                  {m.sub && <p className="text-xs text-slate-600 mt-0.5">{m.sub}</p>}
                </div>
              )
            })}
          </div>

          {/* Fila 2 — distribución por sector */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Distribución por sector</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'maquinas', label: 'Máquinas', icon: Wrench, color: '#22d3ee' },
                { key: 'cubierta', label: 'Cubierta', icon: Anchor, color: '#34d399' },
                { key: 'puente',   label: 'Puente',   icon: Navigation, color: '#c084fc' },
              ].map(s => {
                const Icon = s.icon
                const count = metricas.sectorCount[s.key]
                const pct = metricas.onboardingCompleto > 0
                  ? Math.round((count / metricas.onboardingCompleto) * 100)
                  : 0
                return (
                  <div key={s.key} className="bg-navy-700/50 border border-navy-600 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} style={{ color: s.color }} />
                      <span className="text-xs text-slate-400">{s.label}</span>
                    </div>
                    <p className="text-xl font-black" style={{ color: s.color }}>{count}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-navy-600 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{pct}%</p>
                  </div>
                )
              })}
            </div>
            {metricas.sectorCount.sinSector > 0 && (
              <p className="text-xs text-slate-600 mt-2">{metricas.sectorCount.sinSector} usuarios sin sector asignado aún</p>
            )}
          </div>
        </div>
      )}

      {/* Gestión sponsors */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">Gestión de sponsors</h3>
          {editSponsors && (
            <button onClick={handleGuardar}
              className={`btn-primary flex items-center gap-2 text-sm ${guardado ? 'bg-green-500 hover:bg-green-400' : ''}`}>
              <Save size={14} /> {guardado ? '¡Guardado!' : 'Guardar cambios'}
            </button>
          )}
        </div>

        <div className="space-y-3">
          {/* Banner principal */}
          <div className="bg-navy-700/50 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star size={15} className="text-yellow-400" />
                <span className="text-sm font-medium text-white">Banner principal</span>
                <span className="text-xs text-slate-500">· parte superior del dashboard</span>
              </div>
              <button onClick={toggleBanner} className="text-slate-400 hover:text-white">
                {sp.banner.activo
                  ? <ToggleRight size={24} className="text-cyan-400" />
                  : <ToggleLeft size={24} />}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label>Nombre del sponsor</label>
                <input type="text" placeholder="Ej: MardelPesca S.A."
                  value={sp.banner.nombre}
                  onChange={e => setBanner('nombre', e.target.value)} />
              </div>
              <div>
                <label>URL del sitio web</label>
                <input type="text" placeholder="https://..."
                  value={sp.banner.url}
                  onChange={e => setBanner('url', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label>URL del logo (imagen)</label>
                <input type="text" placeholder="https://... (link a la imagen del logo)"
                  value={sp.banner.logo}
                  onChange={e => setBanner('logo', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Slots */}
          {sp.slots.map((slot, i) => (
            <div key={slot.id} className="bg-navy-700/50 border border-navy-600 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">Sponsor {i + 1}</span>
                  <span className="text-xs text-slate-500">· tarjeta en dashboard</span>
                </div>
                <button onClick={() => toggleSlot(slot.id)} className="text-slate-400 hover:text-white">
                  {slot.activo
                    ? <ToggleRight size={24} className="text-cyan-400" />
                    : <ToggleLeft size={24} />}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label>Nombre del sponsor</label>
                  <input type="text" placeholder="Ej: Equipo de pesca XYZ"
                    value={slot.nombre}
                    onChange={e => setSlot(slot.id, 'nombre', e.target.value)} />
                </div>
                <div>
                  <label>URL del sitio web</label>
                  <input type="text" placeholder="https://..."
                    value={slot.url}
                    onChange={e => setSlot(slot.id, 'url', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label>URL del logo (imagen)</label>
                  <input type="text" placeholder="https://... (link a la imagen del logo)"
                    value={slot.logo}
                    onChange={e => setSlot(slot.id, 'logo', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {!editSponsors && (
          <p className="text-xs text-slate-500 mt-4">
            Modificá cualquier campo para habilitar el botón Guardar.
          </p>
        )}
      </div>

      {/* Convenio colectivo */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Convenio colectivo</h3>
          </div>
          {editConvenio && (
            <button onClick={handleGuardarConvenio}
              className={`btn-primary flex items-center gap-2 text-sm ${guardadoConvenio ? 'bg-green-500 hover:bg-green-400' : ''}`}>
              <Save size={14} /> {guardadoConvenio ? '¡Guardado!' : 'Guardar nueva versión'}
            </button>
          )}
        </div>

        <div className="bg-navy-700/50 border border-navy-600 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label>Vigente desde</label>
              <input type="date" value={cv.fecha_vigencia_desde}
                onChange={e => setCv('fecha_vigencia_desde', e.target.value)} />
            </div>
            <div>
              <label>Tope MOPRE ($)</label>
              <input type="number" min="0" step="0.01" value={cv.tope_mopre}
                onChange={e => setCv('tope_mopre', e.target.value)} />
            </div>
            <div>
              <label>% Sector máquina</label>
              <input type="number" min="0" step="0.01" value={cv.porcentaje_maquina}
                onChange={e => setCv('porcentaje_maquina', e.target.value)} />
            </div>
            <div>
              <label>% Ropa de agua</label>
              <input type="number" min="0" step="0.01" value={cv.porcentaje_ropa_agua}
                onChange={e => setCv('porcentaje_ropa_agua', e.target.value)} />
            </div>
            <div>
              <label>Viajes mínimos</label>
              <input type="number" min="1" step="1" value={cv.viajes_minimos}
                onChange={e => setCv('viajes_minimos', e.target.value)} />
            </div>
          </div>

          <p className="text-xs text-slate-500 uppercase tracking-wider pt-2">Descuentos</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label>% Obra social</label>
              <input type="number" min="0" step="0.01" value={cv.porcentaje_obra_social}
                onChange={e => setCv('porcentaje_obra_social', e.target.value)} />
            </div>
            <div>
              <label>% Ley 19032</label>
              <input type="number" min="0" step="0.01" value={cv.porcentaje_ley_19032}
                onChange={e => setCv('porcentaje_ley_19032', e.target.value)} />
            </div>
            <div>
              <label>% Jubilación</label>
              <input type="number" min="0" step="0.01" value={cv.porcentaje_jubilacion}
                onChange={e => setCv('porcentaje_jubilacion', e.target.value)} />
            </div>
            <div>
              <label>% Sindicato</label>
              <input type="number" min="0" step="0.01" value={cv.porcentaje_sindicato}
                onChange={e => setCv('porcentaje_sindicato', e.target.value)} />
            </div>
          </div>
        </div>

        {!editConvenio && (
          <p className="text-xs text-slate-500 mt-4">
            Modificá cualquier campo para habilitar el botón Guardar. Cada guardado crea una nueva versión histórica.
          </p>
        )}
      </div>

      {/* Usuarios registrados */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Usuarios registrados</h3>
          </div>
          <button onClick={recargar} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors">
            <RefreshCw size={13} className={cargandoUsuarios ? 'animate-spin' : ''} />
            Recargar
          </button>
        </div>

        {cargandoUsuarios ? (
          <p className="text-slate-500 text-sm text-center py-6 animate-pulse">Cargando usuarios...</p>
        ) : errorUsuarios ? (
          <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 my-2">
            <p className="text-red-400 text-sm font-semibold mb-1">Error al cargar usuarios</p>
            <p className="text-red-300/70 text-xs font-mono break-all">{errorUsuarios}</p>
            <p className="text-slate-500 text-xs mt-3">
              Probable causa: las reglas de Firestore no están publicadas en Firebase Console.<br/>
              Publicá las reglas en <span className="text-cyan-400">console.firebase.google.com</span> → Firestore → Reglas y volvé a intentarlo.
            </p>
            <button onClick={recargar} className="mt-3 text-xs bg-red-800/30 hover:bg-red-800/50 text-red-300 border border-red-700/40 px-3 py-1.5 rounded-lg transition-colors">
              Reintentar
            </button>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-500 text-sm">No hay usuarios registrados aún.</p>
            <p className="text-slate-600 text-xs mt-2">Si hay usuarios pero no aparecen, verificá que las reglas de Firestore estén publicadas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left text-xs text-slate-400 uppercase tracking-wider pb-3 pr-4">Email</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-wider pb-3 px-2">Sector</th>
                  <th className="text-right text-xs text-slate-400 uppercase tracking-wider pb-3 px-4">Viajes</th>
                  <th className="text-right text-xs text-slate-400 uppercase tracking-wider pb-3 px-4">Cajones</th>
                  <th className="text-right text-xs text-slate-400 uppercase tracking-wider pb-3 px-4">Registrado</th>
                  <th className="text-right text-xs text-slate-400 uppercase tracking-wider pb-3 pl-4">Último acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {usuarios.map(u => {
                  const sectorColor = { maquinas: '#22d3ee', cubierta: '#34d399', puente: '#c084fc' }
                  return (
                  <tr key={u.uid} className={`hover:bg-navy-700/30 transition-colors ${u.sinDocumento ? 'opacity-60' : ''}`}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        {u.activoUltimos30 && <span style={{width:6,height:6,borderRadius:'50%',background:'#34d399',flexShrink:0,display:'inline-block'}} title="Activo últimos 30 días" />}
                        <span className={`text-sm font-medium ${u.email === 'alangambacorta7@gmail.com' ? 'text-yellow-400' : u.sinDocumento ? 'text-slate-500 italic' : 'text-slate-300'}`}>
                          {u.email}
                          {u.email === 'alangambacorta7@gmail.com' && (
                            <span className="ml-2 text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">admin</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {u.sector
                        ? <span style={{fontSize:10,padding:'2px 7px',borderRadius:6,fontWeight:700,background:`${sectorColor[u.sector]}18`,color:sectorColor[u.sector],border:`1px solid ${sectorColor[u.sector]}40`}}>{u.sector}</span>
                        : <span className="text-xs text-slate-600">—</span>
                      }
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-cyan-400 font-semibold">{u.totalViajes}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-white font-semibold">{u.totalCajones.toLocaleString('es-AR')}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500">{fmtFechaCorta(u.registradoEn)}</td>
                    <td className="py-3 pl-4 text-right text-xs text-slate-400">{fmtFechaCorta(u.ultimoAcceso)}</td>
                  </tr>
                )})}

              </tbody>
              <tfoot>
                <tr className="border-t border-navy-600">
                  <td className="pt-3 text-xs text-slate-500">
                    {usuarios.length} usuarios en total
                    {usuarios.filter(u => u.sinDocumento).length > 0 && (
                      <span className="ml-2 text-slate-600">
                        ({usuarios.filter(u => u.sinDocumento).length} pendientes de re-login)
                      </span>
                    )}
                  </td>
                  <td className="pt-3 px-4 text-right text-cyan-400 font-semibold text-sm">
                    {usuarios.reduce((s, u) => s + u.totalViajes, 0)}
                  </td>
                  <td className="pt-3 px-4 text-right text-white font-semibold text-sm">
                    {usuarios.reduce((s, u) => s + u.totalCajones, 0).toLocaleString('es-AR')}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {!errorUsuarios && (
          <p className="text-xs text-slate-600 mt-4">
            Los usuarios sin email visible aún no iniciaron sesión con la versión actualizada.
          </p>
        )}
      </div>
    </div>
  )
}
