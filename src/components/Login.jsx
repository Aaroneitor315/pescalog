import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { registrar, iniciarSesion, recuperarContrasena, error } = useAuth()
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPass, setVerPass] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [resetEnviado, setResetEnviado] = useState(false)

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

        <p className="text-center text-xs text-slate-600 mt-6">
          BitácoraAR · Registro de pesca de altura
        </p>
      </div>
    </div>
  )
}
