import { useMemo } from 'react'
import {
  Trophy, Medal, Crown, Flame, Star, Award, Target, TrendingUp,
  TrendingDown, Minus, ShieldCheck, Gauge, Gift, Users, Sparkles,
  Clock, Anchor, ShieldOff, BadgeCheck, PiggyBank,
} from 'lucide-react'
import {
  leaderboard, tierDistribution, badgeGallery, seasonInfo,
  activeChallenges, teamStandings, customerValueSummary, REWARD_MECHANICS,
} from '../../services/hitl/gamification'
import { SectionHeading, Card, MonoLabel, ScoreBar } from './shared'

const BADGE_ICON = {
  ShieldCheck, Clock, Anchor, Target, ShieldOff, BadgeCheck, PiggyBank, Gauge,
}
const TIER_TONE = {
  ocean: 'bg-ocean/10 text-ocean border-ocean/30',
  teal:  'bg-teal/10 text-teal border-teal/30',
  amber: 'bg-amber/15 text-amber-deep border-amber/30',
  slate: 'bg-pale text-slate border-rule',
  mist:  'bg-rule/40 text-mist border-rule',
}

function DeltaPill({ delta }) {
  if (delta > 0) return <span className="inline-flex items-center gap-0.5 text-teal text-[11px]"><TrendingUp className="w-3 h-3" />{delta}</span>
  if (delta < 0) return <span className="inline-flex items-center gap-0.5 text-error text-[11px]"><TrendingDown className="w-3 h-3" />{Math.abs(delta)}</span>
  return <span className="inline-flex items-center gap-0.5 text-mist text-[11px]"><Minus className="w-3 h-3" /></span>
}

