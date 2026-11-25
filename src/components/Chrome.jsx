// App chrome: ocean background, header, ticker, mobile tab bar, toasts.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useApp, SCREENS } from '../store/AppContext'
import { market, useMarket } from '../store/market'
import { api } from '../lib/api'
import { TICKER } from '../data/demo'
import { fmtPct, prefersReducedMotion } from '../lib/format'
import { NavIcons, ToastIcons, IconSearch } from './Icons'
import { Logo, TokenIcon } from './Bits'

const LABELS = { bubbles: 'Bubbles', explore: 'Explore', leaderboard: 'Leaderboard', rewards: 'Rewards', upw: '$UPW', docs: 'Docs' }
const TAB_LABELS = { bubbles: 'Bubbles', explore: 'Explore', leaderboard: 'Ranks', rewards: 'Rewards', upw: '$UPW', docs: 'Docs' }

export function OceanBackground() {
  const bubbles = useMemo(() => {
    if (prefersReducedMotion()) return []
    return Array.from({ length: 20 }, () => {
      const d = Math.random()
      const cls = d < 0.35 ? 'far' : d > 0.8 ? 'near' : ''
      const s = cls === 'far' ? 6 + Math.random() * 14 : cls === 'near' ? 30 + Math.random() * 34 : 12 + Math.random() * 22
      return { cls, s, left: Math.random() * 100, dur: 22 + Math.random() * 30, delay: -Math.random() * 40 }
    })
  }, [])
  const wave = (cls, fill, d) => (
    <svg className={cls} viewBox="0 0 2880 150" preserveAspectRatio="none"><path fill={fill} d={d} /></svg>
  )
  return (
    <div className="ocean" aria-hidden="true">
      <div className="glow" />
      <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />
      <div className="rays"><i /><i /><i /><i /><i /></div>
      <div className="caustic" />
      <div>
        {bubbles.map((b, i) => (
          <span key={i} className={`bb ${b.cls}`} style={{ left: b.left + '%', width: b.s, height: b.s, animationDuration: b.dur + 's', animationDelay: b.delay + 's' }} />
        ))}
      </div>
      <div className="waves">
        {wave('w1', '#9FD9EE', 'M0 70 C 240 30 480 30 720 70 S 1200 110 1440 70 S 1920 30 2160 70 S 2640 110 2880 70 V150 H0Z')}
        {wave('w3', '#3FA9D6', 'M0 118 C 260 100 460 100 720 118 S 1180 136 1440 118 S 1900 100 2160 118 S 2620 136 2880 118 V150 H0Z')}
        {wave('w2', '#6CC3E4', 'M0 95 C 180 70 540 70 720 95 S 1260 125 1440 95 S 1980 70 2160 95 S 2700 125 2880 95 V150 H0Z')}
      </div>
    </div>
  )
}

function Search() {
  const { go, screen, openToken } = useApp()
  const tokens = useMarket()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const input = useRef(null)
  const box = useRef(null)
  const query = q.trim().replace(/^\$/, '').toLowerCase()
  const matches = query ? tokens.filter((t) => t.sym.toLowerCase().includes(query) || t.name.toLowerCase().includes(query)).slice(0, 6) : []

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName) && window.innerWidth >= 960) { e.preventDefault(); input.current?.focus() }
      if (e.key === 'Escape' && open) { setOpen(false); input.current?.blur() }
    }
    const onDown = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open])

  const pick = (sym) => {
    setQ(''); setOpen(false)
    if (screen !== 'bubbles') go('bubbles')
    openToken(sym)
    window.dispatchEvent(new CustomEvent('upwell:ripple', { detail: sym }))
  }

  return (
    <div className="search" role="search" ref={box}>
      <IconSearch />
      <label className="sr-only" htmlFor="searchInput">Search tokens</label>
      <input id="searchInput" ref={input} type="search" placeholder="Search tokens" autoComplete="off" value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) pick(matches[0].sym) }} />
      <kbd aria-hidden="true">/</kbd>
      <div className={`search-results glass ${open && query ? 'open' : ''}`} role="listbox" aria-label="Search results">
        {matches.length ? matches.map((t) => (
          <button key={t.sym} role="option" aria-selected="false" onClick={() => pick(t.sym)}>
            <TokenIcon t={t} size={24} />
            <span style={{ fontWeight: 600, color: 'var(--navy)' }}>${t.sym}</span>
            <span className="muted" style={{ fontSize: 12 }}>{t.name}</span>
            <span className={`mono ${t.chg >= 0 ? 'up' : 'down'}`} style={{ marginLeft: 'auto', fontSize: 12 }}>{fmtPct(t.chg)}</span>
          </button>
        )) : <div className="muted" style={{ padding: 10, fontSize: 13 }}>No tokens match.</div>}
      </div>
    </div>
  )
}

function WalletButton() {
  const { wallet, toggleWallet, walletPulse, connecting, me } = useApp()
  const ref = useRef(null)
  useEffect(() => {
    if (!walletPulse || prefersReducedMotion() || !ref.current?.animate) return
    ref.current.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 420, iterations: 2 })
  }, [walletPulse])
  return (
    <button ref={ref} id="walletBtn" className={`btn-water ${wallet ? 'connected' : ''}`} onClick={toggleWallet} disabled={!!connecting}
      aria-label={wallet ? `Wallet ${me?.address}. Open account menu` : 'Connect wallet'}>
      {wallet ? <><span className="wallet-dot" aria-hidden="true" /><span className="mono">{me?.address}</span></> : connecting ? 'Check your wallet…' : 'Connect wallet'}
    </button>
  )
}

