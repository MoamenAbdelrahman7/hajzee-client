## Setup

1) Install dependencies

```bash
npm install
```

2) Create `.env` with:

```bash
VITE_API_URL=https://hajzee-server-production.up.railway.app
```

3) Run locally

```bash
npm run dev
```

## Deploy to Vercel

- Framework preset: Vite + React
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL` (same value as above)

`vercel.json` is included to handle SPA routes and static assets under `/icons` and `/images`.
