import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X } from 'lucide-react'
import SearchableSelect from './SearchableSelect'
import useReducedMotion from '../hooks/useReducedMotion'

const locales = [
  { value: 'ja', label: 'Japanese (JA)' },
  { value: 'de', label: 'German (DE)' },
  { value: 'zh', label: 'Chinese Simplified (ZH)' },
  { value: 'zh-tw', label: 'Chinese Traditional (ZH-TW)' },
  { value: 'fr', label: 'French (FR)' },
  { value: 'es', label: 'Spanish (ES)' },
  { value: 'ko', label: 'Korean (KO)' },
  { value: 'pt-br', label: 'Portuguese — Brazil (PT-BR)' },
  { value: 'pt', label: 'Portuguese — Europe (PT)' },
  { value: 'ar', label: 'Arabic (AR)' },
  { value: 'it', label: 'Italian (IT)' },
  { value: 'nl', label: 'Dutch (NL)' },
  { value: 'ru', label: 'Russian (RU)' },
  { value: 'th', label: 'Thai (TH)' },
  { value: 'vi', label: 'Vietnamese (VI)' },
  { value: 'pl', label: 'Polish (PL)' },
  { value: 'tr', label: 'Turkish (TR)' },
  { value: 'id', label: 'Indonesian (ID)' },
  { value: 'hi', label: 'Hindi (HI)' },
  { value: 'sv', label: 'Swedish (SV)' },
  { value: 'no', label: 'Norwegian (NO)' },
  { value: 'da', label: 'Danish (DA)' },
  { value: 'fi', label: 'Finnish (FI)' },
]