export function Header() {
  const { screen, go, vault } = useApp()
  return (
    <header className="topbar glass">
      <a className="brand" href="#" onClick={(e) => { e.preventDefault(); go('landing') }} aria-label="Upwell home">
        <Logo />
        <span><span className="brand-name">Upwell</span><span className="brand-sub">BNB Chain</span></span>
      </a>
      <nav className="nav" aria-label="Main">
        {SCREENS.map((s) => {
          const Icon = NavIcons[s]
          return <button key={s} onClick={() => go(s)} aria-current={screen === s ? 'page' : undefined}><Icon />{LABELS[s]}</button>
        })}
      </nav>
      <Search />
      <div className="hdr-right">
        {vault?.source === 'chain' && (
          <a className="vault-pill" href={vault.explorer} target="_blank" rel="noreferrer noopener" title="Live from the RewardVault contract. Verify on BscScan" style={{ textDecoration: 'none' }}>
            <span className="vl">Reward vault</span><b>{vault.bnb.toFixed(2)} BNB</b>
          </a>
        )}
        {vault?.source === 'tax' && vault.tax?.isBnb && (
          <a className="vault-pill" href={vault.explorer} target="_blank" rel="noreferrer noopener" title="This week's real $UPW tax income. Verify on BscScan" style={{ textDecoration: 'none' }}>
            <span className="vl">Reward vault</span><b>{vault.bnb.toFixed(2)} BNB</b>
          </a>
        )}
        {vault?.source === 'demo' && (
          <div className="vault-pill" title="Preview: simulated balance for this week"><span className="vl">Reward vault · preview</span><b>{vault.bnb.toFixed(2)} BNB</b></div>
        )}
        <WalletButton />
      </div>
    </header>
  )
}

const shortName = (n) => (n && n.startsWith('0x') && n.length > 20 ? `${n.slice(0, 5)}…${n.slice(-2)}` : n)

/** Winning calls: from the API when online (refreshed on every win), demo list otherwise. */
function useTickerItems() {
  const { online } = useApp()
  const [wins, setWins] = useState(null)
  useEffect(() => {
    if (!online) { setWins(null); return }
    let alive = true
    const load = () => api('/ticker').then((r) => alive && setWins(r.wins.map((w) => [shortName(w.caller), w.sym, w.multiple.toFixed(2) + 'x']))).catch(() => {})
    load()
    const off = market.onWin(load)
    const id = setInterval(load, 60000)
    return () => { alive = false; off(); clearInterval(id) }
  }, [online])
  return online ? wins : TICKER
}

const marketChecked = () => market.status().checked

export function Ticker() {
  const list = useTickerItems()
  const checked = useSyncExternalStore(market.subscribe, marketChecked)
  // until the server has answered (and its wins have loaded), show a quiet placeholder, not demo names
  const { online } = useApp()
  if (!checked || (online && !list)) {
    return (
      <div className="ticker glass" aria-label="Winning calls" aria-busy="true">
        <div className="ticker-label"><span className="live-dot" aria-hidden="true" /><span className="tl">Winning calls</span></div>
        <div className="ticker-wrap"><div className="ticker-wait" aria-hidden="true"><i /><i /><i /></div></div>
      </div>
    )
  }
  if (list && !list.length) {
    return (
      <div className="ticker glass" aria-label="Winning calls">
        <div className="ticker-label"><span className="live-dot" aria-hidden="true" /><span className="tl">Winning calls</span></div>
        <div className="ticker-wrap"><span className="ticker-item" style={{ paddingLeft: 16, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>No winning calls yet this season. Yours could be the first.</span></div>
      </div>
    )
  }
  const TICKER = list || []
  const items = [...TICKER, ...TICKER]
  return (
    <div className="ticker glass" aria-label="Winning calls">
      <div className="ticker-label"><span className="live-dot" aria-hidden="true" /><span className="tl">Winning calls</span></div>
      <div className="ticker-wrap">
        <div className="ticker-track">
          {items.map(([who, sym, x], i) => (
            <span key={i} className="ticker-item" aria-hidden={i >= TICKER.length || undefined}><b>{who}</b> · ${sym} · <span className="x">{x}</span></span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TabBar() {
  const { screen, go } = useApp()
  return (
    <nav className="tabbar glass" aria-label="Main">
      {SCREENS.map((s) => {
        const Icon = NavIcons[s]
        return <button key={s} onClick={() => go(s)} aria-current={screen === s ? 'page' : undefined}><Icon />{TAB_LABELS[s]}</button>
      })}
    </nav>
  )
}

export function Toasts() {
  const { toasts } = useApp()
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ToastIcons[t.icon] || ToastIcons.info
        return <div key={t.id} className={`toast glass ${t.out ? 'out' : ''}`}><Icon /><span>{t.msg}</span></div>
      })}
    </div>
  )
}
