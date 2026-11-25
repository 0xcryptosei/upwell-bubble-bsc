import { useEffect, useRef } from 'react'
import { useApp } from '../store/AppContext'
import { fmtUsd } from '../lib/format'
import { Logo, Tag, Tilt } from './Bits'
import { IconClose, IconTelegram, IconX } from './Icons'

export default function CallModal() {
  const { confirmed: c, setConfirmed, toast, me } = useApp()
  const closeBtn = useRef(null)
  const lastFocus = useRef(null)

  useEffect(() => {
    if (!c) return
    lastFocus.current = document.activeElement
    const id = setTimeout(() => closeBtn.current?.focus(), 30)
    return () => clearTimeout(id)
  }, [c])

  if (!c) return null
  const close = () => { setConfirmed(null); lastFocus.current?.focus?.() }

  return (
    <div className="modal open" role="dialog" aria-modal="true" aria-labelledby="modalH" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="modal-box glass">
        <div className="modal-top">
          <h2 id="modalH" style={{ fontSize: 18 }}>Call confirmed</h2>
          <button ref={closeBtn} className="icon-btn" onClick={close} aria-label="Close"><IconClose /></button>
        </div>
        <Tilt className="share" max={9}>
          <div className="share-top" style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, font: '700 14px/1 var(--head)' }}><Logo size={26} />Upwell</span>
            <Tag tone="navy">{c.tf} call</Tag>
          </div>
          <h3 style={{ position: 'relative', zIndex: 1 }}>Called ${c.sym}</h3>
          <div className="muted" style={{ fontSize: 12.5, position: 'relative', zIndex: 1 }}>{c.name} · {c.src} · BNB Chain</div>
          <div className="share-grid">
            <div><span>Entry market cap</span><b>{fmtUsd(c.entry)}</b></div>
            <div><span>Win target · 1.2x</span><b className="up">{fmtUsd(c.entry * 1.2)}</b></div>
            <div><span>Caller</span><b style={{ fontFamily: 'var(--head)' }}>{me?.name}</b></div>
            <div><span>Win rate</span><b>{Math.round((me?.winRate ?? 0) * 100)}%</b></div>
          </div>
          <div className="ref"><span>app.upwell.xyz/u/{me?.fullAddress ? me.fullAddress.slice(0, 8) : 'you'}</span><Tag tone="aqua">Referral</Tag></div>
        </Tilt>
        <div className="modal-actions">
          <button className="btn-water" onClick={() => toast('Share card ready · opening X', 'check')}><IconX />Share on X</button>
          <button className="btn-glass" style={{ height: 42 }} onClick={() => toast('Share card ready · opening Telegram', 'check')}><IconTelegram />Telegram</button>
        </div>
        <p className="note">Your call is live in My calls. It is judged automatically when the window ends.</p>
      </div>
    </div>
  )
}
