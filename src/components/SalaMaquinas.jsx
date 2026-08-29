// Esquema de la sala de máquinas. Dibuja SIEMPRE 3 motores fijos: principal +
// auxiliar 1 + auxiliar 2 (los 'extra' NO se dibujan acá). Cada motor es un
// <g data-motor="..."> con su color de estado en la variable CSS --st; la
// estructura queda en acero. Escala al ancho (width:100%), sin scroll en mobile.

import { estadoMotor } from '../lib/motores'

const SLOTS = [
  { rol: 'principal', def: 'Motor principal', x: 8, y: 8, w: 182, h: 198 },
  { rol: 'auxiliar1', def: 'Auxiliar 1', x: 202, y: 8, w: 170, h: 94 },
  { rol: 'auxiliar2', def: 'Auxiliar 2', x: 202, y: 112, w: 170, h: 94 },
]

const fmtHoras = (h) => `${(Number(h) || 0).toLocaleString('es-AR')} hs`

// Gráfico de motor en acero (no cambia con el estado).
function EngineAcero({ s, grande }) {
  const acero = '#26374b', linea = '#43586f', bed = '#1b2a3d'
  if (grande) {
    return (
      <g fill="none">
        <rect x={s.x + 16} y={s.y + 152} width={s.w - 32} height="32" rx="5" fill={bed} stroke={linea} />
        <rect x={s.x + 26} y={s.y + 100} width="102" height="56" rx="6" fill={acero} stroke={linea} />
        {[0, 1, 2, 3].map(i => (
          <rect key={i} x={s.x + 32 + i * 24} y={s.y + 86} width="18" height="17" rx="3" fill="#2f4359" stroke={linea} />
        ))}
        <line x1={s.x + 128} y1={s.y + 128} x2={s.x + 150} y2={s.y + 128} stroke={linea} strokeWidth="4" />
        <circle cx={s.x + 152} cy={s.y + 128} r="22" fill="#223247" stroke={linea} strokeWidth="2" />
        <circle cx={s.x + 152} cy={s.y + 128} r="7" fill="#2f4359" stroke={linea} />
      </g>
    )
  }
  const bx = s.x + s.w - 104
  return (
    <g fill="none">
      <rect x={bx} y={s.y + 52} width="72" height="28" rx="5" fill={acero} stroke={linea} />
      {[0, 1, 2].map(i => (
        <rect key={i} x={bx + 8 + i * 20} y={s.y + 42} width="14" height="13" rx="2" fill="#2f4359" stroke={linea} />
      ))}
      <line x1={bx + 72} y1={s.y + 66} x2={bx + 84} y2={s.y + 66} stroke={linea} strokeWidth="3" />
      <circle cx={bx + 96} cy={s.y + 66} r="13" fill="#223247" stroke={linea} strokeWidth="2" />
      <circle cx={bx + 96} cy={s.y + 66} r="4" fill="#2f4359" stroke={linea} />
    </g>
  )
}

export default function SalaMaquinas({ motores = [], seleccionado, onSelect, noEquipado = {}, onToggleNoEquipado, onEquipar }) {
  const principal = motores.find(m => m.rol === 'principal') || motores[0]
  const aux = motores.filter(m => m.rol === 'auxiliar')
  const bySlot = { principal, auxiliar1: aux[0], auxiliar2: aux[1] }
  const selSlot = SLOTS.find(s => bySlot[s.rol] && bySlot[s.rol].id === seleccionado)

  return (
    <svg viewBox="0 0 380 214" width="100%" style={{ display: 'block', height: 'auto' }}
      role="img" aria-label="Esquema de la sala de máquinas">
      <rect x="1" y="1" width="378" height="212" rx="14" fill="#0a1524" stroke="#1a2c42" />

      {SLOTS.map(s => {
        const m = bySlot[s.rol]
        const noEq = !m && !!noEquipado[s.rol]
        const est = m ? estadoMotor(m)
          : { color: noEq ? '#475569' : '#22d3ee', label: noEq ? 'No equipado' : 'Tocar para cargar' }
        const grande = s.rol === 'principal'
        const op = m ? 1 : (noEq ? 0.28 : 0.5)
        return (
          <g key={s.rol} data-motor={s.rol} style={{ '--st': est.color }}>
            <g opacity={op}>
              {/* cuerpo (acero) */}
              <rect x={s.x + 4} y={s.y + 4} width={s.w - 8} height={s.h - 8} rx="10" fill="#141f2e" stroke="#31445c" />
              {/* franja de estado */}
              <rect x={s.x + 12} y={s.y + 11} width={s.w - 24} height="4" rx="2" style={{ fill: 'var(--st)' }} />
              {/* gráfico del motor */}
              <EngineAcero s={s} grande={grande} />
              {/* LED de estado */}
              <circle cx={s.x + s.w - 20} cy={s.y + 26} r="4.5" style={{ fill: 'var(--st)' }} />
              {/* textos */}
              <text x={s.x + 15} y={s.y + 32} fontSize={grande ? 13 : 12} fontWeight="700" fill="#f1f5f9">{m?.nombre || s.def}</text>
              <text x={s.x + 15} y={s.y + 49} fontSize="11" fill="#94a3b8">{m ? fmtHoras(m.horas) : '—'}</text>
              <text x={s.x + 15} y={s.y + 65} fontSize="10.5" fontWeight="600" style={{ fill: m ? 'var(--st)' : est.color }}>{est.label}</text>
            </g>
            {/* zona clicable: motor → seleccionar; aux vacío → cargar (equipar); link "no equipado" */}
            {m ? (
              <rect className="hit" x={s.x + 4} y={s.y + 4} width={s.w - 8} height={s.h - 8} rx="10"
                fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onSelect && onSelect(m.id)} />
            ) : (s.rol !== 'principal' && (noEq ? (
              // no equipado → tocar habilita el slot (vuelve a "sin cargar")
              <rect className="hit" x={s.x + 4} y={s.y + 4} width={s.w - 8} height={s.h - 8} rx="10"
                fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onToggleNoEquipado && onToggleNoEquipado(s.rol)}>
                <title>Tocar para habilitar este motor</title>
              </rect>
            ) : (
              <>
                {/* cuerpo → cargar el motor auxiliar */}
                <rect className="hit" x={s.x + 4} y={s.y + 4} width={s.w - 8} height={s.h - 8} rx="10"
                  fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onEquipar && onEquipar(s.rol)}>
                  <title>Tocar para cargar este motor</title>
                </rect>
                {/* link chico: marcar como no equipado */}
                {onToggleNoEquipado && (
                  <text x={s.x + s.w - 12} y={s.y + s.h - 11} textAnchor="end" fontSize="9.5"
                    fill="#64748b" style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={(e) => { e.stopPropagation(); onToggleNoEquipado(s.rol) }}>no equipado</text>
                )}
              </>
            )))}
          </g>
        )
      })}

      {/* contorno punteado cyan del motor seleccionado */}
      {selSlot && (
        <rect x={selSlot.x + 2} y={selSlot.y + 2} width={selSlot.w - 4} height={selSlot.h - 4} rx="12"
          fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="6 5" pointerEvents="none" />
      )}
    </svg>
  )
}
