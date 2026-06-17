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

Print the configured ports:

```bash
./oxrm urls
```

For the demo instance, edit `instances/demo.local.env` and change the
`HOST_*_PORT` values, then restart:

```bash
./oxrm stop
./oxrm start
./oxrm ready
```

## Stale Containers Or Broken Demo Data

Stop the instance without deleting data:

```bash
./oxrm stop
./oxrm start
./oxrm test
```

For a disposable local demo, reset the selected instance. This deletes the
instance's local Docker data:

```bash
./oxrm reset
./oxrm start
./oxrm ready
./oxrm demo
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

## Backup Verification

```bash
./oxrm backup
./oxrm verify
```

The public demo does not need real backup credentials. Keep backup tokens and
private target repositories out of version control.
