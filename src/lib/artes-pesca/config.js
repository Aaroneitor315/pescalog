// Metadatos de UI para las calculadoras de aparejo de arrastre.
// Sin JSX ni React: solo datos + referencias a las funciones puras de `calculos.js`.
// Los íconos se declaran como SLUG (string), la UI resuelve el componente.

import {
  coefSuperficieArmado,
  pesoPano,
  flotabilidadFlotador,
  balanceFlotacionLastre,
  seleccionPuertas,
  potenciaTension,
  cableProfundidad,
  potenciaGuinche,
  seleccionCableAcero,
  areaBarrida,
} from './calculos.js'

// Fuentes de las fórmulas y tablas.
export const FUENTES = [
  'INIDEP (BIP Dr. Víctor Angelescu; red VA-06/21; red tangonera)',
  'FAO — Guía de bolsillo del pescador',
  'Res. 514/2000 (DEJUPA) y 327/2000 (DISELA II)',
]
const FUENTE_INIDEP = 'INIDEP / FAO — Guía de bolsillo del pescador'

// ── A) Tipos de pesca ────────────────────────────────────────────────────────
export const TIPOS_PESCA = [
  {
    id: 'fondo',
    label: 'Arrastre de fondo',
    descripcionCorta: 'Merluza, corvina y variado costero.',
    glosario: [
      { termino: 'Relinga', definicion: 'Cabo que refuerza y da forma al borde de la red (superior/inferior).' },
      { termino: 'Coeficiente de armado (E)', definicion: 'Relación entre la longitud montada y la del paño estirado (E = R/F).' },
      { termino: 'Copo', definicion: 'Parte final de la red donde se acumula la captura.' },
      { termino: 'Puertas', definicion: 'Planos que abren horizontalmente la boca de la red durante el arrastre.' },
    ],
  },
  {
    id: 'pelagico',
    label: 'Pelágico / media agua',
    descripcionCorta: 'Anchoíta y caballa.',
    glosario: [
      { termino: 'Media agua', definicion: 'Arrastre entre la superficie y el fondo, sin tocar el lecho.' },
      { termino: 'Abertura vertical', definicion: 'Altura de la boca de la red; clave en pelágico.' },
      { termino: 'Relinga superior (RS)', definicion: 'Borde superior de la boca; en pelágico AH ≈ RS · 0,50.' },
    ],
  },
  {
    id: 'langostino',
    label: 'Langostinero (tangonero)',
    descripcionCorta: 'Langostino.',
    glosario: [
      { termino: 'Tangón', definicion: 'Botalón lateral del que se largan las redes en el tangonero.' },
      { termino: 'Bolsa', definicion: 'Cuerpo de la red donde se retiene el langostino.' },
      { termino: 'DEJU / DET', definicion: 'Dispositivos de escape (juveniles/tortugas) exigidos por normativa.' },
    ],
  },
]

// ── B) Categorías de cálculo ─────────────────────────────────────────────────
export const CATEGORIAS = [
  { id: 'armado', label: 'Armado de red', icono: 'grid-3x3' },
  { id: 'flotacion', label: 'Flotación / lastre', icono: 'life-buoy' },
  { id: 'puertas', label: 'Puertas', icono: 'door-open' },
  { id: 'cables', label: 'Cables, tensión y potencia', icono: 'cable' },
  { id: 'area', label: 'Área barrida', icono: 'scan-line' },
]

// Helper de opciones de select.
const op = (value, label) => ({ value, label })

