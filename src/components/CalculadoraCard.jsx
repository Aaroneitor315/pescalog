import { useState } from 'react'
import { ChevronDown, ChevronRight, Hand } from 'lucide-react'
import { formatNum } from '../lib/artes-pesca/calculos'

// rgba a partir de un hex (#rgb o #rrggbb) para acentos tenues.
function withAlpha(hex, a) {
  const h = (hex || '#8b5cf6').replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// Decimales automáticos según magnitud (para no mostrar "13.060,00").
function autoDec(n) {
  const abs = Math.abs(n)
  if (abs >= 100) return 0
  if (abs >= 10) return 1
  return 2
}

const fmt = (n) => (n === null || n === undefined || !Number.isFinite(n)) ? '—' : formatNum(n, autoDec(n))

// Normaliza los valores para el cálculo: coma decimal → punto.
function normalizar(valores) {
  const out = {}
  for (const k in (valores || {})) {
    const v = valores[k]
    out[k] = typeof v === 'string' ? v.replace(',', '.') : v
  }
  return out
}

function ResultadoCard({ r, accent }) {
  return (
    <div className="rounded-xl p-3" style={{ border: `1px solid ${withAlpha(accent, 0.35)}`, background: withAlpha(accent, 0.08) }}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black tabular-nums leading-none" style={{ color: accent }}>{fmt(r.valor)}</span>
        {r.unidad && <span className="text-xs text-slate-400">{r.unidad}</span>}
      </div>
      <p className="text-[11px] text-slate-400 mt-1 leading-tight">{r.label}</p>
    </div>
  )
}

// Barra didáctica del coeficiente de armado E (0,30–0,90 con tick en el óptimo 0,71).
function BarraE({ E, accent }) {
  const min = 0.30, max = 0.90
  const optPct = ((0.71 - min) / (max - min)) * 100
  const pct = E === null || E === undefined || !Number.isFinite(E) ? null : Math.max(0, Math.min(1, (E - min) / (max - min))) * 100
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] text-slate-500 mb-1"><span>0,30</span><span>óptimo 0,71</span><span>0,90</span></div>
      <div className="relative h-2 rounded-full bg-navy-700">
        <span className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-slate-400 rounded" style={{ left: `${optPct}%` }} />
        {pct !== null && (
          <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-navy-900" style={{ left: `${pct}%`, background: accent }} />
        )}
      </div>
    </div>
  )
}

export default function CalculadoraCard({ calculadora, accent = '#8b5cf6', valores, onChange }) {
  const [abierto, setAbierto] = useState(false)
  const res = calculadora.calcular(normalizar(valores))
  const esPuertas = calculadora.id === 'seleccion_puertas'
  const esCoef = calculadora.id === 'coef_superficie_armado'
  const claves = Object.keys(res)

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white leading-tight">{calculadora.titulo}</h3>
          {calculadora.subtitulo && <p className="text-xs text-slate-500 mt-0.5">{calculadora.subtitulo}</p>}
        </div>
        <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full text-slate-400 border border-navy-600">
          <Hand size={11} /> Carga manual
        </span>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {calculadora.inputs.map(inp => {
          const val = valores?.[inp.id] ?? ''
          return (
            <div key={inp.id}>
              <label className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-slate-500">{inp.id}</span>
                <span className="truncate">{inp.label}</span>
                {inp.unidad && <span className="text-slate-600">· {inp.unidad}</span>}
              </label>
              {inp.tipo === 'select' ? (
                <select value={val || inp.defecto || ''} onChange={e => onChange(inp.id, e.target.value)} className="text-sm w-full">
                  {inp.opciones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type="text" inputMode="decimal"
                  value={val}
                  onChange={e => onChange(inp.id, e.target.value)}
                  placeholder={inp.opcional ? (inp.placeholder || 'opcional') : (inp.placeholder || '')}
                  className={`text-sm w-full ${inp.opcional ? 'border-dashed' : ''}`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Resultados */}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Resultados</p>

        {esPuertas ? (
          <div className="rounded-xl p-3" style={{ border: `1px solid ${withAlpha(accent, 0.35)}`, background: withAlpha(accent, 0.08) }}>
            <p className="text-lg font-black tabular-nums" style={{ color: accent }}>
              {fmt(res.area_min.valor)}–{fmt(res.area_max.valor)} <span className="text-sm text-slate-400">m²</span>
            </p>
            <p className="text-sm text-slate-300 mt-0.5">
              {res.peso_min.valor === null ? 'Peso: sin dato en la tabla' : <>Peso: {fmt(res.peso_min.valor)}–{fmt(res.peso_max.valor)} kg</>}
            </p>
            <p className="text-[10px] text-slate-500 mt-2">Referencia empírica, no cálculo cerrado.</p>
          </div>
        ) : (
          <div className={`grid gap-2 ${claves.length >= 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
            {claves.map(k => <ResultadoCard key={k} r={res[k]} accent={accent} />)}
          </div>
        )}

        {esCoef && <BarraE E={res.E.valor} accent={accent} />}

        {calculadora.notas?.length > 0 && !esPuertas && (
          <ul className="mt-2 space-y-0.5">
            {calculadora.notas.map((n, i) => <li key={i} className="text-[10px] text-slate-500 leading-snug">· {n}</li>)}
          </ul>
        )}
      </div>

      {/* Fórmula y explicación (colapsable) */}
      {(calculadora.formulas?.length > 0 || calculadora.explicacion) && (
        <div className="border-t border-navy-700 pt-3">
          <button onClick={() => setAbierto(a => !a)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200">
            {abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Fórmula y explicación
          </button>
          {abierto && (
            <div className="mt-2 space-y-2">
              {calculadora.formulas?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {calculadora.formulas.map((f, i) => (
                    <code key={i} className="text-[11px] font-mono px-2 py-1 rounded-md bg-navy-900 border border-navy-700 text-slate-300">{f}</code>
                  ))}
                </div>
              )}
              {calculadora.explicacion && <p className="text-xs text-slate-400 leading-relaxed">{calculadora.explicacion}</p>}
              {calculadora.fuente && <p className="text-[10px] text-slate-600">Fuente: {calculadora.fuente}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
