import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import {
  Activity,
  AlertTriangle,
  Gauge,
  Pause,
  Play,
  RefreshCw,
  Users,
  Zap,
} from 'lucide-react'
import { getMetrics, type MetricsPayload, type Range } from '@/server/metrics.functions'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
)

export const Route = createFileRoute('/')({
  loader: () => getMetrics({ data: { range: '1h' } }),
  component: Home,
})

const REFRESH_MS = 5000
const RANGES: Range[] = ['1h', '24h', '7d']
const C = {
  blue: '#3b82f6',
  teal: '#14b8a6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  grid: 'rgba(148, 163, 184, 0.15)',
  tick: '#94a3b8',
}

const axisOptions = {
  grid: { color: C.grid },
  ticks: { color: C.tick, maxTicksLimit: 8 },
  border: { display: false },
}

const lineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  animation: { duration: 600 },
  plugins: { legend: { labels: { color: '#cbd5e1', boxWidth: 12 } } },
  scales: { x: axisOptions, y: { ...axisOptions, beginAtZero: true } },
}

const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600 },
  plugins: { legend: { display: false } },
  scales: { x: axisOptions, y: { ...axisOptions, beginAtZero: true } },
}

const fmt = new Intl.NumberFormat('en-US')

function Home() {
  const initial = Route.useLoaderData()
  const [metrics, setMetrics] = useState<MetricsPayload>(initial)
  const [range, setRange] = useState<Range>(initial.range)
  const [live, setLive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const refresh = useCallback(async (r: Range) => {
    setLoading(true)
    try {
      setMetrics(await getMetrics({ data: { range: r } }))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!live) return
    const id = setInterval(() => refresh(range), REFRESH_MS)
    return () => clearInterval(id)
  }, [live, range, refresh])

  const changeRange = (r: Range) => {
    setRange(r)
    refresh(r)
  }

  const { kpis } = metrics
  const stats = [
    { title: 'Active users', value: fmt.format(kpis.activeUsers), icon: Users, color: C.blue },
    { title: 'Requests / min', value: fmt.format(kpis.requestsPerMin), icon: Zap, color: C.teal },
    { title: 'Error rate', value: `${kpis.errorRate}%`, icon: AlertTriangle, color: kpis.errorRate > 1.5 ? C.rose : C.amber },
    { title: 'p95 latency', value: `${kpis.p95Latency} ms`, icon: Gauge, color: C.violet },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-teal-400 text-sm font-medium mb-1">
              <Activity className="w-4 h-4" />
              Pulse
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Live service metrics</h1>
            <p className="text-slate-400 mt-1 text-sm">
              Data is generated on the server and refreshes every {REFRESH_MS / 1000}s.
              Last update{' '}
              <time dateTime={metrics.generatedAt} suppressHydrationWarning>
                {new Date(metrics.generatedAt).toLocaleTimeString()}
              </time>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-900 p-1 ring-1 ring-slate-800">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => changeRange(r)}
                  className={`px-3 py-1.5 text-sm rounded-md transition ${
                    range === r ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={() => setLive((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-900 ring-1 ring-slate-800 hover:bg-slate-800"
            >
              {live ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
                  </span>
                  Live <Pause className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Paused <Play className="w-3.5 h-3.5" />
                </>
              )}
            </button>
            <button
              onClick={() => refresh(range)}
              aria-label="Refresh now"
              className="p-2 rounded-lg bg-slate-900 ring-1 ring-slate-800 hover:bg-slate-800"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((s) => (
            <div key={s.title} className="rounded-xl bg-slate-900 ring-1 ring-slate-800 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{s.title}</p>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <p className="text-3xl font-semibold mt-2 tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {mounted && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Traffic" className="lg:col-span-2">
              <Line
                options={lineOptions}
                data={{
                  labels: metrics.traffic.labels,
                  datasets: [
                    {
                      label: 'Requests',
                      data: metrics.traffic.requests,
                      borderColor: C.teal,
                      backgroundColor: 'rgba(20, 184, 166, 0.12)',
                      fill: true,
                      tension: 0.35,
                      pointRadius: 0,
                    },
                    {
                      label: 'Errors',
                      data: metrics.traffic.errors,
                      borderColor: C.rose,
                      backgroundColor: 'transparent',
                      tension: 0.35,
                      pointRadius: 0,
                    },
                  ],
                }}
              />
            </Panel>

            <Panel title="Traffic by region">
              <Doughnut
                data={{
                  labels: metrics.regions.map((r) => r.label),
                  datasets: [
                    {
                      data: metrics.regions.map((r) => r.value),
                      backgroundColor: [C.blue, C.teal, C.violet, C.amber, C.rose],
                      borderColor: '#0f172a',
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '65%',
                  plugins: {
                    legend: { position: 'bottom', labels: { color: '#cbd5e1', boxWidth: 12 } },
                  },
                }}
              />
            </Panel>

            <Panel title="Latency (ms)" className="lg:col-span-2">
              <Bar
                options={barOptions}
                data={{
                  labels: metrics.latency.labels,
                  datasets: [
                    { label: 'p50', data: metrics.latency.p50, backgroundColor: C.blue, borderRadius: 4 },
                    { label: 'p95', data: metrics.latency.p95, backgroundColor: 'rgba(139, 92, 246, 0.6)', borderRadius: 4 },
                  ],
                }}
              />
            </Panel>

            <Panel title="Activity feed">
              <ul className="space-y-3 h-full overflow-y-auto">
                {metrics.feed.map((e) => (
                  <li key={e.id} className="flex gap-3 text-sm">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        e.level === 'warn' ? 'bg-amber-400' : 'bg-teal-400'
                      }`}
                    />
                    <div>
                      <p className="text-slate-200">{e.message}</p>
                      <p className="text-slate-500 text-xs">
                        {new Date(e.time).toLocaleTimeString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        )}
      </div>
    </div>
  )
}

function Panel({
  title,
  className = '',
  children,
}: {
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={`rounded-xl bg-slate-900 ring-1 ring-slate-800 p-5 ${className}`}>
      <h2 className="text-sm font-medium text-slate-300 mb-4">{title}</h2>
      <div className="h-72">{children}</div>
    </section>
  )
}
