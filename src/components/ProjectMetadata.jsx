import { useState } from 'react'

const visibilityOptions = [
  { value: 'private', label: 'Private (only me)' },
  { value: 'team', label: 'My Team' },
  { value: 'org', label: 'Organization-wide' },
]

export default function ProjectMetadata({ meta, onChange }) {
  const [touched, setTouched] = useState({})

  const update = (field, value) => {
    onChange({ ...meta, [field]: value })
  }

  const showNameError = touched.name && !meta.name?.trim()

  return (
    <div className="space-y-3">
      {/* Project Name */}
      <div>
        <label htmlFor="project-name" className="block text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Project Name <span className="text-red-600">*</span>
        </label>
        <input
          id="project-name"
          type="text"
          value={meta.name || ''}
          onChange={(e) => update('name', e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          maxLength={120}
          placeholder="e.g., Q4 2025 Earnings Report — JA"
          aria-required="true"
          aria-invalid={showNameError || undefined}
          aria-describedby={showNameError ? 'project-name-error' : undefined}
          className={`w-full bg-gray-100 border rounded-lg px-3 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-300 focus:outline-none transition-colors ${
            showNameError
              ? 'border-red-500/50 focus:border-red-500/70'
              : 'border-black/[0.12] focus:border-straker-500/40'
          }`}
        />
        {showNameError && (
          <p id="project-name-error" className="text-[12px] text-red-600 mt-1" role="alert">
            Project name is required
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* PO Number */}
        <div>
          <label htmlFor="po-number" className="block text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            PO Number
          </label>
          <input
            id="po-number"
            type="text"
            value={meta.poNumber || ''}
            onChange={(e) => update('poNumber', e.target.value)}
            maxLength={50}
            placeholder="e.g., PO-2025-0847"
            className="w-full bg-gray-100 border border-black/[0.12] rounded-lg px-3 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-straker-500/40 transition-colors"
          />
        </div>

        {/* Team Visibility */}
        <div>
          <label htmlFor="team-visibility" className="block text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Team Visibility
          </label>
          <select
            id="team-visibility"
            value={meta.visibility || 'private'}
            onChange={(e) => update('visibility', e.target.value)}
            className="w-full bg-gray-100 border border-black/[0.12] rounded-lg px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-straker-500/40 transition-colors appearance-none cursor-pointer"
          >
            {visibilityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
