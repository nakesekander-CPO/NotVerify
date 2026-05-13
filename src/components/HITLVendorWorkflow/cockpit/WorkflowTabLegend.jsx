/**
 * WorkflowTabLegend — hover legend on the cryptic mode chips
 * (EXT / INT/1 / INT/N) at the top of the workspace and Task
 * Assignment screens.
 */

import { useState } from 'react'
import { Info } from 'lucide-react'

const LEGEND = {
  'External Review':       { label: 'External Review',       detail: 'Assigned to an external vendor agency (e.g., Nihon Linguistics K.K.). Vendor reviewers see redacted Org Brain and policy details under RBAC.' },
  'Internal Review 1':     { label: 'Internal Review 1',     detail: 'One internal reviewer takes the whole project. Fast-lane for low-volume / high-stakes work.' },
  'Internal Final Review': { label: 'Internal Final Review', detail: 'Multiple internal reviewers work tasks in parallel; managed in Task Assignment.' },
}

export default function WorkflowTabLegend({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-[10.5px] text-mist hover:text-slate cursor-help"
        title="Legend"
      >
        <Info className="w-3 h-3" />
        Legend
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 w-80 bg-white border border-rule rounded-md shadow-lg p-3 text-[11.5px]">
          <p className="text-[10.5px] uppercase tracking-wider text-mist mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Workflow modes</p>
          <ul className="space-y-2">
            {Object.entries(LEGEND).map(([key, v]) => (
              <li key={key}>
                <p className="font-semibold text-ink"><kbd className="px-1 bg-cream border border-rule rounded text-[10px] mr-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{key}</kbd>{v.label}</p>
                <p className="text-mist mt-0.5">{v.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
