import { motion } from 'framer-motion'
import {
  Shield, Building2, Mic, Megaphone, Scale, Code, Heart, FileText,
  Globe, Activity, Briefcase, Landmark, Languages, Gavel, Star, Users,
  Eye, Zap, PenTool, Repeat, Sparkles, Gauge, BookOpen, Video,
  Workflow, Bot, FileSearch,
} from 'lucide-react'
import { TYPE_COLORS, ICON_COLOR_MAP } from './data/marketplaceCategories'
import TrustScoreBadge from './TrustScoreBadge'

const ICON_MAP = {
  Shield, Building2, Mic, Megaphone, Scale, Code, Heart, FileText,
  Globe, Activity, Briefcase, Landmark, Languages, Gavel,
  PenTool, Repeat, Sparkles, Gauge, BookOpen, Video, Workflow, Bot, FileSearch,
  Stethoscope: Heart,
}

const SPRING = { type: 'spring', stiffness: 300, damping: 20 }

export default function AgentCard({ agent, index, reducedMotion, onSelect, onTestDrive, onDeploy }) {
  const IconComp = ICON_MAP[agent.icon] || Shield
  const iconColor = ICON_COLOR_MAP[agent.icon] || '#3D16FA'
  const typeColor = TYPE_COLORS[agent.type] || TYPE_COLORS['Agent']

  // Tier badge color
  const tierColors = {
    Free: 'bg-gray-100 text-gray-500',
    Standard: 'bg-blue-50 text-blue-600',
    Premium: 'bg-violet-50 text-violet-600',
    Enterprise: 'bg-amber-50 text-amber-600',
  }
  const tierClass = tierColors[agent.roi?.tier] || tierColors.Standard

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { ...SPRING, delay: Math.min(index * 0.05, 0.3) }}
      onClick={() => onSelect(agent)}
      className="bg-white border border-black/[0.12] rounded-lg p-5 flex flex-col cursor-pointer hover:border-[#3D16FA]/30 transition-colors group"
    >
      {/* Top row: provider + type + rating */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{agent.provider}</span>
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${typeColor.bg} ${typeColor.text}`}>
            {agent.type}
          </span>
          <span className="flex items-center gap-0.5 text-[11px] text-amber-500">
            <Star className="w-3 h-3 fill-[#FFBD59]-400 text-amber-400" />
            {agent.rating}
          </span>
        </div>
      </div>

      {/* Icon + Name + Specialty */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <IconComp size={20} style={{ color: iconColor }} />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-gray-900 truncate group-hover:text-[#3D16FA] transition-colors">
            {agent.name}
          </p>
          <p className="text-[11px] text-gray-500 truncate">{agent.category}</p>
        </div>
      </div>

      {/* Trust Score */}
      <div className="flex items-center gap-2.5 mb-3">
        <TrustScoreBadge score={agent.trustScore} size="sm" reducedMotion={reducedMotion} />
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Trust Score</p>
          <p className="text-[11px] font-mono font-medium text-gray-700">{agent.trustScore}/100</p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {agent.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] bg-gray-100 text-gray-600 font-medium">
            {tag}
          </span>
        ))}
        {agent.tags.length > 3 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-gray-100 text-gray-400">
            +{agent.tags.length - 3}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-3">
        {agent.description}
      </p>

      {/* Stats + Tier */}
      <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-4">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {agent.usedBy} orgs
        </span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          +{agent.roi?.avgQualityLift || 0}%
        </span>
        <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-semibold ${tierClass}`}>
          {agent.roi?.tier || 'Standard'}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-auto flex gap-2">
        <button
          onClick={e => { e.stopPropagation(); onTestDrive(agent) }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 border border-black/[0.08] text-[12px] font-medium text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" /> Test
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDeploy(agent) }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#3D16FA] text-[12px] font-medium text-white hover:bg-[#0089c4] transition-colors cursor-pointer"
        >
          Deploy
        </button>
      </div>
    </motion.div>
  )
}
