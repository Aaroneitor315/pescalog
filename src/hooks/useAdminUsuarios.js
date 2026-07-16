import { useState, useEffect } from 'react'
import { collection, getDocs, collectionGroup } from 'firebase/firestore'
import { db } from '../firebase'

export function useAdminUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        // Obtener todos los viajes de todos los usuarios via collectionGroup
        const [usuariosSnap, todosViajesSnap] = await Promise.all([
          getDocs(collection(db, 'usuarios')),
          getDocs(collectionGroup(db, 'viajes')),
        ])

        // Agrupar viajes por uid
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
        console.error('Error cargando usuarios admin:', e)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  return { usuarios, cargando }
}
