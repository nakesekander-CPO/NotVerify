import { Shield, Landmark, Heart, Gavel, Code, CheckCircle2 } from 'lucide-react'
import Drawer from './Drawer'
import TrustScoreBadge from './IntelligenceMarketplace/TrustScoreBadge'
import { ICON_COLOR_MAP } from './IntelligenceMarketplace/data/marketplaceCategories'

const ICON_COMPONENTS = { Shield, Landmark, Heart, Gavel, Code }

const TIER_STYLES = {
  Free:       'bg-gray-100 text-gray-500',
  Standard:   'bg-[#3D16FA]/10 text-[#3D16FA]',
  Premium:    'bg-violet-100 text-violet-600',
  Enterprise: 'bg-amber-100 text-amber-700',
}

export default function AgentAssignDrawer({ agent, isOpen, onClose, onAssign, isAlreadyAssigned }) {
  if (!agent) return null

  const IconComponent = ICON_COMPONENTS[agent.icon] || Shield
  const iconColor = ICON_COLOR_MAP[agent.icon] || '#3D16FA'
  const tier = agent.roi?.tier
  const tierStyle = TIER_STYLES[tier] || TIER_STYLES.Standard
  const certs = agent.compliance?.certifications || []
  const langs = agent.languages?.slice(0, 5).map(l => l.toUpperCase()).join(' · ') || ''

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={agent.name || 'Agent Details'} width="md">
      <div className="flex flex-col gap-6">

        {/* ── Section 1: Agent Header ── */}
        <div className="flex items-start gap-4 pb-5 border-b border-black/[0.08]">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${iconColor}18` }}
          >
            <IconComponent className="w-6 h-6" style={{ color: iconColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-[15px] font-semibold text-gray-900">{agent.name}</h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tierStyle}`}>{tier}</span>
            </div>
            <p className="text-[12px] text-gray-500 mb-2">{agent.category} · {agent.provider}</p>

            {/* Term count */}
            <p className="text-[12px] text-gray-700">
              <span className="font-semibold">{agent.termCount}</span> {agent.termSource} Terms
            </p>

            {/* Languages */}
            {langs && (
              <p className="text-[11px] text-gray-400 mt-0.5">{langs}</p>
            )}
          </div>
          <TrustScoreBadge score={agent.trustScore} size="md" />
        </div>

        {/* Compliance certs */}
        {certs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 -mt-2">
            {certs.map(cert => (
              <span
                key={cert}
                className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-black/[0.06]"
              >
                {cert}
              </span>
            ))}
          </div>
        )}

        {/* ── Section 2: Capabilities ── */}
        {agent.capabilityBullets?.length > 0 && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              Capabilities
            </h4>
            <ul className="flex flex-col gap-2">
              {agent.capabilityBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-[13px] text-gray-700 leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Section 3: Sample Terminology ── */}
        {agent.sampleTerms?.length > 0 && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              Sample Terminology
            </h4>
            <div className="rounded-lg border border-black/[0.10] overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-black/[0.08]">
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold">Term</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold">Generic AI</th>
                    <th className="text-left px-3 py-2 text-[#3D16FA] font-semibold bg-[#3D16FA]/[0.04]">
                      This Agent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {agent.sampleTerms.map((row, i) => (
                    <tr
                      key={i}
                      className={i < agent.sampleTerms.length - 1 ? 'border-b border-black/[0.06]' : ''}
                    >
                      <td className="px-3 py-2.5 text-gray-700 font-medium">{row.term}</td>
                      <td className="px-3 py-2.5 text-gray-500 font-mono">{row.baseline}</td>
                      <td className="px-3 py-2.5 text-gray-900 font-mono bg-emerald-50/40">{row.agentOutput}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-400 mt-2 italic">
              Baseline uses a generic LLM without domain specialization.
            </p>
          </div>
        )}

        {/* ── Section 4: CTA ── */}
        <div className="pt-2 border-t border-black/[0.08]">
          <button
            onClick={() => { onAssign(agent); onClose() }}
            disabled={isAlreadyAssigned}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-[14px] font-semibold transition-all ${
              isAlreadyAssigned
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                : 'bg-[#3D16FA] hover:bg-[#0089c4] text-white cursor-pointer'
            }`}
          >
            {isAlreadyAssigned ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Assigned to Pipeline
              </>
            ) : (
              'Assign Agent to Pipeline'
            )}
          </button>
          {!isAlreadyAssigned && (
            <p className="text-[11px] text-gray-400 text-center mt-2">
              This agent will be added to your active ensemble and affect confidence projections.
            </p>
          )}
        </div>
      </div>
    </Drawer>
  )
}
