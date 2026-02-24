# Helm

**An observability dashboard for [OpenClaw](https://openclaw.ai) — see inside your agent, not just that it's running.**

![Helm Dashboard](public/screenshot.png)

---

## Why this exists

OpenClaw ships with a gateway management UI. It's great for checking that the gateway is alive, viewing connected sessions, and tweaking configuration. But it doesn't answer the questions you actually have when running an AI agent day-to-day:

- What's in my agent's memory right now?
- Which skills are loaded — and which are disabled?
- What cron jobs are scheduled, and when do they next fire?
- Why is this message stuck in the delivery queue?
- Which credentials are missing or broken?

Helm is the UI that answers those questions. It reads directly from your OpenClaw workspace and gateway to show **real system state** — no demo data, no placeholders, no stubs. If your agent has 214 memories, you see 214. If a delivery queue message is stuck, you can see the error and remove it.

Think of it as the difference between knowing your ship is running and actually standing at the helm.

---

## Features

- **10 system views** — Agents, Channels, Credentials, Delivery Queue, Memory, Models, Nodes, Scheduled Jobs, Skills, Workspaces
- **Real data only** — reads from `~/.openclaw/` filesystem and gateway API
- **⌘K command palette** — jump anywhere instantly
- **Theme colors** — 8 accent options, persisted to localStorage
- **Dark mode** — follows OS preference
- **Mobile-friendly** — collapsible sidebar, touch-optimized
- **Actionable** — delete delivery queue messages, inspect memory entries, explore skill configs
- **Extensible** — add your own pages under `pages/custom/`

### Pages

| Page | What it shows |
|------|---------------|
| **Dashboard** | Live count tiles for all sections |
| **Agents** | Configured agents, bindings, session counts |
| **Channels** | Telegram, WhatsApp, etc. — enabled status, group policies |
| **Credentials** | API keys and token files — present / missing / empty |
| **Delivery Queue** | Stuck outbound messages with error details; deletable |
| **Memory** | All memory files with full content viewer |
| **Models** | Configured LLMs with cost, speed, and usage linkage |
| **Nodes** | Paired hardware nodes — last seen, platform, role |
| **Scheduled** | Cron jobs + LaunchAgents — next run times, status |
| **Skills** | All skills (custom / extension / built-in) with config detail |
| **Workspaces** | Agent workspaces and their files |

---

## Prerequisites

- [OpenClaw](https://openclaw.ai) installed and running (`openclaw gateway start`)
- Node.js 18+
- [pnpm](https://pnpm.io) (`npm install -g pnpm`)

---

## Setup

```bash
# 1. Clone
git clone https://github.com/michellzappa/helm
cd helm

# 2. Install dependencies
pnpm install

# 3. Configure
cp .env.local.example .env.local
# Edit .env.local — set GATEWAY_URL and GATEWAY_TOKEN

# 4. Run
pnpm dev
```

Open [http://localhost:1111](http://localhost:1111).

> **Finding your gateway token:** `cat ~/.openclaw/openclaw.json | grep token`

---

## Configuration

### `.env.local`

| Variable | Default | Description |
|----------|---------|-------------|
| `GATEWAY_URL` | `http://127.0.0.1:18789` | OpenClaw gateway address |
| `GATEWAY_TOKEN` | — | Gateway auth token (from `openclaw.json`) |
| `WORKSPACE_PATH` | `~/.openclaw/workspace` | Path to your agent workspace |

### `config/models.json`

Edit this file to reflect the LLMs you actually use. The Models page reads from it — no database, no API. See the included file for the schema.

### Custom pages

Drop any `.tsx` file into `pages/custom/` — it'll be available at `/custom/your-page`. The `pages/custom/tasks.tsx` file included in the repo is a starting point.

---

## Auto-start (macOS)

To have Helm launch automatically at login:

```bash
# Copy and edit the example plist
cp launchagent.example.plist ~/Library/LaunchAgents/com.yourname.helm.plist
# Replace INSTALL_PATH with your actual path
nano ~/Library/LaunchAgents/com.yourname.helm.plist

# Load it
launchctl load ~/Library/LaunchAgents/com.yourname.helm.plist
```

The default port is `1111`. Override with `MC_PORT=3000 pnpm dev` or set `MC_PORT` in the LaunchAgent's `EnvironmentVariables`.

---

## Stack

- [Next.js](https://nextjs.org) 16 (Pages Router)
- [shadcn/ui](https://ui.shadcn.com) components
- [Tailwind CSS](https://tailwindcss.com) v4
- [Lucide](https://lucide.dev) icons
- [cmdk](https://cmdk.dev) for the command palette
- [croner](https://github.com/Hexagon/croner) for next-run time calculation

Everything is stateless — no database, no auth, no build step needed beyond `pnpm dev`.

---

## Contributing

PRs welcome. A few principles to keep in mind:

- **No demo data.** Every page should show real system state or an honest empty state.
- **No new dependencies** unless genuinely necessary — the stack is intentionally small.
- **Pages are standalone** — each page + its API route(s) should be self-contained and not depend on other pages' logic.

See `pages/memory.tsx` + `pages/api/memories.ts` as a reference implementation.

---

## License

MIT — see [LICENSE](LICENSE).
