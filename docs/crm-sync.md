# Future CRM Sync

oXRM should remain the outreach ledger for the bundled outreach preset even when a team also uses a larger CRM. External CRM systems are downstream or upstream integration targets, not replacements for the event contract.

## Direction

- Inbound sync imports account, contact, lead, owner, and status context into oXRM.
- Outbound sync exports deduplicated outreach activities, assignment status, meeting outcomes, and consent states.
- Bidirectional sync is allowed only when conflict rules are explicit and testable.

## Integration Boundary

Use `integration_accounts` to register provider accounts and `integration_sync_runs` to audit each sync attempt. Sync workers should report:

- provider and account id
- start and finish timestamps
- imported lead count
- imported activity count
- status and error details
- provider cursor or checkpoint in `resultJson`

## Identity Matching

Prefer provider-native ids when available. Fall back in this order:

1. External CRM record id.
2. Email address.
3. Profile URL stored in the appropriate provider field.
4. Manual review queue for ambiguous matches.

Do not silently merge leads on name alone.

## Conflict Rules

- oXRM owns outreach events created through `POST /api/outreach-events` and `crm.record_outreach_event`.
- External CRMs may own pipeline stage, account ownership, and billing/customer lifecycle fields.
- Connector workers should append activities instead of rewriting history.
- Destructive changes require an explicit approval flow.

## Initial Targets

The current schema is provider-neutral enough for HubSpot, Salesforce, Pipedrive, Attio, Twenty, and spreadsheet-style exports. The first implementation should be a pull-only import plus append-only activity export before adding bidirectional field updates.
