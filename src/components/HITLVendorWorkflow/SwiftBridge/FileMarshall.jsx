/**
 * SwiftBridge — File Marshall intake (PPTX prep).
 *
 * Three pieces of the pre-workflow story:
 *   MarshallScan   — File Marshall walks the deck (8 slides) and reports
 *                    the source issues that would break translation/layout.
 *   SageChoice     — Sage hands the client the prep decision: fix it
 *                    yourself (72h clock, faster) or we fix it via the
 *                    arbitr DTP pipeline (96h, zero effort).
 *   TermEvidencePanel — per-term proof that the Terminology Guardian
 *                    checked AND applied the client glossary (before→after,
 *                    slide numbers, pending terms held).
 */

import { useEffect, useState } from 'react'
import {
  ScanSearch, Sparkles, Clock, Download, ChevronRight, CheckCircle2,
  AlertTriangle, Wrench, UserCog, BookOpen,
} from 'lucide-react'
import { PREP_CHOICES } from '../../../services/swiftbridge/swiftbridgeModel'
import useReducedMotion from '../../../hooks/useReducedMotion'
import { Card, MonoLabel } from '../shared'

const SEVERITY_TONE = {
  critical: 'bg-error/10 text-error border-error/30',
  major: 'bg-[#FFF7E6] text-[#996800] border-[#FFB000]/40',
  minor: 'bg-pale text-slate border-rule',
}

/* ── File Marshall scan ──────────────────────────────────────── */

