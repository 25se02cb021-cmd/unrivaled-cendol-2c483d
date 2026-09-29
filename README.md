# Pulse — Live Metrics Dashboard

A web page with dynamic content and charts. Every few seconds the page asks the server for fresh metrics (active users, request volume, error rate, latency, regional traffic, and an activity feed) and the charts animate to the new values. You can switch the time range (1h / 24h / 7d), pause or resume live updates, and force a refresh.

## Tech

- TanStack Start (React 19, file-based routing, server functions)
- Chart.js with react-chartjs-2
- Tailwind CSS 4
- Deployed on Netlify (server functions run as Netlify Functions)

## Run locally

```bash
pnpm install
netlify dev   # or: pnpm dev
```

## How the data works

`src/server/metrics.functions.ts` generates realistic, time-anchored metrics on the server. To show real data, replace the body of the `getMetrics` handler with calls to your own API or database. The response shape (`MetricsPayload`) is what the page renders.
