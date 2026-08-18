import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Shield, Lock } from 'lucide-react';
import useReducedMotion from '../hooks/useReducedMotion';

/* ───────────────────────── Mock Data ───────────────────────── */

const DEPARTMENTS = [
  {
    label: 'Leadership',
    color: '#A38DFF', // violet for avatars
    members: [
      {
        id: 'alex',
        name: 'Alex Chen',
        initials: 'AC',
        role: 'VP Global Intelligence',
        region: 'Global',
        regionCode: 'Global',
        location: 'Global',
        status: 'online',
        permission: 'approve',
        isSelf: true,
      },
    ],
  },
  {
    label: 'Regional Leads',
    color: '#3D16FA', // straker-500
    members: [
      {
        id: 'kenji',
        name: 'Kenji Tanaka',
        initials: 'KT',
        role: 'Regional Marketing Lead (APAC)',
        region: 'APAC',
        regionCode: 'APAC',
        location: 'Tokyo',
        status: 'online',
        permission: 'approve',
      },
      {
        id: 'sarah',
        name: 'Sarah Chen',
        initials: 'SC',
        role: 'Senior Linguist (APAC)',
        region: 'APAC',
        regionCode: 'APAC',
        location: 'Singapore',
        status: 'online',
        permission: 'approve',
      },
      {
        id: 'marcus',
        name: 'Marcus Weber',
        initials: 'MW',
        role: 'Regional Marketing Lead (EMEA)',
        region: 'EMEA',
        regionCode: 'EMEA',
        location: 'Berlin',
        status: 'away',
        permission: 'approve',
      },
      {
        id: 'priya',
        name: 'Priya Sharma',
        initials: 'PS',
        role: 'Legal Auditor (APAC)',
        region: 'APAC',
        regionCode: 'APAC',
        location: 'Mumbai',
        status: 'offline',
        permission: 'approve',
      },
    ],
  },
  {
    label: 'Compliance & Legal',
    color: '#26F2FF', // cyan
    members: [
      {
        id: 'thomas',
        name: 'Thomas Anderson',
        initials: 'TA',
        role: 'Legal Auditor (EU)',
        region: 'EMEA',
        regionCode: 'EMEA',
        location: 'Frankfurt',
        status: 'online',
        permission: 'approve',
      },
      {
        id: 'maria',
        name: 'Maria Santos',
        initials: 'MS',
        role: 'Compliance Officer',
        region: 'Americas',
        regionCode: 'Americas',
        location: 'São Paulo',
        status: 'online',
        permission: 'approve',
      },
      {
        id: 'james',
        name: 'James O\'Brien',
        initials: 'JO',
        role: 'Data Privacy Officer',
        region: 'EMEA',
        regionCode: 'EMEA',
        location: 'Dublin',
        status: 'online',
        permission: 'approve',
      },
    ],
  },
  {
    label: 'Quality & Linguistics',
    color: '#00B887', // emerald
    members: [
      {
        id: 'yuki',
        name: 'Yuki Watanabe',
        initials: 'YW',
        role: 'Senior QA Lead (JA)',
        region: 'APAC',
        regionCode: 'APAC',
        location: 'Osaka',
        status: 'online',
        permission: 'review',
      },
      {
        id: 'lena',
        name: 'Lena Müller',
        initials: 'LM',
        role: 'Linguistic QA (DE)',
        region: 'EMEA',
        regionCode: 'EMEA',
        location: 'Munich',
        status: 'away',
        permission: 'review',
      },
      {
        id: 'wei',
        name: 'Wei Zhang',
        initials: 'WZ',
        role: 'Linguistic QA (ZH)',
        region: 'APAC',
        regionCode: 'APAC',
        location: 'Shanghai',
        status: 'online',
        permission: 'review',
      },
    ],
  },
];

const PERMISSION_CONFIG = {
  approve: {
    label: 'Can approve & publish',
    className: 'bg-emerald-50 text-emerald-600 border-emerald-500/20',
  },
  review: {
    label: 'Can review & comment',
    className: 'bg-blue-50 text-blue-600 border-blue-500/20',
  },
  view: {
    label: 'View only',
    className: 'bg-gray-50 text-gray-500 border-gray-500/20',
  },
};

const STATUS_DOT = {
  online: 'bg-emerald-400',
  away: 'bg-amber-400',
  offline: 'bg-slate-500',
};

const SPRING = { type: 'spring', stiffness: 300, damping: 20 };

const PRIORITIES = ['Normal', 'Urgent', 'Critical'];
const PRIORITY_COLORS = {
  Normal: 'bg-black/[0.04] text-gray-700 border-black/[0.12]',
  Urgent: 'bg-amber-50 text-amber-600 border-amber-500/30',
  Critical: 'bg-red-50 text-red-600 border-red-500/30',
};

/* ───────────────────────── Component ───────────────────────── */

