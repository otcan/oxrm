# oXRM onboarding

Use `./oxrm init` from a fresh clone.

```bash
git clone https://github.com/otcan/oxrm.git
cd oxrm
./oxrm init
```

Choose one workspace:

- `job-search` for applications, CVs, cover letters, fit scoring, recruiters, and follow-ups
- `outreach` for leads, people, companies, tasks, drafts, and relationship history
- `blank` for structure only, without synthetic demo records

Non-interactive examples:

```bash
./oxrm init personal --template job-search --ports auto
./oxrm init sales --template outreach --ports auto
./oxrm init blank --template blank --ports auto
```

Print the actual local URLs and repair common Docker issues through the wrapper:

```bash
./oxrm urls
./oxrm doctor
./oxrm ports repair
./oxrm repair
```

## Job search loop

1. Add job sources: job boards, company career pages, recruiter inboxes, referrals, and manual URLs.
2. Add or edit the base CV template and cover letter template.
3. Import or paste job postings and job alerts.
4. Run fit scoring from the job description, CV, constraints, and context.
5. For high-fit jobs, create draft CV and cover letter versions.
6. Review approval tasks before applying or sending externally.
7. Record the external application, email, reply, rejection, interview, or follow-up.

## Outreach loop

1. Add lead sources: LinkedIn/Sales Navigator exports, CSVs, warm intros, inbound mail, website forms, or manual research.
2. Normalize people, companies, and leads.
3. Deduplicate records and map fields to shared meanings.
4. Ask an agent to summarize relationship context.
5. Draft messages only.
6. Record sent messages, replies, outcomes, and follow-up tasks after the human acts externally.

## Assistant rule

Codex, Claude, Gemini, Cursor, VS Code, or another MCP-capable assistant can
read queues, inspect records, summarize context, score fit, prepare drafts,
update local records, and create tasks.

Assistants should not send emails, LinkedIn messages, connection requests,
applications, or uploads unless a human explicitly approves and performs or
authorizes that external action.
