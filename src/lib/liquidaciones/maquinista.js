// Liquidación SICONARA — sector maquinistas (pesca de langostino).
//
// Las tarifas cambian por paritaria: se editan desde el panel de admin y se
// versionan por fecha de vigencia. Nunca se escriben dentro del cálculo.

export const TARIFAS_DEFAULT = {
  fecha_vigencia_desde: '2026-01-01',

  // Captura — se aplica la misma tarifa al tramo remunerativo y al no remunerativo
  TARIFA_CAPTURA: 1396.21,

  // Ítems fijos del tramo remunerativo
  ALISTAMIENTO: 32675,
  TAREAS_ESPECIFICAS: 283041.5,
  ALISTAMIENTO_MAQF: 16337.5,
  TAREAS_ESPECIFICAS_MAQF: 108960.75,

  // Ítems del tramo no remunerativo
  ACUERDO_NR: 441014.75,
  PCT_ROPA_AGUA: 2,
  MANUTENCION_DIA: 36128,

  // Deducciones
  PCT_JUBILACION: 11,
  PCT_INSSJP: 3,
  PCT_OBRA_SOCIAL: 3,
  PCT_OBRA_SOCIAL_ACUERDOS: 3,
  PCT_SICONARA: 4.5,
  PCT_SICONARA_ACUERDOS: 4.5,
}

export const CAMPOS = [
  { id: 'kgLangostino', label: 'Kg de langostino', placeholder: 'Ej: 1283.4', paso: '0.1', unidad: 'kg' },
  { id: 'diasMarea', label: 'Días de marea', placeholder: 'Ej: 10', paso: '1', unidad: 'días' },
]

const num = (v) => Number(v) || 0
const pct = (base, p) => base * (num(p) / 100)

// Devuelve importes sin redondear. El redondeo a centavos es responsabilidad
// de la vista: redondear acá arrastra error a los totales.
export function calcular(entradas, tarifas = TARIFAS_DEFAULT) {
  const t = { ...TARIFAS_DEFAULT, ...tarifas }
  const kg = num(entradas.kgLangostino)
  const dias = num(entradas.diasMarea)

  // ── Haberes remunerativos ────────────────────────────────────────────────
  const capturaRem = kg * num(t.TARIFA_CAPTURA)
  const alistamiento = num(t.ALISTAMIENTO)
  const tareasEspecificas = num(t.TAREAS_ESPECIFICAS)
  const alistamientoMaqF = num(t.ALISTAMIENTO_MAQF)
  const tareasEspecificasMaqF = num(t.TAREAS_ESPECIFICAS_MAQF)
  const totalRemunerativo =
    capturaRem + alistamiento + tareasEspecificas + alistamientoMaqF + tareasEspecificasMaqF

  // ── Haberes no remunerativos ─────────────────────────────────────────────
  const capturaNR = kg * num(t.TARIFA_CAPTURA)
  const acuerdoNR = num(t.ACUERDO_NR)
  const ropaAgua = pct(totalRemunerativo, t.PCT_ROPA_AGUA)
  // La manutención se consume a bordo: se informa y se descuenta por el mismo
  // importe, así que no altera el neto.
  const manutencion = dias * num(t.MANUTENCION_DIA)
  const manutencionDescuento = -manutencion
  const totalNoRemunerativo =
    capturaNR + acuerdoNR + ropaAgua + manutencion + manutencionDescuento

  const totalBruto = totalRemunerativo + totalNoRemunerativo

  // ── Deducciones ──────────────────────────────────────────────────────────
  const baseAcuerdos = capturaNR + acuerdoNR
  const jubilacion = pct(totalRemunerativo, t.PCT_JUBILACION)
  const inssjp = pct(totalRemunerativo, t.PCT_INSSJP)
  const obraSocial = pct(totalRemunerativo, t.PCT_OBRA_SOCIAL)
  const obraSocialAcuerdos = pct(baseAcuerdos, t.PCT_OBRA_SOCIAL_ACUERDOS)
  const siconara = pct(totalRemunerativo + capturaNR, t.PCT_SICONARA)
  const siconaraAcuerdos = pct(acuerdoNR, t.PCT_SICONARA_ACUERDOS)
  const totalDeducciones =
    jubilacion + inssjp + obraSocial + obraSocialAcuerdos + siconara + siconaraAcuerdos

  const netoACobrar = totalBruto - totalDeducciones

  const valores = {
    capturaRem, alistamiento, tareasEspecificas, alistamientoMaqF, tareasEspecificasMaqF,
    totalRemunerativo,
    capturaNR, acuerdoNR, ropaAgua, manutencion, manutencionDescuento,
    totalNoRemunerativo,
    totalBruto,
    jubilacion, inssjp, obraSocial, obraSocialAcuerdos, siconara, siconaraAcuerdos,
    totalDeducciones,
    netoACobrar,
  }

  const kgTxt = kg.toLocaleString('es-AR', { maximumFractionDigits: 1 })

  const grupos = [
    {
      id: 'remunerativo',
      titulo: 'Haberes remunerativos',
      filas: [
        { label: `Captura langostino · ${kgTxt} kg`, valor: capturaRem },
        { label: 'Alistamiento', valor: alistamiento },
        { label: 'Tareas específicas', valor: tareasEspecificas },
        { label: 'Alistamiento maq. frigorista', valor: alistamientoMaqF },
        { label: 'Tareas específicas maq. frigorista', valor: tareasEspecificasMaqF },
      ],
      total: { label: 'Total remunerativo', valor: totalRemunerativo },
    },
    {
      id: 'noRemunerativo',
      titulo: 'Haberes no remunerativos',
      filas: [
        { label: `Captura langostino · ${kgTxt} kg`, valor: capturaNR },
        { label: 'Acuerdo no remunerativo', valor: acuerdoNR },
        { label: `Ropa de agua · ${t.PCT_ROPA_AGUA} %`, valor: ropaAgua },
        { label: `Manutención · ${dias} día${dias === 1 ? '' : 's'}`, valor: manutencion },
        { label: 'Descuento manutención', valor: manutencionDescuento, negativo: true },
      ],
      total: { label: 'Total no remunerativo', valor: totalNoRemunerativo },
    },
    {
      id: 'deducciones',
      titulo: 'Deducciones',
      negativo: true,
      filas: [
        { label: `Jubilación · ${t.PCT_JUBILACION} %`, valor: jubilacion },
        { label: `INSSJP · ${t.PCT_INSSJP} %`, valor: inssjp },
        { label: `Obra social · ${t.PCT_OBRA_SOCIAL} %`, valor: obraSocial },
        { label: `Obra social acuerdos · ${t.PCT_OBRA_SOCIAL_ACUERDOS} %`, valor: obraSocialAcuerdos },
        { label: `SICONARA · ${t.PCT_SICONARA} %`, valor: siconara },
        { label: `SICONARA acuerdos · ${t.PCT_SICONARA_ACUERDOS} %`, valor: siconaraAcuerdos },
      ],
      total: { label: 'Total deducciones', valor: totalDeducciones },
    },
  ]

  return { valores, grupos, totalBruto, totalDeducciones, neto: netoACobrar }
}

export default {
  id: 'maquinista',
  label: 'Maquinista',
  subtitulo: 'SICONARA · Langostino',
  disponible: true,
  campos: CAMPOS,
  tarifasDefault: TARIFAS_DEFAULT,
  calcular,
  // Campos que se muestran como resumen en el historial
  resumen: (e) => `${num(e.kgLangostino).toLocaleString('es-AR')} kg · ${num(e.diasMarea)} días`,
}
