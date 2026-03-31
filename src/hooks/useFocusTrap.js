import { useEffect } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function useFocusTrap(ref, isActive) {
  useEffect(() => {
    if (!isActive || !ref.current) return

    const el = ref.current
    const previouslyFocused = document.activeElement

    const focusableEls = () => [...el.querySelectorAll(FOCUSABLE)]
    const firstFocusable = () => focusableEls()[0]
    const lastFocusable = () => { const els = focusableEls(); return els[els.length - 1] }

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return
      const els = focusableEls()
      if (els.length === 0) { e.preventDefault(); return }

      if (e.shiftKey) {
        if (document.activeElement === els[0]) {
          e.preventDefault()
          els[els.length - 1].focus()
        }
      } else {
        if (document.activeElement === els[els.length - 1]) {
          e.preventDefault()
          els[0].focus()
        }
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    requestAnimationFrame(() => {
      const first = firstFocusable()
      if (first) first.focus()
    })

    return () => {
      el.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus()
      }
    }
  }, [ref, isActive])
}
