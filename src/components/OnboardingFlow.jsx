import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, ArrowRight, Upload, CheckCircle2, Building2, Briefcase,
  MessageCircle, Globe, Sparkles, FileText, X, Shield, Lock
} from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

const ASSISTANT_NAME = 'Sage'

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: 'Japanese' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'th', name: 'Thai' },
]

const LOCALES = [
  { code: 'ja', name: 'Japanese', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'de', name: 'German', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'zh', name: 'Chinese', flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'fr', name: 'French', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'es', name: 'Spanish', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'ko', name: 'Korean', flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'pt', name: 'Portuguese', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'ar', name: 'Arabic', flag: '\u{1F1F8}\u{1F1E6}' },
  { code: 'it', name: 'Italian', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'nl', name: 'Dutch', flag: '\u{1F1F3}\u{1F1F1}' },
  { code: 'ru', name: 'Russian', flag: '\u{1F1F7}\u{1F1FA}' },
  { code: 'th', name: 'Thai', flag: '\u{1F1F9}\u{1F1ED}' },
]

const CONTENT_TYPES = [
  { id: 'earnings reports', label: 'Earnings Reports', icon: '\u{1F4CA}' },
  { id: 'regulatory filings', label: 'Regulatory Filings', icon: '\u{1F4CB}' },
  { id: 'legal contracts', label: 'Legal Contracts', icon: '\u{1F4C4}' },
  { id: 'medical/clinical', label: 'Medical/Clinical', icon: '\u{1F3E5}' },
  { id: 'product docs', label: 'Product Documentation', icon: '\u{1F4BB}' },
  { id: 'marketing content', label: 'Marketing Content', icon: '\u{1F4F1}' },
  { id: 'video/media', label: 'Video/Media', icon: '\u{1F3AC}' },
  { id: 'training materials', label: 'Training Materials', icon: '\u{1F4DA}' },
  { id: 'technical manuals', label: 'Technical Manuals', icon: '\u{1F527}' },
]

const VERTICAL_MAP = {
  'earnings reports': { vertical: 'Financial Services', sub: 'earnings & investor relations' },
  'regulatory filings': { vertical: 'Financial Services', sub: 'regulatory filings' },
  'legal contracts': { vertical: 'Legal', sub: 'contracts & agreements' },
  'medical/clinical': { vertical: 'Life Sciences', sub: 'clinical & medical' },
  'product docs': { vertical: 'Technology', sub: 'product documentation' },
  'marketing content': { vertical: 'Marketing', sub: 'brand & campaigns' },
  'video/media': { vertical: 'Media & Entertainment', sub: 'multimedia' },
  'training materials': { vertical: 'Learning & Development', sub: 'training' },
  'technical manuals': { vertical: 'Engineering', sub: 'technical documentation' },
}

const COMPLIANCE_MAP = {
  'Financial Services': ['GAAP', 'IFRS'],
  'Legal': ['GDPR', 'SOX'],
  'Life Sciences': ['FDA', 'EMA', 'ICH'],
  'Technology': [],
  'Marketing': [],
  'Media & Entertainment': [],
  'Learning & Development': [],
  'Engineering': ['ISO'],
}

function inferVertical(contentTypes) {
  if (!contentTypes.length) return { vertical: 'General', sub: 'general content' }
  const first = contentTypes[0]
  return VERTICAL_MAP[first] || { vertical: 'General', sub: 'general content' }
}

