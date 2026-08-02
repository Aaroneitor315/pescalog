import { useState } from 'react'
import { SECTORES, RANGOS, RUBROS_SUGERIDOS } from '../hooks/usePerfil'

export default function Onboarding({ onGuardar }) {
  const [paso, setPaso] = useState(1)
  const [sector, setSector] = useState(null)
  const [rango, setRango] = useState(null)
  const [rubro, setRubro] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function finalizar() {
    if (!sector || !rango) return
    setGuardando(true)
    await onGuardar({ sector, rango, rubro: rubro.trim() || 'Sin especificar' })
  }

  const s = sector ? SECTORES[sector] : null

  return (
    <div style={{
      minHeight: '100vh', background: '#080f1a',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            Bitácora<span style={{ color: '#06b6d4' }}>AR</span>
          </div>
          <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>Configurá tu perfil una sola vez</p>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 28, justifyContent: 'center' }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{
              height: 4, borderRadius: 2,
              width: n === paso ? 32 : 16,
              background: n <= paso ? '#06b6d4' : '#1e2d42',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        <div style={{
          background: '#0d1829', borderRadius: 20,
          border: '1px solid #1e2d42', padding: '24px 20px',
        }}>

          {paso === 1 && (
            <>
              <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, margin: '0 0 4px' }}>Paso 1 de 3</p>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 20px' }}>¿A qué sector pertenecés?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(SECTORES).map(([key, info]) => (
                  <button key={key} onClick={() => setSector(key)} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 14,
                    border: `2px solid ${sector === key ? info.border : '#1e2d42'}`,
                    background: sector === key ? info.bg : 'transparent',
                    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                  }}>
                    <span style={{ fontSize: 28 }}>{info.emoji}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: sector === key ? info.color : '#94a3b8' }}>{info.label}</div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                        {key === 'maquinas' ? 'Sala de máquinas' : key === 'cubierta' ? 'Aparejos y pesca' : 'Navegación e instrumental'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => { if (sector) { setRango(null); setPaso(2) } }} style={{
                marginTop: 20, width: '100%', padding: 13, borderRadius: 12,
                background: sector ? '#06b6d4' : '#1e2d42',
                color: sector ? '#0a1929' : '#334155',
                fontSize: 14, fontWeight: 800, border: 'none', cursor: sector ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}>
                Continuar →
              </button>
            </>
          )}

          {paso === 2 && sector && (
            <>
              <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, margin: '0 0 4px' }}>
                Paso 2 de 3 · {s.label}
              </p>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 20px' }}>¿Cuál es tu rango?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {RANGOS[sector].map(r => (
                  <button key={r} onClick={() => setRango(r)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 12,
                    border: `2px solid ${rango === r ? s.border : '#1e2d42'}`,
                    background: rango === r ? s.bg : '#080f1a',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: rango === r ? s.color : 'transparent',
                      border: `2px solid ${rango === r ? s.color : '#334155'}`,
                      transition: 'all 0.2s',
                    }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: rango === r ? s.color : '#94a3b8' }}>{r}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button onClick={() => setPaso(1)} style={{
                  padding: '12px 16px', borderRadius: 12, background: 'transparent',
                  border: '1px solid #1e2d42', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>← Volver</button>
                <button onClick={() => { if (rango) setPaso(3) }} style={{
                  flex: 1, padding: 12, borderRadius: 12,
                  background: rango ? '#06b6d4' : '#1e2d42',
                  color: rango ? '#0a1929' : '#334155',
                  fontSize: 14, fontWeight: 800, border: 'none', cursor: rango ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}>
                  Continuar →
                </button>
              </div>
            </>
          )}

          {paso === 3 && (
            <>
              <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, margin: '0 0 4px' }}>Paso 3 de 3 · Opcional</p>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>¿En qué rubro trabajás?</h2>
              <p style={{ fontSize: 12, color: '#475569', margin: '0 0 16px' }}>Podés escribirlo o elegir una sugerencia.</p>

              <input
                type="text"
                placeholder="Ej: Pesca de altura, remolque..."
                value={rubro}
                onChange={e => setRubro(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#080f1a', border: '1.5px solid #1e2d42',
                  borderRadius: 10, padding: '10px 12px',
                  color: '#e2e8f0', fontSize: 13, outline: 'none',
                  marginBottom: 12,
                }}
              />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                {RUBROS_SUGERIDOS.map(r => (
                  <button key={r} onClick={() => setRubro(r)} style={{
                    fontSize: 11, padding: '5px 12px', borderRadius: 8, fontWeight: 600,
                    border: `1px solid ${rubro === r ? '#06b6d440' : '#1e2d42'}`,
                    background: rubro === r ? '#0e749018' : '#080f1a',
                    color: rubro === r ? '#22d3ee' : '#64748b',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}>{r}</button>
                ))}
              </div>

              <div style={{ background: '#080f1a', borderRadius: 12, border: '1px solid #1e2d42', padding: '12px 14px', marginBottom: 20 }}>
                <p style={{ fontSize: 10, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Vista previa de tu perfil</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#0891b2,#06b6d4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800, color: '#0a1929', flexShrink: 0,
                  }}>
                    {s?.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{rango}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: s?.bg, color: s?.color, border: `1px solid ${s?.border}40` }}>{s?.label}</span>
                      {rubro && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: '#1e2d4230', color: '#64748b', border: '1px solid #1e2d42' }}>{rubro}</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPaso(2)} style={{
                  padding: '12px 16px', borderRadius: 12, background: 'transparent',
                  border: '1px solid #1e2d42', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>← Volver</button>
                <button onClick={finalizar} disabled={guardando} style={{
                  flex: 1, padding: 12, borderRadius: 12,
                  background: '#06b6d4', color: '#0a1929',
                  fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer',
                }}>
                  {guardando ? 'Guardando...' : 'Guardar perfil ✓'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
