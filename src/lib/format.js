export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export const fmtUsd = (v) =>
  v >= 1e9 ? '$' + (v / 1e9).toFixed(2) + 'B'
  : v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M'
  : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K'
  : '$' + Math.round(v)

export const fmtPct = (p) => (p >= 0 ? '+' : '−') + Math.abs(p).toFixed(1) + '%'
export const fmtAge = (m) => (m < 60 ? m + 'm' : m < 1440 ? Math.floor(m / 60) + 'h' : Math.floor(m / 1440) + 'd')
export const fmtX = (x) => x.toFixed(2) + 'x'
export const fmtInt = (n) => Math.round(n).toLocaleString('en-US')

export function remain(ms) {
  ms = Math.max(0, ms)
  const d = Math.floor(ms / 86400e3), h = Math.floor((ms % 86400e3) / 3600e3)
  const m = Math.floor((ms % 3600e3) / 60e3), s = Math.floor((ms % 60e3) / 1e3)
  return d ? `${d}d ${h}h` : h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}:${String(s).padStart(2, '0')}`
}

/** Seeded random so the demo data looks the same on every load. */
export function seeded(seed) {
  return function rnd() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function gauss() {
  let u = 0, v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
