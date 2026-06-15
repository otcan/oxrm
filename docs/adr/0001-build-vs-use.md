# ADR 0001: Build Orkestr CRM Instead Of Adopting An Existing CRM

## Status

Accepted

## Context

Orkestr CRM has specific hard requirements:

- MCP-first and agent-first operation.
- Angular frontend with Signals.
- Node.js backend with Fastify.
- Drizzle ORM.
- Always-containerized runtime.
- Multi-instance deployment.
- Mandatory daily GitHub database backups.
- Built-in scheduler with external calendar reads.
- Out-of-box SalesNav, LinkedIn, email, and calendar integration boundaries.
- No desktop management domain model.
- Agent branch and PR workflow as a first-class product workflow.

Market scan found useful adjacent projects:

- Relaticle: closest MCP-first CRM benchmark, but Laravel/PHP/Filament/Livewire.
- Twenty: strong TypeScript CRM platform, but larger than needed and not aligned with Angular/Fastify/Drizzle.
- Twenty CRM MCP Server: useful MCP bridge reference, not a complete product base.
- Atomic CRM MCP Server: useful MCP auth/client reference, not a CRM base.
- OpenOutreach: useful LinkedIn/email outreach reference, not an MCP-first CRM.

## Decision

Build Orkestr CRM as a focused greenfield TypeScript monorepo.

Use existing projects as references and benchmarks, not as the base application.

## Rationale

Adopting Relaticle would get us closest to MCP-first CRM behavior immediately, but it would force a PHP/Laravel product foundation and make the Angular/Fastify/Drizzle requirements false from day one.

Adopting Twenty would provide a mature CRM platform, but its scope and architecture are broader than the focused LinkedIn-flow CRM we need. Deep customization would likely become platform work instead of product work.

Building greenfield keeps the core product small, makes MCP a primary interface from the start, and lets us encode the operational requirements directly:

- backup enforcement
- agent audit trails
- branch and PR workflows
- scheduler behavior
- connector normalization
- multi-instance runtime constraints

## Consequences

Positive:

- Full control over architecture and product shape.
- No inherited mismatch with Angular/Fastify/Drizzle.
- MCP and agents can be designed as primary interfaces.
- Smaller domain model focused on LinkedIn outreach flows.
- Easier to enforce backup and container runtime rules.

Negative:

- Slower to first usable CRM than adopting Relaticle.
- We must build basic CRM capabilities ourselves.
- We need to implement MCP tooling, scheduler, backup worker, and connectors.
- We should actively inspect existing projects to avoid reinventing obvious patterns.

## Practical Plan

1. Build Orkestr CRM greenfield.
2. Clone or run Relaticle as the MCP-first CRM benchmark.
3. Inspect Twenty for object/workflow modeling ideas.
4. Inspect OpenOutreach for LinkedIn/email outreach mechanics.
5. Keep architecture decisions documented as ADRs.
