import { useState, useEffect } from 'react'
import {
  collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'

export function calcularSingladuras(fechaSalida, fechaRegreso) {
  if (!fechaSalida || !fechaRegreso) return 0
  const a = new Date(fechaSalida)
  const b = new Date(fechaRegreso)
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

export function useViajes(uid) {
  const [viajes, setViajes] = useState([])

  useEffect(() => {
    if (!uid) { setViajes([]); return }
    const q = query(collection(db, 'usuarios', uid, 'viajes'), orderBy('fechaSalida', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setViajes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [uid])

  async function agregarViaje(datos) {
    if (!uid) return
    await addDoc(collection(db, 'usuarios', uid, 'viajes'), {
      ...datos,
      creadoEn: new Date().toISOString(),
    })
  }

  async function eliminarViaje(id) {
    if (!uid) return
    await deleteDoc(doc(db, 'usuarios', uid, 'viajes', id))
  }

  return { viajes, agregarViaje, eliminarViaje }
}
