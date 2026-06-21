# Whatta Cup — Restaurant Management Dashboard

A web-based restaurant management system for day-to-day operations.

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (running locally or a remote URI)
- npm

### Backend

```bash
cd backend
cp .env.example .env        # edit .env with your MongoDB URI
npm install
npm run dev                 # starts on http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env        # edit if backend runs on a different port
npm install
npm run dev                 # starts on http://localhost:3000
```

### Running both concurrently

Open two terminals, one for each service. Or use a tool like `concurrently`:

```bash
npm install -g concurrently
concurrently "cd backend && npm run dev" "cd frontend && npm run dev"
```

## Verification

1. Open http://localhost:3000 — the public Home Page should render.
2. Click **Admin Login** — navigates to `/login`.
3. The footer shows a green "Connected" indicator when the backend is reachable.
4. Direct API check: `curl http://localhost:4000/api/v1/health`

## Project Structure

```
frontend/         — Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
backend/          — Node.js + Express + TypeScript + Mongo (Mongoose)
docs/             — PRD, architecture, database design, API contracts, theme, AI rules
tasks/            — Backlog and current task
prompts/          — Prompt templates
```
