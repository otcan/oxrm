# Orkestr CRM Architecture

## Goal

Orkestr CRM is a minimal, containerized, MCP-first CRM for tracking LinkedIn outreach flows, Sales Navigator work, email conversations, and scheduling activity across multiple operators and agents.

The system should be easy to run, easy to back up, and safe for agents to operate directly. The web UI is important, but the primary product contract is the agent tool surface: agents should be able to inspect CRM state, plan work, execute approved updates, sync integrations, and propose code changes through dedicated pull requests.

## Hard Requirements

- Frontend: Angular with Signals.
- Backend: Node.js with Fastify.
- ORM: Drizzle.
- Runtime: always containerized.
- Deployment: support multiple app instances.
- Backups: force daily database backups to a dedicated private GitHub repository.
- Scheduler: ship out of the box with a minimal Calendly-style scheduling module.
- Calendar reads: scheduler must read external calendars to compute availability.
- Integrations: ship out of the box with connector boundaries for Sales Navigator, LinkedIn, and email.
- No desktop management UI or desktop domain model.
- MCP-first: expose CRM operations through MCP tools and resources.
- Agent-first: model permissions, audit logs, workflows, and PR flow around agent operators.
- Agent workflow: agents work on their own branches; changes sync to main through dedicated PRs.

## Architecture Decision

Use a service-oriented monorepo with a shared PostgreSQL database.

SQLite is intentionally not the primary database because this product must support multiple containerized app instances. Multiple writers against a shared SQLite file introduce avoidable locking, filesystem, and backup problems. PostgreSQL gives us a clean multi-instance write model, proper locks, migrations, and predictable backups.

Drizzle remains the ORM layer.

## Runtime Topology

```txt
┌──────────────────────┐
│ reverse proxy         │
│ Caddy/Traefik/Nginx   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐       ┌──────────────────────┐
│ web container(s)      │       │ api container(s)      │
│ Angular static app    │──────▶│ Fastify HTTP API      │
└──────────────────────┘       └──────────┬───────────┘
           │                               ▲
           │                               │
           ▼                               │
┌──────────────────────┐                   │
│ mcp container(s)      │──────────────────┘
│ agent tool surface    │
└──────────────────────┘
                                           │
                                           ▼
                                  ┌──────────────────────┐
                                  │ PostgreSQL            │
                                  │ primary data store    │
                                  └──────────┬───────────┘
                                             │
                     ┌───────────────────────┼───────────────────────┐
                     ▼                       ▼                       ▼
          ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
          │ worker container │    │ scheduler worker │    │ backup worker    │
          │ connectors/jobs  │    │ bookings/calendars│   │ pg_dump -> GitHub│
          └──────────────────┘    └──────────────────┘    └──────────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │ Redis             │
          │ queues/locks/cache│
          └──────────────────┘
```

Core containers:

- `web`: Angular build served by Nginx or Caddy.
- `api`: Fastify API, stateless, horizontally scalable.
- `mcp`: MCP server exposing CRM tools, resources, and prompts for agents.
- `worker`: connector sync, import/export, background processing.
- `scheduler`: recurring jobs, booking logic, calendar free/busy sync.
- `backup`: daily GitHub backup enforcement.
- `postgres`: primary database.
- `redis`: job queue, distributed locks, lightweight cache.

## Repository Layout

```txt
orkestr-crm/
  apps/
    web/
      src/
        app/
          core/
          features/
          shared/
        styles/
    api/
      src/
        modules/
        plugins/
        server.ts
    mcp/
      src/
        tools/
        resources/
        prompts/
        server.ts
    worker/
      src/
        jobs/
        connectors/
        index.ts
    scheduler/
      src/
        jobs/
        availability/
        index.ts
  packages/
    db/
      src/
        schema/
        migrations/
        client.ts
    shared/
      src/
        contracts/
        types/
        validation/
  infra/
    docker/
    compose/
    backups/
  docs/
    architecture.md
  docker-compose.yml
  package.json
  README.md
  .env.example
```

Use workspaces so apps share schema, types, and validation contracts without copy/paste.

## MCP-First Architecture

