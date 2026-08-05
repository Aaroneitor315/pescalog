import { useState, useMemo } from 'react'
import { Calculator, Save, Trash2, ChevronDown, ChevronUp, Settings, Lock } from 'lucide-react'
import { TIPOS, getTipo } from '../lib/liquidaciones/index.js'
import { useLiquidaciones } from '../hooks/useLiquidaciones'

function fmtARS(n) {
  if (n == null) return '—'
  const abs = Math.abs(n)
  const txt = abs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `- $ ${txt}` : `$ ${txt}`
}

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Row({ label, valor, negativo, bold, accent }) {
  const color = negativo ? 'text-red-400' : accent || (bold ? 'text-white' : 'text-slate-300')
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-navy-700/40">
      <span className={`text-sm ${bold ? 'font-semibold text-white' : 'text-slate-400'}`}>{label}</span>
      <span className={`text-sm font-mono ${color} ${bold ? 'font-semibold' : ''}`}>{fmtARS(valor)}</span>
    </div>
  )
}

function GrupoRecibo({ grupo }) {
  return (
    <div className="mb-4">
      <p className={`text-xs uppercase tracking-wider font-semibold mb-1.5 ${grupo.negativo ? 'text-red-400/70' : 'text-cyan-400/70'}`}>
        {grupo.titulo}
      </p>
      {grupo.filas.map((f, i) => (
        <Row key={i} label={f.label} valor={f.valor} negativo={f.negativo || grupo.negativo} />
      ))}
      <Row label={grupo.total.label} valor={grupo.total.valor} bold accent={grupo.negativo ? 'text-red-400' : 'text-cyan-400'} />
    </div>
  )
}

