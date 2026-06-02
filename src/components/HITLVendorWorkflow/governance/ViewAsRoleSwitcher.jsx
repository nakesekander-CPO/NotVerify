import { useState } from 'react'
import { ChevronDown, UserCog } from 'lucide-react'
import { PERSONAS, TIER_LABELS, tierForRole } from './capabilities'
import { useGovernance } from '../../../context/GovernanceStore'

export default function ViewAsRoleSwitcher() {
  const { currentRole, setCurrentRole } = useGovernance()
  const [open, setOpen] = useState(false)
  const active = PERSONAS.find(p => p.roleId === currentRole) || PERSONAS[0]

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold bg-pale text-ocean border border-rule cursor-pointer">
        <UserCog className="w-3.5 h-3.5" /> Viewing as: {active.label} <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-60 bg-white border border-rule rounded-lg shadow-lg z-50 p-1">
          {PERSONAS.map(p => (
            <button key={p.id} type="button"
              onClick={() => { setCurrentRole(p.roleId); setOpen(false) }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] cursor-pointer ${p.roleId === currentRole ? 'bg-pale text-ocean' : 'hover:bg-cream text-ink'}`}>
              <span>{p.label}</span>
              <span className="text-[10px] text-mist">{TIER_LABELS[tierForRole(p.roleId)]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
