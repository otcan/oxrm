# Security Policy

## Supported Versions

Security fixes target the current `master` branch until versioned releases are published.

## Reporting A Vulnerability

Do not open a public issue with secrets, real lead data, cookies, message bodies, or exploit details. Report privately to the maintainers using the repository security advisory flow when available.

Include:

- affected commit or version
- affected component
- reproduction steps using synthetic data
- impact
- suggested mitigation, if known

## Data Handling Expectations

Production CRM data is sensitive. Keep `.env`, `instances/*.local.env`, `.backups/`, database dumps, logs, screenshots, cookies, and connector tokens out of git and public issue trackers.
