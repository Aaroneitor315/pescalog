import { useState, useEffect } from 'react'
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy
} from 'firebase/firestore'
import { db } from '../firebase'

export function useRepuestos(uid, seccion) {
  const [repuestos, setRepuestos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!uid || !seccion) return
    const q = query(
      collection(db, 'usuarios', uid, 'repuestos'),
      orderBy('creadoEn', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setRepuestos(todos.filter(r => r.seccion === seccion))
      setCargando(false)
    })
    return unsub
  }, [uid, seccion])

  async function agregar(datos) {
    await addDoc(collection(db, 'usuarios', uid, 'repuestos'), {
      ...datos,
      seccion,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    })
  }

  async function actualizarStock(id, stockActual) {
    await updateDoc(doc(db, 'usuarios', uid, 'repuestos', id), {
      stockActual,
      actualizadoEn: serverTimestamp(),
    })
  }

  async function actualizarCantPedir(id, cantPedir) {
    await updateDoc(doc(db, 'usuarios', uid, 'repuestos', id), {
      cantPedir,
      actualizadoEn: serverTimestamp(),
    })
  }

  async function eliminar(id) {
    await deleteDoc(doc(db, 'usuarios', uid, 'repuestos', id))
  }

  return { repuestos, cargando, agregar, actualizarStock, actualizarCantPedir, eliminar }
}
