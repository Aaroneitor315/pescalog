
const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'historial', label: 'Historial' },
  { id: 'libreta', label: 'Mi Libreta' },
  { id: 'precios', label: 'Precios' },
  { id: 'nuevo', label: '+ Nuevo viaje' },
]

export default function Navbar({ tab, setTab }) {
  return (
    <header className="bg-navy-800 border-b border-navy-700 sticky top-0 z-10">
      <div className="w-full flex justify-center py-3 border-b border-navy-700/50">
        <img src="/logo.png" alt="BitácoraAR" className="h-36 w-auto" />
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