export default function EngagementHub() {
  const board = useMemo(() => leaderboard(), [])
  const tiers = useMemo(() => tierDistribution(), [])
  const badges = useMemo(() => badgeGallery(), [])
  const season = useMemo(() => seasonInfo(), [])
  const challenges = useMemo(() => activeChallenges(), [])
  const teams = useMemo(() => teamStandings(), [])
  const custValue = useMemo(() => customerValueSummary(), [])

  const podium = board.slice(0, 3)
  const rest = board.slice(3)

  return (
    <div>
      <SectionHeading
        title="Engagement Hub"
        subtitle="Gamification turns the network's real quality signals into recognition, competition, and momentum — lifting vendor engagement while compounding into measurable value for customers."
      />

      {/* ── Season banner ─────────────────────────────────────── */}
      <div className="rounded-lg border border-ocean/30 bg-gradient-to-r from-ocean/8 to-teal/8 p-5 mb-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-ocean" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <Sparkles className="w-3.5 h-3.5" /> Current season
            </div>
            <p className="text-[20px] font-semibold text-ink mt-1">{season.name}</p>
            <p className="text-[12.5px] text-slate mt-1 max-w-xl">{season.goal}</p>
          </div>
          <div className="flex items-center gap-6">
            <Stat big label="Days left" value={season.daysLeft} />
            <Stat big label="Prize pool" value={`${season.rewardPool.toLocaleString()} pts`} />
            <Stat big label="Players" value={board.length} />
          </div>
        </div>
      </div>

      {/* ── Leaderboard ───────────────────────────────────────── */}
      <Card padding="p-0" className="mb-6">
        <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber" />
          <p className="text-[13px] font-semibold text-ink">Network leaderboard</p>
          <span className="ml-auto text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>arbitr Score · live ranking</span>
        </div>

        {/* Podium */}
        <div className="grid grid-cols-3 gap-4 px-5 py-5 bg-cream/40">
          {podium.map((p, i) => {
            const PodIcon = i === 0 ? Crown : Medal
            const accent = i === 0 ? 'text-amber' : i === 1 ? 'text-slate' : 'text-amber-deep'
            return (
              <div key={p.vendorId} className={`rounded-lg border bg-white p-4 text-center ${i === 0 ? 'border-amber/40 shadow-sm -translate-y-1' : 'border-rule'}`}>
                <PodIcon className={`w-6 h-6 mx-auto ${accent}`} />
                <p className="text-[10px] uppercase tracking-wider text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>#{p.rank}</p>
                <p className="text-[14px] font-semibold text-ink mt-1 truncate">{p.name}</p>
                <p className="text-[22px] font-bold text-ink mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.score}</p>
                <span className={`inline-block mt-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${TIER_TONE[p.tier.color]}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.tier.label}</span>
                <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-mist">
                  <span className="inline-flex items-center gap-1"><Flame className="w-3 h-3 text-amber-deep" />{p.streak}</span>
                  <span>Lv {p.level}</span>
                  <DeltaPill delta={p.delta} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Remaining ranks */}
        <ul>
          {rest.map(p => (
            <li key={p.vendorId} className="px-5 py-3 border-t border-rule grid grid-cols-[2rem_1fr_auto_auto_auto_auto] gap-3 items-center text-[12.5px]">
              <span className="font-mono text-mist text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>#{p.rank}</span>
              <div className="min-w-0">
                <p className="text-ink font-medium truncate">{p.name}</p>
                <p className="text-[10.5px] text-mist">{p.region} · {p.type} · {p.taskCount} task{p.taskCount === 1 ? '' : 's'}</p>
              </div>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${TIER_TONE[p.tier.color]}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.tier.label}</span>
              <span className="inline-flex items-center gap-1 text-amber-deep"><Flame className="w-3.5 h-3.5" />{p.streak}</span>
              <DeltaPill delta={p.delta} />
              <span className="font-bold text-ink tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.score}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ── Tier ladder ─────────────────────────────────────── */}
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
            <Star className="w-4 h-4 text-amber" />
            <p className="text-[13px] font-semibold text-ink">Tier ladder</p>
          </div>
          <ul className="px-5 py-4 space-y-2.5">
            {tiers.map(t => (
              <li key={t.id} className="flex items-center gap-3">
                <span className={`w-20 text-[11px] uppercase tracking-wider text-center px-2 py-1 rounded-full border ${TIER_TONE[t.color]}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t.label}</span>
                <span className="text-[11px] text-mist w-16" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t.min}+</span>
                <div className="flex-1"><ScoreBar value={t.count} max={Math.max(1, board.length)} color="ocean" /></div>
                <span className="text-[12px] text-slate w-20 text-right">{t.count} vendor{t.count === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* ── Team standings ──────────────────────────────────── */}
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
            <Users className="w-4 h-4 text-ocean" />
            <p className="text-[13px] font-semibold text-ink">Team standings · by region</p>
          </div>
          <ul className="px-5 py-3">
            {teams.map((t, i) => (
              <li key={t.region} className="py-3 border-b border-rule last:border-b-0 flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${i === 0 ? 'bg-amber/20 text-amber-deep' : 'bg-pale text-slate'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{t.region}</p>
                  <p className="text-[10.5px] text-mist">{t.members} member{t.members === 1 ? '' : 's'} · top: {t.topPlayer}</p>
                </div>
                <span className="text-[16px] font-bold text-ink" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t.avgScore}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ── Badge gallery ─────────────────────────────────────── */}
      <Card padding="p-0" className="mb-6">
        <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
          <Award className="w-4 h-4 text-amber" />
          <p className="text-[13px] font-semibold text-ink">Achievement badges</p>
          <span className="ml-auto text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>earned across the network</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5">
          {badges.map(b => {
            const Icon = BADGE_ICON[b.icon] || Award
            const earned = b.earnedCount > 0
            return (
              <div key={b.id} className={`rounded-lg border p-3 ${earned ? 'border-amber/30 bg-amber/5' : 'border-rule bg-pale/40 opacity-70'}`}>
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${earned ? 'text-amber-deep' : 'text-mist'}`} />
                  <span className="text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{b.earnedCount}</span>
                </div>
                <p className="text-[12.5px] font-semibold text-ink mt-2">{b.name}</p>
                <p className="text-[11px] text-slate mt-0.5 leading-snug">{b.desc}</p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Active challenges ─────────────────────────────────── */}
      <Card padding="p-0" className="mb-6">
        <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
          <Target className="w-4 h-4 text-ocean" />
          <p className="text-[13px] font-semibold text-ink">Active challenges</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
          {challenges.map(c => (
            <div key={c.id} className="rounded-lg border border-rule p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{c.name}</p>
                  <p className="text-[11.5px] text-slate mt-0.5">{c.desc}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-deep shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  <Gift className="w-3.5 h-3.5" />{c.reward}
                </span>
              </div>
              <div className="mt-3"><ScoreBar value={c.progress} color="teal" /></div>
              <p className="text-[10.5px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.progress}% · {c.metric}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Customer value ────────────────────────────────────── */}
      <Card padding="p-0" className="mb-6">
        <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal" />
          <p className="text-[13px] font-semibold text-ink">Why this matters to customers</p>
        </div>
        <div className="p-5">
          <p className="text-[12.5px] text-slate mb-4 max-w-2xl">
            Recognition is tied to the same signals customers care about. As vendors compete to rank, the
            network's measurable quality compounds — fewer review cycles, faster delivery, and issues caught
            before they ever reach the client.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {custValue?.map(m => (
              <div key={m.id} className={`rounded-lg border p-4 ${m.tone === 'teal' ? 'border-teal/30 bg-teal/5' : m.tone === 'ocean' ? 'border-ocean/30 bg-ocean/5' : 'border-amber/30 bg-amber/5'}`}>
                <p className={`text-[24px] font-bold ${m.tone === 'teal' ? 'text-teal' : m.tone === 'ocean' ? 'text-ocean' : 'text-amber-deep'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{m.value}</p>
                <p className="text-[12px] font-semibold text-ink mt-1">{m.label}</p>
                <p className="text-[10.5px] text-mist mt-0.5 leading-snug">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Reward mechanics ──────────────────────────────────── */}
      <Card padding="p-0">
        <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
          <Gauge className="w-4 h-4 text-ocean" />
          <p className="text-[13px] font-semibold text-ink">How we gamify · reward mechanics</p>
        </div>
        <ul className="divide-y divide-rule">
          {REWARD_MECHANICS.map(r => (
            <li key={r.id} className="px-5 py-3 grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-2 md:gap-6">
              <div>
                <p className="text-[13px] font-semibold text-ink">{r.name}</p>
                <p className="text-[11.5px] text-slate mt-0.5">{r.desc}</p>
              </div>
              <p className="text-[11.5px] text-teal inline-flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span><span className="text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>customer&nbsp;value&nbsp;·&nbsp;</span>{r.valueToCustomer}</span>
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function Stat({ label, value, big }) {
  return (
    <div className="text-center">
      <p className={`font-bold text-ink ${big ? 'text-[22px]' : 'text-[16px]'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-mist mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</p>
    </div>
  )
}
