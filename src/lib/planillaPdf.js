// ─────────────────────────────────────────────────────────────────────────────
// Generador de la Planilla de Cómputo de Singladuras y Despachos
// (Armada Argentina / REFOCAPEMM) — 100% client-side con pdf-lib.
//
// Modo de operación:
//   1. OVERLAY (preferido): carga la plantilla oficial en blanco desde
//      /planilla-refocapemm.pdf (carpeta public/) y escribe el texto ENCIMA en
//      las coordenadas de COORDS. No redibuja el formulario.
//   2. FALLBACK: si la plantilla no está, genera un layout propio legible para
//      poder probar datos y flujo. Se marca como "PRELIMINAR".
//
// Un juego de planillas = un solo período = un solo barco. Si el período tiene
// más viajes que FILAS_POR_HOJA, se pagina duplicando la plantilla; el TOTAL va
// solo en la última hoja.
//
// CALIBRACIÓN: la plantilla oficial es tamaño oficio (612 × 1008 pt). Las
// coordenadas de COORDS son una primera aproximación y se ajustan tras la
// primera impresión de prueba. Para calibrar, generá con { debugGrid: true }:
// estampa una grilla numerada cada 50 pt sobre la plantilla, leés dónde cae
// cada campo y corregís los números de COORDS. Nada más se toca.
// ─────────────────────────────────────────────────────────────────────────────

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { calcularSingladuras } from './singladuras.js'

const URL_PLANTILLA = '/planilla-refocapemm.pdf'
const FILAS_POR_HOJA = 31 // renglones "/ /" de la tabla oficial (medido en grilla)

// ─── Coordenadas de overlay ─────────────────────────────────────────────────
// pdf-lib usa origen ABAJO-IZQUIERDA, unidad = punto (1/72"). Página oficio.
// `sep` en fechas = separación en pt entre día, mes y año (slots "__/__/__").
export const COORDS = {
  pagina: { width: 612, height: 1008 },

  // Cabecera — tripulante (y medido desde abajo)
  apellidoNombres: { x: 200, y: 905, size: 10 },
  documento:       { x: 25,  y: 884, size: 9 },
  titulo:          { x: 185, y: 884, size: 9 },
  nroTitulo:       { x: 458, y: 884, size: 9 },
  nroLibreta:      { x: 545, y: 884, size: 9 },

  // Bloque derecho — período de embarco (fechas en partes)
  periodo: {
    puertoSalida:    { x: 415, y: 787, size: 8 },
    fechaSalida:     { x: 508, y: 787, size: 8, sep: 16 },
    puertoLlegada:   { x: 415, y: 737, size: 8 },
    fechaLlegada:    { x: 508, y: 737, size: 8, sep: 16 },
    buqueNombre:     { x: 410, y: 695, size: 8 },
    potenciaKW:      { x: 548, y: 668, size: 8 },
    empleoABordo:    { x: 410, y: 632, size: 8 },
  },

  // Tabla central — viajes. Primer renglón en yInicial, bajando altoFila.
  // 31 renglones "/ /", paso ~14.4 pt (medido con la grilla de calibración).
  filas: {
    yInicial: 804,
    altoFila: 14.4,
    puertoSalida: { x: 20,  size: 7 },
    fechaSalida:  { x: 108, size: 7, sep: 16 },
    puertoLlegada:{ x: 180, size: 7 },
    fechaLlegada: { x: 308, size: 7, sep: 16 },
    marRio:       { x: 388, size: 7 },
    computo:      { x: 448, size: 7 },
  },

  // Total (última hoja) — fila TOTAL al pie de la tabla
  total: { x: 448, y: 350, size: 10 },
}

// 'YYYY-MM-DD' → 'DD/MM/AAAA' (para el fallback).
function fmtFecha(iso) {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso)
}

// 'YYYY-MM-DD' → { dd, mm, aaaa } (para los slots pre-impresos del overlay).
function fmtFechaPartes(iso) {
  if (!iso) return null
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? { dd: m[3], mm: m[2], aaaa: m[1] } : null
}

