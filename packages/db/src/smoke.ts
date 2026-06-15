import { activities, assignments, backupRuns, flows, leads } from "./schema/index.js";
import { createDatabase } from "./client.js";

const { db, queryClient } = createDatabase();

try {
  const flow = await db.query.flows.findFirst();
  if (!flow) {
    throw new Error("No flow found. Run pnpm db:seed first.");
  }

  const [lead] = await db
    .insert(leads)
    .values({
      fullName: `DB Smoke ${new Date().toISOString()}`,
      email: `db-smoke-${Date.now()}@example.test`,
      source: "db-smoke"
    })
    .returning();

  if (!lead) {
    throw new Error("Failed to create smoke lead");
  }

  const [assignment] = await db
    .insert(assignments)
    .values({
      leadId: lead.id,
      flowId: flow.id,
      status: "queued",
      nextActionAt: new Date()
    })
    .returning();

  if (!assignment) {
    throw new Error("Failed to create smoke assignment");
  }

  const [activity] = await db
    .insert(activities)
    .values({
      leadId: lead.id,
      assignmentId: assignment.id,
      type: "manual_note",
      channel: "manual",
      direction: "internal",
      body: "DB smoke activity"
    })
    .returning();

  if (!activity) {
    throw new Error("Failed to create smoke activity");
  }

  const backupCount = await db.$count(backupRuns);

  console.log(
    JSON.stringify(
      {
        status: "ok",
        leadId: lead.id,
        assignmentId: assignment.id,
        activityId: activity.id,
        backupRuns: backupCount
      },
      null,
      2
    )
  );
} finally {
  await queryClient.end();
}
