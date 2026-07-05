import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { calcularSingladuras } from '../hooks/useViajes'
import { ESPECIES_LISTA } from '../hooks/usePrecios'

const CAMPOS_INICIALES = {
  fechaSalida: '',
  fechaRegreso: '',
  fechaEmbarco: '',
  fechaDesembarco: '',
  barco: '',
  puertoPartida: '',
  puertoLlegada: '',
  especie: 'langostino',
  especieOtra: '',
  cajones: '',
  observaciones: '',
}

export default function FormularioViaje({ onGuardar, onCancelar }) {
  const [form, setForm] = useState(CAMPOS_INICIALES)

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onGuardar({
      fechaSalida: form.fechaSalida,
      fechaRegreso: form.fechaRegreso,
      fechaEmbarco: form.fechaEmbarco,
      fechaDesembarco: form.fechaDesembarco,
      barco: form.barco.trim(),
      puertoPartida: form.puertoPartida.trim(),
      puertoLlegada: form.puertoLlegada.trim(),
      especie: form.especie === 'otra' ? form.especieOtra.trim().toLowerCase() : form.especie,
      cajones: Number(form.cajones) || 0,
      observaciones: form.observaciones.trim(),
    })
    setForm(CAMPOS_INICIALES)
  }

  const singladuras = calcularSingladuras(form.fechaSalida, form.fechaRegreso)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Nuevo viaje de pesca</h2>
          {onCancelar && (
            <button onClick={onCancelar} className="btn-ghost p-2 rounded-lg">
              <X size={18} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Fechas del barco */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Fechas del barco
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label>Fecha de salida</label>
                <input type="date" value={form.fechaSalida}
                  onChange={e => set('fechaSalida', e.target.value)} />
              </div>
              <div>
                <label>Fecha de regreso</label>
                <input type="date" value={form.fechaRegreso}
                  min={form.fechaSalida} onChange={e => set('fechaRegreso', e.target.value)} />
              </div>
            </div>
            {singladuras > 0 && (
              <div className="mt-2">
                <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold px-3 py-1 rounded-full">
                  {singladuras} singladuras
                </span>
              </div>
            )}
          </div>

          {/* Fechas de libreta */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Registro en agencia marítima
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label>Fecha de embarco</label>
                <input type="date" value={form.fechaEmbarco}
                  onChange={e => set('fechaEmbarco', e.target.value)} />
              </div>
              <div>
                <label>Fecha de desembarco</label>
                <input type="date" value={form.fechaDesembarco}
                  min={form.fechaEmbarco} onChange={e => set('fechaDesembarco', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Barco */}
          <div>
            <label>Nombre del barco</label>
            <input type="text" placeholder="Ej: Don Hector"
              value={form.barco} onChange={e => set('barco', e.target.value)} />
          </div>

          {/* Puertos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label>Puerto de partida</label>
              <input type="text" placeholder="Ej: Mar del Plata"
                value={form.puertoPartida} onChange={e => set('puertoPartida', e.target.value)} />
            </div>
            <div>
              <label>Puerto de llegada</label>
              <input type="text" placeholder="Ej: Mar del Plata"
                value={form.puertoLlegada} onChange={e => set('puertoLlegada', e.target.value)} />
            </div>
          </div>

          {/* Especie + cajones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label>Especie</label>
              <select value={form.especie} onChange={e => set('especie', e.target.value)}>
                {ESPECIES_LISTA.map(esp => (
                  <option key={esp} value={esp}>{esp.charAt(0).toUpperCase() + esp.slice(1)}</option>
                ))}
                <option value="otra">Otra...</option>
              </select>
            </div>
            <div>
              <label>Cajones</label>
              <input type="number" min="0" placeholder="Cantidad de cajones"
                value={form.cajones} onChange={e => set('cajones', e.target.value)} />
            </div>
          </div>

          {form.especie === 'otra' && (
            <div>
              <label>Indicá la especie</label>
              <input type="text" placeholder="Ej: merluza austral, salmón..."
                value={form.especieOtra} onChange={e => set('especieOtra', e.target.value)} />
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label>Observaciones</label>
            <textarea rows={3} className="w-full resize-none"
              placeholder="Condiciones del mar, novedades, etc."
              value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Save size={16} /> Guardar viaje
            </button>
            {onCancelar && (
              <button type="button" onClick={onCancelar} className="btn-ghost">Cancelar</button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