// Arma el modelo de datos que consume el PDF a partir de las fuentes de la app.
// `modo` = 'singladuras' | 'dias'. Sólo cambia la columna de cómputo y el TOTAL.
export function construirDatosPlanilla({ periodo, libreta, perfil, fichaMotor, modo = 'singladuras' }) {
  const docTitulo = (libreta?.documentos || []).find(d => /t[íi]tulo/i.test(d.nombre || ''))
  const potenciaKW = fichaMotor?.motorPrincipal?.potenciaKW || ''

  const filas = periodo.viajes.map(v => ({
    puertoSalida: v.puertoPartida || '',
    fechaSalida: v.fechaSalida || '',
    puertoLlegada: v.puertoLlegada || '',
    fechaLlegada: v.fechaRegreso || '',
    marRio: 'Mar', // pesca de altura ⇒ Mar por defecto (campo no modelado)
    computo: modo === 'dias' ? '' : String(calcularSingladuras(v.fechaSalida, v.fechaRegreso)),
  }))

  const total = modo === 'dias' ? periodo.totalDiasEmbarcado : periodo.totalSingladuras

  return {
    // Cabecera
    apellidoNombres: libreta?.nombre || '',
    documento: libreta?.dni || '',
    titulo: '',                         // no modelado → en blanco (proxy: perfil.rango)
    nroTitulo: docTitulo?.numero || '',
    nroLibreta: libreta?.nroLibreta || '',
    // Bloque derecho (período)
    periodoFechaSalida: periodo.fechaEmbarco || '',
    periodoPuertoSalida: '',            // no modelado → en blanco
    periodoFechaLlegada: periodo.fechaDesembarco || '',
    periodoPuertoLlegada: '',           // no modelado → en blanco
    buqueNombre: periodo.barco || '',
    potenciaKW: potenciaKW ? String(potenciaKW) : '',
    empleoABordo: perfil?.rango || '',
    // Tabla
    filas,
    total: String(total),
    modo,
    modoLabel: modo === 'dias' ? 'DÍAS' : 'SINGL.',
  }
}

async function intentarCargarPlantilla() {
  try {
    const resp = await fetch(URL_PLANTILLA)
    if (!resp.ok) return null
    const buf = await resp.arrayBuffer()
    const head = new Uint8Array(buf.slice(0, 4))
    if (head[0] !== 0x25 || head[1] !== 0x50) return null // '%P'
    return buf
  } catch {
    return null
  }
}

function paginar(filas) {
  const hojas = []
  for (let i = 0; i < filas.length; i += FILAS_POR_HOJA) {
    hojas.push(filas.slice(i, i + FILAS_POR_HOJA))
  }
  return hojas.length ? hojas : [[]]
}

// Estampa una grilla de calibración (cada 50 pt) sobre una página.
function estamparGrid(page, font) {
  const { width, height } = page.getSize()
  const azul = rgb(0.1, 0.5, 0.9)
  for (let x = 0; x <= width; x += 50) {
    page.drawLine({ start: { x, y: 0 }, end: { x, y: height }, thickness: 0.3, color: azul, opacity: 0.4 })
    for (let y = 0; y <= height; y += 50) {
      page.drawText(`${x},${y}`, { x: x + 1, y: y + 1, size: 5, font, color: azul, opacity: 0.7 })
    }
  }
  for (let y = 0; y <= height; y += 50) {
    page.drawLine({ start: { x: 0, y }, end: { x: width, y }, thickness: 0.3, color: azul, opacity: 0.4 })
  }
}

// Escribe una fecha en partes (dd, mm, aaaa) sobre los slots pre-impresos.
function escribirFechaPartes(page, font, cfg, iso) {
  const p = fmtFechaPartes(iso)
  if (!p || !cfg) return
  const opt = { size: cfg.size || 8, font, color: rgb(0, 0, 0) }
  const sep = cfg.sep || 14
  page.drawText(p.dd,   { x: cfg.x,           y: cfg.y, ...opt })
  page.drawText(p.mm,   { x: cfg.x + sep,     y: cfg.y, ...opt })
  page.drawText(p.aaaa, { x: cfg.x + sep * 2, y: cfg.y, ...opt })
}

