// Canvas engine for the market map: glass water bubbles with soft physics.
// Framework-free; the MarketMap component owns its lifecycle.
import { clamp, fmtPct, fmtUsd } from '../lib/format'

const UP = [7, 148, 85]
const DOWN = [217, 45, 32]
const STYLE = { rim: 1, labelWeight: 600, caustics: 1, fill: 0.44, gap: 6 }

// Token avatars, loaded once and shared by every map. Returns the image once it has loaded.
const avatars = new Map()
function avatarImage(url) {
  if (!url || typeof Image === 'undefined') return null
  let e = avatars.get(url)
  if (!e) {
    e = { img: new Image(), ok: false }
    e.img.decoding = 'async'
    e.img.onload = () => { e.ok = e.img.naturalWidth > 0 }
    e.img.src = url
    avatars.set(url, e)
  }
  return e.ok ? e.img : null
}

// onWater(x, y, radius, strength): when given, taps and highlights make real ripples on a water layer
// underneath (the 3D WebGL water) instead of the flat rings drawn here. It returns false if it cannot.
export function createMapEngine({ canvas, stage, getTokens, getFilter, getSelected, onSelect, reducedMotion, onWater }) {
  const ctx = canvas.getContext('2d')
  let W = 0, H = 0, DPR = 1
  let bubbles = []
  let ripples = []
  const dots = []
  let hover = null
  let settle = 0
  let tt = 0
  let PX = 0, PY = 0, PXt = 0, PYt = 0
  let raf = 0
  let last = performance.now()
  let first = true

  const par = (b) => [PX * b.z, PY * b.z]

  function addBubble(t, rising) {
    const b = {
      t, x: W * (0.1 + Math.random() * 0.8), y: H * (0.1 + Math.random() * 0.8),
      vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
      r: rising ? 4 : 0, rt: 0, ph: Math.random() * 6.28, z: 0.3 + Math.random() * 0.7,
      dying: false, rising, newAt: rising ? performance.now() : 0,
    }
    if (rising) { b.x = W * (0.15 + Math.random() * 0.7); b.y = H + 40; b.vy = -90 }
    bubbles.push(b)
    return b
  }

  function visible(t) {
    const f = getFilter()
    return (f.src === 'All' || t.src === f.src) && (!f.safe || (t.safety ?? -1) >= 70)
  }

  /** Keep bubbles in sync with the token list (new listings rise, retired ones shrink away). */
  function sync() {
    const list = getTokens()
    // The first non-empty list is the starting map (tokens may arrive from the API after start-up):
    // it is packed into a balanced layout and revealed largest first. Only tokens that appear later
    // rise in as new listings. Wait for the stage to have a size before placing anything.
    if (first && (!W || !list.length)) return
    const initial = first
    const have = new Set(bubbles.map((b) => b.t))
    for (const t of list) if (!have.has(t)) addBubble(t, !first)
    const inList = new Set(list)
    for (const b of bubbles) if (!inList.has(b.t)) b.dying = true
    computeTargets()
    if (initial) {
      first = false
      pack()
    }
  }

  /** Spiral-pack the starting bubbles around the centre (stretched to the stage's shape), biggest first. */
  function pack() {
    const order = bubbles.filter((b) => b.rt > 0).sort((a, b) => b.rt - a.rt)
    const cx = W / 2, cy = H / 2, ax = Math.max(1, W / H)
    const placed = []
    const turn = Math.random() * 6.283
    for (const b of order) {
      let done = false
      for (let rho = 0; rho < Math.max(W, H) && !done; rho += 3) {
        const steps = Math.max(1, Math.round(rho / 3))
        for (let i = 0; i < steps; i++) {
          const th = turn + (i / steps) * 6.283
          const x = cx + Math.cos(th) * rho * ax, y = cy + Math.sin(th) * rho
          if (x < b.rt + 6 || x > W - b.rt - 6 || y < b.rt + 6 || y > H - b.rt - 6) continue
          if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.rt + b.rt + STYLE.gap + 2)) {
            b.x = x; b.y = y; done = true; break
          }
        }
      }
      placed.push(b)
    }
    order.forEach((b, i) => {
      b.vx = (Math.random() - 0.5) * 6; b.vy = (Math.random() - 0.5) * 6
      if (reducedMotion) { b.r = b.rt; return }
      b.r = 0; b.delay = 0.08 + i * 0.045 // staggered reveal, largest first
    })
  }

  function computeTargets() {
    if (!W) return
    const vis = bubbles.filter((b) => !b.dying && visible(b.t))
    const sum = vis.reduce((a, b) => a + b.t.vol, 0) || 1
    const k = Math.sqrt((STYLE.fill * W * H) / (Math.PI * sum))
    const rmax = Math.min(W, H) * (W < 520 ? 0.2 : 0.17)
    const rmin = W < 520 ? 22 : 26
    for (const b of bubbles) {
      const on = !b.dying && visible(b.t)
      b.rt = on ? clamp(k * Math.sqrt(b.t.vol), rmin, rmax) : 0
    }
  }

  function resize() {
    const r = stage.getBoundingClientRect()
    if (!r.width) return
    DPR = Math.min(2, window.devicePixelRatio || 1)
    W = r.width; H = r.height
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR)
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    computeTargets()
    settle = 90
    if (first) sync()
    for (const b of bubbles) {
      b.x = clamp(b.x, b.rt + 4, W - b.rt - 4)
      if (!b.rising) b.y = clamp(b.y, b.rt + 4, H - b.rt - 4)
    }
  }

  function collide() {
    const n = bubbles.length
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < n; i++) {
        const a = bubbles[i]; if (a.r < 2) continue
        for (let j = i + 1; j < n; j++) {
          const b = bubbles[j]; if (b.r < 2) continue
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01
          const min = a.r + b.r + STYLE.gap
          if (d < min) {
            const o = (min - d) * 0.5, nx = dx / d, ny = dy / d
            const wa = (b.r * b.r) / (a.r * a.r + b.r * b.r), wb = 1 - wa
            a.x -= nx * o * 2 * wa; a.y -= ny * o * 2 * wa
            b.x += nx * o * 2 * wb; b.y += ny * o * 2 * wb
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
            if (rv < 0) { const im = rv * 0.5; a.vx += im * nx; a.vy += im * ny; b.vx -= im * nx; b.vy -= im * ny }
          }
        }
      }
    }
    for (const b of bubbles) {
      if (b.r < 1) continue
      const p = 4
      if (b.x < b.r + p) { b.x = b.r + p; b.vx = Math.abs(b.vx) * 0.5 }
      if (b.x > W - b.r - p) { b.x = W - b.r - p; b.vx = -Math.abs(b.vx) * 0.5 }
      if (b.y < b.r + p) { b.y = b.r + p; b.vy = Math.abs(b.vy) * 0.5 }
      if (!b.rising && b.y > H - b.r - p) { b.y = H - b.r - p; b.vy = -Math.abs(b.vy) * 0.5 }
    }
  }

  // ---- water flow ----
  // Each drop on the water sends out a ring. As the ring passes a bubble it pushes it outwards and makes it
  // bob, a little less for big bubbles. Raindrops nudge, clicks shove, the pointer leaves a gentle wake.
  const WAVE_SPEED = 260 // px/s, about how fast the WebGL ripples spread
  let waves = []
  function pushWave(x, y, strength) {
    if (reducedMotion || !(strength > 0)) return
    waves.push({ x, y, s: strength, t: 0 })
    if (waves.length > 24) waves.shift()
  }
  function flow(dt) {
    if (!waves.length) return
    for (const w of waves) {
      w.t += dt
      const R = WAVE_SPEED * w.t
      const amp = (w.s * Math.exp(-w.t * 1.5)) / (1 + R / 300)
      for (const b of bubbles) {
        if (b.r < 2 || b.rising || b.delay > 0) continue
        const dx = b.x - w.x, dy = b.y - w.y, d = Math.hypot(dx, dy) || 0.01
        const band = b.r * 0.7 + 26
        const off = Math.abs(d - R)
        if (off > band) continue
        const f = amp * (1 - off / band) * 240 * (34 / Math.max(34, b.r))
        b.vx += (dx / d) * f * dt; b.vy += (dy / d) * f * dt
        b.bob = Math.min(0.06, (b.bob || 0) + amp * (1 - off / band) * 0.05 * dt * 8)
      }
    }
    waves = waves.filter((w) => w.t < 2.6)
  }

  function step(dt) {
    tt += dt
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]
      if (b.delay > 0) { b.delay -= dt; continue }
      b.r += (b.rt - b.r) * Math.min(1, dt * (reducedMotion ? 20 : 2.6))
      if (b.dying && b.r < 1) { bubbles.splice(i, 1); continue }
      if (!reducedMotion) {
        b.vx += Math.sin(tt * 0.35 + b.ph) * 5 * dt
        b.vy += Math.cos(tt * 0.29 + b.ph * 1.7) * 5 * dt
      }
      if (b.rising) { b.vy = Math.min(b.vy, -70); if (b.y < H * 0.62) b.rising = false }
      else {
        // drift speed is capped, but a push from the water above the cap fades out smoothly instead of stopping dead
        const sp = Math.hypot(b.vx, b.vy), max = reducedMotion ? 0 : 16
        if (sp > max && sp > 0) { const k = reducedMotion ? max / sp : Math.max(max / sp, 1 - dt * 1.15); b.vx *= k; b.vy *= k }
      }
      b.vx *= 0.992; b.vy *= 0.992
      b.x += b.vx * dt; b.y += b.vy * dt
      if (b.bob) { b.bob *= Math.exp(-dt * 2.6); if (b.bob < 0.002) b.bob = 0 }
    }
    flow(dt)
    collide()
    if (settle > 0) { settle--; for (let k = 0; k < 4; k++) collide() }
    if (!reducedMotion) {
      for (const d of dots) {
        d.y -= d.v * dt; d.x += Math.sin(tt * 1.4 + d.p) * 0.25
        if (d.y < -6) { d.y = H + 6; d.x = Math.random() * W }
      }
    }
    ripples = ripples.filter((r) => (r.t += dt) < 1.1)
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
  }

  function drawBubble(b, t) {
    const r = b.r
    if (r < 1.5) return
    const up = b.t.chg >= 0, c = up ? UP : DOWN
    const I = clamp(Math.abs(b.t.chg) / 40, 0.15, 1) * STYLE.rim
    const wob = reducedMotion ? 0 : 0.022
    const sx = 1 + Math.sin(t * 1.6 + b.ph) * wob, sy = 1 - Math.sin(t * 1.6 + b.ph) * wob
    const hv = (hover === b ? 1.035 : 1) * (1 + (b.bob || 0) * Math.sin(t * 9 + b.ph)) // bob when a wave passes
    const sel = getSelected() === b.t.sym
    const P = par(b)
    ctx.save(); ctx.translate(b.x + P[0], b.y + P[1])

    // floor shadow, cast away from the top-left light
    ctx.save(); ctx.translate(r * 0.2, r * 1.08); ctx.scale(1, 0.2)
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.9)
    sh.addColorStop(0, `rgba(11,59,92,${(0.14 + 0.1 * b.z).toFixed(3)})`); sh.addColorStop(1, 'rgba(11,59,92,0)')
    ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, 6.283); ctx.fillStyle = sh; ctx.fill(); ctx.restore()

    ctx.scale(sx * hv, sy * hv)
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.clip()
    // lit sphere body
    const g = ctx.createRadialGradient(-r * 0.38, -r * 0.42, r * 0.02, -r * 0.05, -r * 0.05, r * 1.12)
    g.addColorStop(0, 'rgba(255,255,255,.96)'); g.addColorStop(0.32, 'rgba(255,255,255,.6)'); g.addColorStop(0.66, 'rgba(230,246,252,.3)')
    g.addColorStop(0.86, `rgba(${c[0]},${c[1]},${c[2]},${(0.1 + 0.16 * I).toFixed(3)})`)
    g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},${(0.3 + 0.36 * I).toFixed(3)})`)
    ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r)
    // volume shading on the far side
    const d = ctx.createRadialGradient(-r * 0.45, -r * 0.5, r * 0.3, -r * 0.2, -r * 0.2, r * 1.55)
    d.addColorStop(0, 'rgba(11,59,92,0)'); d.addColorStop(0.72, 'rgba(11,59,92,0)'); d.addColorStop(1, 'rgba(11,59,92,.20)')
    ctx.fillStyle = d; ctx.fillRect(-r, -r, 2 * r, 2 * r)
    // refracted light pooling at the bottom
    const cg = ctx.createRadialGradient(r * 0.16, r * 0.6, 0, r * 0.16, r * 0.6, r * 0.6)
    cg.addColorStop(0, 'rgba(255,255,255,.8)'); cg.addColorStop(0.45, 'rgba(210,244,253,.32)'); cg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(r * 0.16, r * 0.6, r * 0.62, r * 0.36, 0, 0, 6.283); ctx.fill()
    ctx.restore()

    // rim
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283)
    ctx.lineWidth = 1 + 1.6 * I; ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.35 + 0.45 * I).toFixed(3)})`; ctx.stroke()
    ctx.beginPath(); ctx.arc(0, 0, r - 1.5, 0, 6.283); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.stroke()
    // specular highlight
    ctx.save(); ctx.rotate(-0.62)
    const hg = ctx.createLinearGradient(0, -r * 0.62, 0, -r * 0.3)
    hg.addColorStop(0, 'rgba(255,255,255,.95)'); hg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.beginPath(); ctx.ellipse(0, -r * 0.48, r * 0.42, r * 0.17, 0, 0, 6.283); ctx.fillStyle = hg; ctx.fill(); ctx.restore()
    ctx.beginPath(); ctx.arc(-r * 0.52, -r * 0.2, Math.max(1.2, r * 0.05), 0, 6.283); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill()
    // reflection arc bottom-right
    ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0.18 * Math.PI, 0.42 * Math.PI)
    ctx.lineWidth = Math.max(1.2, r * 0.05); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.stroke()

    if (sel) {
      ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, 6.283); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(10,139,208,.9)'; ctx.stroke()
      ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, 6.283); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(46,197,236,.18)'; ctx.stroke()
    }
    if (b.newAt && performance.now() - b.newAt < 24000) {
      ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 14
      ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, 6.283); ctx.lineWidth = 1.8; ctx.strokeStyle = '#D99A00'; ctx.stroke(); ctx.setLineDash([])
      ctx.font = '600 10px "IBM Plex Mono",monospace'
      const tw = ctx.measureText('NEW').width + 12
      ctx.fillStyle = 'rgba(255,255,255,.95)'; roundRect(-tw / 2, -r - 20, tw, 16, 8); ctx.fill()
      ctx.strokeStyle = 'rgba(217,154,0,.6)'; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = '#A86F00'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NEW', 0, -r - 12)
    }

    // Every bubble shows its avatar, scaled with the bubble: avatar on top, symbol and change below.
    // Labels shrink with the bubble and are fitted to the width available at their height.
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const roomy = r >= 30
    const a = roomy ? r * 0.56 : r * 0.82          // avatar diameter
    const ay = roomy ? -r * 0.3 : -r * 0.2          // avatar centre
    drawAvatar(b.t, 0, ay, a)
    const fs = roomy ? clamp(r * 0.22, 9.5, 20) : clamp(r * 0.3, 7.5, 9)
    const ly = roomy ? r * 0.2 : r * 0.5
    fitText(b.t.sym, 0, ly, chord(r, ly + fs * 0.5) - 6, fs, `${STYLE.labelWeight} {}px "Inter Tight",Inter,sans-serif`, '#0B3B5C')
    if (roomy) {
      const py = ly + fs * 1.08, pf = Math.max(8, fs * 0.8)
      fitText(fmtPct(b.t.chg), 0, py, chord(r, py + pf * 0.5) - 6, pf, '600 {}px "IBM Plex Mono",monospace', up ? '#067A47' : '#C2271B')
    }
    ctx.restore()
  }

  /** Width of the bubble at height y from its centre. */
  const chord = (r, y) => 2 * Math.sqrt(Math.max(0, r * r - y * y))

  /** Draw text, shrinking it (to 70%) and then cutting it with an ellipsis so it fits maxW. */
  function fitText(text, x, y, maxW, size, font, color) {
    let s = size
    ctx.font = font.replace('{}', s)
    let w = ctx.measureText(text).width
    if (w > maxW) { s = Math.max(size * 0.7, (size * maxW) / w); ctx.font = font.replace('{}', s); w = ctx.measureText(text).width }
    let out = text
    if (w > maxW) {
      while (out.length > 1 && ctx.measureText(out + '…').width > maxW) out = out.slice(0, -1)
      out += '…'
    }
    ctx.fillStyle = color; ctx.fillText(out, x, y)
  }

  /** Round token avatar; while it loads (or if it has none) a lettered coin in the token's colours. */
  function drawAvatar(t, x, y, a) {
    if (a < 6) return
    const img = avatarImage(t.avatar)
    ctx.save()
    ctx.beginPath(); ctx.arc(x, y, a / 2, 0, 6.283)
    ctx.shadowColor = 'rgba(11,59,92,.22)'; ctx.shadowBlur = Math.min(8, a * 0.18); ctx.shadowOffsetY = Math.min(2, a * 0.05)
    if (img) { ctx.fillStyle = '#fff'; ctx.fill() }
    else {
      const g = ctx.createLinearGradient(x - a / 2, y - a / 2, x + a / 2, y + a / 2)
      g.addColorStop(0, t.c1 || '#2EC5EC'); g.addColorStop(1, t.c2 || '#0A8BD0')
      ctx.fillStyle = g; ctx.fill()
    }
    ctx.shadowColor = 'transparent'
    if (img) { ctx.clip(); ctx.drawImage(img, x - a / 2, y - a / 2, a, a) }
    else {
      ctx.fillStyle = '#fff'; ctx.font = `700 ${(a * 0.46).toFixed(1)}px "Inter Tight",Inter,sans-serif`
      ctx.fillText([...String(t.sym || '?').replace(/^\$/, '')][0]?.toUpperCase() || '?', x, y + a * 0.02)
    }
    ctx.restore()
    ctx.beginPath(); ctx.arc(x, y, a / 2, 0, 6.283); ctx.lineWidth = Math.max(1, a * 0.04); ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.stroke()
  }

  function drawWater(t) {
    ctx.save(); ctx.lineWidth = 1.1
    // with a real water layer underneath, skip the drawn wave lines (it has its own light)
    if (!onWater) for (let k = 0; k < 6; k++) {
      const y0 = H * (0.1 + k * 0.165)
      ctx.beginPath()
      for (let x = -10; x <= W + 10; x += 18) {
        const y = y0 + Math.sin(x * 0.011 + t * 0.5 + k * 1.3) * 9 + Math.sin(x * 0.027 - t * 0.35 + k) * 4
        if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = `rgba(255,255,255,${(0.32 * STYLE.caustics).toFixed(2)})`; ctx.stroke()
    }
    for (const d of dots) {
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283)
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0.8; ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fill()
    }
    ctx.restore()
  }

  function drawRipples() {
    for (const r of ripples) {
      for (let i = 0; i < 3; i++) {
        const p = r.t - i * 0.12; if (p <= 0) continue
        const a = Math.max(0, 0.55 * (1 - p / 0.95))
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + p * 110, 0, 6.283)
        ctx.strokeStyle = `rgba(10,139,208,${a.toFixed(3)})`; ctx.lineWidth = 2 - i * 0.5; ctx.stroke()
      }
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now
    if (W) {
      step(dt)
      PX += (PXt - PX) * Math.min(1, dt * 4); PY += (PYt - PY) * Math.min(1, dt * 4)
      ctx.clearRect(0, 0, W, H)
      drawWater(now / 1000)
      const order = bubbles.slice().sort((a, b) => a.r - b.r)
      for (const b of order) drawBubble(b, now / 1000)
      drawRipples()
    }
    raf = requestAnimationFrame(frame)
  }

  function hit(x, y) {
    let best = null
    for (const b of bubbles) {
      if (b.r < 6) continue
      const P = par(b)
      if (Math.hypot(x - b.x - P[0], y - b.y - P[1]) <= b.r + 2 && (!best || b.r < best.r)) best = b
    }
    return best
  }

  const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  let wakeAt = 0, wx = null, wy = 0
  function onMove(e) {
    const [x, y] = local(e)
    if (!reducedMotion) { PXt = (x / W - 0.5) * -14; PYt = (y / H - 0.5) * -10 }
    hover = hit(x, y)
    canvas.style.cursor = hover ? 'pointer' : 'default'
    // wake behind the pointer: a faint ripple and a gentle drag on the bubbles it passes
    const now = performance.now()
    if (reducedMotion || e.pointerType === 'touch' || now - wakeAt < 32) return
    if (wx === null) { wx = x; wy = y; wakeAt = now; return }
    const mx = x - wx, my = y - wy, dist = Math.hypot(mx, my)
    wakeAt = now; wx = x; wy = y
    if (dist < 2 || dist > 120) return
    if (!hover) onWater?.(x, y, 14, Math.min(0.12, dist * 0.004))
    for (const b of bubbles) {
      if (b.r < 2 || b.rising) continue
      const d = Math.hypot(b.x - x, b.y - y), reach = b.r + 60
      if (d > reach) continue
      const k = 1.1 * (1 - d / reach) * (34 / Math.max(34, b.r))
      b.vx += clamp(mx, -30, 30) * k; b.vy += clamp(my, -30, 30) * k
    }
  }
  function onLeave() { hover = null; PXt = 0; PYt = 0; wx = null }
  /** A ripple at (x, y): real water when available, otherwise the flat ring. Either way it moves the bubbles. */
  function splash(x, y, radius, strength, ringR0) {
    pushWave(x, y, strength)
    if (onWater && onWater(x, y, radius, strength) !== false) return
    ripples.push({ x, y, r0: ringR0, t: 0 })
  }

  function onClick(e) {
    const [x, y] = local(e)
    const b = hit(x, y)
    if (b) { splash(b.x, b.y, b.r * 0.55, 0.9, b.r); onSelect(b.t.sym) }
    else {
      splash(x, y, 40, 1.6, 4)
      if (waves.length) waves[waves.length - 1].s *= 1.8 // a click on open water pushes the bubbles harder than rain
    }
  }

  // ---- start ----
  resize()
  sync()
  for (let i = 0; i < 26; i++) dots.push({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 2.4, v: 10 + Math.random() * 22, p: Math.random() * 6 })

  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('click', onClick)
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null
  ro?.observe(stage)
  window.addEventListener('resize', resize)
  raf = requestAnimationFrame(frame)

  return {
    sync,
    refilter: computeTargets,
    /** Ripple on a token's bubble, e.g. when it is opened from search. */
    ripple(sym) { const b = bubbles.find((x) => x.t.sym === sym); if (b) splash(b.x, b.y, b.r * 0.55, 0.9, b.r) },
    /** A raindrop at a random spot: a small ripple that nudges nearby bubbles. */
    rain() {
      if (!W || !onWater) return
      const x = Math.random() * W, y = Math.random() * H
      pushWave(x, y, 0.35)
      onWater(x, y, 7 + Math.random() * 6, 0.3)
    },
    destroy() {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('click', onClick)
      ro?.disconnect()
      window.removeEventListener('resize', resize)
    },
  }
}
