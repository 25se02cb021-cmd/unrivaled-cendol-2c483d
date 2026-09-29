import { createServerFn } from '@tanstack/react-start'

export type Range = '1h' | '24h' | '7d'

export interface MetricsPayload {
  generatedAt: string
  range: Range
  kpis: {
    activeUsers: number
    requestsPerMin: number
    errorRate: number
    p95Latency: number
  }
  traffic: { labels: string[]; requests: number[]; errors: number[] }
  latency: { labels: string[]; p50: number[]; p95: number[] }
  regions: { label: string; value: number }[]
  feed: { id: string; time: string; message: string; level: 'info' | 'warn' }[]
}

const RANGES: Record<Range, { points: number; stepMs: number }> = {
  '1h': { points: 30, stepMs: 2 * 60_000 },
  '24h': { points: 24, stepMs: 60 * 60_000 },
  '7d': { points: 28, stepMs: 6 * 60 * 60_000 },
}

// Smooth, time-anchored signal so neighbouring refreshes line up and the
// charts appear to "move" rather than jump randomly.
function signal(t: number, seed: number) {
  const hour = (t / 3_600_000) % 24
  const daily = Math.sin(((hour - 8) / 24) * Math.PI * 2) * 0.35 + 1
  const wobble =
    Math.sin(t / 420_000 + seed) * 0.08 + Math.sin(t / 97_000 + seed * 2) * 0.04
  return daily + wobble
}

function jitter(amount: number) {
  return 1 + (Math.random() - 0.5) * amount
}

function label(t: number, range: Range) {
  const d = new Date(t)
  if (range === '7d') {
    return d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', timeZone: 'UTC' })
  }
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
}

const EVENTS = [
  ['info', 'Deploy completed on edge cluster'],
  ['info', 'Cache hit ratio climbed above 94%'],
  ['warn', 'Latency spike detected in ap-southeast'],
  ['info', 'Autoscaler added 2 instances'],
  ['warn', 'Error rate above threshold on /checkout'],
  ['info', 'New signup burst from campaign traffic'],
  ['info', 'Background job queue drained'],
] as const

export const getMetrics = createServerFn({ method: 'GET' })
  .inputValidator((data: { range: Range }) => ({
    range: data.range in RANGES ? data.range : '1h',
  }))
  .handler(async ({ data }): Promise<MetricsPayload> => {
    const { range } = data
    const { points, stepMs } = RANGES[range]
    const now = Date.now()
    const start = now - (points - 1) * stepMs

    const labels: string[] = []
    const requests: number[] = []
    const errors: number[] = []
    const p50: number[] = []
    const p95: number[] = []

    for (let i = 0; i < points; i++) {
      const t = start + i * stepMs
      const s = signal(t, 1)
      const req = Math.round(1800 * s * jitter(0.1))
      labels.push(label(t, range))
      requests.push(req)
      errors.push(Math.round(req * 0.012 * signal(t, 4) * jitter(0.6)))
      const base = 42 + (s - 1) * 30
      p50.push(Math.round(base * jitter(0.15)))
      p95.push(Math.round(base * 2.6 * jitter(0.25)))
    }

    const last = requests.length - 1
    const regionsRaw = [
      ['North America', 38],
      ['Europe', 29],
      ['Asia Pacific', 21],
      ['South America', 8],
      ['Africa', 4],
    ] as const

    const feed = Array.from({ length: 6 }, (_, i) => {
      const t = now - i * 47_000 - Math.floor(Math.random() * 20_000)
      const [level, message] = EVENTS[Math.floor(Math.random() * EVENTS.length)]
      return {
        id: `${t}-${i}`,
        time: new Date(t).toISOString(),
        level,
        message,
      }
    })

    return {
      generatedAt: new Date(now).toISOString(),
      range,
      kpis: {
        activeUsers: Math.round(4200 * signal(now, 2) * jitter(0.04)),
        requestsPerMin: requests[last],
        errorRate: +((errors[last] / requests[last]) * 100).toFixed(2),
        p95Latency: p95[last],
      },
      traffic: { labels, requests, errors },
      latency: { labels, p50, p95 },
      regions: regionsRaw.map(([l, v]) => ({
        label: l,
        value: Math.round(v * jitter(0.15)),
      })),
      feed,
    }
  })
