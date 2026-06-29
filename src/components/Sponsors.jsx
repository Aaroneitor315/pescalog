import { ExternalLink, Megaphone, Plus } from 'lucide-react'
import { SPONSORS, BANNER_PRINCIPAL } from '../sponsors'

function SponsorCard({ sponsor }) {
  const vacio = !sponsor.activo

  return (
    <div className={`relative bg-navy-800 rounded-xl border p-5 flex flex-col gap-3
      ${sponsor.destacado && !vacio ? 'border-cyan-500/50' : 'border-navy-600'}
      ${vacio ? 'border-dashed border-navy-600' : ''}
    `}>
      {sponsor.destacado && !vacio && (
        <span className="absolute -top-px right-4 bg-cyan-500 text-navy-900 text-xs font-semibold px-3 py-0.5 rounded-b-md">
          Destacado
        </span>
      )}

      <div className="flex items-center gap-3">
        {vacio ? (
          <div className="w-12 h-12 rounded-xl border-2 border-dashed border-navy-600 flex items-center justify-center">
            <Plus size={18} className="text-slate-600" />
          </div>
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: sponsor.color || '#163058', color: '#22d3ee' }}
          >
            {sponsor.iniciales}
          </div>
        )}
        <div>
          <p className={`font-medium text-sm ${vacio ? 'text-slate-600' : 'text-white'}`}>
            {sponsor.nombre}
          </p>
          <p className="text-xs text-slate-500">{sponsor.rubro}</p>
        </div>
      </div>

      {vacio ? (
        <a
          href="mailto:contacto@bitacoraar.com.ar"
          className="text-center text-xs text-slate-500 border border-dashed border-navy-600 rounded-lg py-2 hover:border-cyan-500/40 hover:text-slate-400 transition-colors"
        >
          Consultar disponibilidad
        </a>
      ) : (
        <a
          href={sponsor.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg py-2 hover:bg-cyan-500/20 transition-colors"
        >
          Ver más <ExternalLink size={11} />
        </a>
      )}
    </div>
  )
}

export default function Sponsors() {
  const hayAlgunSponsor = SPONSORS.some(s => s.activo) || BANNER_PRINCIPAL.activo

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Patrocinadores
        </h3>
        <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
          Sponsors oficiales
        </span>
      </div>

      {BANNER_PRINCIPAL.activo && (
        <a
          href={BANNER_PRINCIPAL.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-4 bg-navy-800 border border-cyan-500/30 rounded-xl px-5 py-4 hover:border-cyan-500/60 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/10 p-2.5 rounded-lg">
              <Megaphone size={18} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">{BANNER_PRINCIPAL.nombre}</p>
              <p className="text-slate-500 text-xs">{BANNER_PRINCIPAL.tagline}</p>
            </div>
          </div>
          <ExternalLink size={14} className="text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0" />
        </a>
      )}

      {!BANNER_PRINCIPAL.activo && !hayAlgunSponsor && (
        <a
          href="mailto:contacto@bitacoraar.com.ar"
          className="flex items-center justify-between gap-4 bg-navy-800 border border-dashed border-navy-600 rounded-xl px-5 py-4 hover:border-cyan-500/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="bg-navy-700 p-2.5 rounded-lg">
              <Megaphone size={18} className="text-slate-600" />
            </div>
            <div>
              <p className="text-slate-500 font-medium text-sm">Banner principal — slot disponible</p>
              <p className="text-slate-600 text-xs">Espacio destacado · mayor visibilidad</p>
            </div>
          </div>
          <span className="text-xs text-slate-600 border border-dashed border-navy-700 rounded-lg px-3 py-1.5 whitespace-nowrap group-hover:text-slate-400 transition-colors">
            Consultar precio
          </span>
        </a>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SPONSORS.map(sponsor => (
          <SponsorCard key={sponsor.id} sponsor={sponsor} />
        ))}
      </div>
    </div>
  )
}
