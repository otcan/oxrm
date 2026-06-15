import { backupRuns, createDatabase } from "@orkestr-crm/db";
import { execFile } from "node:child_process";
import { desc } from "drizzle-orm";
import { access, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { loadBackupConfig } from "./config.js";

const execFileAsync = promisify(execFile);

function repoUrl(repo: string, token?: string) {
  if (repo.startsWith("http://") || repo.startsWith("https://") || repo.endsWith(".git")) {
    return repo;
  }

  if (token) {
    return `https://x-access-token:${encodeURIComponent(token)}@github.com/${repo}.git`;
  }

  return `https://github.com/${repo}.git`;
}

const config = loadBackupConfig();
const { db, queryClient } = createDatabase(config.databaseUrl);

try {
  const latest = await db.query.backupRuns.findFirst({
    where: (table, { eq }) => eq(table.status, "succeeded"),
    orderBy: [desc(backupRuns.finishedAt)]
  });

  if (!latest?.artifactPath) {
    throw new Error("No successful backup artifact found");
  }

  if (config.nodeEnv === "production") {
    await rm(config.workspace, { recursive: true, force: true });
    await execFileAsync("git", ["clone", repoUrl(config.githubRepo, config.githubToken), config.workspace], {
      env: process.env
    });
  }

  await access(join(config.workspace, latest.artifactPath));

  console.log(
    JSON.stringify(
      {
        service: "orkestr-crm-backup-verify",
        status: "ok",
        artifactPath: latest.artifactPath,
        message: "Backup artifact exists. Full pg_restore replay should be run in an isolated database in CI/production."
      },
      null,
      2
    )
  );
} finally {
  await queryClient.end();
}
