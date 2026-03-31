import { useMemo } from 'react'

export default function useQualityCalculator(baseScore, upsellOptions, enabledUpsells) {
  return useMemo(() => {
    if (!baseScore) return baseScore

    const dims = baseScore.dimensions.map(d => ({ ...d }))

    for (const opt of upsellOptions) {
      if (!enabledUpsells.has(opt.id)) continue
      for (const impact of opt.impact) {
        const dim = dims.find(d => d.name === impact.dimension)
        if (dim) {
          dim.score = Math.min(100, dim.score + parseInt(impact.delta))
        }
      }
    }

    const overall = Math.round(dims.reduce((sum, d) => sum + d.score, 0) / dims.length)

    return {
      ...baseScore,
      dimensions: dims,
      overall,
    }
  }, [baseScore, upsellOptions, enabledUpsells])
}
