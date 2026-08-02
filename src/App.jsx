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
import NetworkBanner from './components/NetworkBanner'
import Onboarding from './components/Onboarding'
import BannerVencimientos from './components/BannerVencimientos'
import { useViajes } from './hooks/useViajes'
import { usePrecios } from './hooks/usePrecios'
import { useLibreta } from './hooks/useLibreta'
import { useAuth } from './hooks/useAuth'
import { usePerfil } from './hooks/usePerfil'

export default function App() {
  const { user, loading, cerrarSesion } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [viajeEditando, setViajeEditando] = useState(null)
  const [sectorAbierto, setSectorAbierto] = useState(null)

  const uid = user?.uid || null
  const { perfil, cargando: cargandoPerfil, guardarPerfil } = usePerfil(uid)
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

  if (loading || cargandoPerfil) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  if (!perfil?.completado) {
    return <Onboarding onGuardar={guardarPerfil} />
  }

  function contarAlertasLibreta() {
    return libreta.documentos.filter(d => {
      if (!d.vencimiento) return false
      const dias = Math.ceil((new Date(d.vencimiento) - new Date()) / (1000 * 60 * 60 * 24))
      return dias < 0 || dias <= 60
    }).length
  }

  return (
    <div className="min-h-screen">
      <NetworkBanner />
      <BannerVencimientos documentos={libreta.documentos} onIrLibreta={() => setTab('libreta')} />
      <Navbar tab={tab} setTab={setTab} user={user} onCerrarSesion={cerrarSesion} perfil={perfil} alertasLibreta={contarAlertasLibreta()} />

      {/* Panel sectores a bordo */}
      {sectorAbierto && (
        <PanelMaquinista uid={uid} seccion={sectorAbierto} onCerrar={() => setSectorAbierto(null)} />
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
            onAbrirSector={setSectorAbierto}
            onNuevoViaje={() => setTab('nuevo')}
            perfil={perfil}
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
