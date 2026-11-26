// Deployed contract addresses and staking status, from the backend (/config and /staking).
// Pages use this to describe what is live, so nothing in the frontend changes when contracts are deployed:
// the backend's .env is the single source of truth.
import { useEffect, useState } from 'react'
import { api } from './api'
import { useApp } from '../store/AppContext'

let cached = null

export function useContracts() {
  const { online } = useApp()
  const [info, setInfo] = useState(cached)
  useEffect(() => {
    if (!online) return
    let alive = true
    const load = () => Promise.all([api('/config'), api('/staking').catch(() => ({ enabled: false }))])
      .then(([cfg, staking]) => {
        cached = { contracts: cfg.contracts || {}, explorer: cfg.explorer || 'https://bscscan.com', staking }
        if (alive) setInfo(cached)
      })
      .catch(() => {})
    load()
    const id = setInterval(load, 60000)
    return () => { alive = false; clearInterval(id) }
  }, [online])
  const c = info?.contracts || {}
  return {
    loaded: !!info,
    vault: c.vault || null,
    ledger: c.ledger || null,
    staking: c.staking || null,
    stakingLive: !!info?.staking?.enabled,
    explorer: info?.explorer || 'https://bscscan.com',
  }
}
