// Clean line icons. Decorative unless a label is passed.
const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const NavIcons = {
  bubbles: (p) => <svg viewBox="0 0 24 24" {...line} aria-hidden="true" {...p}><circle cx="8" cy="9" r="4.5" /><circle cx="16.5" cy="14.5" r="3.5" /><circle cx="7.5" cy="18" r="2" /></svg>,
  upw: (p) => <svg viewBox="0 0 24 24" {...line} aria-hidden="true" {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="10.2" cy="14" r="2.4" /><circle cx="14.2" cy="9.6" r="1.5" /></svg>,
  docs: (p) => <svg viewBox="0 0 24 24" {...line} aria-hidden="true" {...p}><path d="M6.5 3.5h7.5l4 4v13h-11.5z" /><path d="M14 3.5v4h4M9.5 12h5M9.5 15.5h5" /></svg>,
  explore: (p) => <svg viewBox="0 0 24 24" {...line} aria-hidden="true" {...p}><circle cx="12" cy="12" r="8.5" /><path d="m14.8 9.2-1.6 4-4 1.6 1.6-4z" /></svg>,
  calls: (p) => <svg viewBox="0 0 24 24" {...line} aria-hidden="true" {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>,
  leaderboard: (p) => <svg viewBox="0 0 24 24" {...line} aria-hidden="true" {...p}><path d="M5 20V12M12 20V5M19 20v-5" /></svg>,
  rewards: (p) => <svg viewBox="0 0 24 24" {...line} aria-hidden="true" {...p}><path d="M12 3.5c3.6 4.6 6 8 6 11a6 6 0 0 1-12 0c0-3 2.4-6.4 6-11z" /><path d="M9.5 15.5a2.6 2.6 0 0 0 2.5 2" /></svg>,
  profile: (p) => <svg viewBox="0 0 24 24" {...line} aria-hidden="true" {...p}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3" /></svg>,
}

export const IconOk = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="rgba(7,148,85,.12)" /><path d="m7.5 12.3 3 3 6-6.3" stroke="#079455" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
export const IconWarn = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5 22 20H2z" fill="rgba(181,71,8,.12)" stroke="#B54708" strokeWidth="1.6" strokeLinejoin="round" /><path d="M12 9.5v4.5M12 16.8v.01" stroke="#B54708" strokeWidth="2" strokeLinecap="round" /></svg>
)
export const IconBad = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="rgba(217,45,32,.1)" /><path d="m8.5 8.5 7 7m0-7-7 7" stroke="#D92D20" strokeWidth="2" strokeLinecap="round" /></svg>
)

export const ToastIcons = {
  info: () => <svg viewBox="0 0 24 24" fill="none" stroke="#0A8BD0" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5v.01" /></svg>,
  wallet: () => <svg viewBox="0 0 24 24" fill="none" stroke="#B54708" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M16 12.5h2M3 9.5h18" /></svg>,
  new: () => <svg viewBox="0 0 24 24" fill="none" stroke="#D99A00" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" strokeDasharray="3 3" /><path d="M12 8v8M8 12h8" /></svg>,
  check: () => <svg viewBox="0 0 24 24" fill="none" stroke="#079455" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.8 2.8L16.5 9.5" /></svg>,
}

export const IconClose = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
export const IconSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
export const IconPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A8BD0" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
export const IconClock = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
export const IconCopy = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A1.5 1.5 0 0 1 6.5 5H15" /></svg>
export const IconHand = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-.6a5 5 0 0 1-3.9-1.9L4.3 15a1.5 1.5 0 0 1 2.3-1.9L9 15.5" /></svg>
export const IconX = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5 21H1.9l7.3-8.3L1.5 3H8l4.4 5.8L17.5 3zm-1.1 16.2h1.7L7.2 4.7H5.4l11 14.5z" /></svg>
export const IconTelegram = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M21 4 3 11l6 2 2 6 3.5-4L19 19z" /><path d="m9 13 8-6" /></svg>
export const IconAlert = () => <svg viewBox="0 0 24 24" fill="none" stroke="#B54708" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>
