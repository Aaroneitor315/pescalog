import { LogOut, Shield } from 'lucide-react'
import { esAdmin } from '../hooks/useAdmin'

const TABS = [
  { id: 'dashboard', label: 'Estadísticas', main: true },
  { id: 'historial', label: 'Historial' },
  { id: 'libreta', label: 'Mi Libreta' },
  { id: 'precios', label: 'Precios' },
  { id: 'nuevo', label: '+ Nuevo viaje' },
]

export default function Navbar({ tab, setTab, user, onCerrarSesion }) {
  const admin = esAdmin(user)
  return (
    <header className="bg-navy-800 border-b border-navy-700 sticky top-0 z-10">
      <div className="w-full flex justify-center py-3 border-b border-navy-700/50 relative">
        <img src="/logo.png" alt="BitácoraAR" className="h-36 w-auto" />
        {user && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:block truncate max-w-[140px]">{user.email}</span>
            <button
              onClick={onCerrarSesion}
              title="Cerrar sesión"
              className="btn-ghost p-2 rounded-lg"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
      <div className="max-w-6xl mx-auto px-4 py-0">
        <nav className="flex gap-1 overflow-x-auto scrollbar-none justify-center items-end">
          {TABS.map(t => t.main ? (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="whitespace-nowrap px-5 py-3 rounded-t-lg font-bold tracking-widest text-sm uppercase transition-colors"
              style={{
                background: tab === t.id ? '#0891b2' : '#0a1f35',
                color: tab === t.id ? '#fff' : '#22d3ee',
                boxShadow: tab === t.id ? '0 -2px 12px #0891b240' : 'none',
                marginBottom: 0,
              }}
            >
              {t.label}
            </button>
          ) : (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`nav-tab whitespace-nowrap ${tab === t.id ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}
          {admin && (
            <button
              onClick={() => setTab('admin')}
              className={`nav-tab whitespace-nowrap flex items-center gap-1.5 ${tab === 'admin' ? 'active' : ''}`}
            >
              <Shield size={13} className="text-yellow-400" /> Admin
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
