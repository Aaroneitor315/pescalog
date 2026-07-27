import { useState, useEffect } from 'react'
import { Save, X, ChevronDown, ChevronUp, Anchor } from 'lucide-react'
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

function getBarcosRecientes() {
  try { return JSON.parse(localStorage.getItem('barcosRecientes') || '[]') } catch { return [] }
}

function guardarBarcoReciente(barco) {
  if (!barco?.trim()) return
  const lista = getBarcosRecientes().filter(b => b.toLowerCase() !== barco.toLowerCase())
  localStorage.setItem('barcosRecientes', JSON.stringify([barco.trim(), ...lista].slice(0, 5)))
}

// Busca la fecha de embarco más reciente para un barco en el historial de viajes
function buscarEmbarcoAnterior(viajes, barco) {
  if (!barco || !viajes?.length) return ''
  const viajesBarco = viajes
    .filter(v => v.barco?.toLowerCase() === barco.toLowerCase() && v.fechaEmbarco)
    .sort((a, b) => (b.fechaSalida || '').localeCompare(a.fechaSalida || ''))
  return viajesBarco[0]?.fechaEmbarco || ''
}

export default function FormularioViaje({ onGuardar, onCancelar, viajeInicial, viajes = [] }) {
  const [form, setForm] = useState(() => {
    if (!viajeInicial) return CAMPOS_INICIALES
    const esOtra = !ESPECIES_LISTA.includes(viajeInicial.especie)
    return {
      ...CAMPOS_INICIALES,
      ...viajeInicial,
      especie: esOtra ? 'otra' : viajeInicial.especie,
      especieOtra: esOtra ? viajeInicial.especie : '',
      cajones: String(viajeInicial.cajones || ''),
    }
  })

  const [ultimoViaje, setUltimoViaje] = useState(false)
  const [detallesAbiertos, setDetallesAbiertos] = useState(false)
  const [barcoCustom, setBarcoCustom] = useState(false)
  const [barcosRecientes, setBarcosRecientes] = useState(getBarcosRecientes)
  const [embarcoAutofill, setEmbarcoAutofill] = useState('')

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  function seleccionarBarco(nombre) {
    setForm(prev => ({ ...prev, barco: nombre }))
    setBarcoCustom(false)
    const embarco = buscarEmbarcoAnterior(viajes, nombre)
    setEmbarcoAutofill(embarco)
    setForm(prev => ({ ...prev, barco: nombre, fechaEmbarco: embarco, fechaDesembarco: '' }))
    setUltimoViaje(false)
  }

  function handleBarcoInput(nombre) {
    setForm(prev => ({ ...prev, barco: nombre }))
    if (nombre.length > 1) {
      const embarco = buscarEmbarcoAnterior(viajes, nombre)
      setEmbarcoAutofill(embarco)
      if (embarco) setForm(prev => ({ ...prev, barco: nombre, fechaEmbarco: embarco }))
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    guardarBarcoReciente(form.barco)
    setBarcosRecientes(getBarcosRecientes())
    onGuardar({
      fechaSalida: form.fechaSalida,
      fechaRegreso: form.fechaRegreso,
      fechaEmbarco: form.fechaEmbarco,
      fechaDesembarco: ultimoViaje ? form.fechaDesembarco : '',
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
  const titulo = viajeInicial ? 'Editar viaje' : 'Nuevo viaje'
  const esEdicion = !!viajeInicial

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">{titulo}</h2>
          {onCancelar && (
            <button onClick={onCancelar} className="btn-ghost p-2 rounded-lg"><X size={18} /></button>
          )}
        </div>

        <form onSubmit={handleSubmit}>

          {/* ============ MOBILE ============ */}
          <div className="sm:hidden space-y-5">

            {/* Barco */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Barco</h3>
              {barcosRecientes.length > 0 && !barcoCustom ? (
                <div className="flex flex-wrap gap-2 mb-2">
                  {barcosRecientes.map(b => (
                    <button key={b} type="button" onClick={() => seleccionarBarco(b)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                        form.barco === b
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                          : 'border-navy-600 text-slate-400 bg-navy-700/40'
                      }`}>
                      {b}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => { setBarcoCustom(true); setForm(p => ({ ...p, barco: '' })) }}
                    className="px-4 py-2 rounded-full text-sm font-semibold border border-dashed border-navy-600 text-slate-500">
                    + Otro
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="text" placeholder="Nombre del barco" autoFocus
                    value={form.barco} onChange={e => handleBarcoInput(e.target.value)} className="flex-1" />
                  {barcosRecientes.length > 0 && (
                    <button type="button" onClick={() => setBarcoCustom(false)} className="btn-ghost text-xs px-3">
                      Recientes
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Fechas del viaje */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Fechas del viaje</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>Salida</label>
                  <input type="date" value={form.fechaSalida} onChange={e => set('fechaSalida', e.target.value)} />
                </div>
                <div>
                  <label>Regreso</label>
                  <input type="date" value={form.fechaRegreso} min={form.fechaSalida} onChange={e => set('fechaRegreso', e.target.value)} />
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

            {/* Cajones */}
            <div>
              <label>Cajones</label>
              <input type="number" min="0" placeholder="0"
                value={form.cajones} onChange={e => set('cajones', e.target.value)}
                style={{ fontSize: '1.4rem', fontWeight: 800 }} />
            </div>

            {/* Especie */}
            <div>
              <label>Especie</label>
              <select value={form.especie} onChange={e => set('especie', e.target.value)}>
                {ESPECIES_LISTA.map(esp => (
                  <option key={esp} value={esp}>{esp.charAt(0).toUpperCase() + esp.slice(1)}</option>
                ))}
                <option value="otra">Otra...</option>
              </select>
            </div>
            {form.especie === 'otra' && (
              <div>
                <label>Indicá la especie</label>
                <input type="text" placeholder="Ej: merluza austral..."
                  value={form.especieOtra} onChange={e => set('especieOtra', e.target.value)} />
              </div>
            )}

            {/* Período en el barco */}
            <PeriodSection
              form={form} set={set}
              ultimoViaje={ultimoViaje} setUltimoViaje={setUltimoViaje}
              embarcoAutofill={embarcoAutofill}
              esEdicion={esEdicion}
            />

            {/* Detalles adicionales colapsables */}
            <div>
              <button type="button" onClick={() => setDetallesAbiertos(v => !v)}
                className="w-full flex items-center justify-between py-2 border-t border-navy-700 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                <span>Puertos y observaciones</span>
                {detallesAbiertos ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {detallesAbiertos && (
                <div className="space-y-4 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label>Puerto de partida</label>
                      <input type="text" placeholder="Mar del Plata" value={form.puertoPartida} onChange={e => set('puertoPartida', e.target.value)} />
                    </div>
                    <div>
                      <label>Puerto de llegada</label>
                      <input type="text" placeholder="Mar del Plata" value={form.puertoLlegada} onChange={e => set('puertoLlegada', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label>Observaciones</label>
                    <textarea rows={2} className="w-full resize-none"
                      placeholder="Condiciones del mar, novedades..."
                      value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Save size={16} /> {viajeInicial ? 'Guardar cambios' : 'Guardar viaje'}
              </button>
              {onCancelar && <button type="button" onClick={onCancelar} className="btn-ghost">Cancelar</button>}
            </div>
          </div>

          {/* ============ DESKTOP ============ */}
          <div className="hidden sm:block space-y-5">

            {/* Barco */}
            <div>
              <label>Nombre del barco</label>
              <input type="text" list="barcos-lista" placeholder="Ej: Don Hector"
                value={form.barco} onChange={e => handleBarcoInput(e.target.value)} />
              <datalist id="barcos-lista">
                {barcosRecientes.map(b => <option key={b} value={b} />)}
              </datalist>
              {barcosRecientes.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {barcosRecientes.map(b => (
                    <button key={b} type="button" onClick={() => seleccionarBarco(b)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        form.barco === b
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                          : 'border-navy-600 text-slate-500 hover:text-slate-300'
                      }`}>
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fechas del viaje */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Fechas del viaje</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Fecha de salida</label>
                  <input type="date" value={form.fechaSalida} onChange={e => set('fechaSalida', e.target.value)} />
                </div>
                <div>
                  <label>Fecha de regreso</label>
                  <input type="date" value={form.fechaRegreso} min={form.fechaSalida} onChange={e => set('fechaRegreso', e.target.value)} />
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

            {/* Especie + cajones */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Período en el barco */}
            <PeriodSection
              form={form} set={set}
              ultimoViaje={ultimoViaje} setUltimoViaje={setUltimoViaje}
              embarcoAutofill={embarcoAutofill}
              esEdicion={esEdicion}
            />

            {/* Puertos */}
            <div className="grid grid-cols-2 gap-4">
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

            <div>
              <label>Observaciones</label>
              <textarea rows={3} className="w-full resize-none"
                placeholder="Condiciones del mar, novedades, etc."
                value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Save size={16} /> {viajeInicial ? 'Guardar cambios' : 'Guardar viaje'}
              </button>
              {onCancelar && <button type="button" onClick={onCancelar} className="btn-ghost">Cancelar</button>}
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}

// ─── Sección "Período en el barco" — reutilizada en mobile y desktop ────────
function PeriodSection({ form, set, ultimoViaje, setUltimoViaje, embarcoAutofill, esEdicion }) {
  const tieneBarco = !!form.barco.trim()

  return (
    <div className="bg-navy-800/60 border border-navy-600 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-navy-700">
        <Anchor size={15} className="text-cyan-500/70" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-300">Período en el barco</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de embarco/desembarco — independiente de los viajes
          </p>
        </div>
        {embarcoAutofill && (
          <span className="text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-1 rounded-md">
            autocompletado
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Fecha embarco */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="!mb-0">Fecha de embarco</label>
            {embarcoAutofill && !esEdicion && (
              <span className="text-xs text-slate-500">Del viaje anterior en este barco</span>
            )}
          </div>
          <input type="date" value={form.fechaEmbarco}
            onChange={e => set('fechaEmbarco', e.target.value)}
            placeholder="Cuándo subiste al barco" />
          {!tieneBarco && (
            <p className="text-xs text-slate-600 mt-1">Seleccioná un barco para autocompletar</p>
          )}
        </div>

        {/* Toggle último viaje */}
        <div className="flex items-start gap-3 bg-navy-700/40 rounded-lg p-3">
          <button type="button" onClick={() => setUltimoViaje(v => !v)}
            className="relative flex-shrink-0 mt-0.5"
            style={{
              width: 34, height: 18, borderRadius: 9,
              background: ultimoViaje ? '#06b6d4' : '#1a3050',
              transition: 'background .2s',
            }}>
            <span style={{
              position: 'absolute', width: 14, height: 14,
              borderRadius: '50%', background: '#04111f',
              top: 2, transition: 'left .2s',
              left: ultimoViaje ? 18 : 2,
            }} />
          </button>
          <div>
            <p className="text-xs font-semibold text-slate-300">Este es mi último viaje en este barco</p>
            <p className="text-xs text-slate-500 mt-0.5">Activá esto para registrar la fecha de desembarco</p>
          </div>
        </div>

        {/* Fecha desembarco — solo visible si toggle on */}
        {ultimoViaje && (
          <div>
            <label>Fecha de desembarco</label>
            <input type="date" value={form.fechaDesembarco}
              min={form.fechaEmbarco}
              onChange={e => set('fechaDesembarco', e.target.value)} />
          </div>
        )}
      </div>
    </div>
  )
}
