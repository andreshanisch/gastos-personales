import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Junta clases de Tailwind y resuelve las que se pisan (la convención de shadcn) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
