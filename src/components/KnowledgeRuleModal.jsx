import { useState, useEffect } from 'react'
import { Brain, ArrowRight, Info } from 'lucide-react'
import Modal from './Modal'

export default function KnowledgeRuleModal({ isOpen, onClose, onSave, initialSourceTerm, initialTargetTerm, segmentId }) {
  const [sourceTerm, setSourceTerm] = useState('')
  const [targetTerm, setTargetTerm] = useState('')
  const [contextNote, setContextNote] = useState('')

  // Reset fields when modal opens with new context
  useEffect(() => {
    if (isOpen) {
      setSourceTerm(initialSourceTerm || '')
      setTargetTerm(initialTargetTerm || '')
      setContextNote('')
    }
  }, [isOpen, initialSourceTerm, initialTargetTerm])

  const canSave = sourceTerm.trim().length > 0 && targetTerm.trim().length > 0

  function handleSave() {
    if (!canSave) return
    onSave({
      sourceTerm: sourceTerm.trim(),
      targetTerm: targetTerm.trim(),
      contextNote: contextNote.trim(),
      createdFrom: segmentId,
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save as Knowledge Rule" size="md">
      <div className="space-y-5">
        {/* Explanation */}
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-purple-50/60 border border-purple-200/40">
          <Info className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
          <p className="text-xs text-purple-700 leading-relaxed">
            A Knowledge Rule teaches the AI to always use your preferred term. It will be stored in the project's Knowledge Graph and can trigger an automatic realignment across all unverified segments.
          </p>
        </div>

        {/* Source → Target */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-900/50 uppercase tracking-wider mb-1.5">
              Source Term <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={sourceTerm}
              onChange={e => setSourceTerm(e.target.value)}
              placeholder="e.g. ASC 350"
              className="w-full px-3 py-2 rounded-lg bg-black/[0.03] border border-black/[0.12] text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-purple-400 transition-colors"
            />
          </div>

          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5 text-purple-500" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-900/50 uppercase tracking-wider mb-1.5">
              Target Term <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={targetTerm}
              onChange={e => setTargetTerm(e.target.value)}
              placeholder="e.g. 企業会計基準第10号"
              className="w-full px-3 py-2 rounded-lg bg-black/[0.03] border border-black/[0.12] text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-purple-400 transition-colors font-mono"
            />
          </div>
        </div>

        {/* Context Note */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-900/50 uppercase tracking-wider mb-1.5">
            Context Note <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={contextNote}
            onChange={e => setContextNote(e.target.value)}
            placeholder="e.g. Use only for TSE filings, not internal reports"
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-black/[0.03] border border-black/[0.12] text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-purple-400 resize-none transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <Brain className="w-4 h-4" /> Save Knowledge Rule
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-black/[0.04] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
