import { useState } from 'react'
import Drawer from './Drawer'
import { useToast } from './ToastProvider'

export default function ParametersDrawer({
  isOpen,
  onClose,
  /** Current quality threshold value (0–100). Defaults to 85 if not provided. */
  qualityThreshold = 85,
  /** Called with the new threshold value when user applies changes. */
  onThresholdChange,
}) {
  const { addToast } = useToast()
  const [threshold, setThreshold] = useState(qualityThreshold)

  const handleApply = () => {
    onThresholdChange?.(threshold)
    addToast('Parameters updated successfully', 'success')
    onClose()
  }

  // Threshold label
  const thresholdLabel =
    threshold >= 98 ? 'Manual only' :
    threshold >= 95 ? 'High confidence' :
    threshold >= 85 ? 'Standard' :
    threshold >= 75 ? 'Permissive' :
    'Draft'

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Adjust Parameters" width="md">
      <div className="space-y-6">
        {/* Quality Threshold */}
        <FieldGroup label="Quality Threshold" description="Documents scoring at or above this threshold auto-publish and bypass human review.">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-gray-500">Threshold</span>
            <span className="text-[15px] font-bold text-gray-900 tabular-nums">
              {threshold}% <span className="text-[11px] font-normal text-gray-400">({thresholdLabel})</span>
            </span>
          </div>
          <input
            type="range"
            min="60"
            max="100"
            step="1"
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-full accent-straker-500 cursor-pointer"
            aria-label="Quality threshold"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>60 (Draft)</span>
            <span>85 (Standard)</span>
            <span>100 (Perfect)</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Scores below {threshold}% route to human review. Scores ≥{threshold}% are auto-published.
          </p>
        </FieldGroup>

        {/* Processing Priority */}
        <FieldGroup label="Processing Priority" description="Higher priority reduces processing time">
          <div className="space-y-2" role="radiogroup" aria-label="Processing priority">
            <RadioOption name="priority" value="standard" label="Standard" desc="Regular processing queue" defaultChecked />
            <RadioOption name="priority" value="priority" label="Priority" desc="2x faster turnaround" />
            <RadioOption name="priority" value="rush" label="Rush" desc="Immediate processing" />
          </div>
        </FieldGroup>

        {/* Output Format */}
        <FieldGroup label="Output Formats" description="Select desired output file formats">
          <div className="space-y-2">
            <CheckboxOption label="Original format (PDF)" defaultChecked />
            <CheckboxOption label="XLIFF (Agent Memory)" />
            <CheckboxOption label="TMX (Exchange format)" />
            <CheckboxOption label="Bilingual review document" />
          </div>
        </FieldGroup>

        {/* Apply */}
        <div className="pt-4 border-t border-black/[0.12]">
          <button
            onClick={handleApply}
            className="w-full px-4 py-3 rounded-lg bg-amber hover:bg-amber-deep text-white font-semibold text-[13px] transition-all cursor-pointer"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </Drawer>
  )
}

function FieldGroup({ label, description, children }) {
  return (
    <fieldset className="border-0 p-0 m-0">
      <legend className="text-[12px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</legend>
      {description && <p className="text-[12px] text-gray-500 mb-3">{description}</p>}
      {children}
    </fieldset>
  )
}

function RadioOption({ name, value, label, desc, defaultChecked }) {
  const id = `${name}-${value}`
  return (
    <label htmlFor={id} className="flex items-start gap-3 p-3 bg-gray-100 rounded-lg border border-black/[0.06] cursor-pointer hover:border-black/[0.12] transition-colors">
      <input type="radio" id={id} name={name} value={value} defaultChecked={defaultChecked} className="mt-0.5 accent-straker-500" />
      <div>
        <p className="text-[13px] font-medium text-gray-800">{label}</p>
        <p className="text-[11px] text-gray-400">{desc}</p>
      </div>
    </label>
  )
}

function CheckboxOption({ label, defaultChecked }) {
  const id = `format-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <label htmlFor={id} className="flex items-center gap-3 p-2.5 bg-gray-100 rounded-lg border border-black/[0.06] cursor-pointer hover:border-black/[0.12] transition-colors">
      <input type="checkbox" id={id} defaultChecked={defaultChecked} className="accent-straker-500" />
      <span className="text-[13px] text-gray-700">{label}</span>
    </label>
  )
}
