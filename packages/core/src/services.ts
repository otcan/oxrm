import {
  activities,
  agentActions,
  approvals,
  assignments,
  backupRuns,
  bookings,
  eventTypes,
  flowSteps,
  flows,
  integrationAccounts,
  integrationSyncRuns,
  leads,
  type Database
} from "@orkestr-crm/db";
import {
  createActivitySchema,
  createAssignmentSchema,
  createLeadSchema,
  updateAssignmentSchema,
  updateLeadSchema
} from "@orkestr-crm/shared";
import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { z } from "zod";

export interface ServiceContext {
  db: Database;
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
        orderBy: [desc(leads.updatedAt)],
        limit
      });
    },

    async getLead(id: string) {
      return db.query.leads.findFirst({
        where: eq(leads.id, id),
        with: {
          assignments: true,
          activities: true,
          bookings: true
        }
      });
    },

    async createLead(input: unknown) {
      const parsed = createLeadSchema.parse(input);
      const [created] = await db
        .insert(leads)
        .values({
          fullName: parsed.fullName,
          company: parsed.company,
          title: parsed.title,
          linkedinUrl: parsed.linkedinUrl,
          salesnavUrl: parsed.salesnavUrl,
          email: parsed.email,
          phone: parsed.phone,
          location: parsed.location,
          source: parsed.source,
          ownerAgentId: parsed.ownerAgentId,
          notes: parsed.notes
        })
        .returning();
      return created;
    },

    async updateLead(id: string, input: unknown) {
      const parsed = updateLeadSchema.parse(input);
      const [updated] = await db
        .update(leads)
        .set({
          fullName: parsed.fullName,
          company: parsed.company,
          title: parsed.title,
          linkedinUrl: parsed.linkedinUrl,
          salesnavUrl: parsed.salesnavUrl,
          email: parsed.email,
          phone: parsed.phone,
          location: parsed.location,
          source: parsed.source,
          ownerAgentId: parsed.ownerAgentId,
          notes: parsed.notes,
          updatedAt: new Date()
        })
        .where(eq(leads.id, id))
        .returning();
      return updated;
    },

    async listFlows() {
      return db.query.flows.findMany({
        with: {
          steps: true
        },
        orderBy: [desc(flows.updatedAt)]
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
          nextActionAt: parsed.nextActionAt ? new Date(parsed.nextActionAt) : undefined
        })
        .returning();
      return created;
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
      return db.query.assignments.findMany({
        where: lte(assignments.nextActionAt, new Date()),
        orderBy: [desc(assignments.priority), desc(assignments.nextActionAt)],
        limit: input.limit ?? 25
      });
    },

    async getOverdueQueue(input: { limit?: number | undefined } = {}) {
      return db.query.assignments.findMany({
        where: and(lte(assignments.nextActionAt, new Date(Date.now() - 24 * 60 * 60 * 1000))),
        orderBy: [desc(assignments.priority), desc(assignments.nextActionAt)],
        limit: input.limit ?? 25
      });
    },

    async logActivity(input: unknown) {
      const parsed = createActivitySchema.parse(input);
      const [created] = await db
        .insert(activities)
        .values({
          leadId: parsed.leadId,
          assignmentId: parsed.assignmentId,
          integrationAccountId: parsed.integrationAccountId,
          type: parsed.type,
          channel: parsed.channel,
          direction: parsed.direction,
          body: parsed.body,
          externalId: parsed.externalId,
          occurredAt: parsed.occurredAt ? new Date(parsed.occurredAt) : undefined
        })
        .returning();
      return created;
    },

    async listLeadActivities(leadId: string, limit = 100) {
      return db.query.activities.findMany({
        where: eq(activities.leadId, leadId),
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

    async listIntegrationAccounts() {
      return db.query.integrationAccounts.findMany({
        orderBy: [desc(integrationAccounts.updatedAt)]
      });
    },

    async upsertIntegrationAccount(input: unknown) {
      const parsed = z.object({
        provider: z.enum(["linkedin", "salesnav", "gmail", "outlook", "google_calendar", "microsoft_calendar", "caldav"]),
        displayName: z.string().min(1),
        status: z.enum(["active", "needs_auth", "paused", "error", "archived"]).default("needs_auth"),
        authType: z.string().default("oauth"),
        credentialsRef: z.string().optional()
      }).parse(input);

      const [created] = await db.insert(integrationAccounts).values(parsed).returning();
      return created;
    },

    async testIntegrationAccount(id: string) {
      const account = await db.query.integrationAccounts.findFirst({ where: eq(integrationAccounts.id, id) });
      if (!account) {
        throw new Error("integration_account_not_found");
      }

      return {
        accountId: id,
        provider: account.provider,
        status: account.status === "archived" ? "failed" : "ok",
        message: account.status === "needs_auth" ? "Credentials are not connected yet" : "Connector placeholder is reachable"
      };
    },

    async syncIntegrationAccount(id: string) {
      const account = await db.query.integrationAccounts.findFirst({ where: eq(integrationAccounts.id, id) });
      if (!account) {
        throw new Error("integration_account_not_found");
      }

      const [run] = await db
        .insert(integrationSyncRuns)
        .values({
          integrationAccountId: id,
          status: "succeeded",
          finishedAt: new Date(),
          resultJson: {
            provider: account.provider,
            mode: "placeholder",
            message: "Connector sync boundary is implemented; provider-specific ingestion comes next."
          }
        })
        .returning();

      await db
        .update(integrationAccounts)
        .set({
          lastSyncAt: new Date(),
          lastError: null,
          updatedAt: new Date()
        })
        .where(eq(integrationAccounts.id, id));

      return run;
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