The MCP server is a first-class runtime app, not an afterthought. It exposes the CRM as tools, resources, and prompts that agents can use safely.

The Angular UI and MCP server should call the same domain services through shared contracts. The MCP server must not duplicate business rules.

MCP responsibilities:

- Give agents structured read access to leads, assignments, activities, bookings, backups, and integration health.
- Provide safe write tools for routine CRM operations.
- Require explicit approval for high-impact operations.
- Preserve an audit trail for every agent action.
- Make branch and PR workflow available to agents.
- Return compact, action-oriented results suitable for agent loops.

MCP app:

```txt
apps/mcp/
  src/
    tools/
      leads.ts
      flows.ts
      assignments.ts
      activities.ts
      scheduler.ts
      integrations.ts
      backups.ts
      git-workflow.ts
    resources/
      lead.ts
      assignment.ts
      daily-queue.ts
      backup-health.ts
      integration-health.ts
    prompts/
      daily-outreach-plan.ts
      lead-research-summary.ts
      follow-up-draft.ts
      pr-summary.ts
    server.ts
```

Recommended MCP resources:

- `crm://leads/{leadId}`
- `crm://assignments/{assignmentId}`
- `crm://activities/recent`
- `crm://queue/today`
- `crm://queue/overdue`
- `crm://scheduler/availability/{eventTypeId}`
- `crm://integrations/health`
- `crm://backups/latest`
- `crm://agents/{agentId}/worklog`

Recommended MCP tools:

```txt
crm.search_leads
crm.get_lead
crm.create_lead
crm.update_lead
crm.assign_lead_to_flow
crm.update_assignment_status
crm.set_next_action
crm.log_activity
crm.get_daily_queue
crm.get_overdue_queue

crm.create_event_type
crm.get_availability
crm.create_booking_link
crm.create_booking

crm.list_integration_accounts
crm.test_integration_account
crm.sync_integration_account

crm.get_backup_health
crm.run_backup

crm.create_agent_branch
crm.summarize_branch_changes
crm.prepare_pr
```

Tool safety levels:

- Read-only: safe by default.
- Routine write: allowed for authenticated agents, always audited.
- External side effect: requires approval, for example sending messages, creating calendar events, or triggering connector sync that writes externally.
- System-level: requires approval, for example running backup, restore verification, migration, branch creation, or PR creation.

Agent audit fields:

- `id`
- `agent_id`
- `tool_name`
- `input_json`
- `result_json`
- `approval_id`
- `status`
- `created_at`

Approval fields:

- `id`
- `agent_id`
- `operation`
- `reason`
- `payload_json`
- `status`
- `approved_by`
- `approved_at`
- `created_at`

## Agent-First Operating Model

Agents are expected users of the CRM, not just code contributors.

Agent capabilities:

- Build a daily outreach queue.
- Find stale leads and overdue follow-ups.
- Log LinkedIn, SalesNav, and email activities.
- Draft follow-up recommendations.
- Reconcile connector imports with existing leads.
- Prepare scheduler booking links.
- Check backup health before risky changes.
- Work on code branches and prepare scoped PRs.

Agent identity:

- Every agent has an `agent_id`.
- CRM mutations include `created_by_agent_id` or `updated_by_agent_id` where relevant.
- Activities can be created by humans, connectors, or agents.
- Agent actions are queryable through MCP resources and admin UI.

Agent loop for outreach:

1. Read `crm://queue/today`.
2. Inspect lead and activity history.
3. Decide the next best action.
4. Request approval if the action has external side effects.
5. Execute safe CRM update or approved external action.
6. Log activity.
7. Set next action date.

Agent loop for code changes:

1. Create or switch to `agent/<agent-name>/<short-task>`.
2. Inspect architecture, issue, or task context.
3. Modify code.
4. Run local checks.
5. Summarize changes.
6. Prepare dedicated PR.

The system should make these loops easy through MCP tools instead of relying on agents to click through the UI.

## Frontend Architecture

Frontend stack:

- Angular
- Signals for local reactive state
- Angular Router
- Reactive forms where complex validation is needed
- API client generated or typed from shared contracts

Feature modules:

