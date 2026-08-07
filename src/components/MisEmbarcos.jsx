import { useState, useMemo } from 'react'
import { Anchor, FileText, Ship, Calendar, AlertCircle, X, Download, Loader, CheckCircle } from 'lucide-react'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { agruparEmbarcos, validarPeriodo } from '../lib/embarcos'
import { generarPlanillaPeriodo, exportarPlanilla } from '../lib/planillaPdf'

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
  const [estado, setEstado] = useState('idle') // idle | generando | ok | error
  const [mensaje, setMensaje] = useState('')

  const validacion = validarPeriodo(periodo)

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
      const resultado = await exportarPlanilla({ bytes, nombreArchivo })

      setEstado('ok')
      setMensaje(
        (resultado === 'compartido' ? 'Planilla compartida.' :
         resultado === 'cancelado' ? 'Compartir cancelado; el PDF quedó listo.' :
         'Planilla descargada.') +
        (overlay ? '' : ' (Layout preliminar — falta la plantilla oficial en public/planilla-refocapemm.pdf)')
      )
    } catch (e) {
      setEstado('error')
      setMensaje('No se pudo generar el PDF: ' + (e?.message || 'error desconocido'))
    }
  }

  const total = modo === 'dias' ? periodo.totalDiasEmbarcado : periodo.totalSingladuras

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onCerrar}>
      <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700">
          <div className="flex items-center gap-2">
            <FileText size={17} className="text-cyan-400" />
            <h3 className="text-white font-semibold text-sm">Generar planilla de singladuras</h3>
          </div>
          <button onClick={onCerrar} className="btn-ghost p-1.5 rounded-lg"><X size={16} /></button>
        </div>

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

              {/* Preview de viajes */}
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

          {/* Mensaje de resultado */}
          {mensaje && (
            <div className={`rounded-xl p-3 text-xs flex items-start gap-2 ${
              estado === 'error' ? 'bg-red-900/20 border border-red-800/30 text-red-400'
                                 : 'bg-green-900/20 border border-green-800/30 text-green-400'
            }`}>
              {estado === 'error' ? <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                  : <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />}
              <span>{mensaje}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-navy-700">
          <button onClick={() => generar(false)} disabled={!validacion.ok || estado === 'generando'}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-40">
            {estado === 'generando'
              ? <><Loader size={15} className="animate-spin" /> Generando...</>
              : <><Download size={15} /> Generar y descargar PDF</>}
          </button>
          {validacion.ok && (
            <button onClick={() => generar(true)} disabled={estado === 'generando'}
              className="w-full text-center text-[11px] text-slate-600 hover:text-cyan-400 transition-colors mt-2">
              Descargar grilla de calibración (ajuste de coordenadas)
            </button>
          )}
        </div>
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
