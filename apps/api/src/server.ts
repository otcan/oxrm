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

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "validation_error",
        requestId: request.id,
        issues: error.issues
      });
    }

    const normalizedError = error instanceof Error ? error : new Error(String(error));
    const errorRecord = error as { statusCode?: unknown; code?: unknown };
    const statusCode = typeof errorRecord.statusCode === "number" ? errorRecord.statusCode : 500;
    const errorCode = typeof errorRecord.code === "string" ? errorRecord.code : undefined;
    request.log.error(
      {
        err: normalizedError,
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode,
        errorCode
      },
      "API request failed"
    );

    return reply.status(statusCode).send({
      error: statusCode >= 500 ? "internal_server_error" : "request_error",
      requestId: request.id,
      code: errorCode,
      ...(config.nodeEnv !== "production" ? { message: normalizedError.message } : {})
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

  app.get("/api/people", async (request) => {
    const query = request.query as { q?: string; limit?: string };
    return services.listPeople({
      query: query.q,
      limit: query.limit ? Number(query.limit) : undefined
    });
  });

  app.get("/api/companies", async (request) => {
    const query = request.query as { q?: string; limit?: string };
    return services.listCompanies({
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

  app.delete("/api/leads/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const result = await services.deleteLead(params.id);
    if (!result.deleted) {
      return reply.status(404).send({ error: "lead_not_found" });
    }
    return result;
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

  app.get("/api/tasks", async (request) => {
    const query = request.query as { status?: string; limit?: string };
    return services.listTasks({
      status: query.status,
      limit: query.limit ? Number(query.limit) : undefined
    });
  });

  app.post("/api/tasks", async (request, reply) => {
    const created = await services.createTask(request.body);
    return reply.status(201).send(created);
  });

  app.patch("/api/tasks/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const updated = await services.updateTask(params.id, request.body);
    if (!updated) {
      return reply.status(404).send({ error: "task_not_found" });
    }
    return updated;
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

  app.post("/api/outreach-events", async (request, reply) => {
    const result = await services.recordOutreachEvent(request.body);
    return reply.status(result.idempotent ? 200 : 201).send(result);
  });

  app.post("/api/activities", async (request, reply) => {
    const created = await services.logActivity(request.body);
    return reply.status(201).send(created);
  });

  app.get("/api/activities", async (request) => {
    const query = request.query as {
      leadId?: string;
      personId?: string;
      companyId?: string;
      taskId?: string;
      channel?: string;
      limit?: string;
    };
    return services.listActivities({
      leadId: query.leadId,
      personId: query.personId,
      companyId: query.companyId,
      taskId: query.taskId,
      channel: query.channel,
      limit: query.limit ? Number(query.limit) : undefined
    });
  });

  app.get("/api/events", async (request) => {
    const query = request.query as {
      leadId?: string;
      personId?: string;
      companyId?: string;
      taskId?: string;
      channel?: string;
      limit?: string;
    };
    return services.listActivities({
      leadId: query.leadId,
      personId: query.personId,
      companyId: query.companyId,
      taskId: query.taskId,
      channel: query.channel,
      limit: query.limit ? Number(query.limit) : undefined
    });
  });

  app.post("/api/events", async (request, reply) => {
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

  app.get("/api/testing/synthetic", async () => services.getSyntheticDataSummary());

  app.delete("/api/testing/synthetic", async () => services.cleanupSyntheticData());

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const app = await buildServer();
  await app.listen({ host: config.host, port: config.port });
}
