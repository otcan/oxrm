# Outreach operator playbook

Use this when you want oXRM + Codex to become a local CRM/outreach workspace.

## Start

```bash
git clone https://github.com/otcan/oxrm.git
cd oxrm
./oxrm start
./oxrm ready
./oxrm seed outreach
./oxrm urls
```

## Fill These Sections

1. Sources: LinkedIn/Sales Navigator lists, CSVs, warm intros, inbound emails, and manual leads.
2. People: person identity, title, profile URL, company, segment, and notes.
3. Companies: company identity, domain, website, segment, and context.
4. Leads: status, source, next action, last touch, and owner.
5. Events: messages, calls, notes, replies, and decisions.
6. Tasks: due follow-ups, research, approvals, and cleanup.
7. Timers: daily sync, daily queue review, and follow-up drafting.

## Codex Discipline

Codex should draft and update local records only.

Codex may:
- summarize lead context
- propose next actions
- draft LinkedIn or email follow-ups
- create tasks and notes
- update local status fields

Codex must not:
- send LinkedIn messages
- send email
- send connection requests
- scrape or enrich leads without explicit permission
- claim an external action happened without human confirmation

## Daily Loop

Morning: sync sources and dedupe leads.

Midday: research warm leads and draft next actions.

Evening: record external actions, replies, outcomes, and follow-up tasks.
