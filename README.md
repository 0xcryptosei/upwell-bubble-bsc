# Upwell: web app (React + Vite)

Trader-first token discovery and reputation platform on BNB Chain. Landing page (Direction B "Deep Dive") plus the app in the **Clear Water** design (Direction A).

> Market data is live from BNB Chain through the backend (`backend/`). Without the backend the app falls back to a demo market.

## Run

```bash
npm install
npm run dev       # http://127.0.0.1:7725
npm run build     # production build in dist/
npm run preview   # serve the build
```

Requires Node 18 or newer.

## What's inside

| Screen | What it does |
| --- | --- |
| **Landing** (`/`) | Deep-ocean hero with a live market map preview (click a bubble, then "Call" to jump into the app with that token open), how calls are judged, leaderboard, Reward Vault. Brand text lives in `src/brand.js`. |
| **Bubbles** | Full-width market map of glass water bubbles (size = 24h volume, rim = up/down). Click a bubble → token panel slides over the map. New listings rise every ~10s, prices tick every 2s. |
| **Token panel** | Market cap + sparkline, safety score with 6 checks, make a call (1h / 24h / 7d), top callers, quick buy. Bottom sheet on mobile. |
| **Call confirmed** | Share card modal (needs a connected wallet). |
| **My calls** | Live calls with countdown rings, finished calls with Won / Lost. |
| **Leaderboard** | Daily / Weekly / Season 1, your row highlighted. |
| **Rewards** | Vault, weekly split, claim button, staking stats. |
| **Profile** | Stats, tier XP progress, soulbound badges. |

Keyboard: `/` focuses search, `Esc` closes the modal or token panel. Respects `prefers-reduced-motion`.

## Project structure

```
src/
  main.jsx, App.jsx          app shell + routing: no hash = landing; #bubbles · #explore · #leaderboard · #rewards · #upw · #docs · #calls · #profile (old #arena links redirect to #bubbles)
  brand.js                   name, token ticker and URL used by the landing page
  styles/global.css          Clear Water theme: glass, 3D, ocean background, responsive rules
  data/demo.js               fictional tokens, callers, calls
  lib/format.js              number / time formatting helpers
  store/
    AppContext.jsx           UI state: screen, wallet, toasts, calls, selected token
    market.js                market store: live from the API (with SSE), demo simulation offline
  bubbles/
    mapEngine.js             canvas engine: bubble physics, 3D glass rendering, parallax
    MarketMap.jsx            map card, filters, hint
    TokenPanel.jsx           token details panel
    Sparkline.jsx
  screens/                   Landing, Bubbles, Explore, Leaderboard, Rewards, Token ($UPW), Docs, MyCalls, Profile
  styles/landing.css         landing page styles
  components/                Header, ticker, tab bar, toasts, icons, Tilt, modal
```

## Connecting real data later

- Market data comes from the backend (`MARKET_PROVIDER=demo` or `live` in `backend/.env`).
- Calls, sign-in and rewards already go through the backend (see below).

## Backend and contracts

- [`backend/`](backend/README.md): Upwell API (wallet sign-in, calls, judging, leaderboards, weekly rewards). `npm --prefix backend start` → http://127.0.0.1:7726
- [`contracts/`](contracts/README.md): Reward Vault, $UPW staking, Call Ledger, soulbound badges. Built only, not deployed.

## Running the app with the backend

```bash
npm --prefix backend start   # API on http://127.0.0.1:7726
npm run dev                  # app on http://127.0.0.1:7725
```

The app talks to the API at `VITE_API_URL` (default `http://127.0.0.1:7726`). The header shows which mode you are in:

- **Demo market** / **Live · BNB Chain**: connected to the API. Sign-in, calls, judging, leaderboards, rewards and profiles are real.
- **Offline demo**: the API is not running, so the app falls back to its built-in demo data.

### Wallets

**Connect wallet** opens a wallet picker:

- **Supported wallets:** MetaMask, Rabby, OKX Wallet, Coinbase Wallet, Trust Wallet and Phantom. Installed ones are detected automatically (EIP-6963) and connect in one click; the others show **Install ↗** (on phones: **Open**, which opens Upwell inside that wallet's app). Any other wallet the browser announces is listed too.
- **Phantom** does not support BNB Chain yet: it can sign in, but claiming rewards needs another wallet.
- **WalletConnect** shows a QR code on desktop and opens the wallet app on phones. It needs a free project ID from https://dashboard.reown.com: copy `.env.example` to `.env`, set `VITE_WC_PROJECT_ID`, and restart `npm run dev`.
Signing in is a free signature, not a transaction. When signed in, the wallet button opens an account menu (copy address, profile, disconnect). Switching account or disconnecting inside the wallet signs you out.

### "Port already in use"

Each server can run only once. If `npm run dev` says port 7725 is in use, or the API says it is already running, a copy is still open in another terminal: use it, or stop it with Ctrl+C first.
