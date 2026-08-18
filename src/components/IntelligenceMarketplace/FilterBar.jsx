import { X } from 'lucide-react'
import { AGENT_TYPES, INDUSTRIES, LANGUAGES, COMPLIANCE_FILTERS, SORT_OPTIONS } from './data/marketplaceCategories'

function PillGroup({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-black/[0.12] p-0.5">
      {options.map(opt => {
        const v = typeof opt === 'string' ? opt : opt.value
        const label = typeof opt === 'string' ? opt : opt.label
        const active = value === v
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              active ? 'bg-[#3D16FA]/15 text-[#3D16FA]' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function MiniSelect({ options, value, onChange, placeholder, multiple = false }) {
  return (
    <select
      value={multiple ? undefined : value}
      onChange={e => {
        if (multiple) {
          const selected = Array.from(e.target.selectedOptions, o => o.value)
          onChange(selected)
        } else {
          onChange(e.target.value)
        }
      }}
      multiple={multiple}
      className="px-2.5 py-1.5 rounded-lg border border-black/[0.12] bg-white text-[11px] text-gray-700 outline-none focus:border-[#3D16FA] cursor-pointer"
      style={multiple ? { height: 28 } : {}}
    >
      {!multiple && <option value="">{placeholder}</option>}
      {options.map(opt => {
        const v = typeof opt === 'string' ? opt : opt.value
        const label = typeof opt === 'string' ? opt : opt.label
        return <option key={v} value={v}>{label}</option>
      })}
    </select>
  )
}

export default function FilterBar({ filters, onFilterChange }) {
  const activeCount = (
    (filters.type !== 'All' ? 1 : 0) +
    filters.industry.length +
    filters.languages.length +
    (filters.compliance !== 'Any' ? 1 : 0)
  )

  function clearAll() {
    onFilterChange({ type: 'All', industry: [], languages: [], compliance: 'Any', sort: 'recommended' })
  }

  return (
    <div className="sticky top-0 z-10 bg-white py-3 border-b border-black/[0.06]">
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Type pills */}
        <PillGroup
          options={AGENT_TYPES}
          value={filters.type}
          onChange={v => onFilterChange({ ...filters, type: v })}
        />

        <span className="w-px h-5 bg-black/[0.08]" />

        {/* Industry */}
        <MiniSelect
          options={INDUSTRIES}
          value={filters.industry[0] || ''}
          onChange={v => onFilterChange({ ...filters, industry: v ? [v] : [] })}
          placeholder="Industry"
        />

        {/* Language */}
        <MiniSelect
          options={LANGUAGES}
          value={filters.languages[0] || ''}
          onChange={v => onFilterChange({ ...filters, languages: v ? [v] : [] })}
          placeholder="Language"
        />

        {/* Compliance */}
        <PillGroup
          options={COMPLIANCE_FILTERS}
          value={filters.compliance}
          onChange={v => onFilterChange({ ...filters, compliance: v })}
        />

        {/* Sort — right-aligned */}
        <div className="ml-auto">
          <MiniSelect
            options={SORT_OPTIONS}
            value={filters.sort}
            onChange={v => onFilterChange({ ...filters, sort: v })}
            placeholder="Sort"
          />
        </div>
      </div>

      {activeCount > 0 && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-gray-400">{activeCount} filter{activeCount !== 1 ? 's' : ''} active</span>
          <button
            onClick={clearAll}
            className="flex items-center gap-0.5 text-[10px] text-[#3D16FA] hover:text-[#0089c4] transition-colors cursor-pointer"
          >
            <X className="w-2.5 h-2.5" /> Clear all
          </button>
        </div>
      )}
    </div>
  )
}
