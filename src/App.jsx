import { useState } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import HistorialViajes from './components/HistorialViajes'
import FormularioViaje from './components/FormularioViaje'
import ConfigPrecios from './components/ConfigPrecios'
import Libreta from './components/Libreta'
import Login from './components/Login'
import AdminPanel from './components/AdminPanel'
import Calculadora from './components/Calculadora'
import PanelMaquinista from './components/PanelMaquinista'
import { useViajes } from './hooks/useViajes'
import { usePrecios } from './hooks/usePrecios'
import { useLibreta } from './hooks/useLibreta'
import { useAuth } from './hooks/useAuth'

export default function App() {
  const { user, loading, cerrarSesion } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [viajeEditando, setViajeEditando] = useState(null)
  const [panelMaquinista, setPanelMaquinista] = useState(false)

  const uid = user?.uid || null
  const { viajes, agregarViaje, eliminarViaje, editarViaje } = useViajes(uid)
  const { config, setPrecioEspecie, setTipoCambio, guardarTodos, calcularTotalViaje } = usePrecios(uid)
  const { libreta, actualizarPerfil, actualizarDocumento, agregarDocumento, eliminarDocumento } = useLibreta(uid)

  function handleGuardar(datos) {
    if (viajeEditando) {
      editarViaje(viajeEditando.id, datos)
      setViajeEditando(null)
    } else {
      agregarViaje(datos)
    }
    setTab('historial')
  }

  function handleEditar(viaje) {
    setViajeEditando(viaje)
    setTab('nuevo')
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

      {/* FAB llave — flotante sobre todo, lado derecho */}
      <button
        onClick={() => setPanelMaquinista(true)}
        title="Repuestos & Stock"
        style={{
          position: 'fixed',
          right: 12,
          bottom: 80,
          zIndex: 40,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#0891b2',
          border: '2.5px solid #0a1929',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(8,145,178,0.45)',
          cursor: 'pointer',
        }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      </button>

      {/* Panel maquinista */}
      {panelMaquinista && (
        <PanelMaquinista uid={uid} onCerrar={() => setPanelMaquinista(false)} />
      )}

      <main className="max-w-6xl mx-auto px-4 pt-8 pb-24 sm:py-8 relative">
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
            onEditar={handleEditar}
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
            guardarTodos={guardarTodos}
            viajes={viajes}
          />
        )}
        {tab === 'nuevo' && (
          <FormularioViaje
            onGuardar={handleGuardar}
            onCancelar={() => { setViajeEditando(null); setTab(viajeEditando ? 'historial' : 'dashboard') }}
            viajeInicial={viajeEditando}
            viajes={viajes}
          />
        )}
        {tab === 'liquidacion' && <Calculadora uid={uid} />}
        {tab === 'admin' && <AdminPanel />}
      </main>
    </div>
  )
}
