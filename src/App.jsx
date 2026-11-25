import { useEffect } from 'react'
import { AppProvider, useApp } from './store/AppContext'
import { startMarket } from './store/market'
import { OceanBackground, Header, Ticker, TabBar, Toasts } from './components/Chrome'
import CallModal from './components/CallModal'
import WalletModal from './components/WalletModal'
import Bubbles from './screens/Bubbles'
import MyCalls from './screens/MyCalls'
import Leaderboard from './screens/Leaderboard'
import Rewards from './screens/Rewards'
import Profile from './screens/Profile'
import Landing from './screens/Landing'
import Explore from './screens/Explore'
import Token from './screens/Token'
import Docs from './screens/Docs'

const SCREEN = { bubbles: Bubbles, explore: Explore, upw: Token, docs: Docs, calls: MyCalls, leaderboard: Leaderboard, rewards: Rewards, profile: Profile }

function Shell() {
  const { screen, confirmed, setConfirmed, selected, closeToken } = useApp()
  const Screen = SCREEN[screen]

  useEffect(() => startMarket(), [])

  // Escape closes the share modal first, then the token panel
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (confirmed) setConfirmed(null)
      else if (selected && screen === 'bubbles' && !document.querySelector('.search-results.open')) closeToken()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [confirmed, setConfirmed, selected, closeToken, screen])

  if (screen === 'landing') return <><Landing /><WalletModal /><Toasts /></>

  return (
    <>
      <OceanBackground />
      <div className="app">
        <Header />
        <div className="content">
          <Ticker />
          <main key={screen}>
            <Screen />
          </main>
        </div>
      </div>
      <TabBar />
      <CallModal />
      <WalletModal />
      <Toasts />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
