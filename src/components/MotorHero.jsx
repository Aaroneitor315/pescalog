// Hero del motor seleccionado: ilustración grande en acero (con luz cyan) sobre
// un fondo tipo sala de máquinas, con pastilla de estado arriba y etiquetas
// (callouts) que leen la identificación. Escala al ancho; en celular las
// etiquetas se ocultan (los datos ya están en la ficha técnica debajo).
import { estadoMotor } from '../lib/motores'

export default function MotorHero({ motor }) {
  const ident = motor?.identificacion || {}
  const est = estadoMotor(motor)
  const nombre = motor?.nombre || 'Motor'
  const val = (v, suf = '') => (v || v === 0) && String(v).trim() !== '' ? `${v}${suf}` : '—'

  const callouts = [
    { pos: 'left-3 top-[26%]', k: 'N° de serie', v: val(ident.serie), side: 'r' },
    { pos: 'right-3 top-[30%]', k: 'Potencia', v: ident.potenciaKw ? `${ident.potenciaKw} kW` : '—', side: 'l' },
    { pos: 'left-3 top-[66%]', k: 'Combustible', v: val(ident.combustible), side: 'r' },
    { pos: 'right-3 top-[66%]', k: 'Relación', v: val(ident.relacion), side: 'l' },
  ]

  return (
    <div className="relative rounded-2xl overflow-hidden border border-navy-700"
      style={{ background: 'radial-gradient(120% 90% at 50% 12%, #16324a 0%, #0c1c2e 45%, #081321 100%)' }}>
      <span className="hidden sm:block absolute left-3 top-3 z-10 text-[9px] font-bold tracking-wider px-2 py-1 rounded-md"
        style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }}>
        MOTOR SELECCIONADO
      </span>

      {/* pastilla de estado */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 z-10 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold text-white"
        style={{ background: 'rgba(8,20,33,.85)', border: `1px solid ${est.color}` }}>
        <span className="w-2 h-2 rounded-full" style={{ background: est.color, boxShadow: `0 0 8px ${est.color}` }} />
        <span className="truncate max-w-[160px]">{nombre}</span>
        <span style={{ color: est.color, fontWeight: 600 }}>· {est.label}</span>
      </div>

      {/* etiquetas (solo desde sm) */}
      {callouts.map((c, i) => (
        <div key={i} className={`hidden sm:block absolute z-10 ${c.pos} -translate-y-1/2`}>
          <div className="relative bg-[rgba(9,18,30,.9)] border border-navy-500 rounded-lg px-2.5 py-1.5">
            <div className="text-[9px] text-slate-500 tracking-wide">{c.k}</div>
            <div className="text-[12px] text-white font-bold whitespace-nowrap">{c.v}</div>
            <span className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
              style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', [c.side === 'r' ? 'right' : 'left']: '-20px' }} />
          </div>
        </div>
      ))}

      <div className="px-2 pt-2 pb-1">
        <svg viewBox="0 0 560 300" width="100%" style={{ display: 'block', height: 'auto' }}
          role="img" aria-label={`Motor ${nombre}`}>
          <defs>
            <linearGradient id="mh-steel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9fb6c9" /><stop offset=".45" stopColor="#617689" /><stop offset="1" stopColor="#2b3c4f" />
            </linearGradient>
            <linearGradient id="mh-steel2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7d94a8" /><stop offset="1" stopColor="#243343" />
            </linearGradient>
            <linearGradient id="mh-rim" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#22d3ee" stopOpacity=".45" /><stop offset=".22" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* cárter */}
          <path d="M70 205 h420 l-20 60 h-380 z" fill="url(#mh-steel2)" stroke="#3a4f66" />
          {/* bloque */}
          <rect x="60" y="120" width="440" height="90" rx="6" fill="url(#mh-steel)" stroke="#3a4f66" />
          <g stroke="#43586f" opacity=".55">
            {[110, 160, 210, 260, 310, 360, 410].map(x => <line key={x} x1={x} y1="126" x2={x} y2="204" />)}
          </g>
          {/* tapa de válvulas */}
          <rect x="90" y="70" width="330" height="56" rx="8" fill="url(#mh-steel)" stroke="#3a4f66" />
          <g fill="#33475d" stroke="#43586f">
            {[108, 164, 220, 276, 332].map(x => <rect key={x} x={x} y="56" width="34" height="22" rx="4" />)}
          </g>
          {/* polea damper */}
          <circle cx="500" cy="165" r="46" fill="#243343" stroke="#43586f" strokeWidth="2" />
          <circle cx="500" cy="165" r="30" fill="#2f4359" stroke="#43586f" />
          <circle cx="500" cy="165" r="12" fill="#1b2a3d" stroke="#43586f" />
          {/* campana volante */}
          <circle cx="70" cy="165" r="52" fill="#223247" stroke="#3a4f66" strokeWidth="2" />
          <circle cx="70" cy="165" r="34" fill="#2b3c4f" stroke="#43586f" />
          {/* turbo */}
          <circle cx="440" cy="96" r="26" fill="#2f4359" stroke="#43586f" />
          <path d="M440 70 v-18 h30 v22" fill="none" stroke="#43586f" strokeWidth="5" />
          {/* franja + LED de estado */}
          <rect x="90" y="63" width="330" height="4" rx="2" fill={est.color} />
          <circle cx="405" cy="86" r="5" fill={est.color} />
          {/* luz de borde cyan */}
          <rect x="60" y="63" width="440" height="147" fill="url(#mh-rim)" />
        </svg>
      </div>
    </div>
  )
}
