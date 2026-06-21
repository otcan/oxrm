# Local-First Usage

oXRM is designed to run on your laptop, workstation, or private server.

The default local seed contains product configuration only. Demo data is
synthetic and loaded only when you choose a scenario. Real outreach data stays
in your local database unless you configure external integrations or backups.

Use Docker for normal installation.
Use exports if you want to move your data.
Do not expose the API publicly without authentication and a reverse proxy.

## Normal Local Path

```bash
./oxrm start
./oxrm ready
./oxrm test
./oxrm urls
```

To load public-safe sample data, choose exactly one scenario:

```bash
./oxrm seed job-search
./oxrm seed outreach
```

Keep `instances/*.local.env`, database dumps, logs, backups, and connector
credentials private.
