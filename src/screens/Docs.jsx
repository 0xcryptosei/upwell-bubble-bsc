// Docs: how Upwell works. Every number here matches backend/src/lib/rules.js,
// backend/src/market/safety.js and contracts/RewardVault.sol. Keep them in sync.
import { useEffect, useState } from 'react'
import { useApp } from '../store/AppContext'
import { BRAND } from '../brand'
import { Tag } from '../components/Bits'
import { prefersReducedMotion } from '../lib/format'

const T = BRAND.token

const SECTIONS = [
  { id: 'start', title: 'Getting started' },
  { id: 'calls', title: 'Making a call' },
  { id: 'judging', title: 'How calls are judged' },
  { id: 'scoring', title: 'Scoring & leaderboard' },
  { id: 'xp', title: 'XP, tiers & badges' },
  { id: 'rewards', title: 'Weekly rewards' },
  { id: 'safety', title: 'Safety score' },
  { id: 'token', title: `$${T} token` },
  { id: 'contracts', title: 'Smart contracts' },
  { id: 'risks', title: 'Risks' },
]

const BADGES = [
  ['10x call', 'A winning call that reached 10x.'],
  ['7-day streak', 'Made a call 7 days in a row (UTC days).'],
  ['Safety first', '10 wins on tokens with a safety score of 80+.'],
  ['Top 100', 'Finished a week in the top 100.'],
  ['Early bird', 'Won a call made within 1 hour of the token listing.'],
  ['Sniper tier', 'Reached the Sniper tier.'],
  ['Whale spotter', 'Won a call on a token above $10M market cap.'],
  ['Season 1', 'Made a call during Season 1.'],
  ['Legend', 'Reached the Legend tier.'],
]

const CHECKS = [
  ['Sell test', 25, 'The token can be sold (not a honeypot).', 'Pass', '—', 'Fail'],
  ['LP burned / locked', 20, 'Liquidity cannot be pulled.', 'Burned', 'Locked', 'Unlocked'],
  ['Tax', 15, 'Highest of buy and sell tax.', '≤ 3%', '≤ 8%', '> 8%'],
  ['Top 10 holders', 15, 'Share held by the 10 largest wallets.', '≤ 30%', '≤ 50%', '> 50%'],
  ['No mint function', 10, 'Supply cannot be increased.', 'None', '—', 'Mintable'],
  ['Contract verified', 15, 'Source code is public.', 'Yes', 'No', '—'],
]

const CONTRACTS = [
  ['RewardVault', 'Holds the BNB from the $UPW tax. Closes each week, splits it 60 / 25 / 10 / 5, and pays callers who claim with a Merkle proof.'],
  ['UpwellStaking', `Stake $${T}, earn BNB from the vault, paid out evenly over 7 days. No lock.`],
  ['CallLedger', 'Stores one Merkle root of every judged call per week, so any call or record can be proven on-chain.'],
  ['UpwellBadges', 'Soulbound (non-transferable) badges, one of each per wallet.'],
]

const SAFEGUARDS = [
  ['One claim per week', 'Each reward is tied to your wallet, the week and the amount. It can be claimed once, only by you, and never in another week.'],
  ['Never over-paid', 'A week can only pay out what was set aside for it. The rest of the callers\' share stays with callers for the next week.'],
  ['Weeks close in order', 'Each close names the week it closes, so the same week can never be closed twice.'],
  ['Payouts never block a week', 'If a payout wallet or the staking contract fails, its share is held in the vault and sent later. Callers are still paid.'],
  ['Fair staking', 'Staking rewards stream over 7 days by time staked, so staking just before a payout and leaving right after earns almost nothing.'],
  ['Separate keys', 'Settings belong to a multisig. The server key can only close weeks: it can never touch BNB already set aside for claims.'],
]

function useActiveSection() {
  const [active, setActive] = useState(SECTIONS[0].id)
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (vis[0]) setActive(vis[0].target.id)
    }, { rootMargin: '-90px 0px -60% 0px' })
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])
  return [active, setActive]
}

