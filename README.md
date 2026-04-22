# PulseOps — Real-Time Incident Detection & Alerting Platform

A production-grade, full-stack SaaS-style monitoring product. Ingest events from your services,
process them asynchronously through Kafka, detect anomalies in real time with Redis sliding
windows, and stream alerts to a live React dashboard over WebSockets.

```
              ┌────────────┐    ┌──────────┐    ┌──────────────────┐
   Services → │  REST API  │ →  │  Kafka   │ →  │  Event Consumer  │
              └────────────┘    └──────────┘    └────────┬─────────┘
                    │                                    │
                    │                                    ▼
                    │                          ┌──────────────────┐
                    │                          │  Redis (sliding  │
                    │                          │  window + dedup) │
                    │                          └────────┬─────────┘
                    │                                    │
                    │                                    ▼
                    │                          ┌──────────────────┐
                    │                          │  Alert Engine    │
                    │                          │  (Postgres + WS) │
                    │                          └────────┬─────────┘
                    ▼                                    │
            ┌──────────────────┐   STOMP / SockJS        │
            │  React Dashboard │  ◄──────────────────────┘
            └──────────────────┘
```

---

## Tech Stack

| Layer        | Tech |
|--------------|------|
| Backend      | Java 17, Spring Boot 3.3, Spring Security, Spring Data JPA, Spring Kafka, Spring WebSocket (STOMP) |
| Auth         | OAuth2 Resource Server pattern + custom **JWT** issuance, BCrypt, role-based (`ADMIN`, `USER`) |
| Messaging    | Apache Kafka (Confluent images) + Zookeeper |
| Storage      | PostgreSQL 16 |
| Cache / RT   | Redis 7 (sorted-sets for sliding windows, rate limiting, dedup) |
| Frontend     | React 18 + Vite, Tailwind CSS, Recharts, Axios, React Router, STOMP/SockJS |
| DevOps       | Docker + Docker Compose |

---

## Quick start (Docker Compose)

> Requires Docker 24+ and Docker Compose v2.

```bash
cp .env.example .env
docker compose up --build
```

Services:

| Component  | URL                              |
|------------|----------------------------------|
| Frontend   | http://localhost:5173            |
| Backend    | http://localhost:8080            |
| Health     | http://localhost:8080/actuator/health |
| Postgres   | `localhost:5432` (pulseops/pulseops) |
| Redis      | `localhost:6379`                 |
| Kafka      | `localhost:29092` (host listener)|

**Demo credentials** (auto-seeded on first boot):

```
admin@pulseops.io  /  Admin@12345    (ADMIN + USER)
```

A demo emitter publishes synthetic telemetry every 5 seconds so the dashboard
shows live charts and alerts immediately. Disable with
`PULSEOPS_DEMO_ENABLED=false`.

---

## Deploy (backend on Render)

Use the included **`render.yaml`** (Render **Blueprint**) or follow **`docs/RENDER.md`**: provision **PostgreSQL** on Render, set **Redis** (Render Key Value or Upstash `SPRING_DATA_REDIS_URL`), add a hosted **Kafka** (`KAFKA_BOOTSTRAP_SERVERS`), **`JWT_SECRET`**, and **CORS** for your frontend. The app listens on Render’s **`PORT`**.

---

## Project layout

```
PulseOps/
├── backend/                       # Spring Boot service
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/main/java/com/pulseops/
│       ├── PulseOpsApplication.java
│       ├── bootstrap/             # Demo seeder + synthetic event emitter
│       ├── config/                # Security, Kafka, Redis, WebSocket, Async
│       ├── controller/            # AuthController, EventController, AlertController, ...
│       ├── dto/                   # API DTOs (records)
│       ├── exception/             # ApiException + GlobalExceptionHandler
│       ├── kafka/                 # EventProducer, EventConsumer (retryable + DLT)
│       ├── model/                 # JPA entities + enums
│       ├── repository/            # Spring Data repositories
│       ├── security/              # JwtTokenProvider + JwtAuthFilter
│       ├── service/               # AuthService, EventService, AlertService,
│       │                          # RedisAnomalyService, MetricsService, ServiceHealthService
│       └── websocket/             # AlertBroadcaster (/topic/alerts)
│
├── frontend/                      # React dashboard
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx, App.jsx
│       ├── components/            # Sidebar, Topbar, OverviewCard, charts, AlertsTable, RealTimeFeed
│       ├── context/               # AuthContext (JWT, roles)
│       ├── hooks/                 # useAlertStream (STOMP/SockJS)
│       ├── pages/                 # Login, Register, Dashboard, Alerts, AlertDetail, Services
│       └── services/api/          # Axios + per-resource clients
│
├── docker-compose.yml
└── .env.example
```

---

## API summary

All endpoints under `/api/**` (except `/api/auth/**`) require a JWT
`Authorization: Bearer <token>`.

| Method | Path                            | Auth         | Purpose |
|--------|---------------------------------|--------------|---------|
| POST   | `/api/auth/register`            | public       | Register a new user (first user becomes ADMIN) |
| POST   | `/api/auth/login`               | public       | Exchange credentials for a JWT |
| POST   | `/api/events`                   | USER / ADMIN | Ingest a single event (rate-limited, async via Kafka) |
| GET    | `/api/alerts`                   | USER / ADMIN | Paginated, filterable alert list |
| GET    | `/api/alerts/{id}`              | USER / ADMIN | Alert detail |
| POST   | `/api/alerts/{id}/acknowledge`  | USER / ADMIN | Acknowledge alert |
| POST   | `/api/alerts/{id}/resolve`      | ADMIN        | Resolve alert |
| GET    | `/api/services`                 | USER / ADMIN | Service inventory + health |
| GET    | `/api/services/{name}`          | USER / ADMIN | Service detail |
| GET    | `/api/metrics`                  | USER / ADMIN | Dashboard summary (counts + time series) |
| WS     | `/ws` → `/topic/alerts`         | public WS    | Live alert stream (STOMP over SockJS) |

