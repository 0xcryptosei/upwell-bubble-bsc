// Market store shared by React and the canvas engine.
// Online: tokens come from the Upwell API and update over its live stream.
// Offline (API not running): falls back to the local demo simulation so the UI still works.
import { useSyncExternalStore } from 'react'
import { TOKENS, NEW_LISTINGS, HUES } from '../data/demo'
import { clamp, gauss, seeded } from '../lib/format'
import { api, openStream, API_URL } from '../lib/api'

const rnd = seeded(20261125)
let hueIndex = 0
const MAX_ON_MAP = 21
const SPARK = 40

let tokens = []
let version = 0
const listeners = new Set()
const listingListeners = new Set()
const winListeners = new Set()
const upwListeners = new Set()
let selectedSym = null
let status = { online: false, provider: 'local', checked: false }

function emit() { version++; listeners.forEach((fn) => fn()) }

const nextHue = () => HUES[hueIndex++ % HUES.length]

// ---------- local demo tokens ----------
function makeDemoToken({ sym, name, src, mcap, chg, vol, holders, safety, age, isNew = false }) {
  const hue = nextHue()
  const taxB = safety > 80 ? 0 : safety > 60 ? 2 : safety > 40 ? 5 : 9
  const taxS = safety > 80 ? 0 : safety > 60 ? 2 : safety > 40 ? 6 : 12
  const spark = []
  let v = mcap / (1 + chg / 100)
  for (let i = 0; i < SPARK; i++) { v *= 1 + chg / 100 / SPARK + (rnd() - 0.5) * 0.04; spark.push(v) }
  spark[SPARK - 1] = mcap
  return {
    id: sym, sym, name, src, mcap, chg, vol, holders, safety, taxB, taxS, spark, isNew,
    age: age ?? Math.floor(30 + rnd() * 9000),
    c1: hue[0], c2: hue[1],
    top10: Math.round(clamp(78 - safety * 0.6 + rnd() * 8, 9, 72)),
    lp: safety > 75 ? 'Burned' : safety > 45 ? 'Locked 30d' : 'Unlocked',
    checks: null,
    listedAt: performance.now(),
  }
}

// ---------- tokens from the API ----------
const num = (s, i = 0) => Number(String(s ?? '').match(/[\d.]+/g)?.[i] ?? 0)
function fromApi(t, prev) {
  const hue = prev ? [prev.c1, prev.c2] : nextHue()
  const c = t.checks || {}
  // until the real history loads, draw a straight line from the 24h-ago value
  const start = t.mcap / (1 + (t.chg || 0) / 100)
  const spark = prev?.spark || Array.from({ length: SPARK }, (_, i) => start + ((t.mcap - start) * i) / (SPARK - 1))
  return {
    id: t.id, sym: t.sym, name: t.name, src: t.src, mcap: t.mcap, chg: t.chg, vol: t.vol,
    holders: t.holders, safety: t.safety, isNew: t.isNew, age: t.ageMin,
    taxB: num(c.tax?.value, 0), taxS: num(c.tax?.value, 1), top10: num(c.top10?.value), lp: c.lp?.value || 'Unknown',
    checks: t.checks, spark, c1: hue[0], c2: hue[1], listedAt: prev?.listedAt ?? performance.now(),
    avatar: absUrl(t.avatar),
  }
}

/** The API returns its own avatar route as a path; real logos are already full URLs. */
const absUrl = (u) => (!u ? null : u.startsWith('/') ? API_URL + u : u)

export const market = {
  getTokens: () => tokens,
  bySym: (sym) => tokens.find((t) => t.sym === sym),
  setSelected(sym) { selectedSym = sym },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
  onListing(fn) { listingListeners.add(fn); return () => listingListeners.delete(fn) },
  onWin(fn) { winListeners.add(fn); return () => winListeners.delete(fn) },
  /** $UPW settings pushed by the server the moment its upw.json changes. */
  onUpw(fn) { upwListeners.add(fn); return () => upwListeners.delete(fn) },
  getVersion: () => version,
  status: () => status,

  /** Load real history and top callers for the open token. */
  async details(sym) {
    const t = market.bySym(sym)
    if (!t || !status.online) return null
    const d = await api(`/tokens/${t.id}`)
    if (d.token.spark?.length >= 2) {
      t.spark = d.token.spark.length >= SPARK ? d.token.spark.slice(-SPARK) : [...Array(SPARK - d.token.spark.length).fill(d.token.spark[0]), ...d.token.spark]
      emit()
    }
    return d
  },
}

/** Re-render a component whenever prices tick. */
export function useMarket() {
  useSyncExternalStore(market.subscribe, market.getVersion)
  return tokens
}

