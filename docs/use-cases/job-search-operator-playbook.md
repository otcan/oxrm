# Job search operator playbook

Use this when you want oXRM + Codex to become a local job application system.

## Start

```bash
git clone https://github.com/otcan/oxrm.git
cd oxrm
./oxrm start
./oxrm ready
./oxrm seed job-search
./oxrm urls
```

## Fill These Sections

1. Sources: job boards, company career pages, recruiter inboxes, referrals, and manual URLs.
2. CV template: the base CV record and editable source body.
3. Cover letter template: the base short message and editable source body.
4. Job postings: raw posting URL, platform, company, title, description, and status.
5. Fit records: fit rate, matching skills, missing skills, risks, and recommended action.
6. Applications: posting, contact, phase, CV version, cover letter, communication ledger, and next action.
7. Timers: daily import, daily fit scoring, daily draft generation, and follow-up review.

## Codex Discipline

Codex should draft and update local records only.

Codex may:
- import or summarize job postings
- calculate and explain fit
- create draft CV and cover letter variants
- prepare follow-up drafts
- create tasks and notes

Codex must not:
- send applications
- send emails
- upload documents
- claim an external action happened without human confirmation

## Daily Loop

Morning: import sources, dedupe postings, and score fit.

Midday: review high-fit suggestions and edit application packets.

Evening: review follow-ups, draft messages, and record any external actions the human actually took.
