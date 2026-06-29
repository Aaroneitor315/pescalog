
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
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
        <div className="flex items-center mr-4 shrink-0">
          <img src="/logo.png" alt="BitácoraAR" className="h-10 w-auto" />
        </div>
        <nav className="flex gap-1 overflow-x-auto scrollbar-none">
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
