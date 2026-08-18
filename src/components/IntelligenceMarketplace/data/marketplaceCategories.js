export const AGENT_TYPES = ['All', 'Agent', 'Base Model', 'Fine-Tuned Model']

export const INDUSTRIES = [
  { value: 'financial', label: 'Financial Services' },
  { value: 'legal', label: 'Legal & Compliance' },
  { value: 'healthcare', label: 'Healthcare & Pharma' },
  { value: 'marketing', label: 'Marketing & Creative' },
  { value: 'technical', label: 'Technical & Engineering' },
  { value: 'ecommerce', label: 'E-Commerce & Retail' },
  { value: 'regional', label: 'Regional Specialist' },
  { value: 'content', label: 'Content Creation' },
  { value: 'governance', label: 'Governance & Ops' },
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
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'bn', label: 'Bengali' },
  { value: 'th', label: 'Thai' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'id', label: 'Indonesian' },
  { value: 'ms', label: 'Malay' },
  { value: 'pl', label: 'Polish' },
  { value: 'cs', label: 'Czech' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'ro', label: 'Romanian' },
  { value: 'sv', label: 'Swedish' },
  { value: 'da', label: 'Danish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'fi', label: 'Finnish' },
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
  'Agent': { bg: 'bg-[#3D16FA]/10', text: 'text-[#3D16FA]' },
  'Base Model': { bg: 'bg-violet-500/10', text: 'text-violet-500' },
  'Fine-Tuned Model': { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
}

export const ICON_COLOR_MAP = {
  Megaphone: '#FFB000',
  Scale: '#A38DFF',
  Code: '#0088FF',
  Heart: '#E53935',
  FileText: '#5A39FB',
  Globe: '#0088FF',
  Shield: '#A38DFF',
  Activity: '#A38DFF',
  Building2: '#3D16FA',
  Mic: '#00B887',
  Brain: '#A38DFF',
  Briefcase: '#FFB000',
  Stethoscope: '#E53935',
  Landmark: '#5A39FB',
  Languages: '#0088FF',
  Gavel: '#8087AC',
  PenTool: '#B3843E',
  Repeat: '#0088FF',
  Sparkles: '#FFB000',
  Gauge: '#A38DFF',
  BookOpen: '#5A39FB',
  Video: '#E53935',
  Workflow: '#3D16FA',
  Bot: '#A38DFF',
  FileSearch: '#8087AC',
}
