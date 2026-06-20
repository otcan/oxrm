import {
  activities,
  assignments,
  companies,
  companyDomains,
  externalIdentities,
  flowSteps,
  flows,
  leadRecords,
  leads,
  people,
  tasks,
  xrmObjectTypes,
  xrmRecordRelationships,
  xrmRecords,
  xrmRelationshipTypes
} from "./schema/index.js";
import { createDatabase } from "./client.js";
import { and, eq, inArray, like, or } from "drizzle-orm";

type DemoScenario = "none" | "job-search" | "linkedin-outreach" | "codex-demo";

const scenarioArg = process.argv.slice(2).find((arg) => arg !== "--");
const scenario = normalizeScenario(scenarioArg ?? process.env.OXRM_DEMO_SCENARIO ?? "none");

if (scenario === "none") {
  console.log(JSON.stringify({ status: "ok", scenario, message: "No demo data requested." }, null, 2));
} else if (scenario === "job-search") {
  await cleanupKnownDemoData();
  process.env.OXRM_INTERNAL_DEMO_SCENARIO = "job-search";
  await import("./seed.js");
} else if (scenario === "codex-demo") {
  await cleanupKnownDemoData();
  process.env.OXRM_INTERNAL_DEMO_SCENARIO = "job-search";
  await import("./seed.js");
  await seedLinkedinOutreachDemo();
} else {
  await cleanupKnownDemoData();
  await import("./seed.js");
  await seedLinkedinOutreachDemo();
}

function normalizeScenario(value: string): DemoScenario {
  const normalized = value.trim().toLowerCase().replaceAll("_", "-");
  if (normalized === "none" || normalized === "job-search" || normalized === "linkedin-outreach" || normalized === "codex-demo") {
    return normalized;
  }
  throw new Error(`Unknown demo scenario: ${value}. Use none, job-search, linkedin-outreach, or codex-demo.`);
}

function compact(value: string | undefined | null) {
  return value?.trim().replace(/\s+/g, " ") || undefined;
}

function normalizeName(value: string | undefined | null) {
  return compact(value)?.toLowerCase();
}

function normalizeUrl(value: string | undefined | null) {
  return compact(value)?.replace(/\/+$/, "").toLowerCase();
}

function normalizeDomain(value: string | undefined | null) {
  return compact(value)?.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]?.replace(/\.$/, "");
}

function searchText(displayName: string, fields: Record<string, unknown>, externalKey: string) {
  return [displayName, externalKey, ...Object.values(fields)]
    .filter((value) => ["string", "number", "boolean"].includes(typeof value))
    .map(String)
    .join(" ")
    .toLowerCase();
}

function splitName(fullName: string) {
  const parts = compact(fullName)?.split(" ") ?? [];
  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined
  };
}

async function cleanupKnownDemoData() {
  const { db, queryClient } = createDatabase();

  try {
    await db
      .delete(activities)
      .where(
        or(
          like(activities.idempotencyKey, "job-search:%"),
          like(activities.idempotencyKey, "linkedin-outreach:%"),
          like(activities.idempotencyKey, "demo-linkedin:%"),
          like(activities.externalId, "job-search:%"),
          like(activities.externalId, "linkedin-outreach:%"),
          like(activities.externalId, "demo-linkedin:%")
        )
      );

    await db
      .delete(tasks)
      .where(
        or(
          like(tasks.idempotencyKey, "job-search:%"),
          like(tasks.idempotencyKey, "linkedin-outreach:%"),
          like(tasks.idempotencyKey, "outreach:https://www.linkedin.com/in/%-demo:%"),
          like(tasks.idempotencyKey, "outreach:https://example.invalid/linkedin/cli-smoke-%")
        )
      );

    await db
      .delete(xrmRecords)
      .where(
        or(
          like(xrmRecords.externalKey, "job-search:%"),
          like(xrmRecords.externalKey, "linkedin-outreach:%"),
          eq(xrmRecords.source, "demo:linkedin-outreach")
        )
      );

    const demoLeads = await db.query.leads.findMany({
      where: or(eq(leads.source, "demo:linkedin-outreach"), eq(leads.source, "cli-smoke"))
    });
    const demoLeadIds = demoLeads.map((lead) => lead.id);
    if (demoLeadIds.length > 0) {
      await db.delete(leads).where(inArray(leads.id, demoLeadIds));
    }

    const demoPeople = await db.query.people.findMany({
      where: or(eq(people.source, "demo:linkedin-outreach"), eq(people.source, "cli-smoke"))
    });
    const demoPersonIds = demoPeople.map((person) => person.id);
    if (demoPersonIds.length > 0) {
      await db.delete(people).where(inArray(people.id, demoPersonIds));
    }

    const demoCompanies = await db.query.companies.findMany({
      where: or(eq(companies.source, "demo:linkedin-outreach"), eq(companies.source, "cli-smoke"))
    });
    const demoCompanyIds = demoCompanies.map((company) => company.id);
    if (demoCompanyIds.length > 0) {
      await db.delete(companies).where(inArray(companies.id, demoCompanyIds));
    }
  } finally {
    await queryClient.end();
  }
}

