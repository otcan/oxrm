# HTTP API

The default demo API URL is `http://127.0.0.1:18291`. Use `./oxrm urls` when
ports are customized.

## Health And Smoke

```bash
curl -fsS http://127.0.0.1:18291/api/health
curl -fsS http://127.0.0.1:18291/api/views
```

- `GET /api/health`: API health, product name, slug, and version.
- `GET /api/testing/synthetic`: synthetic demo-data summary.
- `DELETE /api/testing/synthetic`: remove synthetic demo data.
- `GET /api/system/backup-health`: backup health metadata.

## Generic oXRM

- `GET /api/xrm/object-types`
- `POST /api/xrm/object-types`
- `GET /api/xrm/object-types/:slugOrId`
- `GET /api/xrm/records`
- `POST /api/xrm/records`
- `GET /api/xrm/records/:id`
- `DELETE /api/xrm/records/:id`
- `GET /api/xrm/records/:id/events`
- `POST /api/xrm/relationship-types`
- `GET /api/xrm/relationships`
- `POST /api/xrm/relationships`

## Saved Views

- `GET /api/views`
- `POST /api/views`
- `GET /api/views/:idOrKey`
- `PATCH /api/views/:idOrKey`
- `DELETE /api/views/:idOrKey`
- `GET /api/views/:idOrKey/run`
- `POST /api/views/run`

## Outreach Preset

- `GET /api/leads`
- `POST /api/leads`
- `GET /api/leads/:id`
- `PATCH /api/leads/:id`
- `DELETE /api/leads/:id`
- `GET /api/leads/:id/activities`
- `POST /api/outreach-events`
- `POST /api/outreach-events/backfill`

## Relationship Ledger

- `GET /api/people`
- `GET /api/companies`
- `GET /api/flows`
- `POST /api/flows`
- `GET /api/assignments`
- `GET /api/assignments/due`
- `POST /api/assignments`
- `PATCH /api/assignments/:id`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `GET /api/activities`
- `POST /api/activities`
- `GET /api/events`
- `POST /api/events`
- `GET /api/event-types`
- `POST /api/event-types`

## Scheduling

- `GET /api/booking-links/:slug/availability`
- `POST /api/booking-links/:slug/book`

## Auth Assumptions

The local Docker demo binds services to `127.0.0.1` and is intended for local
evaluation with synthetic data. Production-shaped deployments should sit behind
the configured proxy and authentication layer; do not expose raw app containers
directly to the public internet.
