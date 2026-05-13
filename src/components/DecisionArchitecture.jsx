import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Bot, FileText, ShieldCheck, CheckCircle2,
  Eye, SlidersHorizontal, CheckSquare, Play
} from 'lucide-react'
import DecisionStepper from './DecisionStepper'
import SourceIQCard from './SourceIQCard'
import SandboxPreviewCard from './SandboxPreviewCard'
import QualityScoreCard from './QualityScoreCard'
import UpsellCard from './UpsellCard'
import LocaleConstellation from './LocaleConstellation'
import ContextPanel from './ContextPanel'
import ProjectMetadata from './ProjectMetadata'
import { formatSize } from '../utils/scoreColors'

/* ─── Section Header ─── */

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-straker-50 flex items-center justify-center">
        <Icon className="w-4 h-4 text-straker-600" />
      </div>
      <div>
        <h2 className="text-[14px] font-semibold text-gray-900">{title}</h2>
        <p className="text-[11px] text-gray-500">{subtitle}</p>
      </div>
    </div>
  )
}

/* ─── Shared sub-components ─── */

function Section({ icon: Icon, title, iconColor, iconBg, children }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="p-3.5 bg-gray-100 rounded-lg border border-black/[0.06]">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[14px] text-gray-800 font-medium">{value}</p>
    </div>
  )
}

/* ─── Main Component ─── */

