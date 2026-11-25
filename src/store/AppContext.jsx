import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { initialCalls, ME } from '../data/demo'
import { market } from './market'
import { api, setToken, weiToBnb } from '../lib/api'
import * as walletLib from '../lib/wallet'
import { BRAND } from '../brand'

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

// Main navigation. My calls and Profile live in the wallet menu but are still routes (#calls, #profile).
export const SCREENS = ['bubbles', 'explore', 'leaderboard', 'rewards', 'upw', 'docs']
export const ROUTES = [...SCREENS, 'calls', 'profile']
const SESSION_KEY = 'upwell.session'

// links from before the Upwell rebrand keep working: they open the new route and the address bar is updated
const OLD_ROUTES = { arena: 'bubbles', market: 'bubbles' }

function screenFromHash() {
  let h = window.location.hash.replace('#', '')
  if (OLD_ROUTES[h]) { h = OLD_ROUTES[h]; history.replaceState(null, '', '#' + h) }
  return ROUTES.includes(h) ? h : 'landing' // no hash = the landing page
}

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')

function loadSession() {
  try {
    // the demo wallet was removed: clear its key and any session it created
    if (localStorage.getItem('upwell.demoWallet')) {
      localStorage.removeItem('upwell.demoWallet')
      if (localStorage.getItem('upwell.lastWallet') === 'demo') { localStorage.removeItem('upwell.lastWallet'); localStorage.removeItem(SESSION_KEY) }
    }
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (s && s.kind !== 'demo' && s.expiresAt > Date.now()) { setToken(s.token); return s }
  } catch { /* storage blocked */ }
  return null
}

/** Backend call -> the shape the screens use. */
const toUiCall = (c) => ({
  id: c.id, token: c.token, sym: c.sym, tf: c.tf, entry: c.entry, start: c.start, end: c.end,
  exit: c.exit ?? undefined, won: c.won, status: c.status, current: c.current,
})