- `dashboard`
- `leads`
- `flows`
- `pipeline`
- `scheduler`
- `bookings`
- `activities`
- `integrations`
- `settings`

State rules:

- Use Signals for feature-level state, filters, selected records, and derived UI state.
- Keep server data ownership on the backend.
- Avoid global state until a feature genuinely needs it.
- Use URL query params for shareable filters.

Primary screens:

- Dashboard: replies, follow-ups, bookings, connector health, backup health.
- Leads: searchable lead table and detail drawer.
- Pipeline: outreach assignments grouped by status.
- Scheduler: event types, availability rules, booking links, booking records.
- Activities: chronological log from LinkedIn, SalesNav, email, scheduler, and manual notes.
- Integrations: connected accounts, sync status, last errors, manual sync actions.
- Settings: backup repo health, environment checks, branch/build metadata.

There is no desktop management screen.

## Backend Architecture

Backend stack:

- Node.js
- Fastify
- Drizzle
- PostgreSQL
- Zod for request/response validation
- Redis-backed queues and distributed locks

The Fastify API owns HTTP concerns. The MCP server owns agent tool concerns. Both should call shared domain services and shared Drizzle repositories.

Fastify plugins:

- `config`
- `db`
- `auth`
- `queue`
- `errors`
- `logger`
- `rate-limit`

Domain modules:

- `leads`
- `flows`
- `assignments`
- `activities`
- `scheduler`
- `bookings`
- `calendar-connectors`
- `salesnav-connectors`
- `linkedin-connectors`
- `email-connectors`
- `backups`
- `imports-exports`
- `system-health`

## Core Data Model

### Lead

A lead is a person or company contact being tracked.

Fields:

- `id`
- `full_name`
- `company`
- `title`
- `linkedin_url`
- `salesnav_url`
- `email`
- `phone`
- `location`
- `source`
- `owner_agent_id`
- `notes`
- `created_by_agent_id`
- `updated_by_agent_id`
- `created_at`
- `updated_at`

Rules:

- `linkedin_url` should be unique when present.
- `salesnav_url` should be unique when present.
- Lead identity can be enriched by connectors, but flow state does not live on the lead.

### Flow

A reusable outreach process.

Fields:

- `id`
- `name`
- `description`
- `active`
- `created_at`
- `updated_at`

### Flow Step

A step inside a flow.

Fields:

- `id`
- `flow_id`
- `step_order`
- `name`
- `default_delay_days`
- `template`
- `channel`
- `created_at`
- `updated_at`

Channels:

- `linkedin`
- `salesnav`
- `email`
- `manual`

### Assignment

An assignment connects a lead to a flow. It does not connect to a desktop.

Fields:

- `id`
- `lead_id`
- `flow_id`
- `current_step_id`
- `status`
- `priority`
- `owner_agent_id`
- `last_contacted_at`
- `next_action_at`
- `created_at`
- `updated_at`

Statuses:

- `new`
- `queued`
- `connection_sent`
- `connected`
- `messaged`
- `follow_up_due`
- `replied`
- `meeting_booked`
- `won`
- `lost`
- `do_not_contact`

### Activity

An append-only event log.

Fields:

- `id`
- `lead_id`
- `assignment_id`
- `integration_account_id`
- `type`
- `channel`
- `direction`
- `body`
- `external_id`
- `created_by_agent_id`
- `occurred_at`
- `created_at`

Types:

- `connection_sent`
- `connection_accepted`
- `message_sent`
- `message_received`
- `inmail_sent`
- `email_sent`
- `email_received`
- `follow_up_due`
- `booking_created`
- `meeting_booked`
- `not_interested`
- `converted`
- `manual_note`

Channels:

- `linkedin`
- `salesnav`
- `email`
- `scheduler`
- `manual`

### Integration Account

Represents an external account or source connection. This replaces desktop management.

Fields:

- `id`
- `provider`
- `display_name`
- `status`
- `auth_type`
- `credentials_ref`
- `last_sync_at`
- `last_error`
- `created_at`
- `updated_at`

Providers:

- `linkedin`
- `salesnav`
- `gmail`
- `outlook`
- `google_calendar`
- `microsoft_calendar`
- `caldav`

