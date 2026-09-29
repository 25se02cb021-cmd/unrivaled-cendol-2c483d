# AGENTS.md

## Project

Pulse is a single-page live metrics dashboard built with TanStack Start and deployed on Netlify. The page renders server-generated data and polls for updates.

## Structure

```
src/
  routes/__root.tsx            # HTML shell and site metadata
  routes/index.tsx             # Dashboard: KPI tiles, Chart.js charts, range picker, live toggle
  server/metrics.functions.ts  # getMetrics server function (the only data source)
  router.tsx                   # Router setup
  styles.css                   # Tailwind import + base styles
```

## Things to know

- Data flow: the route `loader` calls `getMetrics` for the server-rendered first paint, then the component polls `getMetrics` every 5s (`REFRESH_MS`) while "Live" is on.
- Data is synthetic. It comes from a smooth time-based signal plus a little jitter, so consecutive refreshes look continuous. To use real data, swap out the handler body and keep the `MetricsPayload` shape.
- Charts only render after the component mounts because Chart.js needs `window`.
- Server-function inputs use `.inputValidator(...)`, not `.validator`.
- Styling: dark slate theme using Tailwind utilities. Chart colors live in the `C` object in `index.tsx`.
- Use the `@/` import alias for `src/`.
- Nothing is persisted. If you add storage, use Netlify primitives (Netlify Database or Blobs).
