# Outreach setup

This page documents the intended setup flow for customer outreach, partnerships,
consulting leads, and founder-led sales.

The job-search setup is more automated today. Outreach uses the same XRM model
and should follow the same draft-only, approval-first pattern.

## Start

```bash
./oxrm init sales --template outreach --ports auto
./oxrm -i sales urls
```

Or on the default instance:

```bash
./oxrm start
./oxrm ready
./oxrm seed outreach
./oxrm urls
```

Open the web app and start from the pipeline.

## What outreach should configure

Sources:

- LinkedIn or Sales Navigator exports
- CSVs
- warm-introduction lists
- inbound email
- website forms
- manual research

Records:

- `company`
- `person`
- `lead`
- `opportunity`
- `message_draft`
- `follow_up_task`
- `timeline_event`
- `outcome`

Views:

- due follow-ups
- warm leads
- needs research
- waiting for reply
- recently contacted
- no next action

## Daily loop

1. Import or add leads.
2. Normalize people and companies.
3. Deduplicate records.
4. Ask an assistant to summarize relationship context.
5. Draft messages only.
6. Review approvals.
7. Send externally only after human approval.
8. Record the external action and next follow-up.

## Agent prompt

```text
Use oXRM as the local source of truth for outreach.

Read the pipeline, due follow-ups, people, companies, notes, drafts, and recent
events. Pick one lead that needs action. Summarize the relationship context,
propose the next action, and draft a short message.

Do not send anything. Do not claim a message was sent. Create a local note or
task only if I approve it.
```

## Human control

Humans control targeting, final message wording, sending, approvals, external
actions, account credentials, and final judgment.

oXRM should help organize and draft high-context outreach. It should not become
a spam sender, scraper, or bulk automation tool.
