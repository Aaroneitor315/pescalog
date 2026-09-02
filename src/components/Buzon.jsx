import { useState } from 'react'
import { X, Star, Send, Mail, Archive, Check, Inbox, MessageSquare, Search } from 'lucide-react'

// tipo se guarda en minúscula ('reseña'|'sugerencia'|'problema'); el label es solo visual.
const TIPOS = [
  { v: 'reseña', label: 'Reseña' },
  { v: 'sugerencia', label: 'Sugerencia' },
  { v: 'problema', label: 'Problema' },
]
const LABEL_TIPO = { 'reseña': 'Reseña', 'sugerencia': 'Sugerencia', 'problema': 'Problema' }
const COLOR_TIPO = { 'reseña': '#fbbf24', 'sugerencia': '#22d3ee', 'problema': '#f87171' }
const COLOR_ESTADO = { nuevo: '#34d399', leido: '#64748b', archivado: '#475569' }
const LABEL_ESTADO = { nuevo: 'Nuevo', leido: 'Leído', archivado: 'Archivado' }

const fmtFechaHora = (ts) => {
  const d = ts?.toDate?.()
  return d ? d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
}

function Shell({ title, icon: Icon, onCerrar, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:px-4" onClick={onCerrar}>
      <div className="bg-navy-900 border border-navy-600 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-navy-700 bg-navy-800">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,.12)', border: '1px solid rgba(244,63,94,.3)' }}>
            <Icon size={18} className="text-rose-400" />
          </div>
          <h2 className="text-white font-bold text-base flex-1">{title}</h2>
          <button onClick={onCerrar} className="w-9 h-9 rounded-lg border border-navy-600 flex items-center justify-center text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Formulario (usuario logueado) ──────────────────────────────────────────
function Formulario({ user, enviar, onCerrar }) {
  const [tipo, setTipo] = useState('reseña')
  const [texto, setTexto] = useState('')
  const [estrellas, setEstrellas] = useState(5)
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')

  function limpiar() { setTipo('reseña'); setTexto(''); setEstrellas(5) }

  async function submit() {
    if (!texto.trim()) return
    setError('')
    setEnviando(true)
    try {
      await enviar({ tipo, texto: texto.trim(), ...(tipo === 'reseña' ? { estrellas } : {}) })
      limpiar()      // limpia el form
      setOk(true)
    } catch (e) {
      setError('No se pudo enviar. Revisá tu conexión e intentá de nuevo.')
    } finally { setEnviando(false) }
  }

  if (ok) return (
    <div className="text-center py-10">
      <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
        <Check size={30} className="text-emerald-400" />
      </div>
      <h3 className="text-white font-bold text-lg">¡Gracias, lo recibimos!</h3>
      <p className="text-slate-400 text-sm mt-1">Vamos a leer tu mensaje pronto.</p>
      <div className="flex gap-2 justify-center mt-5">
        <button onClick={() => setOk(false)} className="btn-ghost px-5 py-2.5 text-sm rounded-lg">Enviar otro</button>
        <button onClick={onCerrar} className="btn-primary px-6 py-2.5 text-sm">Cerrar</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Contanos qué te parece la app, sugerí una mejora o reportá un problema.</p>

      <div>
        <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 block">Tipo</label>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map(t => (
            <button key={t.v} onClick={() => setTipo(t.v)}
              className="py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={tipo === t.v
                ? { background: `${COLOR_TIPO[t.v]}1f`, color: COLOR_TIPO[t.v], border: `1px solid ${COLOR_TIPO[t.v]}66` }
                : { background: '#0d1829', color: '#94a3b8', border: '1px solid #1a304e' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tipo === 'reseña' && (
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 block">Puntuación</label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setEstrellas(n)} aria-label={`${n} estrellas`}>
                <Star size={30} className={n <= estrellas ? 'text-amber-400 fill-amber-400' : 'text-navy-600'} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 block">Mensaje</label>
        <textarea rows={5} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Escribí acá…" className="text-sm w-full resize-y" />
      </div>

      <div className="text-[11px] text-slate-500 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2">
        Se envía como <b className="text-slate-300">{user?.email}</b>
      </div>

      {error && (
        <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2">
        <button onClick={onCerrar} className="flex-1 btn-ghost py-2.5 text-sm rounded-lg">Cancelar</button>
        <button onClick={submit} disabled={enviando || !texto.trim()} className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          <Send size={15} /> {enviando ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}

// ── Bandeja (admin) — reutilizable en el overlay y en el Panel Admin ─────────
export function BandejaMensajes({ mensajes = [], actualizarEstado }) {
  const [fTipo, setFTipo] = useState('todos')
  const [fEstado, setFEstado] = useState('nuevo')
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()

  const lista = mensajes.filter(m =>
    (fTipo === 'todos' || m.tipo === fTipo) &&
    (fEstado === 'todos' || (m.estado || 'nuevo') === fEstado) &&
    (!term || `${m.texto || ''} ${m.nombre || ''} ${m.email || ''}`.toLowerCase().includes(term)))

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, email o texto…" className="text-sm w-full pl-9" />
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={fTipo} onChange={e => setFTipo(e.target.value)} className="text-sm py-1.5">
          <option value="todos">Todos los tipos</option>
          {TIPOS.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="text-sm py-1.5">
          <option value="todos">Todos los estados</option>
          <option value="nuevo">Nuevos</option>
          <option value="leido">Leídos</option>
          <option value="archivado">Archivados</option>
        </select>
        <span className="ml-auto text-xs text-slate-500 self-center">{lista.length} mensaje{lista.length !== 1 ? 's' : ''}</span>
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Inbox size={40} className="mx-auto mb-3 text-slate-700" />
          <p className="text-sm">Sin mensajes en este filtro.</p>
        </div>
      ) : lista.map(m => {
        const estado = m.estado || 'nuevo'
        const colTipo = COLOR_TIPO[m.tipo] || '#94a3b8'
        return (
          <div key={m.id} className="bg-navy-800 border border-navy-700 rounded-xl p-3.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${colTipo}1a`, color: colTipo, border: `1px solid ${colTipo}4d` }}>{LABEL_TIPO[m.tipo] || m.tipo}</span>
              {m.tipo === 'reseña' && typeof m.estrellas === 'number' && (
                <span className="inline-flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => <Star key={n} size={13} className={n <= m.estrellas ? 'text-amber-400 fill-amber-400' : 'text-navy-600'} />)}
                </span>
              )}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${COLOR_ESTADO[estado]}1a`, color: COLOR_ESTADO[estado], border: `1px solid ${COLOR_ESTADO[estado]}4d` }}>{LABEL_ESTADO[estado]}</span>
              <span className="ml-auto text-[11px] text-slate-500">{fmtFechaHora(m.createdAt)}</span>
            </div>
            <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap leading-relaxed">{m.texto}</p>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="text-[11px] text-slate-300 font-medium truncate">{m.nombre || m.email}{m.nombre && m.email && <span className="text-slate-500 font-normal"> · {m.email}</span>}</span>
              <div className="ml-auto flex gap-1.5">
                {estado === 'nuevo' && (
                  <button onClick={() => actualizarEstado(m.id, 'leido')} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-navy-600 text-slate-300 flex items-center gap-1"><Check size={12} /> Leído</button>
                )}
                {estado !== 'archivado' && (
                  <button onClick={() => actualizarEstado(m.id, 'archivado')} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-navy-600 text-slate-400 flex items-center gap-1"><Archive size={12} /> Archivar</button>
                )}
                {m.email && (
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: tu mensaje en BitácoraAR')}`}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }}><Mail size={12} /> Responder</a>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Buzon({ user, esAdmin = false, mensajes = [], enviar, actualizarEstado, onCerrar }) {
  return esAdmin ? (
    <Shell title="Buzón · Bandeja de entrada" icon={Inbox} onCerrar={onCerrar}>
      <BandejaMensajes mensajes={mensajes} actualizarEstado={actualizarEstado} />
    </Shell>
  ) : (
    <Shell title="Buzón de mensajes" icon={MessageSquare} onCerrar={onCerrar}>
      <Formulario user={user} enviar={enviar} onCerrar={onCerrar} />
    </Shell>
  )
}
