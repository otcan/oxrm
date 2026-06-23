# Agent job search loop

This is the operating manual for a local assistant working with oXRM.

## First read

```bash
./oxrm cli mcp:read oxrm://setup/job-search
./oxrm cli mcp:read oxrm://playbook/job-search
./oxrm cli mcp:call job_search.get_setup_next --input '{}'
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.sources"}'
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.jobs"}'
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.applications"}'
```

## Daily loop

1. Read configured sources.
2. Create or update job postings and job alerts with source URL and raw
   description.
3. Create or update `job_fit` records using the configured rubric.
4. Suggest applications only when the fit is high or the human explicitly asks.
5. Draft CV variants and cover letters as XRM records/files.
6. Create approval tasks or action suggestions.
7. Wait for human approval before external action.
8. After the human applies or sends externally, record the communication ledger
   entry and next follow-up.

## Initial setup prompt

```text
Use Docker and local synthetic/demo-safe data unless I explicitly provide real
records.

Run or inspect the job-search setup:

1. Run `./oxrm cli setup:job-search:get`.
2. Run `./oxrm cli setup:job-search:next`.
3. Read `oxrm://setup/job-search`.
4. Read `oxrm://playbook/job-search`.
5. Tell me what sources, CV policy, cover-letter policy, fit rubric, timers,
   and approval boundaries are configured.
6. List blocking todos first, then warnings.
7. Do not send, upload, apply, or contact anyone.
```

## Daily import and scoring prompt

```text
Read the configured job-search sources and today's queue.

For each new synthetic or user-provided posting:
- preserve source URL
- preserve raw job description
- dedupe by company, title, location, and URL
- create or update the job posting record
- create or update a job_fit record
- explain strengths, gaps, risks, uncertainty, and suggested next action

Do not apply. Do not message recruiters. Do not upload documents.
```

## High-fit review prompt

```text
Run the job postings and job fits views.

Pick up to three high-fit jobs. For each one:
- summarize company, role, location, source, and application phase
- summarize fit evidence and gaps
- identify whether a CV version and cover letter exist
- propose the next local action
- mark whether human approval is required

Do not create external actions.
```

## CV and cover-letter drafting prompt

```text
Use the configured CV and cover-letter policy.

For the selected application:
- read the job posting
- read the job fit
- read existing CV versions and cover letters
- draft a role-specific CV change summary
- draft a cover letter only if the configured policy allows it
- create local draft records only if I approve

Do not invent experience. Do not upload or send anything.
```

## Follow-up prompt

```text
Read the application, communication ledger, responsible contact, last touch,
and next action date.

Draft one short follow-up. Include the reason for follow-up and any uncertainty.

Do not send the follow-up. If I approve, create a local draft or task only.
After I send externally, record the confirmed event and next follow-up.
```

## Safety boundary

Do not send email, LinkedIn messages, CVs, cover letters, job applications,
uploads, or recruiter replies from MCP tools.

Record external actions only after the human confirms they happened.
