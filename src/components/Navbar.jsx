import { useState } from 'react'
import { LogOut, Shield, BarChart2, List, Plus, BookOpen, MoreHorizontal, DollarSign, Calculator, X } from 'lucide-react'
import { esAdmin } from '../hooks/useAdmin'

const TABS_DESKTOP = [
  { id: 'dashboard', label: 'Estadísticas', main: true },
  { id: 'historial', label: 'Historial' },
  { id: 'libreta', label: 'Mi Libreta' },
  { id: 'precios', label: 'Valores' },
  { id: 'nuevo', label: '+ Nuevo viaje' },
  { id: 'liquidacion', label: 'Calculadora' },
]

const TABS_BOTTOM = [
  { id: 'dashboard', label: 'Estadísticas', icon: BarChart2 },
  { id: 'historial', label: 'Historial', icon: List },
  { id: 'nuevo', label: null, icon: Plus, fab: true },
  { id: 'libreta', label: 'Libreta', icon: BookOpen },
  { id: 'mas', label: 'Más', icon: MoreHorizontal },
]

const TABS_MAS = [
  { id: 'precios', label: 'Valores', icon: DollarSign },
  { id: 'liquidacion', label: 'Calculadora', icon: Calculator },
]

export default function Navbar({ tab, setTab, user, onCerrarSesion }) {
  const admin = esAdmin(user)
  const [masAbierto, setMasAbierto] = useState(false)

  function irA(id) {
    setTab(id)
    setMasAbierto(false)
  }

  const enMas = ['precios', 'liquidacion', 'admin'].includes(tab)

  return (
    <>
      {/* Header con logo — siempre visible */}
      <header className="bg-navy-800 border-b border-navy-700 sticky top-0 z-10">
        <div className="w-full flex justify-center py-3 border-b border-navy-700/50 relative">
          <img src="/logo.png" alt="BitácoraAR" className="h-36 w-auto" />
          {user && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:block truncate max-w-[140px]">{user.email}</span>
              <button onClick={onCerrarSesion} title="Cerrar sesión" className="btn-ghost p-2 rounded-lg">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Nav desktop — oculto en mobile */}
        <div className="hidden sm:block max-w-6xl mx-auto px-4 py-2">
          <nav className="flex gap-1 overflow-x-auto scrollbar-none justify-center items-end">
            {TABS_DESKTOP.map(t => t.main ? (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="whitespace-nowrap px-4 py-2 rounded-lg font-bold tracking-widest text-xs uppercase transition-colors"
                style={{
                  background: tab === t.id ? '#0891b2' : '#0a2540',
                  color: tab === t.id ? '#fff' : '#22d3ee',
                  border: tab === t.id ? 'none' : '1px solid #22d3ee40',
                }}>
                {t.label}
              </button>
            ) : (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`nav-tab whitespace-nowrap ${tab === t.id ? 'active' : ''}`}>
                {t.label}
              </button>
            ))}
            {admin && (
              <button onClick={() => setTab('admin')}
                className={`nav-tab whitespace-nowrap flex items-center gap-1.5 ${tab === 'admin' ? 'active' : ''}`}>
                <Shield size={13} className="text-yellow-400" /> Admin
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Menú "Más" overlay — solo mobile */}
      {masAbierto && (
        <div
          className="sm:hidden fixed inset-0 z-30"
          onClick={() => setMasAbierto(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 mx-4 bg-navy-800 border border-navy-600 rounded-2xl p-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Más opciones</span>
              <button onClick={() => setMasAbierto(false)} className="text-slate-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TABS_MAS.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.id} onClick={() => irA(t.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${tab === t.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-navy-700/60 text-slate-300 hover:bg-navy-700'}`}>
                    <Icon size={18} />
                    <span className="text-sm font-medium">{t.label}</span>
                  </button>
                )
              })}
              {admin && (
                <button onClick={() => irA('admin')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${tab === 'admin' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-navy-700/60 text-slate-300 hover:bg-navy-700'}`}>
                  <Shield size={18} className="text-yellow-400" />
                  <span className="text-sm font-medium">Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav — solo mobile */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-navy-800 border-t border-navy-700">
        <div className="flex justify-around items-end px-2 pb-2 pt-1">
          {TABS_BOTTOM.map(t => {
            const Icon = t.icon

            if (t.fab) return (
              <button key={t.id} onClick={() => irA(t.id)} aria-label="Nuevo viaje"
                className="flex flex-col items-center"
                style={{ marginTop: '-20px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: tab === 'nuevo' ? '#0e7490' : '#06b6d4',
                  border: '3px solid #0a1929',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(6,182,212,0.4)',
                }}>
                  <Icon size={24} color="#0a1929" />
                </div>
                <span style={{ fontSize: 9, marginTop: 3, color: tab === 'nuevo' ? '#06b6d4' : '#64748b' }}>+ Viaje</span>
              </button>
            )

            if (t.id === 'mas') return (
              <button key="mas" onClick={() => setMasAbierto(v => !v)}
                className="flex flex-col items-center gap-1 py-1 px-3">
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: (masAbierto || enMas) ? 'rgba(6,182,212,0.15)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color={(masAbierto || enMas) ? '#06b6d4' : '#64748b'} />
                </div>
                <span style={{ fontSize: 9, color: (masAbierto || enMas) ? '#06b6d4' : '#64748b' }}>Más</span>
              </button>
            )

            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => irA(t.id)}
                className="flex flex-col items-center gap-1 py-1 px-3">
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: active ? 'rgba(6,182,212,0.15)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color={active ? '#06b6d4' : '#64748b'} />
                </div>
                <span style={{ fontSize: 9, color: active ? '#06b6d4' : '#64748b' }}>{t.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Espaciado inferior en mobile para que el contenido no quede tapado por el nav */}
      <div className="sm:hidden h-16" />
    </>
  )
}
