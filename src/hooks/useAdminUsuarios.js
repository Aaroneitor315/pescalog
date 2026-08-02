import { useState, useEffect } from 'react'
import { collection, collectionGroup, getDocsFromServer, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

export function useAdminUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [metricas, setMetricas] = useState(null)
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

      // Fetch perfiles en paralelo
      const uids = usuariosSnap.docs.map(d => d.id)
      const perfilesSnaps = await Promise.all(
        uids.map(uid => getDoc(doc(db, 'usuarios', uid, 'config', 'perfil')))
      )
      const perfilesPorUid = {}
      perfilesSnaps.forEach((snap, i) => {
        if (snap.exists()) perfilesPorUid[uids[i]] = snap.data()
      })

      // Usuarios con documento padre
      const usuariosConDoc = {}
      usuariosSnap.docs.forEach(d => {
        const datos = d.data()
        const viajes = viajesPorUid[d.id] || []
        const perfil = perfilesPorUid[d.id] || null
        const ahora = new Date()
        const diasDesdeAcceso = datos.ultimoAcceso
          ? Math.ceil((ahora - datos.ultimoAcceso.toDate()) / (1000 * 60 * 60 * 24))
          : null
        usuariosConDoc[d.id] = {
          uid: d.id,
          email: datos.email || '(sin email)',
          registradoEn: datos.registradoEn?.toDate?.() || null,
          ultimoAcceso: datos.ultimoAcceso?.toDate?.() || null,
          totalViajes: viajes.length,
          totalCajones: viajes.reduce((s, v) => s + (Number(v.cajones) || 0), 0),
          sector: perfil?.sector || null,
          rango: perfil?.rango || null,
          onboardingCompleto: perfil?.completado === true,
          activoUltimos30: diasDesdeAcceso !== null && diasDesdeAcceso <= 30,
          sinDocumento: false,
        }
      })

      // Usuarios solo en viajes (sin documento padre)
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
            sector: null,
            rango: null,
            onboardingCompleto: false,
            activoUltimos30: false,
            sinDocumento: true,
          }
        }
      })

      const lista = Object.values(usuariosConDoc).sort((a, b) => {
        if (a.ultimoAcceso && b.ultimoAcceso) return b.ultimoAcceso - a.ultimoAcceso
        if (a.ultimoAcceso) return -1
        if (b.ultimoAcceso) return 1
        return b.totalViajes - a.totalViajes
      })

      // Calcular métricas agregadas
      const sectorCount = { maquinas: 0, cubierta: 0, puente: 0, sinSector: 0 }
      lista.forEach(u => {
        if (u.sector === 'maquinas') sectorCount.maquinas++
        else if (u.sector === 'cubierta') sectorCount.cubierta++
        else if (u.sector === 'puente') sectorCount.puente++
        else sectorCount.sinSector++
      })

      setMetricas({
        totalUsuarios: lista.length,
        onboardingCompleto: lista.filter(u => u.onboardingCompleto).length,
        activosUltimos30: lista.filter(u => u.activoUltimos30).length,
        conViajes: lista.filter(u => u.totalViajes > 0).length,
        sectorCount,
        totalViajes: lista.reduce((s, u) => s + u.totalViajes, 0),
        totalCajones: lista.reduce((s, u) => s + u.totalCajones, 0),
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

  return { usuarios, metricas, cargando, error, recargar: cargar }
}
