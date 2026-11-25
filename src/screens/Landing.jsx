import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/AppContext'
import { useMarket } from '../store/market'
import { createWater } from '../landing/water'
import { BRAND } from '../brand'
import { fmtPct, fmtUsd, prefersReducedMotion } from '../lib/format'
import { Logo, TokenIcon } from '../components/Bits'
import { IconCopy, IconTelegram, IconX } from '../components/Icons'
import '../styles/landing.css'

const Arrow = () => <svg className="lp-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10h11M11 5.5 15.5 10 11 14.5" /></svg>

// Clicks on these never make ripples: they do something, or they are a solid surface.
const SOLID = 'a,button,summary,input,textarea,select,label,.lp-solid'

/** The live water surface behind the page. Click empty water for a ripple. */
function Water() {
  const canvas = useRef(null)
  const [fallback, setFallback] = useState(false)
  const [rings, setRings] = useState([])

  useEffect(() => {
    const reduced = prefersReducedMotion()
    const water = createWater(canvas.current, { reducedMotion: reduced })
    if (!water) setFallback(true)
    water?.setDepth(0)
    let ringId = 0
    const ring = (x, y) => {
      const id = ++ringId
      setRings((r) => [...r.slice(-6), { id, x, y }])
      setTimeout(() => setRings((r) => r.filter((v) => v.id !== id)), 1600)
    }
    const blank = (target) => !target.closest?.(SOLID)
    const onDown = (e) => {
      if (e.button !== 0 || !blank(e.target)) return
      if (water) { water.drop(e.clientX, e.clientY, 40, 1.6); water.drop(e.clientX, e.clientY, 12, -0.7) }
      else ring(e.clientX, e.clientY)
    }
    // a faint wake behind the pointer
    let last = 0, lx = 0, ly = 0
    const onMove = (e) => {
      if (!water || reduced || e.pointerType === 'touch') return
      const now = performance.now()
      if (now - last < 32) return
      const dist = Math.hypot(e.clientX - lx, e.clientY - ly)
      last = now; lx = e.clientX; ly = e.clientY
      if (dist > 2 && blank(e.target)) water.drop(e.clientX, e.clientY, 14, Math.min(0.12, dist * 0.004))
    }
    // the odd raindrop so the surface feels alive
    const rain = !reduced && water && setInterval(() => {
      if (!document.hidden) water.drop(Math.random() * innerWidth, Math.random() * innerHeight, 7 + Math.random() * 6, 0.35)
    }, 2600)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      water?.destroy()
      clearInterval(rain)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <div className={`lp-water ${fallback ? 'css' : ''}`} aria-hidden="true">
      <canvas ref={canvas} />
      {rings.map((r) => <span key={r.id} className="lp-ring" style={{ left: r.x, top: r.y }}><i /><i /></span>)}
    </div>
  )
}

/** Live panel: the tokens rising fastest right now. */
function RisingNow({ onPick }) {
  const tokens = useMarket()
  const rows = tokens
    .filter((t) => t.safety == null || t.safety >= 40) // hide known high-risk tokens; unchecked ones stay
    .slice()
    .sort((a, b) => b.chg - a.chg)
    .slice(0, 5)
  return (
    <aside className="lp-live-panel lp-solid" aria-label="Tokens rising now">
      <header>
        <span className="lp-live-dot" aria-hidden="true" />
        <span className="title">Rising now</span>
        <span className="sub mono">BNB Chain · 24h</span>
      </header>
      <ol>
        {rows.length ? rows.map((t, i) => (
          <li key={t.id}>
            <button onClick={() => onPick(t.sym)} aria-label={`Call $${t.sym}`}>
              <span className="rk mono">{i + 1}</span>
              <TokenIcon t={t} size={32} />
              <span className="nm"><b>${t.sym}</b><small>{t.name} · {t.src}</small></span>
              <span className="px"><b className="mono">{fmtUsd(t.mcap)}</b><small className={`mono ${t.chg >= 0 ? 'up' : 'down'}`}>{fmtPct(t.chg)}</small></span>
              <span className="go">Call<Arrow /></span>
            </button>
          </li>
        )) : Array.from({ length: 5 }, (_, i) => <li key={i} className="ghost"><span /></li>)}
      </ol>
      <footer className="mono">Free to call · win at 1.2x · paid in BNB</footer>
    </aside>
  )
}

/** $UPW contract address with a copy button, or "coming soon" before launch. */
function ContractChip({ className = '' }) {
  const { toast } = useApp()
  const ca = BRAND.ca
  if (!ca) return <span className={`lp-ca mono ${className}`} title="The $UPW contract address is published at launch"><b>CA</b>Coming soon</span>
  const copy = async () => {
    try { await navigator.clipboard?.writeText(ca); toast('Contract address copied', 'check') }
    catch { toast(ca, 'info') }
  }
  return (
    <button className={`lp-ca mono ${className}`} onClick={copy} title={`Copy ${ca}`} aria-label={`Copy contract address ${ca}`}>
      <b>CA</b>{ca.slice(0, 6)}…{ca.slice(-4)}<IconCopy />
    </button>
  )
}

/** Round social link; shows "coming soon" until the link is set in brand.js / .env. */
function Social({ href, label, children }) {
  if (!href) return <span className="lp-social off" title={`${label}: coming soon`} aria-label={`${label}: coming soon`}>{children}</span>
  return <a className="lp-social" href={href} target="_blank" rel="noreferrer noopener" aria-label={`Upwell on ${label}`} title={`Upwell on ${label}`}>{children}</a>
}

export default function Landing() {
  const { go, openToken } = useApp()
  const launch = (sym) => { go('bubbles'); if (sym) setTimeout(() => openToken(sym), 0) }

  // the landing is one screen: no page scroll while it is shown
  useEffect(() => {
    document.documentElement.classList.add('lp-lock')
    return () => document.documentElement.classList.remove('lp-lock')
  }, [])

  return (
    <div className="lp">
      <Water />

      <header className="lp-top">
        <span className="lp-brand"><Logo size={30} /><span>{BRAND.name}</span></span>
        <ContractChip className="lp-top-ca" />
        <div className="lp-top-right">
          <button className="lp-link" onClick={() => go('docs')}>Docs</button>
          <button className="lp-btn glass sm" onClick={() => launch()}>Launch app</button>
        </div>
      </header>

      <main className="lp-main">
        <section className="lp-copy">
          <p className="lp-eyebrow mono">Token calls · on-chain reputation · weekly BNB</p>
          <h1>Call it before<br /><span>the crowd does.</span></h1>
          <p className="lp-sub">Spot new BNB Chain tokens early, call them for free, and build a record nobody can fake. The best callers share the vault every week.</p>
          <div className="lp-ctas">
            <button className="lp-btn water" onClick={() => launch()}>Start calling<Arrow /></button>
            <button className="lp-btn ghost" onClick={() => go('leaderboard')}>View leaderboard</button>
          </div>
        </section>
        <RisingNow onPick={launch} />
      </main>

      <footer className="lp-bottom">
        <ol className="lp-steps mono">
          <li><b>01</b> Pick a token</li>
          <li><b>02</b> Call it free</li>
          <li><b>03</b> Earn BNB at 1.2x</li>
        </ol>
        <span className="lp-hint mono" aria-hidden="true"><i />Touch the water</span>
        <div className="lp-meta">
          <ContractChip className="lp-bottom-ca" />
          <Social href={BRAND.x} label="X"><IconX /></Social>
          <Social href={BRAND.telegram} label="Telegram"><IconTelegram /></Social>
        </div>
      </footer>
      <p className="lp-legal">Not financial advice. New tokens are very risky.</p>
    </div>
  )
}
