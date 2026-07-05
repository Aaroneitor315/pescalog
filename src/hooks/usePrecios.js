import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

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
  tipoCambio: 0,
  precios: preciosVacios(),
}

export function usePrecios(uid) {
  const [config, setConfig] = useState(DEFAULTS)

  useEffect(() => {
    if (!uid) { setConfig(DEFAULTS); return }
    const ref = doc(db, 'usuarios', uid, 'config', 'precios')
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data()
        const precios = preciosVacios()
        if (data.precios) {
          Object.entries(data.precios).forEach(([esp, val]) => {
            if (typeof val === 'number') {
              precios[esp] = { ars: val, usd: 0 }
            } else if (val && typeof val === 'object') {
              precios[esp] = { ars: val.ars || 0, usd: val.usd || 0 }
            }
          })
        }
        setConfig({ ...DEFAULTS, ...data, precios })
      }
    })
    return unsub
  }, [uid])

  async function setPrecioEspecie(especie, campo, valor) {
    if (!uid) return
    const next = {
      ...config,
      precios: {
        ...config.precios,
        [especie]: { ...(config.precios[especie] || { ars: 0, usd: 0 }), [campo]: Number(valor) || 0 },
      },
    }
    setConfig(next)
    await setDoc(doc(db, 'usuarios', uid, 'config', 'precios'), next)
  }

  async function setTipoCambio(valor) {
    if (!uid) return
    const next = { ...config, tipoCambio: Number(valor) || 0 }
    setConfig(next)
    await setDoc(doc(db, 'usuarios', uid, 'config', 'precios'), next)
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
