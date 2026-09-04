import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Cursos STCW estándar precargados (nombre fijo, el usuario solo carga la fecha).
export const CURSOS_STCW_BASE = [
  { id: 'lci', nombre: 'Prevención y lucha contra incendios', vencimiento: '', fijo: true },
  { id: 'lci_av', nombre: 'Técnicas avanzadas de LCI', vencimiento: '', fijo: true },
  { id: 'pa', nombre: 'Primeros auxilios', vencimiento: '', fijo: true },
  { id: 'cm', nombre: 'Cuidados médicos', vencimiento: '', fijo: true },
  { id: 'botes', nombre: 'Botes salvavidas y de rescate (no rápidos)', vencimiento: '', fijo: true },
  { id: 'marpol', nombre: 'MARPOL', vencimiento: '', fijo: true },
]

const DEFAULTS = {
  nombre: '',
  dni: '',
  cuil: '',
  nroLibreta: '',
  documentos: [
    { id: '1', nombre: 'Reconocimiento Médico', numero: '', vencimiento: '' },
    { id: '2', nombre: 'Título', numero: '', vencimiento: '' },
    { id: '3', nombre: 'STCW', numero: '', vencimiento: '', cursos: CURSOS_STCW_BASE },
    { id: '4', nombre: 'Libreta de Embarque', numero: '', vencimiento: '' },
  ],
}

// Garantiza que la fila STCW tenga los 6 cursos base (para libretas viejas).
function normalizarStcw(documentos) {
  return (documentos || []).map(d => {
    if (d.id !== '3') return d
    const cursos = d.cursos || []
    if (cursos.length === 0) return { ...d, cursos: CURSOS_STCW_BASE.map(c => ({ ...c })) }
    // Reincorpora los base que falten (por clave), conservando los ya cargados.
    const faltantes = CURSOS_STCW_BASE.filter(base => !cursos.some(c => c.id === base.id))
    return { ...d, cursos: [...faltantes.map(c => ({ ...c })), ...cursos] }
  })
}

export function useLibreta(uid) {
  const [libreta, setLibreta] = useState(DEFAULTS)

  useEffect(() => {
    if (!uid) { setLibreta(DEFAULTS); return }
    const ref = doc(db, 'usuarios', uid, 'config', 'libreta')
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data()
        setLibreta({ ...DEFAULTS, ...data, documentos: normalizarStcw(data.documentos || DEFAULTS.documentos) })
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
