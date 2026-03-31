export function generateQualityNarrative(triageData, enabledUpsells, orgIntelligence) {
  const beforeScore = triageData.qualityScore.overall

  // Calculate after score based on enabled upsells
  const dimensionBoosts = {}
  triageData.upsellOptions.forEach(opt => {
    if (enabledUpsells.has(opt.id)) {
      opt.impact.forEach(imp => {
        const delta = parseInt(imp.delta.replace('+', ''), 10)
        dimensionBoosts[imp.dimension] = (dimensionBoosts[imp.dimension] || 0) + delta
      })
    }
  })

  const dimensions = triageData.qualityScore.dimensions.map(d => ({
    name: d.name,
    before: d.score,
    after: Math.min(100, d.score + (dimensionBoosts[d.name] || 0)),
  }))

  const afterScore = Math.round(dimensions.reduce((sum, d) => sum + d.after, 0) / dimensions.length)

  return {
    beforeAfter: { before: beforeScore, after: afterScore, dimensions },
    orgImprovements: [
      { metric: 'Domain Precision', value: '87%', delta: '+12%', period: '6 months', icon: 'terminology' },
      { metric: 'Avg. Quality Score', value: '91', delta: '+9 pts', period: '6 months', icon: 'target' },
      { metric: 'Regulatory Compliance Rate', value: '98.5%', delta: '+3.2%', period: '3 months', icon: 'shield' },
      { metric: 'Agent Memory Leverage', value: '34%', delta: '+18%', period: '6 months', icon: 'database' },
    ],
    qualityTrend: [
      { month: 'Oct', score: 82, projects: 18 },
      { month: 'Nov', score: 84, projects: 22 },
      { month: 'Dec', score: 86, projects: 19 },
      { month: 'Jan', score: 87, projects: 25 },
      { month: 'Feb', score: 89, projects: 21 },
      { month: 'Mar', score: afterScore, projects: 24 },
    ],
    cumulativeIntelligence: {
      glossaryTermsLearned: orgIntelligence?.orgPatterns?.glossaryTerms || 1247,
      glossaryTermsThisProject: 23,
      patternsCaptured: 342,
      reusableSegments: 1893,
      timeSavedHours: 47,
    },
  }
}
