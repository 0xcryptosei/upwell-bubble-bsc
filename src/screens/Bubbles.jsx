import { useApp } from '../store/AppContext'
import MarketMap from '../bubbles/MarketMap'
import TokenPanel from '../bubbles/TokenPanel'

export default function Bubbles() {
  const { selected, sheetOpen, closeToken } = useApp()
  return (
    <section className="screen active" aria-labelledby="bubblesH">
      <div className={`bubbles ${selected ? 'has-panel' : ''}`}>
        <MarketMap />
        <div className={`scrim ${sheetOpen ? 'open' : ''}`} onClick={closeToken} />
        <TokenPanel />
      </div>
    </section>
  )
}
