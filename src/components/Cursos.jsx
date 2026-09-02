import { useState } from 'react'
import { GraduationCap, Plus, Pencil, Trash2, X, ArrowLeft, ExternalLink, MapPin, Calendar } from 'lucide-react'
import { useCursos } from '../hooks/useCursos'

const EDITOR_VACIO = { nombre: '', entidad: '', cuando: '', donde: '', modalidad: 'presencial', tipo: 'recomendado', vigencia: '', link: '', nota: '' }
const LABEL_MODAL = { presencial: 'Presencial', online: 'Online' }

// Estado del curso, calculado por vigencia (fecha de vencimiento) + tipo:
//  - recomendado            → "Recomendado"
//  - obligatorio + vence en ≤60 días (o vencido) → "Por vencer"
//  - obligatorio vigente    → "Vigente"
const COLOR_EST = { porvencer: '#f87171', vigente: '#34d399', recomendado: '#818cf8' }
function estadoCurso(c) {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(c.vigencia || '') ? c.vigencia : null
  if (c.tipo !== 'recomendado' && iso) {
    const dias = Math.ceil((new Date(iso + 'T00:00:00') - new Date()) / 86400000)
    if (dias <= 60) return { key: 'porvencer', label: dias < 0 ? 'Vencido' : 'Por vencer', color: COLOR_EST.porvencer }
  }
  if (c.tipo === 'recomendado') return { key: 'recomendado', label: 'Recomendado', color: COLOR_EST.recomendado }
  return { key: 'vigente', label: 'Vigente', color: COLOR_EST.vigente }
}
const fmtVenc = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return iso || ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const FILTROS = [
  { v: 'todos', label: 'Todos' },
  { v: 'porvencer', label: 'Por vencer' },
  { v: 'vigente', label: 'Vigentes' },
  { v: 'recomendado', label: 'Recomendados' },
]

export default function Cursos({ esAdmin = false, onVolver }) {
  const { cursos, cargando, agregar, editar, eliminar } = useCursos()
  const [editor, setEditor] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [filtro, setFiltro] = useState('todos')

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

  const lista = cursos.filter(c => filtro === 'todos' || estadoCurso(c).key === filtro)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <button onClick={onVolver} className="btn-ghost p-2 rounded-lg mt-0.5" aria-label="Volver"><ArrowLeft size={18} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <GraduationCap size={22} className="text-indigo-400" />
            <h1 className="text-xl font-bold text-white">Cursos</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Formación, seguridad y certificaciones para embarcar.</p>
        </div>
        {esAdmin && (
          <button onClick={nuevo} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5 flex-shrink-0">
            <Plus size={16} /> Nuevo curso
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {FILTROS.map(f => (
          <button key={f.v} onClick={() => setFiltro(f.v)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filtro === f.v ? 'bg-cyan-500 text-navy-900' : 'bg-navy-700/60 text-slate-400 border border-navy-600 hover:border-cyan-500/40'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-slate-500 text-sm text-center py-10 animate-pulse">Cargando cursos…</p>
      ) : lista.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">
          <GraduationCap size={40} className="mx-auto mb-3 text-slate-700" />
          <p className="text-sm">{cursos.length === 0 ? 'Todavía no hay cursos.' : 'No hay cursos en este filtro.'}</p>
          {esAdmin && cursos.length === 0 && <p className="text-xs mt-1">Tocá “Nuevo curso” para publicar el primero.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lista.map(c => {
            const est = estadoCurso(c)
            return (
              <div key={c.id} className="card flex flex-col">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5" style={{ background: `${est.color}1a`, color: est.color, border: `1px solid ${est.color}4d` }}>{est.label}</span>
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

                {/* Cuándo y Dónde destacados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  <div className="bg-navy-900 rounded-lg px-3 py-2 border border-navy-700">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wide"><Calendar size={12} className="text-indigo-400" /> Cuándo</div>
                    <p className="text-sm text-white font-semibold mt-0.5 leading-tight">{c.cuando || '—'}</p>
                  </div>
                  <div className="bg-navy-900 rounded-lg px-3 py-2 border border-navy-700">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wide"><MapPin size={12} className="text-indigo-400" /> Dónde</div>
                    <p className="text-sm text-white font-semibold mt-0.5 leading-tight">{c.donde || (c.modalidad === 'online' ? 'Online' : '—')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {c.modalidad && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,.3)' }}>{LABEL_MODAL[c.modalidad] || c.modalidad}</span>}
                  {c.vigencia && <span className="text-[10px] text-slate-500">Vence: {fmtVenc(c.vigencia)}</span>}
                </div>

                {c.nota && <p className="text-xs text-slate-500 mt-2 whitespace-pre-wrap leading-relaxed flex-1">{c.nota}</p>}

                {c.link && (
                  <a href={c.link} target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }}>
                    <ExternalLink size={15} /> Info / Inscribirme
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Modalidad</label>
                <div className="grid grid-cols-2 gap-1 bg-navy-900 border border-navy-700 rounded-lg p-1">
                  {[['presencial', 'Presencial'], ['online', 'Online']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set('modalidad', v)}
                      className="py-1.5 rounded-md text-xs font-semibold transition-colors"
                      style={editor.modalidad === v ? { background: 'var(--accent)', color: '#07131f' } : { color: '#94a3b8' }}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Tipo</label>
                <div className="grid grid-cols-2 gap-1 bg-navy-900 border border-navy-700 rounded-lg p-1">
                  {[['obligatorio', 'Obligatorio'], ['recomendado', 'Recomendado']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set('tipo', v)}
                      className="py-1.5 rounded-md text-xs font-semibold transition-colors"
                      style={editor.tipo === v ? { background: 'var(--accent)', color: '#07131f' } : { color: '#94a3b8' }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-slate-500 mb-0.5 block">Vence (obligatorios)</label>
                <input type="date" value={editor.vigencia} onChange={e => set('vigencia', e.target.value)} className="text-sm w-full" /></div>
              <div><label className="text-[10px] text-slate-500 mb-0.5 block">Link</label>
                <input value={editor.link} onChange={e => set('link', e.target.value)} placeholder="https://…" className="text-sm w-full" /></div>
            </div>
            <div><label className="text-[10px] text-slate-500 mb-0.5 block">Nota (opcional)</label>
              <textarea rows={3} value={editor.nota} onChange={e => set('nota', e.target.value)} className="text-sm w-full resize-y" /></div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditor(null)} className="flex-1 btn-ghost py-3 text-sm rounded-lg">Cancelar</button>
              <button onClick={guardar} disabled={guardando || !editor.nombre.trim()} className="flex-1 btn-primary py-3 text-sm disabled:opacity-50">{guardando ? 'Guardando…' : 'Publicar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
