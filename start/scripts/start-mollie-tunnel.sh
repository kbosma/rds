#!/usr/bin/env bash
#
# start-mollie-tunnel.sh
#
# Start een Cloudflare quick-tunnel naar de lokale backend, zodat Mollie's
# webhook je laptop kan bereiken tijdens lokaal testen. Print de publieke URL
# en de volledige webhook-URL, inclusief waar die in de config hoort.
#
# Gebruik:  start/scripts/start-mollie-tunnel.sh [poort]   (default poort 8666)
# Stoppen:  start/scripts/stop-mollie-tunnel.sh
#
set -euo pipefail

PORT="${1:-8666}"
TARGET="http://127.0.0.1:${PORT}"
CONTEXT_PATH="/rds"                                   # Spring server.servlet.context-path
WEBHOOK_PATH="${CONTEXT_PATH}/api/mollie/payments/webhook"
CONFIG_FILE="src/main/resources/application-rds-local.yaml"

PID_FILE="${TMPDIR:-/tmp}/rds-mollie-tunnel.pid"
LOG_FILE="${TMPDIR:-/tmp}/rds-mollie-tunnel.log"

# 1. cloudflared aanwezig?
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "FOUT: cloudflared is niet geïnstalleerd. Installeer met:  brew install cloudflared" >&2
  exit 1
fi

# 2. draait er al een tunnel?
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE" 2>/dev/null)" 2>/dev/null; then
  echo "Er draait al een tunnel (PID $(cat "$PID_FILE")). Stop die eerst met stop-mollie-tunnel.sh." >&2
  exit 1
fi

# 3. backend bereikbaar? (waarschuwing, geen harde stop — cloudflared kan ook vóór de backend starten)
if ! nc -z -G 2 127.0.0.1 "$PORT" >/dev/null 2>&1; then
  echo "Waarschuwing: er luistert niets op ${TARGET}. Start je backend (de tunnel wacht wel)." >&2
fi

# 4. start de tunnel op de achtergrond (nohup: overleeft het afsluiten van dit script)
: > "$LOG_FILE"
nohup cloudflared tunnel --url "$TARGET" > "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!
echo "$TUNNEL_PID" > "$PID_FILE"

# 5. wacht tot de trycloudflare-URL verschijnt
URL=""
for _ in $(seq 1 30); do
  URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$LOG_FILE" 2>/dev/null | head -1 || true)
  [ -n "$URL" ] && break
  if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    echo "FOUT: cloudflared is onverwacht gestopt. Zie $LOG_FILE" >&2
    rm -f "$PID_FILE"
    exit 1
  fi
  sleep 1
done

if [ -z "$URL" ]; then
  echo "FOUT: kon de tunnel-URL niet bepalen binnen de tijd. Zie $LOG_FILE" >&2
  exit 1
fi

WEBHOOK_URL="${URL}${WEBHOOK_PATH}"

# 6. rapporteer
cat <<EOF

✅ Cloudflare-tunnel actief (PID ${TUNNEL_PID})  ->  ${TARGET}

   Publieke URL : ${URL}
   Webhook-URL  : ${WEBHOOK_URL}

➜ Zet de webhook-URL in je lokale config:

   Bestand : ${CONFIG_FILE}
   Pad     : app.mollie.urls.webhook

     app:
       mollie:
         urls:
           webhook: ${WEBHOOK_URL}

   Herstart daarna de backend, zodat de nieuwe webhook-URL geladen wordt.
   (De tunnel-URL is wegwerp en verandert bij elke (her)start — dit bestand niet committen.)

Stoppen:  start/scripts/stop-mollie-tunnel.sh
Log:      ${LOG_FILE}

EOF
