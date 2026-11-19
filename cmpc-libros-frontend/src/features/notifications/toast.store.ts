import { create } from 'zustand'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, tone?: ToastTone) => number
  dismiss: (id: number) => void
}

export const TOAST_DURATION_MS = 5000
let nextId = 1

/** Notificaciones breves de resultado (guardado, eliminado, exportado, errores). */
export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  push(message, tone = 'info') {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, tone, message }].slice(-4) }))
    setTimeout(() => get().dismiss(id), TOAST_DURATION_MS)
    return id
  },

  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

/** Atajo para usar fuera de componentes. */
export const notify = {
  success: (message: string) => useToastStore.getState().push(message, 'success'),
  error: (message: string) => useToastStore.getState().push(message, 'error'),
  info: (message: string) => useToastStore.getState().push(message, 'info'),
}
