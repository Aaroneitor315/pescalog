import { useState, useRef, useEffect } from 'react'
import { X, Camera, Plus, Minus, Trash2, Wrench, Anchor, Loader, Pencil, Save, Search, AlertTriangle, Check, Copy, MessageCircle, Package, ClipboardCheck, ChevronDown, ChevronUp, Play, Square } from 'lucide-react'
import { createWorker } from 'tesseract.js'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { getDoc, setDoc, doc } from 'firebase/firestore'
import { storage, db } from '../firebase'
import { useRepuestos } from '../hooks/useRepuestos'
import StatusPill, { estadoStock, colorEstado } from './StatusPill'
import SalaMaquinas from './SalaMaquinas'
import { estadoTarea, estadoMotor, motorTieneAlerta, fechaEstimadaProximo, horasActuales } from '../lib/motores'

// Cada sección aporta su color de acento. Se expone como variables CSS
// (--accent / --accent-soft / --accent-line) en la raíz del modal, así el resto
// de la UI usa el mismo acento sin repetir clases por sección.
const SECTORES = {
  maquinas: {
    label: 'Máquinas',
    sub: 'Sala de máquinas · repuestos y filtros',
    Icon: Wrench,
    accent: '#22d3ee',                     // cyan
    accentSoft: 'rgba(34,211,238,0.10)',
    accentLine: 'rgba(34,211,238,0.30)',
  },
  cubierta: {
    label: 'Cubierta',
    sub: 'Cubierta · equipos y aparejos',
    Icon: Anchor,
    accent: '#34d399',                     // esmeralda
    accentSoft: 'rgba(52,211,153,0.10)',
    accentLine: 'rgba(52,211,153,0.30)',
  },
  puente: {
    label: 'Puente',
    sub: 'Puente de mando · instrumental y navegación',
    Icon: ({ size, className, style }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
        <path d="M2 20h20M5 20V10l7-7 7 7v10M9 20v-6h6v6"/>
      </svg>
    ),
    accent: '#a855f7',                     // violeta
    accentSoft: 'rgba(168,85,247,0.10)',
    accentLine: 'rgba(168,85,247,0.30)',
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

// Normaliza para búsqueda: minúsculas y sin acentos.
const sinAcentos = (s) => (s ?? '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Condición de un arte de pesca (equivalente al "estado" del stock).
const CONDICIONES = {
  ok:      { label: 'En condición', color: '#34d399' },
  revisar: { label: 'A revisar',    color: '#fbbf24' },
  fuera:   { label: 'Fuera de uso', color: '#f87171' },
}
const TIPOS_ARTE = ['Red', 'Puertas', 'Malleta', 'Cabo', 'Cable', 'Grillete', 'Boya', 'Otro']
const ICONO_ARTE = { Red: '🕸️', Puertas: '🚪', Malleta: '🪢', Cabo: '🪢', Cable: '🔗', Grillete: '⛓️', Boya: '🟠', Otro: '⚓' }

const fmtDDMM = (d) => d ? `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}` : null
const hoyISO = () => new Date().toISOString().slice(0, 10)

// ── Modelo de motores (lista por barco) + migración desde la ficha vieja ──────
function nuevoId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
const IDENT_VACIA = { marca: '', modelo: '', serie: '', potenciaKw: '', anio: '', combustible: '', reductor: '', relacion: '' }
function motorVacio(rol = 'principal', nombre = 'Motor principal') {
  return { id: nuevoId(), rol, nombre, identificacion: { ...IDENT_VACIA }, horas: '', tareas: [] }
}
// Convierte la ficha vieja (motor único) en lista de motores. Idempotente:
// si ya hay `motores`, la devuelve sin tocar.
function migrarAMotores(data) {
  if (Array.isArray(data.motores)) return data.motores
  const mp = data.motorPrincipal || {}
  const tareas = []
  if (data.intervaloAceite || data.horasUltimoAceite) {
    tareas.push({ id: nuevoId(), nombre: 'Cambio de aceite', intervaloHs: data.intervaloAceite ?? '', ultimoHs: data.horasUltimoAceite ?? '', ultimaFecha: '', historial: [], codigo: '' })
  }
  ;(data.mantenimiento || []).forEach(t => {
    const cada = Number(t.cada) || 0
    const prox = Number(t.proximo) || 0
    tareas.push({ id: nuevoId(), nombre: t.tarea || '', intervaloHs: t.cada ?? '', ultimoHs: (prox && cada) ? String(prox - cada) : '', ultimaFecha: '', historial: [], codigo: t.codigo || '' })
  })
  const motores = [{
    id: nuevoId(), rol: 'principal', nombre: 'Motor principal',
    identificacion: {
      marca: mp.marca || '', modelo: mp.modelo || '', serie: mp.nroSerie || '',
      potenciaKw: mp.potenciaKW || '', anio: mp.año || '', combustible: mp.combustible || '',
      reductor: mp.reductor || '', relacion: mp.relacion || '',
      // Extras conservados (no se pierden aunque la UI nueva no los muestre):
      potenciaHp: mp.potenciaHP || '', cilindrada: mp.cilindrada || '', rpmMax: mp.rpmMax || '',
    },
    horas: data.horasMarcha ?? '',
    tareas,
  }]
  ;['auxiliar1', 'auxiliar2'].forEach((k, i) => {
    const a = data[k] || {}
    if (a.marca || a.modelo || a.potenciaKW || a.potenciaHP) {
      motores.push({
        id: nuevoId(), rol: 'auxiliar', nombre: `Auxiliar ${i + 1}`,
        identificacion: { ...IDENT_VACIA, marca: a.marca || '', modelo: a.modelo || '', potenciaKw: a.potenciaKW || '', potenciaHp: a.potenciaHP || '' },
        horas: '', tareas: [],
      })
    }
  })
  return motores
}

// Empty state de la vista Repuestos: guía para cargar el primero.
function EmptyRepuestos({ seccionLabel, onFoto, onManual }) {
  const pasos = [
    { n: 1, t: 'Sacá la foto', d: 'Al repuesto o a su código.' },
    { n: 2, t: 'Confirmá los datos', d: 'Código, marca, descripción y stock mínimo.' },
    { n: 3, t: 'Queda en la planilla', d: 'Y salta la alerta cuando baja del mínimo.' },
  ]
  return (
    <div className="px-6 py-10 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}>
        <Camera size={26} style={{ color: 'var(--accent)' }} />
      </div>
      <h3 className="text-white font-semibold text-base mb-1.5 text-balance">
        Cargá el primer repuesto de {seccionLabel}
      </h3>
      <p className="text-slate-400 text-sm max-w-xs mb-5 leading-relaxed">
        Sacale una foto al repuesto o a su código y lo sumamos a la planilla. La lista, el stock y las alertas se arman solos a medida que cargás.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
        <button onClick={onFoto}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--accent)', color: '#07131f' }}>
          <Camera size={16} /> Fotografiar repuesto
        </button>
        <button onClick={onManual} className="flex-1 btn-ghost py-2.5 rounded-lg text-sm">
          Cargar manualmente
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 w-full max-w-lg">
        {pasos.map(p => (
          <div key={p.n} className="bg-navy-800 border border-navy-700 rounded-xl p-3">
            <div className="w-7 h-7 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }}>
              {p.n}
            </div>
            <p className="text-white text-xs font-semibold mb-0.5">{p.t}</p>
            <p className="text-slate-500 text-[11px] leading-snug">{p.d}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Tiempo relativo corto para el footer ("hace 5 min", "hace 2 días").
function haceCuanto(date) {
  if (!date) return '—'
  const seg = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seg < 60) return 'recién'
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d} día${d === 1 ? '' : 's'}`
  const mes = Math.floor(d / 30)
  return `hace ${mes} mes${mes === 1 ? '' : 'es'}`
}

// Fila de repuesto. Mismo componente y misma data; el layout cambia por CSS:
// tarjeta vertical en mobile, fila horizontal en sm:. Hit targets ≥ 44px en mobile.
function FilaRepuesto({ r, onDec, onInc, onEdit, confirmando, onAskDelete, onConfirmDelete, onCancelDelete }) {
  const estado = estadoStock(r.stockActual, r.stockMinimo)

  const thumbEl = (
    <div className="w-[52px] h-[52px] rounded-lg bg-navy-700 border border-navy-600 flex-shrink-0 overflow-hidden">
      {r.foto
        ? <img src={r.foto} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-slate-600 text-xl">🔧</div>}
    </div>
  )
  const codigoMarca = (
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-mono font-bold text-white text-sm truncate">{r.codigo}</span>
      {r.marca && (
        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-navy-700 border border-navy-600 text-slate-400">{r.marca}</span>
      )}
    </div>
  )
  const descEl = (r.descripcion || r.categoria)
    ? <p className="text-xs text-slate-500 truncate">{r.descripcion || r.categoria}</p>
    : null
  const stepperEl = (
    <div className="inline-flex items-center rounded-lg border border-navy-600 overflow-hidden flex-shrink-0">
      <button onClick={onDec} aria-label="Restar"
        className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-navy-700 transition-colors"><Minus size={15} /></button>
      <span className="w-10 sm:w-8 text-center text-sm font-bold tabular-nums" style={{ color: colorEstado(estado) }}>{r.stockActual}</span>
      <button onClick={onInc} aria-label="Sumar"
        className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-navy-700 transition-colors"><Plus size={15} /></button>
    </div>
  )
  const minEl = <span className="text-[11px] text-slate-500 whitespace-nowrap">mínimo: {r.stockMinimo}</span>
  const actionsEl = confirmando ? (
    <div className="flex gap-1.5 flex-shrink-0">
      <button onClick={onConfirmDelete} className="text-xs font-semibold bg-red-600 text-white px-3 h-11 sm:h-8 rounded-lg">Sí</button>
      <button onClick={onCancelDelete} className="text-xs bg-navy-700 text-slate-400 px-3 h-11 sm:h-8 rounded-lg">No</button>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button onClick={onEdit} title="Editar" aria-label="Editar"
        className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg border border-navy-600 hover:border-navy-500 flex items-center justify-center transition-colors"><Pencil size={15} style={{ color: 'var(--accent)' }} /></button>
      <button onClick={onAskDelete} title="Borrar" aria-label="Borrar"
        className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg border border-navy-600 hover:border-red-500/50 flex items-center justify-center transition-colors"><Trash2 size={15} className="text-red-400" /></button>
    </div>
  )

  return (
    <>
      {/* Mobile: tarjeta vertical */}
      <div className="sm:hidden flex flex-col gap-2.5 px-4 py-3 border-b border-navy-700/40">
        <div className="flex items-center gap-3">
          {thumbEl}
          <div className="flex-1 min-w-0">{codigoMarca}</div>
          <StatusPill status={estado} />
        </div>
        {descEl && <div className="pl-[64px] -mt-1">{descEl}</div>}
        <div className="flex items-center gap-3">
          {stepperEl}
          {minEl}
          <div className="ml-auto">{actionsEl}</div>
        </div>
      </div>

      {/* sm+ : fila horizontal */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-3 border-b border-navy-700/40">
        {thumbEl}
        <div className="flex-1 min-w-0">{codigoMarca}{descEl}</div>
        {stepperEl}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <StatusPill status={estado} />
          {minEl}
        </div>
        {actionsEl}
      </div>
    </>
  )
}

export default function PanelMaquinista({ uid, seccion = 'maquinas', onCerrar }) {
  const sector = SECTORES[seccion] || SECTORES.maquinas
  const { Icon } = sector
  const { repuestos, cargando, agregar, editar, actualizarStock, eliminar } = useRepuestos(uid, seccion)
  const vistaInicial = 'stock'
  const [vista, setVista] = useState(vistaInicial)
  const [segmentoRep, setSegmentoRep] = useState('inventario') // inventario | orden
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos') // todos | ok | low | out
  const [pedidoCant, setPedidoCant] = useState({}) // cantidad a pedir por id (override del sugerido)
  const [pedidoSel, setPedidoSel] = useState({})   // selección de ítems para la orden
  const [copiado, setCopiado] = useState(false)
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
  // Ficha del barco: doc con `motores` (lista). Se conservan campos viejos por
  // compatibilidad; la UI usa `motores`.
  const [fichaMotor, setFichaMotor] = useState({ motores: [] })
  const [motorSelId, setMotorSelId] = useState('') // motor seleccionado en el esquema
  const [registro, setRegistro] = useState(null)   // { ti, fecha, horas, nota } | null
  const [histAbierto, setHistAbierto] = useState({}) // { [tareaId]: bool }
  const [addMotorOpen, setAddMotorOpen] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [fichaMotorGuardando, setFichaMotorGuardando] = useState(false)
  const [fichaMotorGuardado, setFichaMotorGuardado] = useState(false)

  // Artes de pesca (compartido cubierta + puente, mismo doc en Firestore)
  const artesVacio = {
    warps: { longitud: '', diametro: '', material: '' },
    portones: { peso: '', envergadura: '', tipo: '', angulo: '' },
    malletas: { longitud: '', diametro: '' },
    red: { aberturaH: '', aberturaV: '', mallasCuerpo: '', mallasSaco: '' },
    items: [], // inventario de artes: { id, nombre, tipo, detalle, cantidad, unidad, condicion }
  }
  const [artes, setArtes] = useState(artesVacio)
  const [busquedaArte, setBusquedaArte] = useState('')
  const [filtroArte, setFiltroArte] = useState('todas') // todas | ok | revisar | fuera
  const [modoArte, setModoArte] = useState(false)
  const [editandoArteId, setEditandoArteId] = useState(null)
  const arteVacio = { nombre: '', tipo: 'Red', detalle: '', cantidad: 1, unidad: 'u', condicion: 'ok' }
  const [formArte, setFormArte] = useState(arteVacio)

  useEffect(() => {
    if (!uid) return
    if (seccion === 'maquinas') {
      getDoc(doc(db, 'usuarios', uid, 'fichas', 'maquinas')).then(snap => {
        const data = snap.exists() ? snap.data() : {}
        const yaMigrado = Array.isArray(data.motores)
        let motores = migrarAMotores(data)
        if (motores.length === 0) motores = [motorVacio()]
        setFichaMotor({ ...data, motores })
        // Migración: escribe `motores` una sola vez por barco (doc existente sin migrar).
        if (!yaMigrado && snap.exists()) {
          setDoc(doc(db, 'usuarios', uid, 'fichas', 'maquinas'), { motores }, { merge: true }).catch(() => {})
        }
      }).catch(() => {})
    }
    if (seccion === 'cubierta' || seccion === 'puente') {
      getDoc(doc(db, 'usuarios', uid, 'fichas', 'artes_pesca')).then(snap => {
        if (snap.exists()) setArtes({ ...artesVacio, ...snap.data() })
      }).catch(() => {})
    }
  }, [uid, seccion])

  // Tick en vivo: mientras haya algún motor "en marcha", re-renderiza cada 30 s
  // para ver subir el contador de horas (no persiste; se recalcula desde el timestamp).
  const [, setTick] = useState(0)
  const hayMarcha = (fichaMotor.motores || []).some(m => m.marcha?.activo)
  useEffect(() => {
    if (!hayMarcha) return
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [hayMarcha])

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

  // Persiste la lista de artes (mismo doc, setDoc merge).
  async function persistirArtes(next) {
    setArtes(next)
    try { await setDoc(doc(db, 'usuarios', uid, 'fichas', 'artes_pesca'), next, { merge: true }) } catch { /* offline */ }
  }
  function guardarArteItem() {
    if (!formArte.nombre.trim()) return
    const items = artes.items || []
    const datos = { ...formArte, nombre: formArte.nombre.trim(), detalle: formArte.detalle.trim(), cantidad: Number(formArte.cantidad) || 0 }
    const next = editandoArteId
      ? { ...artes, items: items.map(a => a.id === editandoArteId ? { ...a, ...datos } : a) }
      : { ...artes, items: [...items, { ...datos, id: Date.now().toString() }] }
    persistirArtes(next)
    setModoArte(false); setEditandoArteId(null); setFormArte(arteVacio)
  }
  function abrirEdicionArte(a) {
    setEditandoArteId(a.id)
    setFormArte({ nombre: a.nombre || '', tipo: a.tipo || 'Red', detalle: a.detalle || '', cantidad: a.cantidad ?? 1, unidad: a.unidad || 'u', condicion: a.condicion || 'ok' })
    setModoArte(true)
  }
  function eliminarArteItem(id) {
    persistirArtes({ ...artes, items: (artes.items || []).filter(a => a.id !== id) })
    setModoArte(false); setEditandoArteId(null); setFormArte(arteVacio)
  }


  // Helpers sobre la lista de motores (idx = índice del motor).
  function setMotorIdent(idx, campo, valor) {
    setFichaMotor(f => {
      const motores = [...(f.motores || [])]
      motores[idx] = { ...motores[idx], identificacion: { ...motores[idx].identificacion, [campo]: valor } }
      return { ...f, motores }
    })
  }
  function setMotorCampo(idx, campo, valor) {
    setFichaMotor(f => {
      const motores = [...(f.motores || [])]
      motores[idx] = { ...motores[idx], [campo]: valor }
      return { ...f, motores }
    })
  }
  function setTarea(idx, ti, campo, valor) {
    setFichaMotor(f => {
      const motores = [...(f.motores || [])]
      const tareas = (motores[idx].tareas || []).map((t, j) => j === ti ? { ...t, [campo]: valor } : t)
      motores[idx] = { ...motores[idx], tareas }
      return { ...f, motores }
    })
  }
  function addTarea(idx) {
    setFichaMotor(f => {
      const motores = [...(f.motores || [])]
      const tareas = [...(motores[idx].tareas || []), { id: nuevoId(), nombre: '', intervaloHs: '', ultimoHs: '', ultimaFecha: '', historial: [], codigo: '' }]
      motores[idx] = { ...motores[idx], tareas }
      return { ...f, motores }
    })
  }
  function delTarea(idx, ti) {
    setFichaMotor(f => {
      const motores = [...(f.motores || [])]
      motores[idx] = { ...motores[idx], tareas: (motores[idx].tareas || []).filter((_, j) => j !== ti) }
      return { ...f, motores }
    })
  }
  function crearMotorExtra() {
    const nombre = (nuevoNombre || '').trim() || `Motor ${(fichaMotor.motores?.length || 0) + 1}`
    const nuevo = motorVacio('extra', nombre)
    const motores = [...(fichaMotor.motores || []), nuevo]
    setFichaMotor(f => ({ ...f, motores }))
    setDoc(doc(db, 'usuarios', uid, 'fichas', 'maquinas'), { motores }, { merge: true }).catch(() => {})
    setMotorSelId(nuevo.id)
    setAddMotorOpen(false); setNuevoNombre('')
  }
  function eliminarMotorExtra(id) {
    const motores = (fichaMotor.motores || []).filter(m => m.id !== id)
    setFichaMotor(f => ({ ...f, motores }))
    setDoc(doc(db, 'usuarios', uid, 'fichas', 'maquinas'), { motores }, { merge: true }).catch(() => {})
    if (motorSelId === id) setMotorSelId('')
  }
  function toggleNoEquipado(rol) {
    const noEquipado = { ...(fichaMotor.noEquipado || {}), [rol]: !(fichaMotor.noEquipado?.[rol]) }
    setFichaMotor(f => ({ ...f, noEquipado }))
    setDoc(doc(db, 'usuarios', uid, 'fichas', 'maquinas'), { noEquipado }, { merge: true }).catch(() => {})
  }
  // "Equipar" un slot auxiliar vacío: crea el motor auxiliar (siguiente en orden),
  // limpia el flag "no equipado" de ese slot y lo deja seleccionado para cargarlo.
  function equiparAuxiliar() {
    const lista = fichaMotor.motores || []
    const nAux = lista.filter(m => m.rol === 'auxiliar').length
    if (nAux >= 2) return
    const nuevo = motorVacio('auxiliar', `Auxiliar ${nAux + 1}`)
    const slotKey = `auxiliar${nAux + 1}`
    const noEquipado = { ...(fichaMotor.noEquipado || {}) }
    delete noEquipado[slotKey]
    const motores = [...lista, nuevo]
    setFichaMotor(f => ({ ...f, motores, noEquipado }))
    setDoc(doc(db, 'usuarios', uid, 'fichas', 'maquinas'), { motores, noEquipado }, { merge: true }).catch(() => {})
    setMotorSelId(nuevo.id)
  }
  // Arranca el conteo "en marcha" del motor idx (guarda el timestamp de inicio).
  function arrancarMotor(idx) {
    const lista = fichaMotor.motores || []
    const motores = lista.map((m, j) => j === idx
      ? { ...m, marcha: { activo: true, desde: new Date().toISOString() } } : m)
    setFichaMotor(f => ({ ...f, motores }))
    setDoc(doc(db, 'usuarios', uid, 'fichas', 'maquinas'), { motores }, { merge: true }).catch(() => {})
  }
  // Detiene el conteo: consolida las horas transcurridas en `horas` (base) y apaga marcha.
  function detenerMotor(idx) {
    const lista = fichaMotor.motores || []
    const motores = lista.map((m, j) => j === idx
      ? { ...m, horas: String(Math.round(horasActuales(m))), marcha: { activo: false, desde: '' } } : m)
    setFichaMotor(f => ({ ...f, motores }))
    setDoc(doc(db, 'usuarios', uid, 'fichas', 'maquinas'), { motores }, { merge: true }).catch(() => {})
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

  // Contadores por estado + unidades totales (para los chips).
  const cuenta = { ok: 0, low: 0, out: 0 }
  repuestos.forEach(r => { cuenta[estadoStock(r.stockActual, r.stockMinimo)]++ })
  const unidadesTotales = repuestos.reduce((s, r) => s + r.stockActual, 0)

  const chipsEstado = [
    { id: 'todos', label: 'Todos', n: repuestos.length, dot: null },
    { id: 'ok', label: 'En orden', n: cuenta.ok, dot: '#34d399' },
    { id: 'low', label: 'Stock bajo', n: cuenta.low, dot: '#fbbf24' },
    { id: 'out', label: 'Sin stock', n: cuenta.out, dot: '#f87171' },
  ]

  // Filtro en vivo: buscador (código/descr/marca, sin acentos) + chip de estado.
  const q = sinAcentos(busqueda.trim())
  const repuestosFiltrados = repuestos.filter(r => {
    if (q && !sinAcentos(`${r.codigo} ${r.descripcion} ${r.marca}`).includes(q)) return false
    if (filtroEstado !== 'todos' && estadoStock(r.stockActual, r.stockMinimo) !== filtroEstado) return false
    return true
  })

  // Agrupación: "Requieren reposición" (Sin stock primero, luego Bajo) y "En orden".
  const RANK = { out: 0, low: 1 }
  const requieren = repuestosFiltrados
    .filter(r => estadoStock(r.stockActual, r.stockMinimo) !== 'ok')
    .sort((a, b) => RANK[estadoStock(a.stockActual, a.stockMinimo)] - RANK[estadoStock(b.stockActual, b.stockMinimo)])
  const enOrden = repuestosFiltrados.filter(r => estadoStock(r.stockActual, r.stockMinimo) === 'ok')

  // Última actualización (más reciente entre todos los repuestos).
  const ultimaAct = repuestos
    .map(r => r.actualizadoEn?.toDate?.())
    .filter(Boolean)
    .reduce((max, d) => (!max || d > max ? d : max), null)

  // Handlers de fila (comunes a los dos grupos).
  const filaProps = (r) => ({
    onDec: () => actualizarStock(r.id, Math.max(0, r.stockActual - 1)),
    onInc: () => actualizarStock(r.id, r.stockActual + 1),
    onEdit: () => abrirEdicion(r),
    confirmando: confirmarId === r.id,
    onAskDelete: () => setConfirmarId(r.id),
    onConfirmDelete: () => { eliminar(r.id); setConfirmarId(null) },
    onCancelDelete: () => setConfirmarId(null),
  })

  // ── Orden de compra: se arma con los que están por debajo del mínimo ────────
  const sugerido = (r) => Math.max(1, (Number(r.stockMinimo) || 0) - (Number(r.stockActual) || 0))
  const cantDe = (r) => pedidoCant[r.id] ?? sugerido(r)      // cantidad a pedir (default sugerido)
  const selDe = (r) => pedidoSel[r.id] !== false             // incluido en la orden (default sí)
  const provDe = (r) => (r.marca || '').trim() || 'Sin proveedor'
  const gruposPedido = {}
  pendientes.forEach(r => { (gruposPedido[provDe(r)] = gruposPedido[provDe(r)] || []).push(r) })
  const seleccionadosPedido = pendientes.filter(selDe)
  const totalUnidadesPedido = seleccionadosPedido.reduce((s, r) => s + cantDe(r), 0)
  const provsPedido = new Set(seleccionadosPedido.map(provDe)).size

  function construirTextoOrden() {
    const fecha = new Date().toLocaleDateString('es-AR')
    let t = `Orden de compra — BitácoraAR\n${sector.label} · ${fecha}\n`
    Object.entries(gruposPedido).forEach(([prov, items]) => {
      const sel = items.filter(selDe)
      if (!sel.length) return
      t += `\n${prov}\n`
      sel.forEach(r => {
        t += `• ${r.codigo}${r.descripcion ? ' — ' + r.descripcion : ''} — pedir ${cantDe(r)} (stock ${r.stockActual}, mín ${r.stockMinimo})\n`
      })
    })
    t += `\nTotal: ${seleccionadosPedido.length} repuestos · ${totalUnidadesPedido} unidades`
    return t
  }
  async function copiarLista() {
    try {
      await navigator.clipboard.writeText(construirTextoOrden())
      setCopiado(true); setTimeout(() => setCopiado(false), 2000)
    } catch { /* clipboard no disponible */ }
  }
  function enviarPedidoWhatsApp() {
    window.open('https://wa.me/?text=' + encodeURIComponent(construirTextoOrden()), '_blank')
  }

  // ── Ficha motor: se edita el motor SELECCIONADO en el esquema ────────────────
  const motoresLista = fichaMotor.motores || []
  const motorSel = motoresLista.find(m => m.id === motorSelId)
    || motoresLista.find(m => m.rol === 'principal') || motoresLista[0]
    || { identificacion: {}, horas: '', tareas: [] }
  const motorSelIdx = motoresLista.findIndex(m => m.id === motorSel.id) // -1 si lista vacía
  const motorAct = motorSel
  const tareasMotor = motorAct.tareas || []
  const horasMotor = horasActuales(motorAct)
  const enMarcha = !!motorAct.marcha?.activo
  // Estado del motor seleccionado (helper compartido, siempre por horas).
  const emSel = estadoMotor(motorSel)
  const urgTarea = emSel.peorTarea       // tarea que marca el próximo service
  const urgCerca = emSel.key !== 'al_dia'
  let progUrg = 0
  if (urgTarea) {
    const int = Number(urgTarea.intervaloHs) || 1
    const rec = Math.max(0, horasMotor - (Number(urgTarea.ultimoHs) || 0))
    progUrg = Math.max(0, Math.min(1, rec / int))
  }
  const fEstUrg = urgTarea ? fechaEstimadaProximo(urgTarea, horasMotor) : null
  // "N alertas" = motores con al menos una tarea en 'proximo' o 'vencido'.
  const alertasMotor = motoresLista.filter(motorTieneAlerta).length
  const motoresExtra = motoresLista.filter(m => m.rol === 'extra')

  // Persiste la lista de motores en el acto (setDoc merge) además del estado.
  async function persistirMotores(nextMotores) {
    setFichaMotor(f => ({ ...f, motores: nextMotores }))
    try { await setDoc(doc(db, 'usuarios', uid, 'fichas', 'maquinas'), { motores: nextMotores }, { merge: true }) } catch { /* offline */ }
  }
  // Aplica un cambio a una tarea del motor seleccionado y persiste.
  function actualizarTarea(ti, cambio) {
    const motores = (fichaMotor.motores || []).map((m, mi) => mi !== motorSelIdx ? m : {
      ...m,
      tareas: (m.tareas || []).map((t, j) => j === ti ? cambio(t) : t),
    })
    persistirMotores(motores)
  }
  // Registrar un service: abre el registro; al confirmar agrega al historial y
  // reinicia el cálculo (ultimoHs/ultimaFecha = lo registrado). Persiste ya.
  function abrirRegistro(ti) {
    setRegistro({ ti, fecha: hoyISO(), horas: motorAct.horas || '', nota: '' })
  }
  function confirmarRegistro() {
    if (!registro) return
    const { ti, fecha, horas, nota } = registro
    actualizarTarea(ti, t => ({
      ...t, ultimoHs: horas, ultimaFecha: fecha,
      historial: [...(t.historial || []), { fecha, horas, nota }],
    }))
    setRegistro(null)
  }
  function borrarHistorial(ti, hi) {
    actualizarTarea(ti, t => ({ ...t, historial: (t.historial || []).filter((_, k) => k !== hi) }))
  }

  // ── Artes de pesca: inventario con condición ────────────────────────────────
  const artesItems = artes.items || []
  const cuentaArtes = { ok: 0, revisar: 0, fuera: 0 }
  artesItems.forEach(a => { cuentaArtes[a.condicion] = (cuentaArtes[a.condicion] || 0) + 1 })
  const chipsArte = [
    { id: 'todas', label: 'Todas', n: artesItems.length, dot: null },
    { id: 'ok', label: 'En condición', n: cuentaArtes.ok, dot: CONDICIONES.ok.color },
    { id: 'revisar', label: 'A revisar', n: cuentaArtes.revisar, dot: CONDICIONES.revisar.color },
    { id: 'fuera', label: 'Fuera de uso', n: cuentaArtes.fuera, dot: CONDICIONES.fuera.color },
  ]
  const qa = sinAcentos(busquedaArte.trim())
  const artesFiltrados = artesItems.filter(a => {
    if (qa && !sinAcentos(`${a.nombre} ${a.tipo} ${a.detalle}`).includes(qa)) return false
    if (filtroArte !== 'todas' && a.condicion !== filtroArte) return false
    return true
  })
  const unidadesArtes = artesItems.reduce((s, a) => s + (Number(a.cantidad) || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{
      background: '#070f1e',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      '--accent': sector.accent,
      '--accent-soft': sector.accentSoft,
      '--accent-line': sector.accentLine,
    }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700 bg-navy-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-line)' }}>
            <Icon size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{sector.label}</p>
            <p className="text-xs text-slate-500">{repuestos.length} repuesto{repuestos.length !== 1 ? 's' : ''} · {(seccion === 'maquinas' ? alertasMotor : pendientes.length)} alerta{(seccion === 'maquinas' ? alertasMotor : pendientes.length) !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={onCerrar} className="btn-ghost p-2 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Tabs — 2 pastillas con acento de la sección */}
      <div className="flex gap-2 px-4 py-3 border-b border-navy-700 bg-navy-800 flex-shrink-0">
        {[
          seccion === 'maquinas'
            ? { id: 'ficha', label: 'Motores', Icon: Wrench, n: (fichaMotor.motores || []).length, alertas: alertasMotor }
            : { id: 'artes', label: 'Artes', Icon: Anchor, n: artesItems.length, alertas: 0 },
          { id: 'stock', label: 'Repuestos', Icon: Package, n: repuestos.length, alertas: pendientes.length },
        ].map(({ id, label, Icon, n, alertas }) => {
          const activo = vista === id
          return (
            <button key={id} onClick={() => setVista(id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors"
              style={activo
                ? { background: 'var(--accent-soft)', borderColor: 'var(--accent-line)', color: 'var(--accent)' }
                : { background: '#0d1829', borderColor: '#1a304e', color: '#94a3b8' }}>
              <Icon size={16} />
              {label}
              <span className="text-xs opacity-80 tabular-nums">({n})</span>
              {alertas > 0 && <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{alertas}</span>}
            </button>
          )
        })}
      </div>

      {/* Sub-header: segmento Inventario / Orden de compra (solo en Repuestos) */}
      {vista === 'stock' && (
        <div className="px-4 py-2 border-b border-navy-700 bg-navy-800 flex-shrink-0">
          <div className="flex gap-1 bg-navy-900 border border-navy-700 rounded-xl p-1">
            {[['inventario', 'Inventario', 0], ['orden', 'Orden de compra', pendientes.length]].map(([id, label, badge]) => {
              const activo = segmentoRep === id
              return (
                <button key={id} onClick={() => setSegmentoRep(id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={activo ? { background: 'var(--accent)', color: '#07131f' } : { color: '#94a3b8' }}>
                  {label}
                  {badge > 0 && <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* ===== VISTA STOCK — INVENTARIO ===== */}
        {vista === 'stock' && segmentoRep === 'inventario' && (
          <div>
            {/* input de cámara: siempre montado (lo usan el form y el empty state) */}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={procesarFoto} />

            {/* Toolbar: búsqueda en vivo + agregar. Solo con repuestos cargados. */}
            {!modoAgregar && repuestos.length > 0 && (
              <div className="p-4 flex flex-col sm:flex-row gap-2 sticky top-0 z-10 bg-[#070f1e]">
                <div className="relative w-full sm:flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar por código, descripción o marca…"
                    className="pl-9 text-sm"
                    style={{ height: 46, borderRadius: 13 }}
                  />
                </div>
                <button onClick={() => { setEditandoId(null); setModoAgregar(true) }}
                  className="w-full sm:w-auto sm:flex-shrink-0 flex items-center justify-center gap-2 px-4 text-sm font-semibold"
                  style={{ height: 46, borderRadius: 13, background: 'var(--accent)', color: '#07131f' }}>
                  <Camera size={16} /> Agregar repuesto
                </button>
              </div>
            )}

            {/* Formulario alta/edición */}
            {modoAgregar && (
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
                  <div className="flex-1 bg-navy-700/50 rounded-lg px-3 py-2 flex flex-col justify-center">
                    {ocr.progreso
                      ? <div className="flex items-center gap-2 text-xs text-slate-400"><Loader size={13} className="animate-spin" /> Leyendo código...</div>
                      : ocr.codigo
                        ? <><p className="text-[10px] text-slate-500">Código detectado</p><p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{ocr.codigo}</p><p className="text-[10px] text-green-500">OCR automático · verificá antes de guardar</p></>
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

            {/* Estados: cargando · vacío · lista */}
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
              !modoAgregar && (
                <EmptyRepuestos
                  seccionLabel={sector.label}
                  onFoto={() => { setEditandoId(null); fileRef.current?.click() }}
                  onManual={() => { setEditandoId(null); setModoAgregar(true) }}
                />
              )
            ) : (
              <>
                {/* Chips: filtro por estado + total de unidades */}
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-navy-700">
                  {chipsEstado.map(ch => {
                    const activo = filtroEstado === ch.id
                    return (
                      <button key={ch.id} onClick={() => setFiltroEstado(ch.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors"
                        style={activo
                          ? { background: 'var(--accent-soft)', borderColor: 'var(--accent-line)', color: 'var(--accent)' }
                          : { background: '#0d1829', borderColor: '#1a304e', color: '#94a3b8' }}>
                        {ch.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: ch.dot }} />}
                        {ch.label}
                        <span className="tabular-nums opacity-90">{ch.n}</span>
                      </button>
                    )
                  })}
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 border"
                    style={{ background: '#0d1829', borderColor: '#112240', color: '#94a3b8' }}>
                    Unidades totales
                    <span className="font-bold tabular-nums" style={{ color: '#34d399' }}>{unidadesTotales}</span>
                  </span>
                </div>

                {/* Lista agrupada */}
                {repuestosFiltrados.length === 0 ? (
                  <div className="text-center py-10 px-6 text-slate-500 text-sm">
                    Sin resultados{busqueda ? ` para «${busqueda}»` : ' con este filtro'}.
                  </div>
                ) : (
                  <div>
                    {requieren.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 px-4 pt-4 pb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#fbbf24' }}>
                            Requieren reposición · {requieren.length}
                          </span>
                          <div className="flex-1 h-px" style={{ background: 'rgba(251,191,36,0.25)' }} />
                        </div>
                        {requieren.map(r => <FilaRepuesto key={r.id} r={r} {...filaProps(r)} />)}
                      </>
                    )}
                    {enOrden.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 px-4 pt-4 pb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            En orden · {enOrden.length}
                          </span>
                          <div className="flex-1 h-px bg-navy-700" />
                        </div>
                        {enOrden.map(r => <FilaRepuesto key={r.id} r={r} {...filaProps(r)} />)}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Recordatorio: repuestos bajo mínimo → ir a la orden de compra */}
            {pendientes.length > 0 && (
              <div className="m-4 flex items-center gap-3 rounded-xl px-3.5 py-3"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
                <AlertTriangle size={16} className="flex-shrink-0" style={{ color: '#fbbf24' }} />
                <p className="text-xs flex-1" style={{ color: '#fde4a6' }}>
                  <b style={{ color: '#fbbf24' }}>{pendientes.length}</b> {pendientes.length === 1 ? 'repuesto está' : 'repuestos están'} bajo mínimo.
                </p>
                <button onClick={() => setSegmentoRep('orden')}
                  className="text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0"
                  style={{ background: 'var(--accent)', color: '#07131f' }}>
                  Ver orden de compra
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== VISTA FICHA MOTOR (solo maquinas) ===== */}
        {vista === 'ficha' && seccion === 'maquinas' && (
          <div className="p-4 space-y-4">
            {/* HERO — esquema de la sala de máquinas (acotado en PC) */}
            <div className="max-w-md mx-auto w-full">
              <SalaMaquinas motores={motoresLista} seleccionado={motorSel.id} onSelect={setMotorSelId}
                noEquipado={fichaMotor.noEquipado} onToggleNoEquipado={toggleNoEquipado} onEquipar={equiparAuxiliar} />
            </div>

            {/* Motores extra (fuera del esquema) */}
            {motoresExtra.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {motoresExtra.map(m => {
                  const em = estadoMotor(m)
                  const sel = m.id === motorSel.id
                  return (
                    <div key={m.id} onClick={() => setMotorSelId(m.id)}
                      className="cursor-pointer rounded-xl border p-3 flex items-center gap-2.5 transition-colors"
                      style={sel ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : { borderColor: '#1a304e', background: '#0d1829' }}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: em.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{m.nombre || 'Motor'}</p>
                        <p className="text-[11px] text-slate-500">{Math.round(horasActuales(m)).toLocaleString('es-AR')} hs{m.marcha?.activo && <span className="text-emerald-400"> · en marcha</span>}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: em.color, background: `${em.color}1a`, border: `1px solid ${em.color}4d` }}>{em.label}</span>
                      <button onClick={e => { e.stopPropagation(); eliminarMotorExtra(m.id) }} aria-label="Eliminar motor"
                        className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg border border-navy-600 hover:border-red-500/50 flex items-center justify-center flex-shrink-0"><Trash2 size={13} className="text-red-400" /></button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Barra: estado del motor seleccionado + agregar */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: emSel.color }} />
              <span className="text-sm font-semibold text-white truncate">{motorSel.nombre || 'Motor'}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ color: emSel.color, background: `${emSel.color}1a`, border: `1px solid ${emSel.color}4d` }}>{emSel.label}</span>
              <button onClick={() => { setNuevoNombre(''); setAddMotorOpen(true) }}
                className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }}>
                <Plus size={14} /> Agregar motor
              </button>
            </div>

            {/* Identificación + Horas de marcha */}
            <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-3">
              {/* Identificación */}
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Identificación</p>
                  <input value={motorAct.nombre || ''} onChange={e => setMotorCampo(motorSelIdx, 'nombre', e.target.value)}
                    placeholder="[Nombre]" className="text-[11px] text-slate-400 text-right placeholder-slate-600 max-w-[55%]"
                    style={{ background: 'transparent', border: 'none', padding: 0 }} />
                </div>
                <input value={motorAct.identificacion?.marca || ''} onChange={e => setMotorIdent(motorSelIdx,'marca', e.target.value)}
                  placeholder="[Marca]" className="w-full text-lg font-bold text-white placeholder-slate-600" style={{ background: 'transparent', border: 'none', padding: 0 }} />
                <input value={motorAct.identificacion?.modelo || ''} onChange={e => setMotorIdent(motorSelIdx,'modelo', e.target.value)}
                  placeholder="[Modelo]" className="w-full text-sm text-slate-400 placeholder-slate-600" style={{ background: 'transparent', border: 'none', padding: 0 }} />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                  {[
                    { k: 'serie', label: 'N° de serie', mono: true },
                    { k: 'potenciaKw', label: 'Potencia (kW)', type: 'number' },
                    { k: 'anio', label: 'Año', type: 'number' },
                    { k: 'combustible', label: 'Combustible' },
                    { k: 'reductor', label: 'Reductor' },
                    { k: 'relacion', label: 'Relación' },
                  ].map(c => (
                    <div key={c.k}>
                      <label className="text-[10px] text-slate-500 mb-0.5 block">{c.label}</label>
                      <input type={c.type || 'text'} placeholder={`[${c.label}]`}
                        value={motorAct.identificacion?.[c.k] || ''}
                        onChange={e => setMotorIdent(motorSelIdx,c.k, e.target.value)}
                        className={`text-sm w-full placeholder-slate-600 ${c.mono ? 'font-mono' : ''}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Horas de marcha */}
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Horas de marcha</p>
                  {enMarcha && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> En marcha
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  {enMarcha ? (
                    <span className="text-3xl font-black text-white tabular-nums">
                      {horasMotor.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </span>
                  ) : (
                    <input type="number" value={motorAct.horas || ''} onChange={e => setMotorCampo(motorSelIdx,'horas', e.target.value)}
                      placeholder="0" className="text-3xl font-black text-white w-28 placeholder-slate-700" style={{ background: 'transparent', border: 'none', padding: 0 }} />
                  )}
                  <span className="text-sm text-slate-500">hs</span>
                </div>
                {enMarcha ? (
                  <button onClick={() => detenerMotor(motorSelIdx)}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-colors">
                    <Square size={14} /> Detener
                  </button>
                ) : (
                  <button onClick={() => arrancarMotor(motorSelIdx)} disabled={motorSelIdx < 0}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-40">
                    <Play size={14} /> En marcha
                  </button>
                )}
                {urgTarea ? (
                  <>
                    <div className="mt-3 h-2 rounded-full bg-navy-700 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${progUrg * 100}%`, background: urgCerca ? emSel.color : 'var(--accent)' }} />
                    </div>
                    <p className="text-[11px] mt-1.5 leading-snug" style={{ color: urgCerca ? emSel.color : '#64748b' }}>
                      Próximo service: <b>{urgTarea.nombre || 'tarea'}</b> · {emSel.faltanMin >= 0 ? `faltan ${Math.round(emSel.faltanMin)} hs` : `vencido hace ${Math.round(-emSel.faltanMin)} hs`}
                      {fEstUrg && <> · fecha est. {fmtDDMM(fEstUrg)}</>}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] mt-3 text-slate-600">Agregá tareas de mantenimiento para ver el próximo service.</p>
                )}
              </div>
            </div>

            {/* Mantenimiento programado */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Mantenimiento programado</p>
                <button onClick={() => addTarea(motorSelIdx)} className="text-xs flex items-center gap-1 hover:opacity-80" style={{ color: 'var(--accent)' }}>
                  <Plus size={13} /> Agregar tarea
                </button>
              </div>
              {tareasMotor.length === 0 ? (
                <p className="text-xs text-slate-600 bg-navy-800 border border-navy-700 rounded-xl px-3 py-4 text-center">
                  Sin tareas. Agregá el cambio de aceite, filtros, etc. con su intervalo en horas.
                </p>
              ) : (
                <div className="space-y-2">
                  {tareasMotor.map((t, i) => {
                    const est = estadoTarea(t, horasMotor)
                    const repBajo = t.codigo && repuestos.some(r => (r.codigo || '').toUpperCase() === t.codigo.toUpperCase() && estadoStock(r.stockActual, r.stockMinimo) !== 'ok')
                    return (
                      <div key={t.id || i} className="bg-navy-800 border border-navy-700 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          {repBajo && <span title="Repuesto en bajo stock" className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#fbbf24' }} />}
                          <input value={t.nombre} onChange={e => setTarea(motorSelIdx,i, 'nombre', e.target.value)} placeholder="Tarea (ej: Cambio de aceite)"
                            className="flex-1 min-w-0 text-sm text-white placeholder-slate-600" style={{ background: 'transparent', border: 'none', padding: 0 }} />
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ color: est.color, background: `${est.color}1a`, border: `1px solid ${est.color}4d` }}>{est.label}</span>
                          <button onClick={() => abrirRegistro(i)} title="Registrar service" aria-label="Registrar service"
                            className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg border border-navy-600 hover:border-navy-500 flex items-center justify-center flex-shrink-0"><ClipboardCheck size={14} style={{ color: 'var(--accent)' }} /></button>
                          <button onClick={() => delTarea(motorSelIdx,i)} aria-label="Borrar tarea" className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg border border-navy-600 hover:border-red-500/50 flex items-center justify-center flex-shrink-0"><Trash2 size={13} className="text-red-400" /></button>
                        </div>
                        {t.ultimaFecha && (
                          <p className="text-[10px] text-slate-500 mt-1.5">Último service: {t.ultimoHs || 0} hs · {fmtDDMM(new Date(t.ultimaFecha + 'T00:00:00'))}</p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                          <div><label className="text-[10px] text-slate-500 mb-0.5 block">Cada (hs)</label>
                            <input type="number" placeholder="250" value={t.intervaloHs || ''} onChange={e => setTarea(motorSelIdx,i, 'intervaloHs', e.target.value)} className="text-sm w-full" /></div>
                          <div><label className="text-[10px] text-slate-500 mb-0.5 block">Último a (hs)</label>
                            <input type="number" placeholder="0" value={t.ultimoHs || ''} onChange={e => setTarea(motorSelIdx,i, 'ultimoHs', e.target.value)} className="text-sm w-full" /></div>
                          <div><label className="text-[10px] text-slate-500 mb-0.5 block">Fecha último</label>
                            <input type="date" value={t.ultimaFecha || ''} onChange={e => setTarea(motorSelIdx,i, 'ultimaFecha', e.target.value)} className="text-sm w-full" /></div>
                          <div><label className="text-[10px] text-slate-500 mb-0.5 block">Repuesto (cód.)</label>
                            <input placeholder="P553000" value={t.codigo || ''} onChange={e => setTarea(motorSelIdx,i, 'codigo', e.target.value.toUpperCase())} className="text-sm w-full font-mono" /></div>
                        </div>
                        {(t.historial?.length > 0) && (
                          <div className="mt-2 border-t border-navy-700 pt-2">
                            <button onClick={() => setHistAbierto(h => ({ ...h, [t.id]: !h[t.id] }))}
                              className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300">
                              {histAbierto[t.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Historial ({t.historial.length})
                            </button>
                            {histAbierto[t.id] && (
                              <div className="mt-1.5 space-y-1">
                                {t.historial.map((h, hi) => ({ h, hi })).sort((a, b) => (a.h.fecha < b.h.fecha ? 1 : -1)).map(({ h, hi }) => (
                                  <div key={hi} className="flex items-center gap-2 text-[11px] text-slate-400">
                                    <span className="tabular-nums text-slate-300">{fmtDDMM(new Date(h.fecha + 'T00:00:00'))}</span>
                                    <span className="text-slate-500">· {h.horas} hs</span>
                                    {h.nota && <span className="text-slate-500 truncate">· {h.nota}</span>}
                                    <button onClick={() => borrarHistorial(i, hi)} aria-label="Borrar entrada"
                                      className="ml-auto text-slate-600 hover:text-red-400 flex-shrink-0"><Trash2 size={11} /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <button onClick={guardarFichaMotor} disabled={fichaMotorGuardando}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm"
              style={{ background: fichaMotorGuardado ? '#059669' : undefined }}>
              {fichaMotorGuardando
                ? <><Loader size={15} className="animate-spin" /> Guardando...</>
                : fichaMotorGuardado
                  ? '✓ Guardado'
                  : <><Save size={15} /> Guardar ficha técnica</>}
            </button>

            {/* Modal: registrar un service */}
            {registro && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4"
                onClick={() => setRegistro(null)}>
                <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-sm p-5 space-y-3 mb-4 sm:mb-0"
                  onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold text-sm">Registrar service</h3>
                    <button onClick={() => setRegistro(null)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
                  </div>
                  <p className="text-xs text-slate-500 -mt-1">{tareasMotor[registro.ti]?.nombre || 'Tarea'} · {motorAct.nombre}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] text-slate-500 mb-0.5 block">Fecha</label>
                      <input type="date" value={registro.fecha} onChange={e => setRegistro(r => ({ ...r, fecha: e.target.value }))} className="text-sm w-full" /></div>
                    <div><label className="text-[10px] text-slate-500 mb-0.5 block">Horas del motor</label>
                      <input type="number" value={registro.horas} onChange={e => setRegistro(r => ({ ...r, horas: e.target.value }))} className="text-sm w-full" /></div>
                  </div>
                  <div><label className="text-[10px] text-slate-500 mb-0.5 block">Nota (opcional)</label>
                    <input value={registro.nota} onChange={e => setRegistro(r => ({ ...r, nota: e.target.value }))} placeholder="Ej: cambio de aceite y filtros" className="text-sm w-full" /></div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setRegistro(null)} className="flex-1 btn-ghost py-2 text-sm rounded-lg">Cancelar</button>
                    <button onClick={confirmarRegistro} className="flex-1 btn-primary py-2 text-sm">Registrar</button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: agregar motor extra */}
            {addMotorOpen && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4"
                onClick={() => setAddMotorOpen(false)}>
                <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-sm p-5 space-y-3 mb-4 sm:mb-0"
                  onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold text-sm">Agregar motor</h3>
                    <button onClick={() => setAddMotorOpen(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
                  </div>
                  <p className="text-xs text-slate-500 -mt-1">Se crea como motor extra (aparece en la lista, no en el esquema).</p>
                  <div><label className="text-[10px] text-slate-500 mb-0.5 block">Nombre</label>
                    <input autoFocus value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') crearMotorExtra() }}
                      placeholder="Ej: Bomba de achique, Generador…" className="text-sm w-full" /></div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setAddMotorOpen(false)} className="flex-1 btn-ghost py-2 text-sm rounded-lg">Cancelar</button>
                    <button onClick={crearMotorExtra} className="flex-1 btn-primary py-2 text-sm">Crear</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== VISTA ARTES DE PESCA (cubierta + puente, datos compartidos) ===== */}
        {vista === 'artes' && (seccion === 'cubierta' || seccion === 'puente') && (
          <div className="p-4 space-y-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Inventario de artes</p>

            {/* Formulario alta/edición */}
            {modoArte && (
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{editandoArteId ? 'Editar arte' : 'Nuevo arte'}</p>
                <input placeholder="Nombre (ej: Red de arrastre)" value={formArte.nombre}
                  onChange={e => setFormArte(f => ({ ...f, nombre: e.target.value }))} className="text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] text-slate-500 mb-0.5 block">Tipo</label>
                    <select value={formArte.tipo} onChange={e => setFormArte(f => ({ ...f, tipo: e.target.value }))} className="text-sm">
                      {TIPOS_ARTE.map(t => <option key={t}>{t}</option>)}
                    </select></div>
                  <div><label className="text-[10px] text-slate-500 mb-0.5 block">Detalle</label>
                    <input value={formArte.detalle} onChange={e => setFormArte(f => ({ ...f, detalle: e.target.value }))} placeholder="Medidas, material…" className="text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] text-slate-500 mb-0.5 block">Cantidad</label>
                    <input type="number" min="0" value={formArte.cantidad} onChange={e => setFormArte(f => ({ ...f, cantidad: e.target.value }))} className="text-sm" /></div>
                  <div><label className="text-[10px] text-slate-500 mb-0.5 block">Unidad</label>
                    <input value={formArte.unidad} onChange={e => setFormArte(f => ({ ...f, unidad: e.target.value }))} placeholder="u, m, kg" className="text-sm" /></div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Condición</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(CONDICIONES).map(([k, c]) => {
                      const activo = formArte.condicion === k
                      return (
                        <button key={k} onClick={() => setFormArte(f => ({ ...f, condicion: k }))}
                          className="text-xs font-semibold rounded-lg py-2 border transition-colors"
                          style={activo ? { color: c.color, background: `${c.color}1a`, borderColor: `${c.color}66` } : { color: '#64748b', background: '#0d1829', borderColor: '#1a304e' }}>
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  {editandoArteId && (
                    <button onClick={() => eliminarArteItem(editandoArteId)} className="btn-danger py-2 px-3 text-sm rounded-lg">Borrar</button>
                  )}
                  <button onClick={() => { setModoArte(false); setEditandoArteId(null); setFormArte(arteVacio) }} className="flex-1 btn-ghost py-2 text-sm rounded-lg">Cancelar</button>
                  <button onClick={guardarArteItem} disabled={!formArte.nombre.trim()} className="flex-1 btn-primary py-2 text-sm disabled:opacity-40">
                    {editandoArteId ? 'Guardar' : 'Agregar'}
                  </button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {artesItems.length === 0 && !modoArte && (
              <div className="px-6 py-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}>
                  <Anchor size={26} style={{ color: 'var(--accent)' }} />
                </div>
                <h3 className="text-white font-semibold text-base mb-1.5">Cargá el primer arte de pesca</h3>
                <p className="text-slate-400 text-sm max-w-xs mb-5 leading-relaxed">
                  Redes, puertas, malletas, cabos… Registralos con su cantidad y condición para llevar el control.
                </p>
                <button onClick={() => { setEditandoArteId(null); setFormArte(arteVacio); setModoArte(true) }}
                  className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg text-sm font-semibold" style={{ background: 'var(--accent)', color: '#07131f' }}>
                  <Plus size={16} /> Agregar arte
                </button>
              </div>
            )}

            {/* Toolbar: buscador + agregar */}
            {!modoArte && artesItems.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2 sticky top-0 z-10 bg-[#070f1e] py-1">
                <div className="relative w-full sm:flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input value={busquedaArte} onChange={e => setBusquedaArte(e.target.value)}
                    placeholder="Buscar por nombre, tipo o detalle…" className="pl-9 text-sm" style={{ height: 46, borderRadius: 13 }} />
                </div>
                <button onClick={() => { setEditandoArteId(null); setFormArte(arteVacio); setModoArte(true) }}
                  className="w-full sm:w-auto sm:flex-shrink-0 flex items-center justify-center gap-2 px-4 text-sm font-semibold"
                  style={{ height: 46, borderRadius: 13, background: 'var(--accent)', color: '#07131f' }}>
                  <Plus size={16} /> Agregar arte
                </button>
              </div>
            )}

            {/* Chips de condición */}
            {!modoArte && artesItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {chipsArte.map(ch => {
                  const activo = filtroArte === ch.id
                  return (
                    <button key={ch.id} onClick={() => setFiltroArte(ch.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors"
                      style={activo
                        ? { background: 'var(--accent-soft)', borderColor: 'var(--accent-line)', color: 'var(--accent)' }
                        : { background: '#0d1829', borderColor: '#1a304e', color: '#94a3b8' }}>
                      {ch.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: ch.dot }} />}
                      {ch.label}<span className="tabular-nums opacity-90">{ch.n}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Lista de artes */}
            {!modoArte && artesItems.length > 0 && (
              <div className="-mx-4">
                {artesFiltrados.length === 0 ? (
                  <div className="text-center py-10 px-6 text-slate-500 text-sm">
                    Sin resultados{busquedaArte ? ` para «${busquedaArte}»` : ' con este filtro'}.
                  </div>
                ) : artesFiltrados.map(a => {
                  const cond = CONDICIONES[a.condicion] || CONDICIONES.ok
                  return (
                    <div key={a.id} className="border-b border-navy-700/40">
                      {/* Mobile: tarjeta */}
                      <div className="sm:hidden flex flex-col gap-2.5 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-[52px] h-[52px] rounded-lg bg-navy-700 border border-navy-600 flex-shrink-0 flex items-center justify-center text-2xl">{ICONO_ARTE[a.tipo] || '⚓'}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-white text-sm truncate">{a.nombre}</span>
                              <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-navy-700 border border-navy-600 text-slate-400">{a.tipo}</span>
                            </div>
                          </div>
                          <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                            style={{ color: cond.color, background: `${cond.color}1a`, border: `1px solid ${cond.color}4d` }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cond.color }} />{cond.label}
                          </span>
                        </div>
                        {a.detalle && <p className="text-xs text-slate-500 pl-[64px] -mt-1">{a.detalle}</p>}
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white"><b className="tabular-nums">{a.cantidad}</b> <span className="text-slate-500 text-xs">{a.unidad}</span></span>
                          <button onClick={() => abrirEdicionArte(a)} aria-label="Editar"
                            className="ml-auto w-11 h-11 rounded-lg border border-navy-600 flex items-center justify-center"><Pencil size={15} style={{ color: 'var(--accent)' }} /></button>
                        </div>
                      </div>
                      {/* sm+ : fila */}
                      <div className="hidden sm:flex items-center gap-3 px-4 py-3">
                        <div className="w-[52px] h-[52px] rounded-lg bg-navy-700 border border-navy-600 flex-shrink-0 flex items-center justify-center text-2xl">{ICONO_ARTE[a.tipo] || '⚓'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-white text-sm truncate">{a.nombre}</span>
                            <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-navy-700 border border-navy-600 text-slate-400">{a.tipo}</span>
                          </div>
                          {a.detalle && <p className="text-xs text-slate-500 truncate mt-0.5">{a.detalle}</p>}
                        </div>
                        <div className="text-right flex-shrink-0 w-14"><p className="text-sm font-bold text-white tabular-nums leading-tight">{a.cantidad}</p><p className="text-[10px] text-slate-600">{a.unidad}</p></div>
                        <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                          style={{ color: cond.color, background: `${cond.color}1a`, border: `1px solid ${cond.color}4d` }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cond.color }} />{cond.label}
                        </span>
                        <button onClick={() => abrirEdicionArte(a)} title="Editar" aria-label="Editar"
                          className="w-8 h-8 rounded-lg border border-navy-600 hover:border-navy-500 flex items-center justify-center flex-shrink-0"><Pencil size={13} style={{ color: 'var(--accent)' }} /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== VISTA ORDEN DE COMPRA (segmento de Repuestos) ===== */}
        {vista === 'stock' && segmentoRep === 'orden' && (
          <div>
            {pendientes.length === 0 ? (
              <div className="text-center py-16 px-8 text-slate-600 text-sm">
                Todo el stock está OK.<br />No hay repuestos que pedir.
              </div>
            ) : (
              <>
                {/* Aviso ámbar */}
                <div className="m-4 flex items-start gap-2.5 rounded-xl px-3.5 py-3"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
                  <p className="text-xs leading-relaxed" style={{ color: '#fde4a6' }}>
                    <b style={{ color: '#fbbf24' }}>{pendientes.length} repuesto{pendientes.length === 1 ? '' : 's'}</b> {pendientes.length === 1 ? 'está' : 'están'} por debajo del mínimo. Armamos la orden con la cantidad justa para volver al nivel objetivo.
                  </p>
                </div>

                {/* Grupos por proveedor / marca */}
                {Object.entries(gruposPedido).map(([prov, items]) => (
                  <div key={prov}>
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{prov} · {items.length}</span>
                      <div className="flex-1 h-px bg-navy-700" />
                    </div>
                    {items.map(r => {
                      const faltan = Math.max(0, (Number(r.stockMinimo) || 0) - (Number(r.stockActual) || 0))
                      const cant = cantDe(r)
                      const sel = selDe(r)
                      return (
                        <div key={r.id} className={`px-4 py-3 border-b border-navy-700/40 ${sel ? '' : 'opacity-50'}`}>
                          {(() => {
                            const checkbox = (
                              <button onClick={() => setPedidoSel(s => ({ ...s, [r.id]: !sel }))} aria-label="Incluir en la orden"
                                className="flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-colors"
                                style={sel ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : { borderColor: '#1a304e' }}>
                                {sel && <Check size={14} style={{ color: '#07131f' }} />}
                              </button>
                            )
                            const info = (
                              <div className="flex-1 min-w-0">
                                <p className="font-mono font-bold text-white text-sm truncate">{r.codigo}</p>
                                {(r.descripcion || r.categoria) && <p className="text-xs text-slate-500 truncate">{r.descripcion || r.categoria}</p>}
                              </div>
                            )
                            const faltanEl = (
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs font-semibold" style={{ color: r.stockActual === 0 ? '#f87171' : '#fbbf24' }}>faltan {faltan}</p>
                                <p className="text-[10px] text-slate-600 whitespace-nowrap">stock {r.stockActual} · mín {r.stockMinimo}</p>
                              </div>
                            )
                            const stepper = (
                              <div className="inline-flex items-center rounded-lg border border-navy-600 overflow-hidden flex-shrink-0">
                                <button onClick={() => setPedidoCant(c => ({ ...c, [r.id]: Math.max(1, cant - 1) }))} aria-label="Restar"
                                  className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-navy-700 transition-colors"><Minus size={15} /></button>
                                <span className="w-10 sm:w-8 text-center text-sm font-bold tabular-nums text-white">{cant}</span>
                                <button onClick={() => setPedidoCant(c => ({ ...c, [r.id]: cant + 1 }))} aria-label="Sumar"
                                  className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-navy-700 transition-colors"><Plus size={15} /></button>
                              </div>
                            )
                            return (
                              <>
                                {/* Mobile: datos arriba, stepper grande abajo */}
                                <div className="sm:hidden flex flex-col gap-2.5">
                                  <div className="flex items-center gap-3">{checkbox}{info}{faltanEl}</div>
                                  <div className="flex items-center gap-3 pl-9">
                                    <span className="text-[11px] text-slate-500">Pedir</span>
                                    {stepper}
                                  </div>
                                </div>
                                {/* sm+ : fila */}
                                <div className="hidden sm:flex items-center gap-3">{checkbox}{info}{faltanEl}{stepper}</div>
                              </>
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer fijo */}
      <div className="flex-shrink-0 border-t border-navy-700 bg-navy-800 p-4">
        {vista === 'stock' && segmentoRep === 'inventario' && (
          <div className="flex justify-between items-center gap-3 text-xs">
            <span className="text-slate-400">
              Total en stock: <span className="text-white font-semibold">{unidadesTotales} unidades</span> en <span className="text-white font-semibold">{repuestos.length} repuestos</span>
            </span>
            <span className="text-slate-500 whitespace-nowrap">
              Última actualización: <span className="text-slate-300">{haceCuanto(ultimaAct)}</span>
            </span>
          </div>
        )}
        {vista === 'artes' && (seccion === 'cubierta' || seccion === 'puente') && (
          <div className="flex justify-between items-center gap-3 text-xs">
            <span className="text-slate-400">
              Total: <b className="text-white">{unidadesArtes} unidades</b> en <b className="text-white">{artesItems.length} arte{artesItems.length === 1 ? '' : 's'}</b>
            </span>
            <span className="whitespace-nowrap">
              {(cuentaArtes.revisar + cuentaArtes.fuera) === 0
                ? <span style={{ color: '#34d399' }}>Todo en condición</span>
                : <><span style={{ color: '#fbbf24' }}>{cuentaArtes.revisar} a revisar</span> · <span style={{ color: '#f87171' }}>{cuentaArtes.fuera} fuera de uso</span></>}
            </span>
          </div>
        )}
        {vista === 'stock' && segmentoRep === 'orden' && pendientes.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-400 text-center sm:text-left">
              <b className="text-white">{seleccionadosPedido.length}</b> repuesto{seleccionadosPedido.length === 1 ? '' : 's'} · <b className="text-white">{totalUnidadesPedido}</b> unidades a pedir · <b className="text-white">{provsPedido}</b> proveedor{provsPedido === 1 ? '' : 'es'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={copiarLista} disabled={seleccionadosPedido.length === 0}
                className="flex-1 btn-ghost py-3 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                <Copy size={15} /> {copiado ? '¡Copiado!' : 'Copiar lista'}
              </button>
              <button onClick={enviarPedidoWhatsApp} disabled={seleccionadosPedido.length === 0}
                className="flex-1 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#07131f' }}>
                <MessageCircle size={15} /> Enviar pedido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
