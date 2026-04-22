# Cloudflare, load balancers, and production checks

## Rate limiting (implemented in app)

| Area | Mechanism | Default |
|------|------------|--------|
| `POST /api/events` (ingest) | Redis sliding window per `ingest:{serviceName}` | `pulseops.anomaly.rate-limit-per-minute` (e.g. 600) |
| `POST /api/auth/login` | Redis per client IP (see `ClientIp` + `CF-Connecting-IP` / `X-Forwarded-For`) | `pulseops.security.auth-login-attempts-per-minute` (30) |
| `POST /api/auth/register` | Same, key `auth:register:{ip}` | `pulseops.security.auth-register-attempts-per-minute` (10) |
| Over limit | HTTP 429 + `Retry-After: 60` (rolling 60s window) | |

If Redis is unavailable, event ingest and auth use **fail-open** for the rate limiter (see `RedisAnomalyService` logs) so the API stays up; tighten monitoring in production.

## Load balancers and real IP

- `server.forward-headers-strategy: framework` is set so `HttpServletRequest` and `ClientIp` work behind a proxy.
- `ClientIp` reads `CF-Connecting-IP`, then `X-Forwarded-For` (first hop), then `X-Real-IP`, then `remoteAddr`.

**Health check for the pool:** `GET /actuator/health` (unauthenticated; use a shallow check for LB).

## Cloudflare + CDN (typical pattern)

1. **Static UI (Vite `dist/`)**  
   - Put the SPA on **Cloudflare Pages** or **R2 + CDN**, or a worker in front of object storage.  
   - Cache: long TTL for `assets/*` (hashed filenames), **no cache** (or revalidate) for `index.html`.

2. **API** (`/api/*`)  
   - Route to your origin (VM, K8s, Fly.io, etc.) with **no CDN cache** (GET list endpoints would be wrong to cache as shared HTML).  
   - Use **WAF** + optional **Rate limiting rules** on Cloudflare as an extra layer (in addition to app limits).

3. **WebSockets** (`/ws`)  
   - Must be **proxied** with upgrade headers and **not** cached. Cloudflare **supports** WebSockets on proxied hostnames.  
   - Sticky sessions are **not** required for the STOMP *handshake* if you do not use session affinity (JWT is stateless). Multi-origin STOMP *broadcast* still needs a shared broker (Redis) if you scale multiple JVMs.

4. **CORS**  
   - Set `pulseops.cors.allowed-origins` to your real UI origin, e.g. `https://app.yourdomain.com` (comma-separated). Must match the browser origin exactly (scheme + host + port).

5. **Secrets**  
   - `JWT_SECRET`, DB URLs, and API keys only via **environment** / **Secrets** store, not in git.

## Pre-push / pre-deploy

- `frontend`: `npm run build`  
- `backend`: `mvn -DskipTests package` or `docker compose build backend`  
- Run integration smoke: login, alerts list, `POST /api/events` with API key, WebSocket to `/ws`.

## Issue fixed: API key event ingest

`EventController` must allow `SERVICE` (same as `SecurityConfig`); that alignment is required for `X-API-Key` ingestion to work with `@PreAuthorize`.
