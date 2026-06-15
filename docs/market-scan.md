# Market Scan: MCP-First CRM Starting Points

## Summary

There are open-source projects close to the Orkestr CRM direction, but no exact match for all current hard requirements:

- Angular with Signals
- Fastify
- Drizzle
- always containerized
- multi-instance runtime
- mandatory daily GitHub backups
- scheduler with external calendar reads
- SalesNav, LinkedIn, and email connectors
- MCP-first and agent-first operation
- branch and PR workflow for coding agents

The closest project to use immediately is Relaticle. The strongest CRM platform to extend is Twenty. The best LinkedIn-specific reference is OpenOutreach. None should be adopted without accepting stack and scope tradeoffs.

## Candidates

### Relaticle

Repository: https://github.com/relaticle/relaticle

Why it matters:

- Self-hosted CRM.
- Native MCP server.
- Advertises 30 MCP tools.
- REST API.
- PostgreSQL.
- Redis-supported queues.
- Active repository.

Tradeoffs:

- Stack is Laravel, Filament, Livewire, PHP, not Angular/Fastify/Drizzle.
- Not tailored to LinkedIn/SalesNav outreach flows by default.
- Does not appear to include our required daily GitHub backup enforcement model.
- Would mean adopting their platform direction instead of our planned TypeScript-first architecture.

Verdict:

- Best immediate product to try.
- Best proof that MCP-first CRM is a real category.
- Not the right base if Angular/Fastify/Drizzle are non-negotiable.

### Twenty

Repository: https://github.com/twentyhq/twenty

Why it matters:

- Large open-source CRM.
- TypeScript.
- Self-hostable.
- Designed for custom CRM apps, objects, workflows, and agents.
- Strong ecosystem and high GitHub activity.

Tradeoffs:

- Stack is not Angular/Fastify/Drizzle.
- Existing MCP support appears to be through community MCP servers rather than a native first-class MCP runtime.
- Bigger platform than we need for a minimal LinkedIn-flow CRM.
- Customizing it deeply may be more work than building our focused system.

Verdict:

- Best large CRM platform reference.
- Viable if we want to build on an existing CRM object/workflow platform.
- Less aligned with our current architecture than a greenfield TypeScript monorepo.

### Twenty CRM MCP Server

Repository: https://github.com/mhenry3164/twenty-crm-mcp-server

Why it matters:

- MCP bridge for Twenty.
- Supports CRM CRUD, schema discovery, and search.
- Useful reference for MCP tool shape.

Tradeoffs:

- Small project.
- Not a complete CRM.
- Depends on a Twenty CRM instance.
- Not enough for our scheduler, backup, integrations, or branch/PR requirements.

Verdict:

- Good MCP reference.
- Not a product base.

### Atomic CRM MCP Server

Repository: https://github.com/marmelab/atomic-crm-mcp

Why it matters:

- MCP server for Atomic CRM.
- Uses OAuth 2.1 and Supabase RLS.
- Supports ChatGPT, Claude, VS Code, Claude Code, Cursor, Goose, Codex CLI, and Gemini CLI clients.

Tradeoffs:

- MCP bridge, not our CRM product.
- Supabase-oriented.
- Not LinkedIn/SalesNav/scheduler focused.

Verdict:

- Strong reference for MCP auth and client compatibility.
- Not a base product.

### OpenOutreach

Repository: https://github.com/eracle/OpenOutreach

Why it matters:

- LinkedIn and email outreach automation focus.
- Self-hosted.
- AI lead discovery and qualification.
- Useful reference for LinkedIn-oriented workflows.

Tradeoffs:

- Stack is Python.
- More automation/campaign tool than CRM.
- Not MCP-first.
- Not aligned with our scheduler, backup, or agent PR workflow requirements.

Verdict:

- Good reference for LinkedIn outreach mechanics.
- Not a CRM base.

## Recommendation

Use Relaticle as the immediate benchmark and Twenty as the large-platform reference, but keep Orkestr CRM greenfield if the hard stack requirements remain:

- Angular with Signals
- Fastify
- Drizzle
- containerized multi-instance runtime
- mandatory GitHub backups
- MCP-first agent operation

Practical next step:

1. Spin up Relaticle locally to inspect its MCP tool design.
2. Inspect Twenty's object/workflow model and the community MCP server.
3. Borrow patterns, but build Orkestr CRM as a focused TypeScript monorepo unless we decide stack requirements can change.
