import cors from "@fastify/cors";
import { createCrmServices } from "@orkestr-crm/core";
import { createDatabase } from "@orkestr-crm/db";
import Fastify from "fastify";
import { ZodError } from "zod";
import { loadConfig } from "./config.js";

export async function buildServer() {
  const config = loadConfig();
  const { db, queryClient } = createDatabase(config.databaseUrl);
  const services = createCrmServices({ db });

  const app = Fastify({
    logger: {
      level: config.logLevel
    }
  });

  app.addHook("onClose", async () => {
    await queryClient.end();
  });

  await app.register(cors, {
    origin: true
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "validation_error",
        issues: error.issues
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: "internal_server_error"
    });
  });

  app.get("/api/health", async () => {
    return services.health();
  });

  app.get("/api/leads", async (request) => {
    const query = request.query as { q?: string; limit?: string };
    return services.listLeads({
      query: query.q,
      limit: query.limit ? Number(query.limit) : undefined
    });
  });

  app.post("/api/leads", async (request, reply) => {
    const created = await services.createLead(request.body);
    return reply.status(201).send(created);
  });

  app.get("/api/leads/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const lead = await services.getLead(params.id);
    if (!lead) {
      return reply.status(404).send({ error: "lead_not_found" });
    }
    return lead;
  });

  app.patch("/api/leads/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const updated = await services.updateLead(params.id, request.body);
    if (!updated) {
      return reply.status(404).send({ error: "lead_not_found" });
    }
    return updated;
  });

  app.get("/api/flows", async () => services.listFlows());

  app.post("/api/flows", async (request, reply) => {
    const created = await services.createFlow(request.body);
    return reply.status(201).send(created);
  });

  app.get("/api/assignments", async (request) => {
    const query = request.query as { status?: string; limit?: string };
    return services.listAssignments({
      status: query.status,
      limit: query.limit ? Number(query.limit) : undefined
    });
  });

  app.get("/api/assignments/due", async () => {
    return services.getDailyQueue({ limit: 100 });
  });

  app.post("/api/assignments", async (request, reply) => {
    const created = await services.createAssignment(request.body);
    return reply.status(201).send(created);
  });

  app.patch("/api/assignments/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const updated = await services.updateAssignment(params.id, request.body);
    if (!updated) {
      return reply.status(404).send({ error: "assignment_not_found" });
    }
    return updated;
  });

  app.post("/api/activities", async (request, reply) => {
    const created = await services.logActivity(request.body);
    return reply.status(201).send(created);
  });

  app.get("/api/leads/:id/activities", async (request) => {
    const params = request.params as { id: string };
    return services.listLeadActivities(params.id, 100);
  });

  app.get("/api/event-types", async () => services.listEventTypes());

  app.post("/api/event-types", async (request, reply) => {
    const created = await services.createEventType(request.body);
    return reply.status(201).send(created);
  });

  app.get("/api/booking-links/:slug/availability", async (request) => {
    const params = request.params as { slug: string };
    return services.getAvailability(params.slug);
  });

  app.post("/api/booking-links/:slug/book", async (request, reply) => {
    const params = request.params as { slug: string };
    const booking = await services.createBooking(params.slug, request.body);
    return reply.status(201).send(booking);
  });

  app.get("/api/integration-accounts", async () => services.listIntegrationAccounts());

  app.post("/api/integration-accounts", async (request, reply) => {
    const created = await services.upsertIntegrationAccount(request.body);
    return reply.status(201).send(created);
  });

  app.post("/api/integration-accounts/:id/test", async (request) => {
    const params = request.params as { id: string };
    return services.testIntegrationAccount(params.id);
  });

  app.post("/api/integration-accounts/:id/sync", async (request) => {
    const params = request.params as { id: string };
    return services.syncIntegrationAccount(params.id);
  });

  app.get("/api/system/backup-health", async () => services.getBackupHealth());

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const app = await buildServer();
  await app.listen({ host: config.host, port: config.port });
}
