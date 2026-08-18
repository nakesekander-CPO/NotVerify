import { useState } from 'react'
import { ArrowLeft, Puzzle, Building2, LayoutList, Shield, Users, ScrollText, Network, Receipt } from 'lucide-react'
import Billing from './Billing'
import BillingEntities from './BillingEntities'
import BudgetsAndAllocations from './BudgetsAndAllocations'
import OrgAccess from './OrgAccess'

export default function SettingsPage({ onBack, onOpenIntegrations }) {
  const [activeSection, setActiveSection] = useState('billing-v2')
  const [tier, setTier] = useState('pro')

  const handleTierChange = (newTier) => {
    setTier(newTier)
    if (newTier !== 'enterprise' && (activeSection === 'billing-entities' || activeSection === 'budgets' || activeSection.startsWith('org-'))) {
      setActiveSection('billing-v2')
    }
  }

  const navItems = [
    { id: 'billing-v2', label: 'Billing', icon: Receipt, active: true },
    ...(tier === 'enterprise' ? [
      { id: 'billing-entities', label: 'Billing Entities', icon: Building2, active: true, indent: true },
      { id: 'budgets', label: 'Budgets & Allocations', icon: LayoutList, active: true, indent: true },
    ] : []),
    { id: 'integrations', label: 'API & Integrations', icon: Puzzle, active: true },
    ...(tier === 'enterprise' ? [
      { type: 'section-header', label: 'Organization & Access' },
      { id: 'org-structure', label: 'Structure', icon: Network, active: true, indent: true },
      { id: 'org-members', label: 'Members', icon: Users, active: true, indent: true },
      { id: 'org-roles', label: 'Roles', icon: Shield, active: true, indent: true },
      { id: 'org-audit', label: 'Audit Log', icon: ScrollText, active: true, indent: true },
    ] : []),
  ]

  return (
    <div className="w-full max-w-[960px] flex flex-col">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors mb-6 self-start cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 flex flex-col gap-0.5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Settings</p>
          {navItems.map(item => (
            item.type === 'section-header' ? (
              <p key={item.label} className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1.5 mt-4">{item.label}</p>
            ) : (
              <NavItem
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                onClick={() => {
                  if (!item.active) return
                  if (item.id === 'integrations') { onOpenIntegrations?.(); return }
                  setActiveSection(item.id)
                }}
              />
            )
          ))}
        </nav>

        {/* Divider */}
        <div className="w-px bg-black/[0.08] shrink-0" />

        {/* Content */}
        <div className="flex-1 min-w-0 pb-12">
          {/* Tier demo switcher */}
          <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg bg-gray-50 border border-black/[0.06]">
            <span className="text-[11px] text-gray-400 shrink-0">Preview tier:</span>
            <div className="flex items-center gap-1">
              {[
                { value: 'standard', label: 'Standard' },
                { value: 'pro', label: 'Pro / Team' },
                { value: 'enterprise', label: 'Enterprise' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleTierChange(value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    tier === value
                      ? 'bg-[#3D16FA] text-white'
                      : 'text-gray-500 hover:bg-black/[0.05] hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeSection === 'billing-v2' && <Billing tier={tier} />}
          {activeSection === 'billing-entities' && <BillingEntities />}
          {activeSection === 'budgets' && <BudgetsAndAllocations />}
          {activeSection.startsWith('org-') && <OrgAccess activeTab={activeSection.replace('org-', '')} tier={tier} />}
        </div>
      </div>
    </div>
  )
}

function NavItem({ item, isActive, onClick }) {
  const { icon: Icon, label, indent } = item
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full py-2 rounded-lg text-[13px] transition-colors text-left cursor-pointer ${
        indent ? 'pl-7 pr-3' : 'px-3'
      } ${
        isActive
          ? 'bg-[#3D16FA]/10 text-[#3D16FA] font-medium'
          : 'text-gray-600 hover:bg-black/[0.04] hover:text-gray-900'
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </button>
  )
}
