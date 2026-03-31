import { useState } from 'react'
import { Shield, Lock, Globe, Download } from 'lucide-react'
import Modal from './Modal'
import { useToast } from './ToastProvider'

const badges = [
  {
    id: 'soc2',
    icon: Shield,
    label: 'SOC 2 Type II',
    color: 'text-gray-600',
    bg: 'bg-gray-50 border-black/[0.12]',
    hasModal: true,
  },
  {
    id: 'aes',
    icon: Lock,
    label: 'AES-256',
    color: 'text-gray-600',
    bg: 'bg-gray-50 border-black/[0.12]',
    tooltip: 'All data encrypted at rest and in transit using AES-256 bit encryption.',
  },
  {
    id: 'region',
    icon: Globe,
    label: 'In-Region',
    color: 'text-gray-600',
    bg: 'bg-gray-50 border-black/[0.12]',
    tooltip: 'Data processed within your selected geographic region. Never transferred cross-border.',
  },
]

export default function TrustBadges() {
  const { addToast } = useToast()
  const [showSoc2Modal, setShowSoc2Modal] = useState(false)
  const [hoveredBadge, setHoveredBadge] = useState(null)

  return (
    <>
      <div className="flex items-center gap-2">
        {badges.map((badge) => {
          const Icon = badge.icon
          const isHovered = hoveredBadge === badge.id
          return (
            <div key={badge.id} className="relative">
              <button
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer hover:scale-[1.02] ${badge.bg} ${badge.color}`}
                onClick={badge.hasModal ? () => setShowSoc2Modal(true) : undefined}
                onMouseEnter={() => setHoveredBadge(badge.id)}
                onMouseLeave={() => setHoveredBadge(null)}
                aria-label={`${badge.label} security certification${badge.hasModal ? ' — click for details' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{badge.label}</span>
              </button>
              {badge.tooltip && isHovered && (
                <div
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 p-3 rounded-lg bg-gray-50 border border-black/[0.12]  text-[11px] text-gray-700 leading-relaxed z-50"
                  role="tooltip"
                >
                  {badge.tooltip}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-50 border-l border-t border-black/[0.12] rotate-45" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Modal isOpen={showSoc2Modal} onClose={() => setShowSoc2Modal(false)} title="SOC 2 Type II Verification" size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-lg">
            <Shield className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="text-[14px] font-semibold text-gray-900">Verified & Current</p>
              <p className="text-[12px] text-emerald-600/80">Last audited: January 2026</p>
            </div>
          </div>
          <div className="space-y-3">
            <ComplianceRow label="Security" desc="Access controls, encryption, network security" />
            <ComplianceRow label="Availability" desc="99.95% uptime SLA with redundancy" />
            <ComplianceRow label="Confidentiality" desc="Data classification and handling procedures" />
            <ComplianceRow label="Processing Integrity" desc="Quality assurance and error handling" />
            <ComplianceRow label="Privacy" desc="GDPR, CCPA, and APPI compliant" />
          </div>
          <div className="pt-2 border-t border-black/[0.12] flex items-center justify-between">
            <p className="text-[11px] text-gray-500">
              Full audit report available upon request.
            </p>
            <button
              onClick={() => addToast('Report download initiated', 'success')}
              className="flex items-center gap-1.5 text-straker-600 text-[12px] font-medium underline underline-offset-2 hover:text-straker-500 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Audit Report
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function ComplianceRow({ label, desc }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-100 rounded-lg border border-black/[0.06]">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
      <div>
        <p className="text-[13px] font-medium text-gray-900">{label}</p>
        <p className="text-[11px] text-gray-500">{desc}</p>
      </div>
    </div>
  )
}
