import { backupRuns, createDatabase } from "@orkestr-crm/db";
import { desc } from "drizzle-orm";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { loadBackupConfig } from "./config.js";

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