const verticals = [
  { value: 'Financial Services', label: 'Financial Services' },
  { value: 'Legal', label: 'Legal' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Automotive', label: 'Automotive' },
  { value: 'Retail & E-Commerce', label: 'Retail & E-Commerce' },
  { value: 'Energy', label: 'Energy' },
  { value: 'Life Sciences', label: 'Life Sciences' },
  { value: 'Government', label: 'Government' },
  { value: 'Education', label: 'Education' },
  { value: 'Gaming', label: 'Gaming' },
  { value: 'Travel & Hospitality', label: 'Travel & Hospitality' },
]

const toneOptions = [
  { value: 'Formal', label: 'Formal' },
  { value: 'Conversational', label: 'Conversational' },
  { value: 'Technical', label: 'Technical' },
  { value: 'Marketing', label: 'Marketing' },
]

export default function ContextPanel({ context, onChange }) {
  const prefersReducedMotion = useReducedMotion()
  const glossaryInputRef = useRef(null)

  const update = (field, value) => {
    onChange({ ...context, [field]: value })
  }

  const tg = context.toneGuidelines || {}
  const isEnabled = !!tg.enabled

  const updateGuidelines = (key, value) => {
    update('toneGuidelines', { ...tg, enabled: true, [key]: value })
  }

  const toggleGuidelines = () => {
    update('toneGuidelines', { ...tg, enabled: !isEnabled })
  }

  const handleGlossaryFile = (file) => {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'tbx', 'xlsx'].includes(ext)) return
    updateGuidelines('glossaryFile', { name: file.name, size: file.size })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Target Locales
          </label>
          <SearchableSelect
            id="target-locales"
            options={locales}
            value={context.targetLocales || (context.targetLocale ? [context.targetLocale] : [])}
            onChange={(val) => update('targetLocales', val)}
            placeholder="Select target locales..."
            multiple
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Industry Vertical
          </label>
          <SearchableSelect
            id="industry-vertical"
            options={verticals}
            value={context.industryVertical}
            onChange={(val) => update('industryVertical', val)}
            placeholder="Select industry..."
            allowOther
            otherPlaceholder="Describe your industry..."
          />
        </div>
      </div>

      {/* Tone & Brand Guidelines */}
      <div className="bg-gray-100 rounded-lg border border-black/[0.06]">
        <div className="flex items-center justify-between p-3">
          <div>
            <p className="text-[12px] font-medium text-gray-700">Tone & Brand Guidelines</p>
            <p className="text-[12px] text-gray-500 mt-0.5">Apply enterprise brand voice and style rules</p>
          </div>
          <button
            role="switch"
            aria-checked={isEnabled}
            aria-label="Toggle tone and brand guidelines"
            onClick={toggleGuidelines}
            className={`relative w-10 h-[22px] rounded-full transition-colors cursor-pointer shrink-0 ${
              isEnabled ? 'bg-straker-600' : 'bg-white/[0.08]'
            }`}
          >
            <span
              className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                isEnabled ? 'translate-x-[22px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
        </div>

        <AnimatePresence>
          {isEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-3 border-t border-black/[0.06] pt-3">
                {/* Knowledge Base Upload */}
                <div>
                  <label htmlFor="glossary-upload" className="block text-[12px] font-medium text-gray-500 mb-1">
                    Knowledge Base Upload
                  </label>
                  <p className="text-[11px] text-gray-400 mb-1.5">Upload knowledge base (.csv, .tbx, .xlsx)</p>
                  {tg.glossaryFile ? (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-black/[0.12]">
                      <Upload className="w-3.5 h-3.5 text-straker-600 shrink-0" />
                      <span className="text-[12px] text-gray-700 truncate flex-1">{tg.glossaryFile.name}</span>
                      <button
                        onClick={() => updateGuidelines('glossaryFile', null)}
                        className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                        aria-label="Remove glossary file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => glossaryInputRef.current?.click()}
                      className="w-full p-2.5 border border-dashed border-black/[0.12] rounded-lg text-[12px] text-gray-400 hover:border-straker-500/30 hover:text-gray-500 transition-colors cursor-pointer text-center"
                    >
                      Click to upload knowledge base file
                    </button>
                  )}
                  <input
                    ref={glossaryInputRef}
                    id="glossary-upload"
                    type="file"
                    accept=".csv,.tbx,.xlsx"
                    className="hidden"
                    onChange={(e) => handleGlossaryFile(e.target.files?.[0])}
                  />
                </div>

                {/* Style Guide Link */}
                <div>
                  <label htmlFor="style-guide-url" className="block text-[12px] font-medium text-gray-500 mb-1">
                    Style Guide Link
                  </label>
                  <p className="text-[11px] text-gray-400 mb-1.5">Link to your brand style guide</p>
                  <input
                    id="style-guide-url"
                    type="url"
                    value={tg.styleGuideUrl || ''}
                    onChange={(e) => updateGuidelines('styleGuideUrl', e.target.value)}
                    placeholder="Paste style guide URL (e.g., Confluence, Notion)"
                    className="w-full bg-gray-100 border border-black/[0.12] rounded-lg px-3 py-2 text-[12px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-straker-500/40 transition-colors"
                  />
                </div>

                {/* Do-Not-Translate List */}
                <div>
                  <label htmlFor="dnt-terms" className="block text-[12px] font-medium text-gray-500 mb-1">
                    Do-Not-Translate List
                  </label>
                  <p className="text-[11px] text-gray-400 mb-1.5">Terms that should remain untranslated</p>
                  <textarea
                    id="dnt-terms"
                    value={tg.dntTerms || ''}
                    onChange={(e) => updateGuidelines('dntTerms', e.target.value)}
                    placeholder="e.g., Not Verify, EBITDA, iPhone"
                    rows={2}
                    className="w-full bg-gray-100 border border-black/[0.12] rounded-lg px-3 py-2 text-[12px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-straker-500/40 transition-colors resize-none"
                  />
                </div>

                {/* Tone Selector */}
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1.5">
                    Tone
                  </label>
                  <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Output tone">
                    {toneOptions.map((opt) => (
                      <button
                        key={opt.value}
                        role="radio"
                        aria-checked={tg.tone === opt.value}
                        onClick={() => updateGuidelines('tone', opt.value)}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                          tg.tone === opt.value
                            ? 'bg-straker-50 border-straker-500/30 text-straker-600'
                            : 'bg-gray-100 border-black/[0.06] text-gray-400 hover:text-gray-500 hover:border-black/[0.12]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
