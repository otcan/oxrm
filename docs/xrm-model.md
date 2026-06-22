# XRM model

oXRM is XRM-first. That means the product is built around configurable records
and relationships instead of one hard-coded CRM pipeline.

## Core pieces

Object types define the shape of records. Examples: `job`, `application`,
`job_fit`, `cv_version`, `lead`, `company`, and `person`.

Records are the actual items you work with. A job posting, CV version, lead, or
cover letter is a record.

Fields are dynamic values on records. The same concept can have different field
names on different object types.

Semantic fields and mappings tell oXRM that different object types share a
meaning. For example, a lead, customer, and deal can all have an agency/company
field even if their display-name fields differ.

Relationships link records to records. An application can target a job, use a
CV version, use a cover letter, have a responsible contact, and have a fit
assessment.

Views are saved ways to list records. They can be tables, cards, queues,
timelines, or boards.

Files are linked artifacts. They can represent CV drafts, cover-letter drafts,
source documents, exports, or imported data.

Events are timeline entries. They record what happened.

Tasks are next actions. They record what should happen next.

Approvals are human gates. They make draft-only work explicit.

## Job search example

```text
Job Source
  -> Job Posting
  -> Job Fit
  -> Application
  -> CV Version
  -> Cover Letter
  -> Communication Ledger
  -> Follow-up Task
```

The important point is that each item is a record. The UI, API, CLI, and MCP
tools all read the same XRM state.

## Outreach example

```text
Lead Source
  -> Company
  -> Person
  -> Lead
  -> Opportunity
  -> Message Draft
  -> Approval
  -> Event
  -> Follow-up Task
```

This is why oXRM is different from installing a fixed CRM package. You are not
limited to a sales pipeline. You can model job search, recruiting, partnerships,
customer discovery, investor outreach, and other relationship-heavy workflows
with the same record model.

## Agent boundary

Agents should use XRM records as the source of truth:

```bash
./oxrm cli mcp:call xrm.search_records --input '{"objectType":"job","query":"platform"}'
./oxrm cli mcp:call xrm.get_record --input '{"recordId":"..."}'
./oxrm cli mcp:call xrm.run_view --input '{"key":"job_search.applications"}'
```

Agents may create records, relationships, notes, and tasks when the human has
asked for that local change.

Agents must not treat local drafts as sent messages or submitted applications.
External action still needs human approval and confirmation.
