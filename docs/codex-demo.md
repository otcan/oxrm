# Codex Demo

A Codex user can run oXRM locally, inspect the synthetic outreach queue, and ask
Codex to prepare next actions without real credentials or real personal data.

## Run The Demo

```bash
./oxrm codex-demo
```

Then inspect the local demo:

```bash
./oxrm cli health
./oxrm cli mcp:read crm://queue/today
./oxrm cli mcp:call crm.search_leads --input '{"query":"founder"}'
./oxrm urls
```

The demo uses synthetic data only.

## Codex Prompt: Outreach

Clone and run this project locally.

Use Docker. Do not use real credentials or real personal data.

Steps:

1. Run `./oxrm codex-demo`.
2. Confirm the web, API, and MCP URLs.
3. Read today's outreach queue with `./oxrm cli mcp:read crm://queue/today`.
4. Search synthetic leads with `./oxrm cli mcp:call crm.search_leads --input '{"query":"founder"}'`.
5. Pick one synthetic founder or growth lead.
6. Summarize the person, company, relationship context, last touch, and next action.
7. Propose the next outreach action.
8. Draft a short follow-up message.
9. Do not send anything.
10. Record a synthetic note or task only if the local tools support it.

At the end, summarize:

- what oXRM stores
- how the queue works
- how an agent can help
- what still requires human approval

## Codex Prompt: Job Search

Use Docker. Do not use real credentials or real personal data.

Steps:

1. Run `./oxrm codex-demo`.
2. Open the Web URL from `./oxrm urls`.
3. Read the setup with `./oxrm cli mcp:read oxrm://setup/job-search`.
4. Read the playbook with `./oxrm cli mcp:read oxrm://playbook/job-search`.
5. Read today's queue with `./oxrm cli mcp:read crm://queue/today`.
6. Inspect job applications with `./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.applications"}'`.
7. Inspect job fits with `./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.job_fits"}'`.
8. Pick one high-fit synthetic application.
9. Summarize the job, company, contact, last touch, fit tradeoffs, CV version, cover letter, and next action.
10. Draft the next follow-up or application-review note.
11. Do not send an email, upload an application, or claim anything was sent.

At the end, summarize:

- what oXRM stores for a job application
- how job fit records guide next actions
- how CV and cover-letter drafts stay linked
- what still requires human approval

## Outcome To Demonstrate

The demo should prove one loop:

1. A lead or application needs attention today.
2. oXRM knows the last touch and related context.
3. Codex can read the local queue and saved views.
4. Codex can draft a next action.
5. Nothing is sent automatically.
6. A human can record the external action later as an event, note, or task.
