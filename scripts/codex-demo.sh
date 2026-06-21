#!/usr/bin/env bash
set -euo pipefail

reset=false
check=false

usage() {
  cat <<'EOF'
Usage: scripts/codex-demo.sh [--reset] [--check]

Starts the local oXRM Docker stack, runs migrations, seeds the synthetic Codex
demo, runs smoke tests, and prints local URLs.

Options:
  --reset    Delete the local demo containers and Docker volumes before seeding
  --check    Also verify the core MCP demo reads after the stack is ready
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --reset)
      reset=true
      ;;
    --check)
      check=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

echo "Starting oXRM Codex demo..."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for this demo."
  exit 1
fi

if [[ "$reset" == true ]]; then
  ./oxrm reset
fi

./oxrm start
./oxrm ready
./oxrm demo codex-demo
./oxrm test

if [[ "$check" == true ]]; then
  ./oxrm cli health >/dev/null
  queue_file="$(mktemp)"
  founder_file="$(mktemp)"
  applications_file="$(mktemp)"
  trap 'rm -f "$queue_file" "$founder_file" "$applications_file"' EXIT

  ./oxrm cli mcp:read crm://queue/today >"$queue_file"
  ./oxrm cli mcp:call crm.search_leads --input '{"query":"founder"}' >"$founder_file"
  ./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.applications"}' >"$applications_file"

  QUEUE_FILE="$queue_file" FOUNDER_FILE="$founder_file" APPLICATIONS_FILE="$applications_file" node <<'NODE'
const fs = require("node:fs");

function payload(path) {
  const raw = JSON.parse(fs.readFileSync(path, "utf8"));
  const text = raw.content?.[0]?.text ?? raw.contents?.[0]?.text;
  return text ? JSON.parse(text) : raw;
}

function count(value) {
  if (Array.isArray(value)) return value.length;
  if (Array.isArray(value.rows)) return value.rows.length;
  if (Array.isArray(value.items)) return value.items.length;
  if (Number.isFinite(value.total)) return value.total;
  return 0;
}

const checks = {
  todayQueue: count(payload(process.env.QUEUE_FILE)),
  founderLeads: count(payload(process.env.FOUNDER_FILE)),
  jobApplications: count(payload(process.env.APPLICATIONS_FILE))
};

const failures = Object.entries(checks)
  .filter(([, value]) => value < 1)
  .map(([key]) => key);

if (failures.length > 0) {
  console.error(JSON.stringify({ error: "codex_demo_check_failed", checks, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: "ok", checks }, null, 2));
NODE
fi

./oxrm urls

echo ""
echo "oXRM demo is ready."
echo ""
echo "Try:"
echo "  ./oxrm cli health"
echo "  ./oxrm cli mcp:read crm://queue/today"
echo "  ./oxrm cli mcp:call crm.search_leads --input '{\"query\":\"founder\"}'"
echo "  ./oxrm cli mcp:call xrm.run_view --input '{\"key\":\"job_search.applications\"}'"
echo ""
echo "For a job-search demo instead, run:"
echo "  ./oxrm seed job-search"
echo ""
echo "Open the Web URL printed above."
