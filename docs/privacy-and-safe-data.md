# Privacy And Safe-Data Handling

oXRM stores relationship, outreach, task, and timeline state. Treat all production data as sensitive, even when a single field looks public.

## Data Classes

- Public-safe demo data: synthetic names, synthetic companies, `.invalid` or `.test` URLs, and non-deliverable emails.
- Operational metadata: flow names, assignment statuses, timestamps, connector states, and backup health.
- Personal data: real names, profile URLs, emails, phone numbers, notes, message bodies, meeting details, and company context tied to a person.
- Secrets: database URLs, tokens, cookies, OAuth refresh tokens, backup repo tokens, and private repository names.

## Repository Rules

- Commit only public-safe demo data.
- Keep `instances/*.local.env`, `.env`, `.backups/`, logs, and local exports out of git.
- Use `instances/demo.env.example` for public examples.
- Use `pnpm db:demo` for screenshots and smoke walkthroughs.
- Do not paste production message bodies, profile URLs, cookies, or mailbox exports into issues, PRs, docs, fixtures, or tests.

## Runtime Rules

- Bind development services to `127.0.0.1` unless an authenticated reverse proxy is configured.
- Store connector credentials outside the database when possible and keep only `credentialsRef` in CRM records.
- Run backup verification before relying on a new instance.
- Rotate tokens after any accidental log, screenshot, or issue exposure.

## Public Release Scan

Before publishing a branch or repository export:

```bash
rg -n "linkedin\\.com/in|salesnav|cookie|token|secret|password|gmail|outlook|@gmail\\.com|@outlook\\.com|known-private-name" .
git status --short
```

Review matches manually. Schema names such as `linkedinUrl`, enum values such as `salesnav`, and placeholder env variable names are expected; real profile URLs, real people, real emails, and filled secrets are not.
