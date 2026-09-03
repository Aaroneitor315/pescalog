import { useState } from 'react'
import { Grid3x3, LifeBuoy, DoorOpen, Cable, ScanLine, Calculator, BookOpen } from 'lucide-react'
import { TIPOS_PESCA, CATEGORIAS, calculadorasDeCategoria, buscarCalculadora } from '../lib/artes-pesca/config'
import CalculadoraCard from './CalculadoraCard'

const ICONOS = { 'grid-3x3': Grid3x3, 'life-buoy': LifeBuoy, 'door-open': DoorOpen, 'cable': Cable, 'scan-line': ScanLine }

function withAlpha(hex, a) {
  const h = (hex || '#8b5cf6').replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// Valores iniciales: los selects arrancan en su opción por defecto.
function initValores(calc) {
  const v = {}
  ;(calc?.inputs || []).forEach(i => { if (i.tipo === 'select') v[i.id] = i.defecto ?? i.opciones?.[0]?.value })
  return v
}

function Divisor({ children }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold whitespace-nowrap">{children}</p>
      <div className="flex-1 h-px bg-navy-700" />
    </div>
  )
}

export default function ArtesPescaPanel({ accent = '#8b5cf6' }) {
  const soft = withAlpha(accent, 0.10)
  const line = withAlpha(accent, 0.35)

  const [tipoPesca, setTipoPesca] = useState(TIPOS_PESCA[0].id)
  const [categoria, setCategoria] = useState(CATEGORIAS[0].id)
  const [calcId, setCalcId] = useState(calculadorasDeCategoria(CATEGORIAS[0].id)[0].id)
  const [valores, setValores] = useState(() => initValores(buscarCalculadora(calcId)))
  const [verGlosario, setVerGlosario] = useState(false)

  const tipo = TIPOS_PESCA.find(t => t.id === tipoPesca)
  const calcsCat = calculadorasDeCategoria(categoria)
  const calc = buscarCalculadora(calcId)

  function elegirCategoria(id) {
    setCategoria(id)
    const primera = calculadorasDeCategoria(id)[0]
    setCalcId(primera.id)
    setValores(initValores(primera))
  }
  function elegirCalc(id) {
    setCalcId(id)
    setValores(initValores(buscarCalculadora(id)))
  }
  const onChange = (id, value) => setValores(v => ({ ...v, [id]: value }))

  return (
    <div className="p-4 space-y-6" style={{ '--accent': accent }}>
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: soft, border: `1px solid ${line}` }}>
          <Calculator size={18} style={{ color: accent }} />
        </div>
        <div>
          <h2 className="text-base font-bold text-white leading-tight">Calculadoras de aparejo</h2>
          <p className="text-[11px] text-slate-500">Armado, flotación, puertas, cables y área barrida.</p>
        </div>
      </div>

      {/* ── TIPO DE PESCA ── */}
      <div className="space-y-3">
        <Divisor>Tipo de pesca</Divisor>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {TIPOS_PESCA.map(t => {
            const sel = t.id === tipoPesca
            return (
              <button key={t.id} onClick={() => { setTipoPesca(t.id); setVerGlosario(false) }}
                className="text-left rounded-xl border p-3 transition-colors"
                style={sel ? { borderColor: line, background: soft } : { borderColor: '#1a304e', background: '#0d1829' }}>
                <p className="text-sm font-bold" style={{ color: sel ? accent : '#e2e8f0' }}>{t.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{t.descripcionCorta}</p>
              </button>
            )
          })}
        </div>

        {/* Glosario */}
        <div className="rounded-lg border border-navy-700 bg-navy-800/60 px-3 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <BookOpen size={13} className="text-slate-500 flex-shrink-0" />
            <span className="text-[11px] text-slate-400 flex-1 min-w-0">
              {tipo.glosario.map(g => g.termino).join(' · ')}
            </span>
            <button onClick={() => setVerGlosario(v => !v)} className="text-[11px] font-semibold flex-shrink-0" style={{ color: accent }}>
              {verGlosario ? 'Ocultar' : 'Ver glosario →'}
            </button>
          </div>
          {verGlosario && (
            <dl className="mt-2 pt-2 border-t border-navy-700 space-y-1.5">
              {tipo.glosario.map(g => (
                <div key={g.termino} className="text-[11px] leading-snug">
                  <dt className="inline font-semibold text-slate-300">{g.termino}: </dt>
                  <dd className="inline text-slate-500">{g.definicion}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {/* ── CÁLCULOS ── */}
      <div className="space-y-3">
        <Divisor>Cálculos</Divisor>
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-4 space-y-3 lg:space-y-0">
          {/* Categorías: chips scrolleables en mobile, lista vertical en desktop */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
            {CATEGORIAS.map(c => {
              const Icon = ICONOS[c.icono] || Grid3x3
              const sel = c.id === categoria
              return (
                <button key={c.id} onClick={() => elegirCategoria(c.id)}
                  className="flex-shrink-0 lg:w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left whitespace-nowrap transition-colors"
                  style={sel
                    ? { borderColor: line, background: soft, color: '#fff', borderLeftWidth: 3, borderLeftColor: accent }
                    : { borderColor: '#1a304e', background: '#0d1829', color: '#94a3b8' }}>
                  <Icon size={16} style={{ color: sel ? accent : '#64748b' }} />
                  {c.label}
                </button>
              )
            })}
          </div>

          {/* Calculadora activa */}
          <div className="space-y-3">
            {calcsCat.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {calcsCat.map(cc => {
                  const sel = cc.id === calcId
                  return (
                    <button key={cc.id} onClick={() => elegirCalc(cc.id)}
                      className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors"
                      style={sel ? { borderColor: line, background: soft, color: accent } : { borderColor: '#1a304e', background: '#0d1829', color: '#94a3b8' }}>
                      {cc.titulo}
                    </button>
                  )
                })}
              </div>
            )}
            <CalculadoraCard calculadora={calc} accent={accent} valores={valores} onChange={onChange} />
          </div>
        </div>
      </div>
    </div>
  )
}
