import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Sparkles, ArrowRight, Brain, Shield, BarChart3, MessageSquarePlus, Puzzle, Pen, Download, RefreshCw } from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'
import { useContentCreation } from '../context/ContentCreationStore'

const ASSISTANT_NAME = 'Sage'
const SPRING = { type: 'spring', stiffness: 300, damping: 20 }

/* ── Contextual suggestions the assistant can offer ── */
const QUICK_ACTIONS = [
  { id: 'quality', icon: BarChart3, label: 'Explain my confidence score', color: 'text-emerald-600 bg-emerald-50' },
  { id: 'agents', icon: Bot, label: 'Which agents should I use?', color: 'text-straker-600 bg-straker-50' },
  { id: 'orgbrain', icon: Brain, label: 'How is my Cortex growing?', color: 'text-violet-600 bg-violet-50' },
  { id: 'compliance', icon: Shield, label: 'What compliance flags exist?', color: 'text-amber-600 bg-amber-50' },
  { id: 'feedback', icon: MessageSquarePlus, label: 'Submit Feedback', color: 'text-sky-600 bg-sky-50' },
]

/* ── Integration quick action ── */
const INTEGRATION_ACTION = { id: 'integrations', icon: Puzzle, label: 'What can I automate?', color: 'text-teal-600 bg-teal-50' }

/* ── Creation-aware quick actions ── */
const CREATION_QUICK_ACTIONS = [
  { id: 'cr-score', icon: BarChart3, label: 'Why this confidence score?', color: 'text-emerald-600 bg-emerald-50' },
  { id: 'cr-compliance', icon: Shield, label: 'Improve compliance', color: 'text-amber-600 bg-amber-50' },
  { id: 'cr-tone', icon: Pen, label: 'Adjust tone or style', color: 'text-violet-600 bg-violet-50' },
  { id: 'cr-export', icon: Download, label: 'Export options', color: 'text-sky-600 bg-sky-50' },
  { id: 'cr-regen', icon: RefreshCw, label: 'Regenerate with latest models', color: 'text-teal-600 bg-teal-50' },
]

const CREATION_RESPONSES = {
  'cr-score': ['The **93% confidence score** breaks down as: **Terminology accuracy: 96%** (412 J-GAAP entries matched), **Brand voice alignment: 94%** (198 entries), **Regulatory compliance: 91%** (287 TSE entries, 1 minor currency flag), **Cultural adaptation: 89%** (regional conventions verified). The single compliance note about mixed currency formatting is what keeps it from 95%+.'],
  'cr-compliance': ['I found **1 minor compliance flag**: mixed currency denominations (\u00A5 and JPY) in the Financial Highlights section. To fix this, standardize all currency references to \u00A5 format per TSE filing conventions. This would likely push the confidence score from 93% to **95%**. Want me to apply this fix?'],
  'cr-tone': ['The current content uses **Formal** tone as configured. I can adjust to: \u2022 **Semi-formal** \u2014 slightly less rigid, suitable for internal distribution \u2022 **Executive** \u2014 more concise, action-oriented phrasing \u2022 **Client-facing** \u2014 warmer while maintaining professionalism. Which direction would you prefer?'],
  'cr-export': ['Available export formats: \u2022 **Word (.docx)** \u2014 editable document with formatting \u2022 **PDF** \u2014 final distribution format \u2022 **Clipboard** \u2014 plain text copy. You can export the version for any locale (EN, JA, DE, ZH) from the Content tab.'],
  'cr-regen': ['Your **Brand Voice model** was updated 2 days ago (v1.8 \u2192 v1.9) with 12 new entries from the Q3 compliance review. Regenerating with the latest version would cost **~30 credits** and may improve brand alignment by 2-3 points. Want me to proceed?'],
}

