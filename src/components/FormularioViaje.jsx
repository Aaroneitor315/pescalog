import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { calcularSingladuras } from '../hooks/useViajes'

const ESPECIES_COMUNES = ['merluza', 'calamar', 'langostino', 'centolla', 'polaca', 'abadejo']

const CAMPOS_INICIALES = {
  fechaSalida: '',
  fechaRegreso: '',
  fechaEmbarco: '',
  fechaDesembarco: '',
  barco: '',
  puertoPartida: '',
  puertoLlegada: '',
  especie: 'merluza',
  especieOtra: '',
  cajones: '',
  observaciones: '',
}

export default function FormularioViaje({ onGuardar, onCancelar }) {
  const [form, setForm] = useState(CAMPOS_INICIALES)
  const [errores, setErrores] = useState({})

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: '' }))
  }

  function validar() {
    const e = {}
    if (!form.fechaSalida) e.fechaSalida = 'Requerido'
    if (!form.fechaRegreso) e.fechaRegreso = 'Requerido'
    if (form.fechaSalida && form.fechaRegreso && form.fechaRegreso < form.fechaSalida)
      e.fechaRegreso = 'Debe ser posterior a la salida'
    if (!form.fechaEmbarco) e.fechaEmbarco = 'Requerido'
    if (form.fechaDesembarco && form.fechaEmbarco && form.fechaDesembarco < form.fechaEmbarco)
      e.fechaDesembarco = 'Debe ser posterior al embarco'
    if (!form.barco.trim()) e.barco = 'Requerido'
    if (!form.puertoPartida.trim()) e.puertoPartida = 'Requerido'
    if (!form.puertoLlegada.trim()) e.puertoLlegada = 'Requerido'
    if (form.especie === 'otra' && !form.especieOtra.trim()) e.especieOtra = 'Indicá la especie'
    if (!form.cajones || Number(form.cajones) <= 0) e.cajones = 'Ingresá un número válido'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const e2 = validar()
    if (Object.keys(e2).length) { setErrores(e2); return }

    onGuardar({
      fechaSalida: form.fechaSalida,
      fechaRegreso: form.fechaRegreso,
      fechaEmbarco: form.fechaEmbarco,
      fechaDesembarco: form.fechaDesembarco,
      barco: form.barco.trim(),
      puertoPartida: form.puertoPartida.trim(),
      puertoLlegada: form.puertoLlegada.trim(),
      especie: form.especie === 'otra' ? form.especieOtra.trim().toLowerCase() : form.especie,
      cajones: Number(form.cajones),
      observaciones: form.observaciones.trim(),
    })
    setForm(CAMPOS_INICIALES)
  }

  const singladuras = calcularSingladuras(form.fechaSalida, form.fechaRegreso)
  const err = (campo) => `w-full ${errores[campo] ? 'border-red-500 focus:ring-red-500' : ''}`

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

          {/* Sección: Fechas del barco */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Fechas del barco
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label>Fecha de salida</label>
                <input type="date" className={err('fechaSalida')} value={form.fechaSalida}
                  onChange={e => set('fechaSalida', e.target.value)} />
                {errores.fechaSalida && <p className="text-red-400 text-xs mt-1">{errores.fechaSalida}</p>}
              </div>
              <div>
                <label>Fecha de regreso</label>
                <input type="date" className={err('fechaRegreso')} value={form.fechaRegreso}
                  min={form.fechaSalida} onChange={e => set('fechaRegreso', e.target.value)} />
                {errores.fechaRegreso && <p className="text-red-400 text-xs mt-1">{errores.fechaRegreso}</p>}
              </div>
            </div>
            {singladuras > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold px-3 py-1 rounded-full">
                  {singladuras} singladuras
                </span>
              </div>
            )}
          </div>

          {/* Sección: Fechas de libreta */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Registro en agencia marítima
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label>Fecha de embarco</label>
                <input type="date" className={err('fechaEmbarco')} value={form.fechaEmbarco}
                  onChange={e => set('fechaEmbarco', e.target.value)} />
                {errores.fechaEmbarco && <p className="text-red-400 text-xs mt-1">{errores.fechaEmbarco}</p>}
              </div>
              <div>
                <label>Fecha de desembarco <span className="text-slate-500 font-normal">(opcional)</span></label>
                <input type="date" className={err('fechaDesembarco')} value={form.fechaDesembarco}
                  min={form.fechaEmbarco} onChange={e => set('fechaDesembarco', e.target.value)} />
                {errores.fechaDesembarco && <p className="text-red-400 text-xs mt-1">{errores.fechaDesembarco}</p>}
              </div>
            </div>
          </div>

          {/* Barco */}
          <div>
            <label>Nombre del barco</label>
            <input type="text" className={err('barco')} placeholder="Ej: Don Hector"
              value={form.barco} onChange={e => set('barco', e.target.value)} />
            {errores.barco && <p className="text-red-400 text-xs mt-1">{errores.barco}</p>}
          </div>

          {/* Puertos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label>Puerto de partida</label>
              <input type="text" className={err('puertoPartida')} placeholder="Ej: Mar del Plata"
                value={form.puertoPartida} onChange={e => set('puertoPartida', e.target.value)} />
              {errores.puertoPartida && <p className="text-red-400 text-xs mt-1">{errores.puertoPartida}</p>}
            </div>
            <div>
              <label>Puerto de llegada</label>
              <input type="text" className={err('puertoLlegada')} placeholder="Ej: Mar del Plata"
                value={form.puertoLlegada} onChange={e => set('puertoLlegada', e.target.value)} />
              {errores.puertoLlegada && <p className="text-red-400 text-xs mt-1">{errores.puertoLlegada}</p>}
            </div>
          </div>

          {/* Especie + cajones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label>Especie</label>
              <select className={err('especie')} value={form.especie}
                onChange={e => set('especie', e.target.value)}>
                {ESPECIES_COMUNES.map(esp => (
                  <option key={esp} value={esp}>{esp.charAt(0).toUpperCase() + esp.slice(1)}</option>
                ))}
                <option value="otra">Otra...</option>
              </select>
            </div>
            <div>
              <label>Cajones</label>
              <input type="number" min="1" className={err('cajones')} placeholder="Cantidad de cajones"
                value={form.cajones} onChange={e => set('cajones', e.target.value)} />
              {errores.cajones && <p className="text-red-400 text-xs mt-1">{errores.cajones}</p>}
            </div>
          </div>

          {form.especie === 'otra' && (
            <div>
              <label>Indicá la especie</label>
              <input type="text" className={err('especieOtra')} placeholder="Ej: merluza austral, salmón..."
                value={form.especieOtra} onChange={e => set('especieOtra', e.target.value)} />
              {errores.especieOtra && <p className="text-red-400 text-xs mt-1">{errores.especieOtra}</p>}
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label>Observaciones <span className="text-slate-500 font-normal">(opcional)</span></label>
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
