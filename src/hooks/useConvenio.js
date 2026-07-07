import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../firebase'

export const CONVENIO_DEFAULT = {
  fecha_vigencia_desde: '2024-01-01',
  porcentaje_maquina: 4.17,
  porcentaje_ropa_agua: 2,
  viajes_minimos: 5,
  tope_mopre: 117682.4,
  porcentaje_obra_social: 0,
  porcentaje_ley_19032: 0,
  porcentaje_jubilacion: 0,
  porcentaje_sindicato: 0,
}

function vigente(versiones, fecha) {
  if (!versiones?.length) return CONVENIO_DEFAULT
  const ref = fecha || new Date().toISOString().slice(0, 10)
  const aptas = versiones.filter(v => v.fecha_vigencia_desde <= ref)
  if (!aptas.length) return versiones[0]
  return aptas.reduce((a, b) => a.fecha_vigencia_desde > b.fecha_vigencia_desde ? a : b)
}

export function useConvenio() {
  const [versiones, setVersiones] = useState([])
  const [convenio, setConvenio] = useState(CONVENIO_DEFAULT)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'convenio'), snap => {
      const data = snap.exists() ? snap.data() : {}
      const vers = data.versiones || [CONVENIO_DEFAULT]
      setVersiones(vers)
      setConvenio(vigente(vers))
      setCargando(false)
    })
    return unsub
  }, [])

  async function guardarVersion(nuevaVersion) {
    const version = { ...nuevaVersion, fecha_vigencia_desde: nuevaVersion.fecha_vigencia_desde || new Date().toISOString().slice(0, 10) }
    await setDoc(doc(db, 'config', 'convenio'), { versiones: arrayUnion(version) }, { merge: true })
  }

  return { convenio, versiones, guardarVersion, cargando }
}
