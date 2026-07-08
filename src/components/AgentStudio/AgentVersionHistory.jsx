/* Agent Studio — version history + rollback. Used in the Configuration editor. */
import { RotateCcw } from 'lucide-react'
import { rollbackToVersion } from '../../data/agentStudio'
import { MonoLabel, StatusBadge, SecondaryButton } from './shared'

export default function AgentVersionHistory({ agent }) {
  const versions = [...agent.versions].sort((a, b) => b.versionNumber - a.versionNumber)
  return (
    <div className="space-y-2">
      <MonoLabel>Version history</MonoLabel>
      <ul className="divide-y divide-rule border border-rule rounded-lg overflow-hidden">
        {versions.map(v => {
          const isPublished = v.id === agent.publishedVersionId
          const isDraft = v.id === agent.draftVersionId
          return (
            <li key={v.id} className="px-4 py-3 flex items-center gap-3 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-ink flex items-center gap-2">
                  v{v.versionNumber}
                  <StatusBadge status={isDraft ? 'draft' : isPublished ? 'signed-off' : 'archived'}>
                    {isDraft ? 'Draft' : isPublished ? 'Published' : 'Archived'}
                  </StatusBadge>
                </p>
                <p className="text-[11px] text-slate mt-0.5">{v.changeSummary}</p>
                <p className="text-[10px] text-mist mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {v.createdBy} · {v.publishedAt ? `published ${new Date(v.publishedAt).toLocaleDateString()}` : `created ${new Date(v.createdAt).toLocaleDateString()}`}
                </p>
              </div>
              {!isPublished && !isDraft && (
                <SecondaryButton onClick={() => rollbackToVersion(agent.id, v.id)}><RotateCcw className="w-3.5 h-3.5" /> Roll back</SecondaryButton>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