export function AppProvider({ children }) {
  const [screen, setScreen] = useState(screenFromHash)
  const [online, setOnline] = useState(false)
  const [session, setSession] = useState(loadSession) // { token, address, expiresAt, kind }
  const [profile, setProfile] = useState(null)
  const [connecting, setConnecting] = useState(null) // { wallet, step: 'connect' | 'sign' } while signing in
  const [walletModal, setWalletModal] = useState(null) // null | 'connect' | 'account'
  const [walletName, setWalletName] = useState(null)
  const [toasts, setToasts] = useState([])
  const [calls, setCalls] = useState(initialCalls)
  const [vault, setVault] = useState(null)
  const [selected, setSelected] = useState(null) // token symbol shown in the panel
  const [sheetOpen, setSheetOpen] = useState(false) // mobile bottom sheet
  const [tf, setTf] = useState('24h')
  const [confirmed, setConfirmed] = useState(null) // call shown in the share modal
  const [walletPulse, setWalletPulse] = useState(0)
  const toastId = useRef(0)

  const toast = useCallback((msg, icon = 'info') => {
    const id = ++toastId.current
    setToasts((t) => [...t.slice(-2), { id, msg, icon }])
    setTimeout(() => setToasts((t) => t.map((x) => (x.id === id ? { ...x, out: true } : x))), 3400)
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3750)
  }, [])

  const go = useCallback((s) => {
    setScreen(s)
    setSheetOpen(false)
    const hash = s === 'landing' ? '' : '#' + s
    if (window.location.hash !== hash) history.pushState(null, '', hash || window.location.pathname)
    window.scrollTo({ top: 0 })
  }, [])

  // browser back / forward between the landing page and app screens
  useEffect(() => {
    const onPop = () => setScreen(screenFromHash())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // follow the market's connection state
  useEffect(() => {
    const sync = () => { const s = market.status(); if (s.checked) setOnline(s.online) }
    sync()
    return market.subscribe(sync)
  }, [])

  // ---------- account ----------
  const wallet = online && !!session
  const me = useMemo(() => {
    if (!online) return { name: ME.name, address: ME.address, fullAddress: ME.fullAddress, tier: ME.tier, winRate: 0.62 }
    if (!session) return null
    return {
      name: profile?.display || short(session.address), address: short(session.address), fullAddress: session.address,
      tier: profile?.tier || 'Rookie', winRate: profile?.winRate ?? 0,
    }
  }, [online, session, profile])

  const signOut = useCallback((msg) => {
    if (session?.token) api('/auth/logout', { method: 'POST' }).catch(() => {})
    walletLib.disconnect()
    setToken(null)
    setSession(null)
    setProfile(null)
    setWalletName(null)
    setWalletModal(null)
    try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    if (msg) toast(msg, 'info')
  }, [session, toast])

  const refreshProfile = useCallback(async () => {
    if (!online || !session) return
    try { setProfile(await api('/me')) } catch (err) { if (err.status === 401) signOut('Session expired. Connect again.') }
  }, [online, session, signOut])

  useEffect(() => { refreshProfile() }, [refreshProfile])

  // Re-attach to the wallet after a reload, and sign out if the user switches account or disconnects in the wallet.
  const sessionAddr = session?.address
  useEffect(() => {
    if (!sessionAddr) return
    walletLib.restore(sessionAddr).then((w) => w && setWalletName(w.name))
    return walletLib.onAccountChange((addr) => {
      if (!addr) signOut('Wallet disconnected')
      else if (addr.toLowerCase() !== sessionAddr) signOut('You switched accounts. Connect again to sign in with the new one.')
    })
  }, [sessionAddr, signOut])

  /** Connect with a chosen wallet, then sign the backend's message. */
  const connectWith = useCallback(async (option) => {
    if (connecting) return
    setConnecting({ wallet: option.name, step: 'connect' })
    try {
      const w = await walletLib.connect(option)
      setConnecting({ wallet: option.name, step: 'sign' })
      const { message } = await api('/auth/nonce', { method: 'POST', body: { address: w.address } })
      const signature = await w.sign(message)
      const s = await api('/auth/verify', { method: 'POST', body: { message, signature } })
      const next = { token: s.token, address: s.address, expiresAt: s.expiresAt, kind: w.type }
      setToken(s.token)
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      setSession(next)
      setProfile(s.profile)
      setWalletName(w.name)
      setWalletModal(null)
      toast(`Signed in with ${w.name} · ${short(s.address)}`, 'check')
    } catch (err) {
      const rejected = err?.code === 4001 || /reject|denied|cancel|closed/i.test(err?.message || '')
      toast(rejected ? 'Sign-in cancelled' : err?.shortMessage || err?.message || 'Could not connect', 'wallet')
      if (!rejected) walletLib.disconnect()
    } finally {
      setConnecting(null)
    }
  }, [connecting, toast])

  /** Header button: open the wallet picker, or the account menu when signed in. */
  const toggleWallet = useCallback(() => {
    if (!online) return toast('Cannot reach the Upwell server. Start the backend, then reload.', 'wallet')
    setWalletModal(session ? 'account' : 'connect')
  }, [online, session, toast])

  const needWallet = useCallback((msg) => {
    toast(msg, 'wallet')
    setWalletPulse((n) => n + 1)
    if (online && !session) setWalletModal('connect')
  }, [toast, online, session])

  // ---------- calls ----------
  const refreshCalls = useCallback(async () => {
    if (!online) return
    if (!session) { setCalls({ live: [], done: [] }); return }
    try {
      const r = await api('/me/calls')
      setCalls({ live: r.live.map(toUiCall), done: r.done.map(toUiCall) })
    } catch (err) {
      if (err.status === 401) signOut('Session expired. Connect again.')
    }
  }, [online, session, signOut])

  useEffect(() => { refreshCalls() }, [refreshCalls])

  // keep calls fresh while signed in; new results also update the profile (XP, badges)
  useEffect(() => {
    if (!online || !session) return
    const id = setInterval(refreshCalls, 15000)
    return () => clearInterval(id)
  }, [online, session, refreshCalls])

  // ---------- vault ----------
  useEffect(() => {
    if (!online) { setVault(null); return }
    let alive = true
    const load = () => api('/vault').then((v) => alive && setVault({ ...v, bnb: weiToBnb(v.inflowWei), callersBnb: weiToBnb(v.callersWei) })).catch(() => {})
    load()
    const id = setInterval(load, 60000)
    return () => { alive = false; clearInterval(id) }
  }, [online])

  // ---------- $UPW ----------
  // The contract address, buy link and market data come only from the backend (its upw.json file); nothing about
  // the CA is stored in the frontend. It is loaded at start, and the server pushes every change to upw.json over
  // the live stream at once. The market numbers refresh every minute. brand.js only has fallback X / Telegram links.
  const [upwInfo, setUpwInfo] = useState(null)
  useEffect(() => {
    let alive = true
    const load = () => api('/upw').then((u) => alive && setUpwInfo(u)).catch(() => {})
    load()
    const off = market.onUpw((u) => alive && setUpwInfo(u))
    const id = setInterval(load, 60000)
    return () => { alive = false; off(); clearInterval(id) }
  }, [])
  const upw = useMemo(() => {
    const ca = upwInfo?.ca || null
    return {
      ca,
      launched: !!ca,
      buyUrl: upwInfo?.buyUrl || null,
      x: upwInfo?.x || BRAND.x || null,
      telegram: upwInfo?.telegram || BRAND.telegram || null,
      explorer: ca ? `https://bscscan.com/token/${ca}` : null,
      chart: ca ? `https://www.geckoterminal.com/bsc/tokens/${ca}` : null,
      market: upwInfo?.market || null,
      loaded: !!upwInfo,
    }
  }, [upwInfo])

  const openToken = useCallback((sym, fromUser = true) => {
    market.setSelected(sym)
    setSelected(sym)
    if (fromUser && window.innerWidth < 960) setSheetOpen(true)
  }, [])

  const closeToken = useCallback(() => {
    market.setSelected(null)
    setSelected(null)
    setSheetOpen(false)
  }, [])

  const makeCall = useCallback(async () => {
    const t = market.bySym(selected)
    if (!t) return
    if (!wallet) return needWallet('Connect a wallet to make a call')
    if (!online) {
      const call = { id: 'n' + Date.now(), sym: t.sym, name: t.name, src: t.src, tf, entry: t.mcap, start: Date.now(), fresh: true }
      setCalls((c) => ({ ...c, live: [call, ...c.live] }))
      setConfirmed(call)
      setSheetOpen(false)
      return
    }
    try {
      const { call } = await api('/calls', { method: 'POST', body: { token: t.id, tf } })
      const ui = { ...toUiCall(call), name: t.name, src: t.src, fresh: true }
      setCalls((c) => ({ ...c, live: [ui, ...c.live] }))
      setConfirmed(ui)
      setSheetOpen(false)
      refreshProfile() // streak and Season badge can change on a call
    } catch (err) {
      if (err.status === 401) { signOut(); return needWallet('Session expired. Connect your wallet again.') }
      toast(err.message, 'wallet')
    }
  }, [selected, wallet, online, tf, needWallet, signOut, toast, refreshProfile])

  const value = useMemo(() => ({
    screen, go, online, wallet, connecting, toggleWallet, connectWith, walletModal, setWalletModal, walletName, signOut, needWallet, walletPulse, toasts, toast,
    session, profile, refreshProfile, me, vault, upw,
    calls, setCalls, refreshCalls, selected, openToken, closeToken, sheetOpen, setSheetOpen,
    tf, setTf, makeCall, confirmed, setConfirmed,
  }), [screen, go, online, wallet, connecting, toggleWallet, connectWith, walletModal, walletName, signOut, needWallet, walletPulse, toasts, toast, session, profile, refreshProfile, me, vault, upw,
    calls, refreshCalls, selected, openToken, closeToken, sheetOpen, tf, makeCall, confirmed])

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
