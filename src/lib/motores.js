// Estado de service de motores y tareas. DISPARADOR SIEMPRE POR HORAS.
// La fecha se guarda/muestra pero NO gobierna la alerta.

export const COLOR_ST = {
  al_dia: '#34d399',  // verde
  proximo: '#fbbf24', // ámbar
  vencido: '#f87171', // rojo
  none: '#64748b',    // gris (sin cargar / sin intervalo)
}

const RANK = { al_dia: 0, proximo: 1, vencido: 2 }

// Horas reales del motor = base guardada (m.horas) + tiempo transcurrido si está
// "en marcha" (reloj de pared desde m.marcha.desde). Sobrevive a cerrar/recargar
// la app porque se deriva del timestamp, no de un contador en memoria.
export function horasActuales(m) {
  const base = Number(m?.horas) || 0
  if (m?.marcha?.activo && m.marcha.desde) {
    const t = Date.parse(m.marcha.desde)
    if (!isNaN(t)) return base + Math.max(0, (Date.now() - t) / 3600000)
  }
  return base
}

// Estado de una tarea, calculado por horas.
//   proximoHs = ultimoHs + intervaloHs
//   faltanHs  = proximoHs - horasMotor
//   vencido si faltanHs <= 0 · proximo si faltanHs <= umbral · al_dia resto
//   umbral = 10% del intervaloHs, mínimo 20 hs
export function estadoTarea(tarea, horasMotor) {
  const intervalo = Number(tarea?.intervaloHs) || 0
  const horas = Number(horasMotor) || 0
  const proximoHs = (Number(tarea?.ultimoHs) || 0) + intervalo
  const faltanHs = proximoHs - horas
  let key
  if (!intervalo) key = 'al_dia'               // sin intervalo definido no dispara alerta
  else if (faltanHs <= 0) key = 'vencido'
  else if (faltanHs <= Math.max(20, intervalo * 0.10)) key = 'proximo'
  else key = 'al_dia'
  const label = key === 'vencido' ? 'Vencido'
    : key === 'proximo' ? `En ${Math.max(0, Math.round(faltanHs))} hs`
    : 'OK'
  return { key, color: COLOR_ST[key], label, proximoHs, faltanHs, intervalo }
}

// Estado del MOTOR = peor estado entre sus tareas (vencido > proximo > al_dia).
// `peorTarea` = la tarea más urgente (menor faltanHs) para mostrar próximo service.
export function estadoMotor(m) {
  if (!m) return { key: 'none', color: COLOR_ST.none, label: 'Sin cargar', peorTarea: null, faltanMin: Infinity }
  const horas = horasActuales(m)
  let key = 'al_dia'
  let faltanMin = Infinity
  let peorTarea = null
  for (const t of (m.tareas || [])) {
    const e = estadoTarea(t, horas)
    if (!e.intervalo) continue
    if (RANK[e.key] > RANK[key]) key = e.key
    if (e.faltanHs < faltanMin) { faltanMin = e.faltanHs; peorTarea = t }
  }
  const label = key === 'vencido' ? 'Vencido'
    : key === 'proximo' ? `Service en ${isFinite(faltanMin) ? Math.max(0, Math.round(faltanMin)) : 0} hs`
    : 'Al día'
  return { key, color: COLOR_ST[key], label, peorTarea, faltanMin }
}

// ¿El motor tiene al menos una tarea en 'proximo' o 'vencido'?
export function motorTieneAlerta(m) {
  const horas = horasActuales(m)
  return (m?.tareas || []).some(t => {
    const e = estadoTarea(t, horas)
    return e.intervalo && (e.key === 'proximo' || e.key === 'vencido')
  })
}

// Fecha estimada del próximo service (informativa): según el ritmo hs/día desde
// el último service. Si no hay datos suficientes, devuelve null (se muestra solo horas).
export function fechaEstimadaProximo(tarea, horasMotor) {
  if (!tarea?.ultimaFecha) return null
  const d = new Date(tarea.ultimaFecha + 'T00:00:00')
  if (isNaN(d)) return null
  const dias = (Date.now() - d.getTime()) / 86400000
  const usadas = (Number(horasMotor) || 0) - (Number(tarea.ultimoHs) || 0)
  if (dias <= 0 || usadas <= 0) return null
  const rate = usadas / dias
  const faltan = (Number(tarea.ultimoHs) || 0) + (Number(tarea.intervaloHs) || 0) - (Number(horasMotor) || 0)
  return new Date(Date.now() + (faltan / rate) * 86400000)
}
