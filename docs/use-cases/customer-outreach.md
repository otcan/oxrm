# Customer Outreach With oXRM

You are reaching out to potential customers. oXRM tracks leads, companies,
conversations, proposed messages, next actions, and outcomes from your own
machine.

## Demo

```bash
./oxrm start
./oxrm ready
./oxrm seed outreach
./oxrm cli mcp:call crm.search_leads --input '{"query":"founder"}'
./oxrm cli mcp:read crm://queue/today
```

## Expected Result

- see due synthetic leads
- inspect one contact, company, task, and recent event
- summarize the last touch and why the lead needs attention
- draft the next action, but do not send
- record synthetic activity only after the human confirms the external action

## Local Loop

Target account -> contact context -> draft -> approval -> external action ->
event -> follow-up.

## What Codex Should Do

Ask Codex to:

1. read the outreach playbook
2. inspect lead sources, people, companies, leads, open tasks, and recent events
3. pick one due synthetic founder or growth lead
4. summarize relationship context, last touch, and next action
5. draft a short follow-up message for human review
6. create a task or note only when the local tools support it
7. avoid sending LinkedIn messages, emails, or connection requests

## What The Human Controls

- real source credentials and exports
- targeting and qualification
- final message copy
- LinkedIn connection requests
- email sending
- approval or rejection of agent suggestions
- recording what actually happened externally

See [Outreach setup](../onboarding/outreach-setup.md) for the source, field,
view, and daily-loop setup an assistant should follow before writing records.
