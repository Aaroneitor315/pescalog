import { useState, useMemo, useEffect, Fragment } from 'react'
import { Calculator, Save, Trash2, ChevronDown, ChevronUp, Settings, Lock, Plus, X, Printer, AlertTriangle } from 'lucide-react'
import maquinista from '../lib/liquidaciones/maquinista.js'
import { UMBRAL_KG_SOSPECHOSO } from '../lib/liquidaciones/maquinista.js'
import { useLiquidaciones } from '../hooks/useLiquidaciones'
import { useTarifasMaquinas } from '../hooks/useTarifasMaquinas'
import { agruparEmbarcos } from '../lib/embarcos.js'
import { montoEnLetras } from '../lib/enLetras.js'

function fmtARS(n) {
  if (n == null || n === 0) return ''
  const abs = Math.abs(n)
  const txt = abs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `-$ ${txt}` : `$ ${txt}`
}
function fmtARS0(n) {
  if (n == null) return '—'
  const abs = Math.abs(n)
  const txt = abs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `-$ ${txt}` : `$ ${txt}`
}
function fmtFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function periodoDePago(iso) {
  if (!iso) return ''
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

// ── Recibo imprimible: abre una ventana con HTML autocontenido y dispara print ──
function imprimirRecibo(cab, res) {
  const filasHTML = res.secciones.map(sec => {
    const enc = `<tr class="sec"><td colspan="5">${sec.titulo}</td></tr>`
    const filas = sec.filas.map(f => `
      <tr>
        <td>${f.concepto}</td>
        <td class="u">${f.unidad || ''}</td>
        <td class="n">${f.col === 'rem' ? fmtARS(f.valor) : ''}</td>
        <td class="n">${f.col === 'nr' ? fmtARS(f.valor) : ''}</td>
        <td class="n">${f.col === 'desc' ? fmtARS(f.valor) : ''}</td>
      </tr>`).join('')
    const st = `<tr class="tot">
        <td colspan="2">${sec.subtotal.label}</td>
        <td class="n">${sec.col === 'rem' ? fmtARS(sec.subtotal.valor) : ''}</td>
        <td class="n">${sec.col === 'nr' ? fmtARS(sec.subtotal.valor) : ''}</td>
        <td class="n">${sec.col === 'desc' ? fmtARS(sec.subtotal.valor) : ''}</td>
      </tr>`
    return enc + filas + st
  }).join('')

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <title>Recibo — ${cab.nombre || 'Liquidación Máquinas'}</title>
  <style>
    *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}
    body{margin:24px;color:#111;font-size:12px}
    h1{font-size:15px;margin:0}
    .sub{color:#555;font-size:12px;margin:2px 0 0}
    .head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:6px}
    .meta{text-align:right;font-size:11px;color:#333;line-height:1.5}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{font-size:10px;color:#555;text-align:left;border-bottom:1px solid #999;padding:5px 4px}
    th.n,td.n{text-align:right;font-variant-numeric:tabular-nums}
    td{padding:4px}
    td.u{color:#666;font-size:11px}
    tr.sec td{font-weight:bold;text-transform:uppercase;font-size:10px;letter-spacing:.05em;color:#0e5f73;padding-top:10px;border-bottom:1px solid #ccc}
    tr.tot td{font-weight:bold;border-top:1px solid #999;padding-top:6px}
    .bruto{display:flex;justify-content:space-between;border-top:2px solid #111;margin-top:10px;padding-top:8px;font-weight:bold}
    .neto{display:flex;justify-content:space-between;margin-top:10px;padding:12px 14px;background:#e8f7fb;border:1px solid #0e5f73;border-radius:8px}
    .neto b{font-size:18px}
    .letras{font-style:italic;color:#555;margin-top:8px;font-size:11px}
  </style></head><body>
    <div class="head">
      <div>
        <h1>${cab.nombre || '—'}</h1>
        <p class="sub">${cab.categoria || ''} · Liquidación Máquinas</p>
        <p class="sub">DNI ${cab.dni || '—'} · CUIL ${cab.cuil || '—'}</p>
      </div>
      <div class="meta">
        Barco ${cab.barco || '—'}${cab.matricula ? ' (' + cab.matricula + ')' : ''}<br>
        ${cab.periodoLabel || ''}<br>
        ${cab.dias || 0} días · ${cab.viajes || 0} viajes<br>
        Emitido ${fmtFecha(cab.fecha)}
      </div>
    </div>
    <table>
      <thead><tr><th>Concepto</th><th>Unid.</th><th class="n">Remunerativo</th><th class="n">No Remunerativo</th><th class="n">Descuentos</th></tr></thead>
      <tbody>${filasHTML}</tbody>
    </table>
    <div class="bruto"><span>Sueldo Bruto</span><span>${fmtARS0(res.totalBruto)}</span></div>
    <div class="neto"><span>Neto a Cobrar</span><b>${fmtARS0(res.neto)}</b></div>
    <p class="letras">Son pesos: ${montoEnLetras(res.neto)}</p>
  </body></html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
}

// ── Editor de tarifas: editable solo para admin, solo lectura para el resto ──
const GRUPOS_TARIFAS = [
  { titulo: 'Captura', campos: [
    { campo: 'TARIFA_CAPTURA', label: 'Tarifa por kg', step: '0.01' },
    { campo: 'PCT_CAPTURA_REM', label: '% Remunerativo', step: '1' },
    { campo: 'PCT_CAPTURA_NR', label: '% No remunerativo', step: '1' },
  ]},
  { titulo: 'Remunerativos por viaje', campos: [
    { campo: 'ALISTAMIENTO', label: 'Alistamiento (×viaje)', step: '0.01' },
    { campo: 'TAREAS_ESPECIFICAS', label: 'Tareas específicas (×viaje)', step: '0.01' },
  ]},
  { titulo: 'Remunerativos MAQ.F (fijos)', campos: [
    { campo: 'ALISTAMIENTO_MAQF', label: 'Alistamiento MAQ.F', step: '0.01' },
    { campo: 'TAREAS_ESPECIFICAS_MAQF', label: 'Tareas esp. MAQ.F', step: '0.01' },
  ]},
  { titulo: 'No remunerativos', campos: [
    { campo: 'ACUERDO_NR', label: 'Acuerdo NR', step: '0.01' },
    { campo: 'PCT_ROPA_AGUA', label: '% Ropa de agua', step: '0.1' },
    { campo: 'VIATICOS', label: 'Viáticos (×viaje)', step: '0.01' },
    { campo: 'MANUTENCION_DIA', label: 'Manutención / día', step: '0.01' },
  ]},
  { titulo: 'Aportes y descuentos', campos: [
    { campo: 'PCT_JUBILACION', label: '% Jubilación', step: '0.1' },
    { campo: 'PCT_INSSJP', label: '% INSSJP', step: '0.1' },
    { campo: 'PCT_OBRA_SOCIAL', label: '% Obra Social', step: '0.1' },
    { campo: 'TOPE_BASE_APORTES', label: 'Tope base de aportes', step: '0.01' },
    { campo: 'PCT_APORTE_SINDICAL', label: '% Aporte Sindical (120.05)', step: '0.1' },
    { campo: 'PCT_APORTE_SINDICAL_ACUERDOS', label: '% Aporte Sindical Acuerdos', step: '0.1' },
    { campo: 'PCT_GANANCIAS', label: '% Ganancias (0 = manual)', step: '0.1' },
  ]},
]

function PanelTarifas({ tarifas, esAdmin, guardarTarifas }) {
  const [edit, setEdit] = useState(null)
  const [guardado, setGuardado] = useState(false)
  const t = edit || tarifas

  function set(campo, valor) {
    setEdit(prev => ({ ...(prev || tarifas), [campo]: valor }))
    setGuardado(false)
  }
  async function handleGuardar() {
    await guardarTarifas(edit)
    setEdit(null)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  return (
    <div className="card sticky top-24 space-y-4">
      <div className="flex items-center gap-2">
        {esAdmin ? <Settings size={15} className="text-cyan-400" /> : <Lock size={15} className="text-slate-500" />}
        <h3 className="text-sm font-semibold text-white">Tarifas Máquinas</h3>
      </div>
      {!esAdmin && (
        <p className="text-xs text-slate-500 bg-navy-700/40 border border-navy-600 rounded-lg px-2 py-1.5">
          Valores del convenio — solo lectura. Los edita el administrador.
        </p>
      )}

      {GRUPOS_TARIFAS.map(g => (
        <div key={g.titulo} className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider">{g.titulo}</p>
          {g.campos.map(c => (
            <div key={c.campo} className="flex items-center justify-between gap-2">
              <label className="text-xs text-slate-400">{c.label}</label>
              {esAdmin ? (
                <input type="number" min="0" step={c.step}
                  className="text-sm py-1 w-32 text-right"
                  value={t[c.campo] ?? ''}
                  onChange={e => set(c.campo, e.target.value)} />
              ) : (
                <span className="text-sm text-slate-300 font-mono">{Number(t[c.campo] ?? 0).toLocaleString('es-AR')}</span>
              )}
            </div>
          ))}
        </div>
      ))}

      {esAdmin && (
        <button onClick={handleGuardar} disabled={!edit}
          className={`btn-primary w-full flex items-center justify-center gap-2 ${guardado ? 'bg-green-500' : ''} ${!edit ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <Save size={14} /> {guardado ? '¡Guardado!' : 'Guardar tarifas'}
        </button>
      )}
      <p className="text-xs text-slate-600 border-t border-navy-700 pt-3">
        Vigente desde: {tarifas.fecha_vigencia_desde || '—'}
      </p>
    </div>
  )
}

// ── Fila del recibo en pantalla ──
function FilaRecibo({ f }) {
  const cell = (col) => f.col === col
    ? <span className={`font-mono ${f.negativo ? 'text-red-400' : 'text-slate-200'}`}>{fmtARS(f.valor)}</span>
    : null
  return (
    <tr className="border-b border-navy-700/40">
      <td className="py-1.5 text-slate-300">{f.concepto}</td>
      <td className="py-1.5 text-slate-500 text-xs">{f.unidad}</td>
      <td className="py-1.5 text-right text-sm">{cell('rem')}</td>
      <td className="py-1.5 text-right text-sm">{cell('nr')}</td>
      <td className="py-1.5 text-right text-sm">{cell('desc')}</td>
    </tr>
  )
}

export default function Calculadora({ uid, viajes = [], libreta = {}, perfil = {}, esAdmin = false }) {
  const { liquidaciones, guardarLiquidacion, eliminarLiquidacion } = useLiquidaciones(uid)
  const { tarifas, guardarTarifas } = useTarifasMaquinas()

  const periodos = useMemo(() => agruparEmbarcos(viajes), [viajes])

  const [periodoId, setPeriodoId] = useState('')
  const [entradas, setEntradas] = useState({ kgLangostino: '', cantViajes: '', diasMarea: '', ganancias: '' })
  const [anticipos, setAnticipos] = useState([])
  const [cab, setCab] = useState({
    nombre: libreta.nombre || '', categoria: perfil.rango || '',
    dni: libreta.dni || '', cuil: libreta.cuil || '',
    barco: '', matricula: '', periodoLabel: '', fecha: new Date().toISOString().slice(0, 10),
  })
  const [guardado, setGuardado] = useState(false)
  const [verHistorial, setVerHistorial] = useState(false)

  // Cabecera se sincroniza con el perfil/libreta cuando cargan
  useEffect(() => {
    setCab(c => ({ ...c, nombre: c.nombre || libreta.nombre || '', dni: c.dni || libreta.dni || '', cuil: c.cuil || libreta.cuil || '', categoria: c.categoria || perfil.rango || '' }))
  }, [libreta.nombre, libreta.dni, libreta.cuil, perfil.rango])

  function elegirPeriodo(id) {
    setPeriodoId(id)
    const p = periodos.find(x => x.id === id)
    if (!p) return
    setEntradas(e => ({ ...e, cantViajes: p.viajes.length, diasMarea: p.totalDiasEmbarcado || e.diasMarea }))
    setCab(c => ({
      ...c,
      barco: p.barco || c.barco,
      periodoLabel: periodoDePago(p.fechaDesembarco || p.fechaEmbarco),
    }))
  }

  function set(campo, valor) { setEntradas(e => ({ ...e, [campo]: valor })); setGuardado(false) }
  function setC(campo, valor) { setCab(c => ({ ...c, [campo]: valor })) }

  function addAnticipo() { setAnticipos(a => [...a, { concepto: 'Anticipo de sueldo', monto: '' }]) }
  function setAnticipo(i, campo, valor) { setAnticipos(a => a.map((x, j) => j === i ? { ...x, [campo]: valor } : x)) }
  function delAnticipo(i) { setAnticipos(a => a.filter((_, j) => j !== i)) }

  const kg = Number(entradas.kgLangostino) || 0
  const kgSospechoso = kg > UMBRAL_KG_SOSPECHOSO
  const hayDatos = kg > 0 && Number(entradas.cantViajes) > 0 && Number(entradas.diasMarea) > 0

  const res = useMemo(
    () => hayDatos ? maquinista.calcular({ ...entradas, anticipos }, tarifas) : null,
    [entradas, anticipos, tarifas, hayDatos]
  )

  async function handleGuardar() {
    if (!res) return
    await guardarLiquidacion({
      tipo: 'maquinista',
      cabecera: cab,
      entradas: { ...entradas, anticipos },
      tarifas_usadas: tarifas,
      ...res.valores,
      totalBruto: res.totalBruto,
      totalDeducciones: res.totalDeducciones,
      netoACobrar: res.neto,
    })
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  const cabConDatos = { ...cab, dias: entradas.diasMarea, viajes: entradas.cantViajes }
  const liqs = liquidaciones.filter(l => l.tipo === 'maquinista')

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="bg-cyan-500/10 border border-cyan-500/20 p-2 rounded-lg">
          <Calculator size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Liquidación Máquinas</h2>
          <p className="text-xs text-slate-500">Pesca de langostino</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">

          {/* Cabecera del recibo — tripulante + marea */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Tripulante y marea</h3>

            {periodos.length > 0 && (
              <div>
                <label>Período de embarco</label>
                <select value={periodoId} onChange={e => elegirPeriodo(e.target.value)}
                  className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-200">
                  <option value="">— Elegir período (autocompleta barco, días y viajes) —</option>
                  {periodos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.barco || 'Sin barco'} · {fmtFecha(p.fechaEmbarco)}→{fmtFecha(p.fechaDesembarco) === '—' ? 'en curso' : fmtFecha(p.fechaDesembarco)} · {p.viajes.length} viajes
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><label>Nombre y apellido</label>
                <input value={cab.nombre} onChange={e => setC('nombre', e.target.value)} placeholder="Sin completar en la libreta" /></div>
              <div><label>Categoría</label>
                <input value={cab.categoria} onChange={e => setC('categoria', e.target.value)} placeholder="Jefe de máquinas" /></div>
              <div><label>DNI</label>
                <input value={cab.dni} onChange={e => setC('dni', e.target.value)} /></div>
              <div><label>CUIL</label>
                <input value={cab.cuil} onChange={e => setC('cuil', e.target.value)} /></div>
              <div><label>Barco</label>
                <input value={cab.barco} onChange={e => setC('barco', e.target.value)} /></div>
              <div><label>Matrícula <span className="text-slate-600 text-xs">(a mano)</span></label>
                <input value={cab.matricula} onChange={e => setC('matricula', e.target.value)} placeholder="Ej: HF827" /></div>
            </div>
          </div>

          {/* Datos de cálculo */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Datos de la liquidación</h3>
            <div className="grid grid-cols-3 gap-3">
              <div><label>Kg producidos</label>
                <input type="number" min="0" step="0.01" placeholder="9679.14"
                  value={entradas.kgLangostino} onChange={e => set('kgLangostino', e.target.value)} /></div>
              <div><label>Cant. viajes</label>
                <input type="number" min="0" step="1" placeholder="4"
                  value={entradas.cantViajes} onChange={e => set('cantViajes', e.target.value)} /></div>
              <div><label>Días de marea</label>
                <input type="number" min="0" step="1" placeholder="29"
                  value={entradas.diasMarea} onChange={e => set('diasMarea', e.target.value)} /></div>
            </div>

            {kgSospechoso && (
              <div className="flex items-start gap-2 text-xs text-yellow-300 bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                <span>¿Ingresaste pesos en vez de kilos? La captura va en <b>Kg producidos</b> (ej. ~9.679 kg), no el monto en pesos.</span>
              </div>
            )}

            <div>
              <label>Impuesto a las Ganancias <span className="text-slate-600 text-xs">(monto en $)</span></label>
              <input type="number" min="0" step="0.01" placeholder="0,00"
                value={entradas.ganancias} onChange={e => set('ganancias', e.target.value)} />
            </div>

            {/* Anticipos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="!mb-0">Anticipos ya cobrados</label>
                <button onClick={addAnticipo} className="text-xs text-cyan-400 flex items-center gap-1 hover:text-cyan-300">
                  <Plus size={13} /> Agregar
                </button>
              </div>
              {anticipos.length === 0 && <p className="text-xs text-slate-600">Sin anticipos cargados.</p>}
              {anticipos.map((a, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="flex-1 text-sm py-1.5" placeholder="Concepto"
                    value={a.concepto} onChange={e => setAnticipo(i, 'concepto', e.target.value)} />
                  <input type="number" min="0" step="0.01" className="w-32 text-sm py-1.5 text-right" placeholder="0,00"
                    value={a.monto} onChange={e => setAnticipo(i, 'monto', e.target.value)} />
                  <button onClick={() => delAnticipo(i)} className="text-slate-500 hover:text-red-400"><X size={15} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Recibo */}
          {res && (
            <div className="card">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-white font-semibold">{cab.nombre || <span className="text-slate-600 italic text-sm">Sin nombre</span>}</p>
                  <p className="text-xs text-slate-500">{cab.categoria || '—'} · {cab.barco || 'sin barco'}{cab.matricula ? ` (${cab.matricula})` : ''}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {cab.periodoLabel && <div className="capitalize">{cab.periodoLabel}</div>}
                  <div>{entradas.diasMarea || 0} días · {entradas.cantViajes || 0} viajes</div>
                </div>
              </div>

              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-sm" style={{ minWidth: 480 }}>
                  <thead>
                    <tr className="text-slate-500 text-xs border-b border-navy-600">
                      <th className="text-left font-medium py-1.5">Concepto</th>
                      <th className="text-left font-medium py-1.5">Unid.</th>
                      <th className="text-right font-medium py-1.5">Remun.</th>
                      <th className="text-right font-medium py-1.5">No remun.</th>
                      <th className="text-right font-medium py-1.5">Descuentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {res.secciones.map(sec => (
                      <Fragment key={sec.id}>
                        <tr className="border-b border-navy-700/40">
                          <td colSpan={5} className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-cyan-400/80">{sec.titulo}</td>
                        </tr>
                        {sec.filas.map((f, i) => <FilaRecibo key={sec.id + i} f={f} />)}
                        <tr className="border-t border-navy-600 font-semibold">
                          <td colSpan={2} className="py-1.5 text-slate-200">{sec.subtotal.label}</td>
                          <td className="py-1.5 text-right font-mono text-cyan-300">{sec.col === 'rem' ? fmtARS(sec.subtotal.valor) : ''}</td>
                          <td className="py-1.5 text-right font-mono text-cyan-300">{sec.col === 'nr' ? fmtARS(sec.subtotal.valor) : ''}</td>
                          <td className="py-1.5 text-right font-mono text-red-300">{sec.col === 'desc' ? fmtARS(sec.subtotal.valor) : ''}</td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center mt-4 pt-3 border-t border-navy-600">
                <span className="text-slate-400 text-sm">Sueldo Bruto</span>
                <span className="font-semibold font-mono text-white">{fmtARS0(res.totalBruto)}</span>
              </div>

              <div className="mt-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Neto a Cobrar</p>
                  <p className="text-3xl font-bold text-cyan-400 mt-1">{fmtARS0(res.neto)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={handleGuardar}
                    className={`btn-primary flex items-center gap-2 ${guardado ? 'bg-green-500 hover:bg-green-400' : ''}`}>
                    <Save size={15} /> {guardado ? '¡Guardado!' : 'Guardar'}
                  </button>
                  <button onClick={() => imprimirRecibo(cabConDatos, res)}
                    className="flex items-center gap-2 justify-center border border-navy-600 rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-navy-700">
                    <Printer size={15} /> Imprimir / PDF
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500 italic mt-3">Son pesos: {montoEnLetras(res.neto)}</p>
            </div>
          )}

          {/* Historial */}
          <div className="card">
            <button onClick={() => setVerHistorial(v => !v)}
              className="w-full flex items-center justify-between text-sm font-semibold text-white">
              <span>Liquidaciones guardadas ({liqs.length})</span>
              {verHistorial ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {verHistorial && (
              <div className="mt-4 space-y-3">
                {liqs.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No hay liquidaciones guardadas.</p>}
                {liqs.map(liq => (
                  <div key={liq.id} className="bg-navy-700/50 border border-navy-600 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs text-slate-500">{fmtFecha(liq.fecha_calculo)}{liq.cabecera?.nombre ? ` · ${liq.cabecera.nombre}` : ''}</p>
                        <p className="text-white font-semibold text-lg">{fmtARS0(liq.netoACobrar)}</p>
                      </div>
                      <button onClick={() => eliminarLiquidacion(liq.id)} className="btn-danger p-1.5"><Trash2 size={13} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <span>{maquinista.resumen(liq.entradas || liq)}</span>
                      <span className="text-right">Bruto: {fmtARS0(liq.totalBruto)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tarifas (config admin) */}
        <div className="lg:col-span-1">
          <PanelTarifas tarifas={tarifas} esAdmin={esAdmin} guardarTarifas={guardarTarifas} />
        </div>
      </div>
    </div>
  )
}
