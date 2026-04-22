"""
PulseOps Python Agent
---------------------
Streams real host telemetry to PulseOps via POST /api/events using an API key.

Config via environment variables:
  PULSEOPS_URL           Base URL of the backend (default: http://localhost:8080)
  PULSEOPS_API_KEY       API key secret (required) — from the API Keys page
  PULSEOPS_SERVICE       Logical service name reported in events (required)
  PULSEOPS_ENV           Environment tag (default: production)
  PULSEOPS_INTERVAL      Seconds between sampling ticks (default: 5)
  PULSEOPS_CPU_WARN      CPU %% above which a WARNING event is emitted (default: 85)
  PULSEOPS_MEM_WARN      Memory %% above which a WARNING event is emitted (default: 90)
  PULSEOPS_DISK_WARN     Disk %% above which a WARNING event is emitted (default: 90)

Exits on SIGINT/SIGTERM. Retries failed POSTs with exponential backoff.
"""

from __future__ import annotations

import logging
import os
import signal
import socket
import sys
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import psutil
import requests

log = logging.getLogger("pulseops-agent")


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Config:
    url: str
    api_key: str
    service: str
    env: str
    interval: float
    cpu_warn: float
    mem_warn: float
    disk_warn: float
    host: str

    @staticmethod
    def from_env() -> "Config":
        url = os.environ.get("PULSEOPS_URL", "http://localhost:8080").rstrip("/")
        api_key = os.environ.get("PULSEOPS_API_KEY", "").strip()
        service = os.environ.get("PULSEOPS_SERVICE", "").strip()
        if not api_key:
            raise SystemExit("PULSEOPS_API_KEY is required")
        if not service:
            raise SystemExit("PULSEOPS_SERVICE is required")
        return Config(
            url=url,
            api_key=api_key,
            service=service,
            env=os.environ.get("PULSEOPS_ENV", "production"),
            interval=float(os.environ.get("PULSEOPS_INTERVAL", "5")),
            cpu_warn=float(os.environ.get("PULSEOPS_CPU_WARN", "85")),
            mem_warn=float(os.environ.get("PULSEOPS_MEM_WARN", "90")),
            disk_warn=float(os.environ.get("PULSEOPS_DISK_WARN", "90")),
            host=socket.gethostname(),
        )


# ---------------------------------------------------------------------------
# Publisher
# ---------------------------------------------------------------------------

class Publisher:
    """Posts events to /api/events with bounded exponential-backoff retry."""

    def __init__(self, cfg: Config, session: Optional[requests.Session] = None) -> None:
        self._cfg = cfg
        self._session = session or requests.Session()
        self._session.headers.update({
            "X-API-Key": cfg.api_key,
            "Content-Type": "application/json",
            "User-Agent": "pulseops-python-agent/1.0",
        })
        self._endpoint = f"{cfg.url}/api/events"

    def publish(self, event: Dict[str, Any]) -> bool:
        backoff = 1.0
        for attempt in range(4):
            try:
                r = self._session.post(self._endpoint, json=event, timeout=10)
                if 200 <= r.status_code < 300:
                    return True
                if r.status_code in (401, 403):
                    log.error("Auth rejected (%s). Check PULSEOPS_API_KEY.", r.status_code)
                    return False
                log.warning("ingest HTTP %s: %s", r.status_code, r.text[:200])
            except requests.RequestException as exc:
                log.warning("ingest failed (attempt %d): %s", attempt + 1, exc)
            time.sleep(backoff)
            backoff = min(backoff * 2, 10.0)
        return False


# ---------------------------------------------------------------------------
# Sampler
# ---------------------------------------------------------------------------

