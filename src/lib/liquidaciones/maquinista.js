// Liquidación Máquinas — pesca de langostino.
//
// Las tarifas cambian por paritaria: se editan SOLO desde el panel de admin y
// viven en Firestore (config/tarifasMaquinas). Acá quedan los valores por
// defecto (recibo de referencia julio 2026) y la fórmula. Nunca se escribe una
// tarifa dentro del cálculo.
//
// Redondeo: cada concepto se redondea a centavos (como el recibo real de la
// armadora) y los totales suman los conceptos ya redondeados. Redondear por
// línea es lo que hace coincidir el neto al centavo.

export const TARIFAS_DEFAULT = {
  fecha_vigencia_desde: '2026-07-01',

  // ── Captura ────────────────────────────────────────────────────────────────
  TARIFA_CAPTURA: 1348.50,   // $ por kg producido
  PCT_CAPTURA_REM: 30,       // % remunerativo de la captura
  PCT_CAPTURA_NR: 70,        // % no remunerativo de la captura

  // ── Remunerativos por viaje (escalan con la cantidad de viajes) ─────────────
  ALISTAMIENTO: 22266.40,        // × viajes
  TAREAS_ESPECIFICAS: 192878.33, // × viajes

  // ── Remunerativos MAQ.F — montos fijos, NO escalan con los viajes ───────────
  ALISTAMIENTO_MAQF: 44532.80,
  TAREAS_ESPECIFICAS_MAQF: 297005.52,

  // ── No remunerativos ────────────────────────────────────────────────────────
  ACUERDO_NR: 2800933.17,
  PCT_ROPA_AGUA: 2,          // % sobre el remunerativo
  VIATICOS: 43880.8825,      // × viajes (273.00)
  MANUTENCION_DIA: 41032.42, // × días de marea (se informa y se descuenta igual)

  // ── Aportes / descuentos ────────────────────────────────────────────────────
  PCT_JUBILACION: 11,
  PCT_INSSJP: 3,
  PCT_OBRA_SOCIAL: 3,
  // Tope previsional: jubilación, INSSJP y obra social se calculan sobre la base
  // remunerativa con este tope. Si el remunerativo lo supera, se usa el tope.
  // El admin lo actualiza cuando cambie (se ajusta periódicamente).
  TOPE_BASE_APORTES: 4509567.45,
  PCT_APORTE_SINDICAL: 4.5,          // Aporte Sindical (120.05) — sobre remun + captura NR
  PCT_APORTE_SINDICAL_ACUERDOS: 4.5, // Aporte Sindical Acuerdos (120.05) — sobre Acuerdo NR
  // Ganancias: por defecto 0 ⇒ carga manual del monto por liquidación. Si el
  // admin pone un %, se usa como fallback cuando no se cargó monto.
  PCT_GANANCIAS: 0,
}

// Campos que carga el usuario común (además del período y los anticipos, que se
// manejan aparte en la UI).
export const CAMPOS = [
  { id: 'kgLangostino', label: 'Kg producidos', placeholder: 'Ej: 9679.14', paso: '0.01', unidad: 'kg' },
  { id: 'cantViajes',   label: 'Cantidad de viajes', placeholder: 'Ej: 4', paso: '1', unidad: 'viajes' },
  { id: 'diasMarea',    label: 'Días de marea', placeholder: 'Ej: 29', paso: '1', unidad: 'días' },
]

// Umbral de guardarraíl: si los Kg lo superan, probablemente se cargaron pesos.
export const UMBRAL_KG_SOSPECHOSO = 100000

const num = (v) => Number(v) || 0
const r2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100
const pct = (base, p) => r2(num(base) * (num(p) / 100))

