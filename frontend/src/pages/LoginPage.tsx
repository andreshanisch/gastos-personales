import { useState, type FormEvent } from 'react'
import { login } from '../api'

export function LoginPage({ alIngresar }: { alIngresar: () => void }) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function ingresar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      await login(usuario, password)
      alIngresar()
    } catch (err) {
      setError((err as Error).message)
      setEnviando(false)
    }
  }

  return (
    <main className="login">
      <div className="login__marca">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="56" height="56" />
        <h1>Mis gastos</h1>
      </div>
      <form className="login__form" onSubmit={ingresar}>
        <label className="campo">
          <span className="campo__etiqueta">Usuario</span>
          <input
            autoComplete="username"
            autoCapitalize="none"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />
        </label>
        <label className="campo">
          <span className="campo__etiqueta">Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="boton boton--primario boton--ancho" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}
