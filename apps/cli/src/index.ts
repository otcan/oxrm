#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

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
    apiUrl: String(flags.get("api-url") ?? process.env.CRM_API_URL ?? "http://127.0.0.1:3000"),
    mcpUrl: String(flags.get("mcp-url") ?? process.env.CRM_MCP_URL ?? "http://127.0.0.1:3010/mcp"),
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
  const response = await fetch(`${ctx.apiUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(JSON.stringify({ status: response.status, body }));
  }

  return body;
}

async function withMcpClient<T>(ctx: CliContext, cb: (client: Client) => Promise<T>) {
  const client = new Client({ name: "orkestr-crm-cli", version: "0.1.0" });
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

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const ctx = getContext(parsed.flags);

  switch (parsed.command) {
    case "help":
      print(
        {
          commands: [
            "health",
            "lead:create --name NAME [--email EMAIL] [--linkedin-url URL]",
            "lead:list [--query QUERY]",
            "activity:log --lead-id ID --type manual_note --channel manual --body TEXT",
            "queue:due",
            "backup:health",
            "mcp:tools",
            "mcp:call TOOL --input '{...}'",
            "mcp:read URI",
            "mcp:prompt NAME --args '{...}'",
            "smoke"
          ]
        },
        true
      );
      break;

    case "health":
      print({
        api: await requestApi(ctx, "/api/health"),
        mcp: await fetch(ctx.mcpUrl.replace(/\/mcp$/, "/health")).then((res) => res.json())
      });
      break;

    case "lead:create":
      print(
        await requestApi(ctx, "/api/leads", {
          method: "POST",
          body: JSON.stringify({
            fullName: parsed.flags.get("name"),
            email: parsed.flags.get("email") || undefined,
            linkedinUrl: parsed.flags.get("linkedin-url") || undefined,
            source: parsed.flags.get("source") || "cli"
          })
        })
      );
      break;

    case "lead:list":
      print(await requestApi(ctx, `/api/leads${parsed.flags.get("query") ? `?q=${encodeURIComponent(String(parsed.flags.get("query")))}` : ""}`));
      break;

    case "activity:log":
      print(
        await requestApi(ctx, "/api/activities", {
          method: "POST",
          body: JSON.stringify({
            leadId: parsed.flags.get("lead-id"),
            type: parsed.flags.get("type") ?? "manual_note",
            channel: parsed.flags.get("channel") ?? "manual",
            direction: parsed.flags.get("direction") ?? "internal",
            body: parsed.flags.get("body") ?? "CLI note"
          })
        })
      );
      break;

    case "queue:due":
      print(await requestApi(ctx, "/api/assignments/due"));
      break;

    case "backup:health":
      print(await requestApi(ctx, "/api/system/backup-health"));
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

    case "smoke": {
      const health = await requestApi(ctx, "/api/health");
      const mcpTools = await withMcpClient(ctx, (client) => client.listTools());
      const lead = await requestApi(ctx, "/api/leads", {
        method: "POST",
        body: JSON.stringify({
          fullName: `CLI Smoke ${new Date().toISOString()}`,
          email: `smoke-${Date.now()}@example.test`,
          source: "cli-smoke"
        })
      });
      const activity = await requestApi(ctx, "/api/activities", {
        method: "POST",
        body: JSON.stringify({
          leadId: lead.id,
          type: "manual_note",
          channel: "manual",
          direction: "internal",
          body: "CLI smoke activity"
        })
      });
      const queue = await requestApi(ctx, "/api/assignments/due");
      const backup = await requestApi(ctx, "/api/system/backup-health");

      print({ health, mcpToolCount: mcpTools.tools.length, lead, activity, queueCount: queue.length, backup });
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
