import { useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  async function registrar(email, password) {
    setError('')
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (e) {
      setError(traducirError(e.code))
    }
  }

  async function iniciarSesion(email, password) {
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      setError(traducirError(e.code))
    }
  }

  async function cerrarSesion() {
    await signOut(auth)
  }

  return { user, loading, error, registrar, iniciarSesion, cerrarSesion }
}

function traducirError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'Ese email ya está registrado.'
    case 'auth/invalid-email': return 'El email no es válido.'
    case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.'
    case 'auth/user-not-found': return 'No existe una cuenta con ese email.'
    case 'auth/wrong-password': return 'Contraseña incorrecta.'
    case 'auth/invalid-credential': return 'Email o contraseña incorrectos.'
    default: return 'Ocurrió un error. Intentá de nuevo.'
  }
}