/* ── Canned responses keyed by quick action ── */
const CANNED_RESPONSES = {
  quality: [
    "Your current confidence score is **88%** across 3 locales. Japanese is the lowest at 84% — driven by 3 missing J-GAAP financial terms in your knowledge base.",
    "I'd recommend adding the flagged terms to your J-GAAP knowledge base. That alone would push JA confidence from 84% → 90%, bringing your overall to ~92%.",
  ],
  agents: [
    "For your Q3 Earnings Report, I've selected a 5-agent ensemble: **JP-FIN-3** (J-GAAP specialist), **Meridian Capital Digital Twin**, **Brand Voice Sentry**, **EU-REG-5**, and **Legal & Compliance**.",
    "JP-FIN-3 is your highest-impact agent — it provides +5 quality lift for Japanese financial content. Your Digital Twin ensures output matches Meridian Capital's established patterns.",
  ],
  orgbrain: [
    "Your Cortex has grown to **1,247 knowledge entries** across 6 domain models. In the last 30 days, you've added 47 new terms and 18 patterns.",
    "JP-FIN-3 (Japanese Financial) is your most active model with 412 entries and 96% accuracy. Your knowledge coverage is at 34% — strong for 6 months of operation.",
  ],
  compliance: [
    "You currently have **2 minor compliance flags** on the Q3 Earnings project: a TSE filing reference (SEG-042) and an ASBJ standard mapping (SEG-018).",
    "Neither flag blocks publication, but they require acknowledgment for your audit trail. You can resolve them inline on the Review tab, or assign them to an external reviewer.",
  ],
  feedback: [
    "We'd love to hear from you! Please share your feedback below — whether it's a feature request, a bug report, or general thoughts on your experience.",
    "Your input helps shape arbitr's roadmap. Just type your feedback in the chat and I'll log it for the product team. Include as much detail as you'd like!",
  ],
  integrations: [
    "You can automate actions across your connected tools at every pipeline step. For example: send a Slack message when a review is approved, create a Jira ticket when compliance flags an issue, or upload the final document to Google Drive automatically.",
    "Head to **Connected Tools** in the settings to connect your first integration, then use the **Workflow Builder** to set up automation rules.",
  ],
  'no-integration': [
    "It looks like that tool isn't connected yet. Head to **Connected Tools** to set it up — I'll be able to use it automatically once it's linked.",
  ],
  default: [
    "I'm your Intelligence Assistant. I can help you understand confidence scores, choose the right agents, track your Cortex growth, and navigate compliance requirements.",
    "Try asking me about any of those topics, or use the quick actions below.",
  ],
}

/* ── Sub-components ── */

function AssistantAvatar({ size = 'sm' }) {
  const s = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'
  const iconS = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  return (
    <div className={`${s} rounded-full bg-straker-50 flex items-center justify-center shrink-0`}>
      <Bot className={`${iconS} text-straker-600`} />
    </div>
  )
}

function ChatBubble({ type, children, reduced }) {
  const isBot = type === 'bot'
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : SPRING}
      className={`flex ${isBot ? 'items-start gap-2.5' : 'justify-end'}`}
    >
      {isBot && <AssistantAvatar />}
      <div
        className={`rounded-lg px-3.5 py-2.5 max-w-[85%] text-[13px] leading-relaxed ${
          isBot
            ? 'bg-gray-50 border border-black/[0.12] rounded-tl-md text-gray-800'
            : 'bg-straker-50 border border-straker-500/15 rounded-tr-md text-gray-800'
        }`}
      >
        {children}
      </div>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <AssistantAvatar />
      <div className="bg-gray-50 border border-black/[0.12] rounded-lg rounded-tl-md px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Main component ── */

