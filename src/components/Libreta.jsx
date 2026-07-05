import { useState } from 'react'
import { BookOpen, User, FileText, AlertTriangle, CheckCircle, XCircle, Plus, Trash2, Save, Edit2 } from 'lucide-react'

function getEstado(vencimiento) {
  if (!vencimiento) return null
  const hoy = new Date()
  const venc = new Date(vencimiento)
  const diasRestantes = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24))
  if (diasRestantes < 0) return { tipo: 'vencido', dias: Math.abs(diasRestantes), label: 'Vencido', color: 'text-red-400', bg: 'bg-red-900/20 border-red-800/40', icon: XCircle }
  if (diasRestantes <= 60) return { tipo: 'proximo', dias: diasRestantes, label: `Vence en ${diasRestantes}d`, color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800/40', icon: AlertTriangle }
  return { tipo: 'vigente', dias: diasRestantes, label: 'Vigente', color: 'text-green-400', bg: 'bg-green-900/20 border-green-800/40', icon: CheckCircle }
}

function fmtFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function Libreta({ libreta, actualizarPerfil, actualizarDocumento, agregarDocumento, eliminarDocumento }) {
  const [editandoPerfil, setEditandoPerfil] = useState(!libreta.nombre)
  const [perfil, setPerfil] = useState({ nombre: libreta.nombre, dni: libreta.dni, cuil: libreta.cuil, nroLibreta: libreta.nroLibreta })
  const [guardadoPerfil, setGuardadoPerfil] = useState(false)

  const alertas = libreta.documentos.filter(d => {
    const est = getEstado(d.vencimiento)
    return est && (est.tipo === 'vencido' || est.tipo === 'proximo')
  })

  function guardarPerfil() {
    actualizarPerfil(perfil)
    setEditandoPerfil(false)
    setGuardadoPerfil(true)
    setTimeout(() => setGuardadoPerfil(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header libreta */}
      <div className="card border-2 border-cyan-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-600" />
        <div className="flex items-start justify-between mt-2">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/10 border border-cyan-500/20 p-3 rounded-xl">
              <BookOpen size={28} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">República Argentina</p>
              <h2 className="text-xl font-bold text-white">Libreta de Embarque</h2>
              <p className="text-xs text-slate-500">Prefectura Naval Argentina</p>
            </div>
          </div>
          <button
            onClick={() => setEditandoPerfil(e => !e)}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <Edit2 size={14} /> {editandoPerfil ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        <div className="mt-6 border-t border-navy-700 pt-5">
          {editandoPerfil ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label>Nombre completo</label>
                  <input type="text" placeholder="Ej: Juan Pérez"
                    value={perfil.nombre} onChange={e => setPerfil(p => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div>
                  <label>DNI</label>
                  <input type="text" placeholder="Ej: 38.123.456"
                    value={perfil.dni} onChange={e => setPerfil(p => ({ ...p, dni: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label>CUIL</label>
                  <input type="text" placeholder="Ej: 20-12345678-9"
                    value={perfil.cuil} onChange={e => setPerfil(p => ({ ...p, cuil: e.target.value }))} />
                </div>
                <div>
                  <label>N° de libreta de embarque</label>
                  <input type="text" placeholder="Ej: 00123456"
                    value={perfil.nroLibreta} onChange={e => setPerfil(p => ({ ...p, nroLibreta: e.target.value }))} />
                </div>
              </div>
              <button onClick={guardarPerfil} className={`btn-primary flex items-center gap-2 ${guardadoPerfil ? 'bg-green-500 hover:bg-green-400' : ''}`}>
                <Save size={15} /> {guardadoPerfil ? '¡Guardado!' : 'Guardar datos'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Titular</p>
                <p className="text-white font-semibold">{libreta.nombre || <span className="text-slate-600 italic text-sm">Sin completar</span>}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">DNI</p>
                <p className="text-slate-300 font-mono">{libreta.dni || <span className="text-slate-600 italic font-sans">—</span>}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">CUIL</p>
                <p className="text-slate-300 font-mono">{libreta.cuil || <span className="text-slate-600 italic font-sans">—</span>}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">N° libreta</p>
                <p className="text-cyan-400 font-mono font-semibold">{libreta.nroLibreta || <span className="text-slate-600 italic font-sans font-normal">—</span>}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map(d => {
            const est = getEstado(d.vencimiento)
            const Icon = est.icon
            return (
              <div key={d.id} className={`flex items-center gap-3 border rounded-lg px-4 py-3 ${est.bg}`}>
                <Icon size={16} className={est.color} />
                <span className={`text-sm font-medium ${est.color}`}>
                  {est.tipo === 'vencido'
                    ? `${d.nombre} venció hace ${est.dias} días`
                    : `${d.nombre} vence en ${est.dias} días — ${fmtFecha(d.vencimiento)}`
                  }
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Documentos */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Documentación y vencimientos</h3>
          </div>
          <button onClick={agregarDocumento} className="btn-ghost flex items-center gap-2 text-sm">
            <Plus size={14} /> Agregar
          </button>
        </div>

        <div className="space-y-3">
          {libreta.documentos.map((doc, idx) => {
            const est = getEstado(doc.vencimiento)
            const Icon = est?.icon
            return (
              <div key={doc.id} className="bg-navy-700/50 border border-navy-600 rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Nombre */}
                  <div className="sm:col-span-4">
                    {idx < 4 ? (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Documento</p>
                        <p className="text-white font-medium">{doc.nombre}</p>
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Documento</label>
                        <input type="text" className="text-sm py-1.5" placeholder="Nombre del documento"
                          value={doc.nombre} onChange={e => actualizarDocumento(doc.id, 'nombre', e.target.value)} />
                      </div>
                    )}
                  </div>

                  {/* Número */}
                  <div className="sm:col-span-3">
                    <label className="text-xs text-slate-500 mb-1 block">Número / Código</label>
                    <input type="text" className="text-sm py-1.5 font-mono" placeholder="Opcional"
                      value={doc.numero} onChange={e => actualizarDocumento(doc.id, 'numero', e.target.value)} />
                  </div>

                  {/* Vencimiento */}
                  <div className="sm:col-span-3">
                    <label className="text-xs text-slate-500 mb-1 block">Vencimiento</label>
                    <input type="date" className="text-sm py-1.5"
                      value={doc.vencimiento} onChange={e => actualizarDocumento(doc.id, 'vencimiento', e.target.value)} />
                  </div>

                  {/* Estado + eliminar */}
                  <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2">
                    {est && Icon ? (
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-semibold ${est.bg} ${est.color}`}>
                        <Icon size={12} />
                        <span className="hidden sm:inline">{est.label}</span>
                        <span className="sm:hidden">{est.tipo === 'vigente' ? '✓' : est.tipo === 'vencido' ? '✗' : '!'}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">Sin fecha</span>
                    )}
                    {idx >= 4 && (
                      <button onClick={() => eliminarDocumento(doc.id)} className="btn-danger p-1.5">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-slate-600 mt-4">
          Los cambios se guardan automáticamente en tu dispositivo.
        </p>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 flex-wrap text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-400" /> Vigente — más de 60 días</span>
        <span className="flex items-center gap-1.5"><AlertTriangle size={12} className="text-yellow-400" /> Próximo a vencer — menos de 60 días</span>
        <span className="flex items-center gap-1.5"><XCircle size={12} className="text-red-400" /> Vencido</span>
      </div>
    </div>
  )
}
