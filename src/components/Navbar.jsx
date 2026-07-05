import { LogOut } from 'lucide-react'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'historial', label: 'Historial' },
  { id: 'libreta', label: 'Mi Libreta' },
  { id: 'precios', label: 'Precios' },
  { id: 'nuevo', label: '+ Nuevo viaje' },
]

export default function Navbar({ tab, setTab, user, onCerrarSesion }) {
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
      <div className="max-w-6xl mx-auto px-4 py-2">
        <nav className="flex gap-1 overflow-x-auto scrollbar-none justify-center">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`nav-tab whitespace-nowrap ${tab === t.id ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
