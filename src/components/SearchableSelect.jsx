import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, X, Search } from 'lucide-react'

export default function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  multiple = false,
  allowOther = false,
  otherPlaceholder = 'Describe...',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [otherText, setOtherText] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  // Close on click outside / Escape
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false)
    }
    const handleEsc = (e) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen])

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus()
  }, [isOpen])

  // Reset highlight when search changes
  useEffect(() => { setHighlightIndex(0) }, [search])

  const handleSelect = useCallback((optValue) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : []
      if (current.includes(optValue)) {
        onChange(current.filter(v => v !== optValue))
      } else {
        onChange([...current, optValue])
      }
    } else {
      onChange(optValue)
      setIsOpen(false)
      setSearch('')
    }
  }, [multiple, value, onChange])

  const handleRemove = (optValue, e) => {
    e.stopPropagation()
    if (multiple && Array.isArray(value)) {
      onChange(value.filter(v => v !== optValue))
    }
  }

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    const allItems = [...filtered, ...(allowOther ? [{ value: '__other__', label: 'Other' }] : [])]

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(prev => Math.min(prev + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allItems[highlightIndex]) handleSelect(allItems[highlightIndex].value)
    } else if (e.key === 'Backspace' && !search && multiple && Array.isArray(value) && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[highlightIndex]
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  const getLabel = (val) => options.find(o => o.value === val)?.label || val
  const selectedValues = multiple ? (Array.isArray(value) ? value : []) : []
  const isSelected = (optValue) => multiple ? selectedValues.includes(optValue) : value === optValue
  const showOtherInput = allowOther && (multiple ? selectedValues.includes('__other__') : value === '__other__')
  const allItems = [...filtered, ...(allowOther && (!search || 'other'.includes(search.toLowerCase())) ? [{ value: '__other__', label: 'Other' }] : [])]

  const displayText = multiple
    ? (selectedValues.length === 0 ? placeholder : null)
    : (value && value !== '__other__' ? getLabel(value) : value === '__other__' ? 'Other' : placeholder)

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-label={placeholder}
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="w-full bg-gray-100 border border-black/[0.12] rounded-lg px-3 py-2.5 text-[13px] text-gray-800 cursor-pointer focus-visible:outline-2 focus-visible:outline-straker-400 focus-visible:outline-offset-2 transition-colors hover:border-black/[0.12] flex items-center gap-2 min-h-[42px] flex-wrap"
      >
        {multiple && selectedValues.length > 0 && (
          selectedValues.map(v => (
            <span key={v} className="inline-flex items-center gap-1 bg-straker-50 text-straker-600 text-[11px] font-medium px-2 py-0.5 rounded-md">
              {v === '__other__' ? 'Other' : getLabel(v)}
              <button
                onClick={(e) => handleRemove(v, e)}
                className="hover:text-gray-900 transition-colors cursor-pointer"
                aria-label={`Remove ${getLabel(v)}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
        {displayText && (
          <span className={value || selectedValues.length > 0 ? 'text-gray-800' : 'text-gray-400'}>{displayText}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black/[0.12] rounded-lg  z-50 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-black/[0.12]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="w-full bg-gray-100 border border-black/[0.12] rounded-md pl-8 pr-3 py-1.5 text-[12px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-straker-400/40"
              />
            </div>
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            aria-multiselectable={multiple}
            className="max-h-[200px] overflow-y-auto py-1"
          >
            {allItems.map((opt, i) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected(opt.value)}
                onClick={() => handleSelect(opt.value)}
                className={`flex items-center gap-2.5 px-3 py-2 text-[12px] cursor-pointer transition-colors ${
                  i === highlightIndex ? 'bg-black/[0.04]' : 'hover:bg-black/[0.04]'
                } ${isSelected(opt.value) ? 'text-straker-600' : 'text-gray-700'}`}
              >
                {multiple && (
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    isSelected(opt.value) ? 'bg-straker-600 border-straker-500' : 'border-black/[0.20]'
                  }`}>
                    {isSelected(opt.value) && <span className="text-[8px] text-white font-bold">✓</span>}
                  </div>
                )}
                {opt.label}
              </li>
            ))}
            {allItems.length === 0 && (
              <li className="px-3 py-3 text-[12px] text-gray-400 text-center">No results found</li>
            )}
          </ul>
        </div>
      )}

      {/* Other text input */}
      {showOtherInput && (
        <div className="mt-2">
          <input
            type="text"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value.slice(0, 100))}
            placeholder={otherPlaceholder}
            maxLength={100}
            className="w-full bg-gray-100 border border-black/[0.12] rounded-lg px-3 py-2 text-[13px] text-gray-800 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:outline-straker-400 focus-visible:outline-offset-2"
          />
          <p className="text-[11px] text-gray-400 mt-1 text-right">{otherText.length}/100</p>
        </div>
      )}
    </div>
  )
}
