import { Anchor } from 'lucide-react'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'historial', label: 'Historial' },
  { id: 'precios', label: 'Precios' },
  { id: 'nuevo', label: '+ Nuevo viaje' },
]

export default function Navbar({ tab, setTab }) {
  return (
    <header className="bg-navy-800 border-b border-navy-700 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
        <div className="flex items-center gap-2 mr-4">
          <Anchor className="text-cyan-400" size={22} />
          <span className="text-lg font-bold tracking-tight text-white">
            Pesca<span className="text-cyan-400">Log</span>
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto">
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
