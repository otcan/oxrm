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

## Backup Verification

```bash
./oxrm backup
./oxrm verify
```

The public demo does not need real backup credentials. In local development,
backup health is optional unless `OXRM_BACKUP_REQUIRED=true` is set. Keep backup
tokens and private target repositories out of version control.