export default function IntelligenceAssistant({ companyName, userName, currentPhase, connectedIntegrations = [], onOpenIntegrations }) {
  const { activeSession } = useContentCreation()
  const isCreationReview = currentPhase === 'create' && activeSession?.step === 'review'
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [showFabOnDashboard, setShowFabOnDashboard] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const reduced = useReducedMotion()

  // On dashboard, delay FAB appearance by 45s so it doesn't compete with primary CTA
  useEffect(() => {
    if (currentPhase !== 'dashboard' || hasOpened) return
    setShowFabOnDashboard(false)
    const t = setTimeout(() => setShowFabOnDashboard(true), 45000)
    return () => clearTimeout(t)
  }, [currentPhase, hasOpened])

  // FAB is visible when: user has already opened Sage, OR not on dashboard, OR idle timer fired
  const fabVisible = hasOpened || currentPhase !== 'dashboard' || showFabOnDashboard

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typing])

  // Focus input when panel opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open])

  // Initialize with welcome message on first open
  const handleOpen = useCallback(() => {
    setOpen(true)
    if (!hasOpened) {
      setHasOpened(true)
      const phaseContext = isCreationReview && activeSession
        ? ` I just helped generate your ${activeSession.contentTitle || 'document'} using ${activeSession.entriesUsed} knowledge entries across ${activeSession.domainsUsed?.join(', ') || 'multiple domains'}. The confidence score is ${activeSession.confidenceScore}%${activeSession.complianceNoteCount > 0 ? ` with ${activeSession.complianceNoteCount} minor compliance note${activeSession.complianceNoteCount > 1 ? 's' : ''}` : ''}. How can I help you refine it?`
        : currentPhase === 'dashboard'
          ? connectedIntegrations.length === 0
            ? " You're on the Intelligence Hub. Tip: connect tools like Slack and Google Drive so I can deliver your finished projects automatically."
            : " You're on the Intelligence Hub. Ready to start your first project?"
        : currentPhase === 'narrative' ? " You're reviewing the Governance report. I can explain any scores or flags."
        : currentPhase === 'human-review' ? " You're on the Review step. Need help with any flagged segments?"
        : currentPhase === 'org-brain' && connectedIntegrations.some(c => c.id === 'confluence')
          ? " I've updated the Cortex. Want me to sync new entries to your Confluence glossary?"
        : ' How can I help you today?'
      setMessages([
        {
          id: 'welcome',
          type: 'bot',
          text: `Hi${userName ? ` ${userName}` : ''}! I'm ${ASSISTANT_NAME}, your Intelligence Assistant${companyName ? ` for ${companyName}` : ''}.${phaseContext}`,
        },
      ])
    }
  }, [hasOpened, userName, companyName, currentPhase, connectedIntegrations, isCreationReview, activeSession])

  // Handle quick action click
  const handleQuickAction = useCallback((action) => {
    const allActions = [...QUICK_ACTIONS, ...CREATION_QUICK_ACTIONS]
    const label = allActions.find(a => a.id === action)?.label || action
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, type: 'user', text: label }])
    setTyping(true)

    const responses = CREATION_RESPONSES[action] || CANNED_RESPONSES[action] || CANNED_RESPONSES.default
    let delay = 600
    responses.forEach((text, i) => {
      setTimeout(() => {
        if (i === 0) setTyping(false)
        setMessages(prev => [...prev, { id: `bot-${Date.now()}-${i}`, type: 'bot', text }])
        if (i < responses.length - 1) setTyping(true)
      }, delay)
      delay += 800 + text.length * 4
    })
    setTimeout(() => setTyping(false), delay)
  }, [])

  // Handle free-text send
  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, type: 'user', text }])
    setTyping(true)

    // Simple keyword matching for demo
    const lower = text.toLowerCase()
    let responseKey = 'default'
    if (lower.includes('quality') || lower.includes('score')) responseKey = 'quality'
    else if (lower.includes('agent') || lower.includes('ensemble')) responseKey = 'agents'
    else if (lower.includes('Cortex') || lower.includes('knowledge') || lower.includes('brain')) responseKey = 'orgbrain'
    else if (lower.includes('compliance') || lower.includes('flag') || lower.includes('review')) responseKey = 'compliance'
    else if (lower.includes('automat') || lower.includes('workflow') || lower.includes('integrat') || lower.includes('connect')) responseKey = 'integrations'
    else if (lower.includes('slack') || lower.includes('jira') || lower.includes('drive') || lower.includes('salesforce')) {
      const toolNames = ['slack', 'jira', 'drive', 'salesforce', 'notion', 'confluence', 'github', 'asana', 'linear', 'hubspot']
      const mentioned = toolNames.find(t => lower.includes(t))
      const isConnected = connectedIntegrations.some(c => c.id === mentioned || c.name.toLowerCase().includes(mentioned || ''))
      responseKey = isConnected ? 'integrations' : 'no-integration'
    }
    else if (lower.includes('send') || lower.includes('upload') || lower.includes('notify') || lower.includes('create ticket')) responseKey = 'integrations'

    const responses = CANNED_RESPONSES[responseKey]
    let delay = 800
    responses.forEach((respText, i) => {
      setTimeout(() => {
        if (i === 0) setTyping(false)
        setMessages(prev => [...prev, { id: `bot-${Date.now()}-${i}`, type: 'bot', text: respText }])
        if (i < responses.length - 1) setTyping(true)
      }, delay)
      delay += 800 + respText.length * 4
    })
    setTimeout(() => setTyping(false), delay)
  }, [input])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open])

  return createPortal(
    <>
      {/* ── Floating Action Button ── */}
      <AnimatePresence>
        {!open && fabVisible && (
          <motion.button
            initial={reduced ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={SPRING}
            onClick={handleOpen}
            className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-straker-500 to-straker-700 shadow-lg shadow-straker-500/15 flex items-center justify-center cursor-pointer hover:shadow-straker-500/40 hover:scale-105 transition-all group"
            aria-label="Open Sage"
          >
            <Bot className="w-6 h-6 text-white" />
            {/* Tooltip */}
            <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-gray-50 border border-black/[0.12] text-[12px] text-gray-800 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Chat with Sage
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={SPRING}
            className="fixed bottom-6 right-6 z-[60] w-[400px] h-[560px] rounded-lg bg-white border border-black/[0.12]  shadow-black/10 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.12] bg-gray-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-straker-50 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-straker-600" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">{ASSISTANT_NAME}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-500">Intelligence Assistant</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-gray-500">Online</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-black/[0.06] transition-colors cursor-pointer"
                aria-label="Close assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            >
              {messages.map((msg) => (
                <ChatBubble key={msg.id} type={msg.type} reduced={reduced}>
                  {msg.text}
                </ChatBubble>
              ))}
              {typing && <TypingIndicator />}

              {/* Quick actions — show after welcome or when conversation is short */}
              {messages.length <= 2 && !typing && (
                <motion.div
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduced ? { duration: 0 } : { ...SPRING, delay: 0.2 }}
                  className="space-y-1.5 pt-2"
                >
                  <p className="text-[10px] uppercase tracking-wider text-gray-300 font-bold px-1 mb-2">
                    Quick Actions
                  </p>
                  {(isCreationReview ? CREATION_QUICK_ACTIONS : [...QUICK_ACTIONS, INTEGRATION_ACTION]).map((action) => {
                    const Icon = action.icon
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-black/[0.06] bg-black/[0.02] hover:bg-black/[0.06] hover:border-black/[0.12] transition-all cursor-pointer group text-left"
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${action.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[12px] text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                          {action.label}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 border-t border-black/[0.12] bg-white shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 border border-black/[0.12] rounded-lg px-3 py-2 focus-within:border-straker-500/40 transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-transparent text-[13px] text-gray-900 placeholder:text-gray-400 outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    input.trim()
                      ? 'bg-amber hover:bg-amber-deep text-white'
                      : 'bg-black/[0.03] text-gray-300'
                  }`}
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-gray-300 text-center mt-1.5">
                Powered by {ASSISTANT_NAME} · arbitr
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  )
}
