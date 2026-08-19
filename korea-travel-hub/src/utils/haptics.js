// Utilidad mínima para feedback háptico (vibración) en móviles
// Uso: import { vibrate } from '../utils/haptics'
export function vibrate(pattern = 20) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      // pattern: number or array, keep it short for subtle feedback
      navigator.vibrate(pattern)
    }
  } catch (err) {
    // Silencioso: no bloquear si no está disponible
    // console.debug('vibrate not supported', err)
  }
}

