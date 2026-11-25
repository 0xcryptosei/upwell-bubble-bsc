// Wallet picker (connect) and account menu (signed in).
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/AppContext'
import { listWallets, onWalletsChanged, isMobile, WC_PROJECT_ID } from '../lib/wallet'
import { Logo, Tag, TierTag } from './Bits'
import { IconClose, IconCopy, NavIcons } from './Icons'

const Chevron = () => <svg className="wa-chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 4 4 4-4 4" /></svg>

const WcIcon = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#3B99FC" />
    <path d="M9.6 12.3c3.5-3.4 9.3-3.4 12.8 0l.4.4a.4.4 0 0 1 0 .6l-1.5 1.4a.2.2 0 0 1-.3 0l-.6-.6a6.4 6.4 0 0 0-8.9 0l-.6.6a.2.2 0 0 1-.3 0l-1.5-1.4a.4.4 0 0 1 0-.6zm15.8 2.9 1.3 1.3a.4.4 0 0 1 0 .6l-6 5.8a.5.5 0 0 1-.6 0l-4.2-4.1a.1.1 0 0 0-.2 0l-4.2 4.1a.5.5 0 0 1-.6 0l-6-5.8a.4.4 0 0 1 0-.6l1.3-1.3a.5.5 0 0 1 .6 0l4.2 4.1a.1.1 0 0 0 .2 0l4.2-4.1a.5.5 0 0 1 .6 0l4.2 4.1a.1.1 0 0 0 .2 0l4.2-4.1a.5.5 0 0 1 .6 0z" fill="#fff" /></svg>
)

/** Official logo for supported wallets; the icon a wallet announces for any other; a letter tile as last resort. */
function WalletIcon({ w }) {
  const [broken, setBroken] = useState(false)
  if (w.logo && !broken) return <img src={w.logo} alt="" onError={() => setBroken(true)} />
  if (w.icon) return <img src={w.icon} alt="" />
  if (w.type === 'walletconnect') return <WcIcon />
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill={w.color || '#0B3B5C'} />
      <text x="16" y="21.5" textAnchor="middle" fontFamily="Inter Tight, Inter, sans-serif" fontWeight="700" fontSize="15" fill="#fff">{w.letter || w.name[0]}</text>
    </svg>
  )
}

const Arrow = () => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" /></svg>

function useWallets() {
  const [list, setList] = useState(listWallets)
  useEffect(() => onWalletsChanged(() => setList(listWallets())), [])
  return list
}

function WalletRow({ w, onConnect }) {
  const inner = (action) => (
    <>
      <span className="wi"><WalletIcon w={w} /></span>
      <span className="wn">{w.name}{w.sub && <small>{w.sub}</small>}</span>
      <span className="wa">{action}</span>
    </>
  )
  if (w.installed) {
    const note = w.disabled ? 'Not set up' : w.type === 'walletconnect' ? (w.hint || '') : 'Detected'
    return (
      <button className={`wallet-opt ${w.type === 'injected' ? 'ready' : ''}`} onClick={() => onConnect(w)} disabled={w.disabled}
        title={w.disabled ? 'Add VITE_WC_PROJECT_ID to .env to enable WalletConnect' : w.note}>
        {inner(note)}
      </button>
    )
  }
  // not installed: on phones, open this site inside the wallet app when it can; otherwise install
  const mobileOpen = isMobile() && w.open
  return (
    <a className="wallet-opt" href={mobileOpen ? w.open() : w.install} target={mobileOpen ? undefined : '_blank'} rel="noreferrer noopener"
      title={w.note}>
      {inner(<>{mobileOpen ? 'Open' : 'Install'} <Arrow /></>)}
    </a>
  )
}

export default function WalletModal() {
  const { walletModal: mode, setWalletModal, connectWith, connecting, session, walletName, signOut, go, toast, me, profile, calls } = useApp()
  const wallets = useWallets()
  const closeBtn = useRef(null)

  useEffect(() => {
    if (!mode) return
    const id = setTimeout(() => closeBtn.current?.focus(), 30)
    const onKey = (e) => { if (e.key === 'Escape' && !connecting) setWalletModal(null) }
    document.addEventListener('keydown', onKey)
    return () => { clearTimeout(id); document.removeEventListener('keydown', onKey) }
  }, [mode, connecting, setWalletModal])

  if (!mode) return null
  const close = () => { if (!connecting) setWalletModal(null) }
  // installed wallets first, keeping the supported order otherwise
  const rows = [...wallets].sort((a, b) => (b.installed && b.type === 'injected') - (a.installed && a.type === 'injected'))

  return (
    <div className="modal open" role="dialog" aria-modal="true" aria-labelledby="walletH" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="modal-box glass wallet-box">
        <div className="modal-top">
          <h2 id="walletH" style={{ fontSize: 18 }}>{mode === 'account' ? 'Your wallet' : connecting ? (connecting.step === 'sign' ? 'Sign to verify' : `Connecting ${connecting.wallet}`) : 'Connect a wallet'}</h2>
          <button ref={closeBtn} className="icon-btn" onClick={close} aria-label="Close" disabled={!!connecting}><IconClose /></button>
        </div>

        {mode === 'account' && session && (
          <div className="wallet-account">
            <div className="wa-row">
              <Logo size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="wa-name">{me?.name}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{walletName || 'Wallet'} · BNB Chain</div>
              </div>
              {profile?.tier && <TierTag tier={profile.tier} />}
            </div>
            <button className="addr wa-addr" onClick={async () => { try { await navigator.clipboard?.writeText(session.address) } catch { /* blocked */ } toast('Address copied', 'check') }}>
              <span className="mono">{session.address}</span><IconCopy />
            </button>
            {profile && (
              <div className="wa-stats">
                <div><b className="mono">{profile.calls}</b><span>Calls</span></div>
                <div><b className="mono">{profile.calls ? Math.round(profile.winRate * 100) + '%' : '—'}</b><span>Win rate</span></div>
                <div><b className="mono">{profile.xp.toLocaleString('en-US')}</b><span>XP</span></div>
              </div>
            )}
            <nav className="wa-menu" aria-label="Your account">
              <button onClick={() => { setWalletModal(null); go('calls') }}>
                <NavIcons.calls /><span>My calls</span>{calls.live.length > 0 && <Tag tone="aqua">{calls.live.length} live</Tag>}<Chevron />
              </button>
              <button onClick={() => { setWalletModal(null); go('profile') }}>
                <NavIcons.profile /><span>Profile</span><small>XP, tier, badges</small><Chevron />
              </button>
            </nav>
            <button className="btn-glass wa-danger wa-disconnect" onClick={() => signOut('Wallet disconnected')}>Disconnect</button>
          </div>
        )}

        {mode === 'connect' && connecting && (
          <div className="wallet-wait">
            <span className="wallet-spinner" aria-hidden="true" />
            <p>{connecting.step === 'sign'
              ? 'Approve the sign-in message in your wallet. It proves you own this address. It is free and sends no transaction.'
              : `Approve the connection in ${connecting.wallet}.`}</p>
          </div>
        )}

        {mode === 'connect' && !connecting && (
          <>
            <div className="wallet-list">
              {rows.map((w) => <WalletRow key={w.id} w={w} onConnect={connectWith} />)}
            </div>
            <p className="note">Signing in is free and sends no transaction. Upwell is not financial advice.</p>
            {!WC_PROJECT_ID && import.meta.env.DEV && <p className="note" style={{ marginTop: 4 }}>Dev note: add <code>VITE_WC_PROJECT_ID</code> to <code>.env</code> to enable WalletConnect.</p>}
          </>
        )}
      </div>
    </div>
  )
}
