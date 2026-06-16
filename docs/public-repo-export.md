# Public Repo Export

Use this checklist when preparing a clean public repository from a private working history.

## Recommended Path

1. Create a fresh repository with no private commit history.
2. Copy the current working tree into the fresh repository, excluding ignored files.
3. Run the public release scan in [privacy-and-safe-data.md](privacy-and-safe-data.md).
4. Run `./oxrm ready`, `./oxrm demo`, and `./oxrm test` for the public Docker path.
5. Confirm contributor CI is green for install, typecheck, build, migration generation, and Compose config.
6. Start the demo instance and run the demo smoke path from [instances.md](instances.md).
7. Commit the sanitized tree as the first public commit.
8. Tag the first public release only after governance files and release docs are present.

## Exclude

- `.env`, `.env.local`, and `instances/*.local.env`
- `.backups/` and backup workspaces
- database dumps and local volumes
- logs and screenshots containing real leads
- private issue exports, private branch names, and private remote URLs
- real profile URLs, message bodies, mailbox exports, cookies, and connector credentials

## Keep

- `instances/demo.env.example`
- synthetic demo seed scripts
- schema and migrations
- public docs
- CI, issue templates, and PR template
- license, security policy, contributing guide, and code of conduct

## Remote Hygiene

Before pushing the export, inspect:

```bash
git remote -v
git status --short
rg -n "linkedin\\.com/in|cookie|token|secret|password|known-private-name" .
```

Expected matches should be placeholders, schema names, or documentation warnings. Anything that points to a real person, account, credential, private repo, or local live instance must be removed before publication.
