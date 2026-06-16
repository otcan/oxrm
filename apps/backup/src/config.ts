export interface BackupConfig {
  databaseUrl: string;
  githubRepo: string;
  githubToken: string | undefined;
  workspace: string;
  gitAuthorName: string;
  gitAuthorEmail: string;
  nodeEnv: string;
}

export function loadBackupConfig(): BackupConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const githubRepo = process.env.BACKUP_GITHUB_REPO;
  const githubToken = process.env.BACKUP_GITHUB_TOKEN;
  const nodeEnv = process.env.NODE_ENV ?? "development";

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for backups");
  }

  if (!githubRepo && nodeEnv === "production") {
    throw new Error("BACKUP_GITHUB_REPO is required in production");
  }

  if (!githubToken && nodeEnv === "production") {
    throw new Error("BACKUP_GITHUB_TOKEN is required in production");
  }

  return {
    databaseUrl,
    githubRepo: githubRepo ?? "local/dev-backups",
    githubToken,
    workspace: process.env.BACKUP_WORKSPACE ?? ".backups",
    gitAuthorName: process.env.BACKUP_GIT_AUTHOR_NAME ?? "oXRM Backup",
    gitAuthorEmail: process.env.BACKUP_GIT_AUTHOR_EMAIL ?? "backups@orkestr.local",
    nodeEnv
  };
}
