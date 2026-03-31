import { Brain, BookOpen, Scale, Globe } from 'lucide-react'

export const dimensionIcons = { terminology: Brain, reading: BookOpen, regulatory: Scale, cultural: Globe }

export const severityConfig = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'critical', tooltip: 'Critical Issue' },
  major: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'major', tooltip: 'Major Issue' },
  minor: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'minor', tooltip: 'Minor Issue' },
}

export const annotationColors = {
  regulatory: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  terminology: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  currency: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  cultural: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
}

export const tagColors = {
  Recommended: 'text-straker-400 bg-straker-500/10',
  Premium: 'text-violet-400 bg-violet-500/10',
  Enterprise: 'text-amber-400 bg-amber-500/10',
}

export function getScoreColor(score) {
  if (score >= 85) return { text: 'text-emerald-400', bar: 'bg-emerald-400' }
  if (score >= 70) return { text: 'text-amber-400', bar: 'bg-amber-400' }
  return { text: 'text-red-400', bar: 'bg-red-400' }
}

export function getOverallColor(score) {
  if (score >= 85) return { ring: 'border-emerald-400/30', text: 'text-emerald-400', badge: 'text-emerald-400 bg-emerald-500/10' }
  if (score >= 70) return { ring: 'border-amber-400/30', text: 'text-amber-400', badge: 'text-amber-400 bg-amber-500/10' }
  return { ring: 'border-red-400/30', text: 'text-red-400', badge: 'text-red-400 bg-red-500/10' }
}

export function getQualityColor(score) {
  if (score >= 85) return { ring: 'border-emerald-400/30', text: 'text-emerald-400', badge: 'text-emerald-400 bg-emerald-500/10', stroke: 'stroke-emerald-400' }
  if (score >= 65) return { ring: 'border-straker-400/30', text: 'text-straker-400', badge: 'text-straker-400 bg-straker-500/10', stroke: 'stroke-straker-400' }
  return { ring: 'border-red-400/30', text: 'text-red-400', badge: 'text-red-400 bg-red-500/10', stroke: 'stroke-red-400' }
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
