import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { TARIFAS_DEFAULT } from '../lib/liquidaciones/maquinista.js'

// Tarifas de Liquidación Máquinas — únicas y compartidas, en config/tarifasMaquinas.
// Todos las leen; solo el admin las guarda (el gate de escritura lo aplica la UI,
// que solo muestra el botón Guardar a un usuario admin).
export function useTarifasMaquinas() {
  const [tarifas, setTarifas] = useState(TARIFAS_DEFAULT)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'tarifasMaquinas'), snap => {
      setTarifas(snap.exists() ? { ...TARIFAS_DEFAULT, ...snap.data() } : TARIFAS_DEFAULT)
      setCargando(false)
    }, () => setCargando(false))
    return unsub
  }, [])

  async function guardarTarifas(nuevas) {
    const limpias = { ...nuevas }
    Object.keys(limpias).forEach(k => {
      if (k !== 'fecha_vigencia_desde') limpias[k] = Number(limpias[k]) || 0
    })
    await setDoc(doc(db, 'config', 'tarifasMaquinas'), limpias, { merge: true })
  }

  return { tarifas, guardarTarifas, cargando }
}
