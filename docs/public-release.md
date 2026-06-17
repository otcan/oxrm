# Public Release Checklist

Use this checklist for publication readiness and each tagged release.

## Metadata

- [ ] README positions the project as oXRM while accurately describing shipped outreach and job-search preset behavior.
- [ ] Operator docs use `./oxrm`; `./ocrm` is documented only as deprecated compatibility.
- [ ] Product version is updated in package metadata and `OXRM_PRODUCT_VERSION`.
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
- [ ] oXRM generic-record storage, search, and migration assumptions are documented.
- [ ] Outreach and job-search template status is explicit; future template choices are not presented as shipped behavior.
- [ ] MCP tool equivalents are documented for outreach events, generic records, relationships, and saved views.
- [ ] Future CRM sync boundary is documented.
- [ ] Privacy and safe-data handling are documented.

## Verification

- [ ] `./oxrm ready`
- [ ] `./oxrm demo`
- [ ] `./oxrm test`
- [ ] `./oxrm upgrade --skip-backup` on a disposable local instance.
- [ ] `./oxrm upgrade` on any production-bound instance with backup credentials configured.
- [ ] `./oxrm urls`
- [ ] `./oxrm tools`
- [ ] `./oxrm version`
- [ ] `./ocrm version` prints a deprecation warning and delegates successfully.
- [ ] `xrm.list_views` returns outreach and job-search views.
- [ ] `xrm.run_view` returns rows for `job_search.applications` after seed.
- [ ] Generic record timeline verification covers a job-search application with linked task and event.
- [ ] Contributor CI is green for `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm build`, migration generation, and Compose config.
- [ ] Backup verification is green for any production-bound instance.

## Release Notes

Each release note should include:

- user-facing changes
- schema or migration changes
- manual migration update notes and verification steps
- MCP/API contract changes
- backup or restore impact
- security and privacy impact
- upgrade steps

## 0.2.1 Public Preview Release Notes

### User-Facing Changes

- Renamed the operator command to `./oxrm`.
- Kept `./ocrm` as a deprecated compatibility wrapper.
- Added `./oxrm version`.
- Added generic oXRM saved views in the web UI.
- Added the job-search proof preset with synthetic public-safe records.

### Schema And Migration Changes

- Added generic oXRM object type, field, record, relationship type, and relationship tables in migration `0004`.
- Added nullable `xrm_record_id` links to tasks and activities in migration `0004`.
- Added `template_key` to saved views in migration `0005`.
- Both migrations include manual migration notes, verification steps, and rollback impact.

### MCP/API Contract Changes

- Added generic XRM APIs under `/api/xrm/*`.
- Added `/api/views` list/create/update/delete/run endpoints.
- Added MCP tools for generic object types, records, relationships, record events, and saved views.
- API and MCP health now report product name, slug, and version.

### Backup And Restore Impact

- `./oxrm upgrade` runs backup and verify before migrations by default.
- Local disposable upgrades can use `--skip-backup`, but production-bound instances must not.
- Backup verification restores the latest dump into an isolated disposable database and checks schema readability.

### Security And Privacy Impact

- Public examples use synthetic records and reserved domains.
- `instances/*.local.env`, `.backups/`, logs, dumps, and env files remain ignored.
- Any real token found in local ignored env files must be revoked externally before publication.

### Upgrade Steps

```bash
./oxrm upgrade
./oxrm version
./oxrm test
```
