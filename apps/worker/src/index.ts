import { plannedConnectors } from "./connectors.js";

const intervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 30_000);

async function tick() {
  console.log(
    JSON.stringify({
      service: "orkestr-crm-worker",
      status: "idle",
      connectors: plannedConnectors.map((connector) => connector.provider),
      message: "Connector queue scaffolding is ready; concrete SalesNav, LinkedIn, and email jobs come next."
    })
  );
}

await tick();
setInterval(() => {
  void tick();
}, intervalMs);
