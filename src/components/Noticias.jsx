import { useState } from 'react'
import { Newspaper, Plus, Pencil, Trash2, X, ArrowLeft, ArrowRight } from 'lucide-react'
import { useNoticias } from '../hooks/useNoticias'

const hoyISO = () => new Date().toISOString().slice(0, 10)
const fmtFecha = (iso) => {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return isNaN(d) ? iso : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const EDITOR_VACIO = { titulo: '', fecha: hoyISO(), etiqueta: '', portadaURL: '', resumen: '', cuerpo: '', fuente: '' }

export default function Noticias({ esAdmin = false, uid, onVolver }) {
  const { noticias, cargando, agregar, editar, eliminar } = useNoticias()
  const [editor, setEditor] = useState(null)
  const [leyendo, setLeyendo] = useState(null) // noticia abierta en el lector
  const [guardando, setGuardando] = useState(false)

  function nuevo() { setEditor({ ...EDITOR_VACIO }) }
  function editarNoticia(n) {
    setEditor({ id: n.id, titulo: n.titulo || '', fecha: n.fecha || hoyISO(), etiqueta: n.etiqueta || '', portadaURL: n.portadaURL || '', resumen: n.resumen || '', cuerpo: n.cuerpo || '', fuente: n.fuente || '' })
  }
  function set(campo, valor) { setEditor(s => ({ ...s, [campo]: valor })) }

  async function guardar() {
    if (!editor.titulo.trim()) return
    setGuardando(true)
    try {
      const datos = {
        titulo: editor.titulo.trim(), fecha: editor.fecha, etiqueta: editor.etiqueta.trim(),
        portadaURL: editor.portadaURL.trim(), resumen: editor.resumen.trim(), cuerpo: editor.cuerpo,
        fuente: editor.fuente.trim(),
      }
      if (editor.id) await editar(editor.id, datos)
      else await agregar({ ...datos, autorId: uid || null })
      setEditor(null)
    } finally { setGuardando(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <button onClick={onVolver} className="btn-ghost p-2 rounded-lg mt-0.5" aria-label="Volver"><ArrowLeft size={18} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Newspaper size={22} className="text-amber-400" />
            <h1 className="text-xl font-bold text-white">Noticias</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Novedades del sector pesquero, comunicados y partes oficiales.</p>
        </div>
        {esAdmin && (
          <button onClick={nuevo} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5 flex-shrink-0">
            <Plus size={16} /> Nueva noticia
          </button>
        )}
      </div>

      {cargando ? (
        <p className="text-slate-500 text-sm text-center py-10 animate-pulse">Cargando noticias…</p>
      ) : noticias.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">
          <Newspaper size={40} className="mx-auto mb-3 text-slate-700" />
          <p className="text-sm">Todavía no hay noticias.</p>
          {esAdmin && <p className="text-xs mt-1">Tocá “Nueva noticia” para publicar la primera.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {noticias.map(n => (
            <article key={n.id} className="card p-0 overflow-hidden">
              {n.portadaURL && (
                <img src={n.portadaURL} alt="" className="w-full max-h-56 object-cover" loading="lazy" />
              )}
              <div className="p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {n.etiqueta && <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5" style={{ background: 'rgba(245,158,11,.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,.3)' }}>{n.etiqueta}</span>}
                    <h2 className="text-lg font-bold text-white leading-tight">{n.titulo}</h2>
                  </div>
                  {esAdmin && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => editarNoticia(n)} aria-label="Editar" className="w-9 h-9 rounded-lg border border-navy-600 hover:border-navy-500 flex items-center justify-center"><Pencil size={14} className="text-cyan-400" /></button>
                      <button onClick={() => { if (confirm('¿Borrar esta noticia?')) eliminar(n.id) }} aria-label="Borrar" className="w-9 h-9 rounded-lg border border-navy-600 hover:border-red-500/50 flex items-center justify-center"><Trash2 size={14} className="text-red-400" /></button>
                    </div>
                  )}
                </div>
                {n.resumen && <p className="text-sm text-slate-300 mt-2 leading-relaxed">{n.resumen}</p>}
                <div className="flex items-center gap-2 mt-3">
                  <p className="text-[11px] text-slate-600 flex-1 truncate">
                    {fmtFecha(n.fecha)}{n.fuente && ` · ${n.fuente}`}
                  </p>
                  <button onClick={() => setLeyendo(n)}
                    className="text-xs font-semibold flex items-center gap-1 flex-shrink-0" style={{ color: 'var(--accent)' }}>
                    Leer más <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Lector de la nota completa */}
      {leyendo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 sm:px-4" onClick={() => setLeyendo(null)}>
          <div className="bg-navy-900 border border-navy-600 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700 bg-navy-800 flex-shrink-0">
              <div className="flex items-center gap-2 text-slate-400"><Newspaper size={16} className="text-amber-400" /><span className="text-xs font-semibold uppercase tracking-wider">Noticia</span></div>
              <button onClick={() => setLeyendo(null)} className="w-8 h-8 rounded-lg border border-navy-600 flex items-center justify-center text-slate-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto">
              {leyendo.portadaURL && <img src={leyendo.portadaURL} alt="" className="w-full max-h-72 object-cover" />}
              <div className="p-5">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {leyendo.etiqueta && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,.3)' }}>{leyendo.etiqueta}</span>}
                  <span className="text-[11px] text-slate-500">{fmtFecha(leyendo.fecha)}{leyendo.fuente && ` · ${leyendo.fuente}`}</span>
                </div>
                <h2 className="text-2xl font-black text-white leading-tight">{leyendo.titulo}</h2>
                {leyendo.resumen && <p className="text-base text-slate-300 mt-3 font-medium leading-relaxed">{leyendo.resumen}</p>}
                {leyendo.cuerpo && <p className="text-sm text-slate-400 mt-3 whitespace-pre-wrap leading-relaxed">{leyendo.cuerpo}</p>}
                {leyendo.fuente && <p className="text-[11px] text-slate-600 mt-5 border-t border-navy-700 pt-3">Fuente: {leyendo.fuente}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor (solo admin) */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4" onClick={() => setEditor(null)}>
          <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-lg p-5 space-y-3 mb-4 sm:mb-0 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">{editor.id ? 'Editar noticia' : 'Nueva noticia'}</h3>
              <button onClick={() => setEditor(null)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <div><label className="text-[10px] text-slate-500 mb-0.5 block">Título</label>
              <input autoFocus value={editor.titulo} onChange={e => set('titulo', e.target.value)} className="text-sm w-full" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-slate-500 mb-0.5 block">Fecha</label>
                <input type="date" value={editor.fecha} onChange={e => set('fecha', e.target.value)} className="text-sm w-full" /></div>
              <div><label className="text-[10px] text-slate-500 mb-0.5 block">Etiqueta</label>
                <input value={editor.etiqueta} onChange={e => set('etiqueta', e.target.value)} placeholder="Veda, Precios…" className="text-sm w-full" /></div>
            </div>
            <div><label className="text-[10px] text-slate-500 mb-0.5 block">Portada (URL, opcional)</label>
              <input value={editor.portadaURL} onChange={e => set('portadaURL', e.target.value)} placeholder="https://…" className="text-sm w-full" /></div>
            <div><label className="text-[10px] text-slate-500 mb-0.5 block">Resumen</label>
              <textarea rows={2} value={editor.resumen} onChange={e => set('resumen', e.target.value)} className="text-sm w-full resize-y" /></div>
            <div><label className="text-[10px] text-slate-500 mb-0.5 block">Cuerpo</label>
              <textarea rows={6} value={editor.cuerpo} onChange={e => set('cuerpo', e.target.value)} className="text-sm w-full resize-y" /></div>
            <div><label className="text-[10px] text-slate-500 mb-0.5 block">Fuente (opcional)</label>
              <input value={editor.fuente} onChange={e => set('fuente', e.target.value)} placeholder="INIDEP, prensa…" className="text-sm w-full" /></div>
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
