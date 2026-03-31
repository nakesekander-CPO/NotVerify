import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X, Brain } from 'lucide-react'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const styles = {
  success: 'border-emerald-500/30 bg-emerald-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-straker-500/30 bg-straker-500/10',
}

const textColors = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  info: 'text-straker-400',
}

let toastId = 0

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[80] flex flex-col gap-2 w-[380px]"
        aria-live="polite"
        aria-label="Notifications"
      >
        <AnimatePresence>
          {toasts.map(toast => {
            const Icon = icons[toast.type] || Info
            return (
              <motion.div
                key={toast.id}
                role={toast.type === 'error' ? 'alert' : 'status'}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`flex items-start gap-3 px-4 py-3 rounded-lg border bg-white ${styles[toast.type]} shadow-lg`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${textColors[toast.type]}`} />
                {toast.type === 'success' && (
                  <Brain className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400/60" />
                )}
                <p className="flex-1 text-[13px] text-gray-800">{toast.message}</p>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="w-5 h-5 flex items-center justify-center shrink-0 hover:bg-black/[0.06] rounded cursor-pointer"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
