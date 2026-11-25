import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { ME } from '../data/demo'
import { Avatar, Bar, TierTag, Tilt } from '../components/Bits'
import { IconCopy } from '../components/Icons'
import { api } from '../lib/api'
import { fmtInt } from '../lib/format'

const ICONS = {
  '10x': <><path d="M4 18 10 11l3 3 7-8" /><path d="M15 6h5v5" /></>,
  streak7: <path d="M12 3c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10z" />,
  safety: <><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
  top100: <path d="M5 20V12M12 20V5M19 20v-5" />,
  early: <><circle cx="12" cy="12" r="8" /><path d="M12 4v2M12 18v2M4 12h2M18 12h2" /></>,
  sniper: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></>,
  whale: <path d="M3 14c3-5 9-6 14-3l4-3v8l-4-2c-5 3-11 2-14 0z" />,
  season1: <path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />,
  legend: <path d="M5 18h14M6 18l-1.5-9 4.5 3.5L12 6l3 6.5L19.5 9 18 18" />,
}

// offline demo profile
const DEMO = {
  display: ME.name, tier: 'Hunter', xp: 1340, next: { tier: 'Sniper', xp: 2000, remaining: 660 }, prevXp: 500,
  calls: 58, winRate: 0.62, bestMultiple: 31.4, streak: 6,
  badges: [['10x', '10x call', true], ['streak7', '7-day streak', false], ['safety', 'Safety first', true], ['top100', 'Top 100', true], ['early', 'Early bird', true],
    ['sniper', 'Sniper tier', false], ['whale', 'Whale spotter', false], ['season1', 'Season 1', false], ['legend', 'Legend', false]].map(([key, name, earned]) => ({ key, name, earned })),
}
const TIER_XP = { Rookie: 0, Hunter: 500, Sniper: 2000, Legend: 6000 }

export default function Profile() {
  const { go, toast, online, session, profile, refreshProfile, needWallet, me } = useApp()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')

  if (online && !session) {
    return (
      <section className="screen active" aria-labelledby="pfH">
        <div className="glass card empty" style={{ textAlign: 'center', padding: 40 }}>
          <h1 className="prof-name" id="pfH" style={{ marginBottom: 8 }}>Your caller profile</h1>
          <p className="muted" style={{ margin: '0 0 18px' }}>Connect a wallet to see your XP, tier, streak and badges.</p>
          <button className="btn-water" onClick={() => needWallet('Connect a wallet to see your profile')}>Connect wallet</button>
        </div>
      </section>
    )
  }

  const p = online ? profile : DEMO
  if (!p) return <section className="screen active"><div className="glass card empty">Loading profile…</div></section>

  const addr = online ? session.address : ME.fullAddress
  const from = online ? TIER_XP[p.tier] ?? 0 : DEMO.prevXp
  const pct = p.next ? Math.round(((p.xp - from) / (p.next.xp - from)) * 100) : 100
  const earned = p.badges.filter((b) => b.earned).length

  const copy = async () => {
    try { await navigator.clipboard?.writeText(addr) } catch { /* clipboard may be blocked */ }
    toast('Address copied', 'check')
  }
  const save = async (e) => {
    e.preventDefault()
    try {
      await api('/me', { method: 'PATCH', body: { name: name.trim() || null } })
      await refreshProfile()
      setEditing(false)
      toast('Name saved', 'check')
    } catch (err) { toast(err.message, 'wallet') }
  }

  return (
    <section className="screen active" aria-labelledby="pfH">
      <Tilt className="glass card prof-card" max={2}>
        <div className="prof-head">
          <Avatar person={{ name: (p.display || 'Y').replace(/^0x/, ''), c: ME.c }} size={72} />
          <div style={{ flex: 1, minWidth: 200 }}>
            {editing ? (
              <form onSubmit={save} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="sr-only" htmlFor="nameInput">Display name</label>
                <input id="nameInput" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="e.g. tidewatcher.bnb"
                  style={{ height: 38, padding: '0 12px', borderRadius: 12, border: '1px solid var(--line)', background: 'rgba(255,255,255,.8)', minWidth: 180 }} />
                <button className="btn-water" type="submit" style={{ height: 38 }}>Save</button>
                <button className="btn-glass" type="button" style={{ height: 38 }} onClick={() => setEditing(false)}>Cancel</button>
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="prof-name" id="pfH">{online ? me?.name : p.display}</h1><TierTag tier={p.tier} />
                {online && <button className="btn-glass" style={{ height: 28, padding: '0 10px', fontSize: 12 }} onClick={() => { setName(profile?.name || ''); setEditing(true) }}>{profile?.name ? 'Edit name' : 'Set a name'}</button>}
              </div>
            )}
            <button className="addr" onClick={copy} aria-label={`Copy wallet address ${addr}`}>{addr.slice(0, 6)}…{addr.slice(-4)} <IconCopy /></button>
          </div>
          <button className="btn-glass" onClick={() => go('calls')}>View my calls</button>
        </div>
      </Tilt>

      <div className="stats4" style={{ marginTop: 'var(--gap)' }}>
        {[
          ['Calls', fmtInt(p.calls)],
          ['Win rate', p.calls ? Math.round(p.winRate * 100) + '%' : '—'],
          ['Best call', p.bestMultiple ? p.bestMultiple.toFixed(1) + 'x' : '—', p.bestMultiple ? 'var(--up)' : undefined],
          ['Daily streak', `${p.streak} day${p.streak === 1 ? '' : 's'}`],
        ].map(([k, v, c]) => (
          <Tilt key={k} className="glass stat-big"><span>{k}</span><b style={c ? { color: c } : undefined}>{v}</b></Tilt>
        ))}
      </div>

      <div className="glass card" style={{ marginTop: 'var(--gap)' }}>
        <div className="card-title">
          <span>{p.next ? `Tier progress · ${p.tier} → ${p.next.tier}` : `Tier · ${p.tier}`}</span>
          <span className="mono" style={{ fontSize: 13, color: 'var(--navy)' }}>{fmtInt(p.xp)}{p.next ? ` / ${fmtInt(p.next.xp)}` : ''} XP</span>
        </div>
        <Bar value={Math.max(0, Math.min(100, pct))} height={12} />
        <p className="muted" style={{ margin: '10px 0 0', fontSize: 12.5 }}>
          {p.next ? `${fmtInt(p.next.remaining)} XP to ${p.next.tier}. ` : 'Top tier reached. '}A winning call earns 20–120 XP based on its multiple.
        </p>
      </div>

      <div className="glass card" style={{ marginTop: 'var(--gap)' }}>
        <div className="card-title"><span>Soulbound badges</span><span className="muted" style={{ fontWeight: 400, fontSize: 12.5 }}>{earned} of {p.badges.length} earned</span></div>
        <div className="badges">
          {p.badges.map((b) => (
            <div key={b.key} className={`badge ${b.earned ? 'earned' : 'locked'}`} title={b.desc}>
              <Tilt as="span" className="orb" max={14}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[b.key]}</svg>
              </Tilt>
              <span>{b.name}{!b.earned && <><br /><small className="muted">Locked</small></>}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
