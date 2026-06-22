# Job Search With oXRM

You are applying to companies and sending CVs. oXRM tracks companies, roles,
job alerts, contacts, CV versions, cover letters, applications, events,
interviews, referrals, and follow-ups from your own machine.

## Demo

```bash
./oxrm reset
./oxrm start
./oxrm ready
./oxrm seed job-search
./oxrm cli setup:job-search:get
./oxrm urls
./oxrm cli mcp:read oxrm://setup/job-search
./oxrm cli mcp:read oxrm://playbook/job-search
./oxrm cli mcp:read crm://queue/today
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.applications"}'
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.job_alerts"}'
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.documents"}'
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.cover_letters"}'
```

## Expected Result

- see multiple synthetic applications across stages
- see incoming job alerts and jobs they map to
- see CV versions and cover letters linked to applications
- click an application row in the web UI and inspect related job, contact,
  documents, tasks, and timeline events
- draft a follow-up or application-review note, but do not send or upload
- record an event or task only after the human confirms the external action

## Local Loop

Target company -> role context -> CV/application event -> follow-up task ->
draft -> human review -> external action -> recorded event.

## What Codex Should Do

Ask Codex to:

1. read the job-search playbook
2. inspect setup, job sources, job alerts, postings, applications, fits, CV versions,
   cover letters, and action suggestions
3. pick one high-fit application or posting
4. summarize the job, company, contact, last touch, and fit tradeoffs
5. draft the next follow-up, cover-letter adjustment, or application-review note
6. leave sending, uploading, and final approval to the human

## What The Human Controls

- real job-board credentials and source access
- final CV and cover-letter content
- application submission
- email and recruiter messages
- approval or rejection of agent suggestions
- recording what actually happened externally
