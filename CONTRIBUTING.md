# Contributing

Contributions should preserve the product boundary: Orkestr CRM is an MCP-first outreach ledger and agent-operable CRM state layer.

## Development

```bash
pnpm install
pnpm typecheck
pnpm build
```

Use the public-safe demo path for local walkthroughs:

```bash
cp instances/demo.env.example instances/demo.local.env
scripts/crm-instance demo up
scripts/crm-instance demo migrate
scripts/crm-instance demo demo-seed
scripts/crm-instance demo smoke
```

## Pull Requests

- Keep changes scoped.
- Document MCP/API behavior changes.
- Document schema, migration, backup, and privacy impact.
- Include tests or smoke coverage that matches the risk of the change.
- Do not include real lead data, real profile URLs, credentials, cookies, mailbox exports, or production logs.

## Branches

Agent-authored branches should use:

```txt
agent/<agent-name>/<short-task>
```
