# PulseOps Agents (drop-in)

Two ready-to-run agents that stream real host telemetry — CPU, memory, disk,
load average, event-loop lag, etc. — into PulseOps over `POST /api/events`
using an API key.

- `python-agent/` — based on [psutil](https://psutil.readthedocs.io/)
- `node-agent/`   — zero-dependency, Node 18+ (uses built-in `fetch` and `os`)

Both:

- Authenticate with the `X-API-Key` header (no JWT login, no refresh).
- Emit a `HEARTBEAT` on start so the service appears immediately.
- Emit an `INFO` `METRIC` every tick with a full metadata payload.
- Emit `WARNING`/`ERROR` events when thresholds are exceeded — these flow
  through the Kafka + Redis pipeline and trigger real alerts on your dashboard.
- Retry with bounded exponential backoff on transient failures.
- Stop cleanly on `Ctrl+C` / `SIGTERM`.

---

## 0. Get an API key (once)

1. Log in as an admin at [http://localhost:5173](http://localhost:5173).
2. Go to **API Keys** in the sidebar.
3. Click **Create key** — copy the shown secret immediately (it's only shown once).

All examples below assume you've exported:

```bash
# bash / zsh
export PULSEOPS_URL="http://localhost:8080"
export PULSEOPS_API_KEY="pulseops_YOUR_SECRET_HERE"
export PULSEOPS_SERVICE="my-service"
export PULSEOPS_ENV="production"
```

```powershell
# PowerShell
$env:PULSEOPS_URL="http://localhost:8080"
$env:PULSEOPS_API_KEY="pulseops_YOUR_SECRET_HERE"
$env:PULSEOPS_SERVICE="my-service"
$env:PULSEOPS_ENV="production"
```

---

## 1. Python agent

Requires **Python 3.9+**.

```bash
cd examples/python-agent
python -m venv .venv
# Linux / macOS:
source .venv/bin/activate
# Windows:
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
python agent.py
```

You'll see output like:

```
2026-04-20 18:05:12,301 INFO  pulseops-agent PulseOps agent starting url=http://localhost:8080 service=my-service env=production host=laptop-01 interval=5.0s
```

Switch to your dashboard — within a few seconds the **Services** page shows
`my-service` as healthy, and metrics start flowing.

Tune thresholds:

```bash
export PULSEOPS_INTERVAL=2
export PULSEOPS_CPU_WARN=70
export PULSEOPS_MEM_WARN=80
export PULSEOPS_DISK_WARN=85
```

---

## 2. Node.js agent

Requires **Node 18+** (for global `fetch`).

```bash
cd examples/node-agent
node agent.mjs
```

(That's it — zero dependencies. `package.json` is only there to declare the
entry point and to help your editor.)

Optional:

```bash
node --check agent.mjs   # static syntax check
npm start                # same as `node agent.mjs`
```

---

## 3. Trigger a real alert to sanity-check

Hold the CPU busy for ~30 seconds and you'll see PulseOps open an
**Error spike detected** alert on the dashboard's live feed.

```bash
# Linux / macOS:
yes > /dev/null &

# Windows PowerShell:
powershell -Command "while ($true) {}"
```

Kill the busy loop (`kill %1` or `Ctrl+C`) and the alert's event-rate calms
down on the next sampling tick.

---

## 4. Run inside Docker (optional)

```bash
# Python
docker run --rm -it \
  -e PULSEOPS_URL=http://host.docker.internal:8080 \
  -e PULSEOPS_API_KEY=pulseops_YOUR_SECRET_HERE \
  -e PULSEOPS_SERVICE=docker-host \
  -v "$PWD/examples/python-agent:/app" -w /app \
  python:3.12-slim bash -lc "pip install -r requirements.txt && python agent.py"

# Node.js
docker run --rm -it \
  -e PULSEOPS_URL=http://host.docker.internal:8080 \
  -e PULSEOPS_API_KEY=pulseops_YOUR_SECRET_HERE \
  -e PULSEOPS_SERVICE=docker-host \
  -v "$PWD/examples/node-agent:/app" -w /app \
  node:20-alpine node agent.mjs
```

On Linux add `--add-host=host.docker.internal:host-gateway` if the alias
isn't resolved by your Docker engine.

---

## Event schema

Both agents send bodies that match the backend's `EventDto`:

```jsonc
{
  "serviceName": "my-service",
  "type":        "METRIC",          // LOG | METRIC | ERROR | HEARTBEAT
  "severity":    "INFO",            // INFO | WARNING | ERROR | CRITICAL
  "message":     "host metrics cpu=12.3% mem=56.7% ...",
  "metadata": {
    "env": "production",
    "host": "laptop-01",
    "cpu_percent": 12.3,
    "memory_percent": 56.7,
    "load_avg_1m": 0.45,
    "…": "…"
  },
  "timestamp": "2026-04-20T18:05:12.301Z"
}
```

The backend rate-limits per service at `pulseops.anomaly.rate-limit-per-minute`
(default `600`), deduplicates identical events within a 5-minute window, and
raises alerts when the sliding window threshold is crossed. Adjust those knobs
in `backend/src/main/resources/application.yml` to match your real traffic.
