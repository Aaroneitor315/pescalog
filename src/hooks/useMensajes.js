import { useState, useEffect } from 'react'
import { collection, doc, addDoc, updateDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { esAdmin } from './useAdmin'

// Buzón de mensajes.
//  - enviar(): cualquier usuario logueado crea un mensaje (estado 'nuevo').
//  - Solo el admin puede listar/actualizar (regla en firestore.rules); por eso
//    la suscripción a la bandeja se abre SÓLO si el usuario es admin (evita
//    errores de permisos para el resto).
export function useMensajes(user) {
  const admin = esAdmin(user)
  const [mensajes, setMensajes] = useState([])

  useEffect(() => {
    if (!admin) { setMensajes([]); return }
    const q = query(collection(db, 'mensajes'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q,
      snap => setMensajes(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {})
    return unsub
  }, [admin])

  async function enviar(datos) {
    await addDoc(collection(db, 'mensajes'), {
      ...datos,
      nombre: user?.displayName || user?.email || '',
      email: user?.email || '',
      uid: user?.uid || null,
      estado: 'nuevo',
      createdAt: serverTimestamp(),
    })
  }

  async function actualizarEstado(id, estado) {
    await updateDoc(doc(db, 'mensajes', id), { estado })
  }

  const nuevos = mensajes.filter(m => m.estado === 'nuevo').length

  return { mensajes, enviar, actualizarEstado, nuevos, admin }
}
