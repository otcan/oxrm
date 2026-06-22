import cors from "@fastify/cors";
import { createCrmServices } from "@oxrm/core";
import { createDatabase } from "@oxrm/db";
import Fastify from "fastify";
import { ZodError } from "zod";
import { loadConfig } from "./config.js";

function parseJsonQuery(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    const error = new Error("invalid_json_query");
    (error as Error & { statusCode?: number; code?: string }).statusCode = 400;
    (error as Error & { statusCode?: number; code?: string }).code = "invalid_json_query";
    throw error;
  }
}

export async function buildServer() {
  const config = loadConfig();
  const { db, queryClient } = createDatabase(config.databaseUrl);
  const services = createCrmServices({ db, backupsRequired: config.backupsRequired });

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

  app.get("/api/workspace/bootstrap", async () => {
    return resolveWorkspaceBootstrap();
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

  app.get("/api/xrm/object-types", async (request) => {
    const query = request.query as { active?: string; templateKey?: string; limit?: string };
    return services.listXrmObjectTypes({
      active: query.active === undefined ? undefined : query.active !== "false",
      templateKey: query.templateKey,
      limit: query.limit ? Number(query.limit) : undefined
    });
  });

  app.post("/api/xrm/object-types", async (request, reply) => {
    const created = await services.createXrmObjectType(request.body);
    return reply.status(201).send(created);
  });

  app.get("/api/xrm/object-types/:slugOrId", async (request, reply) => {
    const params = request.params as { slugOrId: string };
    const objectType = await services.getXrmObjectType(params.slugOrId);
    if (!objectType) {
      return reply.status(404).send({ error: "xrm_object_type_not_found" });
    }
    return objectType;
  });

  app.get("/api/xrm/workspace", async (request) => {
    const query = request.query as { templateKey?: string; limit?: string };
    return services.getWorkspaceLayout({
      templateKey: query.templateKey,
      limit: query.limit ? Number(query.limit) : undefined
    });
  });

  app.get("/api/xrm/semantic-fields", async (request) => {
    const query = request.query as { limit?: string };
    return services.listXrmSemanticFields({ limit: query.limit ? Number(query.limit) : undefined });
  });

  app.post("/api/xrm/semantic-fields", async (request, reply) => {
    const field = await services.upsertXrmSemanticField(request.body);
    return reply.status(201).send(field);
  });

  app.post("/api/xrm/field-mappings", async (request, reply) => {
    const mapping = await services.upsertXrmFieldMapping(request.body);
    return reply.status(201).send(mapping);
  });

  app.get("/api/xrm/records", async (request) => {
    const query = request.query as { objectType?: string; q?: string; includeDeleted?: string; limit?: string };
    return services.searchXrmRecords({
      objectType: query.objectType,
      query: query.q,
      includeDeleted: query.includeDeleted === "true",
      limit: query.limit ? Number(query.limit) : undefined
    });
  });

  app.post("/api/xrm/records", async (request, reply) => {
    const record = await services.upsertXrmRecord(request.body);
    return reply.status(201).send(record);
  });

  app.get("/api/xrm/records/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const record = await services.getXrmRecord(params.id);
    if (!record) {
      return reply.status(404).send({ error: "xrm_record_not_found" });
    }
    return record;
  });

  app.delete("/api/xrm/records/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const result = await services.deleteXrmRecord(params.id);
    if (!result.deleted) {
      return reply.status(404).send({ error: "xrm_record_not_found" });
    }
    return result;
  });

  app.get("/api/xrm/records/:id/events", async (request) => {
    const params = request.params as { id: string };
    const query = request.query as { limit?: string };
    return services.listXrmRecordEvents({ recordId: params.id, limit: query.limit ? Number(query.limit) : undefined });
  });

  app.get("/api/jobs/:id/workflow", async (request) => {
    const params = request.params as { id: string };
    return services.getJobWorkflowState(params.id);
  });

  app.post("/api/jobs/:id/actions", async (request) => {
    const params = request.params as { id: string };
    return services.runJobWorkflowAction(params.id, request.body);
  });

  app.get("/api/setup/job-search", async () => {
    return services.getJobSearchSetup();
  });

  app.post("/api/setup/job-search", async (request, reply) => {
    const setup = await services.configureJobSearchSetup(request.body);
    return reply.status(201).send(setup);
  });

  app.get("/api/xrm/records/:id/files", async (request) => {
    const params = request.params as { id: string };
    const query = request.query as { limit?: string };
    return services.listXrmRecordFiles({ recordId: params.id, limit: query.limit ? Number(query.limit) : undefined });
  });

  app.post("/api/xrm/records/:id/files", async (request, reply) => {
    const params = request.params as { id: string };
    const file = await services.createXrmFile({ ...(request.body as object), recordId: params.id });
    return reply.status(201).send(file);
  });

  app.post("/api/xrm/relationship-types", async (request, reply) => {
    const created = await services.createXrmRelationshipType(request.body);
    return reply.status(201).send(created);
  });

  app.get("/api/xrm/relationships", async (request) => {
    const query = request.query as { recordId?: string; relationshipType?: string; direction?: "source" | "target" | "both"; limit?: string };
    return services.listXrmRelationships({
      recordId: query.recordId,
      relationshipType: query.relationshipType,
      direction: query.direction,
      limit: query.limit ? Number(query.limit) : undefined
    });
  });

  app.post("/api/xrm/relationships", async (request, reply) => {
    const relationship = await services.linkXrmRecords(request.body);
    return reply.status(201).send(relationship);
  });

  app.get("/api/views", async (request) => {
    const query = request.query as { objectType?: string; templateKey?: string; limit?: string };
    return services.listViews({
      objectType: query.objectType,
      templateKey: query.templateKey,
      limit: query.limit ? Number(query.limit) : undefined
    });
  });

  app.post("/api/views", async (request, reply) => {
    const view = await services.createView(request.body);
    return reply.status(201).send(view);
  });

  app.get("/api/views/:idOrKey", async (request, reply) => {
    const params = request.params as { idOrKey: string };
    const view = await services.getView({ viewId: params.idOrKey, key: params.idOrKey });
    if (!view) {
      return reply.status(404).send({ error: "view_not_found" });
    }
    return view;
  });

  app.patch("/api/views/:idOrKey", async (request, reply) => {
    const params = request.params as { idOrKey: string };
    const view = await services.updateView({ viewId: params.idOrKey, key: params.idOrKey, patch: request.body });
    if (!view) {
      return reply.status(404).send({ error: "view_not_found" });
    }
    return view;
  });

  app.delete("/api/views/:idOrKey", async (request, reply) => {
    const params = request.params as { idOrKey: string };
    const result = await services.deleteView({ viewId: params.idOrKey, key: params.idOrKey });
    if (!result.deleted) {
      return reply.status(404).send({ error: "view_not_found" });
    }
    return result;
  });

  app.get("/api/views/:idOrKey/run", async (request) => {
    const params = request.params as { idOrKey: string };
    const query = request.query as { q?: string; sort?: string; dir?: "asc" | "desc"; filters?: string; limit?: string };
    return services.runView({
      viewId: params.idOrKey,
      key: params.idOrKey,
      q: query.q,
      filters: parseJsonQuery(query.filters),
      sort: query.sort ? [{ field: query.sort, direction: query.dir ?? "asc" }] : undefined,
      limit: query.limit ? Number(query.limit) : undefined
    });
  });

  app.post("/api/views/run", async (request) => {
    return services.runView(request.body);
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

  app.post("/api/outreach-events/backfill", async (request) => {
    return services.backfillLegacyOutreachEvents(request.body);
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
      xrmRecordId?: string;
      channel?: string;
      limit?: string;
    };
    return services.listActivities({
      leadId: query.leadId,
      personId: query.personId,
      companyId: query.companyId,
      taskId: query.taskId,
      xrmRecordId: query.xrmRecordId,
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
      xrmRecordId?: string;
      channel?: string;
      limit?: string;
    };
    return services.listActivities({
      leadId: query.leadId,
      personId: query.personId,
      companyId: query.companyId,
      taskId: query.taskId,
      xrmRecordId: query.xrmRecordId,
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

  app.get("/api/system/backup-health", async () => services.getBackupHealth());

  app.get("/api/testing/synthetic", async () => services.getSyntheticDataSummary());

  app.delete("/api/testing/synthetic", async () => services.cleanupSyntheticData());

  return app;
}

function resolveWorkspaceBootstrap() {
  const explicit = process.env["OXRM_WORKSPACE_MODE"];
  const target = process.env["OXRM_DEPLOY_TARGET"];
  const scenario = process.env["OXRM_DEMO_SCENARIO"];
  const demoEnabled = process.env["OXRM_DEMO_MODE"] === "true";
  const guideVersion = Number(process.env["OXRM_DEMO_GUIDE_VERSION"] ?? "1");
  const mode =
    explicit === "outreach" || explicit === "job_search"
      ? explicit
      : target === "linkedin-outreach-demo" || scenario === "linkedin-outreach"
        ? "outreach"
        : "job_search";
  return {
    mode,
    label: mode === "outreach" ? "Outreach" : "Job Search",
    templateKey: mode,
    demo: {
      enabled: demoEnabled,
      guideVersion: Number.isFinite(guideVersion) && guideVersion > 0 ? guideVersion : 1,
      readOnly: demoEnabled,
      resettable: demoEnabled
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const app = await buildServer();
  await app.listen({ host: config.host, port: config.port });
}
