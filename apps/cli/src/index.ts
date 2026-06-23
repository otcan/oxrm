#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { OXRM_PRODUCT_NAME, OXRM_PRODUCT_SLUG, OXRM_PRODUCT_VERSION, planActionSchema } from "@oxrm/shared";
import { z } from "zod";

interface CliContext {
  apiUrl: string;
  mcpUrl: string;
  json: boolean;
}

function parseArgs(argv: string[]) {
  if (argv[0] === "--") {
    argv = argv.slice(1);
  }

  const [command = "help", ...rest] = argv;
  const flags = new Map<string, string | boolean>();
  const positional: string[] = [];

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg) {
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[index + 1];
      if (next && !next.startsWith("--")) {
        flags.set(key, next);
        index += 1;
      } else {
        flags.set(key, true);
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, flags, positional };
}

function getContext(flags: Map<string, string | boolean>): CliContext {
  return {
    apiUrl: String(flags.get("api-url") ?? process.env.OXRM_API_URL ?? process.env.CRM_API_URL ?? "http://127.0.0.1:18181"),
    mcpUrl: String(flags.get("mcp-url") ?? process.env.OXRM_MCP_URL ?? process.env.CRM_MCP_URL ?? "http://127.0.0.1:18182/mcp"),
    json: flags.get("json") === true
  };
}

function print(value: unknown, json = true) {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  console.log(value);
}

async function requestApi(ctx: CliContext, path: string, init?: RequestInit) {
  const headers =
    init?.body === undefined
      ? init?.headers
      : {
          "content-type": "application/json",
          ...(init?.headers ?? {})
        };
  const requestInit: RequestInit = headers === undefined ? { ...init } : { ...init, headers };
  const response = await fetch(`${ctx.apiUrl}${path}`, requestInit);

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(JSON.stringify({ status: response.status, body }));
  }

  return body;
}

async function withMcpClient<T>(ctx: CliContext, cb: (client: Client) => Promise<T>) {
  const client = new Client({ name: "oxrm-cli", version: OXRM_PRODUCT_VERSION });
  const transport = new StreamableHTTPClientTransport(new URL(ctx.mcpUrl));
  await client.connect(transport as Parameters<typeof client.connect>[0]);

  try {
    return await cb(client);
  } finally {
    await client.close();
  }
}

function parseJsonFlag(flags: Map<string, string | boolean>, key: string) {
  const value = flags.get(key);
  if (typeof value !== "string") {
    return {};
  }

  return JSON.parse(value);
}

const planInputSchema = z.union([planActionSchema, z.array(planActionSchema)]);

