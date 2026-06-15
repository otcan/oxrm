import { backupRuns, createDatabase } from "@orkestr-crm/db";
import { eq } from "drizzle-orm";
import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { loadBackupConfig } from "./config.js";

const execFileAsync = promisify(execFile);

async function run(command: string, args: string[], cwd?: string) {
  return execFileAsync(command, args, {
    cwd,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024
  });
}

async function runPgDump(databaseUrl: string, dumpPath: string) {
  if (process.env.PG_DUMP_DOCKER_CONTAINER) {
    const dumpDatabaseUrl = process.env.PG_DUMP_DATABASE_URL ?? databaseUrl;
    const { stdout } = await execFileAsync(
      "docker",
      ["exec", process.env.PG_DUMP_DOCKER_CONTAINER, "pg_dump", "--format=custom", dumpDatabaseUrl],
      {
        encoding: "buffer",
        maxBuffer: 100 * 1024 * 1024
      }
    );
    await writeFile(dumpPath, stdout);
    return;
  }

  await run("pg_dump", ["--format=custom", "--file", dumpPath, databaseUrl]);
}

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
const createdAt = new Date();
const stamp = createdAt.toISOString().replace(/[:.]/g, "-");
const year = String(createdAt.getUTCFullYear());
const month = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
const relativeDumpPath = join("backups", year, month, `${stamp}.dump`);
const relativeManifestPath = join("backups", year, month, `${stamp}.manifest.json`);
const dumpPath = join(config.workspace, relativeDumpPath);
const manifestPath = join(config.workspace, relativeManifestPath);

let runId: string | undefined;

try {
  const [backupRun] = await db
    .insert(backupRuns)
    .values({
      status: "running",
      githubRepo: config.githubRepo,
      artifactPath: relativeDumpPath,
      manifestJson: {}
    })
    .returning();
  runId = backupRun?.id;

  if (config.nodeEnv === "production") {
    await rm(config.workspace, { recursive: true, force: true });
    await run("git", ["clone", repoUrl(config.githubRepo, config.githubToken), config.workspace]);
  }

  await mkdir(dirname(dumpPath), { recursive: true });
  await runPgDump(config.databaseUrl, dumpPath);

  const manifest = {
    createdAt: createdAt.toISOString(),
    database: new URL(config.databaseUrl).pathname.replace("/", ""),
    format: "pg_dump_custom",
    schemaVersion: "0001",
    gitRepo: config.githubRepo,
    artifactPath: relativeDumpPath
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  let commitSha: string | null = null;
  if (config.nodeEnv === "production") {
    await run("git", ["-C", config.workspace, "config", "user.name", config.gitAuthorName]);
    await run("git", ["-C", config.workspace, "config", "user.email", config.gitAuthorEmail]);
    await run("git", ["-C", config.workspace, "add", relativeDumpPath, relativeManifestPath]);
    await run("git", ["-C", config.workspace, "commit", "-m", `Backup ${createdAt.toISOString()}`]);
    await run("git", ["-C", config.workspace, "push"]);
    const { stdout } = await run("git", ["-C", config.workspace, "rev-parse", "HEAD"]);
    commitSha = stdout.trim();
  }

  if (runId) {
    await db
      .update(backupRuns)
      .set({
        status: "succeeded",
        artifactPath: relativeDumpPath,
        manifestJson: manifest,
        commitSha,
        finishedAt: new Date()
      })
      .where(eq(backupRuns.id, runId));
  }

  console.log(JSON.stringify({ status: "ok", artifactPath: relativeDumpPath, commitSha }, null, 2));
} catch (error) {
  if (runId) {
    await db
      .update(backupRuns)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        finishedAt: new Date()
      })
      .where(eq(backupRuns.id, runId));
  }

  throw error;
} finally {
  await queryClient.end();
}