function SelectorTipo({ tipoActual, onChange }) {
  return (
    <div className="flex gap-2">
      {TIPOS.map(t => {
        const activo = t.id === tipoActual
        const disabled = !t.disponible
        return (
          <button
            key={t.id}
            onClick={() => !disabled && onChange(t.id)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${activo
                ? 'bg-cyan-500 text-navy-900 shadow-lg shadow-cyan-500/20'
                : disabled
                  ? 'bg-navy-800/50 text-slate-600 cursor-not-allowed border border-navy-700/50'
                  : 'bg-navy-700/60 text-slate-400 border border-navy-600 hover:border-cyan-500/40 hover:text-slate-300'
              }`}
          >
            {disabled && <Lock size={12} />}
            {t.label}
            {disabled && <span className="text-[10px] font-normal ml-0.5 opacity-60">Próx.</span>}
          </button>
        )
      })}
    </div>
  )
}

function EditorTarifas({ tipo, tarifasLocales, setTarifasLocales }) {
  const tarifas = tarifasLocales || tipo.tarifasDefault
  const modificado = tarifasLocales != null

  function set(campo, valor) {
    setTarifasLocales(prev => ({ ...(prev || tipo.tarifasDefault), [campo]: Number(valor) || 0 }))
  }

  function reset() { setTarifasLocales(null) }

  const grupos = [
    {
      titulo: 'Captura',
      campos: [
        { campo: 'TARIFA_CAPTURA', label: 'Tarifa por kg', step: '0.01' },
      ],
    },
    {
      titulo: 'Remunerativos fijos',
      campos: [
        { campo: 'ALISTAMIENTO', label: 'Alistamiento', step: '0.5' },
        { campo: 'TAREAS_ESPECIFICAS', label: 'Tareas específicas', step: '0.5' },
        { campo: 'ALISTAMIENTO_MAQF', label: 'Alistam. maq. frigorista', step: '0.5' },
        { campo: 'TAREAS_ESPECIFICAS_MAQF', label: 'Tareas esp. maq. frigorista', step: '0.5' },
      ],
    },
    {
      titulo: 'No remunerativos',
      campos: [
        { campo: 'ACUERDO_NR', label: 'Acuerdo NR', step: '0.5' },
        { campo: 'PCT_ROPA_AGUA', label: '% Ropa de agua', step: '0.1' },
        { campo: 'MANUTENCION_DIA', label: 'Manutención / día', step: '1' },
      ],
    },
    {
      titulo: 'Deducciones (%)',
      campos: [
        { campo: 'PCT_JUBILACION', label: 'Jubilación', step: '0.1' },
        { campo: 'PCT_INSSJP', label: 'INSSJP', step: '0.1' },
        { campo: 'PCT_OBRA_SOCIAL', label: 'Obra social', step: '0.1' },
        { campo: 'PCT_OBRA_SOCIAL_ACUERDOS', label: 'O.S. acuerdos', step: '0.1' },
        { campo: 'PCT_SICONARA', label: 'SICONARA', step: '0.1' },
        { campo: 'PCT_SICONARA_ACUERDOS', label: 'SICONARA acuerdos', step: '0.1' },
      ],
    },
  ]

  return (
    <div className="card sticky top-24 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={15} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Tarifas SICONARA</h3>
        </div>
        {modificado && (
          <button onClick={reset} className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
            Restaurar
          </button>
        )}
      </div>

      {modificado && (
        <p className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800/30 rounded-lg px-2 py-1">
          Valores modificados localmente
        </p>
      )}

      {grupos.map(g => (
        <div key={g.titulo} className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider">{g.titulo}</p>
          {g.campos.map(c => (
            <div key={c.campo}>
              <label className="text-xs text-slate-400 block mb-0.5">{c.label}</label>
              <input
                type="number"
                min="0"
                step={c.step}
                className="text-sm py-1.5"
                value={tarifas[c.campo] ?? ''}
                onChange={e => set(c.campo, e.target.value)}
              />
            </div>
          ))}
        </div>
      ))}

      <p className="text-xs text-slate-600 border-t border-navy-700 pt-3">
        Vigente desde: {tarifas.fecha_vigencia_desde || '—'}. Los cambios acá solo afectan este cálculo.
      </p>
    </div>
  )
}

export default function Calculadora({ uid }) {
  const { liquidaciones, guardarLiquidacion, eliminarLiquidacion } = useLiquidaciones(uid)
  const [tipoId, setTipoId] = useState('maquinista')
  const [entradas, setEntradas] = useState({})
  const [tarifasLocales, setTarifasLocales] = useState(null)
  const [guardado, setGuardado] = useState(false)
  const [verHistorial, setVerHistorial] = useState(false)

  const tipo = getTipo(tipoId)
  const tarifas = tarifasLocales || tipo.tarifasDefault

  function set(campo, valor) {
    setEntradas(prev => ({ ...prev, [campo]: valor }))
    setGuardado(false)
  }

  function cambiarTipo(id) {
    setTipoId(id)
    setEntradas({})
    setTarifasLocales(null)
    setGuardado(false)
  }

  const hayDatos = tipo.campos.every(c => Number(entradas[c.id]) > 0)
  const resultado = useMemo(
    () => hayDatos ? tipo.calcular(entradas, tarifas) : null,
    [entradas, tarifas, hayDatos, tipo]
  )

  async function handleGuardar() {
    if (!resultado) return
    await guardarLiquidacion({
      tipo: tipoId,
      entradas,
      tarifas_usadas: tarifas,
      ...resultado.valores,
      totalBruto: resultado.totalBruto,
      totalDeducciones: resultado.totalDeducciones,
      netoACobrar: resultado.neto,
    })
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  const liqsFiltradas = liquidaciones.filter(l => l.tipo === tipoId)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-cyan-500/10 border border-cyan-500/20 p-2 rounded-lg">
          <Calculator size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Liquidación</h2>
          <p className="text-xs text-slate-500">SICONARA · Pesca de langostino</p>
        </div>
      </div>

      {/* Selector de tipo */}
      <SelectorTipo tipoActual={tipoId} onChange={cambiarTipo} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Columna izquierda: formulario + resultado */}
        <div className="lg:col-span-2 space-y-4">

          {/* Formulario */}
          <div className="card space-y-5">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Datos de la marea — {tipo.label}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {tipo.campos.map(c => (
                <div key={c.id}>
                  <label>{c.label} <span className="text-slate-600 text-xs">({c.unidad})</span></label>
                  <input
                    type="number"
                    min="0"
                    step={c.paso}
                    placeholder={c.placeholder}
                    value={entradas[c.id] || ''}
                    onChange={e => set(c.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
            {hayDatos && (
              <p className="text-xs text-cyan-400 -mt-2">
                {tipo.resumen(entradas)}
              </p>
            )}
          </div>

          {/* Recibo */}
          {resultado && (
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Recibo de haberes
              </h3>

              {resultado.grupos.map(g => (
                <GrupoRecibo key={g.id} grupo={g} />
              ))}

              <Row label="BRUTO" valor={resultado.totalBruto} bold />

              <div className="mt-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Neto a cobrar</p>
                  <p className="text-3xl font-bold text-cyan-400 mt-1">{fmtARS(resultado.neto)}</p>
                </div>
                <button
                  onClick={handleGuardar}
                  className={`btn-primary flex items-center gap-2 ${guardado ? 'bg-green-500 hover:bg-green-400' : ''}`}
                >
                  <Save size={15} /> {guardado ? '¡Guardado!' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {/* Historial */}
          <div className="card">
            <button
              onClick={() => setVerHistorial(v => !v)}
              className="w-full flex items-center justify-between text-sm font-semibold text-white"
            >
              <span>Liquidaciones guardadas ({liqsFiltradas.length})</span>
              {verHistorial ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {verHistorial && (
              <div className="mt-4 space-y-3">
                {liqsFiltradas.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">No hay liquidaciones guardadas.</p>
                )}
                {liqsFiltradas.map(liq => (
                  <div key={liq.id} className="bg-navy-700/50 border border-navy-600 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs text-slate-500">{fmtFecha(liq.fecha_calculo)}</p>
                        <p className="text-white font-semibold text-lg">{fmtARS(liq.netoACobrar)}</p>
                      </div>
                      <button onClick={() => eliminarLiquidacion(liq.id)} className="btn-danger p-1.5">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <span>{tipo.resumen(liq.entradas || liq)}</span>
                      <span className="text-right">Bruto: {fmtARS(liq.totalBruto)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: tarifas */}
        <div className="lg:col-span-1">
          <EditorTarifas tipo={tipo} tarifasLocales={tarifasLocales} setTarifasLocales={setTarifasLocales} />
        </div>
      </div>
    </div>
  )
}