// ---------- offline simulation ----------
function tickPrices() {
  for (const t of tokens) {
    const d = gauss() * 0.9 + (t.chg > 0 ? 0.04 : -0.02)
    t.chg = clamp(t.chg + d, -85, 900)
    t.mcap = Math.max(5e4, t.mcap * (1 + d / 100))
    t.vol = Math.max(6e4, t.vol * (1 + Math.abs(d) / 180 + (Math.random() - 0.5) * 0.012))
    t.spark.push(t.mcap); t.spark.shift()
  }
  emit()
}

let newIndex = 0
function listDemoToken() {
  const p = NEW_LISTINGS[newIndex % NEW_LISTINGS.length]
  const round = Math.floor(newIndex / NEW_LISTINGS.length)
  newIndex++
  const t = makeDemoToken({
    sym: round ? p[0] + (round + 1) : p[0], name: p[1], src: p[2],
    mcap: 60e3 + Math.random() * 140e3, chg: 5 + Math.random() * 40, vol: 140e3 + Math.random() * 260e3,
    holders: 40 + Math.floor(Math.random() * 260), safety: 48 + Math.floor(Math.random() * 40),
    age: 1 + Math.floor(Math.random() * 4), isNew: true,
  })
  addToken(t)
}

/**
 * Choose the tokens for the map (list sorted by volume): the busiest overall, but every source keeps a few
 * bubbles, so the four.meme / Flap / Uniswap filters are not empty when PancakeSwap tokens dominate volume.
 */
const PER_SOURCE = 3
function pickForMap(list) {
  const keep = new Set()
  const count = {}
  for (const t of list) if ((count[t.src] = (count[t.src] || 0) + 1) <= PER_SOURCE) keep.add(t)
  for (const t of list) { if (keep.size >= MAX_ON_MAP) break; keep.add(t) }
  return list.filter((t) => keep.has(t))
}

function addToken(t) {
  let next = [...tokens, t]
  if (next.length > MAX_ON_MAP) {
    // retire the quietest token that is not open and not new, to keep the map readable;
    // never the last few bubbles of a source
    const per = next.reduce((a, x) => ((a[x.src] = (a[x.src] || 0) + 1), a), {})
    const retire = next.filter((x) => x.sym !== selectedSym && !x.isNew && x !== t && per[x.src] > PER_SOURCE).sort((a, b) => a.vol - b.vol)[0]
    if (retire) next = next.filter((x) => x !== retire)
  }
  tokens = next
  setTimeout(() => { t.isNew = false }, 24000)
  emit()
  listingListeners.forEach((fn) => fn(t))
}

function startOffline() {
  status = { online: false, provider: 'local', checked: true }
  tokens = TOKENS.map(([sym, name, src, mcap, chg, vol, holders, safety, age]) => makeDemoToken({ sym, name, src, mcap, chg, vol, holders, safety, age }))
  emit()
  const timers = [
    setInterval(tickPrices, 2000),
    setInterval(() => { if (!document.hidden) listDemoToken() }, 10000),
  ]
  return () => timers.forEach(clearInterval)
}

// ---------- online ----------
async function startOnline() {
  const [health, list] = await Promise.all([api('/health', { timeout: 2500 }), api('/tokens', { timeout: 4000 })])
  status = { online: true, provider: health.market, onChain: health.onChain, checked: true }
  // update tokens we already have in place: the map engine tracks bubbles by object identity,
  // so a fresh copy would look like a brand-new listing
  const prevById = new Map(tokens.map((t) => [t.id, t]))
  tokens = pickForMap(list.tokens).map((t) => {
    const prev = prevById.get(t.id)
    return prev ? Object.assign(prev, fromApi(t, prev)) : fromApi(t)
  })
  emit()

  const close = openStream({
    prices(rows) {
      const by = new Map(rows.map((r) => [r.id, r]))
      for (const t of tokens) {
        const r = by.get(t.id)
        if (!r) continue
        t.mcap = r.mcap; t.chg = r.chg; t.vol = r.vol
        t.spark.push(r.mcap); t.spark.shift()
      }
      // drop tokens the server retired (keep the one that is open)
      const before = tokens.length
      tokens = tokens.filter((t) => by.has(t.id) || t.sym === selectedSym)
      if (tokens.length !== before) tokens = [...tokens]
      emit()
    },
    listing(t) {
      if (tokens.some((x) => x.id === t.id)) return
      addToken({ ...fromApi(t), isNew: true })
    },
    win(call) { winListeners.forEach((fn) => fn(call)) },
    upw(info) { upwListeners.forEach((fn) => fn(info)) },
  })
  return close
}

let running = 0
let stop = null
/** Start live updates (ref-counted so StrictMode double effects are safe). */
export function startMarket() {
  if (running++ === 0) {
    let cancelled = false
    let inner = null
    startOnline()
      .then((c) => { if (cancelled) c(); else inner = c })
      .catch(() => { if (!cancelled) inner = startOffline() })
    stop = () => { cancelled = true; inner?.() }
  }
  return () => { if (--running === 0) { stop?.(); stop = null } }
}
