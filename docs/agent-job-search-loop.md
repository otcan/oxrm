# Agent job search loop

This is the default operating loop for a local assistant working with oXRM.

## First read

```bash
./oxrm cli mcp:read oxrm://setup/job-search
./oxrm cli mcp:read oxrm://playbook/job-search
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.sources"}'
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.jobs"}'
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.applications"}'
```

## Loop

1. Read configured sources.
2. Create or update job postings and job alerts with source URL and raw description.
3. Create or update `job_fit` records using the configured rubric.
4. Suggest applications only when the fit is high or the human explicitly asks.
5. Draft CV variants and cover letters as XRM records/files.
6. Create approval tasks or action suggestions.
7. Wait for human approval before external action.
8. After the human applies or sends externally, record the communication ledger entry and next follow-up.

## Safety boundary

Do not send email, LinkedIn messages, CVs, cover letters, job applications, uploads, or recruiter replies from the MCP tools.

Record external actions only after the human confirms they happened.