class Sampler:
    def __init__(self, cfg: Config) -> None:
        self._cfg = cfg
        psutil.cpu_percent(interval=None)  # prime the CPU sampler

    def sample(self) -> Dict[str, Any]:
        vm = psutil.virtual_memory()
        try:
            disk = psutil.disk_usage("/")
        except Exception:
            disk = psutil.disk_usage(os.path.abspath(os.sep))
        try:
            load1, load5, load15 = psutil.getloadavg()
        except (AttributeError, OSError):
            load1 = load5 = load15 = 0.0
        return {
            "cpu_percent": float(psutil.cpu_percent(interval=None)),
            "memory_percent": float(vm.percent),
            "memory_used_mb": int(vm.used / 1024 / 1024),
            "disk_percent": float(disk.percent),
            "disk_free_gb": round(disk.free / 1024 / 1024 / 1024, 2),
            "load_avg_1m": float(load1),
            "load_avg_5m": float(load5),
            "load_avg_15m": float(load15),
            "process_count": len(psutil.pids()),
            "boot_time": datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc).isoformat(),
        }


# ---------------------------------------------------------------------------
# Event construction
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def build_events(cfg: Config, snapshot: Dict[str, Any]) -> list[Dict[str, Any]]:
    """Convert a snapshot into one or more PulseOps events."""
    base_meta = {
        "env": cfg.env,
        "host": cfg.host,
        "runId": str(uuid.uuid4())[:8],
        **snapshot,
    }

    events: list[Dict[str, Any]] = [{
        "serviceName": cfg.service,
        "type": "METRIC",
        "severity": "INFO",
        "message": (
            f"host metrics cpu={snapshot['cpu_percent']:.1f}% "
            f"mem={snapshot['memory_percent']:.1f}% "
            f"disk={snapshot['disk_percent']:.1f}% "
            f"load1={snapshot['load_avg_1m']:.2f}"
        ),
        "metadata": base_meta,
        "timestamp": _now_iso(),
    }]

    if snapshot["cpu_percent"] >= cfg.cpu_warn:
        events.append({
            "serviceName": cfg.service,
            "type": "METRIC",
            "severity": "WARNING",
            "message": f"High CPU: {snapshot['cpu_percent']:.1f}%",
            "metadata": base_meta,
            "timestamp": _now_iso(),
        })
    if snapshot["memory_percent"] >= cfg.mem_warn:
        events.append({
            "serviceName": cfg.service,
            "type": "METRIC",
            "severity": "WARNING",
            "message": f"High memory: {snapshot['memory_percent']:.1f}%",
            "metadata": base_meta,
            "timestamp": _now_iso(),
        })
    if snapshot["disk_percent"] >= cfg.disk_warn:
        events.append({
            "serviceName": cfg.service,
            "type": "METRIC",
            "severity": "ERROR",
            "message": f"Disk nearly full: {snapshot['disk_percent']:.1f}%",
            "metadata": base_meta,
            "timestamp": _now_iso(),
        })
    return events


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

_stop = False


def _handle_signal(signum, _frame):
    global _stop
    log.info("received signal %s, shutting down", signum)
    _stop = True


def run() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    cfg = Config.from_env()
    log.info("PulseOps agent starting url=%s service=%s env=%s host=%s interval=%ss",
             cfg.url, cfg.service, cfg.env, cfg.host, cfg.interval)

    publisher = Publisher(cfg)
    sampler = Sampler(cfg)

    signal.signal(signal.SIGINT, _handle_signal)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _handle_signal)

    # Initial heartbeat so the service registers immediately
    publisher.publish({
        "serviceName": cfg.service,
        "type": "HEARTBEAT",
        "severity": "INFO",
        "message": "agent started",
        "metadata": {"env": cfg.env, "host": cfg.host},
        "timestamp": _now_iso(),
    })

    while not _stop:
        started = time.monotonic()
        try:
            snapshot = sampler.sample()
            for event in build_events(cfg, snapshot):
                publisher.publish(event)
        except Exception:
            log.exception("sampling tick failed")
        elapsed = time.monotonic() - started
        sleep_for = max(0.5, cfg.interval - elapsed)
        for _ in range(int(sleep_for * 10)):
            if _stop:
                break
            time.sleep(0.1)

    log.info("agent stopped")
    return 0


if __name__ == "__main__":
    sys.exit(run())
