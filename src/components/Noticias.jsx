import { useState } from 'react'
import { Newspaper, Plus, Pencil, Trash2, X, ArrowLeft, ArrowRight, Upload, Image as ImageIcon, Loader } from 'lucide-react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'
import { useNoticias } from '../hooks/useNoticias'

const ETIQUETAS = ['Veda', 'Clima', 'Precios', 'General']
const hoyISO = () => new Date().toISOString().slice(0, 10)
const fmtFecha = (iso) => {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return isNaN(d) ? iso : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const esURL = (s) => /^https?:\/\//i.test((s || '').trim())

// Markdown simple: **negrita**, [texto](url) y URLs sueltas. Preserva saltos de
// línea (\n → <br>) y de párrafo (doble \n → <p>), así pegar texto no rompe nada.
function parseInline(line, base) {
  const re = /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s]+)/g
  const out = []; let last = 0; let m; let i = 0
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index))
    if (m[1]) out.push(<strong key={`${base}-${i++}`} className="text-slate-200 font-semibold">{m[2]}</strong>)
    else if (m[3]) out.push(<a key={`${base}-${i++}`} href={m[5]} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">{m[4]}</a>)
    else out.push(<a key={`${base}-${i++}`} href={m[0]} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline break-all">{m[0]}</a>)
    last = re.lastIndex
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}
function MarkdownSimple({ text }) {
  const paras = String(text || '').trim().split(/\n{2,}/)
  return paras.map((p, pi) => (
    <p key={pi} className="text-sm text-slate-400 leading-relaxed">
      {p.split('\n').map((ln, li, arr) => (
        <span key={li}>{parseInline(ln, `${pi}-${li}`)}{li < arr.length - 1 && <br />}</span>
      ))}
    </p>
  ))
}

const EDITOR_VACIO = { titulo: '', fecha: hoyISO(), etiqueta: '', portadaURL: '', resumen: '', cuerpo: '', fuente: '' }

export default function Noticias({ esAdmin = false, uid, onVolver }) {
  const { noticias, cargando, agregar, editar, eliminar } = useNoticias()
  const [editor, setEditor] = useState(null)
  const [leyendo, setLeyendo] = useState(null) // noticia abierta en el lector
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  function nuevo() { setEditor({ ...EDITOR_VACIO }) }
  function editarNoticia(n) {
    setEditor({ id: n.id, titulo: n.titulo || '', fecha: n.fecha || hoyISO(), etiqueta: n.etiqueta || '', portadaURL: n.portadaURL || '', resumen: n.resumen || '', cuerpo: n.cuerpo || '', fuente: n.fuente || '' })
  }
  function set(campo, valor) { setEditor(s => ({ ...s, [campo]: valor })) }

  // Sube la portada a Firebase Storage y guarda la URL de descarga.
  async function subirPortada(file) {
    if (!file) return
    setSubiendo(true)
    try {
      const safe = file.name.replace(/[^\w.\-]/g, '_')
      const r = ref(storage, `noticias/${uid || 'admin'}/${Date.now()}_${safe}`)
      await uploadBytes(r, file)
      set('portadaURL', await getDownloadURL(r))
    } catch (e) {
      alert('No se pudo subir la imagen. Probá de nuevo.')
    } finally { setSubiendo(false) }
  }

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
                {leyendo.cuerpo && <div className="mt-3 space-y-3"><MarkdownSimple text={leyendo.cuerpo} /></div>}
                {leyendo.fuente && (
                  <p className="text-[11px] text-slate-600 mt-5 border-t border-navy-700 pt-3">
                    Fuente: {esURL(leyendo.fuente)
                      ? <a href={leyendo.fuente} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline break-all">{leyendo.fuente}</a>
                      : leyendo.fuente}
                  </p>
                )}
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
                <input list="etiquetas-noticia" value={editor.etiqueta} onChange={e => set('etiqueta', e.target.value)} placeholder="Veda, Clima, Precios, General…" className="text-sm w-full" />
                <datalist id="etiquetas-noticia">{ETIQUETAS.map(e => <option key={e} value={e} />)}</datalist></div>
            </div>

            {/* Portada: subida a Storage (opcional) */}
            <div>
              <label className="text-[10px] text-slate-500 mb-0.5 block">Portada (opcional)</label>
              {editor.portadaURL ? (
                <div className="relative rounded-lg overflow-hidden border border-navy-600">
                  <img src={editor.portadaURL} alt="" className="w-full max-h-40 object-cover" />
                  <button onClick={() => set('portadaURL', '')} className="absolute top-1.5 right-1.5 w-8 h-8 rounded-lg bg-black/70 border border-navy-500 flex items-center justify-center text-white"><X size={15} /></button>
                </div>
              ) : (
                <label className={`flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-navy-600 text-sm cursor-pointer ${subiendo ? 'opacity-60' : 'hover:border-navy-500'}`} style={{ color: 'var(--accent)' }}>
                  {subiendo ? <><Loader size={15} className="animate-spin" /> Subiendo…</> : <><Upload size={15} /> Subir imagen</>}
                  <input type="file" accept="image/*" className="hidden" disabled={subiendo}
                    onChange={e => { const f = e.target.files?.[0]; if (f) subirPortada(f); e.target.value = '' }} />
                </label>
              )}
              <input value={editor.portadaURL} onChange={e => set('portadaURL', e.target.value)} placeholder="…o pegá una URL de imagen" className="text-xs w-full mt-1.5 text-slate-400" />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 mb-0.5 flex items-center justify-between">
                <span>Resumen <span className="text-slate-600">(se ve en la lista)</span></span>
                <span className={editor.resumen.length > 250 ? 'text-red-400' : 'text-slate-600'}>{editor.resumen.length}/250</span>
              </label>
              <textarea rows={2} maxLength={250} value={editor.resumen} onChange={e => set('resumen', e.target.value)} className="text-sm w-full resize-y" />
            </div>
            <div><label className="text-[10px] text-slate-500 mb-0.5 block">Cuerpo <span className="text-slate-600">(admite **negrita** y links)</span></label>
              <textarea rows={7} value={editor.cuerpo} onChange={e => set('cuerpo', e.target.value)} placeholder="Escribí o pegá el texto…" className="text-sm w-full resize-y" /></div>
            <div><label className="text-[10px] text-slate-500 mb-0.5 block">Fuente / link (opcional)</label>
              <input value={editor.fuente} onChange={e => set('fuente', e.target.value)} placeholder="INIDEP, o https://…" className="text-sm w-full" /></div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditor(null)} className="flex-1 btn-ghost py-3 text-sm rounded-lg">Cancelar</button>
              <button onClick={guardar} disabled={guardando || !editor.titulo.trim()} className="flex-1 btn-primary py-3 text-sm disabled:opacity-50">{guardando ? 'Guardando…' : 'Publicar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
