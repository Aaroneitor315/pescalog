import { useState, useMemo } from 'react'
import { Calculator, Save, Trash2, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useConvenio } from '../hooks/useConvenio'
import { useLiquidaciones } from '../hooks/useLiquidaciones'

function fmt(n) {
  if (!n && n !== 0) return '—'
  return `$ ${Math.round(n).toLocaleString('es-AR')}`
}

function fmtNum(n) {
  return (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const FORM_INICIAL = {
  precio_usd: '',
  tipo_cambio: '',
  cajones: '',
  kg_por_cajon: '10',
  tareas_especiales_1: '',
  tareas_especiales_2: '',
  alistamiento_1: '',
  alistamiento_2: '',
  beneficios: '',
  ganancias: '',
}

function calcular(form, convenio) {
  const precio_usd = Number(form.precio_usd) || 0
  const tipo_cambio = Number(form.tipo_cambio) || 0
  const cajones = Number(form.cajones) || 0
  const kg_por_cajon = Number(form.kg_por_cajon) || 0
  const te1 = Number(form.tareas_especiales_1) || 0
  const te2 = Number(form.tareas_especiales_2) || 0
  const al1 = Number(form.alistamiento_1) || 0
  const al2 = Number(form.alistamiento_2) || 0
  const beneficios = Number(form.beneficios) || 0
  const ganancias = Number(form.ganancias) || 0

  const precio_pesos_kg = precio_usd * tipo_cambio
  const kg_totales = cajones * kg_por_cajon
  const valor_captura_total = kg_totales * precio_pesos_kg

  const viaje_puro = valor_captura_total * (convenio.porcentaje_maquina / 100)
  const ropa_agua = valor_captura_total * (convenio.porcentaje_ropa_agua / 100)
  const total_por_viaje = viaje_puro + ropa_agua + te1 + te2 + al1 + al2
  const total_minimo_viajes = convenio.tope_mopre * (convenio.porcentaje_maquina / 100) * convenio.viajes_minimos

  const bruto_final = Math.max(total_por_viaje, total_minimo_viajes)

  const descuento_obra_social = bruto_final * (convenio.porcentaje_obra_social / 100)
  const descuento_ley_19032 = bruto_final * (convenio.porcentaje_ley_19032 / 100)
  const descuento_jubilacion = bruto_final * (convenio.porcentaje_jubilacion / 100)
  const descuento_sindicato = bruto_final * (convenio.porcentaje_sindicato / 100)
  const total_descuentos = descuento_obra_social + descuento_ley_19032 + descuento_jubilacion + descuento_sindicato

  const neto = bruto_final - total_descuentos
  const total_final = neto + beneficios - ganancias

  return {
    precio_pesos_kg, kg_totales, valor_captura_total,
    viaje_puro, ropa_agua, total_por_viaje, total_minimo_viajes,
    bruto_final, aplica_minimo: total_minimo_viajes > total_por_viaje,
    descuento_obra_social, descuento_ley_19032, descuento_jubilacion, descuento_sindicato, total_descuentos,
    neto, beneficios, ganancias, total_final,
  }
}

function Row({ label, value, accent, bold, muted, info }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-navy-700/50 ${bold ? 'font-semibold' : ''}`}>
      <span className={`text-sm ${muted ? 'text-slate-500' : 'text-slate-300'} flex items-center gap-1`}>
        {label}
        {info && <span className="text-xs text-slate-600" title={info}><Info size={11} /></span>}
      </span>
      <span className={`text-sm font-mono ${accent || (bold ? 'text-white' : 'text-slate-300')}`}>{value}</span>
    </div>
  )
}

export default function Calculadora({ uid }) {
  const { convenio, cargando } = useConvenio()
  const { liquidaciones, guardarLiquidacion, eliminarLiquidacion } = useLiquidaciones(uid)
  const [form, setForm] = useState(FORM_INICIAL)
  const [guardado, setGuardado] = useState(false)
  const [verHistorial, setVerHistorial] = useState(false)

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    setGuardado(false)
  }

  const res = useMemo(() => calcular(form, convenio), [form, convenio])
  const listo = Number(form.precio_usd) > 0 && Number(form.tipo_cambio) > 0 && Number(form.cajones) > 0

  async function handleGuardar() {
    await guardarLiquidacion({ ...form, ...res, convenio_usado: convenio })
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  if (cargando) return <div className="text-slate-400 text-center py-16 animate-pulse">Cargando convenio...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="bg-cyan-500/10 border border-cyan-500/20 p-2 rounded-lg">
          <Calculator size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Calculadora de liquidación</h2>
          <p className="text-xs text-slate-500">Sector máquina · Langostineros · Convenio vigente desde {convenio.fecha_vigencia_desde}</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="card space-y-5">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Datos del viaje</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Precio U$S / kg</label>
            <input type="number" min="0" step="0.001" placeholder="Ej: 2.850"
              value={form.precio_usd} onChange={e => set('precio_usd', e.target.value)} />
          </div>
          <div>
            <label>Tipo de cambio ($ por U$S)</label>
            <input type="number" min="0" step="1" placeholder="Ej: 1490"
              value={form.tipo_cambio} onChange={e => set('tipo_cambio', e.target.value)} />
          </div>
        </div>

        {form.precio_usd && form.tipo_cambio && (
          <p className="text-xs text-cyan-400 -mt-2">
            Precio en pesos: $ {fmtNum(Number(form.precio_usd) * Number(form.tipo_cambio))} / kg
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Cajones</label>
            <input type="number" min="0" placeholder="Cantidad de cajones"
              value={form.cajones} onChange={e => set('cajones', e.target.value)} />
          </div>
          <div>
            <label>Kg por cajón</label>
            <input type="number" min="0" step="0.1" placeholder="Ej: 10"
              value={form.kg_por_cajon} onChange={e => set('kg_por_cajon', e.target.value)} />
          </div>
        </div>

        {listo && (
          <p className="text-xs text-slate-400 -mt-2">
            Total: {(Number(form.cajones) * Number(form.kg_por_cajon)).toLocaleString('es-AR')} kg · Captura: {fmt(res.valor_captura_total)}
          </p>
        )}

        <div className="border-t border-navy-700 pt-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Adicionales (opcional)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Tareas especiales 1</label>
              <input type="number" min="0" placeholder="$ 0"
                value={form.tareas_especiales_1} onChange={e => set('tareas_especiales_1', e.target.value)} />
            </div>
            <div>
              <label>Tareas especiales 2</label>
              <input type="number" min="0" placeholder="$ 0"
                value={form.tareas_especiales_2} onChange={e => set('tareas_especiales_2', e.target.value)} />
            </div>
            <div>
              <label>Alistamiento 1</label>
              <input type="number" min="0" placeholder="$ 0"
                value={form.alistamiento_1} onChange={e => set('alistamiento_1', e.target.value)} />
            </div>
            <div>
              <label>Alistamiento 2</label>
              <input type="number" min="0" placeholder="$ 0"
                value={form.alistamiento_2} onChange={e => set('alistamiento_2', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="border-t border-navy-700 pt-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Ajustes finales</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Beneficios (suma)</label>
              <input type="number" min="0" placeholder="$ 0"
                value={form.beneficios} onChange={e => set('beneficios', e.target.value)} />
            </div>
            <div>
              <label>Ganancias (descuento)</label>
              <input type="number" min="0" placeholder="$ 0"
                value={form.ganancias} onChange={e => set('ganancias', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Resultado */}
      {listo && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Liquidación</h3>

          <Row label="Valor de captura total" value={fmt(res.valor_captura_total)} />
          <Row label={`Viaje puro (${convenio.porcentaje_maquina}%)`} value={fmt(res.viaje_puro)} accent="text-cyan-400" />
          <Row label={`Ropa de agua (${convenio.porcentaje_ropa_agua}%)`} value={fmt(res.ropa_agua)} />
          {res.tareas_especiales_1 > 0 && <Row label="Tareas especiales 1" value={fmt(Number(form.tareas_especiales_1))} />}
          {res.tareas_especiales_2 > 0 && <Row label="Tareas especiales 2" value={fmt(Number(form.tareas_especiales_2))} />}
          {res.alistamiento_1 > 0 && <Row label="Alistamiento 1" value={fmt(Number(form.alistamiento_1))} />}
          {res.alistamiento_2 > 0 && <Row label="Alistamiento 2" value={fmt(Number(form.alistamiento_2))} />}

          <Row label="Total por viaje" value={fmt(res.total_por_viaje)} bold />

          <div className={`my-2 px-3 py-2 rounded-lg text-xs ${res.aplica_minimo ? 'bg-yellow-900/20 border border-yellow-800/30 text-yellow-400' : 'bg-navy-700/30 text-slate-500'}`}>
            Mínimo garantizado ({convenio.viajes_minimos} viajes × MOPRE): {fmt(res.total_minimo_viajes)}
            {res.aplica_minimo && ' ← se aplica este mínimo'}
          </div>

          <Row label="BRUTO FINAL" value={fmt(res.bruto_final)} bold accent="text-white" />

          <div className="mt-3 mb-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Descuentos</p>
            {convenio.porcentaje_obra_social > 0 && <Row label={`Obra social (${convenio.porcentaje_obra_social}%)`} value={`- ${fmt(res.descuento_obra_social)}`} muted accent="text-red-400" />}
            {convenio.porcentaje_ley_19032 > 0 && <Row label={`Ley 19032 (${convenio.porcentaje_ley_19032}%)`} value={`- ${fmt(res.descuento_ley_19032)}`} muted accent="text-red-400" />}
            {convenio.porcentaje_jubilacion > 0 && <Row label={`Jubilación (${convenio.porcentaje_jubilacion}%)`} value={`- ${fmt(res.descuento_jubilacion)}`} muted accent="text-red-400" />}
            {convenio.porcentaje_sindicato > 0 && <Row label={`Sindicato (${convenio.porcentaje_sindicato}%)`} value={`- ${fmt(res.descuento_sindicato)}`} muted accent="text-red-400" />}
            {(convenio.porcentaje_obra_social + convenio.porcentaje_ley_19032 + convenio.porcentaje_jubilacion + convenio.porcentaje_sindicato) === 0 && (
              <p className="text-xs text-slate-600 py-2">Configurá los porcentajes en el panel Admin para ver los descuentos.</p>
            )}
          </div>

          <Row label="NETO" value={fmt(res.neto)} bold accent="text-green-400" />
          {res.beneficios > 0 && <Row label="+ Beneficios" value={fmt(res.beneficios)} accent="text-green-400" />}
          {res.ganancias > 0 && <Row label="- Ganancias" value={`- ${fmt(res.ganancias)}`} accent="text-red-400" />}

          <div className="mt-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total a cobrar</p>
              <p className="text-3xl font-bold text-cyan-400 mt-1">{fmt(res.total_final)}</p>
            </div>
            <button onClick={handleGuardar}
              className={`btn-primary flex items-center gap-2 ${guardado ? 'bg-green-500 hover:bg-green-400' : ''}`}>
              <Save size={15} /> {guardado ? '¡Guardado!' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="card">
        <button onClick={() => setVerHistorial(v => !v)}
          className="w-full flex items-center justify-between text-sm font-semibold text-white">
          <span>Liquidaciones guardadas ({liquidaciones.length})</span>
          {verHistorial ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {verHistorial && (
          <div className="mt-4 space-y-3">
            {liquidaciones.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">No hay liquidaciones guardadas.</p>
            )}
            {liquidaciones.map(liq => (
              <div key={liq.id} className="bg-navy-700/50 border border-navy-600 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-slate-500">{fmtFecha(liq.fecha_calculo)}</p>
                    <p className="text-white font-semibold text-lg">{fmt(liq.total_final)}</p>
                  </div>
                  <button onClick={() => eliminarLiquidacion(liq.id)} className="btn-danger p-1.5">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                  <span>U$S {liq.precio_usd} / kg</span>
                  <span>{liq.cajones} cajones</span>
                  <span>Bruto: {fmt(liq.bruto_final)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
