// ─────────────────────────────────────────────────────────────────────────────
// Cómputo de singladuras y días embarcado — REFOCAPEMM / Armada Argentina
//
// Regla oficial: cada FECHA DE CALENDARIO tocada por la navegación cuenta como
// una singladura completa. La hora se ignora; una fracción de día cuenta como
// día entero. Por eso el cómputo es INCLUSIVO de ambos extremos:
//
//     singladuras = (díasCalendario entre llegada y salida) + 1
//
// Ambas fechas se normalizan a medianoche local antes de restar, así una salida
// a las 23:50 y una llegada al día siguiente 00:10 cuentan 2 fechas (no ~0).
//
// Esta es la ÚNICA fuente de verdad del cómputo: la consumen el dashboard, el
// formulario de viaje y el generador de la planilla, para que los números
// coincidan siempre.
// ─────────────────────────────────────────────────────────────────────────────

// Normaliza una fecha (Date | string 'YYYY-MM-DD' | ISO) a medianoche LOCAL.
// Para strings 'YYYY-MM-DD' evitamos el parse UTC de Date() que correría el día
// según el huso horario; parseamos las partes a mano.
function aMedianocheLocal(fecha) {
  if (fecha == null || fecha === '') return null
  if (fecha instanceof Date) {
    if (isNaN(fecha)) return null
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  }
  const str = String(fecha)
  // 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm...' → tomar solo la parte de fecha
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  const d = new Date(str)
  if (isNaN(d)) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const MS_POR_DIA = 1000 * 60 * 60 * 24

// Diferencia en días de calendario (llegada − salida), ambas a medianoche.
// Usa Math.round para blindar contra saltos de horario de verano (±1 h).
export function diffEnDiasCalendario(desde, hasta) {
  const a = aMedianocheLocal(desde)
  const b = aMedianocheLocal(hasta)
  if (!a || !b) return null
  return Math.round((b - a) / MS_POR_DIA)
}

// Cómputo de singladuras de un viaje: salida → regreso, inclusivo.
//   sale 01/01 23:50, llega 03/01 00:10 → 3
//   sale y llega el mismo día           → 1
//   sale 10/03, llega 15/03             → 6
// Devuelve 0 si faltan fechas o si la llegada es anterior a la salida.
export function calcularSingladuras(fechaSalida, fechaRegreso) {
  const diff = diffEnDiasCalendario(fechaSalida, fechaRegreso)
  if (diff == null || diff < 0) return 0
  return diff + 1
}

// Días embarcado de un período completo: embarco → desembarco, misma lógica
// inclusiva de fechas de calendario.
export function calcularDiasEmbarcados(fechaEmbarco, fechaDesembarco) {
  const diff = diffEnDiasCalendario(fechaEmbarco, fechaDesembarco)
  if (diff == null || diff < 0) return 0
  return diff + 1
}

// Suma de singladuras de una lista de viajes (cada viaje con fechaSalida /
// fechaRegreso). Es lo que muestra el dashboard como "Total singladuras".
export function sumarSingladuras(viajes) {
  return (viajes || []).reduce(
    (acc, v) => acc + calcularSingladuras(v.fechaSalida, v.fechaRegreso),
    0
  )
}

// ─── Doble cómputo del día límite entre viajes consecutivos ─────────────────
// Edge case del TOTAL por singladuras: si un viaje LLEGA el día X y el siguiente
// del mismo período SALE el mismo día X, ese día se contaría dos veces al sumar
// singladuras viaje por viaje. Esta función suma las singladuras de todos los
// viajes y descuenta 1 por cada día compartido en el borde entre viajes
// consecutivos (ordenados por fecha de salida).
//
// NOTA: si preferís que cada viaje se compute de forma independiente (sin
// descontar solapes), usá sumarSingladuras en su lugar. Dejo esta variante
// disponible y el TOTAL de la planilla la usa para no inflar días.
export function sumarSingladurasSinSolape(viajes) {
  const ordenados = [...(viajes || [])]
    .filter(v => v.fechaSalida && v.fechaRegreso)
    .sort((a, b) => String(a.fechaSalida).localeCompare(String(b.fechaSalida)))

  let total = 0
  let regresoPrevio = null
  for (const v of ordenados) {
    total += calcularSingladuras(v.fechaSalida, v.fechaRegreso)
    if (regresoPrevio) {
      // Si este viaje sale el mismo día calendario que llegó el anterior,
      // ese día ya fue contado → descontar 1.
      const solapa = diffEnDiasCalendario(regresoPrevio, v.fechaSalida) === 0
      if (solapa) total -= 1
    }
    regresoPrevio = v.fechaRegreso
  }
  return total
}
