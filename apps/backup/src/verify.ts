import { backupRuns, createDatabase } from "@orkestr-crm/db";
import { execFile } from "node:child_process";
import { desc } from "drizzle-orm";
import { access, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { loadBackupConfig } from "./config.js";

const execFileAsync = promisify(execFile);

async function run(command: string, args: string[]) {
  return execFileAsync(command, args, {
    env: process.env,
    maxBuffer: 20 * 1024 * 1024
  });
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

function databaseNameFromUrl(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
}

function withDatabase(databaseUrl: string, databaseName: string) {
  const parsed = new URL(databaseUrl);
  parsed.pathname = `/${encodeURIComponent(databaseName)}`;
  return parsed.toString();
}

function quoteIdentifier(value: string) {
  return `"${String(value).replaceAll("\"", "\"\"")}"`;
}

function restoreDatabaseName(databaseUrl: string) {
  const sourceName = databaseNameFromUrl(databaseUrl).replace(/[^a-zA-Z0-9_]+/g, "_").slice(0, 32) || "oxrm";
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  return `${sourceName}_restore_verify_${suffix}`.slice(0, 63);
}

async function scalar(databaseUrl: string, sql: string) {
  const { stdout } = await run("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-At", "-c", sql]);
  return String(stdout || "").trim();
}

async function verifyRestore(databaseUrl: string, dumpPath: string) {
  const adminDatabaseUrl = process.env.BACKUP_VERIFY_ADMIN_DATABASE_URL || withDatabase(databaseUrl, "postgres");
  const verifyDatabase = restoreDatabaseName(databaseUrl);
  const verifyDatabaseUrl = withDatabase(adminDatabaseUrl, verifyDatabase);
  const quotedDatabase = quoteIdentifier(verifyDatabase);
  let created = false;

  try {
    await run("psql", [adminDatabaseUrl, "-v", "ON_ERROR_STOP=1", "-c", `CREATE DATABASE ${quotedDatabase}`]);
    created = true;
    await run("pg_restore", ["--dbname", verifyDatabaseUrl, "--no-owner", "--no-privileges", dumpPath]);

    const publicTableCount = Number(await scalar(
      verifyDatabaseUrl,
      "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'"
    ));
    if (!Number.isFinite(publicTableCount) || publicTableCount < 1) {
      throw new Error("Restored backup has no readable public tables");
    }

    const backupRunsExists = await scalar(verifyDatabaseUrl, "select to_regclass('public.backup_runs') is not null");
    if (backupRunsExists !== "t") {
      throw new Error("Restored backup is missing public.backup_runs");
    }

    const backupRunCount = Number(await scalar(verifyDatabaseUrl, "select count(*) from public.backup_runs"));
    if (!Number.isFinite(backupRunCount) || backupRunCount < 1) {
      throw new Error("Restored backup has no backup_runs rows");
    }

    return {
      database: verifyDatabase,
      publicTableCount,
      backupRunCount
    };
  } finally {
    if (created) {
      await run("psql", [adminDatabaseUrl, "-v", "ON_ERROR_STOP=1", "-c", `DROP DATABASE IF EXISTS ${quotedDatabase} WITH (FORCE)`]).catch(async () => {
        await run("psql", [adminDatabaseUrl, "-v", "ON_ERROR_STOP=1", "-c", `DROP DATABASE IF EXISTS ${quotedDatabase}`]).catch(() => {});
      });
    }
  }
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

  const artifactPath = join(config.workspace, latest.artifactPath);
  await access(artifactPath);
  const restore = await verifyRestore(config.databaseUrl, artifactPath);

  console.log(
    JSON.stringify(
      {
        service: "orkestr-crm-backup-verify",
        status: "ok",
        artifactPath: latest.artifactPath,
        restore,
        message: "Backup artifact restored successfully in an isolated disposable database."
      },
      null,
      2
    )
  );
} finally {
  await queryClient.end();
}
