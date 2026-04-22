# Deploy the PulseOps backend on Render

The API is a **Spring Boot** app in `backend/`. It needs **PostgreSQL**, **Redis**, and **Kafka** (Render does not include Kafka; use a hosted provider).

## Option A — Blueprint (fastest)

1. Push this repo to GitHub (e.g. `Ritaldojr7/PulseOps`).
2. [Render](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the repo, apply `render.yaml` from the default branch.
4. After the first failed/successful deploy, open the **web service** → **Environment** and set:
   - **`JWT_SECRET`** — long random string (32+ bytes).
   - **`KAFKA_BOOTSTRAP_SERVERS`** — your Kafka bootstrap string (e.g. from [Confluent Cloud](https://www.confluent.io/confluent-cloud/) free trial, [Aiven](https://aiven.io/), or similar; format `host:9092` or `host1:9092,host2:9092` per your provider).
5. **Redis** — pick one:
   - **Render Key Value (Redis):** create in the same account, then set `REDIS_HOST` and `REDIS_PORT` from the instance’s “Internal” connection info; **or**
   - **Upstash (Redis):** create a database, set **`SPRING_DATA_REDIS_URL`** to the `rediss://…` URL (TLS). Host/port in `application.yml` are then ignored.
6. **CORS** — set **`PULSEOPS_CORS_ALLOWED_ORIGINS`** to your real UI origins, comma-separated, e.g.  
   `https://pulseops.pages.dev,https://www.yourdomain.com` (no space after comma).

Redeploy after changing env.

## Option B — Manual Web Service (Docker)

1. **New** → **Web Service** → connect repo.
2. **Root directory:** `backend`  
3. **Runtime:** **Docker** (uses `backend/Dockerfile`).  
4. **Create PostgreSQL** in Render and link env vars, or set `JDBC_URL` / `POSTGRES_*` as in `application.yml`.
5. Add env vars as in Option A (Kafka, Redis, JWT, CORS).
6. **Health check path:** `/actuator/health`  
7. **Plan:** free tier is OK for demos; free web services **spin down** after inactivity and cold-start on the next request.

## Required environment variables (production)

| Variable | Example / note |
|----------|----------------|
| `PORT` | Set by Render; app reads `PORT` (see `application.yml`). |
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | From Render Postgres, or a single `JDBC_URL` (Supabase, etc.) |
| `POSTGRES_JDBC_PARAMS` | `?sslmode=require` for Render Postgres over TLS. |
| `KAFKA_BOOTSTRAP_SERVERS` | From your Kafka host (required for event pipeline). |
| `JWT_SECRET` | Strong secret; not the default. |
| Redis | `REDIS_HOST` + `REDIS_PORT`, or **`SPRING_DATA_REDIS_URL`**. |
| `PULSEOPS_CORS_ALLOWED_ORIGINS` | Your frontend’s public URL(s), comma-separated. |

Optional tuning: `pulseops.anomaly.rate-limit-per-minute`, `pulseops.security.*` in env or add to `application.yml` profiles (advanced).

## Point the frontend at Render

1. In Cloudflare Pages (or your static host), set **build-time**:
   - `VITE_API_BASE_URL=https://pulseops-backend.onrender.com/api`  
     (use your service’s **onrender.com** URL + `/api`).
2. Rebuild the frontend. Same origin is not required; CORS must list the site origin.
3. WebSockets: use the same public host, path `/ws` — ensure the UI uses `VITE_WS_BASE_URL` or same origin if you put the API and WS under one host.

## Common issues

- **Build fails:** confirm **Root directory** is `backend` and **Docker** build is selected.
- **App crashes on start:** almost always **missing** `KAFKA_BOOTSTRAP_SERVERS` or **Redis** not reachable; check logs.
- **Browser CORS errors:** `PULSEOPS_CORS_ALLOWED_ORIGINS` must match the page origin exactly.
- **401 on API:** `JWT_SECRET` must not change between token issue and verify; align all instances if you scale.

## Security

- Do not commit `JWT_SECRET` or DB passwords; use Render **secret** env vars.
- Keep `PULSEOPS_DEMO` / demo flags off in production if you add such a switch (see `DemoDataBootstrap`).