async function seedLinkedinOutreachDemo() {
  const { db, queryClient } = createDatabase();

  try {
    const flow =
      (await db.query.flows.findFirst({ where: eq(flows.name, "Demo LinkedIn Outreach") })) ??
      (
        await db
          .insert(flows)
          .values({
            name: "Demo LinkedIn Outreach",
            description: "Synthetic public demo flow for high-context LinkedIn outreach."
          })
          .returning()
      )[0];

    if (!flow) {
      throw new Error("Failed to create demo flow");
    }

    const existingSteps = await db.query.flowSteps.findMany({ where: eq(flowSteps.flowId, flow.id) });
    if (existingSteps.length === 0) {
      await db.insert(flowSteps).values([
        { flowId: flow.id, stepOrder: 1, name: "Research", channel: "manual", defaultDelayDays: 0 },
        { flowId: flow.id, stepOrder: 2, name: "Connection request", channel: "linkedin", defaultDelayDays: 0 },
        { flowId: flow.id, stepOrder: 3, name: "Follow-up approval", channel: "linkedin", defaultDelayDays: 5 }
      ]);
    }

    const relationshipTypes = new Map(
      (await db.query.xrmRelationshipTypes.findMany()).map((relationshipType) => [relationshipType.key, relationshipType])
    );
    const objectTypes = new Map((await db.query.xrmObjectTypes.findMany()).map((objectType) => [objectType.slug, objectType]));
    const leadObjectType = objectTypes.get("lead");
    const personObjectType = objectTypes.get("person");
    const companyObjectType = objectTypes.get("company");
    const outreachPlaybookObjectType = objectTypes.get("outreach_playbook");
    const outreachSourceObjectType = objectTypes.get("outreach_source_config");
    const outreachTimerObjectType = objectTypes.get("outreach_automation_timer");
    if (!leadObjectType || !personObjectType || !companyObjectType || !outreachPlaybookObjectType || !outreachSourceObjectType || !outreachTimerObjectType) {
      throw new Error("Baseline XRM object types are missing. Run seed before demo.");
    }

    await upsertRecord(outreachPlaybookObjectType.id, "linkedin-outreach:playbook:start", "Start here: CRM outreach system", {
      title: "Start here: CRM outreach system",
      audience: "Human operator + Codex thread managing high-context customer, partner, founder, or recruiter outreach.",
      startCommand: "git clone https://github.com/otcan/oxrm.git && cd oxrm && ./oxrm start && ./oxrm ready && ./oxrm demo linkedin-outreach",
      setupChecklist:
        "1. Add lead sources: LinkedIn/Sales Navigator exports, warm intro lists, inbound emails, website forms, or CSV imports.\n2. Normalize People, Companies, and Leads.\n3. Record the last touch and next action for each lead.\n4. Ask Codex to summarize context and prepare draft-only messages.\n5. Review approvals before any external action.\n6. Record sent messages, replies, outcomes, and follow-up tasks.",
      dailyLoop:
        "Morning: sync sources, dedupe leads, and review the queue.\nMidday: research warm leads and draft messages.\nEvening: record external actions, update outcomes, and schedule follow-ups.",
      agentInstructions:
        "Read All Leads, People, Companies, Open Tasks, Recent Events, Sources, and Timers. Draft only. Do not send LinkedIn messages, emails, or invites unless the human explicitly approves execution outside this demo.",
      humanInstructions:
        "You control source credentials, targeting, final copy, sending, connection requests, and approvals. Keep oXRM as the local memory and audit trail.",
      status: "active"
    }, "playbook", flow.id);

    await upsertRecord(outreachSourceObjectType.id, "linkedin-outreach:source:salesnav-list", "Sales Navigator lead list", {
      title: "Sales Navigator lead list",
      channel: "linkedin",
      sourceUrl: "https://www.linkedin.com/sales/lists/people/example",
      cadence: "daily",
      status: "manual",
      importInstructions: "Import saved leads, profile URLs, company names, and notes. Deduplicate by LinkedIn URL and company domain.",
      privacyNotes: "Do not commit real profile URLs, cookies, exports, or credentials. Use local-only storage for real outreach."
    }, "source", flow.id);

    await upsertRecord(outreachSourceObjectType.id, "linkedin-outreach:source:csv-import", "CSV warm lead import", {
      title: "CSV warm lead import",
      channel: "csv",
      sourceUrl: "file://examples/import/leads.csv",
      cadence: "as needed",
      status: "manual",
      importInstructions: "Import people, companies, leads, status, source, and next action. Create missing companies and map fields to shared semantics.",
      privacyNotes: "Keep real CSVs outside the public repo and export when you need portability."
    }, "source", flow.id);

    await upsertRecord(outreachTimerObjectType.id, "linkedin-outreach:timer:daily-queue", "Daily outreach queue review", {
      title: "Daily outreach queue review",
      cadence: "daily 09:00",
      nextRunAt: "2026-06-21T07:00:00.000Z",
      task: "Review due follow-ups, summarize context, propose next action, and prepare draft-only messages for approval.",
      blueprint: "Inspect records and propose next action",
      approvalRequired: "Always required before sending or connecting.",
      status: "scheduled"
    }, "timer", flow.id);

    const demoLeads = [
      {
        fullName: "Sarah Kaya",
        company: "HelioWorks",
        companyDomain: "helioworks.example",
        title: "Founder",
        linkedinUrl: "https://www.linkedin.com/in/sarah-kaya-demo",
        location: "Berlin, Germany",
        status: "new",
        stage: "New",
        segment: "technical founder",
        channel: "linkedin",
        assignmentStatus: "new" as const,
        priority: 4,
        nextActionAt: "2026-06-20T08:30:00.000Z",
        nextAction: "Review the source note, check fit, and prepare a short first-message draft.",
        draftStatus: "proposed",
        draftSubject: "Possible fit for local-first outreach",
        draftBody: "Hi Sarah, noticed HelioWorks is hiring operators around founder-led growth. I am testing a local-first outreach workspace that keeps context, drafts, and follow-ups auditable. Worth comparing notes?",
        warmIntro: false,
        activities: [
          {
            type: "manual_note" as const,
            channel: "manual" as const,
            direction: "internal" as const,
            subject: "Lead saved from target founder list",
            body: "Synthetic lead imported from a target-account list. Needs fit review before any external action.",
            occurredAt: "2026-06-19T08:10:00.000Z"
          }
        ]
      },
      {
        fullName: "Daniel Brooks",
        company: "HelioWorks",
        companyDomain: "helioworks.example",
        title: "Head of Product",
        linkedinUrl: "https://www.linkedin.com/in/daniel-brooks-demo",
        location: "Berlin, Germany",
        status: "needs_research",
        stage: "Preparing",
        segment: "product leader",
        channel: "linkedin",
        assignmentStatus: "queued" as const,
        priority: 3,
        nextActionAt: "2026-06-20T10:00:00.000Z",
        nextAction: "Summarize product-led outreach context and decide whether Sarah or Daniel is the better entry point.",
        warmIntro: true,
        activities: [
          {
            type: "manual_note" as const,
            channel: "manual" as const,
            direction: "internal" as const,
            subject: "Warm intro path identified",
            body: "A mutual operator can introduce Daniel if the account looks relevant.",
            occurredAt: "2026-06-19T09:15:00.000Z"
          }
        ]
      },
      {
        fullName: "Maya Iversen",
        company: "Northwind Ops",
        companyDomain: "northwindops.example",
        title: "Operations Lead",
        linkedinUrl: "https://www.linkedin.com/in/maya-iversen-demo",
        location: "Copenhagen, Denmark",
        status: "needs_context_summary",
        stage: "Preparing",
        segment: "operations lead",
        channel: "email",
        assignmentStatus: "queued" as const,
        priority: 2,
        nextActionAt: "2026-06-20T12:00:00.000Z",
        nextAction: "Check the imported company context and draft an email only if the account matches the outreach thesis.",
        warmIntro: false,
        activities: [
          {
            type: "manual_note" as const,
            channel: "manual" as const,
            direction: "internal" as const,
            subject: "CSV lead import reviewed",
            body: "Imported from a synthetic CSV source with company, role, and domain fields.",
            occurredAt: "2026-06-19T10:30:00.000Z"
          }
        ]
      },
      {
        fullName: "Alex Morgan",
        company: "Northwind Ops",
        companyDomain: "northwindops.example",
        title: "Founder",
        linkedinUrl: "https://www.linkedin.com/in/alex-morgan-demo",
        location: "Copenhagen, Denmark",
        status: "waiting_for_reply",
        stage: "Contacted",
        segment: "founder",
        channel: "linkedin",
        assignmentStatus: "messaged" as const,
        priority: 3,
        nextActionAt: "2026-06-20T15:00:00.000Z",
        nextAction: "Draft one follow-up that references the prior note and asks whether ops follow-up tracking is a current problem.",
        draftStatus: "proposed",
        draftSubject: "Follow-up on outreach tracking",
        draftBody: "Hi Alex, quick follow-up on the local-first outreach tracker idea. The useful part is keeping next actions, drafts, and history in one place before anything gets sent. Is this a pain for your team right now?",
        warmIntro: false,
        lastContactAt: "2026-06-19T12:35:00.000Z",
        activities: [
          {
            type: "connection_sent" as const,
            channel: "linkedin" as const,
            direction: "outbound" as const,
            subject: "Connection request sent to Alex Morgan",
            body: "Short request mentioning operational follow-up tracking.",
            occurredAt: "2026-06-18T13:00:00.000Z"
          },
          {
            type: "message_sent" as const,
            channel: "linkedin" as const,
            direction: "outbound" as const,
            subject: "Initial message sent to Alex Morgan",
            body: "Shared a concise note about local-first outreach memory and asked if it matched current workflow gaps.",
            occurredAt: "2026-06-19T12:35:00.000Z"
          }
        ]
      },
      {
        fullName: "Priya Shah",
        company: "LedgerLoop",
        companyDomain: "ledgerloop.example",
        title: "CEO",
        linkedinUrl: "https://www.linkedin.com/in/priya-shah-demo",
        location: "Munich, Germany",
        status: "waiting_for_reply",
        stage: "Contacted",
        segment: "warm founder lead",
        channel: "email",
        assignmentStatus: "messaged" as const,
        priority: 2,
        nextAction: "Wait for reply before drafting another note.",
        warmIntro: true,
        lastContactAt: "2026-06-19T14:20:00.000Z",
        activities: [
          {
            type: "email_sent" as const,
            channel: "email" as const,
            direction: "outbound" as const,
            subject: "Intro email sent to Priya Shah",
            body: "Synthetic intro email sent after warm context was confirmed.",
            occurredAt: "2026-06-19T14:20:00.000Z"
          }
        ]
      },
      {
        fullName: "Omar Haddad",
        company: "TalentBridge",
        companyDomain: "talentbridge.example",
        title: "Partner",
        linkedinUrl: "https://www.linkedin.com/in/omar-haddad-demo",
        location: "Remote EU",
        status: "replied",
        stage: "Engaged",
        segment: "partner lead",
        channel: "linkedin",
        assignmentStatus: "replied" as const,
        priority: 3,
        nextAction: "Summarize the reply and propose a meeting prep note.",
        warmIntro: false,
        replySummary: "Interested in seeing how follow-ups and approved drafts stay auditable.",
        lastContactAt: "2026-06-20T07:40:00.000Z",
        activities: [
          {
            type: "message_received" as const,
            channel: "linkedin" as const,
            direction: "inbound" as const,
            subject: "Reply received from Omar Haddad",
            body: "Omar asked for a short walkthrough of draft-only outreach tracking and activity history.",
            occurredAt: "2026-06-20T07:40:00.000Z"
          }
        ]
      }
    ];

    const createdLeadIds: string[] = [];
    for (const item of demoLeads) {
      const source = "demo:linkedin-outreach";
      const names = splitName(item.fullName);
      const normalizedLinkedinUrl = normalizeUrl(item.linkedinUrl);
      const normalizedCompanyName = normalizeName(item.company);
      const domain = normalizeDomain(item.companyDomain);

      let company = await db.query.companies.findFirst({ where: eq(companies.normalizedName, normalizedCompanyName ?? "") });
      const companyValues = {
        name: item.company,
        normalizedName: normalizedCompanyName ?? item.company.toLowerCase(),
        primaryDomain: domain,
        location: item.location,
        source,
        customFields: { segment: item.segment }
      };
      if (company) {
        [company] = await db.update(companies).set({ ...companyValues, updatedAt: new Date() }).where(eq(companies.id, company.id)).returning();
      } else {
        [company] = await db.insert(companies).values(companyValues).returning();
      }
      if (!company) {
        throw new Error(`Failed to upsert company: ${item.company}`);
      }
      if (domain) {
        await db
          .insert(companyDomains)
          .values({ companyId: company.id, domain, isPrimary: true, source })
          .onConflictDoNothing();
      }

      let person = normalizedLinkedinUrl
        ? (await db.query.externalIdentities.findFirst({
            where: and(eq(externalIdentities.provider, "linkedin"), eq(externalIdentities.normalizedValue, normalizedLinkedinUrl)),
            with: { person: true }
          }))?.person
        : undefined;
      const personValues = {
        fullName: item.fullName,
        normalizedFullName: normalizeName(item.fullName) ?? item.fullName.toLowerCase(),
        firstName: names.firstName,
        lastName: names.lastName,
        title: item.title,
        location: item.location,
        companyId: company.id,
        source,
        customFields: { segment: item.segment, status: item.status, stage: item.stage, nextAction: item.nextAction, lastContactAt: item.lastContactAt }
      };
      if (person) {
        [person] = await db.update(people).set({ ...personValues, updatedAt: new Date() }).where(eq(people.id, person.id)).returning();
      } else {
        [person] = await db.insert(people).values(personValues).returning();
      }
      if (!person) {
        throw new Error(`Failed to upsert person: ${item.fullName}`);
      }
      if (normalizedLinkedinUrl) {
        await db
          .insert(externalIdentities)
          .values({
            provider: "linkedin",
            subjectType: "person",
            personId: person.id,
            companyId: company.id,
            externalUrl: item.linkedinUrl,
            normalizedValue: normalizedLinkedinUrl,
            source
          })
          .onConflictDoUpdate({
            target: [externalIdentities.provider, externalIdentities.normalizedValue],
            set: { personId: person.id, companyId: company.id, updatedAt: new Date() }
          });
      }

      let lead = normalizedLinkedinUrl ? await db.query.leads.findFirst({ where: eq(leads.linkedinUrl, normalizedLinkedinUrl) }) : undefined;
      const leadFields = {
        status: item.status,
        stage: item.stage,
        segment: item.segment,
        channel: item.channel,
        nextAction: item.nextAction,
        nextActionAt: item.nextActionAt,
        lastContactAt: item.lastContactAt,
        draftStatus: item.draftStatus,
        draftSubject: item.draftSubject,
        draftBody: item.draftBody,
        warmIntro: item.warmIntro,
        replySummary: item.replySummary
      };
      const leadValues = {
        personId: person.id,
        companyId: company.id,
        fullName: item.fullName,
        company: company.name,
        title: item.title,
        linkedinUrl: normalizedLinkedinUrl,
        location: item.location,
        source,
        notes: `${item.segment}. Synthetic demo record. Not a real person.`,
        customFields: leadFields
      };
      if (lead) {
        [lead] = await db.update(leads).set({ ...leadValues, updatedAt: new Date() }).where(eq(leads.id, lead.id)).returning();
      } else {
        [lead] = await db.insert(leads).values(leadValues).returning();
      }
      if (!lead) {
        throw new Error(`Failed to upsert lead: ${item.fullName}`);
      }
      createdLeadIds.push(lead.id);

      await db
        .insert(leadRecords)
        .values({ leadId: lead.id, personId: person.id, companyId: company.id, status: item.assignmentStatus, source, customFields: leadFields })
        .onConflictDoUpdate({
          target: leadRecords.leadId,
          set: { personId: person.id, companyId: company.id, status: item.assignmentStatus, source, customFields: leadFields, updatedAt: new Date() }
        });

      const companyRecord = await upsertRecord(companyObjectType.id, `linkedin-outreach:company:${domain ?? company.id}`, company.name, {
        name: company.name,
        domain,
        website: domain ? `https://${domain}` : undefined,
        segment: item.segment
      }, "company", company.id);
      const personRecord = await upsertRecord(personObjectType.id, `linkedin-outreach:person:${normalizedLinkedinUrl ?? person.id}`, person.fullName, {
        fullName: person.fullName,
        title: item.title,
        linkedinUrl: item.linkedinUrl,
        company: company.name,
        segment: item.segment,
        stage: item.stage,
        lastContactAt: item.lastContactAt
      }, "person", person.id);
      const leadRecord = await upsertRecord(leadObjectType.id, `linkedin-outreach:lead:${normalizedLinkedinUrl ?? lead.id}`, lead.fullName, {
        fullName: lead.fullName,
        company: company.name,
        title: item.title,
        status: item.status,
        stage: item.stage,
        source,
        channel: item.channel,
        linkedinUrl: item.linkedinUrl,
        nextAction: item.nextAction,
        nextActionAt: item.nextActionAt,
        lastContactAt: item.lastContactAt,
        draftStatus: item.draftStatus,
        draftSubject: item.draftSubject,
        draftBody: item.draftBody,
        warmIntro: item.warmIntro,
        replySummary: item.replySummary,
        segment: item.segment,
        notes: `${item.segment}. Synthetic demo record. Not a real person.`
      }, "lead", lead.id);

      await linkRecord("works_at", personRecord.id, companyRecord.id);
      await linkRecord("belongs_to", leadRecord.id, companyRecord.id);
      await linkRecord("related_to", leadRecord.id, personRecord.id);

      let assignment = await db.query.assignments.findFirst({ where: and(eq(assignments.leadId, lead.id), eq(assignments.flowId, flow.id)) });
      const assignmentValues = {
        leadId: lead.id,
        flowId: flow.id,
        status: item.assignmentStatus,
        priority: item.priority,
        lastContactedAt: item.lastContactAt ? new Date(item.lastContactAt) : undefined,
        nextActionAt: item.nextActionAt ? new Date(item.nextActionAt) : undefined
      };
      if (assignment) {
        [assignment] = await db.update(assignments).set({ ...assignmentValues, updatedAt: new Date() }).where(eq(assignments.id, assignment.id)).returning();
      } else {
        [assignment] = await db.insert(assignments).values(assignmentValues).returning();
      }

      if (item.nextActionAt) {
        const taskKey = `linkedin-outreach:task:${normalizedLinkedinUrl ?? lead.id}`;
        await db
          .insert(tasks)
          .values({
            title: `Next action: ${item.fullName}`,
            description: item.nextAction,
            type: item.assignmentStatus === "queued" || item.assignmentStatus === "new" ? "research" : "follow_up",
            status: "open",
            priority: item.priority,
            dueAt: new Date(item.nextActionAt),
            leadId: lead.id,
            personId: person.id,
            companyId: company.id,
            assignmentId: assignment?.id,
            xrmRecordId: leadRecord.id,
            idempotencyKey: taskKey,
            metadata: { source, scenario, templateKey: "outreach", draftOnly: true }
          })
          .onConflictDoUpdate({
            target: tasks.idempotencyKey,
            set: {
              title: `Next action: ${item.fullName}`,
              description: item.nextAction,
              priority: item.priority,
              dueAt: new Date(item.nextActionAt),
              xrmRecordId: leadRecord.id,
              metadata: { source, scenario, templateKey: "outreach", draftOnly: true },
              updatedAt: new Date()
            }
          });
      }

      for (const [index, activity] of item.activities.entries()) {
        const activityKey = `linkedin-outreach:event:${normalizedLinkedinUrl ?? lead.id}:${index + 1}`;
        await db
          .insert(activities)
          .values({
            leadId: lead.id,
            personId: person.id,
            companyId: company.id,
            assignmentId: assignment?.id,
            xrmRecordId: leadRecord.id,
            type: activity.type,
            channel: activity.channel,
            direction: activity.direction,
            subject: activity.subject,
            body: activity.body,
            externalUrl: item.linkedinUrl,
            externalId: activityKey,
            idempotencyKey: activityKey,
            occurredAt: new Date(activity.occurredAt),
            metadata: { source, scenario, templateKey: "outreach", nextAction: item.nextAction, approvalRequired: true }
          })
          .onConflictDoUpdate({
            target: activities.idempotencyKey,
            set: {
              subject: activity.subject,
              body: activity.body,
              xrmRecordId: leadRecord.id,
              occurredAt: new Date(activity.occurredAt),
              metadata: { source, scenario, templateKey: "outreach", nextAction: item.nextAction, approvalRequired: true }
            }
          });
      }
    }

    console.log(
      JSON.stringify(
        {
          status: "ok",
          scenario,
          flowId: flow.id,
          leadIds: createdLeadIds,
          message: "Synthetic LinkedIn outreach demo data seeded."
        },
        null,
        2
      )
    );

    async function upsertRecord(
      objectTypeId: string,
      externalKey: string,
      displayName: string,
      fields: Record<string, unknown>,
      legacyEntityType: string,
      legacyEntityId: string
    ) {
      const cleanedFields = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== ""));
      const values = {
        objectTypeId,
        externalKey,
        displayName,
        fields: cleanedFields,
        searchText: searchText(displayName, cleanedFields, externalKey),
        status: "active",
        source: "demo:linkedin-outreach",
        legacyEntityType,
        legacyEntityId,
        metadata: { scenario }
      };
      const existing = await db.query.xrmRecords.findFirst({ where: and(eq(xrmRecords.objectTypeId, objectTypeId), eq(xrmRecords.externalKey, externalKey)) });
      const [record] = existing
        ? await db.update(xrmRecords).set({ ...values, updatedAt: new Date(), deletedAt: null }).where(eq(xrmRecords.id, existing.id)).returning()
        : await db.insert(xrmRecords).values(values).returning();
      if (!record) {
        throw new Error(`Failed to upsert XRM record: ${externalKey}`);
      }
      return record;
    }

    async function linkRecord(relationshipKey: string, sourceRecordId: string, targetRecordId: string) {
      const relationshipType = relationshipTypes.get(relationshipKey);
      if (!relationshipType) {
        return;
      }
      await db
        .insert(xrmRecordRelationships)
        .values({ relationshipTypeId: relationshipType.id, sourceRecordId, targetRecordId, source: "demo:linkedin-outreach" })
        .onConflictDoNothing({
          target: [
            xrmRecordRelationships.relationshipTypeId,
            xrmRecordRelationships.sourceRecordId,
            xrmRecordRelationships.targetRecordId
          ]
        });
    }
  } finally {
    await queryClient.end();
  }
}