function BotAvatar() {
  return (
    <motion.div
      className="w-8 h-8 rounded-full bg-straker-50 flex items-center justify-center shrink-0"
      animate={{
        boxShadow: [
          '0 0 8px rgba(92,124,250,0.1)',
          '0 0 8px rgba(92,124,250,0.3)',
          '0 0 8px rgba(92,124,250,0.1)',
        ],
      }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Bot className="w-4 h-4 text-straker-600" />
    </motion.div>
  )
}

/* Parse **bold** markdown into <strong> elements */
function parseBold(text) {
  if (typeof text !== 'string') return text
  const parts = text.split(/\*\*(.+?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{part}</strong> : part
  )
}

function BotMessage({ children, reducedMotion, delay = 0 }) {
  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25, delay }}
      className="flex items-start gap-3"
    >
      <BotAvatar />
      <div className="bg-gray-50 border border-black/[0.12] rounded-lg rounded-tl-md px-4 py-3 max-w-[85%]">
        <div className="text-[15px] text-gray-700 leading-relaxed">{children}</div>
      </div>
    </motion.div>
  )
}

function UserBubble({ children, reducedMotion }) {
  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
      className="flex justify-end"
    >
      <div className="bg-white border border-black/[0.12] rounded-lg rounded-tr-md px-4 py-3 max-w-[80%]">
        <div className="text-[14px] text-gray-700">{children}</div>
      </div>
    </motion.div>
  )
}

function InputArea({ children, reducedMotion }) {
  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.35, delay: 0.15 }}
      className="ml-11"
    >
      {children}
    </motion.div>
  )
}

function ContinueButton({ onClick, disabled, label = 'Continue' }) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`mt-4 h-10 px-6 rounded-lg font-medium text-[14px] flex items-center gap-2 transition-all ${
        disabled
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-[#3b5bdb] hover:bg-[#364fc7] text-white cursor-pointer'
      }`}
    >
      {label} <ArrowRight className="w-4 h-4" />
    </motion.button>
  )
}

