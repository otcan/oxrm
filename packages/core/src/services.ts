import {
  activities,
  agentActions,
  approvals,
  assignments,
  backupRuns,
  bookings,
  companies,
  companyDomains,
  emailAddresses,
  eventTypes,
  externalIdentities,
  flowSteps,
  flows,
  leadRecords,
  leads,
  people,
  taskEvents,
  tasks,
  type Database
} from "@orkestr-crm/db";
import {
  createActivitySchema,
  createAssignmentSchema,
  createLeadSchema,
  createTaskSchema,
  recordOutreachEventSchema,
  updateTaskSchema,
  updateAssignmentSchema,
  updateLeadSchema
} from "@orkestr-crm/shared";
import { and, desc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";
import { z } from "zod";

export interface ServiceContext {
  db: Database;
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type LeadInput = z.infer<typeof createLeadSchema>;
type ActivityInput = z.infer<typeof createActivitySchema>;

function compactText(value: string | undefined) {
  const compacted = value?.trim().replace(/\s+/g, " ");
  return compacted || undefined;
}

function normalizeName(value: string | undefined) {
  return compactText(value)?.toLowerCase();
}

function normalizeEmail(value: string | undefined) {
  return compactText(value)?.toLowerCase();
}

function emailDomain(email: string | undefined) {
  const normalized = normalizeEmail(email);
  const at = normalized?.lastIndexOf("@") ?? -1;
  return at > 0 ? normalized?.slice(at + 1) : undefined;
}

function normalizeDomain(value: string | undefined) {
  const compacted = compactText(value)?.toLowerCase();
  if (!compacted) {
    return undefined;
  }
  return compacted.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]?.replace(/\.$/, "") || undefined;
}

function normalizeUrl(value: string | undefined) {
  const compacted = compactText(value);
  if (!compacted) {
    return undefined;
  }
  return compacted.replace(/\/+$/, "").toLowerCase();
}

function splitName(fullName: string) {
  const parts = compactText(fullName)?.split(" ") ?? [];
  if (parts.length <= 1) {
    return { firstName: parts[0], lastName: undefined };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  };
}

async function upsertCompany(tx: Tx, input: LeadInput) {
  const explicitDomain = normalizeDomain(input.companyDomain ?? input.website);
  const inferredDomain = emailDomain(input.email);
  const domain = explicitDomain ?? inferredDomain;
  const companyName = compactText(input.company) ?? (domain ? domain.split(".")[0] : undefined);
  const normalizedName = normalizeName(companyName);

  let company =
    domain !== undefined
      ? (await tx.query.companyDomains.findFirst({
          where: eq(companyDomains.domain, domain),
          with: { company: true }
        }))?.company
      : undefined;

  if (!company && normalizedName) {
    company = await tx.query.companies.findFirst({ where: eq(companies.normalizedName, normalizedName) });
  }

  if (!company && companyName && normalizedName) {
    [company] = await tx
      .insert(companies)
      .values({
        name: companyName,
        normalizedName,
        website: input.website,
        primaryDomain: domain,
        industry: input.industry,
        size: input.companySize,
        location: input.location,
        source: input.source,
        customFields: input.customFields ?? {}
      })
      .returning();
  } else if (company) {
    [company] = await tx
      .update(companies)
      .set({
        name: companyName ?? company.name,
        website: input.website ?? company.website,
        primaryDomain: company.primaryDomain ?? domain,
        industry: input.industry ?? company.industry,
        size: input.companySize ?? company.size,
        location: input.location ?? company.location,
        source: input.source ?? company.source,
        updatedAt: new Date()
      })
      .where(eq(companies.id, company.id))
      .returning();
  }

  if (company && domain) {
    await tx
      .insert(companyDomains)
      .values({
        companyId: company.id,
        domain,
        isPrimary: company.primaryDomain === domain || !company.primaryDomain,
        source: input.source
      })
      .onConflictDoNothing();
  }

  return company;
}

async function resolvePerson(tx: Tx, input: LeadInput, companyId: string | undefined) {
  const normalizedEmail = normalizeEmail(input.email);
  const linkedinUrl = normalizeUrl(input.linkedinUrl);
  const salesnavUrl = normalizeUrl(input.salesnavUrl);
  const normalizedFullName = normalizeName(input.fullName) ?? input.fullName.toLowerCase();
  const names = splitName(input.fullName);

  let person =
    normalizedEmail !== undefined
      ? (await tx.query.emailAddresses.findFirst({
          where: eq(emailAddresses.normalizedEmail, normalizedEmail),
          with: { person: true }
        }))?.person
      : undefined;

  if (!person && linkedinUrl) {
    person = (await tx.query.externalIdentities.findFirst({
      where: and(eq(externalIdentities.provider, "linkedin"), eq(externalIdentities.normalizedValue, linkedinUrl)),
      with: { person: true }
    }))?.person;
  }

  if (!person && salesnavUrl) {
    person = (await tx.query.externalIdentities.findFirst({
      where: and(eq(externalIdentities.provider, "salesnav"), eq(externalIdentities.normalizedValue, salesnavUrl)),
      with: { person: true }
    }))?.person;
  }

  if (!person && companyId) {
    person = await tx.query.people.findFirst({
      where: and(eq(people.normalizedFullName, normalizedFullName), eq(people.companyId, companyId))
    });
  }

  if (!person) {
    [person] = await tx
      .insert(people)
      .values({
        fullName: compactText(input.fullName) ?? input.fullName,
        normalizedFullName,
        firstName: compactText(input.firstName) ?? names.firstName,
        lastName: compactText(input.lastName) ?? names.lastName,
        title: input.title,
        location: input.location,
        timezone: input.timezone,
        seniority: input.seniority,
        department: input.department,
        companyId,
        source: input.source,
        customFields: input.customFields ?? {}
      })
      .returning();
  } else {
    [person] = await tx
      .update(people)
      .set({
        fullName: compactText(input.fullName) ?? person.fullName,
        normalizedFullName,
        firstName: compactText(input.firstName) ?? person.firstName ?? names.firstName,
        lastName: compactText(input.lastName) ?? person.lastName ?? names.lastName,
        title: input.title ?? person.title,
        location: input.location ?? person.location,
        timezone: input.timezone ?? person.timezone,
        seniority: input.seniority ?? person.seniority,
        department: input.department ?? person.department,
        companyId: companyId ?? person.companyId,
        source: input.source ?? person.source,
        updatedAt: new Date()
      })
      .where(eq(people.id, person.id))
      .returning();
  }

  if (!person) {
    throw new Error("Failed to resolve person identity");
  }

  if (normalizedEmail) {
    await tx
      .insert(emailAddresses)
      .values({
        personId: person.id,
        companyId,
        email: compactText(input.email) ?? normalizedEmail,
        normalizedEmail,
        domain: emailDomain(input.email) ?? "",
        isPrimary: true,
        source: input.source
      })
      .onConflictDoUpdate({
        target: emailAddresses.normalizedEmail,
        set: {
          personId: person.id,
          companyId,
          updatedAt: new Date()
        }
      });
  }

  for (const identity of [
    { provider: "linkedin" as const, value: linkedinUrl, url: input.linkedinUrl },
    { provider: "salesnav" as const, value: salesnavUrl, url: input.salesnavUrl },
    { provider: "email" as const, value: normalizedEmail, externalId: normalizedEmail }
  ]) {
    if (!identity.value) {
      continue;
    }
    await tx
      .insert(externalIdentities)
      .values({
        provider: identity.provider,
        subjectType: "person",
        personId: person.id,
        externalId: identity.externalId,
        externalUrl: identity.url,
        normalizedValue: identity.value,
        source: input.source
      })
      .onConflictDoUpdate({
        target: [externalIdentities.provider, externalIdentities.normalizedValue],
        set: {
          personId: person.id,
          updatedAt: new Date()
        }
      });
  }

  return person;
}

async function upsertLeadRecord(tx: Tx, input: LeadInput) {
  const company = await upsertCompany(tx, input);
  const person = await resolvePerson(tx, input, company?.id);
  const normalizedEmail = normalizeEmail(input.email);
  const linkedinUrl = normalizeUrl(input.linkedinUrl);
  const salesnavUrl = normalizeUrl(input.salesnavUrl);

  let lead =
    (await tx.query.leads.findFirst({ where: eq(leads.personId, person.id) })) ??
    (linkedinUrl ? await tx.query.leads.findFirst({ where: eq(leads.linkedinUrl, linkedinUrl) }) : undefined) ??
    (salesnavUrl ? await tx.query.leads.findFirst({ where: eq(leads.salesnavUrl, salesnavUrl) }) : undefined) ??
    (normalizedEmail ? await tx.query.leads.findFirst({ where: eq(leads.email, normalizedEmail) }) : undefined);

  const leadValues = {
    personId: person.id,
    companyId: company?.id,
    fullName: compactText(input.fullName) ?? input.fullName,
    company: company?.name ?? compactText(input.company),
    title: input.title,
    linkedinUrl,
    salesnavUrl,
    email: normalizedEmail,
    phone: input.phone,
    location: input.location,
    source: input.source,
    ownerAgentId: input.ownerAgentId,
    notes: input.notes,
    customFields: input.customFields ?? {},
    updatedAt: new Date()
  };

  if (lead) {
    [lead] = await tx.update(leads).set(leadValues).where(eq(leads.id, lead.id)).returning();
  } else {
    [lead] = await tx
      .insert(leads)
      .values({
        ...leadValues,
        updatedAt: undefined
      })
      .returning();
  }

  if (!lead) {
    throw new Error("Failed to create or update lead");
  }

  await tx
    .insert(leadRecords)
    .values({
      leadId: lead.id,
      personId: person.id,
      companyId: company?.id,
      source: input.source,
      ownerAgentId: input.ownerAgentId,
      customFields: input.customFields ?? {}
    })
    .onConflictDoUpdate({
      target: leadRecords.leadId,
      set: {
        personId: person.id,
        companyId: company?.id,
        source: input.source,
        ownerAgentId: input.ownerAgentId,
        updatedAt: new Date()
      }
    });

  await tx
    .update(externalIdentities)
    .set({ leadId: lead.id, updatedAt: new Date() })
    .where(eq(externalIdentities.personId, person.id));

  return { lead, person, company };
}

async function resolveActivityLinks(tx: Tx, input: ActivityInput) {
  let leadId = input.leadId;
  let personId = input.personId;
  let companyId = input.companyId;
  let taskId = input.taskId;

  if (input.lead) {
    const resolved = await upsertLeadRecord(tx, input.lead);
    leadId = resolved.lead.id;
    personId = personId ?? resolved.person.id;
    companyId = companyId ?? resolved.company?.id;
  }

  if (input.assignmentId && !leadId) {
    const assignment = await tx.query.assignments.findFirst({ where: eq(assignments.id, input.assignmentId) });
    leadId = assignment?.leadId;
  }

  if (taskId && (!leadId || !personId || !companyId)) {
    const task = await tx.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    leadId = leadId ?? task?.leadId ?? undefined;
    personId = personId ?? task?.personId ?? undefined;
    companyId = companyId ?? task?.companyId ?? undefined;
  }

  if (leadId && (!personId || !companyId)) {
    const lead = await tx.query.leads.findFirst({ where: eq(leads.id, leadId) });
    personId = personId ?? lead?.personId ?? undefined;
    companyId = companyId ?? lead?.companyId ?? undefined;
  }

  if (personId && !companyId) {
    const person = await tx.query.people.findFirst({ where: eq(people.id, personId) });
    companyId = person?.companyId ?? undefined;
  }

  return { leadId, personId, companyId, taskId };
}

export function createCrmServices({ db }: ServiceContext) {
  return {
    async health() {
      const backup = await this.getBackupHealth();
      return {
        status: backup.degraded ? "degraded" : "ok",
        service: "orkestr-crm-api",
        backup
      };
    },

    async listLeads(input: { query?: string | undefined; limit?: number | undefined } = {}) {
      const limit = input.limit ?? 100;
      const where = input.query
        ? or(
            ilike(leads.fullName, `%${input.query}%`),
            ilike(leads.company, `%${input.query}%`),
            ilike(leads.title, `%${input.query}%`),
            ilike(leads.linkedinUrl, `%${input.query}%`),
            ilike(leads.salesnavUrl, `%${input.query}%`),
            ilike(leads.email, `%${input.query}%`)
          )
        : undefined;

      return db.query.leads.findMany({
        where,
        with: {
          person: true,
          companyEntity: true,
          leadRecord: true
        },
        orderBy: [desc(leads.updatedAt)],
        limit
      });
    },

    async getLead(id: string) {
      return db.query.leads.findFirst({
        where: eq(leads.id, id),
        with: {
          person: {
            with: {
              emailAddresses: true,
              company: true
            }
          },
          companyEntity: {
            with: {
              domains: true
            }
          },
          leadRecord: true,
          assignments: true,
          activities: true,
          bookings: true,
          tasks: true
        }
      });
    },

    async createLead(input: unknown) {
      const parsed = createLeadSchema.parse(input);
      const { lead } = await db.transaction((tx) => upsertLeadRecord(tx, parsed));
      return lead;
    },

    async updateLead(id: string, input: unknown) {
      const parsed = updateLeadSchema.parse(input);
      const [updated] = await db
        .update(leads)
        .set({
          fullName: parsed.fullName,
          company: parsed.company,
          companyId: undefined,
          title: parsed.title,
          linkedinUrl: normalizeUrl(parsed.linkedinUrl),
          salesnavUrl: normalizeUrl(parsed.salesnavUrl),
          email: normalizeEmail(parsed.email),
          phone: parsed.phone,
          location: parsed.location,
          source: parsed.source,
          ownerAgentId: parsed.ownerAgentId,
          notes: parsed.notes,
          customFields: parsed.customFields,
          updatedAt: new Date()
        })
        .where(eq(leads.id, id))
        .returning();
      return updated;
    },

    async listCompanies(input: { query?: string | undefined; limit?: number | undefined } = {}) {
      const where = input.query
        ? or(
            ilike(companies.name, `%${input.query}%`),
            ilike(companies.normalizedName, `%${input.query}%`),
            ilike(companies.primaryDomain, `%${input.query}%`)
          )
        : undefined;
      return db.query.companies.findMany({
        where,
        with: { domains: true },
        orderBy: [desc(companies.updatedAt)],
        limit: input.limit ?? 100
      });
    },

    async listPeople(input: { query?: string | undefined; limit?: number | undefined } = {}) {
      const where = input.query
        ? or(
            ilike(people.fullName, `%${input.query}%`),
            ilike(people.normalizedFullName, `%${input.query}%`),
            ilike(people.title, `%${input.query}%`)
          )
        : undefined;
      return db.query.people.findMany({
        where,
        with: { emailAddresses: true, company: true },
        orderBy: [desc(people.updatedAt)],
        limit: input.limit ?? 100
      });
    },

    async deleteLead(id: string) {
      const deleted = await db.delete(leads).where(eq(leads.id, id)).returning({ id: leads.id });
      return {
        deleted: deleted.length > 0,
        leadId: id
      };
    },

    async listFlows() {
      return db.query.flows.findMany({
        with: {
          steps: true
        },
        orderBy: [desc(flows.updatedAt)]
      });
    },

    async getSyntheticDataSummary() {
      const syntheticLeadWhere = or(
        eq(leads.source, "cli-smoke"),
        eq(leads.source, "db-smoke"),
        ilike(leads.source, "stress-test-%")
      );
      const syntheticFlowWhere = ilike(flows.name, "Stress Test %");
      const syntheticLeadIds = (await db.select({ id: leads.id }).from(leads).where(syntheticLeadWhere)).map(
        (lead) => lead.id
      );
      const syntheticLeadIdWhere =
        syntheticLeadIds.length > 0 ? inArray(activities.leadId, syntheticLeadIds) : undefined;
      const syntheticAssignmentLeadWhere =
        syntheticLeadIds.length > 0 ? inArray(assignments.leadId, syntheticLeadIds) : undefined;

      return {
        leads: syntheticLeadIds.length,
        assignments: syntheticAssignmentLeadWhere ? await db.$count(assignments, syntheticAssignmentLeadWhere) : 0,
        activities: syntheticLeadIdWhere ? await db.$count(activities, syntheticLeadIdWhere) : 0,
        stressFlows: await db.$count(flows, syntheticFlowWhere)
      };
    },

    async cleanupSyntheticData() {
      const syntheticLeadWhere = or(
        eq(leads.source, "cli-smoke"),
        eq(leads.source, "db-smoke"),
        ilike(leads.source, "stress-test-%")
      );
      const syntheticFlowWhere = ilike(flows.name, "Stress Test %");

      return db.transaction(async (tx) => {
        const deletedLeads = await tx.delete(leads).where(syntheticLeadWhere).returning({ id: leads.id });
        const deletedFlows = await tx.delete(flows).where(syntheticFlowWhere).returning({ id: flows.id });

        return {
          deletedLeads: deletedLeads.length,
          deletedStressFlows: deletedFlows.length
        };
      });
    },

    async createFlow(input: unknown) {
      const parsed = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        steps: z
          .array(
            z.object({
              name: z.string().min(1),
              channel: z.enum(["linkedin", "salesnav", "email", "scheduler", "manual"]).default("manual"),
              defaultDelayDays: z.number().int().optional(),
              template: z.string().optional()
            })
          )
          .default([])
      }).parse(input);

      return db.transaction(async (tx) => {
        const [flow] = await tx
          .insert(flows)
          .values({ name: parsed.name, description: parsed.description })
          .returning();

        if (!flow) {
          throw new Error("Failed to create flow");
        }

        if (parsed.steps.length > 0) {
          await tx.insert(flowSteps).values(
            parsed.steps.map((step, index) => ({
              flowId: flow.id,
              stepOrder: index + 1,
              name: step.name,
              channel: step.channel,
              defaultDelayDays: step.defaultDelayDays,
              template: step.template
            }))
          );
        }

        return flow;
      });
    },

    async listAssignments(input: { status?: string | undefined; limit?: number | undefined } = {}) {
      const status = input.status as typeof assignments.$inferSelect.status | undefined;
      return db.query.assignments.findMany({
        where: status ? eq(assignments.status, status) : undefined,
        orderBy: [desc(assignments.updatedAt)],
        limit: input.limit ?? 100
      });
    },

    async createAssignment(input: unknown) {
      const parsed = createAssignmentSchema.parse(input);
      const [created] = await db
        .insert(assignments)
        .values({
          leadId: parsed.leadId,
          flowId: parsed.flowId,
          currentStepId: parsed.currentStepId,
          status: parsed.status,
          priority: parsed.priority,
          ownerAgentId: parsed.ownerAgentId,
          lastContactedAt: parsed.lastContactedAt ? new Date(parsed.lastContactedAt) : undefined,
          nextActionAt: parsed.nextActionAt ? new Date(parsed.nextActionAt) : undefined
        })
        .returning();
      if (created?.nextActionAt) {
        await db
          .insert(tasks)
          .values({
            title: `Follow up on lead ${created.leadId}`,
            type: "follow_up",
            status: "open",
            priority: created.priority,
            dueAt: created.nextActionAt,
            ownerAgentId: created.ownerAgentId,
            leadId: created.leadId,
            assignmentId: created.id,
            idempotencyKey: `assignment:${created.id}:next-action`
          })
          .onConflictDoUpdate({
            target: tasks.idempotencyKey,
            set: {
              priority: created.priority,
              dueAt: created.nextActionAt,
              ownerAgentId: created.ownerAgentId,
              updatedAt: new Date()
            }
          });
      }
      return created;
    },

    async recordOutreachEvent(input: unknown) {
      const parsed = recordOutreachEventSchema.parse(input);
      const assignmentInput = parsed.assignment ?? {};
      const activityInput = parsed.activity ?? {};
      const activityType = activityInput.type ?? "connection_sent";
      const activityChannel = activityInput.channel ?? "linkedin";
      const activityDirection = activityInput.direction ?? "outbound";
      const assignmentStatus = assignmentInput.status ?? "connection_sent";
      const assignmentPriority = assignmentInput.priority ?? 0;
      const occurredAt = activityInput.occurredAt ? new Date(activityInput.occurredAt) : new Date();
      const profileKey =
        normalizeUrl(parsed.lead.linkedinUrl) ??
        normalizeUrl(parsed.lead.salesnavUrl) ??
        normalizeEmail(parsed.lead.email) ??
        normalizeName(parsed.lead.fullName) ??
        parsed.lead.fullName;
      const externalId =
        parsed.externalKey ?? activityInput.externalId ?? `${activityChannel}:${activityType}:${profileKey}:${occurredAt.toISOString()}`;

      return db.transaction(async (tx) => {
        const existingActivity = await tx.query.activities.findFirst({
          where: or(eq(activities.idempotencyKey, externalId), eq(activities.externalId, externalId))
        });

        if (existingActivity) {
          const [lead, assignment] = await Promise.all([
            existingActivity.leadId
              ? tx.query.leads.findFirst({ where: eq(leads.id, existingActivity.leadId) })
              : Promise.resolve(null),
            existingActivity.assignmentId
              ? tx.query.assignments.findFirst({ where: eq(assignments.id, existingActivity.assignmentId) })
              : Promise.resolve(null)
          ]);

          return {
            idempotent: true,
            lead,
            assignment,
            activity: existingActivity
          };
        }

        const { lead, person, company } = await upsertLeadRecord(tx, parsed.lead);

        const flowId =
          assignmentInput.flowId ??
          (await tx.query.flows.findFirst({ where: eq(flows.active, true), orderBy: [desc(flows.updatedAt)] }))?.id;

        if (!flowId) {
          throw new Error("No active flow found for outreach event");
        }

        let assignment = await tx.query.assignments.findFirst({
          where: and(eq(assignments.leadId, lead.id), eq(assignments.flowId, flowId))
        });
        const lastContactedAt = assignmentInput.lastContactedAt ? new Date(assignmentInput.lastContactedAt) : occurredAt;

        if (assignment) {
          [assignment] = await tx
            .update(assignments)
            .set({
              currentStepId: assignmentInput.currentStepId,
              status: assignmentStatus,
              priority: assignmentPriority,
              ownerAgentId: assignmentInput.ownerAgentId,
              lastContactedAt,
              nextActionAt: assignmentInput.nextActionAt ? new Date(assignmentInput.nextActionAt) : undefined,
              updatedAt: new Date()
            })
            .where(eq(assignments.id, assignment.id))
            .returning();
        } else {
          [assignment] = await tx
            .insert(assignments)
            .values({
              leadId: lead.id,
              flowId,
              currentStepId: assignmentInput.currentStepId,
              status: assignmentStatus,
              priority: assignmentPriority,
              ownerAgentId: assignmentInput.ownerAgentId,
              lastContactedAt,
              nextActionAt: assignmentInput.nextActionAt ? new Date(assignmentInput.nextActionAt) : undefined
            })
            .returning();
        }

        if (!assignment) {
          throw new Error("Failed to create or update outreach assignment");
        }

        const taskDueAt = assignmentInput.nextActionAt ? new Date(assignmentInput.nextActionAt) : undefined;
        if (taskDueAt || assignmentStatus === "follow_up_due") {
          await tx
            .insert(tasks)
            .values({
              title: `Follow up with ${lead.fullName}`,
              type: "follow_up",
              status: "open",
              priority: assignmentPriority,
              dueAt: taskDueAt ?? occurredAt,
              ownerAgentId: assignmentInput.ownerAgentId,
              personId: person.id,
              companyId: company?.id,
              leadId: lead.id,
              assignmentId: assignment.id,
              idempotencyKey: `assignment:${assignment.id}:follow-up`
            })
            .onConflictDoUpdate({
              target: tasks.idempotencyKey,
              set: {
                title: `Follow up with ${lead.fullName}`,
                priority: assignmentPriority,
                dueAt: taskDueAt ?? occurredAt,
                ownerAgentId: assignmentInput.ownerAgentId,
                status: "open",
                updatedAt: new Date()
              }
            });
        }

        const [activity] = await tx
          .insert(activities)
          .values({
            leadId: lead.id,
            assignmentId: assignment.id,
            personId: person.id,
            companyId: company?.id,
            type: activityType,
            channel: activityChannel,
            direction: activityDirection,
            subject: activityInput.subject,
            body: activityInput.body,
            providerThreadId: activityInput.providerThreadId,
            providerMessageId: activityInput.providerMessageId,
            externalId,
            externalUrl: activityInput.externalUrl,
            idempotencyKey: activityInput.idempotencyKey ?? externalId,
            metadata: activityInput.metadata ?? {},
            occurredAt
          })
          .returning();

        if (!activity) {
          throw new Error("Failed to create outreach activity");
        }

        return {
          idempotent: false,
          lead,
          person,
          company,
          assignment,
          activity
        };
      });
    },

    async updateAssignment(id: string, input: unknown) {
      const parsed = updateAssignmentSchema.parse(input);
      const lastContactedAt =
        parsed.lastContactedAt === undefined || parsed.lastContactedAt === null
          ? parsed.lastContactedAt
          : new Date(parsed.lastContactedAt);
      const nextActionAt =
        parsed.nextActionAt === undefined || parsed.nextActionAt === null
          ? parsed.nextActionAt
          : new Date(parsed.nextActionAt);
      const [updated] = await db
        .update(assignments)
        .set({
          currentStepId: parsed.currentStepId,
          status: parsed.status,
          priority: parsed.priority,
          ownerAgentId: parsed.ownerAgentId,
          lastContactedAt,
          nextActionAt,
          updatedAt: new Date()
        })
        .where(eq(assignments.id, id))
        .returning();
      return updated;
    },

    async getDailyQueue(input: { limit?: number | undefined } = {}) {
      return db.query.tasks.findMany({
        where: and(inArray(tasks.status, ["open", "in_progress"]), lte(tasks.dueAt, new Date())),
        with: { lead: true, person: true, company: true, assignment: true },
        orderBy: [desc(tasks.priority), desc(tasks.dueAt)],
        limit: input.limit ?? 25
      });
    },

    async getAssignmentQueue(input: { limit?: number | undefined } = {}) {
      return db.query.assignments.findMany({
        where: lte(assignments.nextActionAt, new Date()),
        orderBy: [desc(assignments.priority), desc(assignments.nextActionAt)],
        limit: input.limit ?? 25
      });
    },

    async getOverdueQueue(input: { limit?: number | undefined } = {}) {
      return db.query.tasks.findMany({
        where: and(inArray(tasks.status, ["open", "in_progress"]), lte(tasks.dueAt, new Date(Date.now() - 24 * 60 * 60 * 1000))),
        with: { lead: true, person: true, company: true, assignment: true },
        orderBy: [desc(tasks.priority), desc(tasks.dueAt)],
        limit: input.limit ?? 25
      });
    },

    async listTasks(input: { status?: string | undefined; query?: string | undefined; limit?: number | undefined } = {}) {
      const status = input.status as typeof tasks.$inferSelect.status | undefined;
      const query = input.query
        ? or(
            ilike(tasks.title, `%${input.query}%`),
            ilike(tasks.description, `%${input.query}%`),
            ilike(tasks.idempotencyKey, `%${input.query}%`)
          )
        : undefined;
      const where = [status ? eq(tasks.status, status) : undefined, query].filter(
        (condition): condition is NonNullable<typeof condition> => condition !== undefined
      );
      return db.query.tasks.findMany({
        where: where.length > 0 ? and(...where) : undefined,
        with: { lead: true, person: true, company: true, assignment: true },
        orderBy: [desc(tasks.priority), desc(tasks.dueAt)],
        limit: input.limit ?? 100
      });
    },

    async getTask(id: string) {
      return db.query.tasks.findFirst({
        where: eq(tasks.id, id),
        with: { lead: true, person: true, company: true, assignment: true, events: true }
      });
    },

    async listLeadTasks(leadId: string, limit = 100) {
      return db.query.tasks.findMany({
        where: eq(tasks.leadId, leadId),
        with: { lead: true, person: true, company: true, assignment: true, events: true },
        orderBy: [desc(tasks.priority), desc(tasks.dueAt)],
        limit
      });
    },

    async createTask(input: unknown) {
      const parsed = createTaskSchema.parse(input);
      return db.transaction(async (tx) => {
        let existing =
          parsed.idempotencyKey !== undefined
            ? await tx.query.tasks.findFirst({ where: eq(tasks.idempotencyKey, parsed.idempotencyKey) })
            : undefined;

        if (!existing) {
          [existing] = await tx
            .insert(tasks)
            .values({
              title: parsed.title,
              description: parsed.description,
              type: parsed.type,
              status: parsed.status,
              priority: parsed.priority,
              dueAt: parsed.dueAt ? new Date(parsed.dueAt) : undefined,
              ownerAgentId: parsed.ownerAgentId,
              personId: parsed.personId,
              companyId: parsed.companyId,
              leadId: parsed.leadId,
              assignmentId: parsed.assignmentId,
              idempotencyKey: parsed.idempotencyKey,
              metadata: parsed.metadata ?? {}
            })
            .returning();

          if (existing) {
            await tx.insert(taskEvents).values({
              taskId: existing.id,
              type: "created",
              metadata: { source: "service" }
            });
          }
        }

        return existing;
      });
    },

    async updateTask(id: string, input: unknown) {
      const parsed = updateTaskSchema.parse(input);
      const [updated] = await db
        .update(tasks)
        .set({
          title: parsed.title,
          description: parsed.description,
          type: parsed.type,
          status: parsed.status,
          priority: parsed.priority,
          dueAt: parsed.dueAt === undefined || parsed.dueAt === null ? parsed.dueAt : new Date(parsed.dueAt),
          ownerAgentId: parsed.ownerAgentId,
          personId: parsed.personId,
          companyId: parsed.companyId,
          leadId: parsed.leadId,
          assignmentId: parsed.assignmentId,
          idempotencyKey: parsed.idempotencyKey,
          metadata: parsed.metadata,
          updatedAt: new Date()
        })
        .where(eq(tasks.id, id))
        .returning();

      if (updated) {
        await db.insert(taskEvents).values({
          taskId: updated.id,
          type: parsed.status === "done" ? "completed" : "updated",
          metadata: { patch: parsed }
        });
      }

      return updated;
    },

    async completeTask(id: string, input: { completedAt?: string | undefined } = {}) {
      return this.updateTask(id, {
        status: "done",
        dueAt: null,
        metadata: {
          completedAt: input.completedAt ?? new Date().toISOString()
        }
      });
    },

    async postponeTask(id: string, input: { dueAt: string }) {
      return this.updateTask(id, {
        status: "open",
        dueAt: input.dueAt
      });
    },

    async cancelTask(id: string, input: { reason?: string | undefined } = {}) {
      return this.updateTask(id, {
        status: "canceled",
        metadata: input.reason ? { cancelReason: input.reason } : undefined
      });
    },

    async listActivities(
      input: {
        leadId?: string | undefined;
        personId?: string | undefined;
        companyId?: string | undefined;
        taskId?: string | undefined;
        channel?: string | undefined;
        query?: string | undefined;
        limit?: number | undefined;
      } = {}
    ) {
      const query = input.query
        ? or(
            ilike(activities.subject, `%${input.query}%`),
            ilike(activities.body, `%${input.query}%`),
            ilike(activities.providerThreadId, `%${input.query}%`),
            ilike(activities.providerMessageId, `%${input.query}%`),
            ilike(activities.externalId, `%${input.query}%`),
            ilike(activities.externalUrl, `%${input.query}%`)
          )
        : undefined;
      const conditions = [
        input.leadId ? eq(activities.leadId, input.leadId) : undefined,
        input.personId ? eq(activities.personId, input.personId) : undefined,
        input.companyId ? eq(activities.companyId, input.companyId) : undefined,
        input.taskId ? eq(activities.taskId, input.taskId) : undefined,
        input.channel ? eq(activities.channel, input.channel as typeof activities.$inferSelect.channel) : undefined,
        query
      ].filter((condition): condition is NonNullable<typeof condition> => condition !== undefined);

      return db.query.activities.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: { lead: true, person: true, company: true, task: true, assignment: true },
        orderBy: [desc(activities.occurredAt)],
        limit: input.limit ?? 100
      });
    },

    async getActivity(id: string) {
      return db.query.activities.findFirst({
        where: eq(activities.id, id),
        with: { lead: true, person: true, company: true, task: true, assignment: true }
      });
    },

    async addNote(input: {
      leadId?: string | undefined;
      personId?: string | undefined;
      companyId?: string | undefined;
      taskId?: string | undefined;
      subject?: string | undefined;
      body: string;
      idempotencyKey?: string | undefined;
      metadata?: Record<string, unknown> | undefined;
      occurredAt?: string | undefined;
    }) {
      return this.logActivity({
        ...input,
        type: "manual_note",
        channel: "manual",
        direction: "internal"
      });
    },

    async search(input: { query: string; limit?: number | undefined }) {
      const limit = input.limit ?? 25;
      const [leadResults, peopleResults, companyResults, taskResults, eventResults] = await Promise.all([
        this.listLeads({ query: input.query, limit }),
        this.listPeople({ query: input.query, limit }),
        this.listCompanies({ query: input.query, limit }),
        this.listTasks({ query: input.query, limit }),
        this.listActivities({ query: input.query, limit })
      ]);

      return {
        query: input.query,
        leads: leadResults,
        people: peopleResults,
        companies: companyResults,
        tasks: taskResults,
        events: eventResults
      };
    },

    async logActivity(input: unknown) {
      const parsed = createActivitySchema.parse(input);
      return db.transaction(async (tx) => {
        const idempotencyKey = parsed.idempotencyKey ?? parsed.externalId;
        const existing =
          idempotencyKey !== undefined
            ? await tx.query.activities.findFirst({
                where: or(eq(activities.idempotencyKey, idempotencyKey), eq(activities.externalId, idempotencyKey))
              })
            : undefined;

        if (existing) {
          return existing;
        }

        const links = await resolveActivityLinks(tx, parsed);
        const [created] = await tx
          .insert(activities)
          .values({
            leadId: links.leadId,
            personId: links.personId,
            companyId: links.companyId,
            taskId: links.taskId,
            assignmentId: parsed.assignmentId,
            type: parsed.type,
            channel: parsed.channel,
            direction: parsed.direction,
            subject: parsed.subject,
            body: parsed.body,
            providerThreadId: parsed.providerThreadId,
            providerMessageId: parsed.providerMessageId,
            externalId: parsed.externalId,
            externalUrl: parsed.externalUrl,
            idempotencyKey,
            metadata: parsed.metadata ?? {},
            occurredAt: parsed.occurredAt ? new Date(parsed.occurredAt) : undefined
          })
          .returning();
        return created;
      });
    },

    async listLeadActivities(leadId: string, limit = 100) {
      return db.query.activities.findMany({
        where: eq(activities.leadId, leadId),
        with: { person: true, company: true, task: true, assignment: true },
        orderBy: [desc(activities.occurredAt)],
        limit
      });
    },

    async listEventTypes() {
      return db.query.eventTypes.findMany({ orderBy: [desc(eventTypes.updatedAt)] });
    },

    async createEventType(input: unknown) {
      const parsed = z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        durationMinutes: z.number().int().min(5),
        bufferBeforeMinutes: z.number().int().default(0),
        bufferAfterMinutes: z.number().int().default(0),
        bookingWindowDays: z.number().int().default(30)
      }).parse(input);

      const [created] = await db.insert(eventTypes).values(parsed).returning();
      return created;
    },

    async getAvailability(slug: string) {
      const eventType = await db.query.eventTypes.findFirst({
        where: eq(eventTypes.slug, slug)
      });

      if (!eventType) {
        throw new Error("event_type_not_found");
      }

      const now = new Date();
      const windowEnd = new Date(now.getTime() + eventType.bookingWindowDays * 24 * 60 * 60 * 1000);
      const existingBookings = await db.query.bookings.findMany({
        where: and(gte(bookings.startsAt, now), lte(bookings.startsAt, windowEnd))
      });

      const slots: Array<{ startsAt: string; endsAt: string }> = [];
      const durationMs = eventType.durationMinutes * 60 * 1000;
      const bufferBeforeMs = eventType.bufferBeforeMinutes * 60 * 1000;
      const bufferAfterMs = eventType.bufferAfterMinutes * 60 * 1000;

      for (let day = 0; day < eventType.bookingWindowDays && slots.length < 60; day += 1) {
        const date = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
        const weekday = date.getUTCDay();
        if (weekday === 0 || weekday === 6) {
          continue;
        }

        for (let hour = 9; hour < 17 && slots.length < 60; hour += 1) {
          const startsAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, 0, 0));
          const endsAt = new Date(startsAt.getTime() + durationMs);
          if (startsAt <= now) {
            continue;
          }

          const blocked = existingBookings.some((booking) => {
            const busyStart = new Date(booking.startsAt.getTime() - bufferBeforeMs);
            const busyEnd = new Date(booking.endsAt.getTime() + bufferAfterMs);
            return startsAt < busyEnd && endsAt > busyStart;
          });

          if (!blocked) {
            slots.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
          }
        }
      }

      return {
        eventType,
        slots
      };
    },

    async createBooking(slug: string, input: unknown) {
      const parsed = z.object({
        startsAt: z.string().datetime(),
        attendeeName: z.string().min(1),
        attendeeEmail: z.string().email(),
        leadId: z.string().uuid().optional()
      }).parse(input);

      const eventType = await db.query.eventTypes.findFirst({ where: eq(eventTypes.slug, slug) });
      if (!eventType) {
        throw new Error("event_type_not_found");
      }

      const startsAt = new Date(parsed.startsAt);
      const endsAt = new Date(startsAt.getTime() + eventType.durationMinutes * 60 * 1000);

      return db.transaction(async (tx) => {
        const conflicts = await tx.query.bookings.findMany({
          where: and(gte(bookings.startsAt, startsAt), lte(bookings.startsAt, endsAt))
        });
        if (conflicts.length > 0) {
          throw new Error("slot_conflict");
        }

        const [booking] = await tx
          .insert(bookings)
          .values({
            eventTypeId: eventType.id,
            leadId: parsed.leadId,
            startsAt,
            endsAt,
            attendeeName: parsed.attendeeName,
            attendeeEmail: parsed.attendeeEmail
          })
          .returning();

        if (parsed.leadId && booking) {
          await tx.insert(activities).values({
            leadId: parsed.leadId,
            type: "meeting_booked",
            channel: "scheduler",
            direction: "internal",
            body: `Booked ${eventType.name} with ${parsed.attendeeName} at ${startsAt.toISOString()}`
          });
        }

        return booking;
      });
    },

    async getBackupHealth() {
      const latest = await db.query.backupRuns.findFirst({
        orderBy: [desc(backupRuns.startedAt)]
      });

      return {
        latestStatus: latest?.status ?? "missing",
        latestFinishedAt: latest?.finishedAt ?? null,
        degraded:
          !latest?.finishedAt ||
          latest.status !== "succeeded" ||
          Date.now() - latest.finishedAt.getTime() > 26 * 60 * 60 * 1000
      };
    },

    async recordAgentAction(input: {
      agentId?: string | undefined;
      toolName: string;
      inputJson?: unknown;
      resultJson?: unknown;
      approvalId?: string | undefined;
      status: string;
    }) {
      const [created] = await db
        .insert(agentActions)
        .values({
          agentId: input.agentId,
          toolName: input.toolName,
          inputJson: input.inputJson ?? {},
          resultJson: input.resultJson ?? {},
          approvalId: input.approvalId,
          status: input.status
        })
        .returning();
      return created;
    },

    async createApproval(input: unknown) {
      const parsed = z.object({
        agentId: z.string().uuid().optional(),
        operation: z.string().min(1),
        reason: z.string().optional(),
        payloadJson: z.unknown().default({})
      }).parse(input);

      const [created] = await db
        .insert(approvals)
        .values({
          agentId: parsed.agentId,
          operation: parsed.operation,
          reason: parsed.reason,
          payloadJson: parsed.payloadJson
        })
        .returning();
      return created;
    },

    async listBookings() {
      return db.query.bookings.findMany({ orderBy: [desc(bookings.startsAt)] });
    }
  };
}

export type CrmServices = ReturnType<typeof createCrmServices>;