Rules:

- Store secrets outside normal tables when possible.
- Do not expose raw tokens through the API.
- Connector health belongs here; desktop inventory does not.

### Agent

An agent is an automated operator or code contributor.

Fields:

- `id`
- `name`
- `type`
- `status`
- `default_branch_prefix`
- `created_at`
- `updated_at`

Types:

- `crm_operator`
- `code_contributor`
- `connector_worker`
- `scheduler_worker`

### Agent Action

An append-only audit record of MCP tool usage and automated actions.

Fields:

- `id`
- `agent_id`
- `tool_name`
- `input_json`
- `result_json`
- `approval_id`
- `status`
- `created_at`

### Approval

A human or policy approval for high-impact agent actions.

Fields:

- `id`
- `agent_id`
- `operation`
- `reason`
- `payload_json`
- `status`
- `approved_by`
- `approved_at`
- `created_at`

## Scheduler Module

The scheduler is a minimal Calendly variant.

Capabilities:

- Create event types.
- Configure duration, buffer before/after, and booking window.
- Configure weekly availability rules.
- Generate booking links.
- Read external calendars for busy blocks.
- Create booking records.
- Optionally write confirmed events back to the organizer calendar.
- Log booking activity against leads when a lead is linked.

Scheduler data model:

- `event_types`
- `availability_rules`
- `calendar_connections`
- `calendar_sources`
- `external_busy_blocks`
- `booking_links`
- `bookings`
- `booking_attendees`

Availability computation:

1. Load event type rules.
2. Load organizer availability rules.
3. Read external busy blocks from connected calendars.
4. Apply buffers and booking window.
5. Return available slots.
6. Hold a selected slot briefly using Redis.
7. Confirm booking in PostgreSQL transaction.
8. Create calendar event when configured.
9. Append `booking_created` and `meeting_booked` activities.

Calendar connectors:

- Google Calendar: read free/busy and optionally write events.
- Microsoft 365 Outlook Calendar: read free/busy and optionally write events.
- CalDAV: optional fallback for generic calendars.

## SalesNav, LinkedIn, And Email Integration

Integrations should normalize external events into the same internal records:

- Leads
- Assignments
- Activities
- Integration sync logs

Connector interface:

```ts
interface Connector {
  provider: string;
  syncAccount(accountId: string): Promise<SyncResult>;
  testConnection(accountId: string): Promise<ConnectionHealth>;
}
```

Out-of-box connector modules:

- `salesnav`: import lead lists, messages, profile URLs, and sync status where available.
- `linkedin`: record profile URLs, connection/message events, manual imports, and supported browser-worker outputs.
- `email`: Gmail, Outlook, and IMAP-style ingestion of sent and received messages.
- `calendar`: Google, Microsoft, and CalDAV busy reads.

Important boundary:

- The CRM should not make LinkedIn browser automation a required core path.
- If automation workers exist, they publish normalized connector events to the backend.
- The backend remains the source of truth for CRM state.

## Backup Architecture

Daily GitHub backups are mandatory.

Use a dedicated private repository, for example:

```txt
example-org/orkestr-crm-backups
```

Backup worker responsibilities:

- Run at least once every 24 hours.
- Create `pg_dump` archive from PostgreSQL.
- Include a JSON metadata manifest.
- Optionally encrypt backup artifacts before commit.
- Commit and push backup artifacts to the configured GitHub backup repo.
- Record backup status in `backup_runs`.
- Expose backup health in `/api/health` and the UI.

Backup artifact layout:

```txt
backups/
  2026/
    06/
      2026-06-14T030000Z.dump
      2026-06-14T030000Z.manifest.json
```

Hard enforcement:

- Production containers require `BACKUP_GITHUB_REPO`.
- Production containers require backup credentials.
- Health check is degraded if the latest successful backup is older than 26 hours.
- Startup should fail in production if backup configuration is missing.
- A manual `backup:run` command must exist.
- A restore verification command must exist.

Backup manifest:

```json
{
  "createdAt": "2026-06-14T03:00:00.000Z",
  "database": "orkestr_crm",
  "format": "pg_dump_custom",
  "schemaVersion": "0001",
  "gitRepo": "example-org/orkestr-crm-backups",
  "commitSha": "..."
}
```

