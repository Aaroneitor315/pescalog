import { useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'

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
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        email,
        registradoEn: serverTimestamp(),
        ultimoAcceso: serverTimestamp(),
      })
    } catch (e) {
      setError(traducirError(e.code))
    }
  }

  async function iniciarSesion(email, password) {
    setError('')
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        email,
        ultimoAcceso: serverTimestamp(),
      }, { merge: true })
    } catch (e) {
      setError(traducirError(e.code))
    }
  }

  async function cerrarSesion() {
    await signOut(auth)
  }

  async function recuperarContrasena(email) {
    setError('')
    try {
      await sendPasswordResetEmail(auth, email)
      return true
    } catch (e) {
      setError(traducirError(e.code))
      return false
    }
  }

  return { user, loading, error, registrar, iniciarSesion, cerrarSesion, recuperarContrasena }
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
