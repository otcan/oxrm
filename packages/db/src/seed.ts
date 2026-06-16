import {
  activities,
  agents,
  eventTypes,
  flowSteps,
  flows,
  tasks,
  viewDefinitions,
  xrmFieldDefinitions,
  xrmObjectTypes,
  xrmRecordRelationships,
  xrmRecords,
  xrmRelationshipTypes
} from "./schema/index.js";
import { createDatabase } from "./client.js";
import { and, eq } from "drizzle-orm";

const { db, queryClient } = createDatabase();

const builtInObjectTypes = [
  {
    slug: "person",
    label: "Person",
    pluralLabel: "People",
    icon: "user",
    displayField: "fullName",
    templateKey: "outreach",
    fields: [
      { key: "fullName", label: "Full name", dataType: "text", required: true, indexed: true },
      { key: "title", label: "Title", dataType: "text", indexed: true },
      { key: "email", label: "Email", dataType: "email", indexed: true },
      { key: "linkedinUrl", label: "LinkedIn URL", dataType: "url", indexed: true }
    ]
  },
  {
    slug: "company",
    label: "Company",
    pluralLabel: "Companies",
    icon: "building",
    displayField: "name",
    templateKey: "outreach",
    fields: [
      { key: "name", label: "Name", dataType: "text", required: true, indexed: true },
      { key: "domain", label: "Domain", dataType: "text", indexed: true },
      { key: "website", label: "Website", dataType: "url", indexed: true }
    ]
  },
  {
    slug: "lead",
    label: "Lead",
    pluralLabel: "Leads",
    icon: "target",
    displayField: "fullName",
    templateKey: "outreach",
    fields: [
      { key: "fullName", label: "Full name", dataType: "text", required: true, indexed: true },
      { key: "company", label: "Company", dataType: "text", indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true }
    ]
  },
  {
    slug: "task",
    label: "Task",
    pluralLabel: "Tasks",
    icon: "check-square",
    displayField: "title",
    templateKey: "outreach",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true },
      { key: "dueAt", label: "Due at", dataType: "datetime", indexed: true }
    ]
  },
  {
    slug: "event",
    label: "Event",
    pluralLabel: "Events",
    icon: "history",
    displayField: "subject",
    templateKey: "outreach",
    fields: [
      { key: "type", label: "Type", dataType: "text", required: true, indexed: true },
      { key: "subject", label: "Subject", dataType: "text", indexed: true },
      { key: "occurredAt", label: "Occurred at", dataType: "datetime", indexed: true }
    ]
  },
  {
    slug: "job_company",
    label: "Job Company",
    pluralLabel: "Job Companies",
    icon: "building",
    displayField: "name",
    templateKey: "job_search",
    fields: [
      { key: "name", label: "Name", dataType: "text", required: true, indexed: true },
      { key: "domain", label: "Domain", dataType: "text", indexed: true },
      { key: "stage", label: "Stage", dataType: "text", indexed: true }
    ]
  },
  {
    slug: "job_contact",
    label: "Job Contact",
    pluralLabel: "Job Contacts",
    icon: "user",
    displayField: "fullName",
    templateKey: "job_search",
    fields: [
      { key: "fullName", label: "Full name", dataType: "text", required: true, indexed: true },
      { key: "title", label: "Title", dataType: "text", indexed: true },
      { key: "email", label: "Email", dataType: "email", indexed: true }
    ]
  },
  {
    slug: "job",
    label: "Job",
    pluralLabel: "Jobs",
    icon: "briefcase",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "location", label: "Location", dataType: "text", indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true },
      { key: "url", label: "Posting URL", dataType: "url", indexed: true }
    ]
  },
  {
    slug: "application",
    label: "Application",
    pluralLabel: "Applications",
    icon: "send",
    displayField: "role",
    templateKey: "job_search",
    fields: [
      { key: "role", label: "Role", dataType: "text", required: true, indexed: true },
      { key: "company", label: "Company", dataType: "text", indexed: true },
      { key: "stage", label: "Stage", dataType: "text", indexed: true },
      { key: "appliedAt", label: "Applied at", dataType: "datetime", indexed: true }
    ]
  },
  {
    slug: "interview",
    label: "Interview",
    pluralLabel: "Interviews",
    icon: "calendar",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "stage", label: "Stage", dataType: "text", indexed: true },
      { key: "scheduledAt", label: "Scheduled at", dataType: "datetime", indexed: true }
    ]
  },
  {
    slug: "referral",
    label: "Referral",
    pluralLabel: "Referrals",
    icon: "git-branch",
    displayField: "name",
    templateKey: "job_search",
    fields: [
      { key: "name", label: "Name", dataType: "text", required: true, indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true }
    ]
  },
  {
    slug: "document",
    label: "Document",
    pluralLabel: "Documents",
    icon: "file-text",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "kind", label: "Kind", dataType: "text", indexed: true },
      { key: "url", label: "URL", dataType: "url", indexed: true }
    ]
  }
];

