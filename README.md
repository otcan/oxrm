# Orkestr CRM

Orkestr CRM is an MCP-first outreach ledger for agent-operated sales workflows. It gives AI agents and connector workers one auditable place to record leads, outreach events, follow-up state, scheduling context, and backup status.

The project is deliberately not a generic CRM or an outreach automation bot. The core product contract is the ledger: every successful external send can be written once, deduplicated by an idempotency key, and then read back through HTTP APIs, MCP tools, and MCP resources.

## What It Does

- Records outreach events atomically: lead upsert, flow assignment update, and activity append.
- Exposes MCP tools and resources for agent workflows such as queue review, lead lookup, event recording, and backup health.
- Keeps connector boundaries explicit for LinkedIn, Sales Navigator, email, calendar, and future CRM syncs.
- Ships a public-safe synthetic demo seed and smoke path.
- Treats backups, approval boundaries, and auditability as product requirements.

## Stack

- Angular with Signals
- Node.js and Fastify
- Drizzle ORM
- PostgreSQL
- Redis
- MCP server for agent tools and resources
- Containerized runtime
- GitHub-backed backup worker

## Docker-Only Setup

Runtime operations require Docker. Node.js and pnpm are only needed for contributors who want to run workspace scripts directly on the host.

```bash
./ocrm start
./ocrm ready
./ocrm demo
./ocrm test
```

Print instance URLs:

```bash
./ocrm urls
```

Run CLI commands inside the Docker instance network:

```bash
./ocrm cli health
./ocrm tools
./ocrm cli mcp:call crm.search_leads --input '{"query":"founder"}'
./ocrm cli mcp:read crm://queue/today
```

The demo instance binds to `127.0.0.1` by default:

- Web app: `http://127.0.0.1:18290`
- API health: `http://127.0.0.1:18291/api/health`
- MCP HTTP health: `http://127.0.0.1:18292/health`
- Postgres host port: `127.0.0.1:18293`
- Redis host port: `127.0.0.1:18294`

Multiple instances are isolated by env file, Docker project name, host ports, and database volumes. Use `./ocrm new <name>`, assign unique host ports in `instances/<name>.env.example`, then run commands with `./ocrm -i <name> start`.

## Host Development

```bash
cp .env.example .env
pnpm install
pnpm build
docker compose up --build
```

The default development compose file binds to `127.0.0.1`:

- Web app: `http://127.0.0.1:18180`
- API health: `http://127.0.0.1:18181/api/health`
- MCP HTTP health: `http://127.0.0.1:18182/health`
- Postgres host port: `127.0.0.1:18183`
- Redis host port: `127.0.0.1:18184`

Override ports with `WEB_PORT`, `API_PORT`, `MCP_PORT`, `HOST_WEB_PORT`, `HOST_API_PORT`, `HOST_MCP_PORT`, `HOST_POSTGRES_PORT`, and `HOST_REDIS_PORT`.

## Development

Operational commands are routed through `scripts/crm`. Use `pnpm ops help` for the full command surface; the root `pnpm` shortcuts below delegate there.

```bash
pnpm dev:api
pnpm dev:mcp
pnpm dev:web
```

## Public-Safe Demo

The demo path uses only synthetic records and `.invalid` URLs.

```bash
./ocrm start
./ocrm ready
./ocrm demo
./ocrm test
```

Use `./ocrm urls` to print the local URLs. Keep `instances/*.local.env` private; they may contain credentials and backup targets.

## CLI And MCP Testing

```bash
./ocrm cli health
./ocrm tools
./ocrm cli mcp:call crm.search_leads --input '{"query":"founder"}'
./ocrm cli mcp:read crm://queue/today
./ocrm smoke
```

Host-side CLI development still supports:

- `CRM_API_URL`, default `http://127.0.0.1:18181`
- `CRM_MCP_URL`, default `http://127.0.0.1:18182/mcp`

## Data Model

Orkestr CRM keeps identity separate from workflow state:

- People are contacts.
- Companies own names, websites, and domains.
- Email addresses are normalized and unique.
- Leads are workflow records that link a person to a company.
- Tasks are the actionable queue for follow-up, research, approvals, and cleanup.
- Activities/events are the append-only timeline for messages, connection requests, emails, meetings, notes, and connector sync facts.

Lead writes go through identity resolution. Email addresses, LinkedIn URLs, SalesNav URLs, domains, and normalized company names are used to find existing records before anything new is created. Common fields are first-class columns, and `customFields`/`metadata` keep the model expandable.

General connector ingestion should write idempotent timeline events to `POST /api/events`:

```bash
./ocrm cli -- event:record \
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

Successful outreach senders should write to the ledger with one atomic API call:

```bash
curl -X POST "$CRM_API_URL/api/outreach-events" \
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
      "body": "Synthetic connection request recorded for demo purposes.",
      "occurredAt": "2026-06-15T09:23:18Z"
    }
  }'
```

`externalKey` is idempotent. Repeating the same call returns the existing activity instead of duplicating the outreach event. See [docs/outreach-event-contract.md](docs/outreach-event-contract.md).

## Database

```bash
./ocrm migrate
./ocrm seed
./ocrm demo
./ocrm db-smoke
```

`seed` creates baseline product configuration. `demo-seed` adds public-safe synthetic demo records.

## Documentation

- [Architecture](docs/architecture.md)
- [Outreach event contract](docs/outreach-event-contract.md)
- [Privacy and safe-data handling](docs/privacy-and-safe-data.md)
- [Future CRM sync](docs/crm-sync.md)
- [Instance operations](docs/instances.md)
- [Public repo export](docs/public-repo-export.md)
- [Release checklist](docs/public-release.md)

## Backups

Production must configure `BACKUP_GITHUB_REPO` and `BACKUP_GITHUB_TOKEN`.

```bash
./ocrm backup
./ocrm verify
```

The backup worker is part of the scaffold because backup enforcement is a product requirement, not an operational afterthought.

## Agent Branch Workflow

Agents should work on branches named:

```txt
agent/<agent-name>/<short-task>
```

MCP tools expose branch creation, branch summary, and PR body preparation. Opening a PR remains an approval-gated external side effect.

## Production Exposure

Default development ports are bound to `127.0.0.1`. For production, use the Caddy reverse proxy profile in `infra/compose/docker-compose.prod.yml` and expose only the proxy through the host firewall.
