// ─────────────────────────────────────────────────────────────────────────────
// Agrupación de viajes en PERÍODOS DE EMBARCO.
//
// El modelo de datos no tiene una entidad "período": los períodos son
// implícitos. Cada viaje guarda `barco` y `fechaEmbarco` (autocompletada igual
// para todos los viajes del mismo embarco) y, en el viaje que cierra el período,
// `fechaDesembarco` (toggle "último viaje en este barco").
//
// Clave de agrupación: (barco normalizado + fechaEmbarco). Todos los viajes con
// la misma clave pertenecen al mismo período. El desembarco sale del viaje que
// lo tenga cargado dentro del grupo.
// ─────────────────────────────────────────────────────────────────────────────

import { calcularSingladuras, calcularDiasEmbarcados, sumarSingladurasSinSolape } from './singladuras.js'

function claveBarco(barco) {
  return (barco || '').trim().toLowerCase()
}

// Agrupa una lista de viajes en períodos de embarco.
// Devuelve un array de períodos ordenados del más reciente al más antiguo:
//   {
//     id, barco, fechaEmbarco, fechaDesembarco (|| ''),
//     cerrado (bool),  viajes (ordenados por fechaSalida asc),
//     totalSingladuras, totalDiasEmbarcado
//   }
export function agruparEmbarcos(viajes) {
  const grupos = new Map()

  for (const v of viajes || []) {
    const barco = (v.barco || '').trim()
    const emb = v.fechaEmbarco || ''
    // Sin barco ni embarco no se puede armar un período coherente.
    if (!barco && !emb) continue
    const clave = `${claveBarco(barco)}__${emb}`
    if (!grupos.has(clave)) {
      grupos.set(clave, { barco, fechaEmbarco: emb, fechaDesembarco: '', viajes: [] })
    }
    const g = grupos.get(clave)
    g.viajes.push(v)
    // El desembarco del período es el que haya quedado cargado en algún viaje.
    if (v.fechaDesembarco && !g.fechaDesembarco) g.fechaDesembarco = v.fechaDesembarco
  }

  const periodos = [...grupos.values()].map(g => {
    const viajesOrden = [...g.viajes].sort(
      (a, b) => String(a.fechaSalida || '').localeCompare(String(b.fechaSalida || ''))
    )
    const cerrado = !!g.fechaDesembarco
    return {
      id: `${claveBarco(g.barco)}__${g.fechaEmbarco}`,
      barco: g.barco,
      fechaEmbarco: g.fechaEmbarco,
      fechaDesembarco: g.fechaDesembarco,
      cerrado,
      viajes: viajesOrden,
      // TOTAL por singladuras de la planilla: suma sin doble cómputo del borde.
      totalSingladuras: sumarSingladurasSinSolape(viajesOrden),
      // Días embarcado del período completo (embarco→desembarco).
      totalDiasEmbarcado: cerrado ? calcularDiasEmbarcados(g.fechaEmbarco, g.fechaDesembarco) : 0,
    }
  })

  // Más reciente primero (por fecha de embarco; fallback a la salida del 1er viaje).
  periodos.sort((a, b) => {
    const fa = a.fechaEmbarco || a.viajes[0]?.fechaSalida || ''
    const fb = b.fechaEmbarco || b.viajes[0]?.fechaSalida || ''
    return String(fb).localeCompare(String(fa))
  })

  return periodos
}

// Validaciones previas a generar la planilla de un período.
// Devuelve { ok, errores: string[] }.
export function validarPeriodo(periodo) {
  const errores = []
  if (!periodo) return { ok: false, errores: ['Período inexistente.'] }

  if (!periodo.cerrado) {
    errores.push('Cargá la fecha de desembarco para generar la planilla.')
  }

  if (!periodo.viajes?.length) {
    errores.push('El período no tiene viajes cargados.')
  }

  periodo.viajes?.forEach((v, i) => {
    const n = i + 1
    if (!v.fechaSalida || !v.fechaRegreso) {
      errores.push(`Viaje ${n}: falta la fecha de salida o de regreso.`)
    } else if (calcularSingladuras(v.fechaSalida, v.fechaRegreso) <= 0) {
      errores.push(`Viaje ${n}: la fecha de regreso es anterior a la de salida.`)
    }
  })

  return { ok: errores.length === 0, errores }
}
