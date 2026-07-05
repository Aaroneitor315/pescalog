import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export const ADMIN_EMAIL = 'alangambacorta7@gmail.com'

export function esAdmin(user) {
  return user?.email === ADMIN_EMAIL
}

const SPONSORS_DEFAULT = {
  banner: { nombre: '', url: '', logo: '', activo: false },
  slots: [
    { id: '1', nombre: '', url: '', logo: '', activo: false },
    { id: '2', nombre: '', url: '', logo: '', activo: false },
    { id: '3', nombre: '', url: '', logo: '', activo: false },
  ],
}

export function useAdmin() {
  const [stats, setStats] = useState(null)
  const [sponsors, setSponsors] = useState(SPONSORS_DEFAULT)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsubStats = onSnapshot(doc(db, 'stats', 'global'), snap => {
      setStats(snap.exists() ? snap.data() : null)
      setCargando(false)
    })
    const unsubSponsors = onSnapshot(doc(db, 'config', 'sponsors'), snap => {
      if (snap.exists()) setSponsors({ ...SPONSORS_DEFAULT, ...snap.data() })
    })
    return () => { unsubStats(); unsubSponsors() }
  }, [])

  async function guardarSponsors(nuevoSponsors) {
    setSponsors(nuevoSponsors)
    await setDoc(doc(db, 'config', 'sponsors'), nuevoSponsors)
  }

  return { stats, sponsors, guardarSponsors, cargando }
}

export function useSponsors() {
  const [sponsors, setSponsors] = useState(SPONSORS_DEFAULT)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'sponsors'), snap => {
      if (snap.exists()) setSponsors({ ...SPONSORS_DEFAULT, ...snap.data() })
    })
    return unsub
  }, [])
  return sponsors
}
