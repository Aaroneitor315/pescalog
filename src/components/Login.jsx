import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const TERMINOS_TEXTO = `TÉRMINOS Y CONDICIONES DE USO — BitácoraAR
Última actualización: julio de 2026

1. DESCRIPCIÓN DEL SERVICIO
BitácoraAR es una aplicación web progresiva (PWA) destinada al registro digital de viajes de pesca de altura para tripulantes argentinos. Permite registrar viajes, documentación personal, calcular singladuras, días embarcados y estimaciones de facturación por especie.

2. REGISTRO Y CUENTA DE USUARIO
Para utilizar BitácoraAR es necesario crear una cuenta con email y contraseña. El usuario es el único responsable de mantener la confidencialidad de sus credenciales. No está permitido compartir la cuenta con terceros ni crear cuentas en nombre de otras personas sin su consentimiento.

3. DATOS PERSONALES Y PRIVACIDAD
BitácoraAR almacena únicamente los datos que el usuario ingresa voluntariamente: dirección de email, datos de perfil (nombre, DNI, CUIL, N° de libreta de embarque), registros de viajes y documentación. Estos datos no son compartidos con terceros ni utilizados con fines comerciales. La infraestructura de almacenamiento es provista por Firebase (Google), sujeta a sus propias políticas de privacidad y seguridad. El usuario puede solicitar la eliminación de su cuenta y datos en cualquier momento contactándose al email indicado en el punto 8.

4. USO PERMITIDO
La app es de uso personal y exclusivo del tripulante registrado. Queda prohibido utilizar BitácoraAR con fines comerciales, revender el acceso, realizar ingeniería inversa sobre el código o intentar acceder a datos de otros usuarios.

5. LIMITACIÓN DE RESPONSABILIDAD
La información registrada en BitácoraAR es ingresada por el propio usuario y es de su exclusiva responsabilidad. Los cálculos de facturación, singladuras y días embarcados son estimativos y no reemplazan la documentación oficial emitida por empresas armadoras, la Prefectura Naval Argentina ni ningún organismo competente. BitácoraAR no se responsabiliza por errores derivados de datos incorrectamente ingresados.

6. DISPONIBILIDAD DEL SERVICIO
BitácoraAR se ofrece de forma gratuita en su versión actual. El servicio puede experimentar interrupciones por mantenimiento, actualizaciones o causas ajenas al control del desarrollador. No se garantiza disponibilidad continua del 100%.

7. PROPIEDAD INTELECTUAL
El nombre BitácoraAR, el logotipo, el diseño visual y el código fuente de la aplicación son propiedad de su desarrollador. Queda prohibida su reproducción total o parcial sin autorización expresa y por escrito.

8. CONTACTO
Para consultas, reclamos o solicitudes de eliminación de datos:
alangambacorta7@gmail.com`

export default function Login() {
  const { registrar, iniciarSesion, recuperarContrasena, error } = useAuth()
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPass, setVerPass] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [resetEnviado, setResetEnviado] = useState(false)
  const [verTerminos, setVerTerminos] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setCargando(true)
    if (modo === 'login') {
      await iniciarSesion(email, password)
    } else if (modo === 'registro') {
      await registrar(email, password)
    } else if (modo === 'recuperar') {
      const ok = await recuperarContrasena(email)
      if (ok) setResetEnviado(true)
    }
    setCargando(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-navy-900">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="BitácoraAR" className="h-28 w-auto mb-4" />
          <p className="text-slate-400 text-sm text-center">
            Registro de pesca de altura para tripulantes argentinos
          </p>
        </div>

        <div className="card">
          {modo === 'recuperar' ? (
            <>
              <button
                onClick={() => { setModo('login'); setResetEnviado(false) }}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4"
              >
                <ArrowLeft size={14} /> Volver
              </button>

              {resetEnviado ? (
                <div className="text-center py-4">
                  <div className="text-green-400 text-3xl mb-3">✓</div>
                  <p className="text-white font-medium mb-1">Email enviado</p>
                  <p className="text-slate-400 text-sm">
                    Revisá tu casilla <span className="text-cyan-400">{email}</span> y seguí el enlace para restablecer tu contraseña.
                  </p>
                  <button
                    onClick={() => { setModo('login'); setResetEnviado(false) }}
                    className="btn-primary mt-5 w-full"
                  >
                    Volver al inicio
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-white font-semibold mb-1">Recuperar contraseña</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Ingresá tu email y te enviamos un enlace para crear una nueva contraseña.
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label>Email</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="email"
                          className="pl-9"
                          placeholder="tu@email.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    {error && (
                      <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                        {error}
                      </p>
                    )}
                    <button type="submit" disabled={cargando} className="btn-primary w-full py-2.5">
                      {cargando ? <span className="animate-pulse">Enviando...</span> : 'Enviar enlace'}
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex mb-6 bg-navy-700 rounded-lg p-1">
                <button
                  onClick={() => setModo('login')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    modo === 'login' ? 'bg-navy-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Iniciar sesión
                </button>
                <button
                  onClick={() => setModo('registro')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    modo === 'registro' ? 'bg-navy-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Registrarse
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label>Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      className="pl-9"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label>Contraseña</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={verPass ? 'text' : 'password'}
                      className="pl-9 pr-10"
                      placeholder={modo === 'registro' ? 'Mínimo 6 caracteres' : '••••••••'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVerPass(!verPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {verPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={cargando}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
                >
                  {cargando ? (
                    <span className="animate-pulse">Cargando...</span>
                  ) : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
                </button>

                {modo === 'login' && (
                  <button
                    type="button"
                    onClick={() => setModo('recuperar')}
                    className="w-full text-center text-xs text-slate-500 hover:text-cyan-400 transition-colors pt-1"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </form>
            </>
          )}
        </div>

        <div className="mt-5 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <button onClick={() => setVerTerminos(true)}
              className="hover:text-cyan-400 transition-colors underline underline-offset-2">
              Términos y condiciones
            </button>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="text-green-500">✓</span> Registrada en NIC.ar
            </span>
          </div>
          <p className="text-center text-xs text-slate-700">
            BitácoraAR · Registro de pesca de altura
          </p>
        </div>
      </div>

      {verTerminos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setVerTerminos(false)}>
          <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
              <h3 className="text-white font-semibold">Términos y condiciones</h3>
              <button onClick={() => setVerTerminos(false)} className="btn-ghost p-1.5 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap flex-1">
              {TERMINOS_TEXTO}
            </div>
            <div className="px-6 py-4 border-t border-navy-700">
              <button onClick={() => setVerTerminos(false)} className="btn-primary w-full">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
