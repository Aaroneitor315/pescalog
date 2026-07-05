import { useState } from 'react'
import { useAdmin } from '../hooks/useAdmin'
import { Shield, Users, Package, DollarSign, ToggleLeft, ToggleRight, Save, Star } from 'lucide-react'

const ESPECIES = ['langostino', 'calamar', 'merluza', 'abadejo', 'pescado de costa A', 'pescado de costa B']

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function fmtNum(n) {
  return (n || 0).toLocaleString('es-AR')
}

export default function AdminPanel() {
  const { stats, sponsors, guardarSponsors, cargando } = useAdmin()
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

  const cajones = stats?.cajonesPorEspecie || {}
  const maxCajones = Math.max(...ESPECIES.map(e => cajones[e.replace(/\s/g, '_')] || 0), 1)

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

      {/* Cajones por especie */}
      <div className="card">
        <h3 className="text-base font-semibold text-white mb-4">Cajones por especie</h3>
        <div className="space-y-3">
          {ESPECIES.map(esp => {
            const key = esp.replace(/\s/g, '_')
            const n = cajones[key] || 0
            return (
              <div key={esp} className="flex items-center gap-3">
                <span className="text-sm text-slate-300 w-36 shrink-0">{capitalize(esp)}</span>
                <div className="flex-1 h-2 bg-navy-700 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full transition-all"
                    style={{ width: `${(n / maxCajones) * 100}%` }} />
                </div>
                <span className="text-sm text-slate-400 w-24 text-right shrink-0">{fmtNum(n)} caj.</span>
              </div>
            )
          })}
          {!stats && !cargando && (
            <p className="text-slate-500 text-sm text-center py-4">
              Las estadísticas se irán acumulando con los viajes que carguen los usuarios.
            </p>
          )}
        </div>
      </div>

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
    </div>
  )
}
