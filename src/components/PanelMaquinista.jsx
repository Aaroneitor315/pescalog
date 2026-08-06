import { useState, useRef, useEffect } from 'react'
import { X, Camera, Plus, Minus, Trash2, FileText, Wrench, Anchor, Loader, Pencil, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { createWorker } from 'tesseract.js'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { getDoc, setDoc, doc } from 'firebase/firestore'
import { storage, db } from '../firebase'
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

const CATEGORIAS_MAQUINAS = ['Filtro aceite', 'Filtro combustible', 'Filtro aire', 'Filtro hidráulico', 'Correa', 'Rodamiento', 'Junta', 'Otro']
const CATEGORIAS_CUBIERTA = ['Cable acero', 'Malleta', 'Grillete', 'Brida', 'Cable combinado', 'Cabo culo bolsa', 'Francés', 'Euroline', 'Otro']

let _ocrWorker = null

async function getOCRWorker() {
  if (_ocrWorker) return _ocrWorker
  _ocrWorker = await createWorker('eng')
  return _ocrWorker
}

function preprocesarImagen(file) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX_PX = 800
      const escala = Math.min(1.5, MAX_PX / Math.max(img.width, img.height))
      canvas.width = Math.round(img.width * escala)
      canvas.height = Math.round(img.height * escala)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]
        const c = lum < 140
          ? Math.max(0, lum * 0.5)
          : Math.min(255, 128 + (lum - 128) * 1.8)
        d[i] = d[i+1] = d[i+2] = c
      }
      ctx.putImageData(imageData, 0, 0)
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.88)
    }
    img.src = URL.createObjectURL(file)
  })
}

function comprimirFoto(file) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    const img = new Image()
    img.onload = () => {
      const MAX = 400
      const ratio = Math.min(MAX / img.width, MAX / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.75)
    }
    img.src = URL.createObjectURL(file)
  })
}

async function subirFoto(uid, seccion, blob) {
  const nombre = `repuestos/${uid}/${seccion}/${Date.now()}.jpg`
  const storageRef = ref(storage, nombre)
  await uploadBytes(storageRef, blob)
  return await getDownloadURL(storageRef)
}

async function eliminarFotoStorage(url) {
  if (!url || url.startsWith('data:')) return
  try {
    const storageRef = ref(storage, url)
    await deleteObject(storageRef)
  } catch {}
}

function normalizarOCR(texto) {
  return texto
    .replace(/0/g, '0')       // mantener ceros
    .replace(/\bO(?=\d)/g, '0')  // O seguida de dígito → 0
    .replace(/(?<=\d)O\b/g, '0') // O precedida de dígito → 0
    .replace(/[|l1]/g, v => v === '|' || v === 'l' ? '1' : v)
    .replace(/(?<=[A-Z\d])[Il](?=[A-Z\d])/g, '1')
    // En contexto de código: R al inicio seguida de dígitos probablemente es P
    .replace(/^R(?=\d{4,})/gm, 'P')
    .replace(/\bR(?=\d{5,})/g, 'P')
}

