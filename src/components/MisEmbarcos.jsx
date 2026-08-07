import { useState, useMemo, useEffect } from 'react'
import { Anchor, FileText, Ship, Calendar, AlertCircle, X, Download, Loader, CheckCircle, Share2, ArrowLeft } from 'lucide-react'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { agruparEmbarcos, validarPeriodo } from '../lib/embarcos'
import { generarPlanillaPeriodo, descargarPlanilla, compartirPlanilla, puedeCompartirArchivos } from '../lib/planillaPdf'

function fmtFecha(iso) {
  if (!iso) return '—'
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso)
}

function slug(s) {
  return (s || 'barco').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ─── Modal de generación de planilla ────────────────────────────────────────
function ModalPlanilla({ periodo, uid, libreta, perfil, onCerrar }) {
  const [modo, setModo] = useState('singladuras')
  const [paso, setPaso] = useState('config')   // config | preview
  const [estado, setEstado] = useState('idle')  // idle | generando | error
  const [mensaje, setMensaje] = useState('')
  // Resultado generado: bytes, blob URL para el preview, nombre, overlay
  const [pdf, setPdf] = useState(null)

  const validacion = validarPeriodo(periodo)
  const puedeCompartir = puedeCompartirArchivos()

  // Liberar el blob URL al desmontar o al regenerar
  useEffect(() => () => { if (pdf?.url) URL.revokeObjectURL(pdf.url) }, [pdf])

  async function generar(debugGrid = false) {
    if (!validacion.ok) return
    setEstado('generando')
    setMensaje('')
    try {
      // Ficha de motor (solo aporta potencia KW; puede no existir)
      let fichaMotor = null
      try {
        const snap = await getDoc(doc(db, 'usuarios', uid, 'fichas', 'maquinas'))
        if (snap.exists()) fichaMotor = snap.data()
      } catch { /* sin ficha, se deja en blanco */ }

      const { bytes, overlay } = await generarPlanillaPeriodo({ periodo, libreta, perfil, fichaMotor, modo, debugGrid })
      const sufijo = debugGrid ? '-CALIBRACION' : ''
      const nombreArchivo = `planilla-${slug(periodo.barco)}-${periodo.fechaEmbarco || 'periodo'}${sufijo}.pdf`
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))

      setPdf({ bytes, url, nombreArchivo, overlay, debugGrid })
      setEstado('idle')
      setPaso('preview')
    } catch (e) {
      setEstado('error')
      setMensaje('No se pudo generar el PDF: ' + (e?.message || 'error desconocido'))
    }
  }

  function volverAConfig() {
    if (pdf?.url) URL.revokeObjectURL(pdf.url)
    setPdf(null)
    setMensaje('')
    setPaso('config')
  }

  function handleDescargar() {
    if (!pdf) return
    descargarPlanilla({ bytes: pdf.bytes, nombreArchivo: pdf.nombreArchivo })
    setMensaje('Planilla descargada.')
  }

  async function handleCompartir() {
    if (!pdf) return
    const r = await compartirPlanilla({ bytes: pdf.bytes, nombreArchivo: pdf.nombreArchivo })
    setMensaje(
      r === 'compartido' ? 'Planilla compartida.' :
      r === 'cancelado' ? 'Compartir cancelado; podés descargarla.' :
      r === 'no-soportado' ? 'Este dispositivo no permite compartir; usá Descargar.' :
      'No se pudo compartir; usá Descargar.'
    )
  }

  const total = modo === 'dias' ? periodo.totalDiasEmbarcado : periodo.totalSingladuras

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onCerrar}>
      <div className={`bg-navy-800 border border-navy-600 rounded-2xl w-full shadow-xl flex flex-col max-h-[90vh] ${paso === 'preview' ? 'max-w-2xl' : 'max-w-md'}`}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700">
          <div className="flex items-center gap-2">
            {paso === 'preview' && (
              <button onClick={volverAConfig} className="btn-ghost p-1 rounded-lg mr-1"><ArrowLeft size={16} /></button>
            )}
            <FileText size={17} className="text-cyan-400" />
            <h3 className="text-white font-semibold text-sm">
              {paso === 'preview' ? 'Vista previa de la planilla' : 'Generar planilla de singladuras'}
            </h3>
          </div>
          <button onClick={onCerrar} className="btn-ghost p-1.5 rounded-lg"><X size={16} /></button>
        </div>

        {/* ===== PASO CONFIG ===== */}
        {paso === 'config' && (
          <>
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {/* Datos del período */}
              <div className="bg-navy-900 rounded-xl p-3 border border-navy-700">
                <div className="flex items-center gap-2 mb-1.5">
                  <Ship size={14} className="text-cyan-400" />
                  <span className="text-sm font-bold text-white">{periodo.barco || '(sin nombre)'}</span>
                </div>
                <p className="text-xs text-slate-400">
                  {fmtFecha(periodo.fechaEmbarco)} → {fmtFecha(periodo.fechaDesembarco)} · {periodo.viajes.length} viaje{periodo.viajes.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Errores de validación */}
              {!validacion.ok && (
                <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-xl p-3 space-y-1">
                  {validacion.errores.map((e, i) => (
                    <p key={i} className="text-xs text-yellow-400 flex items-start gap-1.5">
                      <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> {e}
                    </p>
                  ))}
                </div>
              )}

              {/* Selector de modo */}
              {validacion.ok && (
                <>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Columna de cómputo</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'singladuras', label: 'Singladuras', sub: 'Suma por viajes' },
                        { id: 'dias', label: 'Días embarcado', sub: 'Período completo' },
                      ].map(op => (
                        <button key={op.id} onClick={() => setModo(op.id)}
                          className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                            modo === op.id
                              ? 'bg-cyan-500/15 border-cyan-500/50'
                              : 'bg-navy-900 border-navy-700 hover:border-navy-600'
                          }`}>
                          <p className={`text-sm font-semibold ${modo === op.id ? 'text-cyan-400' : 'text-slate-300'}`}>{op.label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{op.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lista de viajes */}
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">
                      Viajes incluidos ({periodo.viajes.length})
                    </p>
                    <div className="border border-navy-700 rounded-xl divide-y divide-navy-700 max-h-48 overflow-y-auto">
                      {periodo.viajes.map((v, i) => (
                        <div key={v.id || i} className="flex items-center justify-between px-3 py-2 text-xs">
                          <span className="text-slate-300">
                            {fmtFecha(v.fechaSalida)} → {fmtFecha(v.fechaRegreso)}
                          </span>
                          <span className="text-slate-500 truncate max-w-[120px]">
                            {[v.puertoPartida, v.puertoLlegada].filter(Boolean).join(' → ') || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-2 px-1">
                      <span className="text-xs text-slate-500">TOTAL {modo === 'dias' ? 'días embarcado' : 'singladuras'}</span>
                      <span className="text-lg font-bold text-cyan-400">{total}</span>
                    </div>
                  </div>
                </>
              )}

              {estado === 'error' && mensaje && (
                <div className="rounded-xl p-3 text-xs flex items-start gap-2 bg-red-900/20 border border-red-800/30 text-red-400">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /><span>{mensaje}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-navy-700">
              <button onClick={() => generar(false)} disabled={!validacion.ok || estado === 'generando'}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-40">
                {estado === 'generando'
                  ? <><Loader size={15} className="animate-spin" /> Generando...</>
                  : <><FileText size={15} /> Ver vista previa</>}
              </button>
              {validacion.ok && (
                <button onClick={() => generar(true)} disabled={estado === 'generando'}
                  className="w-full text-center text-[11px] text-slate-600 hover:text-cyan-400 transition-colors mt-2">
                  Generar grilla de calibración (ajuste de coordenadas)
                </button>
              )}
            </div>
          </>
        )}

        {/* ===== PASO PREVIEW ===== */}
        {paso === 'preview' && pdf && (
          <>
            <div className="flex-1 overflow-hidden px-5 py-4 flex flex-col gap-3 min-h-0">
              {!pdf.overlay && (
                <div className="rounded-lg px-3 py-2 text-[11px] bg-yellow-900/20 border border-yellow-800/30 text-yellow-400">
                  Layout preliminar — falta la plantilla oficial en public/planilla-refocapemm.pdf
                </div>
              )}
              {pdf.debugGrid && (
                <div className="rounded-lg px-3 py-2 text-[11px] bg-cyan-900/20 border border-cyan-800/30 text-cyan-400">
                  Grilla de calibración: cada línea son coordenadas (x,y) para ajustar COORDS.
                </div>
              )}
              <iframe
                title="Vista previa planilla"
                src={pdf.url}
                className="w-full flex-1 rounded-lg border border-navy-600 bg-white"
                style={{ minHeight: '55vh' }}
              />
              {mensaje && (
                <div className="rounded-xl p-2.5 text-xs flex items-start gap-2 bg-green-900/20 border border-green-800/30 text-green-400">
                  <CheckCircle size={14} className="flex-shrink-0 mt-0.5" /><span>{mensaje}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-navy-700 flex gap-2">
              <button onClick={handleDescargar}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5">
                <Download size={15} /> Descargar
              </button>
              {puedeCompartir && (
                <button onClick={handleCompartir}
                  className="btn-ghost flex items-center justify-center gap-2 py-2.5 px-4 border border-navy-600 rounded-lg">
                  <Share2 size={15} /> Compartir
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Vista principal: Mis embarcos ──────────────────────────────────────────
export default function MisEmbarcos({ uid, viajes, libreta, perfil }) {
  const periodos = useMemo(() => agruparEmbarcos(viajes), [viajes])
  const [periodoSel, setPeriodoSel] = useState(null)

  // Agrupar por barco para la vista
  const porBarco = useMemo(() => {
    const map = new Map()
    periodos.forEach(p => {
      const k = p.barco || '(sin nombre)'
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(p)
    })
    return [...map.entries()]
  }, [periodos])

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="bg-cyan-500/10 border border-cyan-500/20 p-2 rounded-lg">
          <Anchor size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Mis embarcos</h2>
          <p className="text-xs text-slate-500">Planilla de singladuras · Armada Argentina (REFOCAPEMM)</p>
        </div>
      </div>

      {periodos.length === 0 ? (
        <div className="card text-center py-12 text-slate-500 text-sm">
          Todavía no hay períodos de embarco.<br />
          Cargá viajes con fecha de embarco para verlos acá.
        </div>
      ) : (
        porBarco.map(([barco, lista]) => (
          <div key={barco} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Ship size={15} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-300">{barco}</h3>
              <span className="text-xs text-slate-600">· {lista.length} período{lista.length !== 1 ? 's' : ''}</span>
            </div>

            {lista.map(p => (
              <div key={p.id} className="card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Calendar size={13} className="text-cyan-500/70 flex-shrink-0" />
                    <span className="text-sm text-white font-medium">
                      {fmtFecha(p.fechaEmbarco)} → {p.cerrado ? fmtFecha(p.fechaDesembarco) : 'abierto'}
                    </span>
                    {p.cerrado ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">Cerrado</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">Abierto</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {p.viajes.length} viaje{p.viajes.length !== 1 ? 's' : ''}
                    {p.cerrado && ` · ${p.totalSingladuras} singladuras · ${p.totalDiasEmbarcado} días embarcado`}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {p.cerrado ? (
                    <button onClick={() => setPeriodoSel(p)}
                      className="btn-primary flex items-center gap-2 text-sm py-2 px-3">
                      <FileText size={14} /> Generar planilla
                    </button>
                  ) : (
                    <div className="text-right">
                      <button disabled
                        className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg bg-navy-700/50 text-slate-600 cursor-not-allowed border border-navy-700">
                        <FileText size={14} /> Generar planilla
                      </button>
                      <p className="text-[10px] text-slate-600 mt-1 max-w-[160px]">Cargá la fecha de desembarco para generar la planilla</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {periodoSel && (
        <ModalPlanilla periodo={periodoSel} uid={uid} libreta={libreta} perfil={perfil}
          onCerrar={() => setPeriodoSel(null)} />
      )}
    </div>
  )
}
