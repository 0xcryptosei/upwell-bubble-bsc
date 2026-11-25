import { useId } from 'react'

export default function Sparkline({ data, up, label }) {
  const id = useId().replace(/:/g, '')
  const w = 340, h = 76
  const mn = Math.min(...data), mx = Math.max(...data), rg = mx - mn || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 6 - ((v - mn) / rg) * (h - 14)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const col = up ? '#079455' : '#D92D20'
  const lastPt = pts[pts.length - 1]
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`sg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={col} stopOpacity=".22" /><stop offset="1" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w} ${h} L0 ${h}Z`} fill={`url(#sg${id})`} />
      <path d={line} fill="none" stroke={col} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={lastPt[0] - 3} cy={lastPt[1]} r="3.2" fill={col} stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}
