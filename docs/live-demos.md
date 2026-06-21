# Live demos

oXRM has two continuously deployed demo instances:

- `https://job-search-demo.oxrm.orkestr.de`: seeded with `./oxrm seed job-search`
- `https://linkedin-outreach-demo.oxrm.orkestr.de`: seeded with `./oxrm seed outreach`

Both are deployed by the `deploy-live-demos` job in CI after static checks,
Docker demo smoke, and proxy validation pass on `main`.

The live demos intentionally do not combine scenarios. Each public target gets
one dataset so regressions are visible.

The public runtime is lean: Caddy serves the built Angular files, and each demo
runs only Postgres plus the API container.

## GitHub secrets

Configure these in the `live-demos` environment:

```text
OXRM_DEMO_SSH_HOST
OXRM_DEMO_SSH_USER
OXRM_DEMO_SSH_PRIVATE_KEY
OXRM_DEMO_SSH_PORT
OXRM_DEMO_DEPLOY_ROOT
OXRM_DEMO_POSTGRES_PASSWORD
OXRM_DEMO_ADMIN_USER
OXRM_DEMO_ADMIN_PASSWORD_HASH
```

`OXRM_DEMO_ADMIN_PASSWORD_HASH` must be a Caddy-compatible hash:

```bash
docker run --rm caddy:2 caddy hash-password --plaintext 'your-password'
```

## Versioning

Every CI deploy writes runtime metadata into each instance:

- package version
- deploy version
- git SHA
- git ref
- GitHub run id
- GitHub run number
- deployed-at timestamp

Check it with:

```bash
curl -u "$OXRM_DEMO_ADMIN_USER:$PASSWORD" https://job-search-demo.oxrm.orkestr.de/api/health
curl -u "$OXRM_DEMO_ADMIN_USER:$PASSWORD" https://linkedin-outreach-demo.oxrm.orkestr.de/api/health
```

The server also records manifests in:

```text
.deployments/job-search-demo.json
.deployments/linkedin-outreach-demo.json
.deployments/history.ndjson
```
