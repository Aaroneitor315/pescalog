import { useState, useEffect } from 'react'
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

// Cursos globales: todos leen, solo admin escribe (regla en firestore.rules).
export function useCursos() {
  const [cursos, setCursos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'cursos'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q,
      snap => { setCursos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setCargando(false) },
      () => setCargando(false))
    return unsub
  }, [])

  async function agregar(datos) {
    await addDoc(collection(db, 'cursos'), { ...datos, createdAt: serverTimestamp() })
  }
  async function editar(id, datos) {
    await updateDoc(doc(db, 'cursos', id), { ...datos })
  }
  async function eliminar(id) {
    await deleteDoc(doc(db, 'cursos', id))
  }

  return { cursos, cargando, agregar, editar, eliminar }
}
