# Demand Thesis

## Short Answer

There is likely demand for Orkestr CRM if it is positioned as an MCP-first, agent-operable outreach CRM, not as a generic CRM.

The winning wedge is:

> A self-hosted CRM control plane for AI agents running LinkedIn, SalesNav, email, follow-up, scheduling, and CRM-state workflows with audit trails and backups.

## Why Demand Exists

### 1. Generic CRM Is Crowded, But Agent-First CRM Is Early

The CRM market is mature and crowded. Building a generic CRM is not attractive.

However, MCP-first and agent-first CRM is still early. Relaticle is an important signal: it markets itself directly as a self-hosted CRM with a native MCP server and 30 MCP tools. That means the category is real enough for another team to build into it, but still early enough that there is room for focused products.

### 2. Open-Source CRM Demand Is Real

Twenty has strong traction as an open-source CRM platform. That shows teams want CRM systems they can customize, self-host, version, and integrate deeply.

This does not prove demand for Orkestr CRM specifically, but it supports the direction: technical teams want CRM infrastructure that behaves like software, not locked SaaS.

### 3. MCP Is Becoming Infrastructure For Agents

MCP exists to let AI systems discover tools, access structured context, and execute actions. That maps directly to CRM operations:

- find leads
- inspect history
- decide next action
- update state
- schedule calls
- sync integrations
- prepare follow-ups

If agents are going to operate sales workflows, they need systems designed for agents instead of systems built only around human UI clicks.

### 4. LinkedIn Outreach Tools Exist, But CRM State Is Fragmented

The market has many LinkedIn automation and outreach tools. That is a demand signal, but also a warning.

The opportunity is not to compete head-on as a LinkedIn automation tool. The opportunity is to become the trusted state and orchestration layer across:

- LinkedIn
- Sales Navigator
- email
- calendar
- manual operator notes
- agent actions

## Positioning

Avoid:

- "Open-source CRM"
- "LinkedIn automation tool"
- "AI sales assistant"

Prefer:

- "Agent-first CRM for outbound teams"
- "MCP-native CRM control plane"
- "Self-hosted CRM for AI-operated LinkedIn, SalesNav, email, and scheduling workflows"

## Target Users

Best early users:

- AI-forward outbound agencies.
- Founder-led sales teams using agents heavily.
- Operators running multiple LinkedIn/SalesNav workflows.
- Teams already unhappy with CRM data entry.
- Teams that want self-hosting, auditability, and custom automation.

Weak early users:

- Traditional sales teams that just want Salesforce or HubSpot.
- Teams that need enterprise forecasting first.
- Users who primarily want a polished human-first CRM.
- Teams unwilling to run containers or manage credentials.

## Demand Risks

- Generic CRM expectations can swallow the product.
- LinkedIn automation is fragile and policy-sensitive.
- MCP tools need strong security and approval controls.
- Sales teams may want polished SaaS more than self-hosted infrastructure.
- Calendar, email, LinkedIn, and SalesNav integrations can dominate engineering time.
- A narrow internal-tool product may not translate into broad external demand without packaging.

## Validation Plan

Validate demand before overbuilding:

1. Dogfood internally for one real LinkedIn/SalesNav workflow.
2. Build only the MCP tools needed for daily operation.
3. Track whether agents reduce manual CRM updates.
4. Add scheduler only to the point where meetings can be booked reliably.
5. Give it to 3-5 similar operators or agencies.
6. Measure repeated weekly use, not signup interest.
7. Ask for payment or deployment commitment after the first successful workflow.

## Decision

Build if the goal is to own an agent-first outreach control plane.

Do not build if the goal is to ship a general-purpose CRM quickly. In that case, use Relaticle or Twenty.
