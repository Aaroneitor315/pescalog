import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import HistorialViajes from './components/HistorialViajes'
import FormularioViaje from './components/FormularioViaje'
import ConfigPrecios from './components/ConfigPrecios'
import Libreta from './components/Libreta'
import Login from './components/Login'
import AdminPanel from './components/AdminPanel'
import Calculadora from './components/Calculadora'
import MisEmbarcos from './components/MisEmbarcos'
import PanelMaquinista from './components/PanelMaquinista'
import NetworkBanner from './components/NetworkBanner'
import Onboarding from './components/Onboarding'
import BannerVencimientos from './components/BannerVencimientos'
import Noticias from './components/Noticias'
import Cursos from './components/Cursos'
import Buzon from './components/Buzon'
import { useMensajes } from './hooks/useMensajes'
import { esAdmin } from './hooks/useAdmin'
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
  const [buzonAbierto, setBuzonAbierto] = useState(false)

  const uid = user?.uid || null
  const admin = esAdmin(user)
  const { mensajes, enviar: enviarMensaje, actualizarEstado: actualizarMensaje, nuevos: mensajesNuevos } = useMensajes(user)
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

  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (!loading && !cargandoPerfil) return
    const t = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(t)
  }, [loading, cargandoPerfil])

  if (loading || cargandoPerfil) {
    if (timedOut) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-navy-900">
          <p className="text-slate-400 text-sm">La conexión tardó demasiado.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold">
            Reintentar
          </button>
        </div>
      )
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900">
        <div className="text-slate-400 animate-pulse text-sm">Cargando...</div>
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
      <Navbar tab={tab} setTab={setTab} user={user} onCerrarSesion={cerrarSesion} perfil={perfil} alertasLibreta={contarAlertasLibreta()} onAbrirBuzon={() => setBuzonAbierto(true)} />

      {/* Panel sectores a bordo */}
      {sectorAbierto && (
        <PanelMaquinista uid={uid} seccion={sectorAbierto} onCerrar={() => setSectorAbierto(null)} />
      )}

      {/* Buzón de mensajes (formulario para usuarios, bandeja para admin) */}
      {buzonAbierto && (
        <Buzon user={user} esAdmin={admin} mensajes={mensajes} enviar={enviarMensaje}
          actualizarEstado={actualizarMensaje} onCerrar={() => setBuzonAbierto(false)} />
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
            esAdmin={admin}
            onAbrirNoticias={() => setTab('noticias')}
            onAbrirCursos={() => setTab('cursos')}
            onAbrirBuzon={() => setBuzonAbierto(true)}
            mensajesNuevos={mensajesNuevos}
          />
        )}
        {tab === 'noticias' && <Noticias esAdmin={admin} uid={uid} onVolver={() => setTab('dashboard')} />}
        {tab === 'cursos' && <Cursos esAdmin={admin} onVolver={() => setTab('dashboard')} />}
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
        {tab === 'liquidacion' && (
          <Calculadora
            uid={uid}
            viajes={viajes}
            libreta={libreta}
            perfil={perfil}
            esAdmin={user?.email === 'alangambacorta7@gmail.com'}
          />
        )}
        {tab === 'embarcos' && <MisEmbarcos uid={uid} viajes={viajes} libreta={libreta} perfil={perfil} />}
        {tab === 'admin' && <AdminPanel />}
      </main>
    </div>
  )
}