function extraerCodigo(texto) {
  const norm = normalizarOCR(texto.toUpperCase())

  // Patrones por marca (alta prioridad, más específicos)
  const patronesMarca = [
    /\bP\d{6}\b/,                         // Donaldson: P551000
    /\b(LF|AF|FF|FS|WF|SY|HF)\d{4,5}\b/, // Fleetguard
    /\b(BT|PT|B)\d{4,5}[A-Z]?\b/,        // Baldwin
    /\b(W|H|C|HU)\d{3,6}[A-Z]?\b/,       // Mann
    /\b(WIX|51|57)\d{4}\b/,              // Wix
    /\b(RE|AM|AR|JD)\d{5,7}\b/,          // John Deere
  ]

  for (const patron of patronesMarca) {
    const match = norm.match(patron)
    if (match) return match[0].replace(/[\s.-]/g, '')
  }

  // Patrones genéricos como fallback
  const patronesGenericos = [
    /[A-Z]{1,4}[-.]?\d{4,8}[A-Z0-9]{0,3}/,
    /\d{5,10}[A-Z]{0,2}/,
    /[A-Z]{2,4}\d{3,6}/,
  ]

  for (const patron of patronesGenericos) {
    const match = norm.match(patron)
    if (match) {
      const codigo = match[0].replace(/[\s.]/g, '')
      if (codigo.length >= 5) return codigo
    }
  }
  return ''
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
  const { repuestos, cargando, agregar, editar, actualizarStock, actualizarCantPedir, eliminar } = useRepuestos(uid, seccion)
  const vistaInicial = 'stock'
  const [vista, setVista] = useState(vistaInicial)
  const [ocr, setOcr] = useState({ activo: false, progreso: false, texto: '', codigo: '' })
  const CATEGORIAS = seccion === 'maquinas' ? CATEGORIAS_MAQUINAS : CATEGORIAS_CUBIERTA
  const catDefault = CATEGORIAS[0]
  const [form, setForm] = useState({ codigo: '', descripcion: '', marca: '', categoria: catDefault, stockActual: 1, stockMinimo: 1, cantPedir: 1, foto: null, fotoBlob: null, fotoPreview: null })
  const [modoAgregar, setModoAgregar] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [confirmarId, setConfirmarId] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const fileRef = useRef()


  // Ficha técnica motor (solo maquinas)
  const fichaMotorVacia = {
    motorPrincipal: { marca: '', modelo: '', potenciaHP: '', potenciaKW: '', cilindrada: '', rpmMax: '', nroSerie: '', año: '' },
    auxiliar1: { marca: '', modelo: '', potenciaHP: '', potenciaKW: '' },
    auxiliar2: { marca: '', modelo: '', potenciaHP: '', potenciaKW: '' },
  }
  const [fichaMotor, setFichaMotor] = useState(fichaMotorVacia)
  const [fichaMotorGuardando, setFichaMotorGuardando] = useState(false)
  const [fichaMotorGuardado, setFichaMotorGuardado] = useState(false)

  // Artes de pesca (compartido cubierta + puente, mismo doc en Firestore)
  const artesVacio = {
    warps: { longitud: '', diametro: '', material: '' },
    portones: { peso: '', envergadura: '', tipo: '', angulo: '' },
    malletas: { longitud: '', diametro: '' },
    red: { aberturaH: '', aberturaV: '', mallasCuerpo: '', mallasSaco: '' },
  }
  const [artes, setArtes] = useState(artesVacio)
  const [artesGuardando, setArtesGuardando] = useState(false)
  const [artesGuardado, setArtesGuardado] = useState(false)
  const [artesExpandido, setArtesExpandido] = useState({ warps: true, portones: false, malletas: false, red: false })

  useEffect(() => {
    if (!uid) return
    if (seccion === 'maquinas') {
      getDoc(doc(db, 'usuarios', uid, 'fichas', 'maquinas')).then(snap => {
        if (snap.exists()) setFichaMotor({ ...fichaMotorVacia, ...snap.data() })
      }).catch(() => {})
    }
    if (seccion === 'cubierta' || seccion === 'puente') {
      getDoc(doc(db, 'usuarios', uid, 'fichas', 'artes_pesca')).then(snap => {
        if (snap.exists()) setArtes({ ...artesVacio, ...snap.data() })
      }).catch(() => {})
    }
  }, [uid, seccion])

  async function guardarFichaMotor() {
    setFichaMotorGuardando(true)
    try {
      await setDoc(doc(db, 'usuarios', uid, 'fichas', 'maquinas'), fichaMotor, { merge: true })
      setFichaMotorGuardado(true)
      setTimeout(() => setFichaMotorGuardado(false), 2000)
    } finally {
      setFichaMotorGuardando(false)
    }
  }

  async function guardarArtes() {
    setArtesGuardando(true)
    try {
      await setDoc(doc(db, 'usuarios', uid, 'fichas', 'artes_pesca'), artes, { merge: true })
      setArtesGuardado(true)
      setTimeout(() => setArtesGuardado(false), 2000)
    } finally {
      setArtesGuardando(false)
    }
  }


  function setMotor(motor, campo, valor) {
    setFichaMotor(f => ({ ...f, [motor]: { ...f[motor], [campo]: valor } }))
  }

  function setArte(arte, campo, valor) {
    setArtes(a => ({ ...a, [arte]: { ...a[arte], [campo]: valor } }))
  }

  function abrirEdicion(r) {
    setEditandoId(r.id)
    setForm({
      codigo: r.codigo || '',
      descripcion: r.descripcion || '',
      marca: r.marca || '',
      categoria: r.categoria || catDefault,
      stockActual: r.stockActual ?? 1,
      stockMinimo: r.stockMinimo ?? 1,
      cantPedir: r.cantPedir ?? 1,
      foto: r.foto || null,
    })
    setModoAgregar(true)
  }

  const resetForm = () => setForm({ codigo: '', descripcion: '', marca: '', categoria: catDefault, stockActual: 1, stockMinimo: 1, cantPedir: 1, foto: null, fotoBlob: null, fotoPreview: null })

  async function guardarEdicion() {
    if (!form.codigo.trim()) return
    setSubiendo(true)
    let fotoUrl = form.foto
    if (form.fotoBlob) {
      const viejoRepuesto = repuestos.find(r => r.id === editandoId)
      await eliminarFotoStorage(viejoRepuesto?.foto)
      fotoUrl = await subirFoto(uid, seccion, form.fotoBlob)
    }
    await editar(editandoId, {
      codigo: form.codigo.trim().toUpperCase(),
      descripcion: form.descripcion.trim(),
      marca: form.marca.trim(),
      categoria: form.categoria,
      stockActual: Number(form.stockActual),
      stockMinimo: Number(form.stockMinimo),
      cantPedir: Number(form.cantPedir),
      foto: fotoUrl || null,
    })
    setSubiendo(false)
    setModoAgregar(false)
    setEditandoId(null)
    resetForm()
  }

  async function procesarFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setOcr({ activo: true, progreso: true, texto: '', codigo: '' })
    setModoAgregar(true)
    const blob = await comprimirFoto(file)
    const preview = URL.createObjectURL(blob)
    setForm(f => ({ ...f, fotoBlob: blob, fotoPreview: preview, foto: preview }))
    try {
      const imagenProcesada = await preprocesarImagen(file)
      const worker = await getOCRWorker()
      await worker.setParameters({ tessedit_pageseg_mode: '11' })
      const { data: { text } } = await worker.recognize(imagenProcesada)
      const codigo = extraerCodigo(text)
      setOcr({ activo: true, progreso: false, texto: text.trim(), codigo })
      setForm(f => ({ ...f, codigo: codigo || f.codigo }))
    } catch {
      setOcr({ activo: true, progreso: false, texto: '', codigo: '' })
    }
  }

  async function guardarRepuesto() {
    if (!form.codigo.trim()) return
    setSubiendo(true)
    let fotoUrl = null
    if (form.fotoBlob) {
      fotoUrl = await subirFoto(uid, seccion, form.fotoBlob)
    }
    await agregar({
      codigo: form.codigo.trim().toUpperCase(),
      descripcion: form.descripcion.trim(),
      marca: form.marca.trim(),
      categoria: form.categoria,
      stockActual: Number(form.stockActual),
      stockMinimo: Number(form.stockMinimo),
      cantPedir: Number(form.cantPedir),
      foto: fotoUrl || null,
    })
    setSubiendo(false)
    setModoAgregar(false)
    setOcr({ activo: false, progreso: false, texto: '', codigo: '' })
    resetForm()
  }

  const pendientes = repuestos.filter(r => r.stockActual <= r.stockMinimo)

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#070f1e', paddingTop: 'env(safe-area-inset-top, 0px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700 bg-navy-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${sector.bg} border ${sector.border} flex items-center justify-center`}>
            <Icon size={18} className={sector.colorClass} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{sector.label}</p>
            <p className="text-xs text-slate-500">{repuestos.length} repuesto{repuestos.length !== 1 ? 's' : ''} · {pendientes.length} alerta{pendientes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={onCerrar} className="btn-ghost p-2 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-navy-700 bg-navy-800 flex-shrink-0 overflow-x-auto scrollbar-none">
        {[
          ['stock', 'Repuestos'],
          ['pedido', 'Orden compra'],
          ...(seccion === 'maquinas' ? [['ficha', 'Ficha motor']] : []),
          ...(seccion === 'cubierta' || seccion === 'puente' ? [['artes', 'Artes de pesca']] : []),
        ].map(([id, label]) => (
          <button key={id} onClick={() => setVista(id)}
            className={`flex-shrink-0 flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${vista === id ? sector.colorClass : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
            style={vista === id ? { borderBottomColor: sector.color } : {}}>
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
                <button onClick={() => { setEditandoId(null); setModoAgregar(true) }}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-navy-600 hover:border-cyan-500/50 text-slate-500 hover:text-cyan-400 py-3 rounded-xl transition-colors text-sm">
                  <Camera size={16} /> Fotografiar / agregar repuesto
                </button>
              </div>
            ) : (
              <div className="m-4 bg-navy-800 border border-navy-700 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {editandoId ? 'Editar repuesto' : 'Nuevo repuesto'}
                </p>

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
                        ? <><p className="text-[10px] text-slate-500">Código detectado</p><p className="text-sm font-bold text-cyan-400">{ocr.codigo}</p><p className="text-[10px] text-green-500">OCR automático · verificá antes de guardar</p></>
                        : <>
                            <p className="text-xs text-slate-400 font-medium">Foto del código</p>
                            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">· De frente, a 15–20 cm<br/>· Buena luz, sin reflejo<br/>· Enfocá solo el número</p>
                          </>
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
                  <button onClick={() => { setModoAgregar(false); setEditandoId(null); setOcr({ activo: false, progreso: false, texto: '', codigo: '' }); resetForm() }}
                    className="flex-1 btn-ghost py-2 text-sm rounded-lg">Cancelar</button>
                  <button onClick={editandoId ? guardarEdicion : guardarRepuesto} disabled={!form.codigo.trim() || subiendo}
                    className="flex-1 btn-primary py-2 text-sm disabled:opacity-40">
                    {subiendo ? 'Subiendo...' : editandoId ? 'Guardar cambios' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            {/* Mini stats siempre visibles */}
            <div className="grid grid-cols-3 gap-0 border-b border-navy-700 mx-0">
              {[
                { label: 'Ítems', val: repuestos.length, color: '#94a3b8' },
                { label: 'En stock', val: repuestos.reduce((s,r) => s + r.stockActual, 0), color: '#34d399' },
                { label: 'Alertas', val: pendientes.length, color: pendientes.length > 0 ? '#f87171' : '#94a3b8' },
              ].map((s, i) => (
                <div key={s.label} className="text-center py-3" style={{borderRight: i < 2 ? '1px solid #112240' : 'none'}}>
                  <p className="text-xl font-black" style={{color: s.color}}>{cargando ? '—' : s.val}</p>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Cabecera de columnas */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-navy-700/50">
              <div className="w-10 flex-shrink-0" />
              <div className="flex-1 text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Código · Descripción</div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold w-16 text-center">Stock</div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold w-12 text-center">Estado</div>
              <div className="w-12" />
            </div>

            {/* Lista de repuestos */}
            {cargando ? (
              <div className="divide-y divide-navy-700">
                {[0,1,2].map(i => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="w-10 h-10 rounded-lg bg-navy-700 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-navy-700 rounded w-24" />
                      <div className="h-2 bg-navy-700 rounded w-36" />
                    </div>
                    <div className="h-5 bg-navy-700 rounded w-16" />
                    <div className="h-5 bg-navy-700 rounded w-12" />
                  </div>
                ))}
              </div>
            ) : repuestos.length === 0 ? (
              <div>
                {/* Skeleton fantasma — 3 filas vacías */}
                {[0,1,2].map(i => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-navy-700/30" style={{opacity: 1 - i * 0.25}}>
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{background:'#112240',border:'1px dashed #1e3a5f'}}>
                      <span className="text-slate-700 text-xs">IMG</span>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 rounded" style={{background:'#112240',width: i === 0 ? '40%' : i === 1 ? '55%' : '35%'}} />
                      <div className="h-2 rounded" style={{background:'#0d1829',width: i === 0 ? '60%' : i === 1 ? '45%' : '50%'}} />
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-7 h-7 rounded-lg" style={{background:'#112240'}} />
                      <div className="w-5 h-5 rounded" style={{background:'#0d1829'}} />
                      <div className="w-7 h-7 rounded-lg" style={{background:'#112240'}} />
                    </div>
                    <div className="w-12 h-5 rounded-full" style={{background:'#112240'}} />
                  </div>
                ))}
                <div className="text-center py-6 px-8">
                  <p className="text-slate-600 text-xs">La planilla se completa al cargar el primer repuesto</p>
                  <p className="text-slate-700 text-xs mt-1">Usá el botón de cámara para empezar</p>
                </div>
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
                      {/* Editar / Eliminar */}
                      {confirmarId === r.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => { eliminar(r.id); setConfirmarId(null) }}
                            className="text-[10px] bg-red-600 text-white px-2 py-1 rounded">Sí</button>
                          <button onClick={() => setConfirmarId(null)}
                            className="text-[10px] bg-navy-700 text-slate-400 px-2 py-1 rounded">No</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => abrirEdicion(r)} className="btn-ghost p-1 rounded" title="Editar">
                            <Pencil size={13} className="text-cyan-400" />
                          </button>
                          <button onClick={() => setConfirmarId(r.id)} className="btn-ghost p-1 rounded" title="Eliminar">
                            <Trash2 size={13} className="text-slate-600 hover:text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== VISTA FICHA MOTOR (solo maquinas) ===== */}
        {vista === 'ficha' && seccion === 'maquinas' && (
          <div className="p-4 space-y-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Datos técnicos del motor · se guardan por barco</p>

            {[
              { key: 'motorPrincipal', title: 'Motor principal', fields: [
                { k: 'marca', label: 'Marca', placeholder: 'Caterpillar, MAN, Volvo...' },
                { k: 'modelo', label: 'Modelo', placeholder: '3412, D2868, D13...' },
                { k: 'potenciaHP', label: 'Potencia (HP)', placeholder: '820', type: 'number' },
                { k: 'potenciaKW', label: 'Potencia (kW)', placeholder: '612', type: 'number' },
                { k: 'cilindrada', label: 'Cilindrada (L)', placeholder: '27.0', type: 'number' },
                { k: 'rpmMax', label: 'RPM máximas', placeholder: '2100', type: 'number' },
                { k: 'nroSerie', label: 'Nº de serie', placeholder: 'CAT-XXXXXX' },
                { k: 'año', label: 'Año', placeholder: '2012', type: 'number' },
              ]},
              { key: 'auxiliar1', title: 'Auxiliar 1', fields: [
                { k: 'marca', label: 'Marca', placeholder: 'Volvo, Perkins...' },
                { k: 'modelo', label: 'Modelo', placeholder: '' },
                { k: 'potenciaHP', label: 'Potencia (HP)', placeholder: '', type: 'number' },
                { k: 'potenciaKW', label: 'Potencia (kW)', placeholder: '', type: 'number' },
              ]},
              { key: 'auxiliar2', title: 'Auxiliar 2', fields: [
                { k: 'marca', label: 'Marca', placeholder: '' },
                { k: 'modelo', label: 'Modelo', placeholder: '' },
                { k: 'potenciaHP', label: 'Potencia (HP)', placeholder: '', type: 'number' },
                { k: 'potenciaKW', label: 'Potencia (kW)', placeholder: '', type: 'number' },
              ]},
            ].map(({ key, title, fields }) => (
              <div key={key} className="bg-navy-800 border border-navy-700 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{title}</p>
                <div className="grid grid-cols-2 gap-2">
                  {fields.map(f => (
                    <div key={f.k}>
                      <label className="text-[10px] text-slate-500 mb-0.5 block">{f.label}</label>
                      <input
                        type={f.type || 'text'}
                        placeholder={f.placeholder}
                        value={fichaMotor[key]?.[f.k] || ''}
                        onChange={e => setMotor(key, f.k, e.target.value)}
                        className="text-sm w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={guardarFichaMotor}
              disabled={fichaMotorGuardando}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm"
              style={{ background: fichaMotorGuardado ? '#059669' : undefined }}>
              {fichaMotorGuardando
                ? <><Loader size={15} className="animate-spin" /> Guardando...</>
                : fichaMotorGuardado
                  ? '✓ Guardado'
                  : <><Save size={15} /> Guardar ficha técnica</>
              }
            </button>
          </div>
        )}

        {/* ===== VISTA ARTES DE PESCA (cubierta + puente, datos compartidos) ===== */}
        {vista === 'artes' && (seccion === 'cubierta' || seccion === 'puente') && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest flex-1">Medidas del arte de pesca · compartido cubierta y puente</p>
              <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: '#6d28d920', color: '#c084fc', border: '1px solid #6d28d940' }}>Datos compartidos</span>
            </div>

            {[
              {
                key: 'warps', title: 'Warps · Cables de arrastre', color: '#f59e0b',
                fields: [
                  { k: 'longitud', label: 'Longitud (m)', placeholder: '600', type: 'number' },
                  { k: 'diametro', label: 'Diámetro (mm)', placeholder: '24', type: 'number' },
                  { k: 'material', label: 'Material', placeholder: 'Acero 6×36 IWRC' },
                ],
              },
              {
                key: 'portones', title: 'Portones · Otter boards', color: '#06b6d4',
                fields: [
                  { k: 'peso', label: 'Peso (kg)', placeholder: '800', type: 'number' },
                  { k: 'envergadura', label: 'Envergadura (m²)', placeholder: '4.5', type: 'number' },
                  { k: 'tipo', label: 'Tipo', placeholder: 'Polyvalent, Baca, Oval...' },
                  { k: 'angulo', label: 'Ángulo ataque (°)', placeholder: '45', type: 'number' },
                ],
              },
              {
                key: 'malletas', title: 'Malletas · Bridas', color: '#10b981',
                fields: [
                  { k: 'longitud', label: 'Longitud (m)', placeholder: '120', type: 'number' },
                  { k: 'diametro', label: 'Diámetro (mm)', placeholder: '18', type: 'number' },
                ],
              },
              {
                key: 'red', title: 'Red · Aparejo', color: '#a855f7',
                fields: [
                  { k: 'aberturaH', label: 'Abertura horiz. (m)', placeholder: '28', type: 'number' },
                  { k: 'aberturaV', label: 'Abertura vert. (m)', placeholder: '4', type: 'number' },
                  { k: 'mallasCuerpo', label: 'Malla cuerpo (mm)', placeholder: '110', type: 'number' },
                  { k: 'mallasSaco', label: 'Malla saco (mm)', placeholder: '60', type: 'number' },
                ],
              },
            ].map(({ key, title, color, fields }) => {
              const abierto = artesExpandido[key]
              return (
                <div key={key} className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3"
                    onClick={() => setArtesExpandido(e => ({ ...e, [key]: !e[key] }))}>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{title}</p>
                    {abierto ? <ChevronUp size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
                  </button>
                  {abierto && (
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-2 gap-2">
                        {fields.map(f => (
                          <div key={f.k}>
                            <label className="text-[10px] text-slate-500 mb-0.5 block">{f.label}</label>
                            <input
                              type={f.type || 'text'}
                              placeholder={f.placeholder}
                              value={artes[key]?.[f.k] || ''}
                              onChange={e => setArte(key, f.k, e.target.value)}
                              className="text-sm w-full"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <button
              onClick={guardarArtes}
              disabled={artesGuardando}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm"
              style={{ background: artesGuardado ? '#059669' : undefined }}>
              {artesGuardando
                ? <><Loader size={15} className="animate-spin" /> Guardando...</>
                : artesGuardado
                  ? '✓ Guardado'
                  : <><Save size={15} /> Guardar artes de pesca</>
              }
            </button>
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
