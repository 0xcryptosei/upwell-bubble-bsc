// $UPW: what the token is, its contract, how its tax funds the Reward Vault, and what holding it does.
// Nothing here is invented: the CA, links and market data come from the backend (upw.json + GeckoTerminal / GoPlus);
// unknown values show as "at launch".
import { useApp } from '../store/AppContext'
import { BRAND } from '../brand'
import { Logo, Tag, Tilt } from '../components/Bits'
import { IconAlert, IconCopy } from '../components/Icons'
import { fmtUsd, fmtPct, fmtInt } from '../lib/format'
import { weiToBnb } from '../lib/api'
import { useContracts } from '../lib/useContracts'

const SPLIT = [
  { label: 'Top callers', pct: 60, color: '#1BAAE0', bar: 'linear-gradient(90deg,#2EC5EC,#0A8BD0)', text: 'Paid in BNB every week, by leaderboard score.' },
  { label: `$${BRAND.token} stakers`, pct: 25, color: '#0A6FAF', text: 'Shared by everyone staking, pro rata. No lock.' },
  { label: 'Buyback & burn', pct: 10, color: '#0B3B5C', text: `Buys $${BRAND.token} on the market and burns it.` },
  { label: 'Operations', pct: 5, color: '#8FB3C3', text: 'Data, hosting and audits.' },
]

const FLOW = [
  { n: '01', title: 'Every trade is taxed', text: `Buying or selling $${BRAND.token} on Flap.sh pays a small tax, in BNB.` },
  { n: '02', title: 'The tax fills the vault', text: 'It flows into the Reward Vault contract on BNB Chain, where anyone can see it.' },
  { n: '03', title: 'The vault pays out weekly', text: 'Every Monday it splits between callers, stakers and buyback & burn.' },
]

const UTILITY = [
  { title: 'Stake, earn BNB', text: `Stake $${BRAND.token} to share 25% of the vault each week. Unstake any time.`, tag: 'Phase 2' },
  { title: 'Boost your calls', text: `Add a $${BRAND.token} stake to a call to raise the score it can earn.`, tag: 'Phase 2' },
  { title: 'Fewer tokens over time', text: `10% of every week's vault buys back $${BRAND.token} and burns it.`, tag: 'At launch' },
]

