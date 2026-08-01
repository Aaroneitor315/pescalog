import { useState, useEffect, useRef } from 'react'

const ENDPOINTS = [
  { key: 'oficial', url: 'https://dolarapi.com/v1/dolares/oficial', label: 'Oficial', color: 'blue' },
  { key: 'blue',    url: 'https://dolarapi.com/v1/dolares/blue',    label: 'Blue',    color: 'cyan' },
  { key: 'mep',     url: 'https://dolarapi.com/v1/dolares/bolsa',   label: 'MEP',     color: 'purple' },
]

const REFRESH_MS = 5 * 60 * 1000

export function useDolar() {
  const [cotizaciones, setCotizaciones] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [actualizadoEn, setActualizadoEn] = useState(null)
  const timeoutRef = useRef(null)

  async function cargar() {
    try {
      setError(null)
      const resultados = await Promise.all(
        ENDPOINTS.map(({ url, key, label, color }) =>
          fetch(url)
            .then(r => r.json())
            .then(d => ({ key, label, color, compra: d.compra, venta: d.venta }))
        )
      )
      setCotizaciones(Object.fromEntries(resultados.map(r => [r.key, r])))
      setActualizadoEn(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    timeoutRef.current = setInterval(cargar, REFRESH_MS)
    return () => clearInterval(timeoutRef.current)
  }, [])

  return { cotizaciones, cargando, error, actualizadoEn, recargar: cargar }
}
