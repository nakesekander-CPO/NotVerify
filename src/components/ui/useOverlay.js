import { useEffect, useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'

/* ── useOverlay ─────────────────────────────────────────────────
   Uniform overlay behavior for hand-rolled modals/drawers: focus trap,
   Escape-to-close, body scroll lock. Attach the returned ref to the
   overlay panel and spread `overlayProps` on it (role/aria). */
export function useOverlay(onClose, { label = 'Dialog', active = true } = {}) {
  const ref = useRef(null)
  useFocusTrap(ref, active)

  useEffect(() => {
    if (!active) return
    const esc = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', esc)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, active])

  return { ref, overlayProps: { role: 'dialog', 'aria-modal': true, 'aria-label': label } }
}
