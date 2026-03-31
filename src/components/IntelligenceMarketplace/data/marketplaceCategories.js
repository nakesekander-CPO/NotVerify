export const AGENT_TYPES = ['All', 'Agent', 'Base Model', 'Fine-Tuned Model']

export const INDUSTRIES = [
  { value: 'financial', label: 'Financial Services' },
  { value: 'legal', label: 'Legal & Compliance' },
  { value: 'healthcare', label: 'Healthcare & Pharma' },
  { value: 'marketing', label: 'Marketing & Creative' },
  { value: 'technical', label: 'Technical & Engineering' },
  { value: 'ecommerce', label: 'E-Commerce & Retail' },
  { value: 'regional', label: 'Regional Specialist' },
]

export const LANGUAGES = [
  { value: 'ja', label: 'Japanese' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'it', label: 'Italian' },
  { value: 'nl', label: 'Dutch' },
  { value: 'en', label: 'English' },
]

export const COMPLIANCE_FILTERS = ['Any', 'SOC 2', 'HIPAA', 'GDPR', 'ISO 27001']

export const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'usage', label: 'Most Used' },
  { value: 'trust', label: 'Highest Trust Score' },
  { value: 'newest', label: 'Newest' },
]

export const TYPE_COLORS = {
  'Agent': { bg: 'bg-[#009eda]/10', text: 'text-[#009eda]' },
  'Base Model': { bg: 'bg-violet-500/10', text: 'text-violet-500' },
  'Fine-Tuned Model': { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
}

export const ICON_COLOR_MAP = {
  Megaphone: '#f59e0b',
  Scale: '#8b5cf6',
  Code: '#3b82f6',
  Heart: '#ef4444',
  FileText: '#6366f1',
  Globe: '#0ea5e9',
  Shield: '#a855f7',
  Activity: '#ec4899',
  Building2: '#009eda',
  Mic: '#10b981',
  Brain: '#8b5cf6',
  Briefcase: '#f97316',
  Stethoscope: '#ef4444',
  Landmark: '#6366f1',
  Languages: '#0ea5e9',
  Gavel: '#64748b',
}
