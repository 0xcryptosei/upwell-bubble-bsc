import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../store/AppContext'
import { market, useMarket } from '../store/market'
import { SOURCES, TICKER, PEOPLE } from '../data/demo'
import { api, API_URL } from '../lib/api'
import { fmtAge, fmtPct, fmtUsd, fmtX } from '../lib/format'
import { Avatar, Tag, TierTag, TokenIcon } from '../components/Bits'

const SORTS = [
  { id: 'new', label: 'New', by: (a, b) => a.age - b.age },
  { id: 'gainers', label: 'Gainers', by: (a, b) => b.chg - a.chg },
  { id: 'volume', label: 'Volume', by: (a, b) => b.vol - a.vol },
  { id: 'safest', label: 'Safest', by: (a, b) => (b.safety ?? -1) - (a.safety ?? -1) },
]
const COLORS = [['#FFD38A', '#C98A00'], ['#7FD8E6', '#0E7C99'], ['#8EC5E8', '#2F6FA8'], ['#6FE0D2', '#11897E'], ['#5BC0EB', '#0B5F8F']]
const short = (n) => (n && n.startsWith('0x') && n.length > 20 ? `${n.slice(0, 6)}…${n.slice(-4)}` : n)
const risk = (s) => (s == null ? '' : s >= 70 ? 'up' : s >= 40 ? 'warn' : 'down')

