#!/usr/bin/env bash
set -euo pipefail

instance="runtime-repair-$(date +%s)-${RANDOM}"
env_file="instances/${instance}.local.env"
server_pid=""

cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" >/dev/null 2>&1 || true
    wait "$server_pid" >/dev/null 2>&1 || true
  fi
  rm -f "$env_file"
}
trap cleanup EXIT

read_env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" "$env_file" | tail -n 1
}

wait_for_port() {
  local port="$1"
  for _ in $(seq 1 20); do
    if python3 - "$port" <<'PY' >/dev/null 2>&1
import socket
import sys

port = int(sys.argv[1])
sock = socket.socket()
sock.settimeout(0.2)
try:
    sock.connect(("127.0.0.1", port))
except OSError:
    sys.exit(1)
finally:
    sock.close()
PY
    then
      return 0
    fi
    sleep 0.2
  done
  echo "Port did not open: $port" >&2
  exit 1
}

echo "Creating fresh runtime env through ./oxrm urls: ${instance}"
./oxrm -i "$instance" urls >/tmp/oxrm-runtime-repair-urls.txt
test -f "$env_file"

old_web_port="$(read_env_value HOST_WEB_PORT)"
old_api_port="$(read_env_value HOST_API_PORT)"
old_mcp_port="$(read_env_value HOST_MCP_PORT)"
old_api_url="$(read_env_value OXRM_API_URL)"
old_mcp_url="$(read_env_value OXRM_MCP_URL)"

test -n "$old_web_port"
test -n "$old_api_port"
test -n "$old_mcp_port"
test "$old_api_url" = "http://127.0.0.1:${old_api_port}"
test "$old_mcp_url" = "http://127.0.0.1:${old_mcp_port}/mcp"
! grep -q '^HOST_POSTGRES_PORT=' "$env_file"
! grep -q '^HOST_REDIS_PORT=' "$env_file"

echo "Blocking web port ${old_web_port} with a local listener."
python3 -m http.server "$old_web_port" --bind 127.0.0.1 >/tmp/oxrm-runtime-repair-http.log 2>&1 &
server_pid="$!"
wait_for_port "$old_web_port"

./oxrm -i "$instance" doctor >/tmp/oxrm-runtime-repair-doctor.txt
grep -F "Web ${old_web_port}: blocked by another process" /tmp/oxrm-runtime-repair-doctor.txt >/dev/null

./oxrm -i "$instance" ports repair >/tmp/oxrm-runtime-repair-output.txt
grep -F "Reassigned public ports" /tmp/oxrm-runtime-repair-output.txt >/dev/null

new_web_port="$(read_env_value HOST_WEB_PORT)"
new_api_port="$(read_env_value HOST_API_PORT)"
new_mcp_port="$(read_env_value HOST_MCP_PORT)"
new_api_url="$(read_env_value OXRM_API_URL)"
new_mcp_url="$(read_env_value OXRM_MCP_URL)"

test "$new_web_port" != "$old_web_port"
test "$new_api_port" != "$old_api_port"
test "$new_mcp_port" != "$old_mcp_port"
test "$new_api_url" = "http://127.0.0.1:${new_api_port}"
test "$new_mcp_url" = "http://127.0.0.1:${new_mcp_port}/mcp"

./oxrm -i "$instance" ports repair >/tmp/oxrm-runtime-repair-noop.txt
grep -F "No port repair needed" /tmp/oxrm-runtime-repair-noop.txt >/dev/null

echo "Runtime repair smoke passed."
