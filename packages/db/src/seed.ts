import { agents, eventTypes, flowSteps, flows, integrationAccounts } from "./schema/index.js";
import { createDatabase } from "./client.js";
import { and, eq } from "drizzle-orm";

const { db, queryClient } = createDatabase();

try {
  const agent =
    (await db.query.agents.findFirst({ where: eq(agents.name, "Codex CRM Operator") })) ??
    (
      await db
        .insert(agents)
        .values({
          name: "Codex CRM Operator",
          type: "crm_operator",
          defaultBranchPrefix: "agent/codex"
        })
        .returning()
    )[0];

  const persistedFlow =
    (await db.query.flows.findFirst({ where: eq(flows.name, "Default LinkedIn Outreach") })) ??
    (
      await db
        .insert(flows)
        .values({
          name: "Default LinkedIn Outreach",
          description: "Starter flow for LinkedIn, SalesNav, and email follow-up."
        })
        .returning()
    )[0];

  if (persistedFlow) {
    const existingSteps = await db.query.flowSteps.findMany({
      where: eq(flowSteps.flowId, persistedFlow.id)
    });
    if (existingSteps.length === 0) {
      await db.insert(flowSteps).values([
        { flowId: persistedFlow.id, stepOrder: 1, name: "Connect", channel: "linkedin", defaultDelayDays: 0 },
        { flowId: persistedFlow.id, stepOrder: 2, name: "First message", channel: "linkedin", defaultDelayDays: 1 },
        { flowId: persistedFlow.id, stepOrder: 3, name: "Follow-up", channel: "email", defaultDelayDays: 4 }
      ]);
    }
  }

  const eventType = await db.query.eventTypes.findFirst({ where: eq(eventTypes.slug, "intro-call") });
  if (!eventType) {
    await db.insert(eventTypes).values({
      name: "Intro Call",
      slug: "intro-call",
      description: "Default 30 minute intro call.",
      durationMinutes: 30,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
      bookingWindowDays: 30
    });
  }

  for (const account of [
    { provider: "salesnav" as const, displayName: "SalesNav Import", status: "needs_auth" as const },
    { provider: "linkedin" as const, displayName: "LinkedIn Import", status: "needs_auth" as const },
    { provider: "gmail" as const, displayName: "Gmail Import", status: "needs_auth" as const },
    { provider: "google_calendar" as const, displayName: "Google Calendar", status: "needs_auth" as const }
  ]) {
    const existing = await db.query.integrationAccounts.findFirst({
      where: and(
        eq(integrationAccounts.provider, account.provider),
        eq(integrationAccounts.displayName, account.displayName)
      )
    });
    if (!existing) {
      await db.insert(integrationAccounts).values(account);
    }
  }

  console.log(
    JSON.stringify(
      {
        status: "ok",
        agentId: agent?.id ?? null,
        flowId: persistedFlow?.id ?? null
      },
      null,
      2
    )
  );
} finally {
  await queryClient.end();
}
