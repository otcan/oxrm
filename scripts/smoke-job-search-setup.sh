#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

./oxrm ready >/dev/null

./oxrm cli setup:job-search >"$tmp_dir/configured.json"
node -e '
  const fs = require("node:fs");
  const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const fail = (error, extra = {}) => {
    console.error(JSON.stringify({ error, ...extra }, null, 2));
    process.exit(1);
  };
  if (!data.configured) fail("job_search_setup_not_configured", { gaps: data.gaps });
  if (!Array.isArray(data.sources) || data.sources.length < 1) fail("job_search_setup_missing_sources");
  if (!Array.isArray(data.timers) || data.timers.length < 2) fail("job_search_setup_missing_timers");
  if (!Array.isArray(data.blueprints) || data.blueprints.length < 4) fail("job_search_setup_missing_blueprints");
  if (!String(data.playbookText || "").includes("Job search operating playbook")) fail("job_search_setup_missing_playbook_text");
' "$tmp_dir/configured.json"

./oxrm cli setup:job-search:get >"$tmp_dir/read.json"
node -e '
  const fs = require("node:fs");
  const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (!data.configured || !String(data.agentPrompt || "").includes("Use oXRM as the local source of truth")) {
    console.error(JSON.stringify({ error: "job_search_setup_read_failed", data }, null, 2));
    process.exit(1);
  }
' "$tmp_dir/read.json"

./oxrm cli mcp:read oxrm://setup/job-search >"$tmp_dir/mcp-setup.json"
grep -F "Configured job search operating playbook" "$tmp_dir/mcp-setup.json" >/dev/null

./oxrm cli mcp:read oxrm://playbook/job-search >"$tmp_dir/mcp-playbook.json"
grep -F "Job search operating playbook" "$tmp_dir/mcp-playbook.json" >/dev/null

./oxrm cli mcp:call job_search.get_setup --input '{}' >"$tmp_dir/mcp-tool.json"
grep -F "job_search" "$tmp_dir/mcp-tool.json" >/dev/null

echo "Job search setup smoke passed."