function defaultJobSearchSetupInput() {
  return {
    sources: [
      {
        title: "Job boards and alerts",
        channel: "job_board",
        sourceUrl: "https://example.invalid/jobs",
        cadence: "daily",
        importInstructions: "Import or paste job postings with source URL, company, role, location, raw description, and received date.",
        privacyNotes: "Keep real credentials and private alert URLs outside the repository."
      },
      {
        title: "Recruiter inbox",
        channel: "email",
        sourceUrl: "mailto:recruiter-inbox@example.invalid",
        cadence: "daily",
        importInstructions: "Extract recruiter, company, position, communication thread, job description, and next follow-up.",
        privacyNotes: "Use local credentials only. Do not use real inbox data in public demos."
      }
    ]
  };
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const ctx = getContext(parsed.flags);

  switch (parsed.command) {
    case "help":
      print(
        {
          commands: [
            "health",
            "version",
            "lead:create --name NAME [--email EMAIL] [--company COMPANY] [--domain DOMAIN] [--linkedin-url URL]",
            "lead:list [--query QUERY]",
            "person:list [--query QUERY]",
            "company:list [--query QUERY]",
            "activity:log --lead-id ID --type manual_note --channel manual --body TEXT",
            "event:list [--lead-id ID] [--person-id ID] [--channel email]",
            "event:record --type email_received --channel email [--lead-id ID | --name NAME --email EMAIL] [--subject TEXT]",
            "outreach:record --name NAME --linkedin-url URL [--external-key KEY] [--flow-id ID]",
            "outreach:backfill [--execute] [--lead-id ID] [--activity-id ID] [--limit 50]",
            "job:actions JOB_ID",
            "job:action JOB_ID ACTION [--reason TEXT]",
            "setup:job-search [--input '{...}']",
            "setup:job-search:get",
            "setup:job-search:next",
            "queue:due",
            "task:list [--status open]",
            "task:create --title TITLE [--lead-id ID] [--due-at ISO]",
            "task:done --task-id ID",
            "backup:health",
            "testing:synthetic",
            "testing:cleanup",
            "mcp:tools",
            "mcp:call TOOL --input '{...}'",
            "mcp:read URI",
            "mcp:prompt NAME --args '{...}'",
            "plan:validate --input '{...}'",
            "smoke [--keep-test-data]"
          ]
        },
        true
      );
      break;

    case "health":
      print({
        product: {
          name: OXRM_PRODUCT_NAME,
          slug: OXRM_PRODUCT_SLUG,
          version: OXRM_PRODUCT_VERSION
        },
        api: await requestApi(ctx, "/api/health"),
        mcp: await fetch(ctx.mcpUrl.replace(/\/mcp$/, "/health")).then((res) => res.json())
      });
      break;

    case "version":
      print({
        product: {
          name: OXRM_PRODUCT_NAME,
          slug: OXRM_PRODUCT_SLUG,
          version: OXRM_PRODUCT_VERSION
        },
        apiUrl: ctx.apiUrl,
        mcpUrl: ctx.mcpUrl
      });
      break;

    case "lead:create":
      print(
        await requestApi(ctx, "/api/leads", {
          method: "POST",
          body: JSON.stringify({
            fullName: parsed.flags.get("name"),
            email: parsed.flags.get("email") || undefined,
            company: parsed.flags.get("company") || undefined,
            companyDomain: parsed.flags.get("domain") || undefined,
            website: parsed.flags.get("website") || undefined,
            title: parsed.flags.get("title") || undefined,
            department: parsed.flags.get("department") || undefined,
            seniority: parsed.flags.get("seniority") || undefined,
            timezone: parsed.flags.get("timezone") || undefined,
            linkedinUrl: parsed.flags.get("linkedin-url") || undefined,
            salesnavUrl: parsed.flags.get("salesnav-url") || undefined,
            phone: parsed.flags.get("phone") || undefined,
            location: parsed.flags.get("location") || undefined,
            source: parsed.flags.get("source") || "cli"
          })
        })
      );
      break;

    case "lead:list":
      print(await requestApi(ctx, `/api/leads${parsed.flags.get("query") ? `?q=${encodeURIComponent(String(parsed.flags.get("query")))}` : ""}`));
      break;

    case "person:list":
      print(await requestApi(ctx, `/api/people${parsed.flags.get("query") ? `?q=${encodeURIComponent(String(parsed.flags.get("query")))}` : ""}`));
      break;

    case "company:list":
      print(await requestApi(ctx, `/api/companies${parsed.flags.get("query") ? `?q=${encodeURIComponent(String(parsed.flags.get("query")))}` : ""}`));
      break;

    case "event:list": {
      const params = new URLSearchParams();
      for (const [flag, query] of [
        ["lead-id", "leadId"],
        ["person-id", "personId"],
        ["company-id", "companyId"],
        ["task-id", "taskId"],
        ["channel", "channel"],
        ["limit", "limit"]
      ] as const) {
        const value = parsed.flags.get(flag);
        if (value) {
          params.set(query, String(value));
        }
      }
      print(await requestApi(ctx, `/api/events${params.size > 0 ? `?${params.toString()}` : ""}`));
      break;
    }

    case "task:list":
      print(await requestApi(ctx, `/api/tasks${parsed.flags.get("status") ? `?status=${encodeURIComponent(String(parsed.flags.get("status")))}` : ""}`));
      break;

    case "task:create":
      print(
        await requestApi(ctx, "/api/tasks", {
          method: "POST",
          body: JSON.stringify({
            title: parsed.flags.get("title"),
            description: parsed.flags.get("description") || undefined,
            type: parsed.flags.get("type") || "manual",
            priority: parsed.flags.get("priority") ? Number(parsed.flags.get("priority")) : 0,
            dueAt: parsed.flags.get("due-at") || undefined,
            leadId: parsed.flags.get("lead-id") || undefined,
            assignmentId: parsed.flags.get("assignment-id") || undefined,
            idempotencyKey: parsed.flags.get("key") || undefined
          })
        })
      );
      break;

    case "task:done":
      print(
        await requestApi(ctx, `/api/tasks/${parsed.flags.get("task-id") ?? parsed.positional[0]}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "done" })
        })
      );
      break;

    case "activity:log":
      print(
        await requestApi(ctx, "/api/activities", {
          method: "POST",
          body: JSON.stringify({
            leadId: parsed.flags.get("lead-id"),
            personId: parsed.flags.get("person-id") || undefined,
            companyId: parsed.flags.get("company-id") || undefined,
            taskId: parsed.flags.get("task-id") || undefined,
            type: parsed.flags.get("type") ?? "manual_note",
            channel: parsed.flags.get("channel") ?? "manual",
            direction: parsed.flags.get("direction") ?? "internal",
            subject: parsed.flags.get("subject") || undefined,
            body: parsed.flags.get("body") ?? "CLI note",
            externalId: parsed.flags.get("external-id") || undefined,
            idempotencyKey: parsed.flags.get("key") || undefined
          })
        })
      );
      break;

    case "event:record":
      print(
        await requestApi(ctx, "/api/events", {
          method: "POST",
          body: JSON.stringify({
            leadId: parsed.flags.get("lead-id") || undefined,
            personId: parsed.flags.get("person-id") || undefined,
            companyId: parsed.flags.get("company-id") || undefined,
            taskId: parsed.flags.get("task-id") || undefined,
            lead:
              parsed.flags.get("name") || parsed.flags.get("email")
                ? {
                    fullName: parsed.flags.get("name") || parsed.flags.get("email"),
                    email: parsed.flags.get("email") || undefined,
                    company: parsed.flags.get("company") || undefined,
                    companyDomain: parsed.flags.get("domain") || undefined,
                    linkedinUrl: parsed.flags.get("linkedin-url") || undefined,
                    salesnavUrl: parsed.flags.get("salesnav-url") || undefined,
                    source: parsed.flags.get("source") || "cli-event"
                  }
                : undefined,
            type: parsed.flags.get("type") ?? "manual_note",
            channel: parsed.flags.get("channel") ?? "manual",
            direction: parsed.flags.get("direction") ?? "internal",
            subject: parsed.flags.get("subject") || undefined,
            body: parsed.flags.get("body") || undefined,
            providerThreadId: parsed.flags.get("thread-id") || undefined,
            providerMessageId: parsed.flags.get("message-id") || undefined,
            externalId: parsed.flags.get("external-id") || undefined,
            externalUrl: parsed.flags.get("external-url") || undefined,
            idempotencyKey: parsed.flags.get("key") || parsed.flags.get("external-id") || undefined,
            occurredAt: parsed.flags.get("occurred-at") || undefined
          })
        })
      );
      break;

    case "outreach:record":
      print(
        await requestApi(ctx, "/api/outreach-events", {
          method: "POST",
          body: JSON.stringify({
            externalKey: parsed.flags.get("external-key") || undefined,
            lead: {
              fullName: parsed.flags.get("name"),
              linkedinUrl: parsed.flags.get("linkedin-url") || undefined,
              salesnavUrl: parsed.flags.get("salesnav-url") || undefined,
              email: parsed.flags.get("email") || undefined,
              company: parsed.flags.get("company") || undefined,
              title: parsed.flags.get("title") || undefined,
              source: parsed.flags.get("source") || "cli-outreach"
            },
            assignment: {
              flowId: parsed.flags.get("flow-id") || undefined,
              status: parsed.flags.get("status") || "connection_sent",
              lastContactedAt: parsed.flags.get("occurred-at") || new Date().toISOString()
            },
            activity: {
              type: parsed.flags.get("type") || "connection_sent",
              channel: parsed.flags.get("channel") || "linkedin",
              direction: parsed.flags.get("direction") || "outbound",
              subject: parsed.flags.get("subject") || undefined,
              body: parsed.flags.get("body") || "Recorded LinkedIn outreach event",
              noteStatus: parsed.flags.get("note-status") || undefined,
              proposedNote: parsed.flags.get("proposed-note") || undefined,
              linkedinResult: parsed.flags.get("linkedin-result") || undefined,
              sourceQuery: parsed.flags.get("source-query") || undefined,
              searchPage: parsed.flags.get("search-page") ? Number(parsed.flags.get("search-page")) : undefined,
              auditDirectory: parsed.flags.get("audit-directory") || undefined,
              rowText: parsed.flags.get("row-text") || undefined,
              profileUrl: parsed.flags.get("profile-url") || parsed.flags.get("linkedin-url") || undefined,
              metadata: parseJsonFlag(parsed.flags, "metadata"),
              occurredAt: parsed.flags.get("occurred-at") || new Date().toISOString()
            },
            nextActionTask:
              parsed.flags.get("no-next-task") === true
                ? false
                : {
                    title: parsed.flags.get("task-title") || undefined,
                    dueAt: parsed.flags.get("task-due-at") || undefined,
                    dueInDays: parsed.flags.get("task-due-in-days") ? Number(parsed.flags.get("task-due-in-days")) : undefined,
                    priority: parsed.flags.get("task-priority") ? Number(parsed.flags.get("task-priority")) : undefined,
                    idempotencyKey: parsed.flags.get("task-key") || undefined
                  }
          })
        })
      );
      break;

    case "outreach:backfill":
      print(
        await requestApi(ctx, "/api/outreach-events/backfill", {
          method: "POST",
          body: JSON.stringify({
            dryRun: parsed.flags.get("execute") !== true,
            activityId: parsed.flags.get("activity-id") || undefined,
            leadId: parsed.flags.get("lead-id") || undefined,
            channel: parsed.flags.get("channel") || "linkedin",
            limit: parsed.flags.get("limit") ? Number(parsed.flags.get("limit")) : 50,
            createTasks: parsed.flags.get("no-create-tasks") !== true,
            overwriteConfirmedBody: parsed.flags.get("overwrite-confirmed-body") === true
          })
        })
      );
      break;

    case "job:actions":
      print(await requestApi(ctx, `/api/jobs/${parsed.positional[0] ?? parsed.flags.get("job-id")}/workflow`));
      break;

    case "job:action":
      print(
        await requestApi(ctx, `/api/jobs/${parsed.positional[0] ?? parsed.flags.get("job-id")}/actions`, {
          method: "POST",
          body: JSON.stringify({
            action: parsed.positional[1] ?? parsed.flags.get("action"),
            reason: parsed.flags.get("reason") || undefined,
            metadata: parseJsonFlag(parsed.flags, "metadata")
          })
        })
      );
      break;

    case "setup:job-search":
      print(
        await requestApi(ctx, "/api/setup/job-search", {
          method: "POST",
          body: JSON.stringify(parsed.flags.get("input") ? parseJsonFlag(parsed.flags, "input") : defaultJobSearchSetupInput())
        })
      );
      break;

    case "setup:job-search:get":
      print(await requestApi(ctx, "/api/setup/job-search"));
      break;

    case "setup:job-search:next":
      print(await requestApi(ctx, "/api/setup/job-search/next"));
      break;

    case "queue:due":
      print(await requestApi(ctx, "/api/assignments/due"));
      break;

    case "backup:health":
      print(await requestApi(ctx, "/api/system/backup-health"));
      break;

    case "testing:synthetic":
      print(await requestApi(ctx, "/api/testing/synthetic"));
      break;

    case "testing:cleanup":
      print(
        await requestApi(ctx, "/api/testing/synthetic", {
          method: "DELETE"
        })
      );
      break;

    case "mcp:tools":
      print(await withMcpClient(ctx, (client) => client.listTools()));
      break;

    case "mcp:call":
      print(
        await withMcpClient(ctx, (client) =>
          client.callTool({
            name: parsed.positional[0] ?? String(parsed.flags.get("tool")),
            arguments: parseJsonFlag(parsed.flags, "input")
          })
        )
      );
      break;

    case "mcp:read":
      print(await withMcpClient(ctx, (client) => client.readResource({ uri: parsed.positional[0] ?? String(parsed.flags.get("uri")) })));
      break;

    case "mcp:prompt":
      print(
        await withMcpClient(ctx, (client) =>
          client.getPrompt({
            name: parsed.positional[0] ?? String(parsed.flags.get("name")),
            arguments: parseJsonFlag(parsed.flags, "args") as Record<string, string>
          })
        )
      );
      break;

    case "plan:validate": {
      const planInput = planInputSchema.parse(parseJsonFlag(parsed.flags, "input"));
      const actions = Array.isArray(planInput) ? planInput : [planInput];
      print({
        status: "ok",
        actionCount: actions.length,
        actions: actions.map((action) => ({
          id: action.id,
          title: action.title,
          surface: action.surface,
          operation: action.operation,
          requiresApproval: action.requiresApproval,
          cliCommand: action.cli ? [action.cli.command, ...action.cli.args].join(" ") : undefined
        }))
      });
      break;
    }

    case "smoke": {
      const health = await requestApi(ctx, "/api/health");
      const mcpTools = await withMcpClient(ctx, (client) => client.listTools());
      let leadId: string | undefined;
      let cleanup: unknown = { skipped: parsed.flags.get("keep-test-data") === true };
      let lead: unknown;
      let duplicateLead: unknown;
      let leadDetail: unknown;
      let activity: unknown;
      let queue: unknown[] = [];
      let flows: unknown[] = [];
      let companies: unknown[] = [];
      let people: unknown[] = [];
      let task: unknown;
      let taskDone: unknown;
      let event: unknown;
      let eventDuplicate: unknown;
      let events: unknown[] = [];
      let outreachLeadId: string | undefined;
      let outreach: unknown;
      let outreachDuplicate: unknown;
      let outreachDetail: unknown;
      let outreachCleanup: unknown = { skipped: parsed.flags.get("keep-test-data") === true };
      let backup: unknown;
      try {
        lead = await requestApi(ctx, "/api/leads", {
          method: "POST",
          body: JSON.stringify({
            fullName: `CLI Smoke ${new Date().toISOString()}`,
            company: "Example Smoke Co",
            companyDomain: "example.test",
            title: "Synthetic Tester",
            email: `smoke-${Date.now()}@example.test`,
            source: "cli-smoke"
          })
        });
        leadId = (lead as { id: string }).id;
        duplicateLead = await requestApi(ctx, "/api/leads", {
          method: "POST",
          body: JSON.stringify({
            fullName: `CLI Smoke Duplicate ${new Date().toISOString()}`,
            company: "Example Smoke Company",
            email: (lead as { email?: string }).email,
            source: "cli-smoke"
          })
        });
        leadDetail = await requestApi(ctx, `/api/leads/${leadId}`);
        companies = await requestApi(ctx, "/api/companies?q=Example%20Smoke");
        people = await requestApi(ctx, "/api/people?q=CLI%20Smoke");
        activity = await requestApi(ctx, "/api/activities", {
          method: "POST",
          body: JSON.stringify({
            leadId,
            type: "manual_note",
            channel: "manual",
            direction: "internal",
            body: "CLI smoke activity"
          })
        });
        const eventKey = `cli-smoke-email-${leadId}`;
        event = await requestApi(ctx, "/api/events", {
          method: "POST",
          body: JSON.stringify({
            leadId,
            type: "email_received",
            channel: "email",
            direction: "inbound",
            subject: "CLI smoke email",
            body: "Synthetic inbound email event",
            providerThreadId: `thread-${leadId}`,
            providerMessageId: `message-${leadId}`,
            idempotencyKey: eventKey,
            metadata: { smoke: true }
          })
        });
        eventDuplicate = await requestApi(ctx, "/api/events", {
          method: "POST",
          body: JSON.stringify({
            leadId,
            type: "email_received",
            channel: "email",
            direction: "inbound",
            subject: "CLI smoke email duplicate",
            idempotencyKey: eventKey
          })
        });
        events = await requestApi(ctx, `/api/events?leadId=${leadId}`);
        queue = await requestApi(ctx, "/api/assignments/due");
        flows = await requestApi(ctx, "/api/flows");
        task = await requestApi(ctx, "/api/tasks", {
          method: "POST",
          body: JSON.stringify({
            title: "CLI smoke task",
            type: "manual",
            leadId,
            dueAt: new Date().toISOString(),
            idempotencyKey: `cli-smoke-task-${leadId}`
          })
        });
        taskDone = await requestApi(ctx, `/api/tasks/${(task as { id: string }).id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "done" })
        });
        const externalKey = `cli-smoke-outreach-${Date.now()}`;
        const outreachBody = {
          externalKey,
          lead: {
            fullName: `CLI Smoke Outreach ${new Date().toISOString()}`,
            linkedinUrl: `https://example.invalid/linkedin/cli-smoke-${Date.now()}`,
            source: "cli-smoke"
          },
          assignment: {
            flowId: (flows[0] as { id?: string } | undefined)?.id,
            status: "connection_sent",
            lastContactedAt: new Date().toISOString()
          },
          activity: {
            type: "connection_sent",
            channel: "linkedin",
            direction: "outbound",
            subject: "Connection request sent: CLI Smoke Outreach",
            noteStatus: "unconfirmed",
            proposedNote: "CLI smoke proposed note",
            linkedinResult: "native_send_verified_pending",
            sourceQuery: "cli smoke",
            profileUrl: `https://example.invalid/linkedin/cli-smoke-${Date.now()}`,
            occurredAt: new Date().toISOString()
          },
          nextActionTask: {
            dueInDays: 5,
            metadata: { smoke: true }
          }
        };
        outreach = await requestApi(ctx, "/api/outreach-events", {
          method: "POST",
          body: JSON.stringify(outreachBody)
        });
        outreachLeadId = (outreach as { lead?: { id?: string } }).lead?.id;
        if (!(outreach as { task?: { id?: string } }).task?.id) {
          throw new Error("Outreach smoke did not create linked next-action task");
        }
        if (outreachLeadId) {
          outreachDetail = await requestApi(ctx, `/api/leads/${outreachLeadId}`);
          const linkedTasks = (outreachDetail as { tasks?: unknown[] }).tasks ?? [];
          if (linkedTasks.length === 0) {
            throw new Error("Outreach lead detail did not include linked task");
          }
        }
        outreachDuplicate = await requestApi(ctx, "/api/outreach-events", {
          method: "POST",
          body: JSON.stringify(outreachBody)
        });
        backup = await requestApi(ctx, "/api/system/backup-health");
      } finally {
        if (parsed.flags.get("keep-test-data") !== true && leadId) {
          cleanup = await requestApi(ctx, `/api/leads/${leadId}`, {
            method: "DELETE"
          });
        }
        if (parsed.flags.get("keep-test-data") !== true && outreachLeadId) {
          outreachCleanup = await requestApi(ctx, `/api/leads/${outreachLeadId}`, {
            method: "DELETE"
          });
        }
      }

      print({
        health,
        mcpToolCount: mcpTools.tools.length,
        lead,
        duplicateLead,
        dedupedLead: leadId === (duplicateLead as { id?: string }).id,
        leadDetail,
        companyCount: companies.length,
        peopleCount: people.length,
        activity,
        event,
        eventDuplicate,
        dedupedEvent: (event as { id?: string }).id === (eventDuplicate as { id?: string }).id,
        eventCount: events.length,
        task,
        taskDone,
        queueCount: queue.length,
        flowCount: flows.length,
        outreach,
        outreachDuplicate,
        dedupedOutreach: (outreach as { activity?: { id?: string } }).activity?.id === (outreachDuplicate as { activity?: { id?: string } }).activity?.id,
        outreachDetail,
        backup,
        cleanup,
        outreachCleanup
      });
      break;
    }

    default:
      throw new Error(`Unknown command: ${parsed.command}`);
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
