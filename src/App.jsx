import { useState } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import HistorialViajes from './components/HistorialViajes'
import FormularioViaje from './components/FormularioViaje'
import ConfigPrecios from './components/ConfigPrecios'
import Libreta from './components/Libreta'
import Login from './components/Login'
import AdminPanel from './components/AdminPanel'
import { useViajes } from './hooks/useViajes'
import { usePrecios } from './hooks/usePrecios'
import { useLibreta } from './hooks/useLibreta'
import { useAuth } from './hooks/useAuth'

export default function App() {
  const { user, loading, cerrarSesion } = useAuth()
  const [tab, setTab] = useState('dashboard')

  const uid = user?.uid || null
  const { viajes, agregarViaje, eliminarViaje } = useViajes(uid)
  const { config, setPrecioEspecie, setTipoCambio, calcularTotalViaje } = usePrecios(uid)
  const { libreta, actualizarPerfil, actualizarDocumento, agregarDocumento, eliminarDocumento } = useLibreta(uid)

  function handleGuardar(datos) {
    agregarViaje(datos)
    setTab('historial')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="min-h-screen">
      <Navbar tab={tab} setTab={setTab} user={user} onCerrarSesion={cerrarSesion} />
      <main className="max-w-6xl mx-auto px-4 py-8 relative">
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          className="fixed bottom-4 right-4 w-80 opacity-[0.09] pointer-events-none select-none z-0"
        />
        {tab === 'dashboard' && (
          <Dashboard
            viajes={viajes}
            calcularTotalViaje={calcularTotalViaje}
            config={config}
          />
        )}
        {tab === 'historial' && (
          <HistorialViajes
            viajes={viajes}
            onEliminar={eliminarViaje}
            calcularTotalViaje={calcularTotalViaje}
            config={config}
          />
        )}
        {tab === 'libreta' && (
          <Libreta
            libreta={libreta}
            actualizarPerfil={actualizarPerfil}
            actualizarDocumento={actualizarDocumento}
            agregarDocumento={agregarDocumento}
            eliminarDocumento={eliminarDocumento}
          />
        )}
        {tab === 'precios' && (
          <ConfigPrecios
            config={config}
            setPrecioEspecie={setPrecioEspecie}
            setTipoCambio={setTipoCambio}
            viajes={viajes}
          />
        )}
        {tab === 'nuevo' && (
          <FormularioViaje
            onGuardar={handleGuardar}
            onCancelar={() => setTab('dashboard')}
          />
        )}
        {tab === 'admin' && <AdminPanel />}
      </main>
    </div>
  )
}