export default function TeamDirectory({ isOpen, onClose, onDelegate, itemTitle }) {
  const prefersReduced = useReducedMotion();
  const modalRef = useRef(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState('Normal');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedId(null);
      setNote('');
      setPriority('Normal');
    }
  }, [isOpen]);

  // Lock body scroll and handle Escape
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Filter departments/members by search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return DEPARTMENTS;
    return DEPARTMENTS.map((dept) => ({
      ...dept,
      members: dept.members.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          m.region.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q)
      ),
    })).filter((dept) => dept.members.length > 0);
  }, [search]);

  // Find the selected member across departments
  const selectedMember = useMemo(() => {
    if (!selectedId) return null;
    for (const dept of DEPARTMENTS) {
      const found = dept.members.find((m) => m.id === selectedId);
      if (found) return { ...found, deptColor: dept.color };
    }
    return null;
  }, [selectedId]);

  const handleDelegate = () => {
    if (!selectedMember) return;
    onDelegate(selectedMember, note || undefined);
  };

  const springTransition = prefersReduced ? { duration: 0 } : SPRING;
  const fadeTransition = prefersReduced ? { duration: 0 } : { duration: 0.15 };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeTransition}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-dir-title"
            className="relative max-w-[640px] w-full bg-white border border-black/[0.12] rounded-lg  flex flex-col max-h-[85vh]"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={springTransition}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.12] shrink-0">
              <h2
                id="team-dir-title"
                className="text-[16px] font-semibold text-gray-900 truncate pr-4"
              >
                Delegate: {itemTitle}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/[0.06] transition-colors cursor-pointer shrink-0"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* ── Search ── */}
            <div className="px-6 pt-4 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, role, or region..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-black/[0.12] text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-straker-500/40 focus:border-straker-500/50 transition-colors"
                />
              </div>
            </div>

            {/* ── Team List (scrollable) ── */}
            <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0">
              {filtered.length === 0 && (
                <p className="text-gray-400 text-[13px] text-center py-8">
                  No team members match your search.
                </p>
              )}

              {filtered.map((dept, deptIdx) => (
                <div key={dept.label} className={deptIdx > 0 ? 'mt-4' : ''}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
                    {dept.label}
                  </p>

                  <div className="space-y-1">
                    {dept.members.map((member, memberIdx) => {
                      const isSelected = selectedId === member.id;
                      const isSelf = member.isSelf;

                      return (
                        <motion.button
                          key={member.id}
                          type="button"
                          disabled={isSelf}
                          onClick={() => setSelectedId(isSelf ? null : member.id)}
                          className={`w-full text-left rounded-lg px-3 py-3 transition-colors border ${
                            isSelf
                              ? 'opacity-50 cursor-not-allowed border-transparent'
                              : isSelected
                              ? 'bg-straker-500/[0.08] border-straker-500/40'
                              : 'border-transparent hover:bg-black/[0.04] cursor-pointer'
                          }`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: isSelf ? 0.5 : 1, y: 0 }}
                          transition={
                            prefersReduced
                              ? { duration: 0 }
                              : {
                                  ...SPRING,
                                  delay: deptIdx * 0.05 + memberIdx * 0.03,
                                }
                          }
                          whileTap={isSelf ? {} : { scale: 0.985 }}
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <motion.div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shrink-0"
                              style={{ backgroundColor: dept.color + '33' }}
                              animate={
                                isSelected
                                  ? { scale: 1.08 }
                                  : { scale: 1 }
                              }
                              transition={springTransition}
                            >
                              <span style={{ color: dept.color }}>
                                {member.initials}
                              </span>
                            </motion.div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-medium text-gray-900 truncate">
                                  {member.name}
                                </span>
                                {isSelf && (
                                  <span className="text-[11px] text-gray-400 shrink-0">
                                    Owner (you)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[13px] text-gray-500 truncate">
                                  {member.role}
                                </span>
                                <span className="text-gray-400">·</span>
                                <span className="text-[12px] text-gray-400 shrink-0">
                                  {member.location}
                                </span>
                              </div>
                            </div>

                            {/* Region pill + status */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-black/[0.04] text-gray-500 border border-black/[0.12]">
                                {member.regionCode}
                              </span>
                              <span
                                className={`w-2 h-2 rounded-full ${STATUS_DOT[member.status]}`}
                                title={member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                              />
                            </div>
                          </div>

                          {/* Permission badge */}
                          <div className="mt-2 ml-12">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                PERMISSION_CONFIG[member.permission].className
                              }`}
                            >
                              <Shield className="w-3 h-3" />
                              {PERMISSION_CONFIG[member.permission].label}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Delegation Footer ── */}
            <AnimatePresence>
              {selectedMember && (
                <motion.div
                  className="border-t border-black/[0.12] px-6 py-4 shrink-0 space-y-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={fadeTransition}
                >
                  {/* Selected summary */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold"
                      style={{
                        backgroundColor: (selectedMember.deptColor || '#3D16FA') + '33',
                        color: selectedMember.deptColor || '#3D16FA',
                      }}
                    >
                      {selectedMember.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-gray-900 truncate">
                        {selectedMember.name}
                      </p>
                      <p className="text-[12px] text-gray-500 truncate">
                        {selectedMember.role}
                      </p>
                    </div>
                  </div>

                  {/* Note */}
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder={`Add context for ${selectedMember.name.split(' ')[0]}...`}
                    className="w-full rounded-lg bg-white border border-black/[0.12] px-3.5 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-straker-500/40 focus:border-straker-500/50 transition-colors"
                  />

                  {/* Priority pills */}
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-400 mr-1">Priority:</span>
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`text-[12px] font-medium px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                          priority === p
                            ? PRIORITY_COLORS[p]
                            : 'bg-transparent text-gray-400 border-black/[0.12] hover:bg-black/[0.04]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* Delegate button */}
                  <button
                    type="button"
                    onClick={handleDelegate}
                    className="w-full py-2.5 rounded-lg bg-amber hover:bg-amber-deep text-white text-[14px] font-semibold transition-colors cursor-pointer"
                  >
                    Delegate to {selectedMember.name.split(' ')[0]}
                  </button>

                  {/* Notification estimate */}
                  <p className="text-[12px] text-gray-400 text-center">
                    Will be notified via email + in-app
                  </p>

                  {/* Security note */}
                  <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                    <Lock className="w-3 h-3 inline-block mr-1 -mt-px" />
                    Delegation follows your organization's access control policy.{' '}
                    {selectedMember.name.split(' ')[0]} will only see segments relevant
                    to their role.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
