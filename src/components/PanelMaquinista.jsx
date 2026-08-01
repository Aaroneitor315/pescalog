import { useState, useRef } from 'react'
import { X, Camera, Plus, Minus, Trash2, FileText, Wrench, Anchor, Loader } from 'lucide-react'
import { createWorker } from 'tesseract.js'
import { useRepuestos } from '../hooks/useRepuestos'

const SECTORES = {
  maquinas: {
    label: 'Máquinas',
    sub: 'Sala de máquinas · repuestos y filtros',
    Icon: Wrench,
    color: '#0891b2',
    colorClass: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  cubierta: {
    label: 'Cubierta',
    sub: 'Cubierta · equipos y aparejos',
    Icon: Anchor,
    color: '#10b981',
    colorClass: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  puente: {
    label: 'Puente',
    sub: 'Puente de mando · instrumental y navegación',
    Icon: ({ size, className }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 20h20M5 20V10l7-7 7 7v10M9 20v-6h6v6"/>
      </svg>
    ),
    color: '#a855f7',
    colorClass: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
}

const CATEGORIAS = ['Filtro aceite', 'Filtro combustible', 'Filtro aire', 'Filtro hidráulico', 'Correa', 'Rodamiento', 'Junta', 'Otro']

function comprimirFoto(file) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    const img = new Image()
    img.onload = () => {
      const MAX = 200
      const ratio = Math.min(MAX / img.width, MAX / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.src = URL.createObjectURL(file)
  })
}

function extraerCodigo(texto) {
  const match = texto.match(/[A-Z]{1,3}[\s-]?\d{4,8}[A-Z0-9]*/i)
  return match ? match[0].replace(/\s/g, '').toUpperCase() : ''
}

function colorStock(qty, min) {
  if (qty === 0) return { text: 'text-red-400', label: 'Pedir', bg: 'bg-red-500/10 border-red-500/30' }
  if (qty <= min) return { text: 'text-yellow-400', label: '¡Bajo!', bg: 'bg-yellow-500/10 border-yellow-500/30' }
  return { text: 'text-green-400', label: 'OK', bg: 'bg-green-500/10 border-green-500/30' }
}

function exportarPDF(repuestos) {
  const pedidos = repuestos.filter(r => r.stockActual <= r.stockMinimo)
  const html = `
    <html><head><meta charset="utf-8">
    <title>Orden de compra — BitácoraAR</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111;}
      h1{font-size:18px;margin-bottom:4px;}
      p.sub{color:#666;font-size:13px;margin-bottom:20px;}
      table{width:100%;border-collapse:collapse;font-size:13px;}
      th{background:#0a2540;color:#fff;padding:8px 10px;text-align:left;}
      td{padding:8px 10px;border-bottom:1px solid #e5e7eb;}
      img{width:48px;height:48px;object-fit:cover;border-radius:4px;}
      .badge{display:inline-block;background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:11px;}
    </style></head><body>
    <h1>Orden de compra</h1>
    <p class="sub">BitácoraAR · ${new Date().toLocaleDateString('es-AR')} · ${pedidos.length} ítem${pedidos.length !== 1 ? 's' : ''}</p>
    <table>
      <thead><tr><th>Foto</th><th>Código</th><th>Descripción</th><th>Categoría</th><th>Stock actual</th><th>A pedir</th></tr></thead>
      <tbody>
        ${pedidos.map(r => `
          <tr>
            <td>${r.foto ? `<img src="${r.foto}">` : '—'}</td>
            <td><strong>${r.codigo}</strong></td>
            <td>${r.descripcion || '—'}</td>
            <td>${r.categoria || '—'}</td>
            <td><span class="badge">${r.stockActual} ud.</span></td>
            <td><strong>${r.cantPedir || 1}</strong></td>
          </tr>`).join('')}
      </tbody>
    </table>
    </body></html>`
  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.print()
}

export default function PanelMaquinista({ uid, seccion = 'maquinas', onCerrar }) {
  const sector = SECTORES[seccion] || SECTORES.maquinas
  const { Icon } = sector
  const { repuestos, cargando, agregar, actualizarStock, actualizarCantPedir, eliminar } = useRepuestos(uid, seccion)
  const [vista, setVista] = useState('stock')
  const [ocr, setOcr] = useState({ activo: false, progreso: false, texto: '', codigo: '' })
  const [form, setForm] = useState({ codigo: '', descripcion: '', marca: '', categoria: 'Filtro aceite', stockActual: 1, stockMinimo: 1, cantPedir: 1, foto: null })
  const [modoAgregar, setModoAgregar] = useState(false)
  const [confirmarId, setConfirmarId] = useState(null)
  const fileRef = useRef()

  async function procesarFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setOcr({ activo: true, progreso: true, texto: '', codigo: '' })
    setModoAgregar(true)
    const thumb = await comprimirFoto(file)
    setForm(f => ({ ...f, foto: thumb }))
    try {
      const worker = await createWorker('eng')
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()
      const codigo = extraerCodigo(text)
      setOcr({ activo: true, progreso: false, texto: text.trim(), codigo })
      setForm(f => ({ ...f, codigo: codigo || f.codigo }))
    } catch {
      setOcr({ activo: true, progreso: false, texto: '', codigo: '' })
    }
  }

  async function guardarRepuesto() {
    if (!form.codigo.trim()) return
    await agregar({
      codigo: form.codigo.trim().toUpperCase(),
      descripcion: form.descripcion.trim(),
      marca: form.marca.trim(),
      categoria: form.categoria,
      stockActual: Number(form.stockActual),
      stockMinimo: Number(form.stockMinimo),
      cantPedir: Number(form.cantPedir),
      foto: form.foto || null,
    })
    setModoAgregar(false)
    setOcr({ activo: false, progreso: false, texto: '', codigo: '' })
    setForm({ codigo: '', descripcion: '', marca: '', categoria: 'Filtro aceite', stockActual: 1, stockMinimo: 1, cantPedir: 1, foto: null })
  }

  const pendientes = repuestos.filter(r => r.stockActual <= r.stockMinimo)

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#070f1e' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700 bg-navy-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${sector.bg} border ${sector.border} flex items-center justify-center`}>
            <Icon size={18} className={sector.colorClass} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{sector.label} · Repuestos</p>
            <p className="text-xs text-slate-500">{repuestos.length} repuesto{repuestos.length !== 1 ? 's' : ''} · {pendientes.length} alerta{pendientes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={onCerrar} className="btn-ghost p-2 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-navy-700 bg-navy-800 flex-shrink-0">
        {[['stock', 'Stock actual'], ['pedido', 'Orden de compra']].map(([id, label]) => (
          <button key={id} onClick={() => setVista(id)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${vista === id ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
            {label}
            {id === 'pedido' && pendientes.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pendientes.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto">

        {/* ===== VISTA STOCK ===== */}
        {vista === 'stock' && (
          <div>
            {/* Botón agregar / formulario */}
            {!modoAgregar ? (
              <div className="p-4">
                <button onClick={() => setModoAgregar(true)}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-navy-600 hover:border-cyan-500/50 text-slate-500 hover:text-cyan-400 py-3 rounded-xl transition-colors text-sm">
                  <Camera size={16} /> Fotografiar / agregar repuesto
                </button>
              </div>
            ) : (
              <div className="m-4 bg-navy-800 border border-navy-700 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nuevo repuesto</p>

                {/* Foto + OCR */}
                <div className="flex gap-3">
                  <button onClick={() => fileRef.current.click()}
                    className="w-16 h-16 rounded-lg bg-navy-700 border border-navy-600 flex flex-col items-center justify-center gap-1 flex-shrink-0 overflow-hidden">
                    {form.foto
                      ? <img src={form.foto} className="w-full h-full object-cover rounded-lg" />
                      : <><Camera size={20} className="text-slate-500" /><span className="text-[9px] text-slate-600">Foto</span></>
                    }
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={procesarFoto} />
                  <div className="flex-1 bg-navy-700/50 rounded-lg px-3 py-2 flex flex-col justify-center">
                    {ocr.progreso
                      ? <div className="flex items-center gap-2 text-xs text-slate-400"><Loader size={13} className="animate-spin" /> Leyendo código...</div>
                      : ocr.codigo
                        ? <><p className="text-[10px] text-slate-500">Código detectado</p><p className="text-sm font-bold text-cyan-400">{ocr.codigo}</p><p className="text-[10px] text-green-500">OCR automático</p></>
                        : <p className="text-xs text-slate-500">Sacá una foto para detectar el código</p>
                    }
                  </div>
                </div>

                {/* Campos */}
                <input placeholder="Código *  (ej: P553000)" value={form.codigo}
                  onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                  className="text-sm" />
                <input placeholder="Descripción" value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Marca" value={form.marca}
                    onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
                    className="text-sm" />
                  <select value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="text-sm">
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[10px] text-slate-500 mb-0.5">Stock inicial</label>
                    <input type="number" min="0" value={form.stockActual}
                      onChange={e => setForm(f => ({ ...f, stockActual: e.target.value }))} className="text-sm" /></div>
                  <div><label className="text-[10px] text-slate-500 mb-0.5">Mínimo</label>
                    <input type="number" min="0" value={form.stockMinimo}
                      onChange={e => setForm(f => ({ ...f, stockMinimo: e.target.value }))} className="text-sm" /></div>
                  <div><label className="text-[10px] text-slate-500 mb-0.5">A pedir</label>
                    <input type="number" min="1" value={form.cantPedir}
                      onChange={e => setForm(f => ({ ...f, cantPedir: e.target.value }))} className="text-sm" /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setModoAgregar(false); setOcr({ activo: false, progreso: false, texto: '', codigo: '' }); setForm({ codigo: '', descripcion: '', marca: '', categoria: 'Filtro aceite', stockActual: 1, stockMinimo: 1, cantPedir: 1, foto: null }) }}
                    className="flex-1 btn-ghost py-2 text-sm rounded-lg">Cancelar</button>
                  <button onClick={guardarRepuesto} disabled={!form.codigo.trim()}
                    className="flex-1 btn-primary py-2 text-sm disabled:opacity-40">Guardar</button>
                </div>
              </div>
            )}

            {/* Lista de repuestos */}
            {cargando ? (
              <div className="text-center py-12 text-slate-500 text-sm">Cargando...</div>
            ) : repuestos.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-sm px-8">
                Todavía no hay repuestos.<br />Fotografiá el primero con el botón de arriba.
              </div>
            ) : (
              <div className="divide-y divide-navy-700">
                {repuestos.map(r => {
                  const c = colorStock(r.stockActual, r.stockMinimo)
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 rounded-lg bg-navy-700 border border-navy-600 flex-shrink-0 overflow-hidden">
                        {r.foto
                          ? <img src={r.foto} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-slate-600 text-lg">🔧</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{r.codigo}</p>
                        <p className="text-xs text-slate-500 truncate">{[r.marca, r.descripcion].filter(Boolean).join(' · ') || r.categoria}</p>
                      </div>
                      {/* Controles stock */}
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => actualizarStock(r.id, Math.max(0, r.stockActual - 1))}
                          className="w-7 h-7 rounded-lg bg-navy-700 border border-navy-600 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                          <Minus size={12} />
                        </button>
                        <span className={`text-sm font-bold w-6 text-center ${c.text}`}>{r.stockActual}</span>
                        <button onClick={() => actualizarStock(r.id, r.stockActual + 1)}
                          className="w-7 h-7 rounded-lg bg-navy-700 border border-navy-600 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                          <Plus size={12} />
                        </button>
                      </div>
                      {/* Badge estado */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} w-10 text-center`}>{c.label}</span>
                      {/* Eliminar */}
                      {confirmarId === r.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => { eliminar(r.id); setConfirmarId(null) }}
                            className="text-[10px] bg-red-600 text-white px-2 py-1 rounded">Sí</button>
                          <button onClick={() => setConfirmarId(null)}
                            className="text-[10px] bg-navy-700 text-slate-400 px-2 py-1 rounded">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmarId(r.id)} className="btn-ghost p-1 rounded">
                          <Trash2 size={13} className="text-slate-600 hover:text-red-400" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== VISTA ORDEN DE COMPRA ===== */}
        {vista === 'pedido' && (
          <div>
            {pendientes.length === 0 ? (
              <div className="text-center py-16 px-8 text-slate-600 text-sm">
                Todo el stock está OK.<br />No hay repuestos que pedir.
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 px-4 pt-4 pb-2">Repuestos con stock igual o menor al mínimo configurado</p>
                <div className="divide-y divide-navy-700">
                  {pendientes.map(r => {
                    const c = colorStock(r.stockActual, r.stockMinimo)
                    return (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-10 h-10 rounded-lg bg-navy-700 border border-navy-600 flex-shrink-0 overflow-hidden">
                          {r.foto
                            ? <img src={r.foto} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-slate-600 text-lg">🔧</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white">{r.codigo}</p>
                          <p className="text-xs text-slate-500">{r.marca || ''} {r.descripcion || r.categoria}</p>
                          <p className={`text-xs ${c.text}`}>Stock: {r.stockActual} ud. (mínimo {r.stockMinimo})</p>
                        </div>
                        {/* Cantidad a pedir */}
                        <div className="flex flex-col items-center gap-0.5">
                          <p className="text-[9px] text-slate-600">Pedir</p>
                          <div className="flex items-center gap-1">
                            <button onClick={() => actualizarCantPedir(r.id, Math.max(1, (r.cantPedir || 1) - 1))}
                              className="w-6 h-6 rounded bg-navy-700 border border-navy-600 flex items-center justify-center text-slate-400">
                              <Minus size={10} />
                            </button>
                            <span className="text-sm font-bold text-white w-5 text-center">{r.cantPedir || 1}</span>
                            <button onClick={() => actualizarCantPedir(r.id, (r.cantPedir || 1) + 1)}
                              className="w-6 h-6 rounded bg-navy-700 border border-navy-600 flex items-center justify-center text-slate-400">
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer fijo */}
      <div className="flex-shrink-0 border-t border-navy-700 bg-navy-800 p-4">
        {vista === 'stock' && (
          <div className="flex justify-between items-center text-sm">
            <div>
              <span className="text-slate-500 text-xs">Total stock</span>
              <p className="text-white font-semibold">{repuestos.reduce((s, r) => s + r.stockActual, 0)} unidades · {repuestos.length} tipos</p>
            </div>
            {pendientes.length > 0 && (
              <span className="text-xs text-red-400 font-medium">{pendientes.length} bajo mínimo</span>
            )}
          </div>
        )}
        {vista === 'pedido' && pendientes.length > 0 && (
          <button onClick={() => exportarPDF(repuestos)}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm">
            <FileText size={16} /> Exportar orden de compra PDF
          </button>
        )}
      </div>
    </div>
  )
}
