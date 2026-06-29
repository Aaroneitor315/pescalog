import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bitacoraar_libreta'

const DEFAULTS = {
  nombre: '',
  cuil: '',
  matricula: '',
  documentos: [
    { id: '1', nombre: 'Reconocimiento Médico', numero: '', vencimiento: '' },
    { id: '2', nombre: 'Título', numero: '', vencimiento: '' },
    { id: '3', nombre: 'STCW', numero: '', vencimiento: '' },
    { id: '4', nombre: 'Libreta de Embarque', numero: '', vencimiento: '' },
  ],
}

export function useLibreta() {
  const [libreta, setLibreta] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULTS, ...parsed, documentos: parsed.documentos || DEFAULTS.documentos }
      }
    } catch {}
    return DEFAULTS
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(libreta))
    } catch {}
  }, [libreta])

  function actualizarPerfil(datos) {
    setLibreta(prev => ({ ...prev, ...datos }))
  }

  function actualizarDocumento(id, campo, valor) {
    setLibreta(prev => ({
      ...prev,
      documentos: prev.documentos.map(d => d.id === id ? { ...d, [campo]: valor } : d),
    }))
  }

  function agregarDocumento() {
    const nuevo = { id: crypto.randomUUID(), nombre: '', numero: '', vencimiento: '' }
    setLibreta(prev => ({ ...prev, documentos: [...prev.documentos, nuevo] }))
  }

  function eliminarDocumento(id) {
    setLibreta(prev => ({ ...prev, documentos: prev.documentos.filter(d => d.id !== id) }))
  }

  return { libreta, actualizarPerfil, actualizarDocumento, agregarDocumento, eliminarDocumento }
}
