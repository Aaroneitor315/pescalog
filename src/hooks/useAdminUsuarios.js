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
      const [usuariosSnap, todosViajesSnap] = await Promise.all([
        getDocsFromServer(collection(db, 'usuarios')),
        getDocsFromServer(collectionGroup(db, 'viajes')),
      ])

      // Agrupar viajes por uid
      const viajesPorUid = {}
      todosViajesSnap.docs.forEach(d => {
        const uid = d.ref.parent.parent.id
        if (!viajesPorUid[uid]) viajesPorUid[uid] = []
        viajesPorUid[uid].push(d.data())
      })

      // Usuarios con documento padre (tienen email y fechas)
      const usuariosConDoc = {}
      usuariosSnap.docs.forEach(doc => {
        const datos = doc.data()
        const viajes = viajesPorUid[doc.id] || []
        usuariosConDoc[doc.id] = {
          uid: doc.id,
          email: datos.email || '(sin email)',
          registradoEn: datos.registradoEn?.toDate?.() || null,
          ultimoAcceso: datos.ultimoAcceso?.toDate?.() || null,
          totalViajes: viajes.length,
          totalCajones: viajes.reduce((s, v) => s + (Number(v.cajones) || 0), 0),
          sinDocumento: false,
        }
      })

      // Usuarios encontrados solo en viajes (sin documento padre — registrados antes del fix)
      Object.keys(viajesPorUid).forEach(uid => {
        if (!usuariosConDoc[uid]) {
          const viajes = viajesPorUid[uid]
          usuariosConDoc[uid] = {
            uid,
            email: '(debe volver a iniciar sesión)',
            registradoEn: null,
            ultimoAcceso: null,
            totalViajes: viajes.length,
            totalCajones: viajes.reduce((s, v) => s + (Number(v.cajones) || 0), 0),
            sinDocumento: true,
          }
        }
      })

      const lista = Object.values(usuariosConDoc)
        .sort((a, b) => {
          // Con doc y acceso reciente primero, luego sin doc
          if (a.ultimoAcceso && b.ultimoAcceso) return b.ultimoAcceso - a.ultimoAcceso
          if (a.ultimoAcceso) return -1
          if (b.ultimoAcceso) return 1
          return b.totalViajes - a.totalViajes
        })

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
