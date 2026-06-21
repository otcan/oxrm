# oXRM

[![CI](https://github.com/otcan/oxrm/actions/workflows/ci.yml/badge.svg)](https://github.com/otcan/oxrm/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 22+](https://img.shields.io/badge/node-22%2B-339933.svg)](package.json)
[![Docker](https://img.shields.io/badge/runtime-Docker-2496ED.svg)](docker-compose.yml)

Self-hosted outreach workspace for job search, customer outreach, partnerships,
and founder-led sales.

Run your outreach from your own machine. Keep contacts, companies,
applications, leads, notes, tasks, follow-ups, drafts, and activity history
under your control.

oXRM is for high-context outreach, not spam. It helps humans and agents manage
who to contact, what happened, what should happen next, and what needs approval.

![oXRM dashboard with synthetic demo data](docs/assets/oxrm-dashboard.png)

## Who This Is For

- job seekers sending CVs and tracking applications
- founders doing customer discovery or sales outreach
- consultants managing warm leads and follow-ups
- agencies running high-context client outreach
- operators who want agents to help draft, organize, and update outreach state

## One-Command Local Setup

Requirements: Docker Engine. Docker Compose is preferred; direct Docker fallback
is built into `./oxrm`.

```bash
git clone https://github.com/otcan/oxrm.git
cd oxrm
./oxrm init personal --template job-search --ports auto
```

Open the Web URL printed by `./oxrm urls`, then go to `/start` for the guided
setup checklist.

For a blank local workspace instead of demo records:

```bash
./oxrm init --template blank
```

## Try With An Assistant

After cloning the repo, run oXRM locally and connect the assistant you use:
Codex, Claude, Gemini, Cursor, VS Code, or another MCP-capable tool.

```bash
./oxrm init personal --template job-search --ports auto
./oxrm -i personal urls
```

Register the printed MCP endpoint in your assistant, then ask it:

> Inspect my local oXRM workspace, read today's queue, inspect job postings and
> applications, summarize the linked context, and draft the next action without
> sending anything or modifying records unless I approve it.

The demo uses synthetic data only.

## Job Search Workflow

Use oXRM to track job sources, postings, fit calculations, applications, CV
versions, cover letters, recruiter contacts, communication history, phases, and
follow-up tasks.

```bash
./oxrm init --template job-search
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.applications"}'
./oxrm cli mcp:read crm://queue/today
```

The job-search structure is XRM-native: job postings, job fits, applications,
CV versions, cover letters, communication ledger entries, and action
suggestions are records with relationships, tasks, events, and files.

## Customer Outreach Workflow

Use oXRM to track sources, people, companies, leads, opportunities, message
drafts, approvals, outcomes, and follow-ups.

```bash
./oxrm init --template outreach
./oxrm cli mcp:call crm.search_leads --input '{"query":"founder"}'
./oxrm cli mcp:read crm://queue/today
```

Agents can read queues, inspect relationship history, propose next actions,
draft messages, and write audited notes/tasks. Humans still control sending,
approvals, and real external actions.

## What oXRM Stores

- XRM object types, records, dynamic fields, semantic field mappings, saved
  views, and record-to-record relationships
- people, companies, leads, applications, opportunities, tasks, files, drafts,
  approvals, and timeline events
- job-search templates for sources, job postings, job fits, CV versions, cover
  letters, phases, communication ledger entries, timers, and suggestions
- outreach templates for leads, opportunities, message drafts, follow-ups,
  outcomes, and suggested actions
- local backup metadata and optional GitHub backup artifacts

## What This Is Not

oXRM is not a spam tool, scraper, bulk sender, lead database, or Salesforce
clone.

It does not exist to automate low-quality mass outreach. It exists to help you
manage high-context outreach that still needs judgment.

## Self-Hosting

Normal usage runs through Docker:

```bash
./oxrm start
./oxrm ready
./oxrm seed job-search
./oxrm test
./oxrm urls
```

`./oxrm init` assigns local ports automatically. Print them with `./oxrm urls`:

```text
Web: http://127.0.0.1:<web-port>
API health: http://127.0.0.1:<api-port>/api/health
MCP health: http://127.0.0.1:<mcp-port>/health
```

`./oxrm ready` runs migrations and baseline seed only. Demo records are opt-in:

```bash
./oxrm seed job-search
./oxrm seed outreach
./oxrm seed none --reset-demo
```

Multiple instances are isolated by env file, Docker project name, ports, and
database volume:

```bash
./oxrm init client-a --template blank
./oxrm -i client-a urls
```

If ports or containers get into a bad state, use the repair flow before editing
files by hand:

```bash
./oxrm doctor
./oxrm ports repair
./oxrm repair
```

Use `./oxrm -i <instance> upgrade` for repeatable updates. It backs up, verifies
the latest artifact, migrates, seeds baseline configuration, restarts services,
and smoke-tests the instance. Local backups work without a GitHub token; set
`BACKUP_GITHUB_REPO` and `BACKUP_GITHUB_TOKEN` only when you want remote backup
pushes.

## MCP And API

MCP names remain stable for compatibility:

```bash
./oxrm cli health
./oxrm tools
./oxrm cli mcp:read crm://queue/today
./oxrm cli mcp:call crm.search_leads --input '{"query":"founder"}'
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.applications"}'
```

The compatibility environment variables `CRM_API_URL` and `CRM_MCP_URL` are
still supported beside `OXRM_API_URL` and `OXRM_MCP_URL`.

## Docs

- [Onboarding](docs/onboarding.md)
- [Assistant-specific Codex demo](docs/codex-demo.md)
- [Job search](docs/use-cases/job-search.md)
- [Customer outreach](docs/use-cases/customer-outreach.md)
- [Self-hosted outreach](docs/self-hosted-outreach.md)
- [Local-first usage](docs/local-first.md)
- [MCP](docs/mcp.md)
- [Live demos](docs/live-demos.md)
- [Troubleshooting](docs/troubleshooting.md)

`./ocrm` is a deprecated compatibility wrapper around `./oxrm` for one release.
New automation should call `./oxrm`.

## License

MIT
