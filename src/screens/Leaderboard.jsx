import { useEffect, useState } from 'react'
import { useApp } from '../store/AppContext'
import { PEOPLE, ME } from '../data/demo'
import { fmtInt } from '../lib/format'
import { api, weiToBnb } from '../lib/api'
import { Avatar, Tag, TierTag } from '../components/Bits'

const TABS = ['Daily', 'Weekly', 'Season 1']
const PERIOD = { Daily: 'daily', Weekly: 'weekly', 'Season 1': 'season' }
const COLORS = [['#FFD38A', '#C98A00'], ['#7FD8E6', '#0E7C99'], ['#8EC5E8', '#2F6FA8'], ['#6FE0D2', '#11897E'], ['#5BC0EB', '#0B5F8F'], ['#9DB8D6', '#3B5B85']]
const shortName = (n) => (n.startsWith('0x') && n.length > 20 ? `${n.slice(0, 6)}…${n.slice(-4)}` : n)

function Row({ rank, r, reward }) {
  return (
    <tr className={r.me ? 'me' : ''} aria-label={r.me ? 'Your rank' : undefined}>
      <td className={`rank ${rank <= 3 ? 'top' : ''}`}>{String(rank).padStart(2, '0')}</td>
      <td><span className="who"><Avatar person={r} size={32} />{r.name}{r.me && <Tag tone="aqua" style={{ height: 18 }}>You</Tag>}</span></td>
      <td className="col-tier"><TierTag tier={r.tier} /></td>
      <td className="num">{r.wr}%</td>
      <td className="num col-best up">{r.best ? r.best.toFixed(1) + 'x' : '—'}</td>
      <td className="num">{fmtInt(r.score)}</td>
      <td className="num gold" style={{ fontWeight: 600 }}>{reward == null ? '—' : reward.toFixed(3) + ' BNB'}</td>
    </tr>
  )
}

/** Real rankings from the API. */
function useBoard(tab, online, signedIn) {
  const [data, setData] = useState({ tab: null, rows: [], me: null, error: null })
  useEffect(() => {
    if (!online) return
    let alive = true
    const load = () => api(`/leaderboard?period=${PERIOD[tab]}&limit=50`)
      .then((d) => alive && setData({ tab, rows: d.rows, me: d.me, error: null }))
      .catch((err) => alive && setData({ tab, rows: [], me: null, error: err.message }))
    load()
    const id = setInterval(load, 30000)
    return () => { alive = false; clearInterval(id) }
  }, [tab, online, signedIn])
  return data
}

const toRow = (r, myAddr) => ({
  name: shortName(r.display), tier: r.tier, c: COLORS[parseInt(r.address.slice(2, 4), 16) % COLORS.length],
  wr: Math.round(r.winRate * 100), best: r.best, score: r.score, me: r.address === myAddr,
  reward: r.estRewardWei != null ? weiToBnb(r.estRewardWei) : null, rank: r.rank,
})

// ---------- offline demo ----------
const BASE = [[78, 24.6, 2480], [74, 18.2, 2310], [71, 31.4, 2150], [69, 12.8, 1990], [67, 9.6, 1860], [66, 14.3, 1720], [64, 7.7, 1610], [63, 6.1, 1530], [61, 8.8, 1440], [60, 5.2, 1390], [59, 4.9, 1350], [58, 6.4, 1300]]
const ORDER = { Daily: [2, 0, 4, 1, 3, 6, 5, 8, 7, 10, 9, 11], Weekly: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 'Season 1': [1, 0, 3, 2, 4, 5, 7, 6, 8, 9, 11, 10] }
const SCALE = { Daily: 0.18, Weekly: 1, 'Season 1': 3.6 }
const POOL = { Daily: 0.14, Weekly: 1, 'Season 1': 3.2 }
const SHARE = [0.2, 0.15, 0.12, 0.1, 0.08, 0.07, 0.06, 0.05, 0.045, 0.04, 0.035, 0.03]
const MY_RANK = { Daily: 9, Weekly: 14, 'Season 1': 27 }

function demoRows(tab) {
  const f = SCALE[tab], pool = 12.84 * 0.6 * POOL[tab]
  const rows = ORDER[tab].map((pi, i) => ({ ...PEOPLE[pi], wr: BASE[i][0], best: BASE[i][1], score: Math.round(BASE[i][2] * f) }))
  const me = { ...ME, wr: 62, best: 31.4, score: Math.round(1340 * f), me: true }
  const myRank = MY_RANK[tab]
  let list, tail = null
  if (myRank <= 12) { list = [...rows]; list.splice(myRank - 1, 0, me); list = list.slice(0, 13) }
  else { list = rows; tail = me }
  return {
    rows: list.map((r, i) => ({ ...r, rank: i + 1, reward: pool * (SHARE[i] ?? 0.025) })),
    tail: tail && { ...tail, rank: myRank, reward: pool * 0.012 },
  }
}

export default function Leaderboard() {
  const { online, session } = useApp()
  const [tab, setTab] = useState('Weekly')
  const live = useBoard(tab, online, !!session)
  const myAddr = session?.address

  let rows, tail = null, note = null
  if (online) {
    rows = live.tab === tab ? live.rows.map((r) => toRow(r, myAddr)) : []
    if (live.me && !rows.some((r) => r.me)) tail = toRow(live.me, myAddr)
    if (live.error) note = live.error
    else if (live.tab === tab && !rows.length) note = 'No finished calls in this period yet. Calls appear here once they are judged.'
  } else {
    ;({ rows, tail } = demoRows(tab))
  }

  return (
    <section className="screen active" aria-labelledby="lbH">
      <div className="page-head">
        <div>
          <h1 className="page-title" id="lbH">Leaderboard</h1>
          <p className="page-sub">Ranked by score: wins, size of wins and consistency.{online && tab !== 'Weekly' ? ' Rewards are paid on the weekly board.' : ''}</p>
        </div>
        <div className="seg" role="tablist" aria-label="Leaderboard period">
          {TABS.map((t) => <button key={t} className="pill-btn" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}
        </div>
      </div>
      <div className="glass table-wrap">
        <table>
          <thead>
            <tr><th>Rank</th><th>Caller</th><th className="col-tier">Tier</th><th className="num">Win rate</th><th className="num col-best">Best call</th><th className="num">Score</th><th className="num">Est. reward</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => <Row key={r.name + r.rank} rank={r.rank} r={r} reward={r.reward} />)}
            {tail && <><tr className="gap"><td colSpan={7}>· · ·</td></tr><Row rank={tail.rank} r={tail} reward={tail.reward} /></>}
            {note && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 28 }}>{note}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
