/**
 * TrustSparkline — 80x16 inline sparkline showing a trust-metric trend
 * across the segments of a document. Used on DocumentPedigreeCard.
 */

export default function TrustSparkline({ values = [], color = '#3D16FA', width = 96, height = 18, label }) {
  if (!values || values.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        no data
      </span>
    )
  }
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = Math.max(max - min, 0.001)
  const stepX = width / Math.max(values.length - 1, 1)
  const points = values.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const last = values[values.length - 1]
  const lastY = height - ((last - min) / range) * (height - 4) - 2
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width={width} height={height} className="overflow-visible">
        <polyline fill="none" stroke={color} strokeWidth="1.25" points={points} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={width - 0.5} cy={lastY} r="1.8" fill={color} />
      </svg>
      {label && <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>}
    </span>
  )
}
