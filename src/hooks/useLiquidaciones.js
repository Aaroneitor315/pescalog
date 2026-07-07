import { useState, useEffect } from 'react'
import { collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

export function useLiquidaciones(uid) {
  const [liquidaciones, setLiquidaciones] = useState([])

  useEffect(() => {
    if (!uid) { setLiquidaciones([]); return }
    const q = query(collection(db, 'usuarios', uid, 'liquidaciones'), orderBy('fecha_calculo', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setLiquidaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [uid])

  async function guardarLiquidacion(datos) {
    if (!uid) return
    await addDoc(collection(db, 'usuarios', uid, 'liquidaciones'), {
      ...datos,
      fecha_calculo: new Date().toISOString(),
    })
  }

  async function eliminarLiquidacion(id) {
    if (!uid) return
    await deleteDoc(doc(db, 'usuarios', uid, 'liquidaciones', id))
  }

  return { liquidaciones, guardarLiquidacion, eliminarLiquidacion }
}
