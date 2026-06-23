# Troubleshooting

Use the wrapper first. It selects the instance, loads the right env file, and
uses Docker Compose when available or direct Docker containers otherwise.

## Docker Is Not Running

```bash
docker version
./oxrm status
```

Start Docker Engine, then rerun:

```bash
./oxrm start
./oxrm ready
./oxrm test
```

## Port Already In Use

Inspect the instance first:

```bash
./oxrm doctor
```

If another process owns one of the web/API/MCP ports, reassign only the public
ports and keep the database volume:

```bash
./oxrm ports repair
./oxrm start
./oxrm urls
```

For a full safe recovery, use:

```bash
./oxrm repair
```

## Stale Containers Or Broken Demo Data

Stop the instance without deleting data:

```bash
./oxrm stop
./oxrm start
./oxrm test
```

If Docker containers, env defaults, or ports are inconsistent, prefer repair:

```bash
./oxrm repair
```

For a disposable local demo only, reset the selected instance. This deletes the
instance's local Docker data:

```bash
./oxrm reset
./oxrm start
./oxrm ready
./oxrm seed job-search
./oxrm test
```

## API Health Fails

```bash
./oxrm status
./oxrm logs api
./oxrm cli health
curl -fsS http://127.0.0.1:18291/api/health
```

If ports were customized, use the API URL from `./oxrm urls`.

## MCP Is Not Responding

```bash
./oxrm logs mcp
./oxrm tools
./oxrm cli mcp:read crm://queue/today
```

The default demo MCP URL is `http://127.0.0.1:18292/mcp`, but scripts should
prefer `./oxrm urls` and the Dockerized CLI.

## Setup Command Not Found

If `./oxrm cli setup:job-search:get` fails with an unknown command or a missing
API route, the running containers are older than the checkout.

```bash
./oxrm upgrade --skip-backup
./oxrm cli setup:job-search:get
```

For a disposable demo instance, rebuild from scratch:

```bash
./oxrm reset
./oxrm start
./oxrm ready
./oxrm seed job-search
./oxrm cli setup:job-search:get
```

## Migration Or Seed Problems

```bash
./oxrm ready
./oxrm logs api
./oxrm db-smoke
```

If the instance is disposable, use `./oxrm reset` and rerun the demo path.

To remove known synthetic demo data without deleting the database volume:

```bash
./oxrm seed none --reset-demo
```

## Docker Build DNS Fails

If Docker cannot pull `node:22-bookworm-slim` or package metadata, inspect
Docker DNS first. The local wrapper and live deploy script retry app image
builds with host networking when the builder cannot resolve through Docker's
internal DNS, but local Docker Desktop or Engine may still need a restart if
the daemon itself cannot resolve registry names.

```bash
docker run --rm node:22-bookworm-slim node --version
./oxrm start
```

`docker compose up -d --no-build` only restarts the previous image. Use it only
when you are intentionally restoring a known-working runtime.

## Job Search Setup Smoke

Use this after setup, upgrades, or demo deploys:

```bash
./oxrm cli setup:job-search:get
./oxrm cli setup:job-search:next
./oxrm cli mcp:read oxrm://setup/job-search
./oxrm cli mcp:read oxrm://playbook/job-search
```

## Backup Verification

```bash
./oxrm backup
./oxrm verify
```

The public demo does not need real backup credentials. In local development,
backup health is optional unless `OXRM_BACKUP_REQUIRED=true` is set. Keep backup
tokens and private target repositories out of version control.