// Escribe el texto de una hoja sobre una página de la plantilla (overlay).
function escribirHoja(page, font, datos, filasHoja, esUltima) {
  const draw = (cfg, text) => {
    if (!cfg || text == null || text === '') return
    page.drawText(String(text), { x: cfg.x, y: cfg.y, size: cfg.size || 9, font, color: rgb(0, 0, 0) })
  }

  // Cabecera (se repite en todas las hojas)
  draw(COORDS.apellidoNombres, datos.apellidoNombres)
  draw(COORDS.documento, datos.documento)
  draw(COORDS.titulo, datos.titulo)
  draw(COORDS.nroTitulo, datos.nroTitulo)
  draw(COORDS.nroLibreta, datos.nroLibreta)

  // Bloque derecho — período
  const P = COORDS.periodo
  draw(P.puertoSalida, datos.periodoPuertoSalida)
  escribirFechaPartes(page, font, P.fechaSalida, datos.periodoFechaSalida)
  draw(P.puertoLlegada, datos.periodoPuertoLlegada)
  escribirFechaPartes(page, font, P.fechaLlegada, datos.periodoFechaLlegada)
  draw(P.buqueNombre, datos.buqueNombre)
  draw(P.potenciaKW, datos.potenciaKW)
  draw(P.empleoABordo, datos.empleoABordo)
  // La columna de cómputo ya está rotulada "Singladuras" en la plantilla oficial;
  // no se estampa etiqueta de modo para no ensuciar. En modo "días" la columna
  // por viaje queda vacía y sólo se completa el TOTAL.

  // Tabla de viajes
  const f = COORDS.filas
  filasHoja.forEach((fila, i) => {
    const y = f.yInicial - i * f.altoFila
    draw({ x: f.puertoSalida.x, y, size: f.puertoSalida.size }, fila.puertoSalida)
    escribirFechaPartes(page, font, { ...f.fechaSalida, y }, fila.fechaSalida)
    draw({ x: f.puertoLlegada.x, y, size: f.puertoLlegada.size }, fila.puertoLlegada)
    escribirFechaPartes(page, font, { ...f.fechaLlegada, y }, fila.fechaLlegada)
    draw({ x: f.marRio.x, y, size: f.marRio.size }, fila.marRio)
    draw({ x: f.computo.x, y, size: f.computo.size }, fila.computo)
  })

  if (esUltima) draw(COORDS.total, datos.total)
}

// ─── Fallback: layout propio cuando no hay plantilla oficial ────────────────
function dibujarFallback(pdf, font, fontBold, datos, filasHoja, esUltima, nroHoja, totalHojas) {
  const { width, height } = COORDS.pagina
  const page = pdf.addPage([width, height])
  const negro = rgb(0.05, 0.05, 0.05)
  const gris = rgb(0.45, 0.45, 0.45)
  let y = height - 40

  const txt = (t, x, yy, size = 9, bold = false, color = negro) =>
    page.drawText(String(t ?? ''), { x, y: yy, size, font: bold ? fontBold : font, color })

  txt('PLANILLA DE CÓMPUTO DE SINGLADURAS Y DESPACHOS', 40, y, 12, true)
  y -= 14
  txt('Armada Argentina · REFOCAPEMM', 40, y, 8, false, gris)
  txt('LAYOUT PRELIMINAR — falta la plantilla oficial en public/planilla-refocapemm.pdf', 40, y - 11, 7, false, rgb(0.7, 0.3, 0.1))
  y -= 34

  const colD = 330
  txt('Apellido y Nombres:', 40, y, 8, true); txt(datos.apellidoNombres, 145, y)
  txt('Embarco:', colD, y, 8, true); txt(`${datos.periodoPuertoSalida} ${fmtFecha(datos.periodoFechaSalida)}`.trim(), colD + 55, y)
  y -= 15
  txt('DNI/LE/Nº:', 40, y, 8, true); txt(datos.documento, 145, y)
  txt('Desembarco:', colD, y, 8, true); txt(`${datos.periodoPuertoLlegada} ${fmtFecha(datos.periodoFechaLlegada)}`.trim(), colD + 62, y)
  y -= 15
  txt('Título:', 40, y, 8, true); txt(datos.titulo || '—', 145, y)
  txt('Buque:', colD, y, 8, true); txt(datos.buqueNombre, colD + 40, y)
  y -= 15
  txt('Nº de título:', 40, y, 8, true); txt(datos.nroTitulo, 145, y)
  txt('Potencia (KW):', colD, y, 8, true); txt(datos.potenciaKW || '—', colD + 75, y)
  y -= 15
  txt('Nº libreta embarco:', 40, y, 8, true); txt(datos.nroLibreta, 145, y)
  txt('Empleo a bordo:', colD, y, 8, true); txt(datos.empleoABordo, colD + 80, y)
  y -= 26

  txt('Resumen de viajes', 40, y, 9, true)
  txt(`Cómputo: ${datos.modo === 'dias' ? 'DÍAS EMBARCADO' : 'SINGLADURAS'}`, colD, y, 8, true, rgb(0.1, 0.4, 0.5))
  y -= 14
  const cols = [['Puerto salida', 40], ['Fecha', 150], ['Puerto llegada', 210], ['Fecha', 320], ['Mar/Río', 385], [datos.modo === 'dias' ? 'Días' : 'Singl.', 445]]
  cols.forEach(([label, x]) => txt(label, x, y, 7, true, gris))
  y -= 3
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: gris })
  y -= 12

  filasHoja.forEach(fila => {
    txt(fila.puertoSalida, 40, y, 8)
    txt(fmtFecha(fila.fechaSalida), 150, y, 8)
    txt(fila.puertoLlegada, 210, y, 8)
    txt(fmtFecha(fila.fechaLlegada), 320, y, 8)
    txt(fila.marRio, 385, y, 8)
    txt(fila.computo, 460, y, 8)
    y -= 16
  })

  if (esUltima) {
    y -= 4
    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: gris })
    y -= 16
    txt('TOTAL', 385, y, 9, true)
    txt(datos.total, 460, y, 10, true)
    y -= 40
    page.drawLine({ start: { x: 60, y }, end: { x: 240, y }, thickness: 0.5, color: gris })
    page.drawLine({ start: { x: 340, y }, end: { x: 520, y }, thickness: 0.5, color: gris })
    txt('Jefe de Máquinas', 110, y - 12, 8, false, gris)
    txt('Capitán', 410, y - 12, 8, false, gris)
  }

  txt(`Hoja ${nroHoja} de ${totalHojas}`, width - 90, 30, 7, false, gris)
}