const builtInRelationshipTypes = [
  { key: "works_at", label: "works at", inverseLabel: "employs", sourceObjectType: "person", targetObjectType: "company" },
  { key: "owns", label: "owns", inverseLabel: "owned by" },
  { key: "applied_to", label: "applied to", inverseLabel: "has application" },
  { key: "referred_by", label: "referred by", inverseLabel: "referred" },
  { key: "related_to", label: "related to", inverseLabel: "related to" },
  { key: "belongs_to", label: "belongs to", inverseLabel: "contains" },
  {
    key: "job_contact_works_at",
    label: "works at",
    inverseLabel: "employs",
    sourceObjectType: "job_contact",
    targetObjectType: "job_company"
  },
  {
    key: "job_belongs_to_company",
    label: "belongs to",
    inverseLabel: "has job",
    sourceObjectType: "job",
    targetObjectType: "job_company"
  },
  {
    key: "application_targets_job",
    label: "targets",
    inverseLabel: "has application",
    sourceObjectType: "application",
    targetObjectType: "job"
  },
  {
    key: "referral_supports_application",
    label: "supports",
    inverseLabel: "has referral",
    sourceObjectType: "referral",
    targetObjectType: "application"
  },
  {
    key: "interview_belongs_to_application",
    label: "belongs to",
    inverseLabel: "has interview",
    sourceObjectType: "interview",
    targetObjectType: "application"
  },
  {
    key: "document_attached_to_application",
    label: "attached to",
    inverseLabel: "has document",
    sourceObjectType: "document",
    targetObjectType: "application"
  }
];

function recordSearchText(displayName: string, fields: Record<string, unknown>) {
  return [displayName, ...Object.values(fields)]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value))
    .join(" ")
    .toLowerCase();
}

