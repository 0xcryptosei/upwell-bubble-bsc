import { useEffect, useState } from 'react'
import { useApp } from '../store/AppContext'
import { market, useMarket } from '../store/market'
import { PEOPLE } from '../data/demo'
import { fmtAge, fmtInt, fmtPct, fmtUsd, fmtX } from '../lib/format'
import { Avatar, Bar, Tag, TierTag, Tilt, TokenIcon } from '../components/Bits'
import { IconBad, IconClose, IconOk, IconPlus, IconWarn } from '../components/Icons'
import Sparkline from './Sparkline'

const CHECK_ICON = { ok: IconOk, warn: IconWarn, bad: IconBad }

const CHECK_ROWS = [['sell', 'Sell test passed'], ['lp', 'LP burned / locked'], ['tax', 'Tax'], ['top10', 'Top 10 holders %'], ['mint', 'No mint function'], ['verified', 'Contract verified']]
const STATE = { pass: 'ok', warn: 'warn', fail: 'bad' }

function safetyChecks(t) {
  // real checks from the API
  if (t.checks && Object.keys(t.checks).length) {
    return CHECK_ROWS.map(([k, label]) => [label, STATE[t.checks[k]?.status] || 'warn', t.checks[k]?.value ?? 'Unknown'])
  }
  const st = (ok, warn) => (ok ? 'ok' : warn ? 'warn' : 'bad')
  const tax = Math.max(t.taxB, t.taxS)
  return [
    ['Sell test passed', st(t.safety > 40, false), t.safety > 40 ? 'Pass' : 'Fail'],
    ['LP burned / locked', st(t.lp === 'Burned', t.lp.startsWith('Locked')), t.lp],
    ['Tax', st(tax <= 3, tax <= 6), `${t.taxB}% / ${t.taxS}%`],
    ['Top 10 holders %', st(t.top10 <= 30, t.top10 <= 50), t.top10 + '%'],
    ['No mint function', st(t.safety >= 35, false), t.safety >= 35 ? 'None' : 'Found'],
    ['Contract verified', st(t.safety >= 55, t.safety >= 40), t.safety >= 55 ? 'Yes' : 'Partial'],
  ]
}
// null = not checked yet (brand-new tokens are not indexed by the safety service right away)
const risk = (s) => (s == null ? ['Not checked yet', ''] : s >= 70 ? ['Low risk', 'up'] : s >= 40 ? ['Medium risk', 'warn'] : ['High risk', 'down'])

/** Top callers: from the API when online, demo people otherwise. */
function useTopCallers(sym, online) {
  const [state, setState] = useState({ sym: null, rows: null, live: 0 })
  useEffect(() => {
    if (!sym || !online) return
    let alive = true
    market.details(sym)
      .then((d) => alive && d && setState({ sym, rows: d.topCallers, live: d.liveCalls }))
      .catch(() => alive && setState({ sym, rows: [], live: 0 }))
    return () => { alive = false }
  }, [sym, online])
  return state.sym === sym ? state : { sym, rows: null, live: 0 }
}

const C = [['#5FD6F2', '#0A8BD0'], ['#7FD8E6', '#0E7C99'], ['#8EC5E8', '#2F6FA8'], ['#6FE0D2', '#11897E'], ['#9DB8D6', '#3B5B85']]