export default function Token() {
  const { toast, vault, go, upw } = useApp()
  const chain = useContracts()
  const ca = upw.ca
  const scan = upw.explorer
  const m = upw.market
  const copy = async () => {
    try { await navigator.clipboard?.writeText(ca); toast('Contract address copied', 'check') } catch { toast(ca, 'info') }
  }

  return (
    <section className="screen active" aria-labelledby="upwH">
      <div className="page-head">
        <div className="tk-head">
          <Logo size={56} />
          <div>
            <h1 className="page-title" id="upwH">${BRAND.token}</h1>
            <p className="page-sub">The token behind {BRAND.name}. Its trading tax fills the Reward Vault that pays the best callers every week.</p>
          </div>
        </div>
        <div className="tk-actions">
          {upw.buyUrl
            ? <a className="btn-water" href={upw.buyUrl} target="_blank" rel="noreferrer noopener">Buy ${BRAND.token} ↗</a>
            : upw.launched
              ? <button className="btn-water" disabled title="The buy link is being added">Buy link soon</button>
              : <button className="btn-water" disabled title="Buying opens when the token launches on Flap.sh">Buy at launch</button>}
          {upw.chart && <a className="btn-glass" href={upw.chart} target="_blank" rel="noreferrer noopener">Chart ↗</a>}
          {scan && <a className="btn-glass" href={scan} target="_blank" rel="noreferrer noopener">BscScan ↗</a>}
        </div>
      </div>

      <div className="tk-grid">
        <Tilt className="glass card tk-facts" max={2}>
          <div className="card-title"><span>Token</span>{ca ? <Tag tone="up">Live</Tag> : <Tag>Launching soon</Tag>}</div>
          <dl>
            <div><dt>Contract (CA)</dt><dd>
              {ca
                ? <button className="tk-ca mono" onClick={copy} aria-label={`Copy contract address ${ca}`}>{ca}<IconCopy /></button>
                : <span className="muted">Published at launch</span>}
            </dd></div>
            <div><dt>Ticker</dt><dd className="mono">${BRAND.token}</dd></div>
            <div><dt>Network</dt><dd>BNB Chain (BEP-20)</dd></div>
            <div><dt>Launchpad</dt><dd>Flap.sh</dd></div>
            <div><dt>Tax goes to</dt><dd>Reward Vault contract</dd></div>
          </dl>
        </Tilt>

        <Tilt className="glass card tk-vault" max={2}>
          <div className="card-title"><span>Reward Vault</span><Tag tone="gold">Weekly</Tag></div>
          {vault?.source === 'chain' ? (
            <>
              <div className="tk-vault-amt mono">{vault.bnb.toFixed(2)}<small>BNB</small></div>
              <a className="muted" href={vault.explorer} target="_blank" rel="noreferrer noopener" style={{ fontSize: 13 }}>Live from the contract · Verify on BscScan ↗</a>
            </>
          ) : vault?.source === 'tax' ? (
            <>
              <div className="tk-vault-amt mono">{vault.tax.isBnb ? vault.bnb.toFixed(2) : '0.00'}<small>BNB</small></div>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                {vault.tax.isBnb && !vault.tax.marketAddress
                  ? <>No creator wallet: all of this token's tax goes to holders as dividends ({weiToBnb(vault.tax.dividendWei).toFixed(3)} BNB so far), so none reaches the vault.</>
                  : vault.tax.isBnb && vault.tax.mode === 'allTime'
                  ? <><Tag tone="up">Live</Tag> All-time $UPW tax income, read from the token's tax contract. Weekly totals start Monday. · <a href={vault.explorer} target="_blank" rel="noreferrer noopener">Verify ↗</a></>
                  : vault.tax.isBnb
                  ? <><Tag tone="up">Live</Tag> This week's $UPW tax income, read from the token's tax contract. All-time: {weiToBnb(vault.tax.totalWei).toFixed(2)} BNB · <a href={vault.explorer} target="_blank" rel="noreferrer noopener">Verify ↗</a></>
                  : <>The $UPW tax is paid in {vault.tax.currency}, not BNB.</>}
              </p>
            </>
          ) : vault?.source === 'demo' ? (
            <>
              <div className="tk-vault-amt mono">{vault.bnb.toFixed(2)}<small>BNB</small></div>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}><Tag tone="gold">Preview</Tag> Simulated balance for this week. It resets every Monday when the week is paid out.</p>
            </>
          ) : (
            <>
              <div className="tk-vault-soon">Opens at launch</div>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>The balance will be read live from the RewardVault contract, so anyone can verify it.</p>
            </>
          )}
          <button className="btn-glass tk-vault-btn" onClick={() => go('rewards')}>Rewards &amp; claiming</button>
        </Tilt>
      </div>

      <Market upw={upw} m={m} />

      <div className="section-h"><h2>How ${BRAND.token} works</h2></div>
      <ol className="tk-flow">
        {FLOW.map((f) => (
          <li key={f.n} className="glass card"><span className="tk-n mono">{f.n}</span><h3>{f.title}</h3><p>{f.text}</p></li>
        ))}
      </ol>

      <div className="section-h"><h2>Where the vault goes</h2><span className="muted" style={{ fontSize: 13 }}>every week</span></div>
      <div className="glass card tk-split">
        <div className="split" aria-hidden="true">
          {SPLIT.map((s) => <i key={s.label} style={{ width: s.pct + '%', background: s.bar || s.color }} />)}
        </div>
        <ul>
          {SPLIT.map((s) => (
            <li key={s.label}>
              <span className="sw" style={{ background: s.color }} aria-hidden="true" />
              <b className="mono">{s.pct}%</b>
              <span><strong>{s.label}</strong><small>{s.text}</small></span>
            </li>
          ))}
        </ul>
      </div>

      <div className="section-h"><h2>What holding ${BRAND.token} gives you</h2></div>
      <div className="tk-utility">
        {UTILITY.map((u) => {
          // staking switches to "Live" (with a link) by itself once the backend reports the staking contract
          const live = u.title === 'Stake, earn BNB' && chain.stakingLive
          return (
            <Tilt key={u.title} className="glass card" max={4}>
              <div className="card-title"><span>{u.title}</span>{live ? <Tag tone="up">Live</Tag> : <Tag tone={u.tag === 'At launch' ? 'aqua' : ''}>{u.title === 'Stake, earn BNB' ? 'After launch' : u.tag}</Tag>}</div>
              <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>{u.text}</p>
              {live && <button className="btn-glass" style={{ marginTop: 10 }} onClick={() => go('rewards')}>Stake on Rewards</button>}
            </Tilt>
          )
        })}
      </div>

      <div className="glass card disclaimer" style={{ marginTop: 'var(--gap)' }}>
        <IconAlert />
        <p style={{ margin: 0 }}>${BRAND.token} is a utility token, not an investment. Its price can go to zero. Calling tokens on {BRAND.name} is always free and never requires ${BRAND.token}.</p>
      </div>
    </section>
  )
}

/** Live $UPW market data: from the backend once the token trades, otherwise an honest "not yet". */
function Market({ upw, m }) {
  const tax = (v) => (v == null ? '—' : (Math.round(v * 10) / 10) + '%')
  const stats = m && m.indexed ? [
    ['Price', m.priceUsd == null ? '—' : m.priceUsd < 0.01 ? '$' + m.priceUsd.toPrecision(3) : '$' + m.priceUsd.toFixed(4)],
    ['Market cap', m.mcap == null ? '—' : fmtUsd(m.mcap)],
    ['24h change', m.chg24h == null ? '—' : fmtPct(m.chg24h), m.chg24h == null ? '' : m.chg24h >= 0 ? 'up' : 'down'],
    ['24h volume', m.vol24h == null ? '—' : fmtUsd(m.vol24h)],
    ['Liquidity', m.liquidity == null ? '—' : fmtUsd(m.liquidity)],
    ['Holders', m.holders == null ? '—' : fmtInt(m.holders)],
    ['Buy / sell tax', `${tax(m.buyTax)} / ${tax(m.sellTax)}`],
  ] : null
  return (
    <>
      <div className="section-h"><h2>Market</h2>{stats && <span className="muted" style={{ fontSize: 13 }}>live · updates every minute</span>}</div>
      {stats ? (
        <div className="tk-market">
          {stats.map(([k, v, tone]) => (
            <div key={k} className="glass card tk-stat"><span>{k}</span><b className={`mono ${tone || ''}`}>{v}</b></div>
          ))}
        </div>
      ) : (
        <div className="glass card tk-market-empty">
          {!upw.launched
            ? <p>Price, market cap, volume and holders appear here, live, as soon as ${BRAND.token} launches on Flap.sh.</p>
            : <p>${BRAND.token} is live. Market data appears here once trading is indexed{m?.holders != null ? <> · <b>{fmtInt(m.holders)}</b> holders so far</> : null}. While it is on the Flap.sh bonding curve this can take a while.</p>}
        </div>
      )}
    </>
  )
}