/** Tiny inline trend line for a table row. */
function MiniSpark({ data, up }) {
  if (!data || data.length < 2) return null
  const w = 84, h = 26
  const mn = Math.min(...data), mx = Math.max(...data), rg = mx - mn || 1
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${((i / (data.length - 1)) * w).toFixed(1)} ${(h - 3 - ((v - mn) / rg) * (h - 6)).toFixed(1)}`).join(' ')
  return <svg className="ex-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><path d={d} fill="none" stroke={up ? '#079455' : '#D92D20'} strokeWidth="1.6" strokeLinejoin="round" /></svg>
}

/** Recent winning calls and this week's top callers (API when online, demo data offline). */
function useCommunity(online) {
  const [wins, setWins] = useState(null)
  const [top, setTop] = useState(null)
  useEffect(() => {
    if (!online) {
      setWins(TICKER.map(([caller, sym, x]) => ({ caller, sym, multiple: parseFloat(x) })))
      setTop(PEOPLE.slice(0, 5).map((p, i) => ({ display: p.name, tier: p.tier, c: p.c, winRate: [0.78, 0.74, 0.71, 0.69, 0.67][i], score: [2480, 2310, 2150, 1990, 1860][i] })))
      return
    }
    let alive = true
    const loadWins = () => api('/ticker').then((r) => alive && setWins(r.wins)).catch(() => alive && setWins([]))
    const loadTop = () => api('/leaderboard?period=weekly&limit=5').then((r) => alive && setTop(r.rows.map((x, i) => ({ ...x, c: COLORS[i % COLORS.length] })))).catch(() => alive && setTop([]))
    loadWins(); loadTop()
    const off = market.onWin(() => { loadWins(); loadTop() })
    const id = setInterval(() => { loadWins(); loadTop() }, 60000)
    return () => { alive = false; off(); clearInterval(id) }
  }, [online])
  return { wins, top }
}

export default function Explore() {
  const { go, openToken, online } = useApp()
  const tokens = useMarket()
  const [sort, setSort] = useState('new')
  const [src, setSrc] = useState('All')
  const { wins, top } = useCommunity(online)

  const rows = useMemo(() => {
    const by = SORTS.find((s) => s.id === sort).by
    return tokens.filter((t) => src === 'All' || t.src === src).slice().sort(by)
    // tokens is mutated in place by live price updates; re-sort on each render
  }, [tokens, sort, src, tokens.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const open = (sym) => { go('bubbles'); setTimeout(() => openToken(sym), 0) }

  return (
    <section className="screen active" aria-labelledby="exH">
      <div className="page-head">
        <div>
          <h1 className="page-title" id="exH">Explore</h1>
          <p className="page-sub">Every new BNB Chain token, live. Sort it your way, see who is winning, and make your call.</p>
        </div>
      </div>

      <div className="ex-layout">
        <div className="glass ex-main">
          <div className="ex-bar">
            <div className="seg" role="tablist" aria-label="Sort tokens">
              {SORTS.map((s) => <button key={s.id} className="pill-btn" role="tab" aria-selected={sort === s.id} onClick={() => setSort(s.id)}>{s.label}</button>)}
            </div>
            <div className="seg" role="group" aria-label="Launchpad">
              {SOURCES.map((s) => <button key={s} className="pill-btn" aria-pressed={src === s} onClick={() => setSrc(s)}>{s}</button>)}
            </div>
          </div>
          <div className="table-wrap ex-table">
            <table>
              <thead>
                <tr>
                  <th>Token</th><th className="num col-age">Age</th><th className="num">Market cap</th><th className="num">24h</th>
                  <th className="col-chart">Trend</th><th className="num col-vol">Volume</th><th className="num">Safety</th><th aria-label="Action" />
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} onClick={() => open(t.sym)} className="ex-row">
                    <td>
                      <span className="who">
                        <TokenIcon t={t} size={32} />
                        <span className="ex-tok"><b>${t.sym}</b><small>{t.name} · {t.src}</small></span>
                        {t.isNew && <Tag tone="gold">New</Tag>}
                      </span>
                    </td>
                    <td className="num col-age">{fmtAge(t.age)}</td>
                    <td className="num">{fmtUsd(t.mcap)}</td>
                    <td className={`num ${t.chg >= 0 ? 'up' : 'down'}`}>{fmtPct(t.chg)}</td>
                    <td className="col-chart"><MiniSpark data={t.spark} up={t.chg >= 0} /></td>
                    <td className="num col-vol">{fmtUsd(t.vol)}</td>
                    <td className="num"><Tag tone={risk(t.safety)}>{t.safety ?? '—'}</Tag></td>
                    <td className="num"><button className="btn-glass ex-call" onClick={(e) => { e.stopPropagation(); open(t.sym) }}>Call</button></td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={8} className="empty">No tokens from {src} right now.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="ex-side">
          <div className="glass card">
            <div className="card-title"><span>Recent wins</span><span className="live-dot" aria-hidden="true" /></div>
            {wins === null && <p className="muted ex-note">Loading…</p>}
            {wins && !wins.length && <p className="muted ex-note">No winning calls yet. Calls are judged when their window ends.</p>}
            <ul className="ex-list">
              {(wins || []).slice(0, 6).map((w, i) => (
                <li key={i}>
                  <span className="ex-who">{short(w.caller)}</span>
                  <span className="muted">called</span>
                  {w.avatar && <img className="ex-av" src={w.avatar.startsWith('/') ? API_URL + w.avatar : w.avatar} alt="" aria-hidden="true" width="18" height="18" loading="lazy" />}
                  <b>${w.sym}</b>
                  <span className="ex-x up mono">{fmtX(w.multiple)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass card">
            <div className="card-title"><span>Top callers this week</span></div>
            {top === null && <p className="muted ex-note">Loading…</p>}
            {top && !top.length && <p className="muted ex-note">The board fills up as calls are judged. Be the first.</p>}
            <ol className="ex-callers">
              {(top || []).map((r, i) => (
                <li key={r.display + i}>
                  <span className="rank mono">{i + 1}</span>
                  <Avatar person={{ name: short(r.display).replace(/^0x/, ''), c: r.c }} size={32} />
                  <span className="ex-caller"><b>{short(r.display)}</b><TierTag tier={r.tier} style={{ height: 18, fontSize: 10.5 }} /></span>
                  <span className="mono ex-wr">{Math.round(r.winRate * 100)}%<small>win rate</small></span>
                </li>
              ))}
            </ol>
            <button className="btn-glass ex-more" onClick={() => go('leaderboard')}>Full leaderboard</button>
          </div>
        </aside>
      </div>
    </section>
  )
}
