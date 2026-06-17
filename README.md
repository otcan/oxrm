# oXRM

[![CI](https://github.com/otcan/orkestr-crm/actions/workflows/ci.yml/badge.svg)](https://github.com/otcan/orkestr-crm/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 22+](https://img.shields.io/badge/node-22%2B-339933.svg)](package.json)
[![Docker](https://img.shields.io/badge/runtime-Docker-2496ED.svg)](docker-compose.yml)

oXRM is an MCP-first relationship workspace for people who use agents to manage
follow-ups, outreach, job search, partnerships, investors, and warm leads.

It gives AI agents, connector workers, and operators one auditable place to
record generic records, relationships, timelines, tasks, saved views, follow-up
state, scheduling context, and backup status.

The project is deliberately not an outreach automation bot. It stores
relationship state, queues next actions, exposes MCP tools/resources, and keeps
humans in control. The core product contract is the relationship ledger:
important external or operator actions can be written once, deduplicated by an
idempotency key where applicable, linked to generic records, and then read back
through HTTP APIs, MCP tools, MCP resources, and saved views.

The repository still has internal package scopes that use the older Orkestr CRM
name, but operator-facing commands and docs now use `oxrm`.

LinkedIn operation mechanics live in the separate `otcan/ork-linkedin` repo.
oXRM integrates with it only through MCP/API contracts; see
[docs/ork-linkedin-integration.md](docs/ork-linkedin-integration.md).

![oXRM dashboard with synthetic demo data](docs/assets/oxrm-dashboard.png)

## How Orkestr And oXRM Fit Together

Orkestr is the local-first workstation for persistent coding and operations
agents.

oXRM is the first workflow app built for that model: an MCP-first relationship
workspace that gives agents structured relationship memory, follow-up queues,
and safe human-approved actions.

Use Orkestr when you need to run and supervise agents. Use oXRM when those
agents need relationship state.

## What It Does

- Records outreach events atomically: lead upsert, flow assignment update, and activity append.
- Stores generic oXRM object types, records, typed relationships, linked tasks, timelines, and saved table views.
- Ships outreach and job-search template seeds with public-safe synthetic records.
- Exposes MCP tools and resources for agent workflows such as queue review, record lookup, view execution, event recording, and backup health.
- Keeps connector boundaries explicit for LinkedIn, Sales Navigator, email, calendar, and future CRM syncs.
- Ships a public-safe synthetic demo seed and smoke path.
- Treats backups, approval boundaries, and auditability as product requirements.

## Why This Exists

Agents need structured relationship state. Spreadsheets are too loose, and
classic CRMs are usually sales-team-first. oXRM gives humans and agents a shared
relationship memory with queues, saved views, timeline events, safe write paths,
and MCP resources that can be inspected and audited.

## Stack

- Angular with Signals
- Node.js and Fastify
- Drizzle ORM
- PostgreSQL
- Redis
- MCP server for agent tools and resources
- Containerized runtime
- GitHub-backed backup worker

## Docker-First Quickstart

Run the product through Docker. You do not need Node.js or pnpm on the host for normal installation, demo usage, CLI usage, or multi-instance operation.

Requirements:

- Docker Engine
- Docker Compose plugin, optional. If Compose is unavailable, `./oxrm` falls back to direct Docker containers.

```bash
git clone https://github.com/otcan/orkestr-crm.git
cd orkestr-crm
./oxrm start
./oxrm ready
./oxrm demo
./oxrm test
./oxrm urls
```

`./oxrm` builds the app image, starts Postgres, Redis, API, MCP, web, worker, and scheduler containers, runs migrations, seeds baseline data, loads a public-safe demo, then runs smoke checks.

Expected default demo URLs:

```text
Web: http://127.0.0.1:18290
API: http://127.0.0.1:18291
MCP: http://127.0.0.1:18292/mcp
```

The default public demo uses `instances/demo.env.example`. Use `./oxrm urls`
for the authoritative runtime ports. The root `.env.example` is for
custom/manual setups and is not the first-run path.

`./ocrm` is a deprecated compatibility wrapper around `./oxrm`. New automation should call `./oxrm`.

Use `./oxrm -i <instance> upgrade` for repeatable instance updates. It runs the
configured backup path, restores the latest backup artifact into an isolated
disposable PostgreSQL database with `pg_restore`, checks restored schema
readability, stops app writers, builds the image, runs migrations once, runs
idempotent seed, restarts services, and smoke-tests the instance. For disposable
local instances without backup credentials, pass `--skip-backup`; do not skip
backups for production-bound instances.

Print the URLs assigned to the Docker instance:

```bash
./oxrm urls
```

Run CLI commands inside the Docker instance network:

```bash
./oxrm cli health
./oxrm tools
./oxrm cli mcp:call crm.search_leads --input '{"query":"founder"}'
./oxrm cli mcp:read crm://queue/today
```

The default demo instance exposes services through Docker-managed host ports. Use `./oxrm urls` instead of hard-coding ports in scripts or documentation. Override host ports in `instances/<name>.env.example` before creating an instance, or in the private `instances/<name>.local.env` after setup.

## Multiple Docker Instances

Multiple instances are isolated by env file, Docker project name, host ports, and database volumes.

```bash
./oxrm new client-a
$EDITOR instances/client-a.local.env
./oxrm -i client-a start
./oxrm -i client-a ready
./oxrm -i client-a urls
```

Each instance runs its CLI inside that instance's Docker network:

```bash
./oxrm -i client-a cli health
./oxrm -i client-a cli event:list --limit 20
```

## Demo Data

The demo path uses only synthetic records and `.invalid` URLs. No real personal
data is included, and no real LinkedIn, email, Sales Navigator, or calendar
credentials are required.

Do not commit real leads, tokens, cookies, browser sessions, message exports,
logs, dumps, private instance files, or backups.

```bash
./oxrm start
./oxrm ready
./oxrm demo
./oxrm test
```

Use `./oxrm urls` to print the Docker instance URLs. Keep `instances/*.local.env` private; they may contain credentials and backup targets.

`./oxrm ready` seeds both bundled templates:

- `outreach`: people, companies, leads, tasks, events, and outreach saved views.
- `job_search`: companies, contacts, jobs, applications, interviews, referrals, documents, saved views, synthetic records, an application timeline event, and a follow-up task.

## What oXRM Is Not

oXRM is not a LinkedIn scraper, spam tool, mass outreach bot,
Salesforce/HubSpot clone, production-ready multi-tenant SaaS, or replacement
for human approval.

## Demo Scenario

The canonical demo is a founder/operator relationship queue:

1. Start the stack and seed synthetic outreach plus job-search data.
2. Open the dashboard and inspect due work.
3. Open Leads and review synthetic people/companies.
4. Read today's queue through MCP.
5. Record or inspect a timeline event with an idempotency key.

Detailed script: [docs/demo-script.md](docs/demo-script.md).

## CLI And MCP Testing

Use the Dockerized CLI:

```bash
./oxrm cli health
./oxrm tools
./oxrm cli mcp:call crm.search_leads --input '{"query":"founder"}'
./oxrm cli mcp:read crm://queue/today
./oxrm smoke
```

Host-side CLI development is contributor-only. For normal use, run `./oxrm cli ...` so the CLI resolves API and MCP services inside the Docker network.

More detail:

- [MCP tools and resources](docs/mcp.md)
- [HTTP API endpoints](docs/api.md)
- [Troubleshooting](docs/troubleshooting.md)

## Data Model

oXRM keeps identity separate from workflow state:

- People are contacts.
- Companies own names, websites, and domains.
- Email addresses are normalized and unique.
- Leads are workflow records that link a person to a company.
- Tasks are the actionable queue for follow-up, research, approvals, and cleanup.
- Activities/events are the append-only timeline for messages, connection requests, emails, meetings, notes, and connector sync facts.

Lead writes go through identity resolution. Email addresses, LinkedIn URLs, SalesNav URLs, domains, and normalized company names are used to find existing records before anything new is created. Common fields are first-class columns, and `customFields`/`metadata` keep the model expandable.

The oXRM pivot keeps this outreach model working while adding generic records, typed relationships, timelines, tasks, saved views, and MCP tools that can support other relationship domains. Generic records should use a hybrid persistence model: PostgreSQL remains the transactional source of truth, append-friendly record/event files support fast writes and audit/export, and indexed projections support fast search at up to 1M records per instance.

Generic saved views are template-aware. Agents can list and run them through `xrm.list_views` and `xrm.run_view`; the web UI renders configured table views for seeded object types. Existing `crm.*` view tools remain available for compatibility.

General non-outreach connector ingestion can write idempotent timeline events to `POST /api/events`:

```bash
./oxrm cli -- event:record \
  --type email_received \
  --channel email \
  --direction inbound \
  --name "Alex Rivera" \
  --email alex@example.test \
  --subject "Re: partnership" \
  --key "demo:gmail:thread-123:message-456"
```

The event ledger accepts `message_sent`, `message_received`, `connection_request_sent`, `connection_request_received`, `email_sent`, `email_received`, and the other activity types in the schema. Events can link to a lead, person, company, task, assignment, provider thread ID, provider message ID, external URL, and free-form metadata.

## Outreach Event Contract

Successful outreach senders should use the canonical outreach write path, which records lead, assignment, activity, structured metadata, idempotency, and linked next-action task behavior in one transaction:

```bash
curl -X POST "$OXRM_API_URL/api/outreach-events" \
  -H 'content-type: application/json' \
  -d '{
    "externalKey": "demo:connection:alex-rivera:2026-06-15T09:23:18Z",
    "lead": {
      "fullName": "Alex Rivera",
      "company": "Example Infrastructure Co",
      "title": "Head of Partnerships",
      "linkedinUrl": "https://example.invalid/linkedin/alex-rivera",
      "source": "demo:synthetic"
    },
    "assignment": {
      "status": "connection_sent",
      "lastContactedAt": "2026-06-15T09:23:18Z"
    },
    "activity": {
      "type": "connection_sent",
      "channel": "linkedin",
      "direction": "outbound",
      "subject": "Connection request sent: Alex Rivera",
      "noteStatus": "unconfirmed",
      "proposedNote": "Synthetic proposed connection note.",
      "linkedinResult": "native_send_verified_pending",
      "occurredAt": "2026-06-15T09:23:18Z"
    },
    "nextActionTask": {
      "dueInDays": 5
    }
  }'
```

`externalKey` is idempotent. Repeating the same call returns the existing activity instead of duplicating the outreach event. See [docs/outreach-event-contract.md](docs/outreach-event-contract.md).

## Database

```bash
./oxrm migrate
./oxrm seed
./oxrm demo
./oxrm db-smoke
```

`seed` creates baseline product configuration. `demo-seed` adds public-safe synthetic demo records.

During the current migration stage, every schema migration must include an explicit manual update note for required data movement, backfill, verification, and rollback impact. Do not rely on old compatibility paths silently carrying data forward.

## Contributor Development

Normal users should use `./oxrm`. Contributors who are changing TypeScript code can run workspace commands directly on the host:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm db:generate
```

For host-side dev services, use `scripts/crm dev <service>`. Runtime validation should still go through Docker with `./oxrm test`.

## Documentation

- [Architecture](docs/architecture.md)
- [Backlog decisions](docs/backlog-decisions.md)
- [Outreach event contract](docs/outreach-event-contract.md)
- [Privacy and safe-data handling](docs/privacy-and-safe-data.md)
- [Future CRM sync](docs/crm-sync.md)
- [Instance operations](docs/instances.md)
- [Public repo export](docs/public-repo-export.md)
- [Release checklist](docs/public-release.md)
- [Roadmap](ROADMAP.md)

## Backups

Production must configure `BACKUP_GITHUB_REPO` and `BACKUP_GITHUB_TOKEN`.

```bash
./oxrm backup
./oxrm verify
```

The backup worker is part of the scaffold because backup enforcement is a product requirement, not an operational afterthought.
Current verification restores the latest dump into a disposable database, checks
that public tables and `backup_runs` are readable, and drops the database before
returning.

## Agent Branch Workflow

Agents should work on branches named:

```txt
agent/<agent-name>/<short-task>
```

MCP tools expose branch creation, branch summary, and PR body preparation. Opening a PR remains an approval-gated external side effect.

## Production Exposure

Default Docker development ports are loopback-only. For production, use the Caddy reverse proxy profile in `infra/compose/docker-compose.prod.yml` and expose only the proxy through the host firewall.
