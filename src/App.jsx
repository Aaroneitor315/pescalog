import { useState } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import HistorialViajes from './components/HistorialViajes'
import FormularioViaje from './components/FormularioViaje'
import ConfigPrecios from './components/ConfigPrecios'
import { useViajes } from './hooks/useViajes'
import { usePrecios } from './hooks/usePrecios'

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const { viajes, agregarViaje, eliminarViaje } = useViajes()
  const { config, setPrecioEspecie, setTipoCambio, calcularTotalViaje } = usePrecios()

  function handleGuardar(datos) {
    agregarViaje(datos)
    setTab('historial')
  }

  return (
    <div className="min-h-screen">
      <Navbar tab={tab} setTab={setTab} />
      <main className="max-w-6xl mx-auto px-4 py-8">
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
      </main>
    </div>
  )
}
