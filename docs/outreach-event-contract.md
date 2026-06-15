# Outreach Event Contract

The outreach event contract is the public integration boundary for senders. A sender can be a browser worker, email connector, import job, or another approved tool that has already completed an external action.

The sender records one successful event with `POST /api/outreach-events`. The API then:

1. Finds or creates the lead.
2. Finds or creates the active flow assignment.
3. Updates assignment state.
4. Appends one activity.
5. Deduplicates retries by `externalKey` or `activity.externalId`.

For events that should not create or update an outreach assignment, use `POST /api/events` instead. That endpoint appends the same activity timeline record and can attach the event to a lead, person, company, task, or a lead payload that will be identity-resolved.

## Request

```json
{
  "externalKey": "demo:connection:alex-rivera:2026-06-15T09:23:18Z",
  "lead": {
    "fullName": "Alex Rivera",
    "company": "Example Infrastructure Co",
    "title": "Head of Partnerships",
    "linkedinUrl": "https://example.invalid/linkedin/alex-rivera",
    "source": "demo:synthetic"
  },
  "assignment": {
    "status": "connection_sent",
    "lastContactedAt": "2026-06-15T09:23:18Z"
  },
  "activity": {
    "type": "connection_sent",
    "channel": "linkedin",
    "direction": "outbound",
    "subject": "Connection request",
    "body": "Synthetic connection request recorded for demo purposes.",
    "providerThreadId": "demo-thread-001",
    "providerMessageId": "demo-message-001",
    "occurredAt": "2026-06-15T09:23:18Z"
  }
}
```

## Required Fields

- `lead.fullName`: Human-readable lead name.
- One stable lead locator: `lead.linkedinUrl`, `lead.salesnavUrl`, `lead.email`, or a sender-managed `externalKey`.
- `activity.type`: One of the supported activity types in the schema.
- `activity.channel`: `linkedin`, `salesnav`, `email`, `scheduler`, or `manual`.
- `activity.direction`: `outbound`, `inbound`, or `internal`.

Useful activity types include `connection_request_sent`, `connection_request_received`, `message_sent`, `message_received`, `email_sent`, and `email_received`.

## Idempotency

Use `externalKey` for every event produced by an external sender. It should include the provider, provider-side object identity when available, action type, and occurrence timestamp.

Good synthetic examples:

- `demo:connection:alex-rivera:2026-06-15T09:23:18Z`
- `demo:email:sam-morgan:first-follow-up:2026-06-16T11:00:00Z`
- `import:salesnav:sample-list:row-0003:message_sent`

If the sender retries with the same key, the CRM returns the existing activity instead of creating a duplicate.

## Safe Example Values

Public examples must use synthetic people, synthetic companies, and reserved domains such as `example.invalid` or `example.test`. Do not include real profile URLs, inbox addresses, phone numbers, cookies, exported mailbox content, or production sender IDs in docs, tests, screenshots, fixtures, or demo seeds.

## MCP Equivalent

The MCP tool `crm.record_outreach_event` accepts the same shape as the HTTP endpoint. Prefer MCP when an agent is already operating through the MCP server; prefer HTTP for connector workers and external services.

Use MCP tool `crm.record_event` for general timeline writes such as inbound emails, received LinkedIn messages, accepted connection requests, and manual notes.