try {
  const agent =
    (await db.query.agents.findFirst({ where: eq(agents.name, "Codex CRM Operator") })) ??
    (
      await db
        .insert(agents)
        .values({
          name: "Codex CRM Operator",
          type: "crm_operator",
          defaultBranchPrefix: "agent/codex"
        })
        .returning()
    )[0];

  const persistedFlow =
    (await db.query.flows.findFirst({ where: eq(flows.name, "Default LinkedIn Outreach") })) ??
    (
      await db
        .insert(flows)
        .values({
          name: "Default LinkedIn Outreach",
          description: "Starter flow for LinkedIn, SalesNav, and email follow-up."
        })
        .returning()
    )[0];

  if (persistedFlow) {
    const existingSteps = await db.query.flowSteps.findMany({
      where: eq(flowSteps.flowId, persistedFlow.id)
    });
    if (existingSteps.length === 0) {
      await db.insert(flowSteps).values([
        { flowId: persistedFlow.id, stepOrder: 1, name: "Connect", channel: "linkedin", defaultDelayDays: 0 },
        { flowId: persistedFlow.id, stepOrder: 2, name: "First message", channel: "linkedin", defaultDelayDays: 1 },
        { flowId: persistedFlow.id, stepOrder: 3, name: "Follow-up", channel: "email", defaultDelayDays: 4 }
      ]);
    }
  }

  const eventType = await db.query.eventTypes.findFirst({ where: eq(eventTypes.slug, "intro-call") });
  if (!eventType) {
    await db.insert(eventTypes).values({
      name: "Intro Call",
      slug: "intro-call",
      description: "Default 30 minute intro call.",
      durationMinutes: 30,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
      bookingWindowDays: 30
    });
  }

  const defaultViews = [
    {
      key: "lead.all",
      name: "All Leads",
      description: "Recent leads with core identity and source fields.",
      objectType: "lead",
      templateKey: "outreach",
      layout: "table",
      columns: ["fullName", "company", "status", "source", "updatedAt"],
      filters: [],
      sort: [{ field: "updatedAt", direction: "desc" }],
      isDefault: true
    },
    {
      key: "person.all",
      name: "All People",
      description: "Normalized people/contact records.",
      objectType: "person",
      templateKey: "outreach",
      layout: "table",
      columns: ["fullName", "title", "email", "source", "updatedAt"],
      filters: [],
      sort: [{ field: "updatedAt", direction: "desc" }],
      isDefault: true
    },
    {
      key: "company.all",
      name: "All Companies",
      description: "Normalized company and domain records.",
      objectType: "company",
      templateKey: "outreach",
      layout: "table",
      columns: ["name", "domain", "website", "source", "updatedAt"],
      filters: [],
      sort: [{ field: "updatedAt", direction: "desc" }],
      isDefault: true
    },
    {
      key: "task.open",
      name: "Open Tasks",
      description: "Open work items ordered by priority and due date.",
      objectType: "task",
      templateKey: "outreach",
      layout: "table",
      columns: ["title", "status", "dueAt", "taskCount", "eventCount"],
      filters: [{ field: "status", operator: "equals", value: "open" }],
      sort: [{ field: "dueAt", direction: "asc" }],
      isDefault: true
    },
    {
      key: "event.recent",
      name: "Recent Events",
      description: "Recent timeline events across records.",
      objectType: "event",
      templateKey: "outreach",
      layout: "timeline",
      columns: ["type", "subject", "occurredAt", "relationshipCount"],
      filters: [],
      sort: [{ field: "occurredAt", direction: "desc" }],
      isDefault: true
    },
    {
      key: "job_search.jobs",
      name: "Job Search Jobs",
      description: "Open target jobs grouped by role, location, and status.",
      objectType: "job",
      templateKey: "job_search",
      layout: "table",
      columns: ["title", "location", "status", "relationshipCount", "updatedAt"],
      filters: [],
      sort: [{ field: "updatedAt", direction: "desc" }],
      isDefault: true
    },
    {
      key: "job_search.applications",
      name: "Job Search Applications",
      description: "Applications with stage, company, follow-up, and timeline counts.",
      objectType: "application",
      templateKey: "job_search",
      layout: "table",
      columns: ["role", "company", "stage", "taskCount", "eventCount", "updatedAt"],
      filters: [],
      sort: [{ field: "updatedAt", direction: "desc" }],
      isDefault: true
    },
    {
      key: "job_search.interviews",
      name: "Job Search Interviews",
      description: "Upcoming and recent interviews linked back to applications.",
      objectType: "interview",
      templateKey: "job_search",
      layout: "table",
      columns: ["title", "stage", "scheduledAt", "relationshipSummary"],
      filters: [],
      sort: [{ field: "scheduledAt", direction: "asc" }],
      isDefault: true
    },
    {
      key: "job_search.referrals",
      name: "Job Search Referrals",
      description: "Referral requests and warm contacts attached to applications.",
      objectType: "referral",
      templateKey: "job_search",
      layout: "table",
      columns: ["name", "status", "relationshipSummary", "updatedAt"],
      filters: [],
      sort: [{ field: "updatedAt", direction: "desc" }],
      isDefault: true
    }
  ];

  let createdViews = 0;
  for (const view of defaultViews) {
    const existing = await db.query.viewDefinitions.findFirst({ where: eq(viewDefinitions.key, view.key) });
    if (!existing) {
      await db.insert(viewDefinitions).values(view);
      createdViews += 1;
    } else {
      await db
        .update(viewDefinitions)
        .set({
          name: view.name,
          description: view.description,
          objectType: view.objectType,
          templateKey: view.templateKey,
          layout: view.layout,
          columns: view.columns,
          filters: view.filters,
          sort: view.sort,
          isDefault: view.isDefault,
          updatedAt: new Date()
        })
        .where(eq(viewDefinitions.id, existing.id));
    }
  }

  let createdObjectTypes = 0;
  for (const objectType of builtInObjectTypes) {
    const [persistedObjectType] = await db
      .insert(xrmObjectTypes)
      .values({
        slug: objectType.slug,
        label: objectType.label,
        pluralLabel: objectType.pluralLabel,
        icon: objectType.icon,
        displayField: objectType.displayField,
        templateKey: objectType.templateKey,
        system: true,
        metadata: { preset: objectType.templateKey }
      })
      .onConflictDoUpdate({
        target: xrmObjectTypes.slug,
        set: {
          label: objectType.label,
          pluralLabel: objectType.pluralLabel,
          icon: objectType.icon,
          displayField: objectType.displayField,
          templateKey: objectType.templateKey,
          system: true,
          active: true,
          updatedAt: new Date()
        }
      })
      .returning();

    if (persistedObjectType) {
      createdObjectTypes += 1;
      for (const field of objectType.fields) {
        await db
          .insert(xrmFieldDefinitions)
          .values({
            objectTypeId: persistedObjectType.id,
            key: field.key,
            label: field.label,
            dataType: field.dataType,
            required: field.required ?? false,
            indexed: field.indexed ?? false
          })
          .onConflictDoUpdate({
            target: [xrmFieldDefinitions.objectTypeId, xrmFieldDefinitions.key],
            set: {
              label: field.label,
              dataType: field.dataType,
              required: field.required ?? false,
              indexed: field.indexed ?? false,
              updatedAt: new Date()
            }
          });
      }
    }
  }

  let createdRelationshipTypes = 0;
  for (const relationshipType of builtInRelationshipTypes) {
    const sourceObjectType = relationshipType.sourceObjectType
      ? await db.query.xrmObjectTypes.findFirst({ where: eq(xrmObjectTypes.slug, relationshipType.sourceObjectType) })
      : undefined;
    const targetObjectType = relationshipType.targetObjectType
      ? await db.query.xrmObjectTypes.findFirst({ where: eq(xrmObjectTypes.slug, relationshipType.targetObjectType) })
      : undefined;
    await db
      .insert(xrmRelationshipTypes)
      .values({
        key: relationshipType.key,
        label: relationshipType.label,
        inverseLabel: relationshipType.inverseLabel,
        sourceObjectTypeId: sourceObjectType?.id,
        targetObjectTypeId: targetObjectType?.id,
        system: true
      })
      .onConflictDoUpdate({
        target: xrmRelationshipTypes.key,
        set: {
          label: relationshipType.label,
          inverseLabel: relationshipType.inverseLabel,
          sourceObjectTypeId: sourceObjectType?.id,
          targetObjectTypeId: targetObjectType?.id,
          system: true,
          active: true,
          updatedAt: new Date()
        }
      });
    createdRelationshipTypes += 1;
  }

  const objectTypeBySlug = new Map(
    (await db.query.xrmObjectTypes.findMany()).map((objectType) => [objectType.slug, objectType])
  );
  const relationshipTypeByKey = new Map(
    (await db.query.xrmRelationshipTypes.findMany()).map((relationshipType) => [relationshipType.key, relationshipType])
  );
  const syntheticRecords = [
    {
      objectType: "job_company",
      externalKey: "job-search:company:signalworks",
      displayName: "SignalWorks",
      fields: { name: "SignalWorks", domain: "signalworks.example", stage: "target" }
    },
    {
      objectType: "job_contact",
      externalKey: "job-search:contact:maya-erdem",
      displayName: "Maya Erdem",
      fields: { fullName: "Maya Erdem", title: "Engineering Manager", email: "maya@signalworks.example" }
    },
    {
      objectType: "job",
      externalKey: "job-search:job:platform-engineer",
      displayName: "Senior Platform Engineer",
      fields: {
        title: "Senior Platform Engineer",
        location: "Berlin / Remote",
        status: "open",
        url: "https://jobs.example/signalworks-platform-engineer"
      }
    },
    {
      objectType: "application",
      externalKey: "job-search:application:signalworks-platform",
      displayName: "Senior Platform Engineer at SignalWorks",
      fields: {
        role: "Senior Platform Engineer",
        company: "SignalWorks",
        stage: "intro_scheduled",
        appliedAt: "2026-06-10T09:00:00.000Z"
      }
    },
    {
      objectType: "interview",
      externalKey: "job-search:interview:signalworks-intro",
      displayName: "SignalWorks intro call",
      fields: {
        title: "SignalWorks intro call",
        stage: "intro",
        scheduledAt: "2026-06-18T13:00:00.000Z"
      }
    },
    {
      objectType: "referral",
      externalKey: "job-search:referral:maya-erdem",
      displayName: "Maya Erdem referral",
      fields: { name: "Maya Erdem referral", status: "requested" }
    },
    {
      objectType: "document",
      externalKey: "job-search:document:platform-resume",
      displayName: "Platform engineer resume",
      fields: { title: "Platform engineer resume", kind: "resume", url: "https://docs.example/resume-platform.pdf" }
    }
  ];

  let createdSyntheticRecords = 0;
  const recordByExternalKey = new Map<string, { id: string }>();
  for (const record of syntheticRecords) {
    const objectType = objectTypeBySlug.get(record.objectType);
    if (!objectType) {
      continue;
    }
    const existing = await db.query.xrmRecords.findFirst({
      where: and(eq(xrmRecords.objectTypeId, objectType.id), eq(xrmRecords.externalKey, record.externalKey))
    });
    const values = {
      objectTypeId: objectType.id,
      externalKey: record.externalKey,
      displayName: record.displayName,
      fields: record.fields,
      searchText: recordSearchText(record.displayName, record.fields),
      status: "active",
      source: "seed",
      metadata: { templateKey: objectType.templateKey }
    };
    const [persisted] = existing
      ? await db.update(xrmRecords).set({ ...values, updatedAt: new Date() }).where(eq(xrmRecords.id, existing.id)).returning({ id: xrmRecords.id })
      : await db.insert(xrmRecords).values(values).returning({ id: xrmRecords.id });
    if (!existing) {
      createdSyntheticRecords += 1;
    }
    if (persisted) {
      recordByExternalKey.set(record.externalKey, persisted);
    }
  }

  const syntheticRelationships = [
    ["job_contact_works_at", "job-search:contact:maya-erdem", "job-search:company:signalworks"],
    ["job_belongs_to_company", "job-search:job:platform-engineer", "job-search:company:signalworks"],
    ["application_targets_job", "job-search:application:signalworks-platform", "job-search:job:platform-engineer"],
    ["referral_supports_application", "job-search:referral:maya-erdem", "job-search:application:signalworks-platform"],
    ["interview_belongs_to_application", "job-search:interview:signalworks-intro", "job-search:application:signalworks-platform"],
    ["document_attached_to_application", "job-search:document:platform-resume", "job-search:application:signalworks-platform"]
  ] as const;
  for (const [relationshipKey, sourceKey, targetKey] of syntheticRelationships) {
    const relationshipType = relationshipTypeByKey.get(relationshipKey);
    const source = recordByExternalKey.get(sourceKey);
    const target = recordByExternalKey.get(targetKey);
    if (!relationshipType || !source || !target) {
      continue;
    }
    await db
      .insert(xrmRecordRelationships)
      .values({
        relationshipTypeId: relationshipType.id,
        sourceRecordId: source.id,
        targetRecordId: target.id,
        source: "seed"
      })
      .onConflictDoNothing({
        target: [
          xrmRecordRelationships.relationshipTypeId,
          xrmRecordRelationships.sourceRecordId,
          xrmRecordRelationships.targetRecordId
        ]
      });
  }

  const application = recordByExternalKey.get("job-search:application:signalworks-platform");
  if (application) {
    const taskKey = "job-search:follow-up:signalworks-platform";
    const existingTask = await db.query.tasks.findFirst({ where: eq(tasks.idempotencyKey, taskKey) });
    if (!existingTask) {
      await db.insert(tasks).values({
        title: "Send SignalWorks intro-call prep and referral follow-up",
        description: "Prepare talking points, confirm referral status, and send any missing materials.",
        type: "follow_up",
        status: "open",
        priority: 2,
        dueAt: new Date("2026-06-17T09:00:00.000Z"),
        xrmRecordId: application.id,
        idempotencyKey: taskKey
      });
    }

    const activityKey = "job-search:event:signalworks-application-created";
    const existingActivity = await db.query.activities.findFirst({ where: eq(activities.idempotencyKey, activityKey) });
    if (!existingActivity) {
      await db.insert(activities).values({
        xrmRecordId: application.id,
        type: "manual_note",
        channel: "manual",
        direction: "internal",
        subject: "Application submitted",
        body: "Synthetic job-search application seeded for generic oXRM demo and MCP timeline checks.",
        idempotencyKey: activityKey,
        occurredAt: new Date("2026-06-10T09:00:00.000Z"),
        metadata: { templateKey: "job_search", stage: "intro_scheduled" }
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        status: "ok",
        agentId: agent?.id ?? null,
        flowId: persistedFlow?.id ?? null,
        createdViews,
        objectTypes: createdObjectTypes,
        relationshipTypes: createdRelationshipTypes,
        syntheticRecords: createdSyntheticRecords
      },
      null,
      2
    )
  );
} finally {
  await queryClient.end();
}
