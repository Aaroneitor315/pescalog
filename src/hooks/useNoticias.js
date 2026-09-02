import { useState, useEffect } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

// Noticias globales: todos leen, solo admin escribe (regla en firestore.rules).
export function useNoticias() {
  const [noticias, setNoticias] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'noticias'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q,
      snap => { setNoticias(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setCargando(false) },
      () => setCargando(false))
    return unsub
  }, [])

  async function agregar(datos) {
    await addDoc(collection(db, 'noticias'), { ...datos, createdAt: serverTimestamp() })
  }
  async function editar(id, datos) {
    await updateDoc(doc(db, 'noticias', id), { ...datos })
  }
  async function eliminar(id) {
    await deleteDoc(doc(db, 'noticias', id))
  }

  return { noticias, cargando, agregar, editar, eliminar }
}
