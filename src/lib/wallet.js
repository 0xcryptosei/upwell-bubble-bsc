// Wallet connection without a framework, using two standards:
//   - EIP-6963: installed browser wallets announce themselves (with their real name and icon)
//   - WalletConnect v2: QR code on desktop, deep link into the wallet app on phones
import { createWalletClient, custom, parseAbi, toHex } from 'viem'
import { bsc, bscTestnet } from 'viem/chains'

export const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID || ''
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 56)
const CHAIN = CHAIN_ID === 97 ? bscTestnet : bsc
const LAST_KEY = 'upwell.lastWallet'

export const isMobile = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

const here = () => window.location.href
const hostPath = () => window.location.host + window.location.pathname + window.location.hash

/**
 * Supported wallets, in display order. `rdns` is the EIP-6963 id the wallet announces;
 * `flag` is the legacy window.ethereum marker for wallets that do not announce.
 * `open` (phones only) opens this site inside the wallet's own browser.
 */
export const SUPPORTED = [
  { id: 'metamask', name: 'MetaMask', logo: '/wallets/metamask.svg', rdns: ['io.metamask', 'io.metamask.mobile'], flag: 'isMetaMask', color: '#F6851B', letter: 'M',
    install: 'https://metamask.io/download/', open: () => `https://metamask.app.link/dapp/${hostPath()}` },
  { id: 'rabby', name: 'Rabby', logo: '/wallets/rabby.svg', rdns: ['io.rabby'], flag: 'isRabby', color: '#7084FF', letter: 'R',
    install: 'https://rabby.io/' },
  { id: 'okx', name: 'OKX Wallet', logo: '/wallets/okx.svg', rdns: ['com.okex.wallet'], flag: 'isOkxWallet', color: '#000000', letter: 'O',
    install: 'https://www.okx.com/web3', open: () => `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(here())}` },
  { id: 'coinbase', name: 'Coinbase Wallet', logo: '/wallets/coinbase.svg', rdns: ['com.coinbase.wallet'], flag: 'isCoinbaseWallet', color: '#0052FF', letter: 'C',
    install: 'https://www.coinbase.com/wallet/downloads', open: () => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(here())}` },
  { id: 'trust', name: 'Trust Wallet', logo: '/wallets/trust.svg', rdns: ['com.trustwallet.app'], flag: 'isTrust', color: '#0500FF', letter: 'T',
    install: 'https://trustwallet.com/download', open: () => `https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(here())}` },
  { id: 'phantom', name: 'Phantom', logo: '/wallets/phantom.svg', rdns: ['app.phantom'], flag: 'isPhantom', color: '#AB9FF2', letter: 'P',
    install: 'https://phantom.com/download', open: () => `https://phantom.app/ul/browse/${encodeURIComponent(here())}?ref=${encodeURIComponent(window.location.origin)}`,
    note: 'Phantom does not support BNB Chain yet: you can sign in, but claiming rewards needs another wallet.' },
]

// ---------- EIP-6963 discovery ----------
const discovered = new Map() // rdns -> { info, provider }
const listeners = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (e) => {
    const { info, provider } = e.detail || {}
    if (!info?.rdns || !provider) return
    discovered.set(info.rdns, { info, provider })
    listeners.forEach((fn) => fn())
  })
  window.dispatchEvent(new Event('eip6963:requestProvider'))
}

/** Legacy injected provider for a wallet (window.ethereum or one of its .providers). */
function legacyProvider(flag) {
  const eth = typeof window !== 'undefined' ? window.ethereum : null
  if (!eth) return null
  const all = Array.isArray(eth.providers) ? eth.providers : [eth]
  if (flag === 'isPhantom' && window.phantom?.ethereum) return window.phantom.ethereum
  // MetaMask's flag is copied by many wallets: only trust it when no other flag is set
  if (flag === 'isMetaMask') return all.find((p) => p.isMetaMask && !SUPPORTED.some((w) => w.flag !== 'isMetaMask' && p[w.flag])) || null
  return all.find((p) => p[flag]) || null
}

/**
 * Every row for the picker: the supported wallets (installed or not), any other wallet the
 * browser announced, then WalletConnect.
 */
export function listWallets() {
  const rows = SUPPORTED.map((w) => {
    const hit = w.rdns.map((r) => discovered.get(r)).find(Boolean)
    const provider = hit?.provider || legacyProvider(w.flag)
    return { ...w, type: 'injected', installed: !!provider, provider, icon: hit?.info.icon || null }
  })
  const known = new Set(SUPPORTED.flatMap((w) => w.rdns))
  for (const [rdns, { info, provider }] of discovered) {
    if (!known.has(rdns)) rows.push({ id: rdns, name: info.name, type: 'injected', installed: true, provider, icon: info.icon })
  }
  rows.push({ id: 'walletconnect', name: 'WalletConnect', logo: '/wallets/walletconnect.svg', type: 'walletconnect', installed: true, disabled: !WC_PROJECT_ID, hint: isMobile() ? 'Open your wallet app' : 'Scan with your phone' })
  return rows
}

