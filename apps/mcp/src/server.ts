import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { OXRM_PRODUCT_NAME, OXRM_PRODUCT_SLUG, OXRM_PRODUCT_VERSION } from "@orkestr-crm/shared";
import Fastify from "fastify";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { createAgentBranch, preparePr, summarizeBranchChanges } from "./git-workflow.js";
import { createCrmTools } from "./tools.js";

function toContent(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(stripConnectorFields(value), null, 2)
      }
    ]
  };
}

function stripConnectorFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripConnectorFields(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "integrationAccountId" && key !== "integrationAccount")
        .map(([key, item]) => [key, stripConnectorFields(item)])
    );
  }

  return value;
}

const xrmSlugSchema = z
  .string()
  .min(2)
  .max(96)
  .regex(/^[a-z][a-z0-9_.-]*$/);
const viewFieldSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_.-]+$/);
const viewFilterSchema = z.object({
  field: viewFieldSchema,
  operator: z.enum(["equals", "contains", "starts_with", "is_empty", "is_not_empty", "before", "after"]).default("contains"),
  value: z.unknown().optional()
});
const viewSortSchema = z.object({
  field: viewFieldSchema,
  direction: z.enum(["asc", "desc"]).default("asc")
});
const createViewSchema = {
  key: z.string().min(2).max(96).regex(/^[a-z][a-z0-9_.-]*$/),
  name: z.string().min(1),
  description: z.string().optional(),
  objectType: xrmSlugSchema,
  templateKey: xrmSlugSchema.optional(),
  layout: z.enum(["table", "cards", "timeline"]).default("table"),
  columns: z.array(viewFieldSchema).default([]),
  filters: z.array(viewFilterSchema).default([]),
  sort: z.array(viewSortSchema).default([]),
  isDefault: z.boolean().default(false),
  createdByAgentId: z.string().uuid().optional()
};

