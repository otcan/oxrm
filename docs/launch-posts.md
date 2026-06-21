# Launch Posts

## GitHub Description

Self-hosted outreach workspace for job search, customer outreach, follow-ups,
and agent-assisted relationship work.

Topics:

```text
self-hosted
outreach
job-search
crm
xrm
agents
mcp
docker
local-first
sales
founder-tools
```

## Hacker News

Title:

```text
Show HN: oXRM, a self-hosted outreach workspace for job search and founder-led sales
```

Post:

```md
I built oXRM because my outreach was split across spreadsheets, inboxes, browser tabs, notes, and AI chats.

The first public version is a local Docker app for managing high-context outreach:

- job applications and CV follow-ups
- customer outreach
- partnerships
- founder-led sales
- warm leads and relationship follow-ups

It is not a scraper, spam tool, or bulk sender.

The core loop is:

Target -> context -> draft -> approval -> external action -> event -> follow-up.

Agents can read queues, inspect records, draft next actions, and write audited notes/tasks through local tools. Humans stay in control of what actually gets sent.

Quickstart:

git clone https://github.com/otcan/oxrm.git
cd oxrm
./oxrm start
./oxrm ready
./oxrm seed job-search
./oxrm test
./oxrm urls

The demo uses synthetic data only.
```

## r/selfhosted

Title:

```text
I built a self-hosted outreach workspace for job applications, sales follow-ups, and warm leads
```

Post:

```md
I built oXRM as a Dockerized local workspace for high-context outreach: job applications, customer outreach, partnerships, founder-led sales, and warm leads.

It is not a scraper, spam tool, or bulk sender. The demo uses synthetic data only.

The local loop is: target -> context -> draft -> approval -> external action -> event -> follow-up.

Quickstart:

git clone https://github.com/otcan/oxrm.git
cd oxrm
./oxrm start
./oxrm ready
./oxrm seed outreach
./oxrm test
./oxrm urls

I am looking for feedback from people who self-host their own sales, job-search, consulting, or partnership workflows.
```

## Codex-Focused

Title:

```text
I made a local outreach workspace that Codex can inspect and operate through MCP
```

Post:

```md
oXRM is a self-hosted outreach workspace that Codex can inspect locally.

Codex can read today's queue, search synthetic leads, summarize context, and draft the next action without sending anything.

Try:

bash scripts/codex-demo.sh

The demo uses Docker and synthetic data only.
```
