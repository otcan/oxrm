import { activities, assignments, flowSteps, flows, leads } from "./schema/index.js";
import { createDatabase } from "./client.js";
import { and, eq } from "drizzle-orm";

const { db, queryClient } = createDatabase();

try {
  const flow =
    (await db.query.flows.findFirst({ where: eq(flows.name, "Demo Outreach Flow") })) ??
    (
      await db
        .insert(flows)
        .values({
          name: "Demo Outreach Flow",
          description: "Synthetic public demo flow for outreach ledger evaluation."
        })
        .returning()
    )[0];

  if (!flow) {
    throw new Error("Failed to create demo flow");
  }

  const existingSteps = await db.query.flowSteps.findMany({ where: eq(flowSteps.flowId, flow.id) });
  if (existingSteps.length === 0) {
    await db.insert(flowSteps).values([
      { flowId: flow.id, stepOrder: 1, name: "Connection event", channel: "linkedin", defaultDelayDays: 0 },
      { flowId: flow.id, stepOrder: 2, name: "Follow-up due", channel: "email", defaultDelayDays: 3 }
    ]);
  }

  const demoLeads = [
    {
      fullName: "Alex Rivera",
      company: "Example Infrastructure Co",
      title: "Head of Partnerships",
      linkedinUrl: "https://example.invalid/linkedin/alex-rivera",
      source: "demo:synthetic",
      notes: "Synthetic demo record. Not a real person."
    },
    {
      fullName: "Sam Morgan",
      company: "Sample Analytics Ltd",
      title: "Revenue Operations Lead",
      linkedinUrl: "https://example.invalid/linkedin/sam-morgan",
      source: "demo:synthetic",
      notes: "Synthetic demo record. Not a real person."
    }
  ];

  const createdLeadIds: string[] = [];
  for (const demoLead of demoLeads) {
    const lead =
      (await db.query.leads.findFirst({ where: eq(leads.linkedinUrl, demoLead.linkedinUrl) })) ??
      (await db.insert(leads).values(demoLead).returning())[0];

    if (!lead) {
      throw new Error(`Failed to create demo lead: ${demoLead.fullName}`);
    }
    createdLeadIds.push(lead.id);

    const assignment =
      (await db.query.assignments.findFirst({
        where: and(eq(assignments.leadId, lead.id), eq(assignments.flowId, flow.id))
      })) ??
      (
        await db
          .insert(assignments)
          .values({
            leadId: lead.id,
            flowId: flow.id,
            status: "queued",
            priority: 1,
            nextActionAt: new Date()
          })
          .returning()
      )[0];

    const existingActivity = await db.query.activities.findFirst({
      where: and(eq(activities.leadId, lead.id), eq(activities.externalId, `demo:${lead.id}:created`))
    });

    if (!existingActivity) {
      await db.insert(activities).values({
        leadId: lead.id,
        assignmentId: assignment?.id,
        type: "manual_note",
        channel: "manual",
        direction: "internal",
        body: "Synthetic demo activity for public evaluation.",
        externalId: `demo:${lead.id}:created`
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        status: "ok",
        flowId: flow.id,
        leadIds: createdLeadIds,
        message: "Synthetic demo data seeded."
      },
      null,
      2
    )
  );
} finally {
  await queryClient.end();
}
