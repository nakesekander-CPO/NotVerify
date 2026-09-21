import { useState, useRef, useEffect } from 'react'
import { ChevronDown, User, Settings, Headphones, LogOut, Store, Workflow } from 'lucide-react'
import StatusPill from './StatusPill'
import { USERS, TENANTS } from '../data/rbacModel'
import { primaryRoleOf, grantsForUser } from '../services/rbac/engine'
import { useViewAs, VIEW_AS_IDS } from '../services/rbac/viewAs'

export default function Header({ companyName, onOpenSettings, onOpenMarketplace, onNavigateHome, onOpenHitlWorkflow }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [viewAs, setViewAs] = useViewAs()
  const currentUser = USERS.find(u => u.id === viewAs)
  const primary = primaryRoleOf(viewAs)
  const roleName = primary?.role?.name || 'User'
  const tenantName = TENANTS.find(t => t.id === primary?.tenantId)?.name || ''
  // The support persona's access is time-boxed — the chip goes red the
  // moment every grant it holds has expired.
  const allExpired = (id) => {
    const rows = grantsForUser(id, 'meridian')
    return rows.length > 0 && rows.every(r => r.expired)
  }
  const accountRef = useRef(null)

  useEffect(() => {
    if (!accountOpen) return
    const handleClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false)
    }
    const handleEsc = (e) => { if (e.key === 'Escape') setAccountOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [accountOpen])

  return (
    // Split Frame: the chrome is Midnight — arbitr as the dark trust layer
    // above the white work surface it governs (DS v2).
    <header className="bg-midnight border-b border-inkslate sticky top-0 z-50" role="banner">
      <div className="max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1600px] mx-auto w-full px-6 lg:px-8 xl:px-12 2xl:px-16 h-16 flex items-center justify-between gap-4">
        {/* Logo — rendered white on the dark chrome */}
        <button
          onClick={() => onNavigateHome?.()}
          className="flex items-center gap-3 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          aria-label="Go to dashboard"
        >
          {/* DS v2 reversed wordmark — white letterforms + cyan lens ring,
              the released artwork for dark grounds (no CSS filter needed) */}
          {/* BASE_URL-aware: the deployed site serves under /NotVerify/, so an
              absolute /… path 404s there (this was the broken-logo bug). */}
          <img src={`${import.meta.env.BASE_URL}wordmark-reversed.svg`} alt="arbitr" className="h-[18px] w-auto" />
          {companyName && (
            <>
              <div className="h-4 w-px bg-white/15" />
              <span className="text-[12px] text-white/60 font-medium tracking-tight">{companyName}</span>
            </>
          )}
        </button>

        {/* Trust + Status + Account */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <StatusPill />
          </div>

          <div className="h-5 w-px bg-white/15 hidden md:block" />

          {/* Account dropdown */}
          <div ref={accountRef} className="relative">
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => setAccountOpen(!accountOpen)}
              aria-expanded={accountOpen}
              aria-haspopup="true"
              aria-label="Account menu"
            >
              <div className="w-7 h-7 rounded-full bg-lens/15 border border-lens/40 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-lens" />
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
            </button>

            {accountOpen && (
              <div
                role="menu"
                className="absolute top-full mt-2 right-0 w-52 bg-white border border-black/[0.12] rounded-lg  py-1.5 z-50"
              >
                <div className="px-3 py-2 border-b border-black/[0.12] mb-1.5">
                  <p className="text-[12px] font-medium text-gray-900">{currentUser?.name} · {roleName}</p>
                  <p className="text-[11px] text-gray-500">{currentUser?.email || 'admin@meridian-capital.com'}</p>
                  {tenantName && <p className="text-[10px] text-gray-400 mt-0.5">{tenantName}</p>}
                </div>
                {/* View as — every panel re-renders through the engine */}
                <div className="px-3 pt-1 pb-2 border-b border-black/[0.12] mb-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">View as</p>
                  {VIEW_AS_IDS.map(id => {
                    const u = USERS.find(x => x.id === id)
                    const role = primaryRoleOf(id)?.role?.name || '—'
                    const expired = allExpired(id)
                    return (
                      <button key={id} role="menuitem" onClick={() => { setViewAs(id) }}
                        className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-[12px] cursor-pointer transition-colors ${viewAs === id ? 'bg-[#3D16FA]/10 text-[#3D16FA] font-medium' : 'text-gray-700 hover:bg-black/[0.04]'}`}>
                        <span className="truncate">{u?.name}</span>
                        <span className={`text-[10px] ml-2 shrink-0 ${expired ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                          {expired ? 'expired' : role}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <DropdownItem icon={Settings} label="Settings" onClick={() => { setAccountOpen(false); onOpenSettings?.() }} />
                <DropdownItem icon={Workflow} label="HITL Vendor Workflow" onClick={() => { setAccountOpen(false); onOpenHitlWorkflow?.() }} />
                <DropdownItem icon={Store} label="Intelligence Marketplace" onClick={() => { setAccountOpen(false); onOpenMarketplace?.() }} />
                <DropdownItem icon={Headphones} label="Contact Support" onClick={() => { setAccountOpen(false); window.location.href = 'mailto:support@arbitr.com' }} />
                <div className="border-t border-black/[0.12] my-1.5" />
                <DropdownItem icon={LogOut} label="Sign Out" onClick={() => { setAccountOpen(false); window.location.reload() }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function DropdownItem({ icon: Icon, label, onClick }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-black/[0.04] hover:text-gray-900 cursor-pointer transition-colors"
    >
      <Icon className="w-3.5 h-3.5 text-gray-400" />
      <span>{label}</span>
    </button>
  )
}
