# Demo Script

Use only the synthetic demo instance for public screenshots, clips, and release
walkthroughs.

## Setup

```bash
./oxrm reset
./oxrm start
./oxrm ready
./oxrm seed job-search
./oxrm test
./oxrm urls
```

Expected URLs:

```text
Web: http://127.0.0.1:18290
API: http://127.0.0.1:18291
MCP: http://127.0.0.1:18292/mcp
```

## Demo Story

I am doing outreach. Who needs follow-up today, what happened last, and what
should I do next?

That is the public demo. Show the local queue, inspect one synthetic record,
draft the next action, and make clear that nothing is sent automatically.

## Outcome Checklist

A good demo should show this complete loop:

1. A synthetic person, company, lead, or application needs action today.
2. oXRM shows what happened last.
3. oXRM shows the proposed next action and due date.
4. Codex reads the same queue through MCP.
5. Codex summarizes the relationship context.
6. Codex drafts the next action.
7. The human approval boundary is explicit.
8. A note, task, or event can be recorded after the human acts externally.

## 60-Second Walkthrough

1. Open the web URL.
2. Show the outreach queue: due work, overdue work, and recent events.
3. Open one synthetic application or lead.
4. Show what happened last, the linked context, and the next follow-up task.
5. Run:

```bash
./oxrm cli mcp:read crm://queue/today
```

6. Run:

```bash
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.applications"}'
```

7. Draft the next action in narration:

```text
Based on the last touch and fit notes, draft a short follow-up for the human to
review. Do not send it.
```

End by saying that oXRM is a self-hosted workspace for high-context outreach.
Agents can inspect and draft, but humans control sending, applications,
uploads, approvals, and final judgment.

## 3-Minute Walkthrough

1. Start with the Docker quickstart.
2. Show the dashboard queue and due work.
3. Open Views and run `Job Search Applications`.
4. Click one application row and show the linked job, responsible person, CV,
   cover letter, tasks, and timeline.
5. Open `Incoming Job Alerts`, `CV Versions`, and `Cover Letters`.
6. Open Tasks and show follow-ups due today.
7. Draft the next action in narration, but do not send anything.
8. Show where the draft would become an approval task, note, or event.
9. Run the MCP queue read and job application view commands.
10. Open Settings and explain that local data, backups, and exports are part of
   the trust model.

## Do Not Show

- Real LinkedIn profiles.
- Real emails, message bodies, phone numbers, or customer names.
- Backup repositories, tokens, `.env`, `instances/*.local.env`, dumps, logs, or
  private hostnames.
