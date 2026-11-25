// Thin client for the Upwell backend (backend/). Set VITE_API_URL to point elsewhere.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:7726').replace(/\/$/, '')

let token = null
export const setToken = (t) => { token = t }
export const getToken = () => token

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

export async function api(path, { method = 'GET', body, signal, timeout = 8000 } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  signal?.addEventListener('abort', () => ctrl.abort())
  try {
    const res = await fetch(API_URL + path, {
      method,
      signal: ctrl.signal,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`)
    return data
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError(0, err.name === 'AbortError' ? 'The Upwell API did not answer' : 'Cannot reach the Upwell API')
  } finally {
    clearTimeout(timer)
  }
}

/** Server-Sent Events stream. Returns a close function. */
export function openStream(handlers) {
  if (typeof EventSource === 'undefined') return () => {}
  const es = new EventSource(API_URL + '/stream' + (token ? `?token=${encodeURIComponent(token)}` : ''))
  for (const [type, fn] of Object.entries(handlers)) {
    es.addEventListener(type, (e) => { try { fn(JSON.parse(e.data)) } catch { /* ignore bad frames */ } })
  }
  return () => es.close()
}

/** wei string -> BNB number (display only) */
export const weiToBnb = (wei) => Number(BigInt(wei || 0) / 10n ** 12n) / 1e6
