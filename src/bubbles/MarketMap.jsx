import { useEffect, useRef, useState } from 'react'
import { market, useMarket } from '../store/market'
import { useApp } from '../store/AppContext'
import { SOURCES } from '../data/demo'
import { prefersReducedMotion } from '../lib/format'
import { createMapEngine } from './mapEngine'
import { createWater } from '../landing/water'
import { IconHand } from '../components/Icons'

export default function MarketMap() {
  const { selected, openToken, toast, screen } = useApp()
  const canvasRef = useRef(null)
  const waterRef = useRef(null)
  const stageRef = useRef(null)
  const engineRef = useRef(null)
  const [filter, setFilter] = useState({ src: 'All', safe: false })
  const filterRef = useRef(filter)
  const selectedRef = useRef(selected)
  const openRef = useRef(openToken)
  filterRef.current = filter
  selectedRef.current = selected
  openRef.current = openToken

  useEffect(() => {
    // the same 3D water as the landing page, underneath the bubbles
    const reduced = prefersReducedMotion()
    const water = createWater(waterRef.current, { reducedMotion: reduced })
    const engine = createMapEngine({
      onWater: water ? (x, y, radius, strength) => water.drop(x, y, radius, strength) : undefined,
      canvas: canvasRef.current,
      stage: stageRef.current,
      getTokens: market.getTokens,
      getFilter: () => filterRef.current,
      getSelected: () => selectedRef.current,
      onSelect: (sym) => openRef.current(sym),
      reducedMotion: prefersReducedMotion(),
    })
    engineRef.current = engine
    // the odd raindrop so the water stays alive (its ripple gently moves the bubbles nearby)
    const rain = water && !reduced && setInterval(() => { if (!document.hidden) engine.rain() }, 3200)
    const offPrices = market.subscribe(() => engine.sync())
    const onRipple = (e) => engine.ripple(e.detail)
    window.addEventListener('upwell:ripple', onRipple)
    return () => { offPrices(); window.removeEventListener('upwell:ripple', onRipple); engine.destroy(); clearInterval(rain); water?.destroy() }
  }, [])

  // toast for each new listing while Bubbles is open
  const screenRef = useRef(screen)
  screenRef.current = screen
  useEffect(() => market.onListing((t) => {
    if (screenRef.current === 'bubbles') toast(<>New listing: <b>${t.sym}</b> on {t.src}</>, 'new')
  }), [toast])

  useEffect(() => { engineRef.current?.refilter() }, [filter])

  // nothing matches the filter: say so instead of showing empty water
  const all = useMarket()
  const none = all.length > 0 && !all.some((t) => (filter.src === 'All' || t.src === filter.src) && (!filter.safe || (t.safety ?? -1) >= 70))

  // loading state until the first token list arrives
  const [ready, setReady] = useState(() => market.getTokens().length > 0)
  useEffect(() => {
    if (ready) return
    const check = () => { if (market.getTokens().length) setReady(true) }
    check()
    return market.subscribe(check)
  }, [ready])

  return (
    <div className="map glass">
      <div className="map-head">
        <div className="map-title">
          <h2 id="bubblesH">Market map · BNB Chain</h2>
          <span className="live"><span className="live-dot" aria-hidden="true" />Live</span>
        </div>
        <div className="map-filters">
          <div className="seg" role="group" aria-label="Launch source">
            {SOURCES.map((s) => (
              <button key={s} className="pill-btn" aria-pressed={filter.src === s} onClick={() => setFilter((f) => ({ ...f, src: s }))}>{s}</button>
            ))}
          </div>
          <span className="divider-v" aria-hidden="true" />
          <div className="seg" role="group" aria-label="Sort and safety">
            <button className="pill-btn" aria-pressed={!filter.safe} onClick={() => setFilter((f) => ({ ...f, safe: false }))}>Trending</button>
            <button className="pill-btn" aria-pressed={filter.safe} onClick={() => setFilter((f) => ({ ...f, safe: true }))}>Safety 70+</button>
          </div>
        </div>
      </div>
      <div className="stage" ref={stageRef}>
        <canvas ref={waterRef} className="stage-water" aria-hidden="true" />
        <canvas ref={canvasRef} role="img" aria-label="Market map: floating bubbles sized by 24 hour volume. Use search to open a token by name." />
        <div className={`map-loading ${ready ? 'hide' : ''}`} role="status" aria-live="polite">
          <span className="map-loading-orb" aria-hidden="true"><i /><i /><i /></span>
          <b>Loading the live market</b>
          <span>Fresh BNB Chain tokens, prices and safety checks</span>
        </div>
        <div className={`map-loading map-empty ${none ? '' : 'hide'}`} role="status" aria-live="polite">
          <b>No {filter.src === 'All' ? '' : filter.src + ' '}tokens{filter.safe ? ' with safety 70+' : ''} on the map right now</b>
          <span>New ones appear here as soon as they trade. Try another filter.</span>
        </div>
        <div className={`map-hint ${selected || !ready || none ? 'hide' : ''}`} aria-hidden="true"><IconHand />Select a bubble to see token details</div>
        <div className="stage-legend" aria-hidden="true">
          <span>Size = 24h volume</span>
          <span><i style={{ background: 'var(--up)' }} />Up</span>
          <span><i style={{ background: 'var(--down)' }} />Down</span>
        </div>
      </div>
    </div>
  )
}