export function MarshallScan({ scan, onContinue }) {
  const reduced = useReducedMotion()
  const [scanning, setScanning] = useState(!reduced)
  const [slideDone, setSlideDone] = useState(reduced ? scan.slides : 0)

  useEffect(() => {
    if (reduced) return
    if (slideDone >= scan.slides) { setScanning(false); return }
    const t = setTimeout(() => setSlideDone(n => n + 1), 190)
    return () => clearTimeout(t)
  }, [slideDone, scan.slides, reduced])

  const issueSlides = new Set(scan.issues.map(i => i.slide))

  return (
    <Card padding="p-0">
      <div className="px-5 py-3 border-b border-rule flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ocean/10 flex items-center justify-center"><ScanSearch className="w-4 h-4 text-ocean" /></div>
          <div>
            <p className="text-[13px] font-semibold text-ink">File Marshall · ファイル診断</p>
            <p className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {scan.scannedBy.id} · scanning {scan.fileName}
            </p>
          </div>
        </div>
        {!scanning && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Chip tone="bg-white text-ink border-rule">{scan.slides} slides</Chip>
            <Chip tone={SEVERITY_TONE.critical}>{scan.critical} critical</Chip>
            <Chip tone={SEVERITY_TONE.major}>{scan.major} major</Chip>
            <Chip tone={SEVERITY_TONE.minor}>{scan.minor} minor</Chip>
          </div>
        )}
      </div>

      {/* Slide strip */}
      <div className="px-5 pt-4">
        <MonoLabel>Slides {scanning ? `· scanning ${Math.min(slideDone + 1, scan.slides)}/${scan.slides}` : '· scan complete'}</MonoLabel>
        <div className="grid grid-cols-8 gap-2 mt-2">
          {Array.from({ length: scan.slides }, (_, i) => i + 1).map(n => {
            const scanned = n <= slideDone
            const flagged = scanned && issueSlides.has(n)
            return (
              <div key={n} className={`aspect-[4/3] rounded-lg border flex flex-col items-center justify-center transition-colors duration-300 ${!scanned ? 'border-rule bg-pale/40 text-mist' : flagged ? 'border-[#FFB000]/50 bg-[#FFF7E6] text-[#996800]' : 'border-teal/40 bg-teal/5 text-teal'}`}>
                <span className="text-[13px] font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{n}</span>
                {scanned && (flagged
                  ? <AlertTriangle className="w-3 h-3 mt-0.5" />
                  : <CheckCircle2 className="w-3 h-3 mt-0.5" />)}
              </div>
            )
          })}
        </div>
      </div>

      {/* Issue report */}
      {!scanning && (
        <>
          <div className="px-5 pt-4">
            <MonoLabel>Issues to fix before translation · 修正が必要な項目</MonoLabel>
            <ul className="mt-2 divide-y divide-rule/70 border border-rule rounded-lg overflow-hidden">
              {scan.issues.map(i => (
                <li key={i.id} className="px-3.5 py-2.5 flex items-start gap-3 bg-white">
                  <span className={`text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${SEVERITY_TONE[i.severity]}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{i.severity}</span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-ink font-medium">
                      <span className="text-mist font-normal" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Slide {i.slide} · </span>
                      {i.issue} <span className="text-mist font-normal">· {i.issueJa}</span>
                    </p>
                    <p className="text-[11px] text-slate mt-0.5">{i.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="px-5 py-4 flex justify-end">
            <button onClick={onContinue} className="px-4 py-2 rounded-lg bg-amber hover:bg-amber-deep text-white text-[13px] font-semibold cursor-pointer inline-flex items-center gap-2">
              Hand off to Sage <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </Card>
  )
}

function Chip({ children, tone }) {
  return <span className={`text-[10.5px] px-2 py-0.5 rounded-full border ${tone}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{children}</span>
}

/* ── Sage prep choice ────────────────────────────────────────── */

export function SageChoice({ scan, choice, onChoose, onContinue }) {
  const eta = (hours) => new Date(Date.now() + hours * 3600_000)
    .toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <Card padding="p-0">
      {/* Sage message */}
      <div className="px-5 py-4 border-b border-rule bg-pale/40">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-ocean flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4 text-white" /></div>
          <div>
            <p className="text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Sage · arbitr assistant</p>
            <p className="text-[13px] text-ink mt-1 leading-relaxed max-w-2xl">
              File Marshall found <strong>{scan.issues.length} source issues</strong> across your {scan.slides} slides
              that would break the translated layout. You have two ways forward — the delivery
              commitment changes with your choice.
            </p>
          </div>
        </div>
      </div>

      {/* The two paths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
        <ChoiceCard
          active={choice === 'self_fix'}
          onClick={() => onChoose('self_fix')}
          icon={UserCog}
          title="Fix it yourself"
          titleJa="お客様ご自身で修正"
          sla={PREP_CHOICES.self_fix}
          fast
          points={[
            'We send you the prep checklist for all 6 issues',
            'Re-upload the fixed deck — the 72h clock starts then',
            'Fastest path to delivery',
          ]}
          extra={
            <span className="inline-flex items-center gap-3 mt-2">
              <button onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[11px] text-ocean hover:text-ocean/80 cursor-pointer underline underline-offset-2">
                <Download className="w-3 h-3" /> Download prep checklist
              </button>
              <button onClick={(e) => e.stopPropagation()} className="text-[11px] text-ocean hover:text-ocean/80 cursor-pointer underline underline-offset-2">
                See delivery timeframes
              </button>
            </span>
          }
        />
        <ChoiceCard
          active={choice === 'dtp_fix'}
          onClick={() => onChoose('dtp_fix')}
          icon={Wrench}
          title="We fix it for you"
          titleJa="SwiftBridgeにお任せ"
          sla={PREP_CHOICES.dtp_fix}
          points={[
            'arbitr DTP pipeline repairs all 6 issues first',
            '24h pre-flight, then the standard 72h workflow',
            'Zero effort on your side',
          ]}
        />
      </div>

      {/* ETA compare + continue */}
      <div className="px-5 pb-5 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] text-slate">
          <Clock className="w-3 h-3 inline -mt-0.5 mr-1 text-mist" />
          Estimated delivery — yourself: <span className="font-semibold text-ink">{eta(72)}</span>
          <span className="text-mist"> · </span>
          we fix: <span className="font-semibold text-ink">{eta(96)}</span>
        </p>
        <button onClick={onContinue} disabled={!choice}
          className="px-4 py-2 rounded-lg bg-amber hover:bg-amber-deep text-white text-[13px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2">
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </Card>
  )
}

function ChoiceCard({ active, onClick, icon: Icon, title, titleJa, sla, points, fast, extra }) {
  // div-with-button-role, not <button>: the card contains its own links
  // (checklist download etc.) and buttons cannot nest.
  return (
    <div role="button" tabIndex={0} aria-pressed={active} onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={`text-left rounded-xl border p-4 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 ${active ? 'border-ocean bg-ocean/5' : 'border-rule hover:border-ocean/40'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-ocean text-white' : 'bg-pale text-slate'}`}><Icon className="w-4 h-4" /></span>
          <span>
            <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
            <span className="block text-[10.5px] text-mist">{titleJa}</span>
          </span>
        </span>
        <span className={`text-[10.5px] px-2 py-1 rounded-full border whitespace-nowrap ${fast ? 'bg-teal/10 text-teal border-teal/30' : 'bg-pale text-slate border-rule'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {sla.label}{fast ? ' · faster' : ''}
        </span>
      </div>
      <ul className="mt-3 space-y-1">
        {points.map(p => (
          <li key={p} className="text-[11.5px] text-slate flex items-start gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-teal shrink-0 mt-0.5" /> {p}
          </li>
        ))}
      </ul>
      <p className="text-[10.5px] text-mist mt-2">{sla.note}</p>
      {extra}
      {active && <p className="text-[10px] text-ocean mt-2 font-semibold uppercase tracking-wider">Selected</p>}
    </div>
  )
}

/* ── Terminology evidence panel ──────────────────────────────── */

const ACTION_TONE = {
  applied: { label: 'Applied', tone: 'bg-[#FFF7E6] text-[#996800] border-[#FFB000]/40' },
  pass: { label: 'Pass', tone: 'bg-teal/10 text-teal border-teal/30' },
  held: { label: 'Held', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
}

export function TermEvidencePanel({ evidence }) {
  return (
    <div className="mt-2 rounded-lg border border-rule bg-pale/30 overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-rule flex items-center justify-between gap-2 flex-wrap bg-white">
        <p className="text-[11.5px] font-semibold text-ink inline-flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-ocean" /> Terminology evidence · {evidence.glossaryName}
        </p>
        <p className="text-[10.5px] text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {evidence.checked} terms checked · <span className="text-[#996800] font-semibold">{evidence.applied} corrections applied</span> · {evidence.held} held for client · {evidence.violationsRemaining} violations remaining
        </p>
      </div>
      <ul className="divide-y divide-rule/60">
        {evidence.rows.map(r => (
          <li key={r.term.id} className="px-3.5 py-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 items-baseline bg-white/60">
            <span className={`text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${ACTION_TONE[r.action].tone}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {ACTION_TONE[r.action].label}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] text-ink">
                <span className="font-medium">{r.term.ja}</span>
                {r.action === 'applied' && <> → <span className="line-through text-error/70">{r.before}</span> → <span className="font-semibold text-ink">{r.after}</span></>}
                {r.action === 'pass' && <> → <span className="font-medium">{r.after}</span></>}
                {r.action === 'held' && <span className="text-mist"> — not applied</span>}
                <span className="text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}> · slide {r.slide}</span>
              </p>
              <p className="text-[10.5px] text-slate">{r.reason}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="px-3.5 py-2 text-[10px] text-mist border-t border-rule/60" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        Checked and applied by {evidence.agent.id} · {evidence.agent.name} — pending glossary terms are never applied without client approval
      </p>
    </div>
  )
}
