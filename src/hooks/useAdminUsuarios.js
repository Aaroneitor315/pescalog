import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export function useAdminUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        const usuariosSnap = await getDocs(collection(db, 'usuarios'))
        const lista = []

        for (const usuarioDoc of usuariosSnap.docs) {
          const uid = usuarioDoc.id

          const [perfilSnap, viajesSnap] = await Promise.all([
            getDocs(collection(db, 'usuarios', uid, 'perfil')),
            getDocs(collection(db, 'usuarios', uid, 'viajes')),
          ])

          const perfil = perfilSnap.docs.find(d => d.id === 'datos')?.data() || {}
          const viajes = viajesSnap.docs.map(d => d.data())
          const totalCajones = viajes.reduce((s, v) => s + (Number(v.cajones) || 0), 0)

          lista.push({
            uid,
            email: perfil.email || '(sin email)',
            registradoEn: perfil.registradoEn?.toDate?.() || null,
            ultimoAcceso: perfil.ultimoAcceso?.toDate?.() || null,
            totalViajes: viajes.length,
            totalCajones,
          })
        }

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