export default function Docs() {
  const { go } = useApp()
  const [active, setActive] = useActiveSection()
  const jump = (id) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <section className="screen active" aria-labelledby="docsH">
      <div className="page-head">
        <div>
          <h1 className="page-title" id="docsH">Docs</h1>
          <p className="page-sub">How {BRAND.name} works: calls, judging, scoring, rewards and the contracts behind them.</p>
        </div>
      </div>

      <div className="dc-layout">
        <nav className="dc-toc glass" aria-label="Contents">
          <p className="dc-toc-h">Contents</p>
          {SECTIONS.map((s, i) => (
            <button key={s.id} className={active === s.id ? 'on' : ''} aria-current={active === s.id ? 'true' : undefined} onClick={() => jump(s.id)}>
              <span className="mono">{String(i + 1).padStart(2, '0')}</span>{s.title}
            </button>
          ))}
        </nav>

        <article className="dc-body">
          <section id="start" className="glass card dc-sec">
            <h2>Getting started</h2>
            <p>{BRAND.name} turns your token instinct into an on-chain track record. You call new BNB Chain tokens before they move. If you are right, your score rises, and the best callers of the week share the Reward Vault in BNB.</p>
            <ol className="dc-steps">
              <li><b>Connect a wallet.</b> MetaMask, Rabby, OKX, Coinbase, Trust, Phantom or any WalletConnect wallet.</li>
              <li><b>Sign in.</b> You sign one message to prove the address is yours. It is free and sends no transaction.</li>
              <li><b>Make your first call.</b> Open a bubble on <button className="dc-link" onClick={() => go('bubbles')}>Bubbles</button> or a row on <button className="dc-link" onClick={() => go('explore')}>Explore</button>.</li>
            </ol>
            <p className="dc-note">Calling is always free. You never need ${T} to call.</p>
          </section>

          <section id="calls" className="glass card dc-sec">
            <h2>Making a call</h2>
            <p>A call says: <em>this token&apos;s market cap will be at least 1.2× higher when my window ends.</em></p>
            <ul className="dc-list">
              <li><b>Pick a window:</b> 1 hour, 24 hours or 7 days.</li>
              <li><b>Entry market cap</b> is locked by the server the moment you call. It is never taken from your browser.</li>
              <li><b>Win target</b> is entry × 1.2.</li>
              <li>You can have up to <b>10 live calls</b> at a time.</li>
              <li>One live call per token and window: you can call the same token on 1h and 24h, but not twice on 24h.</li>
            </ul>
          </section>

          <section id="judging" className="glass card dc-sec">
            <h2>How calls are judged</h2>
            <p>When the window ends, the server checks the token&apos;s market cap again, automatically, within about 15 seconds.</p>
            <div className="dc-table-wrap">
              <table className="dc-table">
                <thead><tr><th>Result</th><th>When</th></tr></thead>
                <tbody>
                  <tr><td><Tag tone="up">Won</Tag></td><td>Exit market cap ≥ entry × 1.2</td></tr>
                  <tr><td><Tag tone="down">Lost</Tag></td><td>Exit market cap below the target</td></tr>
                  <tr><td><Tag>Void</Tag></td><td>No price could be found for the token. Nothing is scored.</td></tr>
                </tbody>
              </table>
            </div>
            <p className="dc-note">Tokens with a live call keep being priced even after they leave the bubble map, so every call is judged.</p>
          </section>

          <section id="scoring" className="glass card dc-sec">
            <h2>Scoring &amp; leaderboard</h2>
            <p>Every judged call earns points. Longer windows are harder, so they count more.</p>
            <div className="dc-formula mono">
              <div>win&nbsp; = (100 + 60 × log₂(multiple)) × weight&nbsp;&nbsp;<span>multiple capped at 50×</span></div>
              <div>loss = −15 × weight</div>
              <div>weight: 1h 0.6 · 24h 1.0 · 7d 1.4</div>
            </div>
            <div className="dc-table-wrap">
              <table className="dc-table">
                <thead><tr><th>Example</th><th className="num">1h</th><th className="num">24h</th><th className="num">7d</th></tr></thead>
                <tbody>
                  <tr><td>Win at 2×</td><td className="num">96</td><td className="num">160</td><td className="num">224</td></tr>
                  <tr><td>Win at 4×</td><td className="num">132</td><td className="num">220</td><td className="num">308</td></tr>
                  <tr><td>Loss</td><td className="num">−9</td><td className="num">−15</td><td className="num">−21</td></tr>
                </tbody>
              </table>
            </div>
            <p>Your leaderboard <b>score</b> rewards consistency, so spraying many calls does not beat calling well:</p>
            <div className="dc-formula mono"><div>score = total points × (0.5 + 0.5 × win rate)</div></div>
            <p>Boards: <b>Daily</b> and <b>Weekly</b> reset at 00:00 UTC (weeks start Monday). <b>Season</b> counts everything since the season started. Rewards are paid on the weekly board.</p>
          </section>

          <section id="xp" className="glass card dc-sec">
            <h2>XP, tiers &amp; badges</h2>
            <p>A winning call earns <b>20–120 XP</b> depending on its multiple (20 + 40 × log₂(multiple)). A losing call earns 2 XP for showing up.</p>
            <div className="dc-tiers">
              {[['Rookie', '0'], ['Hunter', '500'], ['Sniper', '2,000'], ['Legend', '6,000']].map(([t, xp]) => (
                <div key={t}><span className={`tag tier-${t}`}>{t}</span><b className="mono">{xp} XP</b></div>
              ))}
            </div>
            <p>Badges are soulbound: they stay with your wallet and cannot be sold or transferred.</p>
            <ul className="dc-badges">
              {BADGES.map(([n, d]) => <li key={n}><b>{n}</b><span>{d}</span></li>)}
            </ul>
          </section>

          <section id="rewards" className="glass card dc-sec">
            <h2>Weekly rewards</h2>
            <p>The ${T} buy and sell tax fills the <b>Reward Vault</b>. Every Monday at 00:00 UTC the week closes and what arrived that week is split:</p>
            <div className="split" aria-hidden="true">
              <i style={{ width: '60%', background: 'linear-gradient(90deg,#2EC5EC,#0A8BD0)' }} /><i style={{ width: '25%', background: '#0A6FAF' }} /><i style={{ width: '10%', background: '#0B3B5C' }} /><i style={{ width: '5%', background: '#8FB3C3' }} />
            </div>
            <ul className="dc-list">
              <li><b>60% top callers</b>: the top 100 on the weekly board share it in proportion to their score. Anything not handed out stays with callers and is added to next week's pool.</li>
              <li><b>25% ${T} stakers</b>: shared by everyone staking, paid out evenly over the following 7 days (Phase 2).</li>
              <li><b>10% buyback &amp; burn</b>: buys ${T} and burns it.</li>
              <li><b>5% operations</b>: data, hosting and audits.</li>
            </ul>
            <p><b>Today:</b> the vault shows this week's real ${T} tax income, read live from the token's tax contract on BNB Chain (anyone can verify it on BscScan). Before ${T} launches it shows a simulated preview. After each week closes, the {BRAND.name} team sends the callers' rewards to the wallets of the top callers. Your estimated share for the week is on <button className="dc-link" onClick={() => go('rewards')}>Rewards</button>.</p>
            <p><b>Once the vault is on-chain:</b> your share appears on Rewards when the week is published. You claim it to your wallet with one transaction (you pay the network fee), for one week or several at once. Unclaimed rewards return to the callers' pool after <b>90 days</b>.</p>
          </section>

          <section id="safety" className="glass card dc-sec">
            <h2>Safety score</h2>
            <p>Every token gets a score from 0 to 100 built from six checks. A pass earns the full weight, a warning half, a fail nothing.</p>
            <div className="dc-table-wrap">
              <table className="dc-table">
                <thead><tr><th>Check</th><th className="num">Weight</th><th>Pass</th><th>Warn</th><th>Fail</th></tr></thead>
                <tbody>
                  {CHECKS.map(([n, w, d, p, wa, f]) => (
                    <tr key={n}><td><b>{n}</b><small>{d}</small></td><td className="num">{w}</td><td>{p}</td><td>{wa}</td><td>{f}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="dc-note">70+ is shown as low risk, 40–69 medium, below 40 high. A high score is not a guarantee: it only means none of these red flags were found.</p>
          </section>

          <section id="token" className="glass card dc-sec">
            <h2>${T} token</h2>
            <p>${T} is the token behind {BRAND.name}, launched on Flap.sh on BNB Chain. Its trading tax funds the Reward Vault. Holding it lets you stake for a share of the vault and, in Phase 2, boost your calls.</p>
            <p>Contract address, buy link and live details are on the <button className="dc-link" onClick={() => go('upw')}>${T} page</button>.</p>
          </section>

          <section id="contracts" className="glass card dc-sec">
            <h2>Smart contracts</h2>
            <p>Four contracts on BNB Chain make rewards and records verifiable by anyone:</p>
            <ul className="dc-badges">
              {CONTRACTS.map(([n, d]) => <li key={n}><b className="mono">{n}</b><span>{d}</span></li>)}
            </ul>
            <h3 className="dc-h3">How rewards are protected</h3>
            <ul className="dc-badges">
              {SAFEGUARDS.map(([n, d]) => <li key={n}><b>{n}</b><span>{d}</span></li>)}
            </ul>
            <p className="dc-note">The contracts are tested (58 tests, including attack and randomised tests) and have had an internal security review. They are not deployed yet: they go live after an external audit, and their addresses will be listed here.</p>
          </section>

          <section id="risks" className="glass card dc-sec">
            <h2>Risks</h2>
            <ul className="dc-list">
              <li>New tokens are extremely risky. Many go to zero. {BRAND.name} does not tell you what to buy.</li>
              <li>Calls, scores and rewards are a game of skill and reputation, not investment advice.</li>
              <li>Weekly payouts depend on trading volume and change every week. Past payouts do not promise future ones.</li>
              <li>Never share your seed phrase. {BRAND.name} will only ever ask you to <em>sign a message</em> to log in.</li>
            </ul>
          </section>
        </article>
      </div>
    </section>
  )
}