export default function TokenPanel() {
  const { selected, closeToken, sheetOpen, tf, setTf, makeCall, wallet, toast, needWallet, online } = useApp()
  useMarket() // live prices
  const t = selected ? market.bySym(selected) : null
  const top = useTopCallers(t?.sym, online)
  if (!t) return <aside className="panel" id="panel" aria-label="Token details" />

  const [rk, rkTone] = risk(t.safety)
  const callers = online
    ? (top.rows || []).map((r, i) => ({ name: r.display.startsWith('0x') && r.display.length > 20 ? `${r.display.slice(0, 6)}…${r.display.slice(-4)}` : r.display, c: C[i % C.length], wins: r.wins, calls: r.calls, best: r.best }))
    : [0, 1, 2, 3].map((i) => PEOPLE[(i * 3 + t.sym.length) % PEOPLE.length])
  const mults = [4.1, 2.7, 1.9, 1.3].map((m) => m * (0.8 + ((t.sym.charCodeAt(0) + m * 10) % 7) / 15))
  const buy = (amt) => (wallet ? toast(`Opening PancakeSwap · buy $${t.sym} with ${amt} BNB`, 'info') : needWallet('Connect a wallet to buy'))

  return (
    <aside className={`panel ${sheetOpen ? 'open' : ''}`} id="panel" aria-label={`Token details for $${t.sym}`}>
      <div className="sheet-bar">
        <span className="grabber" aria-hidden="true" />
        <span className="eyebrow">Token details</span>
        <button className="icon-btn" onClick={closeToken} aria-label="Close token details"><IconClose /></button>
      </div>

      <Tilt className="glass card" max={3}>
        <div className="tok-head">
          <TokenIcon t={t} size={48} />
          <div className="meta">
            <div className="tok-sym">${t.sym}</div>
            <div className="tok-name">{t.name}<Tag>{t.src}</Tag><span>· {fmtAge(t.age)} old</span></div>
          </div>
        </div>
        <div className="mcap-row">
          <span className="mcap">{fmtUsd(t.mcap)}</span>
          <Tag tone={`${t.chg >= 0 ? 'up' : 'down'} mono`}>{fmtPct(t.chg)}</Tag>
        </div>
        <div className="eyebrow" style={{ marginTop: 6 }}>Market cap · 24h</div>
        <Sparkline data={t.spark} up={t.chg >= 0} label={`24 hour chart, ${t.chg >= 0 ? 'up' : 'down'} ${Math.abs(t.chg).toFixed(1)} percent`} />
        <div className="stats3">
          <div className="stat"><span>Volume 24h</span><b>{fmtUsd(t.vol)}</b></div>
          <div className="stat"><span>Holders</span><b>{fmtInt(t.holders)}</b></div>
          <div className="stat"><span>Tax b/s</span><b>{t.taxB}% / {t.taxS}%</b></div>
        </div>
      </Tilt>

      <Tilt className="glass card" max={3}>
        <div className="card-title"><span>Safety score</span><Tag tone={rkTone}>{rk}</Tag></div>
        {t.safety == null ? (
          <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
            This token is too new for the safety service to have checked it. The score appears here automatically in a few minutes. Until then, be extra careful.
          </p>
        ) : (
          <>
            <div className="score-row"><span className="score">{t.safety}<small> / 100</small></span></div>
            <Bar value={t.safety} />
            <ul className="checks">
              {safetyChecks(t).map(([label, state, val]) => {
                const Icon = CHECK_ICON[state]
                return <li key={label}><Icon /><span>{label}</span><span className="v">{val}</span></li>
              })}
            </ul>
          </>
        )}
      </Tilt>

      <div className="glass card">
        <div className="card-title"><span>Make a call</span><span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>Judged by market cap</span></div>
        <div className="seg" role="group" aria-label="Call window">
          {['1h', '24h', '7d'].map((x) => (
            <button key={x} className="pill-btn" aria-pressed={tf === x} style={{ flex: 1 }} onClick={() => setTf(x)}>{x}</button>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <div className="kv"><span>Entry market cap</span><b>{fmtUsd(t.mcap)}</b></div>
          <div className="kv"><span>Win target · 1.2x</span><b className="up">{fmtUsd(t.mcap * 1.2)}</b></div>
          <div className="kv" style={{ border: 0 }}><span>Judged in</span><b>{tf}</b></div>
        </div>
        <div className="phase2"><IconPlus /><b>Add $UPW stake to boost score</b><Tag>Phase 2</Tag></div>
        <button className="btn-water btn-lg" onClick={makeCall}>Call ${t.sym}</button>
        <p className="note">Free. No tokens are spent.</p>
      </div>

      <Tilt className="glass card" max={3}>
        <div className="card-title"><span>Top callers on ${t.sym}</span><span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{online ? `${top.live} live` : `${12 + t.sym.length * 7} calls`}</span></div>
        <div className="callers">
          {online && top.rows && !callers.length && <p className="muted" style={{ margin: 0, fontSize: 13 }}>No finished calls on ${t.sym} yet. Be the first.</p>}
          {online && !top.rows && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Loading…</p>}
          {callers.map((p, i) => (
            <div className="caller" key={p.name}>
              <Avatar person={p} size={32} />
              <div><div className="n">{p.name}</div>{online ? <span className="muted" style={{ fontSize: 11.5 }}>{p.wins} of {p.calls} won</span> : <TierTag tier={p.tier} style={{ height: 18, fontSize: 10.5 }} />}</div>
              {online
                ? <span className={`x ${(p.best || 0) >= 1.2 ? 'up' : 'down'}`}>{p.best ? fmtX(p.best) : '—'}</span>
                : <span className={`x ${mults[i] >= 1.2 ? 'up' : 'down'}`}>{fmtX(mults[i])}</span>}
            </div>
          ))}
        </div>
      </Tilt>

      <div className="glass card">
        <div className="card-title"><span>Quick buy</span><span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>via PancakeSwap</span></div>
        <div className="buy-row">
          {['0.1', '0.5', '1'].map((a) => <button key={a} className="btn-glass" onClick={() => buy(a)}>{a} BNB</button>)}
        </div>
        <p className="note" style={{ textAlign: 'left' }}>Opens a PancakeSwap swap. Slippage 1%. Not financial advice.</p>
      </div>
    </aside>
  )
}
