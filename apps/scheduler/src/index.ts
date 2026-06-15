import { subtractBusyBlocks } from "./availability.js";

const intervalMs = Number(process.env.SCHEDULER_POLL_INTERVAL_MS ?? 60_000);

async function tick() {
  const available = subtractBusyBlocks(
    [{ startsAt: new Date(Date.now() + 60_000), endsAt: new Date(Date.now() + 30 * 60_000) }],
    []
  );

  console.log(
    JSON.stringify({
      service: "orkestr-crm-scheduler",
      status: "idle",
      sampleAvailableWindows: available.length,
      message: "Availability engine scaffold is ready; external calendar free/busy connectors come next."
    })
  );
}

await tick();
setInterval(() => {
  void tick();
}, intervalMs);

