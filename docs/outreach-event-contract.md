# Outreach Event Contract

The outreach event contract is the public integration boundary for senders. A sender can be a browser worker, email connector, import job, or another approved tool that has already completed an external action.

The sender records one successful event with `POST /api/outreach-events`. The API then:

1. Finds or creates the lead.
2. Finds or creates the active flow assignment.
3. Updates assignment state.
4. Creates or updates the linked next-action task when the event type calls for one.
5. Appends one activity with structured metadata.
6. Deduplicates retries by `externalKey` or `activity.externalId`.

Outreach senders should treat this as the canonical write path after a successful external send. Direct `POST /api/events` writes remain supported for manual notes, inbound/non-outreach timeline entries, imports, and events that should not create or update an outreach assignment.

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
    "subject": "Connection request sent: Alex Rivera",
    "noteStatus": "unconfirmed",
    "proposedNote": "Synthetic proposed connection note.",
    "linkedinResult": "native_send_verified_pending",
    "sourceQuery": "synthetic infrastructure partnerships",
    "searchPage": 1,
    "profileUrl": "https://example.invalid/linkedin/alex-rivera",
    "providerThreadId": "demo-thread-001",
    "providerMessageId": "demo-message-001",
    "occurredAt": "2026-06-15T09:23:18Z"
  },
  "nextActionTask": {
    "dueInDays": 5,
    "metadata": {
      "source": "demo"
    }
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

## Structured Outreach Metadata

Use structured metadata instead of packing sender evidence into `activity.body`.

- `activity.subject`: human-readable action summary, for example `Connection request sent: Alex Rivera`.
- `activity.body`: exact note/message text only when the sender confirmed it was sent.
- `activity.noteStatus`: `confirmed_sent`, `no_note`, or `unconfirmed`.
- `activity.proposedNote`: intended note text when the sender could not confirm it was sent.
- `activity.linkedinResult`: visible browser or provider verification result.
- `activity.sourceQuery`: source search query.
- `activity.searchPage`: source search page number.
- `activity.auditDirectory`: private/local path or handle for raw run artifacts.
- `activity.rowText`: visible candidate row text.
- `activity.profileUrl`: profile URL used by the sender.

The API stores these fields under activity `metadata` and preserves any additional `activity.metadata` keys.

## Linked Next-Action Task

By default, canonical outreach writes create or update one linked task when the event implies follow-up work:

- `connection_sent` or `connection_request_sent`: `Check acceptance: <lead>`, due in 5 days.
- `connection_accepted`: `Approve first message: <lead>`, due immediately unless overridden.
- `message_received` or `email_received`: `Review reply: <lead>`, due immediately unless overridden.
- `follow_up_due`: `Follow up: <lead>`.

Override task behavior with `nextActionTask`:

- `false`: do not create a task.
- `title`, `description`, `type`, `status`, `priority`: task fields.
- `dueAt`: exact due timestamp.
- `dueInDays`: relative due date when `dueAt` is omitted.
- `idempotencyKey`: caller-supplied stable key. If omitted, the API derives one from the profile/lead locator and action kind.
- `metadata`: extra task metadata.

## Idempotency

Use `externalKey` for every event produced by an external sender. It should include the provider, provider-side object identity when available, action type, and occurrence timestamp.

Good synthetic examples:

- `demo:connection:alex-rivera:2026-06-15T09:23:18Z`
- `demo:email:sam-morgan:first-follow-up:2026-06-16T11:00:00Z`
- `import:salesnav:sample-list:row-0003:message_sent`

If the sender retries with the same key, the CRM returns the existing activity instead of creating a duplicate.

## Legacy Normalization

Use `POST /api/outreach-events/backfill` or CLI command `outreach:backfill` to normalize old `connection_sent` activities whose body contains unstructured sender evidence.

Dry run is the default:

```bash
./oxrm cli outreach:backfill --limit 25
```

Execute after reviewing samples:

```bash
./oxrm cli outreach:backfill --execute --limit 25
```

The backfill keeps activity IDs stable, preserves the original body in `metadata.originalBody`, moves unconfirmed intended notes to `metadata.proposedNote`, sets `metadata.noteStatus`, adds a useful subject, and can create missing acceptance-check tasks.

## Safe Example Values

Public examples must use synthetic people, synthetic companies, and reserved domains such as `example.invalid` or `example.test`. Do not include real profile URLs, inbox addresses, phone numbers, cookies, exported mailbox content, or production sender IDs in docs, tests, screenshots, fixtures, or demo seeds.

## MCP Equivalent

The MCP tool `crm.record_outreach_event` accepts the same shape as the HTTP endpoint. Prefer MCP when an agent is already operating through the MCP server; prefer HTTP for connector workers and external services.

Use MCP tool `crm.record_event` for general timeline writes such as inbound emails, received LinkedIn messages, accepted connection requests, and manual notes.
