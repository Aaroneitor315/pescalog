import { useState } from 'react'
import { GraduationCap, Plus, Pencil, Trash2, X, ArrowLeft, ExternalLink, MapPin, Calendar } from 'lucide-react'
import { useCursos } from '../hooks/useCursos'

const EDITOR_VACIO = { nombre: '', entidad: '', cuando: '', donde: '', modalidad: 'presencial', tipo: 'recomendado', vigencia: '', link: '', nota: '' }

const COLOR_TIPO = { obligatorio: '#f87171', recomendado: '#34d399' }
const LABEL_TIPO = { obligatorio: 'Obligatorio', recomendado: 'Recomendado' }
const LABEL_MODAL = { presencial: 'Presencial', online: 'Online' }

export default function Cursos({ esAdmin = false, onVolver }) {
  const { cursos, cargando, agregar, editar, eliminar } = useCursos()
  const [editor, setEditor] = useState(null)
  const [guardando, setGuardando] = useState(false)

  function nuevo() { setEditor({ ...EDITOR_VACIO }) }
  function editarCurso(c) {
    setEditor({ id: c.id, nombre: c.nombre || '', entidad: c.entidad || '', cuando: c.cuando || '', donde: c.donde || '', modalidad: c.modalidad || 'presencial', tipo: c.tipo || 'recomendado', vigencia: c.vigencia || '', link: c.link || '', nota: c.nota || '' })
  }
  function set(campo, valor) { setEditor(s => ({ ...s, [campo]: valor })) }

  async function guardar() {
    if (!editor.nombre.trim()) return
    setGuardando(true)
    try {
      const datos = {
        nombre: editor.nombre.trim(), entidad: editor.entidad.trim(), cuando: editor.cuando.trim(),
        donde: editor.donde.trim(), modalidad: editor.modalidad, tipo: editor.tipo,
        vigencia: editor.vigencia.trim(), link: editor.link.trim(), nota: editor.nota.trim(),
      }
      if (editor.id) await editar(editor.id, datos)
      else await agregar(datos)
      setEditor(null)
    } finally { setGuardando(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onVolver} className="btn-ghost p-2 rounded-lg" aria-label="Volver"><ArrowLeft size={18} /></button>
        <div className="flex items-center gap-2">
          <GraduationCap size={22} className="text-indigo-400" />
          <h1 className="text-xl font-bold text-white">Cursos</h1>
        </div>
        {esAdmin && (
          <button onClick={nuevo} className="ml-auto btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
            <Plus size={16} /> Nuevo curso
          </button>
        )}
      </div>

      {cargando ? (
        <p className="text-slate-500 text-sm text-center py-10 animate-pulse">Cargando cursos…</p>
      ) : cursos.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">
          <GraduationCap size={40} className="mx-auto mb-3 text-slate-700" />
          <p className="text-sm">Todavía no hay cursos.</p>
          {esAdmin && <p className="text-xs mt-1">Tocá “Nuevo curso” para publicar el primero.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cursos.map(c => {
            const colTipo = COLOR_TIPO[c.tipo] || '#64748b'
            return (
              <div key={c.id} className="card flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {c.tipo && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${colTipo}1a`, color: colTipo, border: `1px solid ${colTipo}4d` }}>{LABEL_TIPO[c.tipo] || c.tipo}</span>}
                  {c.modalidad && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,.3)' }}>{LABEL_MODAL[c.modalidad] || c.modalidad}</span>}
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-white leading-tight">{c.nombre}</h2>
                    {c.entidad && <p className="text-xs text-slate-500 mt-0.5">{c.entidad}</p>}
                  </div>
                  {esAdmin && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => editarCurso(c)} aria-label="Editar" className="w-8 h-8 rounded-lg border border-navy-600 hover:border-navy-500 flex items-center justify-center"><Pencil size={13} className="text-cyan-400" /></button>
                      <button onClick={() => { if (confirm('¿Borrar este curso?')) eliminar(c.id) }} aria-label="Borrar" className="w-8 h-8 rounded-lg border border-navy-600 hover:border-red-500/50 flex items-center justify-center"><Trash2 size={13} className="text-red-400" /></button>
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-1 flex-1">
                  {c.cuando && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Calendar size={13} className="text-slate-500 flex-shrink-0" /> {c.cuando}</p>}
                  {c.donde && <p className="text-xs text-slate-400 flex items-center gap-1.5"><MapPin size={13} className="text-slate-500 flex-shrink-0" /> {c.donde}</p>}
                  {c.vigencia && <p className="text-[11px] text-slate-500">Vigencia: {c.vigencia}</p>}
                  {c.nota && <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">{c.nota}</p>}
                </div>
                {c.link && (
                  <a href={c.link} target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }}>
                    <ExternalLink size={15} /> Ver curso
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4" onClick={() => setEditor(null)}>
          <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-lg p-5 space-y-3 mb-4 sm:mb-0 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">{editor.id ? 'Editar curso' : 'Nuevo curso'}</h3>
              <button onClick={() => setEditor(null)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <div><label className="text-[10px] text-slate-500 mb-0.5 block">Nombre</label>
              <input autoFocus value={editor.nombre} onChange={e => set('nombre', e.target.value)} className="text-sm w-full" /></div>
            <div><label className="text-[10px] text-slate-500 mb-0.5 block">Entidad</label>
              <input value={editor.entidad} onChange={e => set('entidad', e.target.value)} placeholder="Prefectura, sindicato…" className="text-sm w-full" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-slate-500 mb-0.5 block">Cuándo</label>
                <input value={editor.cuando} onChange={e => set('cuando', e.target.value)} placeholder="12/09, 9 a 13 hs" className="text-sm w-full" /></div>
              <div><label className="text-[10px] text-slate-500 mb-0.5 block">Dónde</label>
                <input value={editor.donde} onChange={e => set('donde', e.target.value)} placeholder="Puerto Madryn" className="text-sm w-full" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-slate-500 mb-0.5 block">Modalidad</label>
                <select value={editor.modalidad} onChange={e => set('modalidad', e.target.value)} className="text-sm w-full">
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                </select></div>
              <div><label className="text-[10px] text-slate-500 mb-0.5 block">Tipo</label>
                <select value={editor.tipo} onChange={e => set('tipo', e.target.value)} className="text-sm w-full">
                  <option value="obligatorio">Obligatorio</option>
                  <option value="recomendado">Recomendado</option>
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-slate-500 mb-0.5 block">Vigencia</label>
                <input value={editor.vigencia} onChange={e => set('vigencia', e.target.value)} placeholder="2 años" className="text-sm w-full" /></div>
              <div><label className="text-[10px] text-slate-500 mb-0.5 block">Link</label>
                <input value={editor.link} onChange={e => set('link', e.target.value)} placeholder="https://…" className="text-sm w-full" /></div>
            </div>
            <div><label className="text-[10px] text-slate-500 mb-0.5 block">Nota (opcional)</label>
              <textarea rows={3} value={editor.nota} onChange={e => set('nota', e.target.value)} className="text-sm w-full resize-y" /></div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditor(null)} className="flex-1 btn-ghost py-2 text-sm rounded-lg">Cancelar</button>
              <button onClick={guardar} disabled={guardando || !editor.nombre.trim()} className="flex-1 btn-primary py-2 text-sm disabled:opacity-50">{guardando ? 'Guardando…' : 'Publicar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
