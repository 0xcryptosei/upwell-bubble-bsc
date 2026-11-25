import { useRef, useState } from 'react'
import { prefersReducedMotion } from '../lib/format'

/** Upwell icon: rising bubbles inside a glossy blue bubble. */
export function Logo({ size = 34 }) {
  return <img className="logo" src="/brand/upwell-icon.svg" width={size} height={size} alt="" aria-hidden="true" />
}

/** Glossy bubble avatar / token icon. */
export function Bub({ label, c1, c2, size = 32 }) {
  return <span className={`bub s${size}`} style={{ '--c1': c1, '--c2': c2 }} aria-hidden="true">{label}</span>
}
export const Avatar = ({ person, size }) => <Bub label={person.name.replace(/^0x/, '').charAt(0).toUpperCase()} c1={person.c[0]} c2={person.c[1]} size={size} />
/** Token avatar: the token's image when the API provides one, otherwise a lettered bubble. */
export function TokenIcon({ t, size = 40 }) {
  const [broken, setBroken] = useState(false)
  if (t.avatar && !broken) {
    return <img className={`bub tok-img s${size}`} src={t.avatar} alt="" aria-hidden="true" width={size} height={size} loading="lazy" decoding="async" onError={() => setBroken(true)} />
  }
  return <Bub label={t.sym.charAt(0)} c1={t.c1} c2={t.c2} size={size} />
}

export const Tag = ({ tone = '', className = '', children, ...rest }) => <span className={`tag ${tone} ${className}`} {...rest}>{children}</span>
export const TierTag = ({ tier, style }) => <span className={`tag tier-${tier}`} style={style}>{tier}</span>

export function Bar({ value, height }) {
  return <div className="bar" style={height ? { height } : undefined}><i style={{ width: value + '%' }} /></div>
}

const canTilt = () =>
  typeof window !== 'undefined' && !prefersReducedMotion() && window.matchMedia('(hover:hover) and (pointer:fine)').matches

/** Card that tilts toward the cursor in 3D, with a moving glare. */
export function Tilt({ as: Tag = 'div', max = 4, className = '', children, style, ...rest }) {
  const ref = useRef(null)
  const enabled = useRef(canTilt()).current
  if (!enabled) return <Tag className={className} style={style} {...rest}>{children}</Tag>
  const move = (e) => {
    const el = ref.current, r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
    el.classList.add('tilting')
    el.style.setProperty('--ry', ((x - 0.5) * 2 * max).toFixed(2) + 'deg')
    el.style.setProperty('--rx', ((0.5 - y) * 2 * max).toFixed(2) + 'deg')
    el.style.setProperty('--gx', (x * 100).toFixed(1) + '%')
    el.style.setProperty('--gy', (y * 100).toFixed(1) + '%')
  }
  const leave = () => {
    const el = ref.current
    el.classList.remove('tilting')
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg')
  }
  return (
    <Tag ref={ref} className={`${className} tilt`} style={{ position: 'relative', ...style }} onPointerMove={move} onPointerLeave={leave} {...rest}>
      {children}
      <span className="glare" aria-hidden="true" />
    </Tag>
  )
}
