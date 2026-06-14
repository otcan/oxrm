import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

export async function buildMcpHttpServer() {
  const config = loadConfig();
  const tools = createCrmTools(config.databaseUrl);
  const app = Fastify({ logger: { level: config.logLevel } });

  app.addHook("onClose", async () => {
    await tools.close();
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "orkestr-crm-mcp"
  }));

  app.all("/mcp", async (request, reply) => {
    const server = new McpServer({
      name: "orkestr-crm",
      version: "0.1.0"
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

    server.resource("crm.integrations.health", "crm://integrations/health", async (uri) => ({
      contents: [{ uri: uri.href, text: JSON.stringify(await tools.services.listIntegrationAccounts(), null, 2) }]
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
      "crm.get_lead",
      "Read one lead with assignments, activities, and bookings.",
      {
        leadId: z.string().uuid()
      },
      async (input) => toContent(await tools.services.getLead(input.leadId))
    );

    server.tool(
      "crm.create_lead",
      "Create a CRM lead. Routine write; audited action support will be added with agent identity.",
      {
        fullName: z.string().min(1),
        company: z.string().optional(),
        title: z.string().optional(),
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
      "crm.log_activity",
      "Append an activity to a lead or assignment timeline.",
      {
        leadId: z.string().uuid(),
        assignmentId: z.string().uuid().optional(),
        integrationAccountId: z.string().uuid().optional(),
        type: z.enum([
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
        body: z.string().optional(),
        externalId: z.string().optional(),
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
      "crm.list_integration_accounts",
      "List configured external integration accounts.",
      {},
      async () => toContent(await tools.services.listIntegrationAccounts())
    );

    server.tool(
      "crm.create_integration_account",
      "Create a connector account placeholder for SalesNav, LinkedIn, email, or calendar.",
      {
        provider: z.enum(["linkedin", "salesnav", "gmail", "outlook", "google_calendar", "microsoft_calendar", "caldav"]),
        displayName: z.string().min(1),
        status: z.enum(["active", "needs_auth", "paused", "error", "archived"]).default("needs_auth"),
        authType: z.string().default("oauth"),
        credentialsRef: z.string().optional()
      },
      async (input) => toContent(await tools.services.upsertIntegrationAccount(input))
    );

    server.tool(
      "crm.test_integration_account",
      "Test a connector account without importing data.",
      {
        integrationAccountId: z.string().uuid()
      },
      async (input) => toContent(await tools.services.testIntegrationAccount(input.integrationAccountId))
    );

    server.tool(
      "crm.sync_integration_account",
      "Run an idempotent connector sync placeholder for an integration account.",
      {
        integrationAccountId: z.string().uuid()
      },
      async (input) => toContent(await tools.services.syncIntegrationAccount(input.integrationAccountId))
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
