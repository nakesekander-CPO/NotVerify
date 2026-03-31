import { useState, useEffect, useRef } from 'react'
import { Settings2, ChevronDown, Zap, Brain, AlertTriangle, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'nv-propagation-settings'

const defaults = {
  propagateExact: true,
  allowHighConfidence: true,
  highConfidenceThreshold: 95,
  overwriteVerified: false,
}

function load() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) } }
  catch { return { ...defaults } }
}

export function usePropagationSettings() {
  const [settings, setSettings] = useState(load)

  function update(patch) {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return [settings, update]
}

export default function PropagationSettings({ settings, onUpdate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-black/[0.12] text-[11px] font-semibold text-gray-600 hover:bg-black/[0.04] transition-colors"
        aria-label="Propagation settings"
        aria-expanded={open}
      >
        <Settings2 className="w-3.5 h-3.5" />
        Propagation
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 z-50 w-80 bg-white rounded-lg border border-black/[0.12] overflow-hidden"
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
          >
            <div className="px-4 py-3 border-b border-black/[0.06]">
              <p className="text-xs font-semibold text-gray-900">Intelligent Propagation</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Control how verifications spread across the corpus</p>
            </div>

            <div className="p-3 space-y-3">
              {/* Toggle 1: Exact match propagation */}
              <ToggleRow
                icon={<Zap className="w-3.5 h-3.5 text-emerald-500" />}
                label="Propagate 100% Matches"
                description="Instantly apply verified text to identical source segments"
                checked={settings.propagateExact}
                onChange={v => onUpdate({ propagateExact: v })}
              />

              {/* Toggle 2: High-confidence AI */}
              <ToggleRow
                icon={<Brain className="w-3.5 h-3.5 text-purple-500" />}
                label="High-Confidence AI Updates"
                description="Auto-apply AI suggestions above confidence threshold"
                checked={settings.allowHighConfidence}
                onChange={v => onUpdate({ allowHighConfidence: v })}
              />

              {/* Threshold slider */}
              {settings.allowHighConfidence && (
                <div className="pl-7 pr-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">Confidence Threshold</span>
                    <span className="text-[10px] font-mono font-semibold text-purple-600">{settings.highConfidenceThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={99}
                    value={settings.highConfidenceThreshold}
                    onChange={e => onUpdate({ highConfidenceThreshold: Number(e.target.value) })}
                    className="w-full h-1 accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                    <span>80%</span>
                    <span>99%</span>
                  </div>
                </div>
              )}

              {/* Toggle 3: Overwrite verified */}
              <ToggleRow
                icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                label="Overwrite Verified Segments"
                description="Allow propagation to replace human-verified text"
                checked={settings.overwriteVerified}
                onChange={v => onUpdate({ overwriteVerified: v })}
                warning
              />
            </div>

            <div className="px-4 py-2.5 border-t border-black/[0.06] bg-gray-50/50">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-gray-400" />
                <p className="text-[10px] text-gray-400">
                  Segments below threshold always require manual review
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ToggleRow({ icon, label, description, checked, onChange, warning }) {
  return (
    <label className={`flex items-start gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-colors ${warning && checked ? 'bg-amber-50/50' : 'hover:bg-black/[0.02]'}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-gray-800">{label}</span>
        <p className="text-[10px] text-gray-400 leading-relaxed mt-0.5">{description}</p>
        {warning && checked && (
          <p className="text-[10px] text-amber-600 font-medium mt-0.5">⚠ High Risk — use with caution</p>
        )}
      </div>
      <div className="mt-0.5 shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative w-8 h-[18px] rounded-full transition-colors ${checked ? (warning ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-gray-200'}`}
        >
          <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${checked ? 'left-[16px]' : 'left-[2px]'}`} />
        </button>
      </div>
    </label>
  )
}
