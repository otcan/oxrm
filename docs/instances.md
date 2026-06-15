# CRM Instances

Instances are isolated with Docker project names, per-instance env files, separate host ports, and separate database volumes.

Use `./ocrm` rather than hand-writing Docker commands. It does not require Node.js or pnpm on the host; CLI commands run inside the instance network.

## Demo Instance

Tracked public-safe example:

```bash
instances/demo.env.example
```

Local runtime env:

```bash
./ocrm setup
$EDITOR instances/demo.local.env
```

Local demo ports:

- Web: `http://127.0.0.1:18290`
- API health: `http://127.0.0.1:18291/api/health`
- MCP health: `http://127.0.0.1:18292/health`
- Postgres: `127.0.0.1:18293`
- Redis: `127.0.0.1:18294`

Commands:

```bash
./ocrm start
./ocrm ready
./ocrm demo
./ocrm test
./ocrm tools
./ocrm backup
```

To add another instance, run `./ocrm new <name>`, choose unique host ports, then use `./ocrm -i <name> start`.

Keep per-instance `.local.env` files private. They may contain database passwords, backup repository names, and GitHub tokens.

`seed` creates baseline product configuration. `demo-seed` adds synthetic demo leads, assignments, and activities that are safe to use in screenshots, smoke tests, and public walkthroughs.

Lead and event writes normalize people, companies, domains, and email addresses before inserting records. Use `./ocrm cli -- event:record ...` for idempotent message/email/connection-request timeline writes, and `./ocrm tools` to inspect the MCP task, identity, and event tools exposed to agents.