// ── C) Calculadoras ──────────────────────────────────────────────────────────
export const CALCULADORAS = [
  // ---- Armado ----
  {
    id: 'coef_superficie_armado',
    categoria: 'armado',
    titulo: 'Coeficiente y superficie de armado',
    subtitulo: 'Cuánto se “embolsa” el paño y su superficie real.',
    inputs: [
      { id: 'R', label: 'Longitud montada / relinga (R)', unidad: 'm', placeholder: 'ej: 30' },
      { id: 'F', label: 'Longitud del paño estirado (F)', unidad: 'm', placeholder: 'ej: 50' },
      { id: 'L', label: 'N.º de mallas a lo largo (L)', unidad: 'mallas', placeholder: 'ej: 400' },
      { id: 'H', label: 'N.º de mallas de altura (H)', unidad: 'mallas', placeholder: 'ej: 120' },
      { id: 'M2', label: 'Tamaño de malla (M2)', unidad: 'm', placeholder: 'ej: 0,12' },
    ],
    calcular: coefSuperficieArmado,
    formulas: ['E = R / F', 'S = E · L · H · M2²'],
    explicacion: 'E indica cuánto se acorta el paño al montarlo: 1 sería sin armado y valores bajos, muy embolsado. S es la superficie de red que realmente trabaja.',
    fuente: FUENTE_INIDEP,
    notas: ['E útil 0,30–0,90', 'Borde de boca ≈ 0,50', 'Óptimo en E = 0,71'],
  },
  {
    id: 'peso_pano',
    categoria: 'armado',
    titulo: 'Peso de un paño',
    subtitulo: 'Estimación del peso del paño de red.',
    inputs: [
      { id: 'H_hileras', label: 'Hileras de malla (H)', unidad: 'hileras', placeholder: 'ej: 120' },
      { id: 'L', label: 'Longitud del paño (L)', unidad: 'm', placeholder: 'ej: 50' },
      { id: 'Rtex', label: 'Título del hilo (Rtex)', unidad: 'Rtex', placeholder: 'ej: 4000' },
      { id: 'K', label: 'Factor de nudos (K)', unidad: '', opcional: true, defecto: 1, placeholder: '1' },
    ],
    calcular: pesoPano,
    formulas: ['P = H · L · Rtex · K'],
    explicacion: 'Aproxima el peso del paño a partir del título del hilo (Rtex). Sin nudos K = 1; con nudos K ≈ 1,02–2,07.',
    fuente: FUENTE_INIDEP,
    notas: ['Sin nudos K = 1', 'Con nudos K ≈ 1,02–2,07'],
  },

  // ---- Flotación ----
  {
    id: 'flotabilidad_flotador',
    categoria: 'flotacion',
    titulo: 'Flotabilidad de un flotador',
    subtitulo: 'Empuje de un flotador según su forma.',
    inputs: [
      { id: 'forma', label: 'Forma', unidad: '', tipo: 'select', defecto: 'cilindrico', opciones: [op('cilindrico', 'Cilíndrico'), op('oval', 'Oval')] },
      { id: 'L', label: 'Largo (L)', unidad: 'cm', placeholder: 'ej: 20' },
      { id: 'D', label: 'Diámetro (D)', unidad: 'cm', placeholder: 'ej: 10' },
    ],
    calcular: flotabilidadFlotador,
    formulas: ['Cilíndrico: Fb = 0,55 · L · D²', 'Oval: Fb = 0,67 · L · D²'],
    explicacion: 'Empuje aproximado (en gramos-fuerza) de un flotador según su geometría. L y D en centímetros.',
    fuente: FUENTE_INIDEP,
  },
  {
    id: 'balance_flotacion_lastre',
    categoria: 'flotacion',
    titulo: 'Balance flotación / lastre',
    subtitulo: 'Flotabilidad total necesaria para equilibrar el aparejo.',
    inputs: [
      { id: 'pesoRedAgua', label: 'Peso de la red en el agua', unidad: 'kg', placeholder: 'ej: 300' },
      { id: 'pesoLastreAgua', label: 'Peso del lastre en el agua', unidad: 'kg', placeholder: 'ej: 200' },
      { id: 'factor', label: 'Factor de seguridad', unidad: '', opcional: true, defecto: 1.45, placeholder: '1,45' },
    ],
    calcular: balanceFlotacionLastre,
    formulas: ['Fb = factor · (P_red + P_lastre)'],
    explicacion: 'Cuánta flotabilidad hay que agregar para sostener el conjunto. El factor típico es 1,45; el rango recomendado 1,3–1,6.',
    fuente: FUENTE_INIDEP,
    notas: ['Factor por defecto 1,45 (rango 1,3–1,6)', 'Lastre ≈ 1/2–2/3 del peso del cuerpo de red en aire'],
  },

  // ---- Puertas ----
  {
    id: 'seleccion_puertas',
    categoria: 'puertas',
    titulo: 'Selección de puertas',
    subtitulo: 'Área y peso orientativos por potencia (referencia empírica).',
    inputs: [
      { id: 'potenciaCV', label: 'Potencia del motor', unidad: 'CV', placeholder: 'ej: 1200' },
      { id: 'tipo', label: 'Tipo de puerta', unidad: '', tipo: 'select', defecto: 'rectangular', opciones: [op('rectangular', 'Rectangular'), op('ovalada', 'Ovalada'), op('v', 'En V')] },
    ],
    calcular: seleccionPuertas,
    formulas: [],
    explicacion: 'No es un cálculo cerrado: es una referencia empírica. Devuelve un rango de área y de peso según el tramo de potencia y el tipo de puerta.',
    fuente: FUENTE_INIDEP + ' — tabla empírica de puertas',
    esReferencia: true,
    notas: ['Referencia empírica, no cálculo cerrado', 'Las ovaladas huecas no traen peso en la tabla'],
  },

  // ---- Cables, tensión y potencia ----
  {
    id: 'potencia_tension',
    categoria: 'cables',
    titulo: 'Potencia de tiro y tracción',
    subtitulo: 'Tiro efectivo y tensión sobre el cable a una velocidad dada.',
    inputs: [
      { id: 'NHP', label: 'Potencia nominal (NHP)', unidad: 'HP', placeholder: 'ej: 2800' },
      { id: 'Cu', label: 'Coef. utilización (Cu)', unidad: '', opcional: true, defecto: 0.80, placeholder: '0,80' },
      { id: 'Cp', label: 'Coef. propulsión (Cp)', unidad: '', opcional: true, defecto: 0.20, placeholder: '0,20' },
      { id: 'Cm', label: 'Coef. mecánico (Cm)', unidad: '', opcional: true, defecto: 0.80, placeholder: '0,80' },
      { id: 'V', label: 'Velocidad de arrastre (V)', unidad: 'nudos', placeholder: 'ej: 4' },
    ],
    calcular: potenciaTension,
    formulas: ['PS = NHP · Cu · Cp · Cm', 'V_ms = V · 0,514444', 'T = (PS · 75) / V_ms'],
    explicacion: 'PS es la potencia que llega al tiro; T es la tensión sobre el cable a esa velocidad. Ejemplo: 2800 HP a 4 nudos → PS ≈ 358 HP, T ≈ 13.060 kg.',
    fuente: 'INIDEP — informe de tracción y potencia',
    notas: [
      'Usa la conversión exacta 1 nudo = 0,514444 m/s',
      'Con V redondeada a 2 m/s el informe da ≈ 13.440 kg',
      'Tracción práctica: 10–12 kg/CV (paso fijo) · 13–16 kg/CV (paso variable/tobera)',
    ],
  },
  {
    id: 'cable_profundidad',
    categoria: 'cables',
    titulo: 'Largo de cable por profundidad',
    subtitulo: 'Cuánto cable largar según la zona.',
    inputs: [
      { id: 'profundidad', label: 'Profundidad', unidad: 'm', placeholder: 'ej: 80' },
      { id: 'zona', label: 'Zona', unidad: '', tipo: 'select', defecto: 'plataforma', opciones: [op('plataforma', 'Plataforma'), op('profunda', 'Profunda')] },
    ],
    calcular: cableProfundidad,
    formulas: ['Plataforma: 3–4 × profundidad', 'Profunda: 2–2,5 × profundidad'],
    explicacion: 'Rango de cable a largar. En fondos menores a 20 m se toma un mínimo de 120 m.',
    fuente: FUENTE_INIDEP,
    notas: ['Mínimo 120 m en fondos < 20 m'],
  },
  {
    id: 'potencia_guinche',
    categoria: 'cables',
    titulo: 'Potencia de guinche',
    subtitulo: 'Potencia necesaria para cobrar el cable.',
    inputs: [
      { id: 'T', label: 'Tensión a vencer (T)', unidad: 'kgf', placeholder: 'ej: 13000' },
      { id: 'v', label: 'Velocidad de cobrado (v)', unidad: 'm/s', placeholder: 'ej: 0,8' },
      { id: 'transmision', label: 'Transmisión', unidad: '', tipo: 'select', defecto: 'mecanica', opciones: [op('mecanica', 'Mecánica (+25%)'), op('hidraulica', 'Hidráulica (+100%)')] },
    ],
    calcular: potenciaGuinche,
    formulas: ['P = T · v / 75', 'Mecánica: +25% · Hidráulica: +100%'],
    explicacion: 'Potencia teórica del guinche y la potencia real estimada sumando las pérdidas de la transmisión.',
    fuente: FUENTE_INIDEP,
  },
  {
    id: 'seleccion_cable_acero',
    categoria: 'cables',
    titulo: 'Cable de acero por potencia',
    subtitulo: 'Diámetro, peso lineal y carga de rotura de referencia.',
    inputs: [
      { id: 'potenciaCV', label: 'Potencia del motor', unidad: 'CV', placeholder: 'ej: 500' },
    ],
    calcular: seleccionCableAcero,
    formulas: [],
    explicacion: 'Tabla de referencia: para una potencia da el diámetro sugerido de cable de acero, su peso por metro y la carga de rotura.',
    fuente: FUENTE_INIDEP + ' — tabla de cable de acero',
    esReferencia: true,
    notas: ['Referencia empírica: verificar contra el cable y el uso reales'],
  },

  // ---- Área barrida ----
  {
    id: 'area_barrida',
    categoria: 'area',
    titulo: 'Área barrida',
    subtitulo: 'Superficie de fondo cubierta en un lance.',
    inputs: [
      { id: 'AH', label: 'Abertura horizontal (AH)', unidad: 'm', opcional: true, placeholder: 'ej: 18' },
      { id: 'RS', label: 'Relinga superior (RS)', unidad: 'm', opcional: true, placeholder: 'si no tenés AH' },
      { id: 'V', label: 'Velocidad (V)', unidad: 'nudos', placeholder: 'ej: 3,5' },
      { id: 't', label: 'Duración del lance (t)', unidad: 'min', placeholder: 'ej: 180' },
    ],
    calcular: areaBarrida,
    formulas: ['V_ms = V · 0,514444', 'distancia = V_ms · (t · 60)', 'Área = AH · distancia'],
    explicacion: 'Si no se conoce la abertura horizontal (AH) se estima desde la relinga superior (RS): AH ≈ RS · 0,50.',
    fuente: FUENTE_INIDEP,
  },
]

// Helpers de acceso (UI).
export const calculadorasDeCategoria = (catId) => CALCULADORAS.filter(c => c.categoria === catId)
export const buscarCalculadora = (id) => CALCULADORAS.find(c => c.id === id) || null
