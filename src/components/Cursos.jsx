import { useState } from 'react'
import { GraduationCap, Plus, Pencil, Trash2, X, ArrowLeft, ExternalLink } from 'lucide-react'
import { useCursos } from '../hooks/useCursos'

export default function Cursos({ esAdmin = false, onVolver }) {
  const { cursos, cargando, agregar, editar, eliminar } = useCursos()
  const [editor, setEditor] = useState(null) // { id?, titulo, descripcion, url, categoria }
  const [guardando, setGuardando] = useState(false)

  function nuevo() { setEditor({ titulo: '', descripcion: '', url: '', categoria: '' }) }
  function editarCurso(c) { setEditor({ id: c.id, titulo: c.titulo || '', descripcion: c.descripcion || '', url: c.url || '', categoria: c.categoria || '' }) }

  async function guardar() {
    if (!editor.titulo.trim()) return
    setGuardando(true)
    try {
      const datos = { titulo: editor.titulo.trim(), descripcion: editor.descripcion, url: editor.url.trim(), categoria: editor.categoria.trim() }
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
          {cursos.map(c => (
            <div key={c.id} className="card flex flex-col">
              {c.categoria && <span className="self-start text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,.3)' }}>{c.categoria}</span>}
              <div className="flex items-start gap-2">
                <h2 className="text-base font-bold text-white leading-tight flex-1">{c.titulo}</h2>
                {esAdmin && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => editarCurso(c)} aria-label="Editar" className="w-8 h-8 rounded-lg border border-navy-600 hover:border-navy-500 flex items-center justify-center"><Pencil size={13} className="text-cyan-400" /></button>
                    <button onClick={() => { if (confirm('¿Borrar este curso?')) eliminar(c.id) }} aria-label="Borrar" className="w-8 h-8 rounded-lg border border-navy-600 hover:border-red-500/50 flex items-center justify-center"><Trash2 size={13} className="text-red-400" /></button>
                  </div>
                )}
              </div>
              {c.descripcion && <p className="text-sm text-slate-400 mt-1.5 flex-1 whitespace-pre-wrap leading-relaxed">{c.descripcion}</p>}
              {c.url && (
                <a href={c.url} target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }}>
                  <ExternalLink size={15} /> Ver curso
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4" onClick={() => setEditor(null)}>
          <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-lg p-5 space-y-3 mb-4 sm:mb-0 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">{editor.id ? 'Editar curso' : 'Nuevo curso'}</h3>
              <button onClick={() => setEditor(null)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <div><label className="text-[10px] text-slate-500 mb-0.5 block">Título</label>
              <input autoFocus value={editor.titulo} onChange={e => setEditor(s => ({ ...s, titulo: e.target.value }))} className="text-sm w-full" /></div>
            <div><label className="text-[10px] text-slate-500 mb-0.5 block">Descripción</label>
              <textarea rows={4} value={editor.descripcion} onChange={e => setEditor(s => ({ ...s, descripcion: e.target.value }))} className="text-sm w-full resize-y" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-slate-500 mb-0.5 block">Categoría (opcional)</label>
                <input value={editor.categoria} onChange={e => setEditor(s => ({ ...s, categoria: e.target.value }))} placeholder="Seguridad, Máquinas…" className="text-sm w-full" /></div>
              <div><label className="text-[10px] text-slate-500 mb-0.5 block">Link del curso</label>
                <input value={editor.url} onChange={e => setEditor(s => ({ ...s, url: e.target.value }))} placeholder="https://…" className="text-sm w-full" /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditor(null)} className="flex-1 btn-ghost py-2 text-sm rounded-lg">Cancelar</button>
              <button onClick={guardar} disabled={guardando || !editor.titulo.trim()} className="flex-1 btn-primary py-2 text-sm disabled:opacity-50">{guardando ? 'Guardando…' : 'Publicar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