## Multi-Instance Rules

The API must be stateless.

Rules:

- No local file storage for runtime data.
- All durable state goes to PostgreSQL.
- Long-running work goes through Redis queues.
- Scheduled jobs use distributed locks.
- Migrations run as a one-shot container, not from every API instance.
- Backups run from one backup worker, protected by a lock.
- Connector sync jobs are idempotent and keyed by provider external IDs.

## Agent Branch And PR Workflow

Agents must work on dedicated branches.

Branch naming:

```txt
agent/<agent-name>/<short-task>
```

Examples:

```txt
agent/scheduler/calendar-freebusy
agent/integrations/email-sync
agent/ui/pipeline-signals
```

Rules:

- `main` is protected.
- Agents do not push directly to `main`.
- Every agent change lands through a dedicated PR.
- PRs should be scoped to one module or feature.
- PRs must include migration notes when schema changes.
- PRs must include backup/restore impact when persistence changes.
- CI must run typecheck, lint, tests, build, and migration checks.

Recommended CI gates:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm db:check`
- `pnpm compose:config`

## API Surface

Initial endpoints:

```txt
GET    /api/health
GET    /api/system/backup-health

GET    /api/leads
POST   /api/leads
PATCH  /api/leads/:id

GET    /api/flows
POST   /api/flows
PATCH  /api/flows/:id

GET    /api/assignments
POST   /api/assignments
PATCH  /api/assignments/:id

GET    /api/activities
POST   /api/activities

GET    /api/integration-accounts
POST   /api/integration-accounts
PATCH  /api/integration-accounts/:id
POST   /api/integration-accounts/:id/test
POST   /api/integration-accounts/:id/sync

GET    /api/event-types
POST   /api/event-types
PATCH  /api/event-types/:id

GET    /api/booking-links/:slug/availability
POST   /api/booking-links/:slug/book

POST   /api/import/leads-csv
GET    /api/export/leads-csv
GET    /api/export/backup-json
POST   /api/backups/run
```

## MVP Build Order

1. Monorepo scaffold with pnpm workspaces.
2. Docker Compose with `web`, `api`, `mcp`, `worker`, `scheduler`, `backup`, `postgres`, and `redis`.
3. Fastify API shell with config, logging, health, and database plugin.
4. Shared domain service layer used by HTTP API and MCP server.
5. MCP server shell with health, resources, and first read-only tools.
6. Drizzle schema and first migration.
7. Agent, agent action, and approval audit tables.
8. Backup worker with GitHub repo enforcement and manual backup command.
9. Angular shell with Signals, routing, API client, and layout.
10. Leads, flows, assignments, and activities CRUD.
11. MCP write tools for routine CRM operations.
12. Pipeline screen with status changes and next-action dates.
13. Scheduler module with event types, availability rules, booking links, and manual booking.
14. MCP scheduler tools for availability and booking workflows.
15. Calendar free/busy connector for at least one provider, then add the second.
16. Integration account registry and sync logs.
17. MCP integration tools for health checks and sync triggers.
18. Email connector MVP.
19. SalesNav/LinkedIn ingestion MVP through normalized connector events.
20. Git branch and PR MCP tools for agent code workflow.
21. CI gates and branch/PR workflow documentation.

## Explicit Non-Goals For The First Build

- Desktop management.
- Direct pushes to main.
- Multi-tenant billing.
- Complex CRM forecasting.
- Fully autonomous LinkedIn automation as a core requirement.
- Storing raw external credentials in ordinary application tables.

## Design Principles

- Track outreach state in assignments, not on leads.
- Treat activities as append-only operational truth.
- Treat MCP as the primary automation and agent contract.
- Keep UI, API, and MCP behavior backed by the same domain services.
- Audit every agent action.
- Keep connector outputs normalized and idempotent.
- Make backup health visible and enforceable.
- Make the app stateless above the database.
- Keep scheduler simple but correct: external busy reads, deterministic slot computation, transactional booking.
- Keep agent changes isolated in branches and synchronized through PR review.
