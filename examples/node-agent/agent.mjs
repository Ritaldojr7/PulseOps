#!/usr/bin/env node
/**
 * PulseOps Node.js Agent
 * ----------------------
 * Streams real host telemetry to PulseOps via POST /api/events using an API key.
 * Zero-dependency (uses built-in `fetch`, `os`, `fs`) — Node >= 18.
 *
 * Config via environment variables:
 *   PULSEOPS_URL          Base URL of the backend (default: http://localhost:8080)
 *   PULSEOPS_API_KEY      API key secret (required) — from the API Keys page
 *   PULSEOPS_SERVICE      Logical service name reported in events (required)
 *   PULSEOPS_ENV          Environment tag (default: production)
 *   PULSEOPS_INTERVAL     Seconds between sampling ticks (default: 5)
 *   PULSEOPS_CPU_WARN     CPU % above which a WARNING event is emitted (default: 85)
 *   PULSEOPS_MEM_WARN     Memory % above which a WARNING event is emitted (default: 90)
 */

import os from 'node:os';
import { hostname } from 'node:os';
import process from 'node:process';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function loadConfig() {
  const apiKey = (process.env.PULSEOPS_API_KEY || '').trim();
  const service = (process.env.PULSEOPS_SERVICE || '').trim();
  if (!apiKey) { console.error('PULSEOPS_API_KEY is required'); process.exit(1); }
  if (!service) { console.error('PULSEOPS_SERVICE is required'); process.exit(1); }
  return Object.freeze({
    url: (process.env.PULSEOPS_URL || 'http://localhost:8080').replace(/\/+$/, ''),
    apiKey,
    service,
    env: process.env.PULSEOPS_ENV || 'production',
    interval: Math.max(1, Number(process.env.PULSEOPS_INTERVAL || 5)),
    cpuWarn: Number(process.env.PULSEOPS_CPU_WARN || 85),
    memWarn: Number(process.env.PULSEOPS_MEM_WARN || 90),
    host: hostname(),
  });
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

let prevCpu = snapshotCpuTimes();

function snapshotCpuTimes() {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    for (const t of Object.values(cpu.times)) total += t;
    idle += cpu.times.idle;
  }
  return { idle, total };
}

function sampleCpuPercent() {
  const now = snapshotCpuTimes();
  const idleDiff = now.idle - prevCpu.idle;
  const totalDiff = now.total - prevCpu.total;
  prevCpu = now;
  if (totalDiff <= 0) return 0;
  return Math.max(0, Math.min(100, (1 - idleDiff / totalDiff) * 100));
}

function sampleHost() {
  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  const usedMem  = totalMem - freeMem;
  const memPct   = (usedMem / totalMem) * 100;
  const load     = typeof os.loadavg === 'function' ? os.loadavg() : [0, 0, 0];
  const eventLoopLag = sampleEventLoopLag();

  return {
    cpu_percent: +sampleCpuPercent().toFixed(2),
    memory_percent: +memPct.toFixed(2),
    memory_used_mb: Math.round(usedMem / 1024 / 1024),
    memory_total_mb: Math.round(totalMem / 1024 / 1024),
    load_avg_1m: +load[0].toFixed(2),
    load_avg_5m: +load[1].toFixed(2),
    load_avg_15m: +load[2].toFixed(2),
    uptime_seconds: Math.round(os.uptime()),
    process_rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    node_version: process.version,
    platform: `${os.platform()} ${os.release()}`,
    event_loop_lag_ms: eventLoopLag,
  };
}

// Event loop lag: schedule a timeout and see how late it actually fired.
let lastLag = 0;
function sampleEventLoopLag() {
  const now = process.hrtime.bigint();
  setImmediate(() => {
    const delta = Number(process.hrtime.bigint() - now) / 1e6;
    lastLag = +delta.toFixed(2);
  });
  return lastLag;
}

// ---------------------------------------------------------------------------
// Publisher
// ---------------------------------------------------------------------------

async function publish(cfg, event) {
  const endpoint = `${cfg.url}/api/events`;
  let backoff = 1000;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key': cfg.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'pulseops-node-agent/1.0',
        },
        body: JSON.stringify(event),
      });
      if (res.ok) return true;
      if (res.status === 401 || res.status === 403) {
        console.error(`auth rejected (${res.status}). Check PULSEOPS_API_KEY.`);
        return false;
      }
      const body = await res.text();
      console.warn(`ingest HTTP ${res.status}: ${body.slice(0, 200)}`);
    } catch (err) {
      console.warn(`ingest failed (attempt ${attempt + 1}): ${err?.message || err}`);
    }
    await sleep(backoff);
    backoff = Math.min(backoff * 2, 10_000);
  }
  return false;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Event construction
// ---------------------------------------------------------------------------

function nowIso() { return new Date().toISOString(); }

function buildEvents(cfg, snap) {
  const meta = {
    env: cfg.env,
    host: cfg.host,
    runId: randomUUID().slice(0, 8),
    ...snap,
  };

  const events = [{
    serviceName: cfg.service,
    type: 'METRIC',
    severity: 'INFO',
    message: `host metrics cpu=${snap.cpu_percent}% mem=${snap.memory_percent}% load1=${snap.load_avg_1m}`,
    metadata: meta,
    timestamp: nowIso(),
  }];

  if (snap.cpu_percent >= cfg.cpuWarn) {
    events.push({
      serviceName: cfg.service,
      type: 'METRIC',
      severity: 'WARNING',
      message: `High CPU: ${snap.cpu_percent}%`,
      metadata: meta,
      timestamp: nowIso(),
    });
  }
  if (snap.memory_percent >= cfg.memWarn) {
    events.push({
      serviceName: cfg.service,
      type: 'METRIC',
      severity: 'WARNING',
      message: `High memory: ${snap.memory_percent}%`,
      metadata: meta,
      timestamp: nowIso(),
    });
  }
  if (snap.event_loop_lag_ms > 150) {
    events.push({
      serviceName: cfg.service,
      type: 'METRIC',
      severity: 'ERROR',
      message: `Event loop lag ${snap.event_loop_lag_ms}ms`,
      metadata: meta,
      timestamp: nowIso(),
    });
  }
  return events;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let stopping = false;
function handleSignal(sig) {
  console.log(`received ${sig}, shutting down`);
  stopping = true;
}
process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

async function main() {
  const cfg = loadConfig();
  console.log(
    `[pulseops-agent] starting url=${cfg.url} service=${cfg.service} env=${cfg.env} host=${cfg.host} interval=${cfg.interval}s`
  );

  // initial heartbeat so the service registers
  await publish(cfg, {
    serviceName: cfg.service,
    type: 'HEARTBEAT',
    severity: 'INFO',
    message: 'agent started',
    metadata: { env: cfg.env, host: cfg.host },
    timestamp: nowIso(),
  });

  // prime CPU sampler and event loop lag
  sampleCpuPercent();
  sampleEventLoopLag();
  await sleep(1000);

  while (!stopping) {
    const started = Date.now();
    try {
      const snapshot = sampleHost();
      for (const event of buildEvents(cfg, snapshot)) {
        await publish(cfg, event);
      }
    } catch (err) {
      console.error('sampling tick failed:', err);
    }
    const elapsed = (Date.now() - started) / 1000;
    const sleepFor = Math.max(0.5, cfg.interval - elapsed);
    const deadline = Date.now() + sleepFor * 1000;
    while (!stopping && Date.now() < deadline) {
      await sleep(100);
    }
  }
  console.log('[pulseops-agent] stopped');
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
