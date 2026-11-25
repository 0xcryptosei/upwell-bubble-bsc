import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../store/AppContext'
import { Tag, Tilt } from '../components/Bits'
import { IconAlert, IconClock, ToastIcons } from '../components/Icons'
import { api, weiToBnb } from '../lib/api'
import { claimRewards, activeWallet } from '../lib/wallet'
import { remain } from '../lib/format'

const SPLIT = [
  { label: 'Top callers', pct: 60, color: '#1BAAE0', bar: 'linear-gradient(90deg,#2EC5EC,#0A8BD0)' },
  { label: '$UPW stakers', pct: 25, color: '#0A6FAF' },
  { label: 'Buyback & burn', pct: 10, color: '#0B3B5C' },
  { label: 'Operations', pct: 5, color: '#8FB3C3' },
]

/** Time until the next Monday 00:00 UTC, when the week closes. */
function untilPayout(now = Date.now()) {
  const d = new Date(now)
  const dow = (d.getUTCDay() + 6) % 7
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + (7 - dow) * 86400e3
  return remain(next - now)
}

export default function Rewards() {
  const { wallet, toast, needWallet, online, session, vault } = useApp()
  const [demoClaimed, setDemoClaimed] = useState(false)
  const [mine, setMine] = useState(null) // { claimableWei, epochs }
  const [cfg, setCfg] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    if (!online || !session) { setMine(null); return }
    api('/me/rewards').then(setMine).catch(() => setMine({ claimableWei: '0', epochs: [] }))
  }, [online, session])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (online) api('/config').then(setCfg).catch(() => {}) }, [online])

  // ---------- amounts ----------
  // chain = live contract balance, test = DEMO_VAULT_BNB, soon = no vault deployed (or server unreachable)
  const vaultState = !online ? 'soon' : !vault ? 'loading' : vault.source === 'chain' ? 'chain' : vault.source === 'demo' ? 'test' : 'soon'
  const vaultBnb = vault ? vault.bnb : null
  const pending = mine?.epochs.filter((e) => !e.onChain) || []
  const claimable = mine?.epochs.filter((e) => e.onChain && !e.claimed) || []
  const claimBnb = online ? weiToBnb(mine?.claimableWei || '0') : 0.42
  const pendingBnb = pending.reduce((a, e) => a + weiToBnb(e.amountWei), 0)

  const claim = async () => {
    if (!wallet) return needWallet('Connect a wallet to claim rewards')
    if (!online) {
      if (demoClaimed) return
      setDemoClaimed(true)
      return toast('0.42 BNB claimed to 0x7a3F…1c3F (offline demo)', 'check')
    }
    if (!claimable.length) return
    if (!cfg?.contracts?.vault) return toast('The Reward Vault is not deployed yet', 'info')
    if (!activeWallet()) return toast('Open your wallet and connect again to claim.', 'wallet')
    setBusy(true)
    try {
      const hash = await claimRewards({ vault: cfg.contracts.vault, epochs: claimable })
      toast(`Claim sent · ${hash.slice(0, 10)}…`, 'check')
      setTimeout(load, 8000)
    } catch (err) {
      toast(/reject|denied/i.test(err.message) ? 'Claim cancelled' : err.shortMessage || err.message, 'wallet')
    } finally {
      setBusy(false)
    }
  }

  const claimed = online ? false : demoClaimed
  let claimLabel = claimed ? 'Claimed' : `Claim ${claimBnb.toFixed(claimBnb < 0.01 && claimBnb > 0 ? 4 : 2)} BNB`
  let claimNote = 'Paid to your connected wallet. Network fee about 0.0003 BNB.'
  let disabled = claimed || busy
  if (online) {
    if (!session) { claimLabel = 'Connect wallet to see rewards'; claimNote = 'Rewards go to the top callers on the weekly leaderboard.'; disabled = false }
    else if (!claimable.length) {
      disabled = true
      claimLabel = 'Nothing to claim yet'
      claimNote = pending.length
        ? `${pendingBnb.toFixed(4)} BNB from week ${pending.map((e) => e.epoch).join(', ')} becomes claimable when the week is published on-chain.`
        : 'Finish the week in the top 100 to earn a share of the vault.'
    }
  }

  return (
    <section className="screen active" aria-labelledby="rwH">
      <div className="page-head">
        <div>
          <h1 className="page-title" id="rwH">Rewards</h1>
          <p className="page-sub">The Reward Vault is funded by the $UPW trading tax and paid out weekly in BNB.</p>
        </div>
      </div>
      <div className="rewards-grid">
        <Tilt className="glass card vault-card" max={3}>
          <div className="card-title"><span>Reward vault</span><Tag><IconClock />next payout in <b className="mono">{untilPayout()}</b></Tag></div>
          {vaultState === 'soon'
            ? <div className="vault-amt" style={{ fontSize: 30 }}>Opens at launch</div>
            : <div className="vault-amt">{vaultBnb == null ? '…' : vaultBnb.toFixed(2)}<small>BNB</small></div>}
          {vaultState === 'chain' && <a className="muted" href={vault.explorer} target="_blank" rel="noreferrer noopener" style={{ display: 'inline-block', marginBottom: 8, fontSize: 13 }}>Live from the RewardVault contract · Verify on BscScan ↗</a>}
          {vaultState === 'test' && <p className="muted" style={{ margin: '0 0 8px', fontSize: 13 }}><Tag tone="gold">Test value</Tag> Not real BNB: the vault contract is not deployed yet.</p>}
          {vaultState === 'soon' && <p className="muted" style={{ margin: '0 0 8px', fontSize: 13 }}>The balance will be read live from the RewardVault contract on BNB Chain, so anyone can verify it.</p>}
          <p className="muted" style={{ margin: 0 }}>Funded by $UPW buy and sell tax on Flap.sh. Split every week:</p>
          <div className="split" aria-hidden="true">
            {SPLIT.map((s) => <i key={s.label} style={{ width: s.pct + '%', background: s.bar || s.color }} />)}
          </div>
          <div className="legend">
            {SPLIT.map((s) => <div key={s.label}><i style={{ background: s.color }} />{s.label}<b>{s.pct}%</b></div>)}
          </div>
        </Tilt>
        <Tilt className="glass card" max={3}>
          <div className="card-title"><span>Claimable</span>{(!online || claimable.length > 0) && <Tag tone="gold">{online ? `${claimable.length} week${claimable.length > 1 ? 's' : ''}` : 'Week 2 payout'}</Tag>}</div>
          <div className="claim-amt">{claimBnb.toFixed(claimBnb < 0.01 && claimBnb > 0 ? 4 : 2)} <small style={{ fontSize: 16 }}>BNB</small></div>
          <button className="btn-water btn-lg" onClick={claim} disabled={disabled}>
            {claimed ? <><ToastIcons.check />Claimed</> : busy ? 'Confirm in your wallet…' : claimLabel}
          </button>
          <p className="note">{claimNote}</p>
        </Tilt>
        <Tilt className="glass card" max={3}>
          <div className="card-title"><span>Your $UPW stake</span><Tag>Phase 2 preview</Tag></div>
          <div className="stats2">
            <div className="stat"><span>Staked</span><b>{online ? '—' : '48,200 UPW'}</b></div>
            <div className="stat"><span>Pool share</span><b>{online ? '—' : '0.31%'}</b></div>
            <div className="stat"><span>Paid last 7 days</span><b className="gold">{online ? '—' : '0.0099 BNB'}</b></div>
            <div className="stat"><span>Lock</span><b>None</b></div>
          </div>
          {online && <p className="note" style={{ textAlign: 'left' }}>Staking opens in Phase 2.</p>}
        </Tilt>
        <div className="glass card disclaimer">
          <IconAlert />
          <p style={{ margin: 0 }}>Payouts depend on trading volume and change every week. Past payouts do not promise future ones.</p>
        </div>
      </div>
    </section>
  )
}
