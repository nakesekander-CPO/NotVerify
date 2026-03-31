import { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import useFocusTrap from '../hooks/useFocusTrap'

const widths = {
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export default function Drawer({ isOpen, onClose, title, width = 'md', children }) {
  const ref = useRef(null)
  useFocusTrap(ref, isOpen)

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)

    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            className={`absolute top-0 right-0 h-full ${widths[width]} w-full bg-white border-l border-black/[0.12]  flex flex-col`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.12] shrink-0">
              <h2 id="drawer-title" className="text-[16px] font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/[0.06] transition-colors cursor-pointer"
                aria-label="Close panel"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
