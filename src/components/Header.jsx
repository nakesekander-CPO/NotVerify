import { useState, useRef, useEffect } from 'react'
import { ChevronDown, User, Settings, Headphones, LogOut, Store } from 'lucide-react'
import StatusPill from './StatusPill'
import { USERS, ROLE_ASSIGNMENTS, ROLES, TENANTS } from '../data/rbacModel'

const CURRENT_USER_ID = 'alex'

export default function Header({ companyName, onOpenSettings, onOpenMarketplace, onNavigateHome }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const currentUser = USERS.find(u => u.id === CURRENT_USER_ID)
  const primaryAssignment = ROLE_ASSIGNMENTS.find(a => a.userId === CURRENT_USER_ID && a.scopeType === 'tenant') || ROLE_ASSIGNMENTS.find(a => a.userId === CURRENT_USER_ID)
  const roleName = ROLES.find(r => r.id === primaryAssignment?.roleId)?.name || 'User'
  const tenantName = TENANTS.find(t => t.id === primaryAssignment?.tenantId)?.name || ''
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
    <header className="bg-white border-b border-black/[0.12] sticky top-0 z-50" role="banner">
      <div className="max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1600px] mx-auto w-full px-6 lg:px-8 xl:px-12 2xl:px-16 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => onNavigateHome?.()}
          className="flex items-center gap-3 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          aria-label="Go to dashboard"
        >
          <img src="/logo.svg" alt="Not Verify" className="w-8 h-8" />
          <span className="text-gray-900 font-semibold text-[15px] tracking-tight">
            Not <span className="text-[#00BFFF]">Verify</span>
          </span>
          {companyName && (
            <>
              <div className="h-4 w-px bg-black/[0.08]" />
              <span className="text-[12px] text-gray-500 font-medium tracking-tight">{companyName}</span>
            </>
          )}
        </button>

        {/* Trust + Status + Account */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <StatusPill />
          </div>

          <div className="h-5 w-px bg-black/[0.04] hidden md:block" />

          {/* Account dropdown */}
          <div ref={accountRef} className="relative">
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/[0.04] transition-colors cursor-pointer"
              onClick={() => setAccountOpen(!accountOpen)}
              aria-expanded={accountOpen}
              aria-haspopup="true"
              aria-label="Account menu"
            >
              <div className="w-7 h-7 rounded-full bg-straker-600/30 border border-straker-500/30 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-straker-400" />
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
            </button>

            {accountOpen && (
              <div
                role="menu"
                className="absolute top-full mt-2 right-0 w-52 bg-white border border-black/[0.12] rounded-lg  py-1.5 z-50"
              >
                <div className="px-3 py-2 border-b border-black/[0.12] mb-1.5">
                  <p className="text-[12px] font-medium text-gray-900">{roleName}</p>
                  <p className="text-[11px] text-gray-500">{currentUser?.email || 'admin@meridian-capital.com'}</p>
                  {tenantName && <p className="text-[10px] text-gray-400 mt-0.5">{tenantName}</p>}
                </div>
                <DropdownItem icon={Settings} label="Settings" onClick={() => { setAccountOpen(false); onOpenSettings?.() }} />
                <DropdownItem icon={Store} label="Agent Marketplace" onClick={() => { setAccountOpen(false); onOpenMarketplace?.() }} />
                <DropdownItem icon={Headphones} label="Contact Support" onClick={() => { setAccountOpen(false); window.location.href = 'mailto:support@notverify.com' }} />
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
