import { useState, useEffect } from 'react'

const STORAGE_KEY = 'pescalog_precios'

const DEFAULTS = {
  tipoCambio: 1000,
  precios: {
    merluza: 0,
    calamar: 0,
    langostino: 0,
    centolla: 0,
    polaca: 0,
    abadejo: 0,
  },
}

export function usePrecios() {
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULTS, ...parsed, precios: { ...DEFAULTS.precios, ...parsed.precios } }
      }
    } catch {}
    return DEFAULTS
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {}
  }, [config])

  function setPrecioEspecie(especie, valor) {
    setConfig(prev => ({
      ...prev,
      precios: { ...prev.precios, [especie]: Number(valor) || 0 },
    }))
  }

  function setTipoCambio(valor) {
    setConfig(prev => ({ ...prev, tipoCambio: Number(valor) || 0 }))
  }

  function getPrecio(especie) {
    return config.precios[especie] || 0
  }

  function calcularTotalViaje(viaje) {
    const precio = getPrecio(viaje.especie)
    return precio * viaje.cajones
  }

  return { config, setPrecioEspecie, setTipoCambio, getPrecio, calcularTotalViaje }
}
