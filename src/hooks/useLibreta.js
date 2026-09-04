import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const DEFAULTS = {
  nombre: '',
  dni: '',
  cuil: '',
  nroLibreta: '',
  documentos: [
    { id: '1', nombre: 'Reconocimiento Médico', numero: '', vencimiento: '' },
    { id: '2', nombre: 'Título', numero: '', vencimiento: '' },
    { id: '3', nombre: 'STCW', numero: '', vencimiento: '', cursos: [] },
    { id: '4', nombre: 'Libreta de Embarque', numero: '', vencimiento: '' },
  ],
}

export function useLibreta(uid) {
  const [libreta, setLibreta] = useState(DEFAULTS)

  useEffect(() => {
    if (!uid) { setLibreta(DEFAULTS); return }
    const ref = doc(db, 'usuarios', uid, 'config', 'libreta')
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data()
        setLibreta({ ...DEFAULTS, ...data, documentos: data.documentos || DEFAULTS.documentos })
      }
    })
    return unsub
  }, [uid])

  async function guardar(next) {
    setLibreta(next)
    if (uid) await setDoc(doc(db, 'usuarios', uid, 'config', 'libreta'), next)
  }

  function actualizarPerfil(datos) {
    guardar({ ...libreta, ...datos })
  }

  function actualizarDocumento(id, campo, valor) {
    guardar({
      ...libreta,
      documentos: libreta.documentos.map(d => d.id === id ? { ...d, [campo]: valor } : d),
    })
  }

  function agregarDocumento() {
    const nuevo = { id: crypto.randomUUID(), nombre: '', numero: '', vencimiento: '' }
    guardar({ ...libreta, documentos: [...libreta.documentos, nuevo] })
  }

  function eliminarDocumento(id) {
    guardar({ ...libreta, documentos: libreta.documentos.filter(d => d.id !== id) })
  }

  // ── Cursos STCW: la fila STCW (id '3') contiene una lista de cursos con vencimiento propio ──
  function mapStcw(fn) {
    guardar({
      ...libreta,
      documentos: libreta.documentos.map(d => d.id === '3' ? { ...d, cursos: fn(d.cursos || []) } : d),
    })
  }

  function agregarCursoStcw() {
    const nuevo = { id: crypto.randomUUID(), nombre: '', vencimiento: '' }
    mapStcw(cursos => [...cursos, nuevo])
  }

  function actualizarCursoStcw(cursoId, campo, valor) {
    mapStcw(cursos => cursos.map(c => c.id === cursoId ? { ...c, [campo]: valor } : c))
  }

  function eliminarCursoStcw(cursoId) {
    mapStcw(cursos => cursos.filter(c => c.id !== cursoId))
  }

  return {
    libreta, actualizarPerfil, actualizarDocumento, agregarDocumento, eliminarDocumento,
    agregarCursoStcw, actualizarCursoStcw, eliminarCursoStcw,
  }
}
