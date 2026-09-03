// Capa de datos PURA para las calculadoras de aparejo de arrastre.
// Sin JSX, sin React, sin Firestore. Funciones puras y tolerantes a inputs
// vacíos/parciales: devuelven null en lo que falte, sin romper.
//
// Convención de salida de cada `calcular(valores)`:
//   { claveResultado: { valor: número|null, unidad: string, label: string }, ... }
// Los números se devuelven CRUDOS; el formateo para UI es responsabilidad de la vista
// (usar `formatNum`).

// Conversión exacta nudo → m/s (1 nudo = 1852 m / 3600 s).
export const NUDO_A_MS = 0.514444

// Parseo tolerante: '' | null | undefined | NaN → null.
function num(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Default numérico (si el input viene vacío, usa `def`).
function numDef(v, def) {
  const n = num(v)
  return n === null ? def : n
}

// Formateo es-AR (miles ".", decimal ","). Para la UI; no lo usan los cálculos.
export function formatNum(n, decimales = 0) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—'
  return Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

const R = (valor, unidad, label) => ({ valor, unidad, label })

// ── ARMADO ───────────────────────────────────────────────────────────────

// Coeficiente de armado y superficie del paño.
//   E = R / F        (adimensional)
//   S = E · L · H · M2²   (m²)
export function coefSuperficieArmado(v = {}) {
  const Rr = num(v.R), F = num(v.F), L = num(v.L), H = num(v.H), M2 = num(v.M2)
  const E = (Rr !== null && F !== null && F !== 0) ? Rr / F : null
  const S = (E !== null && L !== null && H !== null && M2 !== null) ? E * L * H * M2 * M2 : null
  return {
    E: R(E, '', 'Coeficiente de armado (E)'),
    S: R(S, 'm²', 'Superficie del paño'),
  }
}

// Peso de un paño de red.
//   P = H_hileras · L · Rtex · K   (gramos). Si K vacío → K = 1 (sin nudos).
export function pesoPano(v = {}) {
  const H = num(v.H_hileras), L = num(v.L), Rtex = num(v.Rtex)
  const K = numDef(v.K, 1)
  const P = (H !== null && L !== null && Rtex !== null) ? H * L * Rtex * K : null
  return { P: R(P, 'g', 'Peso del paño') }
}

// ── FLOTACIÓN ──────────────────────────────────────────────────────────────

// Flotabilidad de un flotador según su forma.
//   cilíndrico: Fb ≈ 0,55 · L · D²   (gf)
//   oval:       Fb ≈ 0,67 · L · D²   (gf)   [L y D en cm]
export function flotabilidadFlotador(v = {}) {
  const L = num(v.L), D = num(v.D)
  const forma = v.forma || 'cilindrico'
  const coef = forma === 'oval' ? 0.67 : 0.55
  const Fb = (L !== null && D !== null) ? coef * L * D * D : null
  return { Fb: R(Fb, 'gf', 'Flotabilidad del flotador') }
}

// Balance flotación / lastre.
//   Fb_total = factor · (peso_red_agua + peso_lastre_agua)   (kg)
//   factor por defecto 1,45; rango recomendado 1,3–1,6.
export function balanceFlotacionLastre(v = {}) {
  const red = num(v.pesoRedAgua), last = num(v.pesoLastreAgua)
  const factor = numDef(v.factor, 1.45)
  const base = (red !== null && last !== null) ? red + last : null
  return {
    Fb_total: R(base !== null ? factor * base : null, 'kg', 'Flotabilidad total necesaria'),
    rango_min: R(base !== null ? 1.3 * base : null, 'kg', 'Mínimo (1,3×)'),
    rango_max: R(base !== null ? 1.6 * base : null, 'kg', 'Máximo (1,6×)'),
  }
}

// ── PUERTAS ─────────────────────────────────────────────────────────────────

// TABLA EMPÍRICA (no es un cálculo cerrado). Área (m²) y peso (kg) por tramo de
// potencia y tipo de puerta. Fuente: INIDEP / FAO. Las ovaladas huecas no traen
// peso en la tabla (pesoMin/pesoMax = null).
export const TABLA_PUERTAS = {
  rectangular: [
    { desdeCV: 50, hastaCV: 75, areaMin: 0.85, areaMax: 1.12, pesoMin: 45, pesoMax: 120 },
    { desdeCV: 100, hastaCV: 200, areaMin: 2.00, areaMax: 2.00, pesoMin: 190, pesoMax: 220 },
    { desdeCV: 300, hastaCV: 400, areaMin: 2.42, areaMax: 2.88, pesoMin: 300, pesoMax: 420 },
    { desdeCV: 500, hastaCV: 600, areaMin: 3.12, areaMax: 3.38, pesoMin: 500, pesoMax: 620 },
  ],
  ovalada: [
    { desdeCV: 50, hastaCV: 75, areaMin: 0.93, areaMax: 1.45, pesoMin: null, pesoMax: null },
    { desdeCV: 100, hastaCV: 200, areaMin: 1.65, areaMax: 2.15, pesoMin: null, pesoMax: null },
    { desdeCV: 300, hastaCV: 400, areaMin: 1.65, areaMax: 2.15, pesoMin: null, pesoMax: null },
    { desdeCV: 500, hastaCV: 600, areaMin: 2.65, areaMax: 3.05, pesoMin: null, pesoMax: null },
  ],
  v: [
    { desdeCV: 100, hastaCV: 500, areaMin: 1.40, areaMax: 3.30, pesoMin: 240, pesoMax: 890 },
    { desdeCV: 600, hastaCV: 800, areaMin: 3.60, areaMax: 4.20, pesoMin: 1000, pesoMax: 1200 },
  ],
}

// Selección de puertas por potencia y tipo (referencia empírica, no cálculo cerrado).
export function seleccionPuertas(v = {}) {
  const cv = num(v.potenciaCV)
  const tipo = v.tipo || 'rectangular'
  const tabla = TABLA_PUERTAS[tipo] || TABLA_PUERTAS.rectangular
  if (cv === null) {
    return {
      area_min: R(null, 'm²', 'Área mínima'),
      area_max: R(null, 'm²', 'Área máxima'),
      peso_min: R(null, 'kg', 'Peso mínimo'),
      peso_max: R(null, 'kg', 'Peso máximo'),
    }
  }
  // Tramo que contiene la potencia; si cae en un hueco, el tramo más cercano hacia arriba.
  const t = tabla.find(x => cv >= x.desdeCV && cv <= x.hastaCV)
    || tabla.find(x => cv <= x.hastaCV)
    || tabla[tabla.length - 1]
  return {
    area_min: R(t.areaMin, 'm²', 'Área mínima'),
    area_max: R(t.areaMax, 'm²', 'Área máxima'),
    peso_min: R(t.pesoMin, 'kg', 'Peso mínimo'),
    peso_max: R(t.pesoMax, 'kg', 'Peso máximo'),
  }
}

// ── CABLES, TENSIÓN Y POTENCIA ───────────────────────────────────────────────

// Potencia de tiro y tracción.
//   PS = NHP · Cu · Cp · Cm        (HP)
//   V_ms = V · 0,514444            (m/s)  [conversión exacta nudo→m/s]
//   T = (PS · 75) / V_ms           (kg)
// Caso real: 2800 HP, 4 nudos → PS ≈ 358 HP, T ≈ 13.060 kg.
export function potenciaTension(v = {}) {
  const NHP = num(v.NHP)
  const Cu = numDef(v.Cu, 0.80)
  const Cp = numDef(v.Cp, 0.20)
  const Cm = numDef(v.Cm, 0.80)
  const V = num(v.V)
  const PS = NHP !== null ? NHP * Cu * Cp * Cm : null
  const Vms = V !== null ? V * NUDO_A_MS : null
  const T = (PS !== null && Vms !== null && Vms !== 0) ? (PS * 75) / Vms : null
  return {
    PS: R(PS, 'HP', 'Potencia de tiro (PS)'),
    T: R(T, 'kg', 'Tracción / tensión (T)'),
  }
}

// Largo de cable según profundidad y zona.
//   plataforma: 3–4 × profundidad ; profunda: 2–2,5 × profundidad   (m)
//   Mínimo 120 m en fondos < 20 m.
export function cableProfundidad(v = {}) {
  const p = num(v.profundidad)
  const zona = v.zona || 'plataforma'
  let min = null, max = null
  if (p !== null) {
    if (zona === 'profunda') { min = 2 * p; max = 2.5 * p }
    else { min = 3 * p; max = 4 * p }
    if (p < 20) { min = Math.max(min, 120); max = Math.max(max, 120) }
  }
  return {
    cable_min: R(min, 'm', 'Cable mínimo'),
    cable_max: R(max, 'm', 'Cable máximo'),
  }
}

// Potencia de guinche.
//   P = T · v / 75   (CV) ; +25% si transmisión mecánica, +100% si hidráulica.
export function potenciaGuinche(v = {}) {
  const T = num(v.T), vel = num(v.v)
  const trans = v.transmision || 'mecanica'
  let P = null, Pajustada = null
  if (T !== null && vel !== null) {
    P = (T * vel) / 75
    Pajustada = trans === 'hidraulica' ? P * 2 : P * 1.25
  }
  return {
    P: R(P, 'CV', 'Potencia teórica'),
    P_ajustada: R(Pajustada, 'CV', trans === 'hidraulica' ? 'Con pérdidas (hidráulica +100%)' : 'Con pérdidas (mecánica +25%)'),
  }
}

// Selección de cable de acero por potencia (CV → Ø mm / kg·m / rotura kgf).
// Fuente: INIDEP / FAO.
export const TABLA_CABLE_ACERO = [
  { cv: 100, diametroMm: 10.5, pesoKgM: 0.410, roturaKgf: 5400 },
  { cv: 300, diametroMm: 13.5, pesoKgM: 0.670, roturaKgf: 8800 },
  { cv: 500, diametroMm: 16.5, pesoKgM: 1.000, roturaKgf: 13200 },
  { cv: 900, diametroMm: 19.5, pesoKgM: 1.400, roturaKgf: 18400 },
]

export function seleccionCableAcero(v = {}) {
  const cv = num(v.potenciaCV)
  if (cv === null) {
    return {
      diametro: R(null, 'mm', 'Diámetro'),
      peso: R(null, 'kg/m', 'Peso lineal'),
      rotura: R(null, 'kgf', 'Carga de rotura'),
    }
  }
  const t = TABLA_CABLE_ACERO.find(x => cv <= x.cv) || TABLA_CABLE_ACERO[TABLA_CABLE_ACERO.length - 1]
  return {
    diametro: R(t.diametroMm, 'mm', 'Diámetro'),
    peso: R(t.pesoKgM, 'kg/m', 'Peso lineal'),
    rotura: R(t.roturaKgf, 'kgf', 'Carga de rotura'),
  }
}

// ── ÁREA BARRIDA ─────────────────────────────────────────────────────────────

// Área barrida por el arte.
//   AH: abertura horizontal (m). Si no se da AH pero sí RS (relinga superior),
//       AH ≈ RS · 0,50.
//   V_ms = V · 0,514444 ; distancia = V_ms · (t·60) ; Área = AH · distancia (m²)
export function areaBarrida(v = {}) {
  const V = num(v.V), t = num(v.t), RS = num(v.RS)
  let AH = num(v.AH)
  if (AH === null && RS !== null) AH = RS * 0.50
  const Vms = V !== null ? V * NUDO_A_MS : null
  const distancia = (Vms !== null && t !== null) ? Vms * (t * 60) : null
  const area = (AH !== null && distancia !== null) ? AH * distancia : null
  return {
    distancia: R(distancia, 'm', 'Distancia recorrida'),
    area: R(area, 'm²', 'Área barrida'),
  }
}
