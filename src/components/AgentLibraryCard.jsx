import { motion } from 'framer-motion'
import {
  Shield, Landmark, Heart, Gavel, Code, Lock, ShieldCheck, ChevronRight,
  CheckCircle2,
} from 'lucide-react'
import TrustScoreBadge from './IntelligenceMarketplace/TrustScoreBadge'
import { ICON_COLOR_MAP } from './IntelligenceMarketplace/data/marketplaceCategories'

const SPRING = { type: 'spring', stiffness: 300, damping: 20 }

const ICON_COMPONENTS = { Shield, Landmark, Heart, Gavel, Code }

const TIER_STYLES = {
  Free:       'bg-gray-100 text-gray-500',
  Standard:   'bg-[#009eda]/10 text-[#009eda]',
  Premium:    'bg-violet-100 text-violet-600',
  Enterprise: 'bg-amber-100 text-amber-700',
}

export default function AgentLibraryCard({ agent, index, isAssigned, onSelect, reducedMotion }) {
  const isComingSoon = agent.status === 'coming_soon'
  const IconComponent = ICON_COMPONENTS[agent.icon] || Shield
  const iconColor = ICON_COLOR_MAP[agent.icon] || '#009eda'
  const tier = agent.roi?.tier
  const tierStyle = TIER_STYLES[tier] || TIER_STYLES.Standard
  const certs = agent.compliance?.certifications?.slice(0, 3) || []
  const langs = agent.languages?.slice(0, 4).map(l => l.toUpperCase()).join(' · ') || ''

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { ...SPRING, delay: index * 0.06 }}
      className="relative"
    >
      <div
        className={`relative rounded-lg border bg-white p-4 flex flex-col gap-3 transition-all ${
          isComingSoon
            ? 'border-black/[0.08] opacity-55 pointer-events-none select-none'
            : isAssigned
              ? 'border-emerald-500/30 bg-emerald-50/20 cursor-pointer hover:border-emerald-500/50'
              : 'border-black/[0.12] cursor-pointer hover:border-[#009eda]/40 hover:shadow-sm'
        }`}
        onClick={isComingSoon ? undefined : () => onSelect(agent)}
        role={isComingSoon ? undefined : 'button'}
        tabIndex={isComingSoon ? -1 : 0}
        onKeyDown={isComingSoon ? undefined : (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(agent) }
        }}
        aria-label={isComingSoon ? `${agent.name} — ${agent.comingSoonLabel}` : `View details for ${agent.name}`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${iconColor}18` }}
            >
              <IconComponent className="w-4 h-4" style={{ color: iconColor }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900 leading-snug">{agent.name}</p>
              <p className="text-[11px] text-gray-400">{agent.category}</p>
            </div>
          </div>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${tierStyle}`}>
            {tier}
          </span>
        </div>

        {/* Verified badge */}
        {!isComingSoon && (
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-medium text-emerald-700">System Verified</span>
            {isAssigned && (
              <>
                <span className="text-gray-300 mx-0.5">·</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-medium text-emerald-600">Assigned</span>
              </>
            )}
          </div>
        )}

        {/* Term count + languages */}
        <div className="text-[11px] text-gray-500 leading-relaxed">
          <span className="font-semibold text-gray-700">{agent.termCount}</span>
          {' '}{agent.termSource} Terms
          {langs && <span className="text-gray-400"> · {langs}</span>}
        </div>

        {/* Compliance pills */}
        {certs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {certs.map(cert => (
              <span
                key={cert}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-black/[0.06]"
              >
                {cert}
              </span>
            ))}
          </div>
        )}

        {/* Footer: trust score + CTA */}
        <div className="flex items-center justify-between pt-1 border-t border-black/[0.05]">
          {!isComingSoon ? (
            <>
              <TrustScoreBadge score={agent.trustScore} size="sm" reducedMotion={reducedMotion} />
              <button
                className="flex items-center gap-1 text-[11px] font-semibold text-[#009eda] hover:text-[#0089c4] transition-colors"
                onClick={(e) => { e.stopPropagation(); onSelect(agent) }}
                tabIndex={-1}
                aria-hidden="true"
              >
                View Details <ChevronRight className="w-3 h-3" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <Lock className="w-3 h-3" />
              <span>{agent.comingSoonLabel}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
