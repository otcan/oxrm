# Demo Script

Use only the synthetic demo instance for public screenshots, clips, and release
walkthroughs.

## Setup

```bash
./oxrm reset
./oxrm start
./oxrm ready
./oxrm demo
./oxrm test
./oxrm urls
```

Expected URLs:

```text
Web: http://127.0.0.1:18290
API: http://127.0.0.1:18291
MCP: http://127.0.0.1:18292/mcp
```

## 60-Second Walkthrough

1. Open the web URL.
2. Show Dashboard metrics, due tasks, and recent events.
3. Open Leads and select a synthetic lead.
4. Open Views and run `Job Search Applications`.
5. Run:

```bash
./oxrm cli mcp:read crm://queue/today
```

6. Run:

```bash
./oxrm cli mcp:call crm.search_leads --input '{"query":"founder"}'
```

End by saying that oXRM is the relationship ledger; LinkedIn mechanics live in
`ork-linkedin` and integrate through MCP/API only.

## 3-Minute Walkthrough

1. Start with the Docker quickstart.
2. Show Dashboard due work.
3. Open Leads and inspect a lead timeline.
4. Open Tasks and show the follow-up queue.
5. Open Events and show structured metadata for a synthetic outreach event.
6. Open Views and run a saved job-search view.
7. Run the MCP queue read and lead search commands.
8. Open Settings and explain backup health as a product requirement.

## Do Not Show

- Real LinkedIn profiles.
- Real emails, message bodies, phone numbers, or customer names.
- Backup repositories, tokens, `.env`, `instances/*.local.env`, dumps, logs, or
  private hostnames.