// Genera el PDF completo del período. Devuelve { bytes, overlay }.
export async function generarPlanillaPeriodo({ periodo, libreta, perfil, fichaMotor, modo = 'singladuras', debugGrid = false }) {
  const datos = construirDatosPlanilla({ periodo, libreta, perfil, fichaMotor, modo })
  const hojas = paginar(datos.filas)
  const plantillaBuf = await intentarCargarPlantilla()

  if (plantillaBuf) {
    const pdf = await PDFDocument.create()
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const plantilla = await PDFDocument.load(plantillaBuf)

    for (let i = 0; i < hojas.length; i++) {
      const [pag] = await pdf.copyPages(plantilla, [0])
      pdf.addPage(pag)
      const page = pdf.getPage(i)
      if (debugGrid) estamparGrid(page, font)
      escribirHoja(page, font, datos, hojas[i], i === hojas.length - 1)
    }
    return { bytes: await pdf.save(), overlay: true }
  }

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  hojas.forEach((hoja, i) =>
    dibujarFallback(pdf, font, fontBold, datos, hoja, i === hojas.length - 1, i + 1, hojas.length)
  )
  return { bytes: await pdf.save(), overlay: false }
}

// ¿El dispositivo puede compartir archivos por el share nativo? (típicamente
// móvil). En escritorio esto suele dar false o abrir una hoja inútil, por eso
// la descarga es siempre el camino por defecto y compartir es opcional.
export function puedeCompartirArchivos() {
  try {
    if (!navigator.canShare || typeof navigator.share !== 'function') return false
    const probe = new File([new Uint8Array([0])], 'probe.pdf', { type: 'application/pdf' })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

// Descarga directa del PDF (método confiable en escritorio y móvil).
export function descargarPlanilla({ bytes, nombreArchivo }) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
  return 'descargado'
}

// Comparte el PDF por el share nativo. Devuelve 'compartido' | 'cancelado' |
// 'no-soportado' | 'error'.
export async function compartirPlanilla({ bytes, nombreArchivo }) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const file = new File([blob], nombreArchivo, { type: 'application/pdf' })
  if (!puedeCompartirArchivos()) return 'no-soportado'
  try {
    await navigator.share({ files: [file], title: 'Planilla de singladuras' })
    return 'compartido'
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelado'
    return 'error'
  }
}
