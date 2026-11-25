import { useEffect, useId, useRef, useState } from 'react'
import { useApp } from '../store/AppContext'
import { market, useMarket } from '../store/market'
import { TF_MS } from '../data/demo'
import { fmtUsd, fmtX, remain } from '../lib/format'
import { Tag, Tilt } from '../components/Bits'

function Ring({ frac, color }) {
  const id = useId().replace(/:/g, '')
  const r = 31, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true">
      <defs><linearGradient id={`rg${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2EC5EC" /><stop offset="1" stopColor={color} /></linearGradient></defs>
      <circle cx="36" cy="36" r={r} fill="rgba(255,255,255,.5)" stroke="rgba(11,59,92,.08)" strokeWidth="6" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={`url(#rg${id})`} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
    </svg>
  )
}

// Price for calls on tokens no longer on the map
const simulated = new Map()
function currentCap(call) {
  const t = market.bySym(call.sym)
  if (t) return t.mcap
  if (call.current != null) return call.current // from the API
  if (!simulated.has(call.id)) simulated.set(call.id, call.entry * (1 + (Math.random() - 0.3) * 0.4))
  return simulated.get(call.id)
}

export default function MyCalls() {
  const { calls, setCalls, online, wallet, refreshCalls, refreshProfile } = useApp()
  useMarket()
  const [now, setNow] = useState(Date.now())
  const lastAsk = useRef(0)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // online: the server judges calls. Ask for results every few seconds while one is waiting.
  useEffect(() => {
    if (!online || !calls.live.some((c) => now >= c.end)) return
    if (now - lastAsk.current < 5000) return
    lastAsk.current = now
    refreshCalls()
    refreshProfile()
  }, [now, online, calls.live, refreshCalls, refreshProfile])

  // offline demo: settle calls locally when their window ends
  useEffect(() => {
    if (online) return
    const ended = calls.live.filter((c) => now - c.start >= TF_MS[c.tf])
    if (!ended.length) return
    setCalls((cs) => ({
      live: cs.live.filter((c) => !ended.includes(c)),
      done: [...ended.map((c) => { const exit = currentCap(c); return { ...c, exit, won: exit / c.entry >= 1.2 } }), ...cs.done],
    }))
  }, [now, online, calls.live, setCalls])

  const won = calls.done.filter((c) => c.won).length
  const empty = online && !wallet ? 'Connect a wallet to see your calls.' : 'No live calls. Open a token on Bubbles and make a call.'

  return (
    <section className="screen active" aria-labelledby="callsH">
      <div className="page-head">
        <div>
          <h1 className="page-title" id="callsH">My calls</h1>
          <p className="page-sub">Each call is judged by market cap at the end of its window. A win is 1.2x or more.</p>
        </div>
        <div className="seg"><Tag tone="up">{won} won</Tag><Tag tone="down">{calls.done.length - won} lost</Tag></div>
      </div>

      <div className="section-h"><h2>Live</h2><Tag tone="aqua">{calls.live.length}</Tag></div>
      <div className="grid-cards">
        {calls.live.length ? calls.live.map((c) => {
          const cur = currentCap(c), m = cur / c.entry
          const el = Math.min(now - c.start, TF_MS[c.tf])
          const judging = el >= TF_MS[c.tf]
          const tone = m >= 1.2 ? 'up' : m < 1 ? 'down' : ''
          return (
            <Tilt as="article" key={c.id} className="glass call-card" style={c.fresh ? { boxShadow: 'var(--shadow),0 0 0 2px rgba(46,197,236,.55)' } : undefined}>
              <div className="ring"><Ring frac={1 - el / TF_MS[c.tf]} color="#0A8BD0" /><div className="t"><div>{judging ? '…' : remain(TF_MS[c.tf] - el)}<small>{judging ? 'judging' : 'left'}</small></div></div></div>
              <div>
                <div className="call-top"><span className="call-sym">${c.sym}</span><Tag tone="aqua">Live</Tag><Tag>{c.tf}</Tag>{c.fresh && <Tag tone="gold">New</Tag>}</div>
                <div className={`mult ${tone}`} style={!tone ? { color: 'var(--navy)' } : undefined}>{fmtX(m)}</div>
                <div className="flow">{fmtUsd(c.entry)} → {fmtUsd(cur)}</div>
              </div>
            </Tilt>
          )
        }) : <div className="glass empty">{empty}</div>}
      </div>

      <div className="section-h"><h2>Finished</h2><Tag>{calls.done.length}</Tag></div>
      <div className="grid-cards">
        {calls.done.map((c) => (
          <Tilt as="article" key={c.id} className="glass call-card">
            <div className="ring"><Ring frac={1} color={c.won ? '#079455' : '#D92D20'} /><div className="t"><div>{c.tf}<small>ended</small></div></div></div>
            <div>
              <div className="call-top"><span className="call-sym">${c.sym}</span><Tag tone={c.won ? 'up' : c.status === 'void' ? '' : 'down'}>{c.won ? 'Won' : c.status === 'void' ? 'Void' : 'Lost'}</Tag><Tag>{c.tf}</Tag></div>
              <div className={`mult ${c.won ? 'up' : 'down'}`}>{c.exit ? fmtX(c.exit / c.entry) : '—'}</div>
              <div className="flow">{fmtUsd(c.entry)} → {c.exit ? fmtUsd(c.exit) : 'no price'}</div>
            </div>
          </Tilt>
        ))}
      </div>
    </section>
  )
}
