# Backlog Decisions

Use this file for near-term product and architecture decisions that affect issue scope.

## 2026-06-16 oXRM Cleanup

- Naming: use `oXRM` as the product shorthand for Orkestr XRM. Keep existing repository/runtime names until code and docs are migrated deliberately.
- Generic records: use a hybrid persistence strategy. PostgreSQL stays canonical; append-friendly record/event files support fast writes, audit/export, and recovery; indexed projections support fast search. Design for up to 1M records per Docker-isolated instance.
- Migrations: every migration needs a manual update note covering data movement, backfill, verification, and rollback impact. Do not depend on old compatibility paths silently carrying data forward at this stage.
- Templates: outreach remains the first bundled domain. Job search is the first non-outreach proof preset now that generic records, views, and MCP contracts exist; keep future templates in seed/configuration until a domain proves repeated usage.
- Multi-instance: keep isolation at the Docker level through env files, Docker project names, host ports, and volumes. Do not add repo-level instance management yet.
- Local LinkedIn instances checked: the current runtime examples follow the Docker-level isolation model.
