import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './useAuth'

export const ADMIN_EMAIL = 'alangambacorta7@gmail.com'
// Allowlist de admins. Se puede sumar por email o por UID. Mantener en sync con
// la función isAdmin() de firestore.rules (fuente de verdad del control real).
export const ADMIN_EMAILS = [ADMIN_EMAIL]
export const ADMIN_UIDS = []

export function esAdmin(user) {
  if (!user) return false
  return ADMIN_EMAILS.includes(user.email) || ADMIN_UIDS.includes(user.uid)
}

// Hook: devuelve si el usuario logueado es admin (para gatear botones/UI).
// El control real vive en firestore.rules; este gate es cosmético.
export function useIsAdmin() {
  const { user } = useAuth()
  return esAdmin(user)
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
