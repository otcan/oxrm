# MCP Tools And Resources

oXRM exposes relationship state through MCP so agents can read queues, look up
records, run saved views, and write human-auditable events without clicking
through the web UI.

Use the Dockerized CLI for normal local runs:

```bash
./oxrm tools
./oxrm cli mcp:call crm.search_leads --input '{"query":"founder"}'
./oxrm cli mcp:read crm://queue/today
```

The default demo MCP URL is `http://127.0.0.1:18292/mcp`. Prefer `./oxrm urls`
for the authoritative URL when ports are customized.

## Resources

- `crm://queue/today`: tasks and follow-ups due today.
- `crm://queue/overdue`: overdue follow-up queue.
- `crm://backups/latest`: latest backup health metadata.
- `crm://leads/{leadId}`: one lead record.
- `xrm://records/{recordId}`: one generic oXRM record.

Example:

```bash
./oxrm cli mcp:read crm://queue/today
```

## Read Tools

- `crm.search_leads`
- `crm.search_people`
- `crm.search_companies`
- `crm.search`
- `crm.get_lead`
- `crm.list_lead_events`
- `crm.list_lead_tasks`
- `crm.list_tasks`
- `crm.search_tasks`
- `crm.get_task`
- `crm.get_daily_queue`
- `crm.get_overdue_queue`
- `crm.list_events`
- `crm.search_events`
- `crm.get_event`
- `crm.get_backup_health`
- `xrm.list_object_types`
- `xrm.search_records`
- `xrm.get_record`
- `xrm.list_relationships`
- `xrm.list_record_events`
- `crm.list_views`
- `crm.get_view`
- `crm.run_view`
- `xrm.list_views`
- `xrm.run_view`

## Write Tools

Write tools are intended for explicit agent workflows with human approval where
appropriate. They update the local oXRM ledger and should use synthetic data in
the public demo.

- `crm.create_lead`
- `crm.update_lead`
- `crm.create_task`
- `crm.update_task`
- `crm.complete_task`
- `crm.postpone_task`
- `crm.cancel_task`
- `crm.create_flow`
- `crm.assign_lead_to_flow`
- `crm.record_outreach_event`
- `crm.record_event`
- `crm.log_activity`
- `crm.add_note`
- `crm.update_assignment_status`
- `crm.create_event_type`
- `crm.create_booking`
- `crm.request_approval`
- `crm.create_view`
- `crm.update_view`
- `crm.delete_view`
- `xrm.create_object_type`
- `xrm.upsert_record`
- `xrm.create_relationship_type`
- `xrm.link_records`
- `xrm.create_view`

## Agent Expectations

- Read before writing.
- Prefer `crm://queue/today`, saved views, and search tools for context.
- Record external actions once, using idempotency keys where the tool supports
  them.
- Do not use public demo data as real personal data.
- Do not automate LinkedIn scraping, spam, or mass outreach.

## Useful Examples

Search leads:

```bash
./oxrm cli mcp:call crm.search_leads --input '{"query":"founder"}'
```

Run a saved view:

```bash
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.applications"}'
```

Record a note:

```bash
./oxrm cli mcp:call crm.add_note --input '{"leadId":"demo-lead-id","body":"Synthetic demo note."}'
```
