# Docker Instances

Instances are isolated with Docker project names, per-instance env files, separate host ports, and separate database volumes.

Use `./oxrm` rather than hand-writing Docker or `pnpm` commands. It does not require Node.js or pnpm on the host; CLI commands run inside the selected instance network.

`./ocrm` still works as a deprecated compatibility wrapper, but new scripts and docs should use `./oxrm`.

Instance isolation stays at the Docker/runtime layer. The repository should not grow a product-level instance-management model while per-instance env files, project names, ports, and volumes are sufficient.

## Demo Instance

Tracked public-safe example:

```bash
instances/demo.env.example
```

Create the private runtime env:

```bash
./oxrm init demo --template blank
```

Print the URLs assigned to the Docker instance:

```bash
./oxrm urls
```

Common Docker instance commands:

```bash
./oxrm start
./oxrm ready
./oxrm seed job-search
./oxrm test
./oxrm tools
./oxrm doctor
./oxrm repair
./oxrm backup
./oxrm upgrade
```

To add another local instance, run `./oxrm init <name> --template blank`.
Ports are assigned automatically and stored in `instances/<name>.local.env`.
Use `./oxrm -i <name> urls` to print them. Treat tracked example files as
public-safe scaffolding only; live `.local.env` files remain private and
ignored.

Keep per-instance `.local.env` files private. They may contain database passwords, backup repository names, and GitHub tokens.

`seed` creates baseline product configuration. `seed job-search` and
`seed outreach` add one explicit synthetic scenario that is safe to use in
screenshots, smoke tests, and public walkthroughs. `seed none --reset-demo`
removes known synthetic demo records without deleting the database volume.

## Repair

Use repair before editing env files manually:

```bash
./oxrm doctor
./oxrm ports repair
./oxrm repair
```

`ports repair` changes only the web/API/MCP ports and rewrites the local API/MCP
URLs. `repair` backfills missing local env defaults, repairs blocked ports,
removes Compose orphans, starts the stack, runs migrations, runs the baseline
seed, and checks health.

Lead and event writes normalize people, companies, domains, and email addresses before inserting records. Use `./oxrm cli -- event:record ...` for idempotent message/email/connection-request timeline writes, and `./oxrm tools` to inspect the MCP task, identity, and event tools exposed to agents.

## Instance Upgrades

Use the upgrade command per Docker-isolated instance:

```bash
./oxrm -i demo upgrade
./oxrm -i mete-linkedin upgrade
./oxrm -i firat-linkedin upgrade
```

The default flow is:

1. Ensure Postgres and Redis are running.
2. Run a backup.
3. Verify the latest backup artifact.
4. Stop app and worker services while keeping data services up.
5. Build the app image from the current checkout.
6. Run migrations once.
7. Run idempotent baseline seed.
8. Optionally run one explicit demo scenario when `--demo` is provided.
9. Restart API, MCP, web, worker, scheduler, and backup services.
10. Run health and smoke checks.

For disposable local instances without backup credentials, use:

```bash
./oxrm -i demo upgrade --skip-backup
```

Do not use `--skip-backup` for production-bound instances. Other local-only
flags are `--skip-smoke`, `--skip-seed`, `--skip-build`, and
`--demo job-search|linkedin-outreach` when you intentionally want to load a demo
during an upgrade.
