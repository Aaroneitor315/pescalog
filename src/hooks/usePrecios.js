import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bitacoraar_precios'

export const ESPECIES_LISTA = [
  'langostino',
  'calamar',
  'merluza',
  'abadejo',
  'pescado de costa A',
  'pescado de costa B',
]

const preciosVacios = () => Object.fromEntries(ESPECIES_LISTA.map(e => [e, { ars: 0, usd: 0 }]))

const DEFAULTS = {
  tipoCambio: 1000,
  precios: preciosVacios(),
}

export function usePrecios() {
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const precios = preciosVacios()
        if (parsed.precios) {
          Object.entries(parsed.precios).forEach(([esp, val]) => {
            if (typeof val === 'number') {
              precios[esp] = { ars: val, usd: 0 }
            } else if (val && typeof val === 'object') {
              precios[esp] = { ars: val.ars || 0, usd: val.usd || 0 }
            }
          })
        }
        return { ...DEFAULTS, ...parsed, precios }
      }
    } catch {}
    return DEFAULTS
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {}
  }, [config])

  function setPrecioEspecie(especie, campo, valor) {
    setConfig(prev => ({
      ...prev,
      precios: {
        ...prev.precios,
        [especie]: { ...(prev.precios[especie] || { ars: 0, usd: 0 }), [campo]: Number(valor) || 0 },
      },
    }))
  }

  function setTipoCambio(valor) {
    setConfig(prev => ({ ...prev, tipoCambio: Number(valor) || 0 }))
  }

  function getPrecio(especie) {
    return config.precios[especie] || { ars: 0, usd: 0 }
  }

  function calcularTotalViaje(viaje) {
    const precio = getPrecio(viaje.especie)
    return {
      ars: (precio.ars || 0) * (viaje.cajones || 0),
      usd: (precio.usd || 0) * (viaje.cajones || 0),
    }
  }

  return { config, setPrecioEspecie, setTipoCambio, getPrecio, calcularTotalViaje }
}
