# Job search setup

Use this when you want oXRM to become a local job application workspace for a Codex or other MCP-capable assistant.

## Start

```bash
./oxrm start
./oxrm ready
./oxrm cli setup:job-search
./oxrm cli setup:job-search:get
```

Open the web app and go to:

```text
/setup/job-search
```

## What setup creates

The setup flow writes normal XRM records:

- `source_config` records for job boards, career pages, recruiter inboxes, referrals, CSVs, APIs, and manual sources
- `action_blueprint` records for importing jobs, calculating fit, creating CV variants, drafting cover letters, and follow-ups
- `automation_timer` records for daily import/scoring and daily review/drafts
- an `operator_playbook` record with human and agent instructions

No separate setup table is used. Agents and humans read the same XRM records.

## MCP resources

```bash
./oxrm cli mcp:read oxrm://setup/job-search
./oxrm cli mcp:read oxrm://playbook/job-search
./oxrm cli mcp:call job_search.get_setup --input '{}'
```

## Custom setup

```bash
./oxrm cli setup:job-search --input '{
  "sources": [
    {
      "title": "Target company career pages",
      "channel": "career_page",
      "sourceUrl": "https://example.invalid/careers",
      "cadence": "daily",
      "importInstructions": "Import role, company, source URL, raw job description, and discovered date."
    }
  ],
  "fitRubric": {
    "threshold": 80,
    "mustHave": ["TypeScript", "backend systems", "remote-friendly"],
    "exclusions": ["requires relocation"]
  }
}'
```

## Human control

Agents may import local records, calculate fit, draft CV changes, draft cover letters, draft follow-ups, and create tasks.

Humans still control final CV edits, final cover letters, external applications, uploads, recruiter messages, approvals, and final judgment.