// entradas: { kgLangostino, cantViajes, diasMarea, anticipos: [{concepto, monto}], ganancias }
export function calcular(entradas, tarifas = TARIFAS_DEFAULT) {
  const t = { ...TARIFAS_DEFAULT, ...tarifas }
  const kg = num(entradas.kgLangostino)
  const dias = num(entradas.diasMarea)
  const viajes = num(entradas.cantViajes)
  const anticipos = Array.isArray(entradas.anticipos) ? entradas.anticipos : []
  const gananciasMonto = num(entradas.ganancias)

  // ── Captura: total y split remunerativo / no remunerativo ──────────────────
  const capturaTotal = r2(kg * num(t.TARIFA_CAPTURA))
  const capturaRem = r2(capturaTotal * num(t.PCT_CAPTURA_REM) / 100)
  const capturaNR = r2(capturaTotal * num(t.PCT_CAPTURA_NR) / 100)

  // ── Haberes remunerativos ──────────────────────────────────────────────────
  const alistamiento = r2(num(t.ALISTAMIENTO) * viajes)
  const tareasEspecificas = r2(num(t.TAREAS_ESPECIFICAS) * viajes)
  const alistamientoMaqF = r2(num(t.ALISTAMIENTO_MAQF))         // fijo ×1
  const tareasEspecificasMaqF = r2(num(t.TAREAS_ESPECIFICAS_MAQF)) // fijo ×1
  const totalRemunerativo = r2(
    capturaRem + alistamiento + tareasEspecificas + alistamientoMaqF + tareasEspecificasMaqF
  )

  // ── Haberes no remunerativos ───────────────────────────────────────────────
  const acuerdoNR = r2(num(t.ACUERDO_NR))
  const ropaAgua = pct(totalRemunerativo, t.PCT_ROPA_AGUA)
  const viaticos = r2(num(t.VIATICOS) * viajes)
  // La manutención se consume a bordo: se informa y se descuenta por el mismo
  // importe, así que no altera el neto.
  const manutencion = r2(num(t.MANUTENCION_DIA) * dias)
  const manutencionDescuento = r2(-manutencion)
  const totalNoRemunerativo = r2(
    capturaNR + acuerdoNR + ropaAgua + viaticos + manutencion + manutencionDescuento
  )

  const totalBruto = r2(totalRemunerativo + totalNoRemunerativo)

  // ── Descuentos ─────────────────────────────────────────────────────────────
  const tope = num(t.TOPE_BASE_APORTES)
  const baseAportes = tope > 0 ? Math.min(totalRemunerativo, tope) : totalRemunerativo
  const jubilacion = pct(baseAportes, t.PCT_JUBILACION)
  const inssjp = pct(baseAportes, t.PCT_INSSJP)
  const obraSocial = pct(baseAportes, t.PCT_OBRA_SOCIAL)
  const aporteSindical = pct(totalRemunerativo + capturaNR, t.PCT_APORTE_SINDICAL)
  const aporteSindicalAcuerdos = pct(acuerdoNR, t.PCT_APORTE_SINDICAL_ACUERDOS)
  // Ganancias: monto manual; si no se cargó y hay % configurado, se usa ese %.
  const ganancias = gananciasMonto > 0
    ? r2(gananciasMonto)
    : (num(t.PCT_GANANCIAS) > 0 ? pct(totalRemunerativo, t.PCT_GANANCIAS) : 0)
  const totalAnticipos = r2(anticipos.reduce((s, a) => s + num(a.monto), 0))
  const totalDeducciones = r2(
    jubilacion + inssjp + obraSocial + aporteSindical + aporteSindicalAcuerdos + ganancias + totalAnticipos
  )

  const neto = r2(totalBruto - totalDeducciones)

  const valores = {
    capturaTotal, capturaRem, capturaNR,
    alistamiento, tareasEspecificas, alistamientoMaqF, tareasEspecificasMaqF,
    totalRemunerativo,
    acuerdoNR, ropaAgua, viaticos, manutencion, manutencionDescuento,
    totalNoRemunerativo,
    totalBruto,
    baseAportes, jubilacion, inssjp, obraSocial,
    aporteSindical, aporteSindicalAcuerdos, ganancias, totalAnticipos,
    totalDeducciones,
    neto,
  }

  const kgTxt = kg.toLocaleString('es-AR', { maximumFractionDigits: 2 })
  const uViajes = `${viajes} viaje${viajes === 1 ? '' : 's'}`
  const uDias = `${dias} día${dias === 1 ? '' : 's'}`

  // Filas del recibo. `col` indica en qué columna cae el importe.
  const secciones = [
    {
      id: 'remunerativo',
      titulo: 'Haberes remunerativos',
      col: 'rem',
      filas: [
        { concepto: `Captura langostino (${t.PCT_CAPTURA_REM}%)`, unidad: `${kgTxt} kg`, valor: capturaRem, col: 'rem' },
        { concepto: 'Alistamiento', unidad: uViajes, valor: alistamiento, col: 'rem' },
        { concepto: 'Tareas específicas', unidad: uViajes, valor: tareasEspecificas, col: 'rem' },
        { concepto: 'Alistamiento MAQ.F', unidad: '', valor: alistamientoMaqF, col: 'rem' },
        { concepto: 'Tareas específicas MAQ.F', unidad: '', valor: tareasEspecificasMaqF, col: 'rem' },
      ],
      subtotal: { label: 'Total Remunerativo', valor: totalRemunerativo },
    },
    {
      id: 'noRemunerativo',
      titulo: 'Haberes no remunerativos',
      col: 'nr',
      filas: [
        { concepto: `Captura langostino (${t.PCT_CAPTURA_NR}%)`, unidad: '', valor: capturaNR, col: 'nr' },
        { concepto: 'Acuerdo NR', unidad: '', valor: acuerdoNR, col: 'nr' },
        { concepto: `Ropa de agua (${t.PCT_ROPA_AGUA}%)`, unidad: '', valor: ropaAgua, col: 'nr' },
        { concepto: 'Viáticos', unidad: uViajes, valor: viaticos, col: 'nr' },
        { concepto: 'Manutención', unidad: uDias, valor: manutencion, col: 'nr' },
        { concepto: 'Descuento manutención', unidad: uDias, valor: manutencionDescuento, col: 'nr', negativo: true },
      ],
      subtotal: { label: 'Total No Remunerativo', valor: totalNoRemunerativo },
    },
    {
      id: 'descuentos',
      titulo: 'Descuentos',
      col: 'desc',
      filas: [
        { concepto: 'Jubilación', unidad: `${t.PCT_JUBILACION}%`, valor: jubilacion, col: 'desc' },
        { concepto: 'INSSJP', unidad: `${t.PCT_INSSJP}%`, valor: inssjp, col: 'desc' },
        { concepto: 'Obra Social', unidad: `${t.PCT_OBRA_SOCIAL}%`, valor: obraSocial, col: 'desc' },
        { concepto: 'Aporte Sindical (120.05)', unidad: `${t.PCT_APORTE_SINDICAL}%`, valor: aporteSindical, col: 'desc' },
        { concepto: 'Aporte Sindical Acuerdos (120.05)', unidad: `${t.PCT_APORTE_SINDICAL_ACUERDOS}%`, valor: aporteSindicalAcuerdos, col: 'desc' },
        ...(ganancias > 0 ? [{ concepto: 'Impuesto a las Ganancias', unidad: '', valor: ganancias, col: 'desc' }] : []),
        ...anticipos
          .filter(a => num(a.monto) !== 0)
          .map(a => ({ concepto: a.concepto || 'Anticipo', unidad: '', valor: r2(a.monto), col: 'desc' })),
      ],
      subtotal: { label: 'Total Descuentos', valor: totalDeducciones },
    },
  ]

  return {
    valores, secciones,
    totalRemunerativo, totalNoRemunerativo, totalDeducciones,
    totalBruto, neto,
  }
}

export default {
  id: 'maquinista',
  label: 'Máquinas',
  subtitulo: 'Langostino',
  disponible: true,
  campos: CAMPOS,
  tarifasDefault: TARIFAS_DEFAULT,
  calcular,
  resumen: (e) =>
    `${num(e.kgLangostino).toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg · ${num(e.cantViajes)} viajes · ${num(e.diasMarea)} días`,
}
