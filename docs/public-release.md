# Public Release Checklist

Use this checklist for publication readiness and each tagged release.

## Metadata

- [ ] README positions the project as an MCP-first outreach ledger.
- [ ] `package.json` has description, license, repository, homepage, bugs, and keywords.
- [ ] License file is present.
- [ ] Security policy, contributing guide, code of conduct, issue template, and PR template are present.

## Safe Data

- [ ] Demo seed uses only synthetic people, synthetic companies, and reserved domains.
- [ ] README and docs contain no real profile URLs, real emails, cookies, tokens, or live instance names.
- [ ] `.env`, `instances/*.local.env`, `.backups/`, logs, and dumps are ignored.
- [ ] Public release scan has been reviewed manually.

## Product Contract

- [ ] Outreach event contract is documented with synthetic examples.
- [ ] MCP tool equivalent is documented.
- [ ] Future CRM sync boundary is documented.
- [ ] Privacy and safe-data handling are documented.

## Verification

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `./ocrm ready`
- [ ] `./ocrm demo`
- [ ] `./ocrm test`
- [ ] Backup verification is green for any production-bound instance.

## Release Notes

Each release note should include:

- user-facing changes
- schema or migration changes
- MCP/API contract changes
- backup or restore impact
- security and privacy impact
- upgrade steps
