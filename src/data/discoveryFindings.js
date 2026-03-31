function primaryLocale(sc) {
  if (!sc || !sc.locales || sc.locales.length === 0) return null
  return sc.locales[0]
}

export function generateDiscoveryStream(file, structuredContext) {
  const ext = file?.name?.split('.').pop()?.toLowerCase() || ''
  const locale = primaryLocale(structuredContext)
  const vertical = (structuredContext?.vertical || structuredContext?.industryVertical || '').toLowerCase()

  // JP financial PDFs
  if (ext === 'pdf' && locale === 'ja' && vertical.includes('financial')) {
    return [
      { delay: 400, category: 'structure', text: 'Document structure detected: hierarchical sections with embedded tables', severity: 'info', scanLabel: 'Scanning document architecture...' },
      { delay: 800, category: 'language', text: 'Source language confirmed: English (US), formal register', severity: 'info', scanLabel: 'Detecting source language patterns...' },
      { delay: 1300, category: 'terminology', text: '47 specialized financial terms identified requiring J-GAAP equivalents', severity: 'major', scanLabel: 'Detecting J-GAAP Compliance requirements...' },
      { delay: 1700, category: 'regulatory', text: 'Critical: ASC 606 & ASC 842 references require ASBJ mapping', severity: 'critical', scanLabel: 'Found regulatory framework references...' },
      { delay: 2200, category: 'complexity', text: 'High-density zone: derivative instrument disclosures (sections 3-7)', severity: 'major', scanLabel: 'Mapping complexity zones across sections...' },
      { delay: 2600, category: 'currency', text: 'Currency conversion required: USD → JPY with 百万 notation', severity: 'minor', scanLabel: 'Mapping to TSE-approved terminology...' },
      { delay: 3100, category: 'cultural', text: 'Cultural adaptation: fiscal year-end mismatch (Dec 31 → Mar 31 option)', severity: 'minor', scanLabel: 'Analyzing cultural adaptation requirements...' },
      { delay: 3500, category: 'agent', text: 'Japan Financial Regulatory Agent (JP-FIN-3) selected', severity: 'info', scanLabel: 'Matching specialist agent to content profile...' },
      { delay: 3900, category: 'quality', text: 'Baseline quality projection: 76/100 (89 achievable with enhancements)', severity: 'info', scanLabel: 'Computing baseline quality projection...' },
    ]
  }

  // Videos
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return [
      { delay: 400, category: 'structure', text: 'Video timeline analyzed: multiple speakers detected', severity: 'info', scanLabel: 'Parsing video timeline and audio tracks...' },
      { delay: 800, category: 'language', text: 'Source audio: English (US), conversational register', severity: 'info', scanLabel: 'Identifying speaker language and register...' },
      { delay: 1300, category: 'terminology', text: '8 domain-specific terms identified in dialogue', severity: 'minor', scanLabel: 'Extracting specialized terminology from dialogue...' },
      { delay: 1700, category: 'audio', text: 'Overlapping dialogue detected in 3 segments — speaker separation needed', severity: 'major', scanLabel: 'Detecting audio overlap and speaker boundaries...' },
      { delay: 2200, category: 'visual', text: '12 on-screen text overlays requiring separate rendering pipeline', severity: 'major', scanLabel: 'Scanning visual text overlays for extraction...' },
      { delay: 2600, category: 'lipsync', text: 'Phoneme duration delta: 23% — facial retargeting required for close-ups', severity: 'major', scanLabel: 'Computing phoneme duration deltas...' },
      { delay: 3100, category: 'agent', text: 'Global Media Processing Agent (GL-MEDIA-1) selected', severity: 'info', scanLabel: 'Matching specialist agent to media profile...' },
      { delay: 3500, category: 'quality', text: 'Baseline quality projection: 71/100 (86 achievable with enhancements)', severity: 'info', scanLabel: 'Computing baseline quality projection...' },
    ]
  }

  // Generic docs (default) — covers PDF, DOCX, XLSX, PPTX
  return [
    { delay: 400, category: 'structure', text: 'Document structure detected: hierarchical sections', severity: 'info', scanLabel: 'Scanning document architecture...' },
    { delay: 800, category: 'language', text: 'Source language confirmed: English (US)', severity: 'info', scanLabel: 'Detecting source language patterns...' },
    { delay: 1300, category: 'terminology', text: 'Found 47 specialized financial terms...', severity: 'minor', scanLabel: 'Found 47 specialized financial terms...' },
    { delay: 1700, category: 'regulatory', text: 'Standard legal boilerplate detected — template processing applicable', severity: 'minor', scanLabel: 'Checking regulatory compliance requirements...' },
    { delay: 2200, category: 'complexity', text: 'Moderate complexity: some nested structures in sections 3-7', severity: 'info', scanLabel: 'Mapping complexity zones across document...' },
    { delay: 2600, category: 'cultural', text: 'Cultural adaptation: number/date formatting required', severity: 'info', scanLabel: 'Analyzing cultural adaptation requirements...' },
    { delay: 3100, category: 'agent', text: 'Enterprise Document Agent (EN-DOC-4) selected', severity: 'info', scanLabel: 'Matching specialist agent to content profile...' },
    { delay: 3500, category: 'quality', text: 'Baseline quality projection: 84/100 (93 achievable with enhancements)', severity: 'info', scanLabel: 'Computing baseline quality projection...' },
  ]
}