export function onWalletsChanged(fn) { listeners.add(fn); return () => listeners.delete(fn) }

// ---------- active connection ----------
let active = null // { id, name, type, provider, address }
const accountListeners = new Set()
export const onAccountChange = (fn) => { accountListeners.add(fn); return () => accountListeners.delete(fn) }
const emitAccount = (address) => accountListeners.forEach((fn) => fn(address))

function watch(provider) {
  if (!provider?.on) return
  provider.on('accountsChanged', (accs) => emitAccount(accs?.[0] || null))
  provider.on('disconnect', () => emitAccount(null))
}

let wcProvider = null
async function walletConnectProvider() {
  if (wcProvider) return wcProvider
  if (!WC_PROJECT_ID) throw new Error('WalletConnect is not set up. Add VITE_WC_PROJECT_ID to .env.')
  const { EthereumProvider } = await import('@walletconnect/ethereum-provider')
  wcProvider = await EthereumProvider.init({
    projectId: WC_PROJECT_ID,
    chains: [CHAIN_ID],
    optionalChains: [56, 97],
    showQrModal: true,
    metadata: {
      name: 'Upwell',
      description: 'Call new BNB Chain tokens. Build an on-chain record. Earn BNB.',
      url: window.location.origin,
      icons: [window.location.origin + '/brand/upwell-icon.svg'],
    },
  })
  return wcProvider
}

/**
 * Connect with one wallet row. Returns { address, name, type, sign(message) }.
 * Throws with err.code 4001 when the user rejects.
 */
export async function connect(option) {
  let provider = null, address
  if (option.type === 'injected') {
    provider = option.provider
    ;[address] = await provider.request({ method: 'eth_requestAccounts' })
  } else if (option.type === 'walletconnect') {
    provider = await walletConnectProvider()
    if (!provider.session) await provider.connect()
    address = provider.accounts?.[0]
  }
  if (!address) throw new Error('No account was shared by the wallet')
  active = { id: option.id, name: option.name, type: option.type, provider, address }
  watch(provider)
  try { localStorage.setItem(LAST_KEY, option.id) } catch { /* ignore */ }
  return {
    address, name: option.name, type: option.type,
    sign: (message) => provider.request({ method: 'personal_sign', params: [toHex(message), address] }),
  }
}

/** After a reload, quietly re-attach to the wallet used last time (no popup). */
export async function restore(expectedAddress) {
  let id = null
  try { id = localStorage.getItem(LAST_KEY) } catch { /* ignore */ }
  if (!id) return null
  try {
    if (id === 'walletconnect') {
      if (!WC_PROJECT_ID) return null
      const p = await walletConnectProvider()
      if (!p.session) return null
      active = { id, name: 'WalletConnect', type: 'walletconnect', provider: p, address: p.accounts?.[0] }
    } else {
      // give EIP-6963 wallets a moment to announce themselves
      await new Promise((r) => setTimeout(r, 300))
      const w = listWallets().find((x) => x.id === id && x.installed)
      if (!w) return null
      const [addr] = await w.provider.request({ method: 'eth_accounts' })
      if (!addr) return null
      active = { id, name: w.name, type: 'injected', provider: w.provider, address: addr }
    }
    watch(active.provider)
    if (expectedAddress && active.address?.toLowerCase() !== expectedAddress.toLowerCase()) emitAccount(active.address)
    return active
  } catch {
    return null
  }
}

export async function disconnect() {
  const a = active
  active = null
  try { localStorage.removeItem(LAST_KEY) } catch { /* ignore */ }
  if (a?.type === 'walletconnect') await a.provider.disconnect().catch(() => {})
  if (a?.type === 'injected') await a.provider.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] }).catch(() => {})
}

export const activeWallet = () => active

/** Make sure the wallet is on BNB Chain, adding the network if needed. */
async function ensureChain(provider) {
  const hex = '0x' + CHAIN_ID.toString(16)
  const current = await provider.request({ method: 'eth_chainId' })
  if (current === hex) return
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] })
  } catch (err) {
    if (err.code !== 4902) throw err
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: hex, chainName: CHAIN.name, nativeCurrency: CHAIN.nativeCurrency,
        rpcUrls: CHAIN.rpcUrls.default.http, blockExplorerUrls: [CHAIN.blockExplorers.default.url],
      }],
    })
  }
}

const VAULT_ABI = parseAbi(['function claimMany(uint256[] epochIds, uint256[] amounts, bytes32[][] proofs)'])

/** Claim every on-chain epoch in one transaction with the connected wallet. */
export async function claimRewards({ vault, epochs }) {
  if (!active) throw new Error('Connect your wallet again to claim.')
  await ensureChain(active.provider)
  const client = createWalletClient({ chain: CHAIN, transport: custom(active.provider), account: active.address })
  return client.writeContract({
    address: vault,
    abi: VAULT_ABI,
    functionName: 'claimMany',
    args: [epochs.map((e) => BigInt(e.epoch)), epochs.map((e) => BigInt(e.amountWei)), epochs.map((e) => e.proof)],
  })
}
