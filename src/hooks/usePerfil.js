import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export const SECTORES = {
  maquinas: { label: 'Máquinas', color: '#22d3ee', border: '#0e7490', bg: '#0e749018', emoji: '🔧' },
  cubierta: { label: 'Cubierta', color: '#34d399', border: '#065f46', bg: '#06b68018', emoji: '⚓' },
  puente:   { label: 'Puente',   color: '#c084fc', border: '#581c87', bg: '#8b5cf618', emoji: '🚢' },
}

export const RANGOS = {
  maquinas: ['Jefe de máquinas', '1° Oficial', '2° Oficial', '3° Oficial', 'Engrasador'],
  cubierta: ['Contramaestre', '1° Pescador', '2° Pescador', 'Marinero', 'Cocinero'],
  puente:   ['Capitán', '1° Oficial', '2° Oficial'],
}

export const RUBROS_SUGERIDOS = ['Pesca', 'Remolque', 'Carguero', 'Petrolero', 'Buque factoría']

export function usePerfil(uid) {
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!uid) { setPerfil(null); setCargando(false); return }
    setCargando(true)
    const ref = doc(db, 'usuarios', uid, 'config', 'perfil')
    getDoc(ref).then(snap => {
      setPerfil(snap.exists() ? snap.data() : null)
      setCargando(false)
    }).catch(() => {
      setCargando(false)
    })
  }, [uid])

  async function guardarPerfil(datos) {
    const ref = doc(db, 'usuarios', uid, 'config', 'perfil')
    await setDoc(ref, { ...datos, completado: true })
    setPerfil({ ...datos, completado: true })
  }

  return { perfil, cargando, guardarPerfil }
}
