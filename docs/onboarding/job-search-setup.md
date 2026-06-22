# Job search setup

Use this when you want oXRM to become a local job application system that a
human and an assistant can operate together.

## Start

```bash
./oxrm start
./oxrm ready
./oxrm cli setup:job-search
./oxrm cli setup:job-search:get
./oxrm urls
```

Open the web app and go to:

```text
/setup/job-search
```

## What setup creates

The setup flow writes normal XRM records:

- `source_config` records for job boards, career pages, recruiter inboxes,
  referrals, CSVs, APIs, and manual sources
- `action_blueprint` records for importing jobs, calculating fit, creating CV
  variants, drafting cover letters, and preparing follow-ups
- `automation_timer` records for daily import/scoring and daily review/drafts
- an `operator_playbook` record with human and agent instructions

No separate setup table is used. Agents and humans read the same XRM records.

## Sources

Sources are where jobs come from.

Examples:

- job boards and saved alerts
- company career pages
- recruiter inboxes
- referral lists
- CSV imports
- manual URLs

Each source should say how to import it, how often to review it, and what
privacy limits apply.

## CV strategy

The CV strategy tells the assistant how to handle CV work.

Supported modes:

- `master`: keep one CV
- `master_plus_variants`: keep a base CV and create focused variants
- `role_specific`: create a variant for each application
- `manual`: human edits only

Use the setup page to record the base CV path and editing rules. The assistant
may draft local CV versions, but the human approves final claims and uploads.

## Cover-letter strategy

The cover-letter strategy controls when letters are drafted.

Supported modes:

- `never`
- `high_fit_only`
- `every_application`
- `manual`

Set a threshold so low-fit jobs do not generate unnecessary documents.

## Fit rubric

The fit rubric tells the assistant how to score a job posting.

Define:

- high-fit threshold
- must-have criteria
- nice-to-have criteria
- exclusion criteria
- scoring discipline

Fit scores are suggestions. They should include evidence, uncertainty, gaps,
and the proposed next action.

## Timers

The setup creates two timer records:

- daily import and fit scoring
- daily review, drafts, and follow-ups

Today these timers are setup records and operating instructions. They are not a
guarantee that a background job has run. A human or assistant still needs to
execute the loop until scheduled execution is wired for the relevant source.

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

Agents may import local records, calculate fit, draft CV changes, draft cover
letters, draft follow-ups, and create tasks.

Humans still control final CV edits, final cover letters, external
applications, uploads, recruiter messages, approvals, and final judgment.

## Verify

```bash
bash scripts/smoke-job-search-setup.sh
```
