#!/bin/bash
# ==========================================
# Daily Scrape & Aggregate
# Starts dev server, runs scrape + aggregation, then stops.
# Usage: bash scripts/daily-scrape.sh
# ==========================================

set -e
cd "$(dirname "$0")/.."

# Load env vars
set -a
source .env
set +a

LOG_FILE="scripts/scrape.log"
echo "[$(date)] Starting daily scrape..." | tee -a "$LOG_FILE"

# Start dev server in background
npm run dev > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to be ready (max 30 seconds)
TRIES=0
until curl -s http://localhost:3000 > /dev/null 2>&1; do
  sleep 1
  TRIES=$((TRIES + 1))
  if [ $TRIES -ge 30 ]; then
    echo "[$(date)] ERROR: Dev server failed to start" | tee -a "$LOG_FILE"
    kill $SERVER_PID 2>/dev/null
    exit 1
  fi
done

echo "[$(date)] Dev server ready, running scrape..." | tee -a "$LOG_FILE"

# Run scrape
SCRAPE_RESULT=$(curl -s -X POST http://localhost:3000/api/cron/scrape-prices \
  -H "Authorization: Bearer $CRON_SECRET")
echo "[$(date)] Scrape result: $SCRAPE_RESULT" | tee -a "$LOG_FILE"

# Run aggregation
AGG_RESULT=$(curl -s -X POST http://localhost:3000/api/cron/aggregate-prices \
  -H "Authorization: Bearer $CRON_SECRET")
echo "[$(date)] Aggregation result: $AGG_RESULT" | tee -a "$LOG_FILE"

# Stop server
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "[$(date)] Done." | tee -a "$LOG_FILE"
