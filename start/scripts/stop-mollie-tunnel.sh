#!/usr/bin/env bash
#
# stop-mollie-tunnel.sh
#
# Stopt de Cloudflare quick-tunnel die met start-mollie-tunnel.sh is gestart.
# Gebruikt het PID-bestand; valt terug op een patroon-match voor een
# verweesde tunnel (bijv. handmatig gestart).
#
set -uo pipefail

PID_FILE="${TMPDIR:-/tmp}/rds-mollie-tunnel.pid"
stopped=0

terminate() {
  local pid="$1"
  kill -TERM "$pid" 2>/dev/null || true
  for _ in $(seq 1 10); do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.5
  done
  kill -KILL "$pid" 2>/dev/null || true
}

# 1. primair: via het PID-bestand
if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${PID:-}" ] && kill -0 "$PID" 2>/dev/null; then
    terminate "$PID"
    echo "Tunnel gestopt (PID ${PID})."
    stopped=1
  else
    echo "PID-bestand gevonden, maar dat proces draait niet meer."
  fi
  rm -f "$PID_FILE"
fi

# 2. fallback: verweesde quick-tunnel naar loopback
if [ "$stopped" -eq 0 ]; then
  if pgrep -f "cloudflared tunnel --url http://127.0.0.1" >/dev/null 2>&1; then
    pkill -f "cloudflared tunnel --url http://127.0.0.1" 2>/dev/null || true
    echo "Verweesde Cloudflare-tunnel(s) gestopt via patroon-match."
    stopped=1
  fi
fi

[ "$stopped" -eq 0 ] && echo "Geen actieve Mollie-tunnel gevonden."
exit 0