### Sample event ingestion

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pulseops.io","password":"Admin@12345"}' | jq -r .token)

curl -X POST http://localhost:8080/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceName": "checkout-service",
    "type": "ERROR",
    "severity": "CRITICAL",
    "message": "Database connection pool exhausted",
    "metadata": {"env":"production","host":"node-3"}
  }'
```

A burst of `ERROR`/`CRITICAL` events for the same service within the
sliding window (default 60 s, threshold 10) generates an `Alert`,
which is persisted in Postgres **and** broadcast over `/topic/alerts`
to every connected dashboard.

---

## Anomaly engine details

`RedisAnomalyService` uses three Redis primitives:

1. **Sliding window of error counts** — sorted-set per service keyed by
   epoch-millis. Old entries are trimmed each write. When `ZCARD ≥ threshold`,
   an alert is created (with a fingerprint lock to suppress duplicates for 2m).
2. **Per-service rate limiting** — sorted-set per identifier; rolling 1-minute
   window. Returns `429 Too Many Requests` when exceeded. Fail-open on Redis errors.
3. **Dedup** — `SET NX EX 5m` on an SHA-256 fingerprint of the event payload,
   ensuring at-most-once persistence even with Kafka retries.

Anomaly detection happens inside the Kafka consumer
(`EventConsumer → EventService.process`), which is wrapped with
`@RetryableTopic` (4 attempts, exponential backoff, automatic DLT) for
production-grade reliability.

---

## Security

- Stateless `SecurityFilterChain` with `JwtAuthFilter` placed before
  `UsernamePasswordAuthenticationFilter`.
- HS256 JWT signed with a 256-bit secret (`JWT_SECRET`).
  Tokens carry `email`, `name`, and `roles` claims; expiry default 24h.
- `@EnableMethodSecurity` enables `@PreAuthorize` on controllers
  (`hasAnyRole('USER','ADMIN')`, `hasRole('ADMIN')`).
- BCrypt password hashing (cost 12).
- Strict CORS allow-list, CSRF disabled (stateless API), all input
  validated with Bean Validation (`jakarta.validation`).
- SQL injection: only parameterised JPA / `@Query` with named params.
- Frontend stores token in `sessionStorage`; 401 responses force re-auth.

---

## Reliability

- Kafka producer: `acks=all`, `enable.idempotence=true`, retries=5.
- Kafka consumer: `@RetryableTopic` with exponential backoff and DLT;
  consumer-side dedup via Redis + DB unique index on `dedup_key`.
- Postgres unique constraint on `events.dedup_key` is the last line of
  defence — `DataIntegrityViolation` is caught and treated as duplicate.
- Global exception handler returns clean RFC-style `ApiError` payloads.
- All entities have indexes for the dashboard's hot queries
  (alerts by service / status / severity / time).

---

## Dashboard layout (screenshot description)

**Login (`/login`)** — split layout. Left panel: gradient brand hero
(navy → indigo) with a glowing PulseOps logomark, headline, and a
4-bullet feature list (`Kafka pipeline`, `Redis sliding-window`,
`WebSocket`, `JWT/RBAC`). Right panel: a compact card with email and
password inputs, a teal "Sign in" button, and a subtle "demo
credentials" footer.

**Dashboard (`/dashboard`)** — left sidebar with logo + nav items
(Dashboard / Alerts / Services). Top bar with user identity badge and
sign-out. Body:

- 4 **overview cards** (Total alerts, Active alerts, Services monitored,
  Resolved) — gradient backgrounds, large numerals, contextual hints.
- A 2-column section: left = **area chart** "Alerts over time (24h)"
  with a teal-to-transparent gradient fill; below it a **bar chart**
  "Alerts per service (24h)" with rotated x-labels and per-bar colors.
- Right = **Live alert feed** card with an animated green "live" pip,
  scrollable list of incoming alerts (severity badge + service +
  relative time).
- Bottom: **Recent alerts** table — columns: Severity, Service, Title
  (link), Status, Events, When; row hover highlight; "View all →"
  shortcut.

**Alerts (`/alerts`)** — Filter bar (service / severity / status) +
paginated table with the same row design.

**Alert Detail (`/alerts/:id`)** — Title block with severity & status
badges, action buttons ("Acknowledge", "Resolve" for ADMIN), full
description, key/value metadata grid (Created / Updated / Fingerprint /
Acknowledged by), and a vertical **timeline** showing creation and
status transitions with colored dots.

**Services (`/services`)** — Card grid. Each card shows the service icon
(green = healthy, rose = degraded), name, environment, two stat tiles
(Errors 15m, Errors/min), and a "last seen X ago" footer. Degraded
services pulse softly to draw attention.

The whole UI uses a dark slate palette with a teal/indigo brand accent,
Inter font, soft borders and shadows — visually similar to Datadog /
New Relic.

---

## Development workflow (without Docker)

```bash
# 1. Infra only
docker compose up postgres redis kafka zookeeper

# 2. Backend
cd backend
./mvnw spring-boot:run        # or: mvn spring-boot:run

# 3. Frontend
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api and /ws to :8080)
```

---

## License

MIT — provided as a reference architecture / portfolio implementation.