export async function buildMcpHttpServer() {
  const config = loadConfig();
  const tools = createCrmTools(config.databaseUrl);
  const app = Fastify({ logger: { level: config.logLevel } });

  app.addHook("onClose", async () => {
    await tools.close();
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "oxrm-mcp",
    product: {
      name: OXRM_PRODUCT_NAME,
      slug: OXRM_PRODUCT_SLUG,
      version: OXRM_PRODUCT_VERSION
    }
  }));

  app.all("/mcp", async (request, reply) => {
    const server = new McpServer({
      name: "oxrm",
      version: OXRM_PRODUCT_VERSION
    });

    server.resource("crm.queue.today", "crm://queue/today", async (uri) => ({
      contents: [{ uri: uri.href, text: JSON.stringify(await tools.services.getDailyQueue(), null, 2) }]
    }));

    server.resource("crm.queue.overdue", "crm://queue/overdue", async (uri) => ({
      contents: [{ uri: uri.href, text: JSON.stringify(await tools.services.getOverdueQueue(), null, 2) }]
    }));

    server.resource("crm.backups.latest", "crm://backups/latest", async (uri) => ({
      contents: [{ uri: uri.href, text: JSON.stringify(await tools.services.getBackupHealth(), null, 2) }]
    }));

    server.resource(
      "crm.lead",
      new ResourceTemplate("crm://leads/{leadId}", { list: undefined }),
      async (uri, params) => {
        const leadId = Array.isArray(params.leadId) ? params.leadId[0] : params.leadId;
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(leadId ? await tools.services.getLead(leadId) : null, null, 2)
            }
          ]
        };
      }
    );

    server.resource(
      "xrm.record",
      new ResourceTemplate("xrm://records/{recordId}", { list: undefined }),
      async (uri, params) => {
        const recordId = Array.isArray(params.recordId) ? params.recordId[0] : params.recordId;
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(recordId ? await tools.services.getXrmRecord(recordId) : null, null, 2)
            }
          ]
        };
      }
    );

    server.prompt("daily-outreach-plan", "Create a concise plan for today based on due and overdue queue state.", async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Use crm://queue/today and crm://queue/overdue to produce a prioritized outreach plan. Include lead IDs, recommended action, and whether approval is required.`
          }
        }
      ]
    }));

    server.prompt("follow-up-draft", "Draft a follow-up message from lead context.", { leadId: z.string() }, async (input) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Read crm://leads/${input.leadId} and draft a short follow-up. Do not claim facts not present in the CRM activity history.`
          }
        }
      ]
    }));

    server.tool(
      "crm.search_leads",
      "Search leads by name, company, title, LinkedIn URL, SalesNav URL, or email.",
      {
        query: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listLeads(input))
    );

    server.tool(
      "crm.search_people",
      "Search normalized people/contacts by name, title, email, or company.",
      {
        query: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listPeople(input))
    );

    server.tool(
      "crm.search_companies",
      "Search normalized companies and domains.",
      {
        query: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listCompanies(input))
    );

    server.tool(
      "crm.search",
      "Search across leads, people, companies, tasks, and events. Returns stable CRM IDs grouped by record type.",
      {
        query: z.string().min(1),
        limit: z.number().int().min(1).max(50).optional()
      },
      async (input) => toContent(await tools.services.search(input))
    );

    server.tool(
      "crm.list_views",
      "List saved views over generic oXRM object types. Legacy CRM views remain compatible.",
      {
        objectType: xrmSlugSchema.optional(),
        templateKey: xrmSlugSchema.optional(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listViews(input))
    );

    server.tool(
      "crm.get_view",
      "Read one saved view definition by view ID or key.",
      {
        viewId: z.string().optional(),
        key: z.string().optional()
      },
      async (input) => toContent(await tools.services.getView(input))
    );

    server.tool(
      "crm.create_view",
      "Create a saved view over a generic oXRM object type.",
      createViewSchema,
      async (input) => toContent(await tools.services.createView(input))
    );

    server.tool(
      "crm.update_view",
      "Update a saved view definition by view ID or key.",
      {
        viewId: z.string().optional(),
        key: z.string().optional(),
        patch: z.object({
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          objectType: xrmSlugSchema.optional(),
          templateKey: xrmSlugSchema.optional(),
          layout: z.enum(["table", "cards", "timeline"]).optional(),
          columns: z.array(viewFieldSchema).optional(),
          filters: z.array(viewFilterSchema).optional(),
          sort: z.array(viewSortSchema).optional(),
          isDefault: z.boolean().optional()
        })
      },
      async (input) => toContent(await tools.services.updateView(input))
    );

    server.tool(
      "crm.run_view",
      "Execute a saved view and return matching rows.",
      {
        viewId: z.string().optional(),
        key: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional()
      },
      async (input) => toContent(await tools.services.runView(input))
    );

    server.tool(
      "xrm.list_object_types",
      "List generic oXRM object types and their field definitions.",
      {
        active: z.boolean().optional(),
        templateKey: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listXrmObjectTypes(input))
    );

    server.tool(
      "xrm.create_object_type",
      "Create or update a generic oXRM object type from configuration.",
      {
        slug: z.string().min(2).max(96).regex(/^[a-z][a-z0-9_.-]*$/),
        label: z.string().min(1),
        pluralLabel: z.string().min(1).optional(),
        icon: z.string().optional(),
        displayField: z.string().min(1).default("name"),
        description: z.string().optional(),
        templateKey: z.string().optional(),
        system: z.boolean().default(false),
        active: z.boolean().default(true),
        metadata: z.record(z.string(), z.unknown()).optional(),
        fields: z
          .array(
            z.object({
              key: z.string().min(2).max(96).regex(/^[a-z][a-z0-9_.-]*$/),
              label: z.string().min(1),
              dataType: z.enum(["text", "number", "boolean", "date", "datetime", "url", "email", "json", "select"]).default("text"),
              required: z.boolean().default(false),
              indexed: z.boolean().default(false),
              config: z.record(z.string(), z.unknown()).optional()
            })
          )
          .default([])
      },
      async (input) => toContent(await tools.services.createXrmObjectType(input))
    );

    server.tool(
      "xrm.search_records",
      "Search generic oXRM records by object type, display name, external key, or indexed text.",
      {
        objectType: z.string().min(2).max(96).regex(/^[a-z][a-z0-9_.-]*$/).optional(),
        query: z.string().optional(),
        includeDeleted: z.boolean().default(false),
        limit: z.number().int().min(1).max(500).default(100)
      },
      async (input) => toContent(await tools.services.searchXrmRecords(input))
    );

    server.tool(
      "xrm.get_record",
      "Read one generic oXRM record with object type, relationships, tasks, and timeline.",
      {
        recordId: z.string().uuid()
      },
      async (input) => toContent(await tools.services.getXrmRecord(input.recordId))
    );

    server.tool(
      "xrm.upsert_record",
      "Create or update a generic oXRM record by ID or external key.",
      {
        objectType: z.string().min(2).max(96).regex(/^[a-z][a-z0-9_.-]*$/),
        recordId: z.string().uuid().optional(),
        externalKey: z.string().optional(),
        displayName: z.string().optional(),
        fields: z.record(z.string(), z.unknown()).default({}),
        status: z.string().default("active"),
        source: z.string().optional(),
        ownerAgentId: z.string().uuid().optional(),
        legacyEntityType: z.string().optional(),
        legacyEntityId: z.string().uuid().optional(),
        metadata: z.record(z.string(), z.unknown()).optional()
      },
      async (input) => toContent(await tools.services.upsertXrmRecord(input))
    );

    server.tool(
      "xrm.create_relationship_type",
      "Create or update a typed oXRM relationship definition.",
      {
        key: z.string().min(2).max(96).regex(/^[a-z][a-z0-9_.-]*$/),
        label: z.string().min(1),
        inverseLabel: z.string().optional(),
        sourceObjectType: z.string().min(2).max(96).regex(/^[a-z][a-z0-9_.-]*$/).optional(),
        targetObjectType: z.string().min(2).max(96).regex(/^[a-z][a-z0-9_.-]*$/).optional(),
        cardinality: z.enum(["one_to_one", "one_to_many", "many_to_one", "many_to_many"]).default("many_to_many"),
        metadataSchema: z.record(z.string(), z.unknown()).optional(),
        system: z.boolean().default(false),
        active: z.boolean().default(true)
      },
      async (input) => toContent(await tools.services.createXrmRelationshipType(input))
    );

    server.tool(
      "xrm.link_records",
      "Create or update a typed relationship between two generic oXRM records.",
      {
        relationshipType: z.string().min(2).max(96).regex(/^[a-z][a-z0-9_.-]*$/),
        sourceRecordId: z.string().uuid(),
        targetRecordId: z.string().uuid(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        source: z.string().optional(),
        createdByAgentId: z.string().uuid().optional()
      },
      async (input) => toContent(await tools.services.linkXrmRecords(input))
    );

    server.tool(
      "xrm.list_relationships",
      "List generic oXRM relationships for a record or relationship type.",
      {
        recordId: z.string().uuid().optional(),
        relationshipType: z.string().min(2).max(96).regex(/^[a-z][a-z0-9_.-]*$/).optional(),
        direction: z.enum(["source", "target", "both"]).default("both"),
        includeDeleted: z.boolean().default(false),
        limit: z.number().int().min(1).max(500).default(100)
      },
      async (input) => toContent(await tools.services.listXrmRelationships(input))
    );

    server.tool(
      "xrm.list_record_events",
      "List timeline events linked directly to one generic oXRM record.",
      {
        recordId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listXrmRecordEvents(input))
    );

    server.tool(
      "xrm.list_views",
      "List saved views for generic oXRM object types and optional template keys.",
      {
        objectType: xrmSlugSchema.optional(),
        templateKey: xrmSlugSchema.optional(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listViews(input))
    );

    server.tool(
      "xrm.create_view",
      "Create a saved table/cards/timeline view for a generic oXRM object type.",
      createViewSchema,
      async (input) => toContent(await tools.services.createView(input))
    );

    server.tool(
      "xrm.run_view",
      "Run a saved generic oXRM view and return matching rows.",
      {
        viewId: z.string().optional(),
        key: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional()
      },
      async (input) => toContent(await tools.services.runView(input))
    );

    server.tool(
      "crm.delete_view",
      "Delete a saved view definition by view ID or key.",
      {
        viewId: z.string().optional(),
        key: z.string().optional()
      },
      async (input) => toContent(await tools.services.deleteView(input))
    );

    server.tool(
      "crm.get_lead",
      "Read one lead with assignments, activities, and bookings.",
      {
        leadId: z.string().uuid()
      },
      async (input) => toContent(await tools.services.getLead(input.leadId))
    );

    server.tool(
      "crm.update_lead",
      "Update allowed lead fields. Existing omitted fields are left unchanged.",
      {
        leadId: z.string().uuid(),
        patch: z.object({
          fullName: z.string().min(1).optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          company: z.string().optional(),
          companyDomain: z.string().optional(),
          website: z.string().url().optional(),
          industry: z.string().optional(),
          companySize: z.string().optional(),
          title: z.string().optional(),
          department: z.string().optional(),
          seniority: z.string().optional(),
          timezone: z.string().optional(),
          linkedinUrl: z.string().url().optional(),
          salesnavUrl: z.string().url().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          location: z.string().optional(),
          source: z.string().optional(),
          notes: z.string().optional(),
          customFields: z.record(z.string(), z.unknown()).optional()
        })
      },
      async (input) => toContent(await tools.services.updateLead(input.leadId, input.patch))
    );

    server.tool(
      "crm.list_lead_events",
      "List timeline events attached to one lead.",
      {
        leadId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listLeadActivities(input.leadId, input.limit))
    );

    server.tool(
      "crm.list_lead_tasks",
      "List tasks attached to one lead.",
      {
        leadId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listLeadTasks(input.leadId, input.limit))
    );

    server.tool(
      "crm.create_lead",
      "Create a CRM lead. Routine write; audited action support will be added with agent identity.",
      {
        fullName: z.string().min(1),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        company: z.string().optional(),
        companyDomain: z.string().optional(),
        website: z.string().url().optional(),
        industry: z.string().optional(),
        companySize: z.string().optional(),
        title: z.string().optional(),
        department: z.string().optional(),
        seniority: z.string().optional(),
        timezone: z.string().optional(),
        linkedinUrl: z.string().url().optional(),
        salesnavUrl: z.string().url().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        location: z.string().optional(),
        source: z.string().optional(),
        notes: z.string().optional()
      },
      async (input) => toContent(await tools.services.createLead(input))
    );

    server.tool(
      "crm.list_tasks",
      "List actionable CRM tasks.",
      {
        status: z.enum(["open", "in_progress", "blocked", "done", "canceled"]).optional(),
        query: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listTasks(input))
    );

    server.tool(
      "crm.search_tasks",
      "Search tasks by title, description, or idempotency key.",
      {
        query: z.string().min(1),
        status: z.enum(["open", "in_progress", "blocked", "done", "canceled"]).optional(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listTasks(input))
    );

    server.tool(
      "crm.get_task",
      "Read one task with linked lead, person, company, assignment, and task events.",
      {
        taskId: z.string().uuid()
      },
      async (input) => toContent(await tools.services.getTask(input.taskId))
    );

    server.tool(
      "crm.create_task",
      "Create an actionable task linked to a person, company, lead, or assignment.",
      {
        title: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(["outreach", "follow_up", "research", "data_cleanup", "approval", "manual"]).default("manual"),
        status: z.enum(["open", "in_progress", "blocked", "done", "canceled"]).default("open"),
        priority: z.number().int().default(0),
        dueAt: z.string().datetime().optional(),
        ownerAgentId: z.string().uuid().optional(),
        personId: z.string().uuid().optional(),
        companyId: z.string().uuid().optional(),
        leadId: z.string().uuid().optional(),
        assignmentId: z.string().uuid().optional(),
        idempotencyKey: z.string().optional()
      },
      async (input) => toContent(await tools.services.createTask(input))
    );

    server.tool(
      "crm.update_task",
      "Update task state, ownership, priority, due date, or metadata.",
      {
        taskId: z.string().uuid(),
        patch: z.object({
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          type: z.enum(["outreach", "follow_up", "research", "data_cleanup", "approval", "manual"]).optional(),
          status: z.enum(["open", "in_progress", "blocked", "done", "canceled"]).optional(),
          priority: z.number().int().optional(),
          dueAt: z.string().datetime().nullable().optional(),
          ownerAgentId: z.string().uuid().nullable().optional(),
          personId: z.string().uuid().nullable().optional(),
          companyId: z.string().uuid().nullable().optional(),
          leadId: z.string().uuid().nullable().optional(),
          assignmentId: z.string().uuid().nullable().optional()
        })
      },
      async (input) => toContent(await tools.services.updateTask(input.taskId, input.patch))
    );

    server.tool(
      "crm.complete_task",
      "Mark a task as done.",
      {
        taskId: z.string().uuid(),
        completedAt: z.string().datetime().optional()
      },
      async (input) => toContent(await tools.services.completeTask(input.taskId, { completedAt: input.completedAt }))
    );

    server.tool(
      "crm.postpone_task",
      "Move a task to a new due date and keep it open.",
      {
        taskId: z.string().uuid(),
        dueAt: z.string().datetime()
      },
      async (input) => toContent(await tools.services.postponeTask(input.taskId, { dueAt: input.dueAt }))
    );

    server.tool(
      "crm.cancel_task",
      "Cancel a task and optionally store a cancellation reason in task metadata.",
      {
        taskId: z.string().uuid(),
        reason: z.string().optional()
      },
      async (input) => toContent(await tools.services.cancelTask(input.taskId, { reason: input.reason }))
    );

    server.tool(
      "crm.get_daily_queue",
      "Return assignments due now or overdue for agent operation.",
      {
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.getDailyQueue(input))
    );

    server.tool(
      "crm.get_overdue_queue",
      "Return assignments more than 24 hours overdue.",
      {
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.getOverdueQueue(input))
    );

    server.tool(
      "crm.create_flow",
      "Create an outreach flow and optional ordered steps.",
      {
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
          .optional()
      },
      async (input) => toContent(await tools.services.createFlow({ ...input, steps: input.steps ?? [] }))
    );

    server.tool(
      "crm.assign_lead_to_flow",
      "Assign a lead to a flow.",
      {
        leadId: z.string().uuid(),
        flowId: z.string().uuid(),
        currentStepId: z.string().uuid().optional(),
        status: z
          .enum([
            "new",
            "queued",
            "connection_sent",
            "connected",
            "messaged",
            "follow_up_due",
            "replied",
            "meeting_booked",
            "won",
            "lost",
            "do_not_contact"
          ])
          .default("new"),
        priority: z.number().int().default(0),
        ownerAgentId: z.string().uuid().optional(),
        nextActionAt: z.string().datetime().optional()
      },
      async (input) => toContent(await tools.services.createAssignment(input))
    );

    server.tool(
      "crm.record_outreach_event",
      "Atomically record a successful outreach send: upsert lead, create/update assignment, and append one idempotent activity.",
      {
        externalKey: z.string().optional(),
        lead: z.object({
          fullName: z.string().min(1),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          company: z.string().optional(),
          companyDomain: z.string().optional(),
          website: z.string().url().optional(),
          industry: z.string().optional(),
          companySize: z.string().optional(),
          title: z.string().optional(),
          department: z.string().optional(),
          seniority: z.string().optional(),
          timezone: z.string().optional(),
          linkedinUrl: z.string().url().optional(),
          salesnavUrl: z.string().url().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          location: z.string().optional(),
          source: z.string().optional(),
          notes: z.string().optional()
        }),
        assignment: z
          .object({
            flowId: z.string().uuid().optional(),
            currentStepId: z.string().uuid().optional(),
            status: z
              .enum([
                "new",
                "queued",
                "connection_sent",
                "connected",
                "messaged",
                "follow_up_due",
                "replied",
                "meeting_booked",
                "won",
                "lost",
                "do_not_contact"
              ])
              .default("connection_sent"),
            priority: z.number().int().default(0),
            ownerAgentId: z.string().uuid().optional(),
            lastContactedAt: z.string().datetime().optional(),
            nextActionAt: z.string().datetime().optional()
          })
          .optional(),
        activity: z
          .object({
            type: z
              .enum([
                "connection_request_sent",
                "connection_request_received",
                "connection_sent",
                "connection_accepted",
                "message_sent",
                "message_received",
                "inmail_sent",
                "email_sent",
                "email_received",
                "follow_up_due",
                "booking_created",
                "meeting_booked",
                "not_interested",
                "converted",
                "manual_note"
              ])
              .default("connection_sent"),
            channel: z.enum(["linkedin", "salesnav", "email", "scheduler", "manual"]).default("linkedin"),
            direction: z.enum(["outbound", "inbound", "internal"]).default("outbound"),
            subject: z.string().optional(),
            body: z.string().optional(),
            providerThreadId: z.string().optional(),
            providerMessageId: z.string().optional(),
            externalId: z.string().optional(),
            externalUrl: z.string().url().optional(),
            idempotencyKey: z.string().optional(),
            metadata: z.record(z.string(), z.unknown()).optional(),
            noteStatus: z.enum(["confirmed_sent", "no_note", "unconfirmed"]).optional(),
            proposedNote: z.string().optional(),
            linkedinResult: z.string().optional(),
            sourceQuery: z.string().optional(),
            searchPage: z.number().int().optional(),
            auditDirectory: z.string().optional(),
            rowText: z.string().optional(),
            profileUrl: z.string().url().optional(),
            occurredAt: z.string().datetime().optional()
          })
          .optional(),
        nextActionTask: z
          .union([
            z.object({
              create: z.boolean().default(true),
              title: z.string().min(1).optional(),
              description: z.string().optional(),
              type: z.enum(["outreach", "follow_up", "research", "data_cleanup", "approval", "manual"]).default("follow_up"),
              status: z.enum(["open", "in_progress", "blocked", "done", "canceled"]).default("open"),
              priority: z.number().int().optional(),
              dueAt: z.string().datetime().optional(),
              dueInDays: z.number().int().min(0).max(365).optional(),
              ownerAgentId: z.string().uuid().optional(),
              idempotencyKey: z.string().optional(),
              metadata: z.record(z.string(), z.unknown()).optional()
            }),
            z.literal(false)
          ])
          .optional()
      },
      async (input) => toContent(await tools.services.recordOutreachEvent(input))
    );

    server.tool(
      "crm.backfill_legacy_outreach_events",
      "Dry-run or execute normalization for legacy outreach activities with unstructured body text.",
      {
        dryRun: z.boolean().default(true),
        activityId: z.string().uuid().optional(),
        leadId: z.string().uuid().optional(),
        channel: z.enum(["linkedin", "salesnav", "email", "scheduler", "manual"]).default("linkedin"),
        limit: z.number().int().min(1).max(500).default(50),
        createTasks: z.boolean().default(true),
        overwriteConfirmedBody: z.boolean().default(false)
      },
      async (input) => toContent(await tools.services.backfillLegacyOutreachEvents(input))
    );

    server.tool(
      "crm.list_events",
      "List the CRM event timeline across messages, connection requests, emails, notes, tasks, and scheduling activity.",
      {
        leadId: z.string().uuid().optional(),
        personId: z.string().uuid().optional(),
        companyId: z.string().uuid().optional(),
        taskId: z.string().uuid().optional(),
        channel: z.enum(["linkedin", "salesnav", "email", "scheduler", "manual"]).optional(),
        query: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listActivities(input))
    );

    server.tool(
      "crm.search_events",
      "Search timeline events by subject, body, provider IDs, external IDs, or URLs.",
      {
        query: z.string().min(1),
        leadId: z.string().uuid().optional(),
        personId: z.string().uuid().optional(),
        companyId: z.string().uuid().optional(),
        taskId: z.string().uuid().optional(),
        channel: z.enum(["linkedin", "salesnav", "email", "scheduler", "manual"]).optional(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listActivities(input))
    );

    server.tool(
      "crm.get_event",
      "Read one timeline event with linked lead, person, company, task, and assignment.",
      {
        eventId: z.string().uuid()
      },
      async (input) => toContent(await tools.services.getActivity(input.eventId))
    );

    server.tool(
      "crm.list_record_events",
      "List events attached to one lead, person, company, or task.",
      {
        leadId: z.string().uuid().optional(),
        personId: z.string().uuid().optional(),
        companyId: z.string().uuid().optional(),
        taskId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).optional()
      },
      async (input) => toContent(await tools.services.listActivities(input))
    );

    server.tool(
      "crm.add_note",
      "Append a manual note event to a lead, person, company, or task timeline. Events remain append-only.",
      {
        leadId: z.string().uuid().optional(),
        personId: z.string().uuid().optional(),
        companyId: z.string().uuid().optional(),
        taskId: z.string().uuid().optional(),
        subject: z.string().optional(),
        body: z.string().min(1),
        idempotencyKey: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        occurredAt: z.string().datetime().optional()
      },
      async (input) => toContent(await tools.services.addNote(input))
    );

    server.tool(
      "crm.record_event",
      "Append one idempotent event to the CRM timeline, such as a message, connection request, email, note, or meeting.",
      {
        leadId: z.string().uuid().optional(),
        personId: z.string().uuid().optional(),
        companyId: z.string().uuid().optional(),
        taskId: z.string().uuid().optional(),
        lead: z
          .object({
            fullName: z.string().min(1),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            company: z.string().optional(),
            companyDomain: z.string().optional(),
            website: z.string().url().optional(),
            industry: z.string().optional(),
            companySize: z.string().optional(),
            title: z.string().optional(),
            department: z.string().optional(),
            seniority: z.string().optional(),
            timezone: z.string().optional(),
            linkedinUrl: z.string().url().optional(),
            salesnavUrl: z.string().url().optional(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            location: z.string().optional(),
            source: z.string().optional(),
            notes: z.string().optional()
          })
          .optional(),
        assignmentId: z.string().uuid().optional(),
        type: z.enum([
          "connection_request_sent",
          "connection_request_received",
          "connection_sent",
          "connection_accepted",
          "message_sent",
          "message_received",
          "inmail_sent",
          "email_sent",
          "email_received",
          "follow_up_due",
          "booking_created",
          "meeting_booked",
          "not_interested",
          "converted",
          "manual_note"
        ]),
        channel: z.enum(["linkedin", "salesnav", "email", "scheduler", "manual"]),
        direction: z.enum(["outbound", "inbound", "internal"]).default("internal"),
        subject: z.string().optional(),
        body: z.string().optional(),
        providerThreadId: z.string().optional(),
        providerMessageId: z.string().optional(),
        externalId: z.string().optional(),
        externalUrl: z.string().url().optional(),
        idempotencyKey: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        occurredAt: z.string().datetime().optional()
      },
      async (input) => toContent(await tools.services.logActivity(input))
    );

    server.tool(
      "crm.log_activity",
      "Append an activity to a lead or assignment timeline.",
      {
        leadId: z.string().uuid().optional(),
        personId: z.string().uuid().optional(),
        companyId: z.string().uuid().optional(),
        taskId: z.string().uuid().optional(),
        assignmentId: z.string().uuid().optional(),
        type: z.enum([
          "connection_request_sent",
          "connection_request_received",
          "connection_sent",
          "connection_accepted",
          "message_sent",
          "message_received",
          "inmail_sent",
          "email_sent",
          "email_received",
          "follow_up_due",
          "booking_created",
          "meeting_booked",
          "not_interested",
          "converted",
          "manual_note"
        ]),
        channel: z.enum(["linkedin", "salesnav", "email", "scheduler", "manual"]),
        direction: z.enum(["outbound", "inbound", "internal"]).default("internal"),
        subject: z.string().optional(),
        body: z.string().optional(),
        providerThreadId: z.string().optional(),
        providerMessageId: z.string().optional(),
        externalId: z.string().optional(),
        externalUrl: z.string().url().optional(),
        idempotencyKey: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        occurredAt: z.string().datetime().optional()
      },
      async (input) => toContent(await tools.services.logActivity(input))
    );

    server.tool(
      "crm.update_assignment_status",
      "Update assignment status, priority, owner, contacted time, or next action.",
      {
        assignmentId: z.string().uuid(),
        patch: z.object({
          currentStepId: z.string().uuid().nullable().optional(),
          status: z
            .enum([
              "new",
              "queued",
              "connection_sent",
              "connected",
              "messaged",
              "follow_up_due",
              "replied",
              "meeting_booked",
              "won",
              "lost",
              "do_not_contact"
            ])
            .optional(),
          priority: z.number().int().optional(),
          ownerAgentId: z.string().uuid().nullable().optional(),
          lastContactedAt: z.string().datetime().nullable().optional(),
          nextActionAt: z.string().datetime().nullable().optional()
        })
      },
      async (input) => toContent(await tools.services.updateAssignment(input.assignmentId, input.patch))
    );

    server.tool(
      "crm.create_event_type",
      "Create a scheduler event type.",
      {
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        durationMinutes: z.number().int().min(5),
        bufferBeforeMinutes: z.number().int().default(0),
        bufferAfterMinutes: z.number().int().default(0),
        bookingWindowDays: z.number().int().default(30)
      },
      async (input) => toContent(await tools.services.createEventType(input))
    );

    server.tool(
      "crm.get_availability",
      "Return available slots for a booking link slug.",
      {
        slug: z.string().min(1)
      },
      async (input) => toContent(await tools.services.getAvailability(input.slug))
    );

    server.tool(
      "crm.create_booking",
      "Create a scheduler booking for a booking link slug.",
      {
        slug: z.string().min(1),
        startsAt: z.string().datetime(),
        attendeeName: z.string().min(1),
        attendeeEmail: z.string().email(),
        leadId: z.string().uuid().optional()
      },
      async (input) =>
        toContent(
          await tools.services.createBooking(input.slug, {
            startsAt: input.startsAt,
            attendeeName: input.attendeeName,
            attendeeEmail: input.attendeeEmail,
            leadId: input.leadId
          })
        )
    );

    server.tool(
      "crm.get_backup_health",
      "Inspect latest backup state. Degraded means no successful backup within 26 hours.",
      {},
      async () => toContent(await tools.services.getBackupHealth())
    );

    server.tool(
      "crm.request_approval",
      "Create an approval request for a high-impact agent operation.",
      {
        agentId: z.string().uuid().optional(),
        operation: z.string().min(1),
        reason: z.string().optional(),
        payloadJson: z.unknown().optional()
      },
      async (input) => toContent(await tools.services.createApproval(input))
    );

    server.tool(
      "crm.create_agent_branch",
      "Create or switch to an agent branch. This is a system-level operation.",
      {
        agentName: z.string().min(1),
        shortTask: z.string().min(1)
      },
      async (input) => toContent(await createAgentBranch(input.agentName, input.shortTask))
    );

    server.tool(
      "crm.summarize_branch_changes",
      "Summarize current branch status, commits, and diff stat against origin/master.",
      {},
      async () => toContent(await summarizeBranchChanges())
    );

    server.tool(
      "crm.prepare_pr",
      "Prepare a PR title and body. Does not open the PR; opening requires approval.",
      {
        title: z.string().optional()
      },
      async (input) => toContent(await preparePr(input.title))
    );

    const transport = new StreamableHTTPServerTransport({});

    await server.connect(transport as Parameters<typeof server.connect>[0]);
    await transport.handleRequest(request.raw, reply.raw, request.body);
    return reply;
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const app = await buildMcpHttpServer();
  await app.listen({ host: config.host, port: config.port });
}
