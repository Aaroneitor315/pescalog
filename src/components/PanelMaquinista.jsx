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

function preprocesarImagen(file, escala = 2) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      // Escalar imagen para dar más píxeles por carácter al OCR
      canvas.width = img.width * escala
      canvas.height = img.height * escala
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]
        // Umbral adaptativo: texto oscuro→negro, fondo claro→blanco
        const c = lum < 140
          ? Math.max(0, lum * 0.5)
          : Math.min(255, 128 + (lum - 128) * 1.8)
        d[i] = d[i+1] = d[i+2] = c
      }
      ctx.putImageData(imageData, 0, 0)
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92)
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
  const vistaInicial = seccion === 'maquinas' ? 'hud' : seccion === 'cubierta' ? 'arrastre' : seccion === 'puente' ? 'radar' : 'stock'
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
  const hudRef = useRef()
  const hudRafRef = useRef()
  const arrastreRef = useRef()
  const arrastreRafRef = useRef()
  const radarRef = useRef()
  const radarRafRef = useRef()

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

  useEffect(() => {
    if (vista !== 'hud' || seccion !== 'maquinas') return
    const cv = hudRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const W = cv.width, H = cv.height
    let t = 0

    function gl(c, col, b) { c.shadowColor = col; c.shadowBlur = b }
    function ng(c) { c.shadowBlur = 0 }
    function rect(c, x, y, w, h, fill, stroke, sw) {
      c.fillStyle = fill; c.fillRect(x, y, w, h)
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = sw || 1; c.strokeRect(x, y, w, h) }
    }
    function txt(c, s, x, y, col, size, align, base) {
      c.fillStyle = col; c.font = size + ' "Courier New"'
      c.textAlign = align || 'left'; c.textBaseline = base || 'top'; c.fillText(s, x, y)
    }
    function gauge(cx, cy, r, val, max, col, lbl, unit) {
      const s = Math.PI * .75, e = Math.PI * 2.25, f = s + (e - s) * (val / max)
      ctx.strokeStyle = '#0a1e30'; ctx.lineWidth = 8
      ctx.beginPath(); ctx.arc(cx, cy, r, s, e); ctx.stroke()
      for (let i = 0; i <= 8; i++) {
        const a = s + (e - s) * i / 8, r1 = i % 2 === 0 ? r - 10 : r - 6
        ctx.strokeStyle = i % 2 === 0 ? '#1a3a55' : '#0d2035'; ctx.lineWidth = i % 2 === 0 ? 1.5 : 1
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
        ctx.lineTo(cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2)); ctx.stroke()
      }
      gl(ctx, col, 10); ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.arc(cx, cy, r, s, f); ctx.stroke()
      ctx.lineCap = 'butt'; ng(ctx)
      gl(ctx, col, 6); txt(ctx, String(val), cx, cy - 6, col, 'bold 13px', 'center', 'middle'); ng(ctx)
      txt(ctx, unit, cx, cy + 8, '#4a7090', '8px', 'center', 'middle')
      txt(ctx, lbl, cx, cy + r + 10, '#6a90b0', 'bold 8px', 'center', 'top')
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      rect(ctx, 0, 0, W, H, '#02080f')
      // grid
      ctx.strokeStyle = '#06182a'; ctx.lineWidth = .4
      for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      // header
      rect(ctx, 0, 0, W, 26, '#04111e')
      gl(ctx, '#00d4ff', 6); txt(ctx, '◉  SALA DE MÁQUINAS  ·  FICHA TÉCNICA', 12, 7, '#00d4ff', 'bold 9px'); ng(ctx)
      const hh = Math.floor(t / 3600) % 24, mm = Math.floor(t / 60) % 60
      txt(ctx, String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), W - 10, 8, '#2a5a80', '8px', 'right')

      // AUX dimensions
      const aw = Math.round(W * 0.155), ah = 110, ay = 68
      const ax1 = Math.round(W * 0.04), ax2 = W - ax1 - aw

      // AUX 1
      rect(ctx, ax1, ay, aw, ah, '#030e18', '#1a4a6a', 1.5)
      gl(ctx, '#00ff9d', 4); ctx.fillStyle = '#00ff9d'; ctx.fillRect(ax1, ay, aw, 2); ng(ctx)
      txt(ctx, 'AUXILIAR 1', ax1 + aw / 2, ay + 5, '#2a7a50', 'bold 7px', 'center')
      for (let i = 0; i < 3; i++) {
        const px = ax1 + 10 + i * (Math.round(aw / 3) - 2), ph = Math.sin(t * .06 + i * 2.1) * 12
        rect(ctx, px, ay + 28, Math.round(aw / 3) - 6, 44, '#0a2030', '#1a4a5a', 1)
        gl(ctx, '#00ff9d', 6); rect(ctx, px + 2, ay + 30 + ph, Math.round(aw / 3) - 10, 16, '#00ff9d60'); ng(ctx)
      }
      txt(ctx, '85 kW · 1800 rpm', ax1 + aw / 2, ay + ah - 16, '#1a5040', '7px', 'center')
      gl(ctx, '#00ff9d', 10); ctx.fillStyle = '#00ff9d'
      ctx.beginPath(); ctx.arc(ax1 + aw - 10, ay + 11, 4, 0, Math.PI * 2); ctx.fill(); ng(ctx)

      // AUX 2
      rect(ctx, ax2, ay, aw, ah, '#030e18', '#1a4a6a', 1.5)
      gl(ctx, '#00ff9d', 4); ctx.fillStyle = '#00ff9d'; ctx.fillRect(ax2, ay, aw, 2); ng(ctx)
      txt(ctx, 'AUXILIAR 2', ax2 + aw / 2, ay + 5, '#2a7a50', 'bold 7px', 'center')
      for (let i = 0; i < 3; i++) {
        const px = ax2 + 10 + i * (Math.round(aw / 3) - 2), ph = Math.sin(t * .06 + i * 2.1 + Math.PI) * 12
        rect(ctx, px, ay + 28, Math.round(aw / 3) - 6, 44, '#0a2030', '#1a4a5a', 1)
        gl(ctx, '#00ff9d', 6); rect(ctx, px + 2, ay + 30 + ph, Math.round(aw / 3) - 10, 16, '#00ff9d60'); ng(ctx)
      }
      txt(ctx, '85 kW · 1800 rpm', ax2 + aw / 2, ay + ah - 16, '#1a5040', '7px', 'center')
      gl(ctx, '#00ff9d', 10); ctx.fillStyle = '#00ff9d'
      ctx.beginPath(); ctx.arc(ax2 + aw - 10, ay + 11, 4, 0, Math.PI * 2); ctx.fill(); ng(ctx)

      // Motor principal
      const mx = Math.round(W * .28), mw = Math.round(W * .44), my = 42, mh = 140
      rect(ctx, mx, my, mw, mh, '#040f1a', '#00d4ff', 2)
      gl(ctx, '#00d4ff', 4); ctx.fillStyle = '#00d4ff'; ctx.fillRect(mx, my, mw, 3); ng(ctx)
      txt(ctx, 'MOTOR PRINCIPAL', mx + mw / 2, my + 7, '#00d4ff', 'bold 9px', 'center')
      txt(ctx, 'MAN B&W  ·  374 kW', mx + mw / 2, my + 18, '#1a5070', '7px', 'center')
      const ncyl = 6
      for (let i = 0; i < ncyl; i++) {
        const cxp = mx + Math.round(mw / (ncyl + 1)) * (i + 1)
        const cw = Math.round(mw / (ncyl + 1)) - 6
        const ph = Math.sin(t * .055 + i * 1.047) * 20
        rect(ctx, cxp - cw / 2, my + 34, cw, 58, '#060f1c', '#0d2a40', 1)
        gl(ctx, '#00d4ff', 8); rect(ctx, cxp - cw / 2 + 2, my + 37 + ph, cw - 4, 18, '#00d4ff30'); ng(ctx)
        ctx.strokeStyle = '#00d4ff50'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(cxp, my + 37 + ph + 9); ctx.lineTo(cxp, my + 96); ctx.stroke()
        gl(ctx, '#00d4ff', 10); ctx.fillStyle = '#00d4ff80'
        ctx.beginPath(); ctx.arc(cxp, my + 100 + Math.sin(t * .055 + i * 1.047) * 5, 3, 0, Math.PI * 2); ctx.fill(); ng(ctx)
      }
      // crankshaft
      ctx.strokeStyle = '#0d3050'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(mx + 10, my + 106); ctx.lineTo(mx + mw - 10, my + 106); ctx.stroke()
      // shaft lines to aux
      ctx.strokeStyle = '#0a2535'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(mx, my + mh / 2); ctx.lineTo(ax1 + aw, my + mh / 2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(mx + mw, my + mh / 2); ctx.lineTo(ax2, my + mh / 2); ctx.stroke()
      // hélice arrow
      gl(ctx, '#00d4ff', 8); ctx.fillStyle = '#00d4ff'
      ctx.beginPath(); ctx.moveTo(ax1 + aw + 14, my + mh / 2 - 7); ctx.lineTo(ax1 + aw + 2, my + mh / 2); ctx.lineTo(ax1 + aw + 14, my + mh / 2 + 7); ctx.closePath(); ctx.fill(); ng(ctx)
      txt(ctx, 'HÉLICE', ax1 + aw / 2 + 4, my + mh / 2 + 10, '#1a5070', '7px', 'center')

      // Gauges
      const gy = Math.round(H * .77)
      const rpm = Math.round(290 + Math.sin(t * .018) * 28)
      const temp = Math.round(76 + Math.sin(t * .013) * 6)
      const pres = Math.round((6.2 + Math.sin(t * .022) * .4) * 10) / 10
      const volt = Math.round(218 + Math.sin(t * .03) * 6)
      const gr = Math.round(W * .065)
      gauge(W / 2 - gr * 3, gy, gr, rpm, 400, '#00d4ff', 'RPM', 'rpm')
      gauge(W / 2 - gr, gy, gr, temp, 120, '#ff6b1a', 'T°AGUA', '°C')
      gauge(W / 2 + gr, gy, gr, pres, 10, '#c084fc', 'PRESIÓN', 'bar')
      gauge(W / 2 + gr * 3, gy, gr, volt, 260, '#00ff9d', 'VOLTAJE', 'V')

      // Tanks
      const tanks = [
        { lbl: 'COMB. DF', val: '58.800 L', col: '#e8c432', pct: .62 },
        { lbl: 'AGUA DULCE', val: '22.830 L', col: '#0a7fff', pct: .78 },
        { lbl: 'ACEITE LUB.', val: '3.000 L', col: '#00ff9d', pct: .90 },
        { lbl: 'ACEITE HID.', val: '2.400 L', col: '#c084fc', pct: .55 },
        { lbl: 'LODOS', val: '1.500 L', col: '#ff6b1a', pct: .30 },
      ]
      const tw = Math.round((W - 32) / tanks.length - 6), th = 20, ty = H - 28
      tanks.forEach((tk, i) => {
        const tx = 16 + i * (tw + 6)
        rect(ctx, tx, ty, tw, th, '#040e1a', tk.col + '40', 1)
        gl(ctx, tk.col, 4); ctx.fillStyle = tk.col + '25'; ctx.fillRect(tx + 1, ty + 1, Math.max(0, (tw - 2) * tk.pct), th - 2); ng(ctx)
        txt(ctx, tk.lbl, tx + 4, ty + 3, tk.col, 'bold 6px')
        txt(ctx, tk.val, tx + tw - 4, ty + 11, '#ffffff', '6px', 'right')
      })
      txt(ctx, 'TANQUES', W / 2, ty - 10, '#1a3a55', 'bold 7px', 'center', 'bottom')

      t++
      hudRafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(hudRafRef.current)
  }, [vista, seccion])

  // ── Animación arrastre (cubierta) ──
  useEffect(() => {
    if (vista !== 'arrastre' || seccion !== 'cubierta') return
    const cv = arrastreRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const W = 480, H = 300, WY = 155
    cv.width = W * dpr; cv.height = H * dpr
    ctx.scale(dpr, dpr)
    let t = 0
    const peces = Array.from({ length: 14 }, (_, i) => ({
      x: 160 + Math.random() * 250, y: WY + 14 + Math.random() * (H - WY - 24),
      vx: .1 + Math.random() * .14, vy: (Math.random() - .5) * .05,
      r: 1.2 + Math.random() * 1.4, cap: false
    }))
    function draw() {
      ctx.clearRect(0, 0, W, H)
      // cielo
      const skyG = ctx.createLinearGradient(0, 0, 0, WY)
      skyG.addColorStop(0, '#010307'); skyG.addColorStop(.7, '#020c1a'); skyG.addColorStop(1, '#04172a')
      ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, WY)
      // estrellas
      [[20,8],[52,5],[96,12],[148,4],[200,10],[260,6],[330,14],[400,5],[440,18],[36,22],[160,20],[300,16]].forEach(([sx,sy],i) => {
        ctx.globalAlpha = .2 + Math.sin(t * .03 + i * 1.4) * .15; ctx.fillStyle = '#cce8ff'; ctx.fillRect(sx, sy, 1, 1)
      }); ctx.globalAlpha = 1
      // luna
      const moon = ctx.createRadialGradient(418,16,0,418,16,40); moon.addColorStop(0,'rgba(210,230,255,.09)'); moon.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle = moon; ctx.fillRect(378,0,80,56)
      // mar
      const seaG = ctx.createLinearGradient(0, WY, 0, H); seaG.addColorStop(0,'#03182e'); seaG.addColorStop(1,'#010a1a'); ctx.fillStyle = seaG; ctx.fillRect(0, WY, W, H - WY)
      ctx.strokeStyle = 'rgba(12,88,155,.5)'; ctx.lineWidth = 1.2; ctx.beginPath()
      for (let x = 0; x <= W; x += 2) { const y = WY + Math.sin(x * .04 + t * .03) * 2.2 + Math.sin(x * .012 + t * .019) * 1.1; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }
      ctx.stroke()
      const bob = Math.sin(t * .024) * .6
      // sombra
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(115, WY + 3 + bob, 108, 5, 0, 0, Math.PI * 2); ctx.fill()
      // CASCO obra muerta
      ctx.fillStyle = '#28384e'; ctx.beginPath()
      ctx.moveTo(12, WY + bob); ctx.lineTo(6, WY - 5 + bob); ctx.bezierCurveTo(3, WY - 15 + bob, 8, WY - 26 + bob, 20, WY - 32 + bob)
      ctx.lineTo(38, WY - 36 + bob); ctx.lineTo(210, WY - 36 + bob); ctx.lineTo(220, WY - 24 + bob); ctx.lineTo(222, WY - 10 + bob); ctx.lineTo(222, WY + bob)
      ctx.closePath(); ctx.fill()
      // CASCO obra viva
      ctx.fillStyle = '#0a1520'; ctx.beginPath()
      ctx.moveTo(12, WY + bob); ctx.bezierCurveTo(4, WY + 12 + bob, 3, WY + 30 + bob, 12, WY + 40 + bob)
      ctx.bezierCurveTo(40, WY + 50 + bob, 100, WY + 54 + bob, 190, WY + 50 + bob)
      ctx.bezierCurveTo(210, WY + 44 + bob, 222, WY + 26 + bob, 222, WY + bob)
      ctx.closePath(); ctx.fill()
      // franja roja flotación
      ctx.strokeStyle = '#b81414'; ctx.lineWidth = 3.5; ctx.beginPath()
      ctx.moveTo(14, WY + 2 + bob); ctx.bezierCurveTo(50, WY + 7 + bob, 130, WY + 9 + bob, 192, WY + 7 + bob); ctx.bezierCurveTo(210, WY + 5 + bob, 220, WY + 2 + bob, 222, WY + 2 + bob); ctx.stroke()
      // línea cubierta
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(14, WY - 1 + bob); ctx.lineTo(220, WY - 1 + bob); ctx.stroke()
      // nombre
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.font = 'bold 6px "Courier New"'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      ctx.fillText('BITACORAAR', 76, WY - 18 + bob)
      // ── CASILLAJE EN PROA (izquierda) ──
      ctx.fillStyle = '#3e5670'; ctx.beginPath()
      ctx.moveTo(28, WY - 36 + bob); ctx.lineTo(28, WY - 96 + bob); ctx.lineTo(96, WY - 96 + bob); ctx.lineTo(96, WY - 36 + bob); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#4a6480'; ctx.fillRect(25, WY - 103 + bob, 74, 8)
      // ventanas puente
      ;[32, 46, 60, 74].forEach(wx => {
        ctx.fillStyle = 'rgba(0,200,255,.22)'; ctx.fillRect(wx, WY - 90 + bob, 9, 16)
        ctx.strokeStyle = 'rgba(0,200,255,.4)'; ctx.lineWidth = .7; ctx.strokeRect(wx, WY - 90 + bob, 9, 16)
      })
      // bloque inferior casillaje
      ctx.fillStyle = '#344a60'; ctx.fillRect(28, WY - 62 + bob, 68, 26)
      ;[34, 50, 68].forEach(wx => {
        ctx.fillStyle = 'rgba(255,190,50,.12)'; ctx.fillRect(wx, WY - 57 + bob, 8, 12)
        ctx.strokeStyle = '#3a5a78'; ctx.lineWidth = .5; ctx.strokeRect(wx, WY - 57 + bob, 8, 12)
      })
      // ── MÁSTIL ÚNICO Y GRUESO ──
      ctx.strokeStyle = '#7a8ea8'; ctx.lineWidth = 4
      ctx.beginPath(); ctx.moveTo(58, WY - 103 + bob); ctx.lineTo(58, WY - 148 + bob); ctx.stroke()
      // LUZ BLANCA en tope
      const blink = .65 + Math.sin(t * .07) * .3
      ctx.fillStyle = `rgba(255,255,235,${blink})`; ctx.shadowColor = '#ffffee'; ctx.shadowBlur = 10 * blink
      ctx.beginPath(); ctx.arc(58, WY - 150 + bob, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
      // LUZ VERDE lateral (mitad altura casillaje, lado de popa)
      ctx.fillStyle = '#00ee44'; ctx.shadowColor = '#00ff44'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.arc(96, WY - 64 + bob, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
      // ── PÓRTICO EN POPA ──
      const ptX1 = 174, ptX2 = 196, ptTop = WY - 100 + bob, ptBot = WY - 36 + bob
      ctx.strokeStyle = '#6a7e92'; ctx.lineWidth = 5
      ctx.beginPath(); ctx.moveTo(ptX1, ptBot); ctx.lineTo(ptX1, ptTop); ctx.stroke()
      ctx.strokeStyle = '#58707a'; ctx.lineWidth = 5
      ctx.beginPath(); ctx.moveTo(ptX2, ptBot); ctx.lineTo(ptX2, ptTop); ctx.stroke()
      ctx.strokeStyle = '#7a8ea2'; ctx.lineWidth = 5.5
      ctx.beginPath(); ctx.moveTo(ptX1 - 3, ptTop); ctx.lineTo(ptX2 + 3, ptTop); ctx.stroke()
      ;[ptX1, ptX2].forEach(px => {
        ctx.fillStyle = '#9aaab8'; ctx.beginPath(); ctx.arc(px, ptTop, 3, 0, Math.PI * 2); ctx.fill()
      })
      ctx.strokeStyle = 'rgba(100,125,145,.45)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(ptX1, ptTop + 14); ctx.lineTo(ptX2, ptBot); ctx.stroke()
      // WINCH bajo pórtico
      ctx.fillStyle = '#1c2c3e'; ctx.fillRect(202, WY - 50 + bob, 20, 14)
      ctx.strokeStyle = '#3a6080'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.arc(212, WY - 43 + bob, 7, 0, Math.PI * 2); ctx.stroke()
      ctx.save(); ctx.translate(212, WY - 43 + bob); ctx.rotate(t * .04)
      ctx.strokeStyle = 'rgba(60,130,160,.8)'; ctx.lineWidth = 1
      ;[0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(a => { ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); ctx.stroke() })
      ctx.restore()
      // ── WARPS desde popa ──
      const ws = Math.sin(t * .02) * .6
      ctx.shadowColor = '#e8c432'; ctx.shadowBlur = 5; ctx.strokeStyle = '#e8c432'; ctx.lineWidth = 1.8
      ctx.beginPath(); ctx.moveTo(222, WY + bob); ctx.bezierCurveTo(268, WY + 26 + ws, 306, WY + 54 + ws, 332, WY + 72); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(222, WY + bob); ctx.bezierCurveTo(270, WY + 34 + ws, 308, WY + 66 + ws, 332, WY + 84); ctx.stroke()
      ctx.shadowBlur = 0
      // portones
      const pa = .27 + Math.sin(t * .018) * .02
      function porton(px, py, ang) {
        ctx.save(); ctx.translate(px, py); ctx.rotate(ang)
        ctx.fillStyle = '#1a3060'; ctx.fillRect(-3, -11, 7, 22)
        ctx.shadowColor = '#0a7fff'; ctx.shadowBlur = 6; ctx.strokeStyle = '#0a7fff'; ctx.lineWidth = 1.2; ctx.strokeRect(-3, -11, 7, 22)
        ctx.shadowBlur = 0; ctx.restore()
      }
      porton(334, WY + 72, pa); porton(334, WY + 84, -pa)
      // malletas
      ctx.strokeStyle = 'rgba(0,200,255,.55)'; ctx.lineWidth = 1; ctx.setLineDash([3, 2])
      ctx.beginPath(); ctx.moveTo(334, WY + 67); ctx.lineTo(350, WY + 61); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(334, WY + 89); ctx.lineTo(350, WY + 95); ctx.stroke()
      ctx.setLineDash([])
      // red
      const ns = Math.sin(t * .019) * 1.6
      const bx = 350, byt = WY + 61, byb = WY + 95, sx = W - 12, sy = WY + 78 + ns
      ctx.shadowColor = '#00ff9d'; ctx.shadowBlur = 4; ctx.strokeStyle = 'rgba(0,255,157,.7)'; ctx.lineWidth = 1.3
      ctx.beginPath(); ctx.moveTo(bx, byt); ctx.bezierCurveTo(bx + 40, byt + ns, bx + 90, sy - 9 + ns, sx, sy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(bx, byb); ctx.bezierCurveTo(bx + 40, byb + ns, bx + 90, sy + 9 + ns, sx, sy); ctx.stroke()
      ctx.shadowBlur = 0
      for (let nm = 1; nm < 7; nm++) {
        const r = nm / 7, nx = bx + r * (sx - bx), ny1 = byt + (sy - byt) * r, ny2 = byb + (sy - byb) * r
        ctx.strokeStyle = `rgba(0,255,157,${.28 - .04 * nm})`; ctx.lineWidth = .6
        ctx.beginPath(); ctx.moveTo(nx, ny1); ctx.lineTo(nx, ny2); ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(0,255,157,.88)'; ctx.lineWidth = 1.8; ctx.shadowColor = '#00ff9d'; ctx.shadowBlur = 7
      ctx.beginPath(); ctx.moveTo(bx, byt); ctx.lineTo(bx, byb); ctx.stroke(); ctx.shadowBlur = 0
      // peces
      peces.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy + Math.sin(t * .04 + i * .85) * .04
        if (p.y < WY + 5) p.y = WY + 5; if (p.y > H - 5) p.y = H - 5
        if (p.x > sx + 4) { p.x = 170 + Math.random() * 50; p.y = WY + 14 + Math.random() * (H - WY - 28); p.cap = false }
        const nr = Math.max(0, (p.x - bx) / (sx - bx)), nt = byt + (sy - byt) * nr, nb = byb + (sy - byb) * nr
        if (p.x >= bx && p.x <= sx && p.y >= nt - 3 && p.y <= nb + 3) p.cap = true
        if (p.y <= WY) return
        ctx.globalAlpha = .72; ctx.fillStyle = p.cap ? '#ff6b1a' : '#00d4ff'
        ctx.beginPath(); ctx.moveTo(p.x + p.r * 2, p.y); ctx.bezierCurveTo(p.x + p.r * 2, p.y - p.r, p.x - p.r, p.y - p.r * .7, p.x - p.r, p.y); ctx.bezierCurveTo(p.x - p.r, p.y + p.r * .7, p.x + p.r * 2, p.y + p.r, p.x + p.r * 2, p.y); ctx.fill()
        ctx.beginPath(); ctx.moveTo(p.x - p.r, p.y); ctx.lineTo(p.x - p.r * 2.3, p.y - p.r * .75); ctx.lineTo(p.x - p.r * 2.3, p.y + p.r * .75); ctx.closePath(); ctx.fill()
        ctx.globalAlpha = 1
      })
      // header
      ctx.fillStyle = 'rgba(1,6,16,.9)'; ctx.fillRect(0, 0, W, 18)
      ctx.shadowColor = '#0a7fff'; ctx.shadowBlur = 4
      ctx.fillStyle = '#0a7fff'; ctx.font = 'bold 7px "Courier New"'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      ctx.fillText('◉ ARRASTRERO  ·  PÓRTICO · MÁSTIL · WARPS · PORTONES · RED', 8, 9); ctx.shadowBlur = 0
      t++; arrastreRafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(arrastreRafRef.current)
  }, [vista, seccion])

  // ── Animación radar (puente) ──
  useEffect(() => {
    if (vista !== 'radar' || seccion !== 'puente') return
    const cv = radarRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const W = 480, H = 300
    cv.width = W * dpr; cv.height = H * dpr
    ctx.scale(dpr, dpr)
    let t = 0
    function draw() {
      ctx.clearRect(0, 0, W, H)
      // fondo cabina
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#090b09'); bg.addColorStop(1, '#030603'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
      // consola curvada
      ctx.fillStyle = '#191208'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 185); ctx.bezierCurveTo(0, 138, 60, 110, 130, 106); ctx.lineTo(350, 106); ctx.bezierCurveTo(420, 110, W, 138, W, 185); ctx.lineTo(W, H); ctx.closePath(); ctx.fill()
      // teca
      const wood = ctx.createLinearGradient(0, 106, 0, 130); wood.addColorStop(0, '#6a3b17'); wood.addColorStop(.4, '#8a5026'); wood.addColorStop(.7, '#794720'); wood.addColorStop(1, '#592f10'); ctx.fillStyle = wood
      ctx.beginPath(); ctx.moveTo(0, 183); ctx.bezierCurveTo(0, 136, 60, 108, 130, 104); ctx.lineTo(350, 104); ctx.bezierCurveTo(420, 108, W, 136, W, 183); ctx.lineTo(W, 193); ctx.bezierCurveTo(W, 146, 420, 118, 350, 114); ctx.lineTo(130, 114); ctx.bezierCurveTo(60, 118, 0, 146, 0, 193); ctx.closePath(); ctx.fill()
      // trim cromado
      ctx.strokeStyle = 'rgba(190,210,230,.38)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 184); ctx.bezierCurveTo(0, 137, 60, 109, 130, 105); ctx.lineTo(350, 105); ctx.bezierCurveTo(420, 109, W, 137, W, 184); ctx.stroke()
      // ── RADAR CENTRAL ──
      const rx = W / 2, ry = 128, rr = 90
      ctx.fillStyle = '#0d1710'; ctx.beginPath(); ctx.arc(rx, ry, rr + 12, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = 'rgba(160,190,160,.2)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(rx, ry, rr + 12, 0, Math.PI * 2); ctx.stroke()
      ctx.shadowColor = '#00ff9d'; ctx.shadowBlur = 24; ctx.fillStyle = '#010e06'; ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
      ;[rr * .25, rr * .5, rr * .75, rr].forEach(r2 => {
        ctx.strokeStyle = r2 === rr ? '#0c2e1a' : '#071610'; ctx.lineWidth = r2 === rr ? 1.4 : .5
        ctx.beginPath(); ctx.arc(rx, ry, r2, 0, Math.PI * 2); ctx.stroke()
      })
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) { ctx.strokeStyle = '#071610'; ctx.lineWidth = .4; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr); ctx.stroke() }
      const sw = t * .028; ctx.save(); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.arc(rx, ry, rr, sw - 1.1, sw); ctx.closePath()
      const sg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr); sg.addColorStop(0, 'rgba(0,255,157,.26)'); sg.addColorStop(1, 'rgba(0,255,157,0)'); ctx.fillStyle = sg; ctx.fill(); ctx.restore()
      ctx.shadowColor = '#00ff9d'; ctx.shadowBlur = 12; ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(sw) * rr, ry + Math.sin(sw) * rr); ctx.stroke(); ctx.shadowBlur = 0
      ctx.fillStyle = '#00ff9d'; ctx.shadowColor = '#00ff9d'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
      ctx.strokeStyle = 'rgba(0,255,157,.16)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(rx - rr, ry); ctx.lineTo(rx + rr, ry); ctx.stroke(); ctx.beginPath(); ctx.moveTo(rx, ry - rr); ctx.lineTo(rx, ry + rr); ctx.stroke()
      ;[{ dx: 42, dy: 14, sp: .009, ph: 1.1 }, { dx: 30, dy: -28, sp: .007, ph: 3.5 }, { dx: 56, dy: 10, sp: .011, ph: 6.8 }, { dx: 22, dy: 36, sp: .013, ph: 0.4 }].forEach(b => {
        const bx = rx + Math.cos(t * b.sp + b.ph) * b.dx, by = ry + Math.sin(t * b.sp + b.ph) * b.dy
        const ang = Math.atan2(by - ry, bx - rx), diff = ((sw - ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
        if (diff < 1.3) {
          const fade = 1 - diff / 1.3
          ctx.fillStyle = `rgba(232,196,50,${.5 + fade * .5})`; ctx.shadowColor = '#e8c432'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, Math.PI * 2); ctx.fill()
          ctx.shadowBlur = 3; ctx.strokeStyle = `rgba(232,196,50,${fade * .5})`; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0
        }
      })
      ctx.fillStyle = '#1a5030'; ctx.font = '6px "Courier New"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('3 NM', rx, ry + rr - 8); ctx.fillText('RADAR', rx, ry - rr + 10)
      // ── RPM GAUGE — fijo en 3/4 ──
      const lx = 28, ly = 104, vr = 36, vcx = lx + 62, vcy = ly + 60
      ctx.fillStyle = '#0b1310'; ctx.fillRect(lx, ly, 124, 148); ctx.strokeStyle = 'rgba(0,255,157,.13)'; ctx.lineWidth = 1; ctx.strokeRect(lx, ly, 124, 148)
      ctx.fillStyle = '#070d0a'; ctx.beginPath(); ctx.arc(vcx, vcy, vr + 6, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = 'rgba(0,255,157,.2)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(vcx, vcy, vr + 6, 0, Math.PI * 2); ctx.stroke()
      // arco verde hasta 3/4
      const arcEnd = -Math.PI * .8 + (Math.PI * 1.6 * .75)
      ctx.strokeStyle = 'rgba(0,255,157,.12)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(vcx, vcy, vr, -Math.PI * .8, Math.PI * .8); ctx.stroke()
      ctx.strokeStyle = '#00cc7a'; ctx.lineWidth = 2.5; ctx.shadowColor = '#00ff9d'; ctx.shadowBlur = 5; ctx.beginPath(); ctx.arc(vcx, vcy, vr, -Math.PI * .8, arcEnd); ctx.stroke(); ctx.shadowBlur = 0
      // ticks
      for (let a = 0; a <= 12; a++) {
        const ang = -Math.PI * .8 + a * (Math.PI * 1.6 / 12)
        ctx.strokeStyle = a <= 9 ? 'rgba(0,255,157,.48)' : 'rgba(255,80,80,.65)'; ctx.lineWidth = a % 3 === 0 ? 1.6 : .6
        ctx.beginPath(); ctx.moveTo(vcx + Math.cos(ang) * (vr - 2), vcy + Math.sin(ang) * (vr - 2)); ctx.lineTo(vcx + Math.cos(ang) * (vr + 3), vcy + Math.sin(ang) * (vr + 3)); ctx.stroke()
      }
      // aguja fija en 3/4
      const na = -Math.PI * .8 + (Math.PI * 1.6 * .75)
      ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 2; ctx.shadowColor = '#00ff9d'; ctx.shadowBlur = 7; ctx.beginPath(); ctx.moveTo(vcx, vcy); ctx.lineTo(vcx + Math.cos(na) * vr, vcy + Math.sin(na) * vr); ctx.stroke(); ctx.shadowBlur = 0
      ctx.fillStyle = '#00ff9d'; ctx.beginPath(); ctx.arc(vcx, vcy, 3, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(0,255,157,.78)'; ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1850', vcx, vcy + 14)
      ctx.fillStyle = 'rgba(0,255,157,.4)'; ctx.font = '6px "Courier New"'; ctx.fillText('RPM', vcx, vcy + 24)
      ctx.fillStyle = 'rgba(0,255,157,.28)'; ctx.font = '6px "Courier New"'; ctx.textAlign = 'center'; ctx.fillText('MOTOR PPAL', vcx, ly + 12)
      // barra rumbo
      const cy2 = ly + 110, bw2 = 108
      ctx.fillStyle = '#040c08'; ctx.fillRect(lx + 8, cy2 - 10, bw2, 20); ctx.strokeStyle = 'rgba(0,255,157,.16)'; ctx.lineWidth = .7; ctx.strokeRect(lx + 8, cy2 - 10, bw2, 20)
      const hdg = 147 + Math.sin(t * .008) * 3
      for (let di = -5; di <= 5; di++) {
        const deg = (Math.round(hdg / 10) * 10 + di * 5 + 360) % 360, px2 = lx + 8 + bw2 / 2 + di * (bw2 / 10), major = di % 2 === 0
        ctx.strokeStyle = major ? 'rgba(0,255,157,.55)' : 'rgba(0,255,157,.2)'; ctx.lineWidth = major ? 1 : .5
        ctx.beginPath(); ctx.moveTo(px2, cy2 - (major ? 7 : 3)); ctx.lineTo(px2, cy2 + (major ? 7 : 3)); ctx.stroke()
        if (major) { ctx.fillStyle = 'rgba(0,255,157,.45)'; ctx.font = '5px "Courier New"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(deg, px2, cy2 + 14) }
      }
      ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx + 8 + bw2 / 2, cy2 - 11); ctx.lineTo(lx + 8 + bw2 / 2, cy2 + 11); ctx.stroke()
      ctx.fillStyle = '#00ff9d'; ctx.font = 'bold 8px "Courier New"'; ctx.textAlign = 'center'; ctx.fillText(Math.round(hdg) + '°', lx + 8 + bw2 / 2, cy2 - 18)
      ctx.fillStyle = 'rgba(0,255,157,.38)'; ctx.font = '6px "Courier New"'; ctx.fillText('RUMBO', lx + 8 + bw2 / 2, cy2 + 26)
      // ── PANEL DERECHO: navegación ──
      const ppx = W - 132, ppy = 104, ppw = 124, pph = 148
      ctx.fillStyle = '#0b1310'; ctx.fillRect(ppx, ppy, ppw, pph); ctx.strokeStyle = 'rgba(0,200,255,.13)'; ctx.lineWidth = 1; ctx.strokeRect(ppx, ppy, ppw, pph)
      ctx.fillStyle = 'rgba(0,200,255,.28)'; ctx.font = '6px "Courier New"'; ctx.textAlign = 'center'; ctx.fillText('NAVEGACIÓN', ppx + ppw / 2, ppy + 11)
      ;[{ lbl: 'PROF', val: '48 m', col: '#0a7fff' }, { lbl: 'TEMP', val: '14.2°', col: '#e8c432' }, { lbl: 'VIENTO', val: '12 kn', col: '#00ff9d' }, { lbl: 'MAREA', val: 'Bajante', col: '#c084fc' }].forEach((r, i) => {
        const ry2 = ppy + 22 + i * 26
        ctx.fillStyle = r.col + '12'; ctx.fillRect(ppx + 6, ry2, ppw - 12, 20); ctx.strokeStyle = r.col + '35'; ctx.lineWidth = .7; ctx.strokeRect(ppx + 6, ry2, ppw - 12, 20)
        ctx.fillStyle = r.col + '80'; ctx.fillRect(ppx + 6, ry2, 2.5, 20)
        ctx.fillStyle = 'rgba(160,190,170,.48)'; ctx.font = '6px "Courier New"'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(r.lbl, ppx + 13, ry2 + 10)
        ctx.fillStyle = r.col; ctx.font = 'bold 8px "Courier New"'; ctx.textAlign = 'right'; ctx.fillText(r.val, ppx + ppw - 8, ry2 + 10)
      })
      const alarm = Math.sin(t * .055) > .72
      ctx.fillStyle = alarm ? 'rgba(255,50,50,.13)' : 'rgba(0,255,50,.07)'; ctx.fillRect(ppx + 6, ppy + 128, ppw - 12, 16)
      ctx.strokeStyle = alarm ? 'rgba(255,80,80,.5)' : 'rgba(0,255,80,.25)'; ctx.lineWidth = .8; ctx.strokeRect(ppx + 6, ppy + 128, ppw - 12, 16)
      ctx.fillStyle = alarm ? '#ff4444' : '#44ff88'; ctx.font = 'bold 7px "Courier New"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(alarm ? '◉ AIS ALERTA' : '● AIS OK', ppx + ppw / 2, ppy + 136)
      // ── TIMÓN EN T — plateado/cromado ──
      const tx = W / 2, ty = 272
      const vG = ctx.createLinearGradient(tx - 6, 0, tx + 6, 0); vG.addColorStop(0, '#6a7a88'); vG.addColorStop(.4, '#c8d8e8'); vG.addColorStop(.7, '#9aaab8'); vG.addColorStop(1, '#5a6a78')
      ctx.fillStyle = vG; ctx.fillRect(tx - 5, ty - 36, 10, 40)
      const barG = ctx.createLinearGradient(0, ty - 46, 0, ty - 34); barG.addColorStop(0, '#788898'); barG.addColorStop(.4, '#d0e0f0'); barG.addColorStop(.7, '#a0b0c0'); barG.addColorStop(1, '#607080')
      ctx.fillStyle = barG; ctx.fillRect(tx - 42, ty - 48, 84, 13)
      ;[tx - 42, tx + 42].forEach(ex => {
        const eg = ctx.createRadialGradient(ex, ty - 42, 0, ex, ty - 42, 8); eg.addColorStop(0, '#e0f0ff'); eg.addColorStop(1, '#6080a0')
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ty - 42, 7, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = 'rgba(200,220,240,.55)'; ctx.lineWidth = .8; ctx.stroke()
      })
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(tx - 40, ty - 47, 80, 4)
      ctx.fillStyle = '#252e34'; ctx.fillRect(tx - 9, ty, 18, 12); ctx.strokeStyle = 'rgba(160,180,200,.35)'; ctx.lineWidth = .8; ctx.strokeRect(tx - 9, ty, 18, 12)
      ctx.fillStyle = 'rgba(160,185,195,.3)'; ctx.font = '5px "Courier New"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TIMÓN', tx, ty + 19)
      // ── DOS PALANCAS EN T (derecha) ──
      function palancaT(jx, jy, label, col) {
        ctx.fillStyle = '#141814'; ctx.beginPath(); ctx.ellipse(jx, jy + 14, 11, 5, 0, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = 'rgba(160,180,160,.28)'; ctx.lineWidth = .8; ctx.stroke()
        const vGp = ctx.createLinearGradient(jx - 4, 0, jx + 4, 0); vGp.addColorStop(0, '#2a3028'); vGp.addColorStop(.5, '#4a5448'); vGp.addColorStop(1, '#1e2420')
        ctx.fillStyle = vGp; ctx.fillRect(jx - 4, jy - 18, 8, 32)
        const joff = Math.sin(t * .02 + jx * .008) * 3
        const tG = ctx.createLinearGradient(jx - 18, jy - 40 + joff, jx + 18, jy - 40 + joff); tG.addColorStop(0, '#383838'); tG.addColorStop(.5, '#626262'); tG.addColorStop(1, '#383838')
        ctx.fillStyle = tG; ctx.fillRect(jx - 18, jy - 43 + joff, 36, 8)
        ctx.fillStyle = '#2a2e28'; ctx.fillRect(jx - 3, jy - 43 + joff, 6, 25)
        ;[jx - 18, jx + 18].forEach(ex => {
          ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 7; ctx.beginPath(); ctx.arc(ex, jy - 39 + joff, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
        })
        ctx.fillStyle = 'rgba(180,200,180,.32)'; ctx.font = '5px "Courier New"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, jx, jy + 24)
      }
      palancaT(W - 90, 252, 'PROP BD', '#00d4ff')
      palancaT(W - 40, 252, 'PROP ER', '#e8c432')
      // header
      ctx.fillStyle = 'rgba(2,6,3,.92)'; ctx.fillRect(0, 0, W, 16)
      ctx.shadowColor = '#00ff9d'; ctx.shadowBlur = 4
      ctx.fillStyle = '#00ff9d'; ctx.font = 'bold 7px "Courier New"'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      ctx.fillText('◉ PUENTE  ·  RADAR · RPM · RUMBO · TIMÓN T · PROPULSIÓN', 8, 8); ctx.shadowBlur = 0
      t++; radarRafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(radarRafRef.current)
  }, [vista, seccion])

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
      const imagenProcesada = await preprocesarImagen(file, 2)
      const worker = await createWorker('eng')
      // Pasada 1: PSM 7 = línea de texto única (mejor para etiquetas con código solo)
      await worker.setParameters({ tessedit_pageseg_mode: '7' })
      const { data: { text: text7 } } = await worker.recognize(imagenProcesada)
      // Pasada 2: PSM 11 = texto disperso (mejor para etiquetas con múltiples textos)
      await worker.setParameters({ tessedit_pageseg_mode: '11' })
      const { data: { text: text11 } } = await worker.recognize(imagenProcesada)
      await worker.terminate()
      const codigo7 = extraerCodigo(text7)
      const codigo11 = extraerCodigo(text11)
      // Preferir el que matchea un patrón de marca conocida (más específico)
      const codigo = codigo7.length >= codigo11.length ? codigo7 : codigo11
      const texto = (text7 + '\n' + text11).trim()
      setOcr({ activo: true, progreso: false, texto, codigo })
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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#070f1e' }}>

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
          ...(seccion === 'maquinas' ? [['hud', 'Blueprint HUD']] : []),
          ...(seccion === 'cubierta' ? [['arrastre', 'Sistema arrastre']] : []),
          ...(seccion === 'puente' ? [['radar', 'Radar']] : []),
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

        {/* ===== VISTA HUD ANIMADO (solo maquinas) ===== */}
        {vista === 'hud' && seccion === 'maquinas' && (
          <div style={{ background: '#02080f', display: 'flex', justifyContent: 'center' }}>
            <canvas ref={hudRef} width={800} height={340} style={{ width: '100%', maxWidth: 700, height: 'auto', display: 'block' }} />
          </div>
        )}

        {vista === 'arrastre' && seccion === 'cubierta' && (
          <div style={{ background: '#010c1c', display: 'flex', justifyContent: 'center' }}>
            <canvas ref={arrastreRef} style={{ width: '100%', maxWidth: 600, height: 'auto', display: 'block' }} />
          </div>
        )}

        {vista === 'radar' && seccion === 'puente' && (
          <div style={{ background: '#021208', display: 'flex', justifyContent: 'center' }}>
            <canvas ref={radarRef} style={{ width: '100%', maxWidth: 600, height: 'auto', display: 'block' }} />
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