function FileDropZone({ label, hint, onFile, file, onClear }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) onFile(f)
  }, [onFile])

  return (
    <div className={label ? 'mb-3' : ''}>
      {label && <p className="text-[12px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">{label}</p>}
      {file ? (
        <div className="flex items-center gap-2 bg-gray-50 border border-black/[0.12] rounded-lg px-3 py-2">
          <FileText className="w-4 h-4 text-straker-600 shrink-0" />
          <span className="text-[13px] text-gray-700 truncate flex-1">{file.name}</span>
          <button onClick={onClear} className="text-gray-500 hover:text-gray-700 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer transition-all ${
            isDragOver
              ? 'border-straker-400 bg-straker-50'
              : 'border-black/[0.12] bg-gray-50 hover:border-black/[0.20]'
          }`}
        >
          <Upload className={`w-4 h-4 shrink-0 ${isDragOver ? 'text-straker-600' : 'text-gray-500'}`} />
          <span className="text-[12px] text-gray-500">{hint}</span>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = '' }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────

export default function OnboardingFlow({ onComplete }) {
  const reducedMotion = useReducedMotion()
  const scrollRef = useRef(null)

  // Collected data — identity is pre-populated (Sage already knows)
  const [userName] = useState('Alex')
  const [orgName] = useState('Meridian Capital')
  const [userLanguage, setUserLanguage] = useState('')
  const [userRole, setUserRole] = useState('')
  const [targetLocales, setTargetLocales] = useState([])
  const [primaryLocale, setPrimaryLocale] = useState('')
  const [contentTypes, setContentTypes] = useState([])
  const [tone, setTone] = useState('')
  const [glossaryFile, setGlossaryFile] = useState(null)
  const [tmxFile, setTmxFile] = useState(null)
  const [styleGuideUrl, setStyleGuideUrl] = useState('')
  const [dntTerms, setDntTerms] = useState('')

  // Flow state: tracks which messages/inputs have been revealed
  // stages: welcome, work, assets, complete
  const [stage, setStage] = useState('welcome')
  const [messages, setMessages] = useState([])
  const [showInput, setShowInput] = useState(false)

  // Progress
  const stageProgress = {
    welcome: 10,
    work: 40,
    assets: 75,
    complete: 100,
  }

  const progress = stageProgress[stage] || 0

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, showInput, stage])

  // Initialize welcome
  useEffect(() => {
    const timers = []
    setMessages([{ type: 'bot', key: 'welcome-1', text: `Welcome back, **Alex**. I'm **${ASSISTANT_NAME}**, your Intelligence Assistant. I see you're with **Meridian Capital** in **New York City**.` }])
    timers.push(setTimeout(() => {
      setMessages(prev => [...prev, { type: 'bot', key: 'welcome-2', text: "To get you set up, what is your primary language and your role at Meridian?" }])
      setTimeout(() => setShowInput(true), 200)
    }, reducedMotion ? 0 : 800))
    return () => timers.forEach(clearTimeout)
  }, [reducedMotion])

  const advanceStage = useCallback((nextStage, userBubble, botMessages, delay = 300) => {
    setShowInput(false)
    // Add user bubble
    setMessages(prev => [...prev, { type: 'user', key: `user-${nextStage}`, content: userBubble }])

    // After a beat, add bot messages and show input
    const d = reducedMotion ? 0 : delay
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        ...botMessages.map((m, i) => ({ type: 'bot', key: `bot-${nextStage}-${i}`, text: m }))
      ])
      setStage(nextStage)
      setTimeout(() => setShowInput(true), reducedMotion ? 0 : 400)
    }, d)
  }, [reducedMotion])

  // ─── Stage handlers ────────────────────────

  const handleIdentitySubmit = () => {
    if (!userLanguage || !userRole.trim()) return
    const langName = LANGUAGES.find(l => l.code === userLanguage)?.name || userLanguage
    advanceStage(
      'work',
      `${langName} · ${userRole.trim()}`,
      [
        `Great — **${langName}** speaker and **${userRole.trim()}** at Meridian Capital. I'll tailor your experience accordingly.`,
        `Now, what markets does Meridian Capital need to reach, and what content do you need to take global?`
      ]
    )
  }

  const handleWorkSubmit = () => {
    if (targetLocales.length === 0 || contentTypes.length === 0) return
    // Auto-set primary locale to first selected if not yet chosen
    const effectivePrimary = primaryLocale || targetLocales[0]
    if (!primaryLocale) setPrimaryLocale(effectivePrimary)

    const localeNames = targetLocales.map(c => LOCALES.find(l => l.code === c)?.name).filter(Boolean).join(', ')
    const ctLabels = contentTypes.map(id => CONTENT_TYPES.find(c => c.id === id)?.label).filter(Boolean).join(', ')
    const primaryName = LOCALES.find(l => l.code === effectivePrimary)?.name || effectivePrimary
    const { vertical, sub } = inferVertical(contentTypes)
    const compliance = COMPLIANCE_MAP[vertical] || []
    const complianceMsg = compliance.length > 0
      ? `Since you work with ${sub}, I'll activate **${compliance.join('** and **')}** compliance guardrails. These ensure your translations meet regulatory standards.`
      : "No specific regulatory frameworks needed for your content type \u2014 I'll monitor general quality standards."

    advanceStage(
      'assets',
      `${localeNames} (primary: ${primaryName}) \u2014 ${ctLabels}`,
      [
        `Got it \u2014 ${vertical} (${sub}) across ${targetLocales.length} market${targetLocales.length !== 1 ? 's' : ''}.`,
        complianceMsg,
        "Great \u2014 I'll configure your **Readiness Core** with those markets. That's how we track your setup progress.",
        "These files will seed your **Org Brain** \u2014 your organization's living knowledge base that improves with every project.",
        "Almost done. Any existing knowledge base files? And what are your brand quality standards?"
      ]
    )
  }

  const handleAssetsSubmit = () => {
    if (!tone) return
    const parts = []
    if (glossaryFile) parts.push(glossaryFile.name)
    if (tmxFile) parts.push(tmxFile.name)
    if (styleGuideUrl.trim()) parts.push('Style guide linked')
    if (dntTerms.trim()) parts.push(`Protected Terms: ${dntTerms.trim().split(',').length} terms`)
    const assetSummary = parts.length > 0 ? parts.join(', ') : 'Starting fresh'
    const bubble = `${tone.charAt(0).toUpperCase() + tone.slice(1)} tone \u2014 ${assetSummary}`

    // Build completion summary
    const effectivePrimary = primaryLocale || targetLocales[0]
    const { vertical } = inferVertical(contentTypes)
    const compliance = COMPLIANCE_MAP[vertical] || []
    const complianceStr = compliance.length > 0 ? compliance.join(' + ') : 'standard'
    const primaryName = LOCALES.find(l => l.code === effectivePrimary)?.name || effectivePrimary

    setShowInput(false)
    setMessages(prev => [...prev, { type: 'user', key: 'user-complete', content: bubble }])

    setTimeout(() => {
      setMessages(prev => [...prev,
        { type: 'bot', key: 'bot-dashboard-preview', text: "On your dashboard, you'll see your **Readiness Core** checklist and **Org Health** metrics. Both start empty \u2014 they'll come alive after your first project." },
        {
        type: 'completion',
        key: 'completion',
        data: {
          markets: targetLocales.length,
          primaryName,
          allLocales: targetLocales.map(code => LOCALES.find(l => l.code === code)).filter(Boolean),
          primaryLocale: effectivePrimary,
          vertical,
          sub: inferVertical(contentTypes).sub,
          complianceStr,
          contentTypes: contentTypes.map(id => CONTENT_TYPES.find(c => c.id === id)).filter(Boolean),
          tone,
          glossaryFile,
          tmxFile,
          styleGuideUrl: styleGuideUrl.trim(),
          dntTerms: dntTerms.trim() ? dntTerms.trim().split(',').map(t => t.trim()).filter(Boolean) : [],
          orgName: orgName.trim(),
        }
      }])
      setStage('complete')
      setTimeout(() => setShowInput(true), reducedMotion ? 0 : 400)
    }, reducedMotion ? 0 : 300)
  }

  const handleAssetsSkip = () => {
    // Skip sets tone to 'professional' as default if not selected
    const effectiveTone = tone || 'professional'
    if (!tone) setTone(effectiveTone)

    const effectivePrimary = primaryLocale || targetLocales[0]
    const { vertical } = inferVertical(contentTypes)
    const compliance = COMPLIANCE_MAP[vertical] || []
    const complianceStr = compliance.length > 0 ? compliance.join(' + ') : 'standard'
    const primaryName = LOCALES.find(l => l.code === effectivePrimary)?.name || effectivePrimary

    setShowInput(false)
    setMessages(prev => [...prev, { type: 'user', key: 'user-complete', content: 'Starting fresh' }])

    setTimeout(() => {
      setMessages(prev => [...prev,
        { type: 'bot', key: 'bot-dashboard-preview-skip', text: "On your dashboard, you'll see your **Readiness Core** checklist and **Org Health** metrics. Both start empty \u2014 they'll come alive after your first project." },
        {
        type: 'completion',
        key: 'completion',
        data: {
          markets: targetLocales.length,
          primaryName,
          allLocales: targetLocales.map(code => LOCALES.find(l => l.code === code)).filter(Boolean),
          primaryLocale: effectivePrimary,
          vertical,
          sub: inferVertical(contentTypes).sub,
          complianceStr,
          contentTypes: contentTypes.map(id => CONTENT_TYPES.find(c => c.id === id)).filter(Boolean),
          tone: effectiveTone,
          glossaryFile: null,
          tmxFile: null,
          styleGuideUrl: '',
          dntTerms: [],
          orgName: orgName.trim(),
        }
      }])
      setStage('complete')
      setTimeout(() => setShowInput(true), reducedMotion ? 0 : 400)
    }, reducedMotion ? 0 : 300)
  }

  const handleComplete = () => {
    const effectivePrimary = primaryLocale || targetLocales[0]
    const { vertical, sub } = inferVertical(contentTypes)
    const compliance = COMPLIANCE_MAP[vertical] || []
    const effectiveTone = tone || 'professional'
    onComplete({
      orgName: orgName.trim(),
      userName: userName.trim(),
      targetLocales,
      primaryLocale: effectivePrimary,
      industryVertical: vertical,
      subVertical: sub,
      complianceFrameworks: compliance,
      tone: effectiveTone,
      glossaryFile,
      tmxFile,
      styleGuideUrl: styleGuideUrl.trim(),
      dntTerms: dntTerms.trim(),
      contentTypes,
    })
  }

  const handleSkip = () => {
    onComplete({
      orgName: 'Meridian Capital',
      userName: 'Alex',
      targetLocales: ['ja', 'de', 'zh'],
      primaryLocale: 'ja',
      industryVertical: 'Financial Services',
      subVertical: 'earnings & investor relations',
      complianceFrameworks: ['GAAP', 'IFRS'],
      tone: 'professional',
      glossaryFile: null,
      tmxFile: null,
      styleGuideUrl: '',
      dntTerms: '',
      contentTypes: ['earnings reports'],
    })
  }

  // ─── Toggle helpers ────────────────────────

  const toggleLocale = (code) => {
    setTargetLocales(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
      // If primary locale was deselected, reset it
      if (primaryLocale === code && !next.includes(code)) {
        setPrimaryLocale(next.length > 0 ? next[0] : '')
      }
      // If this is the first locale selected, auto-set as primary
      if (!prev.includes(code) && prev.length === 0) {
        setPrimaryLocale(code)
      }
      return next
    })
  }

  const toggleContentType = (id) => {
    setContentTypes(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  // ─── Render ────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar with progress and skip */}
      <div className="px-4 pt-3 pb-1">
      <div className="max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1600px] mx-auto flex items-center gap-3">
        <div className="h-1 bg-gray-100 flex-1 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-straker-600 to-straker-400 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {stage !== 'complete' && (
          <button
            onClick={handleSkip}
            className="text-[12px] text-gray-400 hover:text-gray-600 font-medium cursor-pointer transition-colors whitespace-nowrap"
          >
            Skip
          </button>
        )}
      </div>
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        <div className={`mx-auto px-4 py-10 space-y-5 ${stage === 'work' ? 'max-w-[800px]' : 'max-w-[640px]'}`}>
          <AnimatePresence mode="sync">
            {messages.map((msg, idx) => {
              if (msg.type === 'bot') {
                return (
                  <BotMessage key={msg.key} reducedMotion={reducedMotion} delay={0}>
                    {parseBold(msg.text)}
                  </BotMessage>
                )
              }
              if (msg.type === 'user') {
                return (
                  <UserBubble key={msg.key} reducedMotion={reducedMotion}>
                    {msg.content}
                  </UserBubble>
                )
              }
              if (msg.type === 'completion') {
                const d = msg.data
                return (
                  <motion.div
                    key={msg.key}
                    initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
                    className="flex items-start gap-3"
                  >
                    <BotAvatar />
                    <div className="bg-gray-50 border border-straker-500/20 rounded-lg rounded-tl-md px-5 py-4 max-w-[85%]">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-4">
                        <motion.div
                          initial={reducedMotion ? {} : { scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </motion.div>
                        <motion.div
                          initial={reducedMotion ? {} : { scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.4 }}
                        >
                          <Sparkles className="w-4 h-4 text-straker-600" />
                        </motion.div>
                        <p className="text-[15px] text-gray-700 leading-relaxed">
                          Platform configured for <span className="text-gray-900 font-medium">{d.orgName}</span>
                        </p>
                      </div>

                      {/* Section 1: Markets & Languages */}
                      <div className="border-b border-black/[0.12] pb-3 mb-3">
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Markets & Languages</p>
                        <p className="text-[14px] text-gray-700">
                          <span className="text-gray-900 font-medium">{d.markets} target market{d.markets !== 1 ? 's' : ''}</span>
                          {': '}
                          {d.allLocales.map((locale, i) => (
                            <span key={locale.code}>
                              {i > 0 && ' \u00B7 '}
                              {locale.flag} {locale.name}
                              {locale.code === d.primaryLocale && (
                                <span className="ml-1 text-[11px] text-straker-600 font-medium">(Primary)</span>
                              )}
                            </span>
                          ))}
                        </p>
                      </div>

                      {/* Section 2: Domain Intelligence */}
                      <div className="border-b border-black/[0.12] pb-3 mb-3">
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Domain Intelligence</p>
                        <p className="text-[14px] text-gray-700 mb-1.5">Loaded domain models for:</p>
                        <div className="space-y-1">
                          {d.contentTypes.map((ct) => {
                            const mapping = VERTICAL_MAP[ct.id]
                            const compliance = mapping ? (COMPLIANCE_MAP[mapping.vertical] || []) : []
                            return (
                              <p key={ct.id} className="text-[14px] text-gray-700">
                                <span>{ct.icon}</span>{' '}
                                <span className="text-gray-900 font-medium">{ct.label}</span>
                                {compliance.length > 0 && (
                                  <span className="text-gray-500"> &mdash; {compliance.join(' + ')} guardrails</span>
                                )}
                              </p>
                            )
                          })}
                        </div>
                      </div>

                      {/* Section 3: Voice & Style */}
                      <div className="border-b border-black/[0.12] pb-3 mb-3">
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Voice & Style</p>
                        <p className="text-[14px] text-gray-700">
                          <span className="text-gray-900 font-medium">{d.tone.charAt(0).toUpperCase() + d.tone.slice(1)}</span> register configured as default voice
                        </p>
                        {d.styleGuideUrl && (
                          <p className="text-[14px] text-gray-700 mt-1">Style guide linked</p>
                        )}
                        {d.dntTerms.length > 0 && (
                          <p className="text-[14px] text-gray-700 mt-1">
                            <span className="text-gray-900 font-medium">{d.dntTerms.length}</span> protected brand term{d.dntTerms.length !== 1 ? 's' : ''} preserved: <span className="text-gray-900 font-medium">{d.dntTerms.join(', ')}</span>
                          </p>
                        )}
                      </div>

                      {/* Section 4: Assets Loaded */}
                      <div className="mb-4">
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Assets Loaded</p>
                        {(d.glossaryFile || d.tmxFile) ? (
                          <div className="space-y-1">
                            {d.glossaryFile && (
                              <p className="text-[14px] text-gray-700">
                                <span className="text-emerald-400">&#10003;</span> Knowledge base loaded: <span className="text-gray-900 font-medium">{d.glossaryFile.name}</span>
                              </p>
                            )}
                            {d.tmxFile && (
                              <p className="text-[14px] text-gray-700">
                                <span className="text-emerald-400">&#10003;</span> Agent Memory loaded: <span className="text-gray-900 font-medium">{d.tmxFile.name}</span>
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[14px] text-gray-700">Starting fresh &mdash; I'll learn from every project</p>
                        )}
                      </div>

                      {/* Section 5: Trust Signals */}
                      <div className="border-t border-black/[0.12] pt-3 mb-4">
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Your data is protected</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 bg-gray-50 border border-black/[0.12] rounded-lg px-3 py-2">
                            <Shield className="w-4 h-4 text-gray-600 shrink-0" />
                            <div>
                              <span className="text-[13px] text-gray-900 font-medium">SOC 2 Type II</span>
                              <span className="block text-[12px] text-gray-600">Independently audited security controls</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 bg-gray-50 border border-black/[0.12] rounded-lg px-3 py-2">
                            <Lock className="w-4 h-4 text-gray-600 shrink-0" />
                            <div>
                              <span className="text-[13px] text-gray-900 font-medium">AES-256</span>
                              <span className="block text-[12px] text-gray-600">All data encrypted at rest and in transit</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 bg-gray-50 border border-black/[0.12] rounded-lg px-3 py-2">
                            <Globe className="w-4 h-4 text-gray-600 shrink-0" />
                            <div>
                              <span className="text-[13px] text-gray-900 font-medium">In-Region</span>
                              <span className="block text-[12px] text-gray-600">Data processed within your selected geographic region</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-[15px] text-gray-700">Your first project is ready. Let's go.</p>
                    </div>
                  </motion.div>
                )
              }
              return null
            })}
          </AnimatePresence>

          {/* Active input area */}
          {showInput && (
            <>
              {/* Stage: Welcome - Identity */}
              {stage === 'welcome' && (
                <InputArea reducedMotion={reducedMotion}>
                  <div className="flex gap-3 mb-2">
                    <select
                      value={userLanguage}
                      onChange={(e) => setUserLanguage(e.target.value)}
                      className={`flex-1 h-10 px-4 rounded-lg bg-white border border-black/[0.12] text-[14px] focus:outline-none focus:border-straker-400 transition-colors ${
                        userLanguage ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      <option value="" disabled>Primary language</option>
                      {LANGUAGES.map(l => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Your role (e.g. VP of Compliance)"
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleIdentitySubmit()}
                      className="flex-1 h-10 px-4 rounded-lg bg-white border border-black/[0.12] text-[14px] text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-straker-400 transition-colors"
                    />
                  </div>
                  <ContinueButton onClick={handleIdentitySubmit} disabled={!userLanguage || !userRole.trim()} />
                </InputArea>
              )}

              {/* Stage: Work - Locales + Primary + Content Types (two-column) */}
              {stage === 'work' && (
                <InputArea reducedMotion={reducedMotion}>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left column: Locale selection */}
                    <div>
                      <p className="text-[12px] uppercase tracking-wider text-gray-500 font-bold mb-2">Target Markets</p>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {LOCALES.map((locale) => {
                          const selected = targetLocales.includes(locale.code)
                          return (
                            <button
                              key={locale.code}
                              onClick={() => toggleLocale(locale.code)}
                              className={`h-10 px-3 rounded-lg text-[13px] font-medium flex items-center gap-2 cursor-pointer transition-all border ${
                                selected
                                  ? 'bg-straker-500 border-straker-400 text-white'
                                  : 'bg-white border-black/[0.12] text-gray-700 hover:border-black/[0.12]'
                              }`}
                            >
                              <span>{locale.flag}</span>
                              <span className="truncate">{locale.name}</span>
                            </button>
                          )
                        })}
                      </div>
                      {/* Primary market selector - appears after at least 1 locale selected */}
                      {targetLocales.length > 0 && (
                        <div>
                          <p className="text-[12px] text-gray-500 font-medium mb-1.5">Primary market:</p>
                          <div className="flex flex-wrap gap-2">
                            {targetLocales.map((code) => {
                              const locale = LOCALES.find(l => l.code === code)
                              if (!locale) return null
                              const isPrimary = primaryLocale === code
                              return (
                                <button
                                  key={code}
                                  onClick={() => setPrimaryLocale(code)}
                                  className={`h-8 px-3 rounded-full text-[12px] font-medium flex items-center gap-1.5 cursor-pointer transition-all border ${
                                    isPrimary
                                      ? 'bg-straker-500 border-straker-400 text-white'
                                      : 'bg-white border-black/[0.12] text-gray-700 hover:border-black/[0.12]'
                                  }`}
                                >
                                  <span>{locale.flag}</span>
                                  <span>{locale.name}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right column: Content type selection */}
                    <div>
                      <p className="text-[12px] uppercase tracking-wider text-gray-500 font-bold mb-2">Content Types</p>
                      <div className="grid grid-cols-2 gap-2">
                        {CONTENT_TYPES.map((ct) => {
                          const selected = contentTypes.includes(ct.id)
                          return (
                            <button
                              key={ct.id}
                              onClick={() => toggleContentType(ct.id)}
                              className={`h-10 px-3 rounded-lg text-[13px] font-medium flex items-center gap-2 cursor-pointer transition-all border ${
                                selected
                                  ? 'bg-straker-500 border-straker-400 text-white'
                                  : 'bg-white border-black/[0.12] text-gray-700 hover:border-black/[0.12]'
                              }`}
                            >
                              <span>{ct.icon}</span>
                              <span className="truncate">{ct.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <ContinueButton onClick={handleWorkSubmit} disabled={targetLocales.length === 0 || contentTypes.length === 0} />
                </InputArea>
              )}

              {/* Stage: Assets - Tone (pills) + File uploads */}
              {stage === 'assets' && (
                <InputArea reducedMotion={reducedMotion}>
                  {/* Tone selector - compact horizontal pills */}
                  <p className="text-[12px] uppercase tracking-wider text-gray-500 font-bold mb-2">Voice & Tone</p>
                  <div className="flex gap-2 mb-4">
                    {['formal', 'professional', 'conversational'].map(t => (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={`px-4 py-2 rounded-full text-[13px] font-medium border transition-all cursor-pointer ${
                          tone === t
                            ? 'bg-straker-500 border-straker-400 text-white'
                            : 'bg-white border-black/[0.12] text-gray-700 hover:border-black/[0.12]'
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Train Custom Agent — selector, not upload */}
                  <div className="space-y-1">
                    <div className="mb-4">
                      <p className="text-[12px] uppercase tracking-wider text-gray-500 font-bold mb-2">Train Custom Agent</p>
                      <button
                        onClick={() => {
                          // Placeholder — will navigate to agent training flow later
                          console.log('Navigate to Train Custom Agent flow')
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-black/[0.12] hover:border-straker-500/30 hover:bg-straker-500/[0.04] transition-all cursor-pointer text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-straker-50 flex items-center justify-center flex-shrink-0 group-hover:bg-straker-500/20 transition-colors">
                          <Sparkles className="w-4 h-4 text-straker-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] text-gray-900 font-medium">Bring your data to empower your Custom Agent</span>
                          <span className="block text-[11px] text-gray-500 mt-0.5">Teach your agent your brand voice, domain knowledge & rules</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-straker-600 transition-colors flex-shrink-0" />
                      </button>
                    </div>
                    <div className="mb-3">
                      <p className="text-[12px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">Style Guide URL</p>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={styleGuideUrl}
                        onChange={(e) => setStyleGuideUrl(e.target.value)}
                        className="w-full h-9 px-4 rounded-lg bg-white border border-black/[0.12] text-[13px] text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-straker-400 transition-colors"
                      />
                    </div>
                    <div className="mb-3">
                      <p className="text-[12px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">Protected Brand Terms</p>
                      <textarea
                        placeholder="Terms to preserve as-is (e.g., iPhone, Azure, Not Verify)"
                        value={dntTerms}
                        onChange={(e) => setDntTerms(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 rounded-lg bg-white border border-black/[0.12] text-[13px] text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-straker-400 transition-colors resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <ContinueButton onClick={handleAssetsSubmit} disabled={!tone} />
                    <button
                      onClick={handleAssetsSkip}
                      className="text-[13px] text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                    >
                      Skip &mdash; I'll build from scratch
                    </button>
                  </div>
                </InputArea>
              )}

              {/* Stage: Complete */}
              {stage === 'complete' && (
                <InputArea reducedMotion={reducedMotion}>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleComplete}
                    className="w-full h-14 bg-straker-600 hover:bg-straker-500 text-white font-semibold text-[16px] rounded-lg flex items-center justify-center gap-3 cursor-pointer transition-colors"
                  >
                    Enter Not Verify
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </InputArea>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
