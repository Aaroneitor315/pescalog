import { useState, useEffect } from 'react'
import { collection, collectionGroup, getDocsFromServer } from 'firebase/firestore'
import { db } from '../firebase'

export function useAdminUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      // Forzar lectura desde el servidor, ignorando caché local
      const [usuariosSnap, todosViajesSnap] = await Promise.all([
        getDocsFromServer(collection(db, 'usuarios')),
        getDocsFromServer(collectionGroup(db, 'viajes')),
      ])

      const viajesPorUid = {}
      todosViajesSnap.docs.forEach(d => {
        const uid = d.ref.parent.parent.id
        if (!viajesPorUid[uid]) viajesPorUid[uid] = []
        viajesPorUid[uid].push(d.data())
      })

      const lista = usuariosSnap.docs.map(usuarioDoc => {
        const uid = usuarioDoc.id
        const datos = usuarioDoc.data()
        const viajes = viajesPorUid[uid] || []
        const totalCajones = viajes.reduce((s, v) => s + (Number(v.cajones) || 0), 0)
        return {
          uid,
          email: datos.email || '(sin email)',
          registradoEn: datos.registradoEn?.toDate?.() || null,
          ultimoAcceso: datos.ultimoAcceso?.toDate?.() || null,
          totalViajes: viajes.length,
          totalCajones,
        }
      })

      lista.sort((a, b) => (b.ultimoAcceso || 0) - (a.ultimoAcceso || 0))
      setUsuarios(lista)
    } catch (e) {
      console.error('Error admin usuarios:', e)
      setError(e.code ? `${e.code}: ${e.message}` : e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  return { usuarios, cargando, error, recargar: cargar }
}
