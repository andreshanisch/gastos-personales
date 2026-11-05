import type { KeyboardEvent } from 'react'

const PASOS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/**
 * Flechas, Inicio y Fin dentro de un grupo de opciones (`role="radiogroup"` con botones `role="radio"`),
 * como en un grupo de radios nativo: mueve el foco y elige la opción. Va en el `onKeyDown` del grupo;
 * cada opción lleva `tabIndex={elegida ? 0 : -1}` para que Tab entre y salga del grupo en un solo paso.
 */
export function alTeclaEnGrupo(e: KeyboardEvent<HTMLElement>) {
  const opciones = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not(:disabled)'))
  const actual = opciones.indexOf(document.activeElement as HTMLElement)
  if (actual < 0 || opciones.length < 2) return

  let destino: number
  if (e.key in PASOS) destino = (actual + PASOS[e.key] + opciones.length) % opciones.length
  else if (e.key === 'Home') destino = 0
  else if (e.key === 'End') destino = opciones.length - 1
  else return

  e.preventDefault()
  opciones[destino].focus()
  opciones[destino].click()
}