export default function DecisionArchitecture({
  data,
  onReset,
  enabledUpsells,
  onToggleUpsell,
  computedQuality,
  onProceed,
  context,
  onContextChange,
  projectMeta,
  onProjectMetaChange,
  constellationData,
}) {
  const { fileName, fileSize, classification, intent, agent, plan, sourceIQ, qualityScore, upsellOptions, sandboxPreview } = data

  const [activeSection, setActiveSection] = useState('understand')
  const [completedSections, setCompletedSections] = useState(new Set(['understand']))

  const sectionRefs = useRef({})

  // Auto-complete 'decide' when at least one locale is selected
  useEffect(() => {
    setCompletedSections(prev => {
      const next = new Set(prev)
      if ((context.targetLocales || []).length > 0) {
        next.add('decide')
      } else {
        next.delete('decide')
      }
      return next
    })
  }, [context.targetLocales])

  // Auto-complete 'confirm' when project name is filled
  useEffect(() => {
    setCompletedSections(prev => {
      const next = new Set(prev)
      if (projectMeta?.name?.trim()) {
        next.add('confirm')
      } else {
        next.delete('confirm')
      }
      return next
    })
  }, [projectMeta?.name])

  // Update active section based on scroll position
  useEffect(() => {
    const sectionKeys = ['understand', 'decide', 'confirm']

    const handleScroll = () => {
      for (let i = sectionKeys.length - 1; i >= 0; i--) {
        const el = document.getElementById(`section-${sectionKeys[i]}`)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 200) {
            setActiveSection(sectionKeys[i])
            return
          }
        }
      }
      setActiveSection('understand')
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSectionClick = useCallback((sectionKey) => {
    const el = document.getElementById(`section-${sectionKey}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const handleToggleLocale = (code) => {
    const current = context.targetLocales || []
    const next = current.includes(code) ? current.filter(c => c !== code) : [...current, code]
    onContextChange({ ...context, targetLocales: next })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {/* Back button */}
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-700 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Upload a different asset
      </button>

      {/* Header card */}
      <div className="bg-gray-50 border border-black/[0.12] rounded-lg overflow-hidden mb-8">
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-straker-600 bg-straker-50 px-2.5 py-1 rounded-md">
                  Orchestrated Translation Complete
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                  Ready
                </span>
              </div>
              <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight mt-3">{intent}</h1>
              <p className="text-[14px] text-gray-500 mt-1">
                Generated for <span className="text-gray-700 font-medium">{fileName}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-straker-500/20 flex items-center justify-center" aria-hidden="true">
              <Bot className="w-6 h-6 text-straker-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid layout: stepper + main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
        {/* Stepper — hidden below lg */}
        <div className="hidden lg:block">
          <DecisionStepper
            activeSection={activeSection}
            completedSections={completedSections}
            onSectionClick={handleSectionClick}
          />
        </div>

        {/* Main content */}
        <div className="space-y-8">

          {/* Section 1: Understand */}
          <section id="section-understand">
            <SectionHeader icon={Eye} title="Understand" subtitle="Insights from AI analysis" />
            <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-6 space-y-6">
              {/* Asset Analysis */}
              <Section icon={FileText} title="Asset Analysis" iconColor="text-blue-600" iconBg="bg-blue-50">
                <div className="grid grid-cols-2 gap-4">
                  <Detail label="Classification" value={classification} />
                  <Detail label="File Size" value={formatSize(fileSize)} />
                </div>
              </Section>

              {/* Recommended Agent */}
              <Section icon={Bot} title="Recommended Agent" iconColor="text-violet-600" iconBg="bg-violet-50">
                <div className="flex items-center gap-4 p-4 bg-gray-100 rounded-lg border border-black/[0.06]">
                  <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-gray-900">{agent.name}</p>
                    <p className="text-[12px] font-mono text-gray-400 mt-0.5">ID: {agent.id}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-600/70 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    Online
                  </div>
                </div>
              </Section>

              {/* Source IQ */}
              <SourceIQCard sourceIQ={sourceIQ} />

              {/* Guardrails */}
              <Section icon={ShieldCheck} title="Deterministic Guardrails Applied" iconColor="text-teal-400" iconBg="bg-teal-500/10">
                <div className="space-y-2.5">
                  {plan.guardrails.map((g, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-teal-400/70 mt-0.5 shrink-0" />
                      <span className="text-[14px] text-gray-700">{g}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Sandbox Preview */}
              <SandboxPreviewCard preview={sandboxPreview} totalPages={classification} />
            </div>
          </section>

          {/* Section 2: Decide */}
          <section id="section-decide">
            <SectionHeader icon={SlidersHorizontal} title="Decide" subtitle="Configure your deployment parameters" />
            <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-6 space-y-6">
              {/* Locale Constellation */}
              <LocaleConstellation
                selectedLocales={context.targetLocales}
                onToggleLocale={handleToggleLocale}
                constellationData={constellationData}
                documentContext={{
                  fileType: fileName?.split('.').pop()?.toLowerCase(),
                  classification,
                  industry: context.industryVertical || (intent?.toLowerCase().includes('financial') ? 'Financial Services' : ''),
                  sourceLanguage: 'en',
                }}
              />

              {/* Context Panel */}
              <ContextPanel context={context} onChange={onContextChange} />

              {/* Confidence Score */}
              <QualityScoreCard qualityScore={computedQuality || qualityScore} />

              {/* Upsell */}
              <UpsellCard options={upsellOptions} enabledUpsells={enabledUpsells} onToggle={onToggleUpsell} />
            </div>
          </section>

          {/* Section 3: Confirm */}
          <section id="section-confirm">
            <SectionHeader icon={CheckSquare} title="Confirm" subtitle="Project details & execution" />
            <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-6 space-y-6">
              {/* Project Metadata */}
              <ProjectMetadata meta={projectMeta} onChange={onProjectMetaChange} />

              {/* Execution Summary */}
              <div className="bg-gray-100 rounded-lg border border-black/[0.06] p-4 space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-gray-500">Agent</span>
                  <span className="text-gray-900">{agent.name}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-gray-500">Guardrails</span>
                  <span className="text-gray-900">{plan.guardrails.length}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-gray-500">Confidence Score</span>
                  <span className="text-gray-900">{(computedQuality || qualityScore).overall}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-gray-500">Target Locales</span>
                  <span className="text-gray-900">{(context.targetLocales || []).length}</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={onProceed}
                className="w-full flex flex-col items-center justify-center gap-0.5 px-6 py-3.5 rounded-lg bg-amber hover:bg-amber-deep text-white font-semibold text-[14px] transition-all shadow-sm cursor-pointer mt-4"
              >
                <span className="flex items-center gap-2.5"><Play className="w-4 h-4" /> Confirm & Execute</span>
                <span className="text-[11px] font-normal text-straker-200/60">Full document processing</span>
              </button>
            </div>
          </section>

        </div>
      </div>
    </motion.div>
  )
}
