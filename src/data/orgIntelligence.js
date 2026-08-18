export function generateOrgIntelligence() {
  return {
    recentProjects: [
      { id: 'proj-001', name: 'Q2 Earnings Report', fileName: 'Q2_Earnings_Final.docx', locales: ['ja', 'de', 'zh'], industry: 'Financial', qualityScore: 92, date: 'Jul 14', status: 'completed', fileType: 'docx' },
      { id: 'proj-002', name: 'Product Launch Video — APAC', fileName: 'product_launch_v3.mp4', locales: ['ja', 'fr'], industry: 'Technology', qualityScore: 88, date: 'Sep 3', status: 'completed', fileType: 'mp4' },
      { id: 'proj-003', name: 'Employee Handbook Update', fileName: 'handbook_2026.docx', locales: ['de', 'es'], industry: 'Legal', qualityScore: 91, date: 'Sep 28', status: 'completed', fileType: 'docx' },
    ],
    localeProfiles: [
      { locale: 'ja', name: 'Japanese', projectCount: 47, avgQuality: 89, lastUsed: '2026-02-22', trending: 'up' },
      { locale: 'de', name: 'German', projectCount: 38, avgQuality: 92, lastUsed: '2026-03-01', trending: 'stable' },
      { locale: 'zh', name: 'Chinese (Simplified)', projectCount: 31, avgQuality: 86, lastUsed: '2026-01-08', trending: 'up' },
      { locale: 'fr', name: 'French', projectCount: 29, avgQuality: 93, lastUsed: '2026-02-22', trending: 'stable' },
      { locale: 'es', name: 'Spanish', projectCount: 24, avgQuality: 91, lastUsed: '2026-02-22', trending: 'up' },
      { locale: 'ko', name: 'Korean', projectCount: 18, avgQuality: 85, lastUsed: '2026-01-08', trending: 'up' },
    ],
    orgPatterns: {
      mostUsedVertical: 'Financial Services',
      avgProjectsPerWeek: 4.2,
      terminologyConsistency: { current: 87, previous: 75, delta: 12 },
      avgQualityTrend: [82, 84, 86, 87, 89, 91],
      totalProjectsCompleted: 156,
      totalWordsProcessed: '2.4M',
      glossaryTerms: 4120, // internal key — UI displays as "knowledge entries"
    },
    smartDefaults: {
      suggestedLocales: ['ja', 'de', 'zh'],
      suggestedVertical: 'Financial Services',
      suggestedTone: 'Formal',
    },
    predictiveSuggestion: {
      projectName: 'Q3 Earnings Report',
      fileName: 'Q3_Earnings_Final.docx',
      daysSinceLastRun: 90,
      lastRunName: 'Q2 Earnings Report',
      headline: "It's Q3 Earnings season.",
      preloadedConfig: {
        locales: ['ja', 'de', 'zh'],
        vertical: 'Financial Services',
        glossary: 'J-GAAP Financial Knowledge Base v3.2',
        modelPack: 'Financial Regulatory Model Pack',
      },
      prompt: "Based on Meridian Capital's 90-day cadence, your Q3 Earnings Report is due for processing. I've pre-loaded your J-GAAP knowledge base (4,120 verified entries) and set your usual JA · DE · ZH targets.",
    },
  }
}
