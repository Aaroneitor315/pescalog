import { useState, useEffect } from 'react'

const STORAGE_KEY = 'pescalog_viajes'

const VIAJES_DEMO = [
  {
    id: '1',
    fechaSalida: '2025-11-03',
    fechaRegreso: '2025-11-12',
    fechaEmbarco: '2025-11-02',
    fechaDesembarco: '2025-11-13',
    barco: 'Don Hector',
    puertoPartida: 'Mar del Plata',
    puertoLlegada: 'Mar del Plata',
    especie: 'merluza',
    cajones: 380,
    observaciones: 'Buen tiempo, mar calmo los primeros días.',
  },
  {
    id: '2',
    fechaSalida: '2025-12-01',
    fechaRegreso: '2025-12-09',
    fechaEmbarco: '2025-11-30',
    fechaDesembarco: '2025-12-10',
    barco: 'Santa Elena II',
    puertoPartida: 'Puerto Madryn',
    puertoLlegada: 'Puerto Madryn',
    especie: 'calamar',
    cajones: 510,
    observaciones: '',
  },
  {
    id: '3',
    fechaSalida: '2026-01-15',
    fechaRegreso: '2026-01-25',
    fechaEmbarco: '2026-01-14',
    fechaDesembarco: '2026-01-26',
    barco: 'Don Hector',
    puertoPartida: 'Mar del Plata',
    puertoLlegada: 'Mar del Plata',
    especie: 'langostino',
    cajones: 290,
    observaciones: 'Viento fuerte últimos 2 días, se redujo la captura.',
  },
  {
    id: '4',
    fechaSalida: '2026-02-10',
    fechaRegreso: '2026-02-20',
    fechaEmbarco: '2026-02-09',
    fechaDesembarco: '2026-02-21',
    barco: 'Patagonia Sur',
    puertoPartida: 'Comodoro Rivadavia',
    puertoLlegada: 'Comodoro Rivadavia',
    especie: 'merluza',
    cajones: 620,
    observaciones: 'Mejor viaje del año. Banco muy productivo.',
  },
  {
    id: '5',
    fechaSalida: '2026-03-05',
    fechaRegreso: '2026-03-14',
    fechaEmbarco: '2026-03-04',
    fechaDesembarco: '2026-03-15',
    barco: 'Santa Elena II',
    puertoPartida: 'Puerto Madryn',
    puertoLlegada: 'Mar del Plata',
    especie: 'calamar',
    cajones: 445,
    observaciones: '',
  },
  {
    id: '6',
    fechaSalida: '2026-04-18',
    fechaRegreso: '2026-04-28',
    fechaEmbarco: '2026-04-17',
    fechaDesembarco: '2026-04-29',
    barco: 'Don Hector',
    puertoPartida: 'Mar del Plata',
    puertoLlegada: 'Mar del Plata',
    especie: 'merluza',
    cajones: 310,
    observaciones: 'Mar agitado primera semana.',
  },
  {
    id: '7',
    fechaSalida: '2026-05-02',
    fechaRegreso: '2026-05-12',
    fechaEmbarco: '2026-05-01',
    fechaDesembarco: '2026-05-13',
    barco: 'Patagonia Sur',
    puertoPartida: 'Comodoro Rivadavia',
    puertoLlegada: 'Comodoro Rivadavia',
    especie: 'langostino',
    cajones: 480,
    observaciones: 'Excelente densidad de langostino.',
  },
  {
    id: '8',
    fechaSalida: '2026-06-01',
    fechaRegreso: '2026-06-11',
    fechaEmbarco: '2026-05-31',
    fechaDesembarco: '2026-06-12',
    barco: 'Santa Elena II',
    puertoPartida: 'Mar del Plata',
    puertoLlegada: 'Mar del Plata',
    especie: 'merluza',
    cajones: 395,
    observaciones: '',
  },
]

export function calcularSingladuras(fechaSalida, fechaRegreso) {
  if (!fechaSalida || !fechaRegreso) return 0
  const ms = new Date(fechaRegreso) - new Date(fechaSalida)
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
}

export function useViajes() {
  const [viajes, setViajes] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // migración: si los datos no tienen puertoPartida, reemplazamos con demo
        if (parsed.length > 0 && !('puertoPartida' in parsed[0])) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(VIAJES_DEMO))
          return VIAJES_DEMO
        }
        return parsed
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(VIAJES_DEMO))
      return VIAJES_DEMO
    } catch {
      return VIAJES_DEMO
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viajes))
    } catch {}
  }, [viajes])

  function agregarViaje(datos) {
    const nuevo = { ...datos, id: crypto.randomUUID() }
    setViajes(prev => [nuevo, ...prev].sort((a, b) =>
      new Date(b.fechaSalida) - new Date(a.fechaSalida)
    ))
  }

  function eliminarViaje(id) {
    setViajes(prev => prev.filter(v => v.id !== id))
  }

  return { viajes, agregarViaje, eliminarViaje }
}
