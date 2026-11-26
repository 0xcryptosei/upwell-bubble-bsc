// $UPW staking card (Rewards page). Turns itself on when the backend reports a staking contract (STAKING_ADDRESS
// in backend/.env): no frontend change is needed when staking launches.
import { useCallback, useEffect, useState } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useApp } from '../store/AppContext'
import { api } from '../lib/api'
import { stakeUpw, unstakeUpw, claimStakingRewards, activeWallet } from '../lib/wallet'
import { Tag, Tilt } from './Bits'

const fmt = (wei, decimals = 18, max = 2) => {
  const n = Number(formatUnits(BigInt(wei || 0), decimals))
  return n.toLocaleString('en-US', { maximumFractionDigits: n > 0 && n < 1 ? 4 : max })
}

export default function StakingCard() {
  const { online, session, wallet, needWallet, toast } = useApp()
  const [data, setData] = useState(null) // { pool, me? } or { pool: { enabled: false } }
  const [mode, setMode] = useState('stake')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(null) // 'approve' | 'stake' | 'unstake' | 'claim'

  const load = useCallback(() => {
    if (!online) return
    const req = session?.address ? api(`/staking/${session.address}`) : api('/staking').then((pool) => ({ pool }))
    req.then(setData).catch(() => {})
  }, [online, session?.address])
  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id) }, [load])

  const pool = data?.pool
  const me = data?.me
  const live = !!pool?.enabled
  const sym = pool?.token?.symbol ? `$${pool.token.symbol}` : '$UPW'
  const dec = pool?.token?.decimals ?? 18
  const share = live && me && BigInt(pool.totalStaked) > 0n ? (Number(BigInt(me.staked) * 1000000n / BigInt(pool.totalStaked)) / 10000) : 0

  const max = () => setAmount(formatUnits(BigInt(mode === 'stake' ? me?.wallet || 0 : me?.staked || 0), dec))
  let parsed = null
  try { parsed = amount ? parseUnits(amount.trim(), dec) : null } catch { parsed = null }
  const limit = BigInt(mode === 'stake' ? me?.wallet || 0 : me?.staked || 0)
  const amountError = amount && (parsed == null || parsed <= 0n) ? 'Enter an amount' : parsed != null && parsed > limit ? (mode === 'stake' ? `You have ${fmt(limit, dec)} ${sym}` : `You have ${fmt(limit, dec)} ${sym} staked`) : null

  const guard = () => {
    if (!wallet || !session) { needWallet('Connect a wallet to stake'); return false }
    const w = activeWallet()
    if (!w) { toast('Open your wallet and connect again.', 'wallet'); return false }
    if (w.address?.toLowerCase() !== session.address.toLowerCase()) { toast(`Switch your wallet to ${session.address.slice(0, 6)}…${session.address.slice(-4)}.`, 'wallet'); return false }
    return true
  }
  const run = async (label, fn, done) => {
    if (!guard()) return
    try {
      await fn()
      toast(done, 'check')
      setAmount('')
    } catch (err) {
      toast(/reject|denied/i.test(err.message) ? 'Cancelled' : err.shortMessage || err.message, 'wallet')
    } finally {
      setBusy(null)
      setTimeout(load, 1500)
    }
    void label
  }
  const submit = () => {
    if (!parsed || amountError) return
    if (mode === 'stake') {
      run('stake', () => stakeUpw({ staking: pool.address, token: pool.token.address, amount: parsed, allowance: me.allowance, onStep: setBusy }), `Staked ${amount} ${sym}`)
    } else {
      setBusy('unstake')
      run('unstake', () => unstakeUpw({ staking: pool.address, amount: parsed }), `Unstaked ${amount} ${sym}`)
    }
  }
  const claim = () => { setBusy('claim'); run('claim', () => claimStakingRewards({ staking: pool.address }), `Claimed ${fmt(me.earnedWei, 18, 4)} BNB`) }

  const busyLabel = { approve: 'Approve in your wallet…', stake: 'Confirm the stake…', unstake: 'Confirm in your wallet…', claim: 'Confirm in your wallet…' }[busy]

  return (
    <Tilt className="glass card stake-card" max={3}>
      <div className="card-title"><span>{sym} staking</span>{live ? (pool.paused ? <Tag tone="gold">Paused</Tag> : <Tag tone="up">Live</Tag>) : <Tag>Opens soon</Tag>}</div>

      {!live ? (
        <>
          <div className="stats2">
            <div className="stat"><span>Share of the vault</span><b>25%</b></div>
            <div className="stat"><span>Paid out over</span><b>7 days</b></div>
            <div className="stat"><span>Paid in</span><b>BNB</b></div>
            <div className="stat"><span>Lock</span><b>None</b></div>
          </div>
          <p className="note" style={{ textAlign: 'left' }}>Stake {sym} to share 25% of the Reward Vault in BNB. Opens after {sym} launches; it will appear here automatically.</p>
        </>
      ) : (
        <>
          <div className="stats2">
            <div className="stat"><span>Your stake</span><b>{me ? `${fmt(me.staked, dec)}` : '—'}</b></div>
            <div className="stat"><span>Earned</span><b className="gold">{me ? `${fmt(me.earnedWei, 18, 4)} BNB` : '—'}</b></div>
            <div className="stat"><span>Pool share</span><b>{me ? `${share.toFixed(2)}%` : '—'}</b></div>
            <div className="stat"><span>Pool pays</span><b>{fmt(pool.weeklyRewardWei, 18, 3)} BNB/wk</b></div>
          </div>

          {!session ? (
            <button className="btn-water stake-btn" onClick={() => needWallet('Connect a wallet to stake')}>Connect wallet to stake</button>
          ) : (
            <>
              <div className="seg stake-seg" role="group" aria-label="Stake or unstake">
                <button className="pill-btn" aria-pressed={mode === 'stake'} onClick={() => { setMode('stake'); setAmount('') }}>Stake</button>
                <button className="pill-btn" aria-pressed={mode === 'unstake'} onClick={() => { setMode('unstake'); setAmount('') }}>Unstake</button>
              </div>
              <div className="stake-input">
                <input inputMode="decimal" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} aria-label={`Amount of ${sym}`} />
                <span className="mono">{sym}</span>
                <button className="stake-max" onClick={max}>Max</button>
              </div>
              {amountError && <p className="stake-err">{amountError}</p>}
              <button className="btn-water stake-btn" disabled={!parsed || !!amountError || !!busy || (mode === 'stake' && pool.paused)} onClick={submit}>
                {busy && busy !== 'claim' ? busyLabel : mode === 'stake' ? `Stake ${sym}` : `Unstake ${sym}`}
              </button>
              <button className="btn-glass stake-btn" disabled={!me || BigInt(me.earnedWei) === 0n || !!busy} onClick={claim}>
                {busy === 'claim' ? busyLabel : `Claim ${me ? fmt(me.earnedWei, 18, 4) : '0'} BNB`}
              </button>
              <p className="note" style={{ textAlign: 'left' }}>
                In your wallet: {me ? fmt(me.wallet, dec) : '—'} {sym} · No lock · Rewards stream over 7 days
                {mode === 'stake' && me && parsed && BigInt(me.allowance) < parsed ? ' · First stake asks for an approval' : ''}
              </p>
            </>
          )}
        </>
      )}
    </Tilt>
  )
}
