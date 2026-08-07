import { useState, useEffect } from 'react'
import {
  collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy, setDoc, getDoc, increment,
} from 'firebase/firestore'
import { db } from '../firebase'

// El cómputo vive en un único módulo (src/lib/singladuras.js) para que el
// dashboard, el formulario y la planilla REFOCAPEMM usen exactamente la misma
// fórmula. Se re-exporta acá por compatibilidad con los imports existentes.
export { calcularSingladuras } from '../lib/singladuras'

async function actualizarStats(especie, cajones, operacion) {
  if (!especie || !cajones) return
  const ref = doc(db, 'stats', 'global')
  const delta = operacion === 'agregar' ? cajones : -cajones
  try {
    await setDoc(ref, {
      totalCajones: increment(delta),
      totalViajes: increment(operacion === 'agregar' ? 1 : -1),
      [`cajonesPorEspecie.${especie.replace(/\s/g, '_')}`]: increment(delta),
    }, { merge: true })
  } catch {}
}

export function useViajes(uid) {
  const [viajes, setViajes] = useState([])

  useEffect(() => {
    if (!uid) { setViajes([]); return }
    const q = query(collection(db, 'usuarios', uid, 'viajes'), orderBy('fechaSalida', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setViajes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [uid])

  async function agregarViaje(datos) {
    if (!uid) return
    await addDoc(collection(db, 'usuarios', uid, 'viajes'), {
      ...datos,
      creadoEn: new Date().toISOString(),
    })
    await actualizarStats(datos.especie, datos.cajones || 0, 'agregar')
  }

  async function eliminarViaje(id) {
    if (!uid) return
    const viaje = viajes.find(v => v.id === id)
    await deleteDoc(doc(db, 'usuarios', uid, 'viajes', id))
    if (viaje) await actualizarStats(viaje.especie, viaje.cajones || 0, 'eliminar')
  }

  async function editarViaje(id, datos) {
    if (!uid) return
    const viajeAnterior = viajes.find(v => v.id === id)
    await setDoc(doc(db, 'usuarios', uid, 'viajes', id), {
      ...datos,
      creadoEn: viajeAnterior?.creadoEn || new Date().toISOString(),
      editadoEn: new Date().toISOString(),
    })
    if (viajeAnterior) {
      await actualizarStats(viajeAnterior.especie, viajeAnterior.cajones || 0, 'eliminar')
      await actualizarStats(datos.especie, datos.cajones || 0, 'agregar')
    }
  }

  return { viajes, agregarViaje, eliminarViaje, editarViaje }
}
