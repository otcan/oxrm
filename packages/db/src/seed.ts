import {
  activities,
  agents,
  eventTypes,
  flowSteps,
  flows,
  tasks,
  viewDefinitions,
  xrmFieldMappings,
  xrmFieldDefinitions,
  xrmFiles,
  xrmObjectTypes,
  xrmRecordRelationships,
  xrmRecords,
  xrmRelationshipTypes,
  xrmSemanticFields
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
    label: "Job Posting",
    pluralLabel: "Job Postings",
    icon: "briefcase",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "company", label: "Company", dataType: "text", indexed: true },
      { key: "platform", label: "Platform", dataType: "text", indexed: true },
      { key: "location", label: "Location", dataType: "text", indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true },
      { key: "fitRate", label: "Fit rate", dataType: "number", indexed: true },
      { key: "decisionState", label: "Decision state", dataType: "text", indexed: true },
      { key: "applicationStage", label: "Application phase", dataType: "text", indexed: true },
      { key: "closingReason", label: "Closing reason", dataType: "text", indexed: true },
      { key: "viewedAt", label: "Viewed at", dataType: "datetime", indexed: true },
      { key: "discoveredAt", label: "Discovered at", dataType: "datetime", indexed: true },
      { key: "lastTouchAt", label: "Last touch", dataType: "datetime", indexed: true },
      { key: "nextActionAt", label: "Next action", dataType: "datetime", indexed: true },
      { key: "nextAction", label: "Next action summary", dataType: "text" },
      { key: "url", label: "Posting URL", dataType: "url", indexed: true },
      { key: "source", label: "Source", dataType: "text", indexed: true },
      { key: "description", label: "Description", dataType: "text" },
      { key: "fullDescription", label: "Full description", dataType: "long_text" },
      { key: "requirements", label: "Requirements", dataType: "long_text" },
      { key: "responsibilities", label: "Responsibilities", dataType: "long_text" },
      { key: "matchingSkills", label: "Matching skills", dataType: "long_text" },
      { key: "missingSkills", label: "Missing skills", dataType: "long_text" },
      { key: "riskNotes", label: "Risk notes", dataType: "long_text" }
    ]
  },
  {
    slug: "job_fit",
    label: "Job Fit",
    pluralLabel: "Job Fits",
    icon: "gauge",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "fitRate", label: "Fit rate", dataType: "number", indexed: true },
      { key: "fitSummary", label: "Fit summary", dataType: "long_text" },
      { key: "matchingSkills", label: "Matching skills", dataType: "long_text" },
      { key: "missingSkills", label: "Missing skills", dataType: "long_text" },
      { key: "riskNotes", label: "Risk notes", dataType: "long_text" },
      { key: "recommendedAction", label: "Recommended action", dataType: "text", indexed: true },
      { key: "evaluatedAt", label: "Evaluated at", dataType: "datetime", indexed: true }
    ]
  },
  {
    slug: "job_alert",
    label: "Job Alert",
    pluralLabel: "Job Alerts",
    icon: "bell",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "source", label: "Source", dataType: "text", indexed: true },
      { key: "receivedAt", label: "Received at", dataType: "datetime", indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true },
      { key: "url", label: "URL", dataType: "url", indexed: true }
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
      { key: "closingReason", label: "Closing reason", dataType: "text", indexed: true },
      { key: "fitRate", label: "Fit rate", dataType: "number", indexed: true },
      { key: "jobId", label: "Linked job", dataType: "text", indexed: true },
      { key: "jobUrl", label: "Job URL", dataType: "url", indexed: true },
      { key: "responsiblePerson", label: "Responsible person", dataType: "text", indexed: true },
      { key: "appliedAt", label: "Applied at", dataType: "datetime", indexed: true },
      { key: "lastTouchAt", label: "Last touch", dataType: "datetime", indexed: true },
      { key: "nextActionAt", label: "Next action", dataType: "datetime", indexed: true },
      { key: "nextAction", label: "Next action summary", dataType: "text" },
      { key: "cvVersion", label: "CV version", dataType: "text", indexed: true },
      { key: "coverLetterVersion", label: "Cover letter", dataType: "text", indexed: true }
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
      { key: "version", label: "Version", dataType: "text", indexed: true },
      { key: "url", label: "URL", dataType: "url", indexed: true },
      { key: "sourcePath", label: "Editable source path", dataType: "file_ref" },
      { key: "outputPath", label: "Output path", dataType: "file_ref" },
      { key: "editorInstructions", label: "Editor instructions", dataType: "long_text" },
      { key: "body", label: "Draft body", dataType: "long_text" }
    ]
  },
  {
    slug: "cv_template",
    label: "CV Template",
    pluralLabel: "CV Templates",
    icon: "file-user",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "version", label: "Version", dataType: "text", indexed: true },
      { key: "focus", label: "Focus", dataType: "text", indexed: true },
      { key: "url", label: "URL", dataType: "url", indexed: true },
      { key: "sourcePath", label: "Editable source path", dataType: "file_ref" },
      { key: "outputPath", label: "Output path", dataType: "file_ref" },
      { key: "editorInstructions", label: "Editor instructions", dataType: "long_text" },
      { key: "body", label: "Draft body", dataType: "long_text" },
      { key: "notes", label: "Notes", dataType: "long_text" }
    ]
  },
  {
    slug: "cv_version",
    label: "CV Version",
    pluralLabel: "CV Versions",
    icon: "file-user",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "version", label: "Version", dataType: "text", indexed: true },
      { key: "baseTemplate", label: "Base template", dataType: "text", indexed: true },
      { key: "derivedFor", label: "Derived for", dataType: "text", indexed: true },
      { key: "focus", label: "Focus", dataType: "text", indexed: true },
      { key: "url", label: "URL", dataType: "url", indexed: true },
      { key: "sourcePath", label: "Editable source path", dataType: "file_ref" },
      { key: "outputPath", label: "Output path", dataType: "file_ref" },
      { key: "editorInstructions", label: "Editor instructions", dataType: "long_text" },
      { key: "body", label: "Draft body", dataType: "long_text" },
      { key: "notes", label: "Notes", dataType: "long_text" }
    ]
  },
  {
    slug: "cover_letter_template",
    label: "Cover Letter Template",
    pluralLabel: "Cover Letter Templates",
    icon: "file-pen",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "version", label: "Version", dataType: "text", indexed: true },
      { key: "tone", label: "Tone", dataType: "text", indexed: true },
      { key: "url", label: "URL", dataType: "url", indexed: true },
      { key: "sourcePath", label: "Editable source path", dataType: "file_ref" },
      { key: "outputPath", label: "Output path", dataType: "file_ref" },
      { key: "editorInstructions", label: "Editor instructions", dataType: "long_text" },
      { key: "body", label: "Draft body", dataType: "long_text" },
      { key: "notes", label: "Notes", dataType: "long_text" }
    ]
  },
  {
    slug: "cover_letter",
    label: "Cover Letter",
    pluralLabel: "Cover Letters",
    icon: "file-pen",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "version", label: "Version", dataType: "text", indexed: true },
      { key: "baseTemplate", label: "Base template", dataType: "text", indexed: true },
      { key: "derivedFor", label: "Derived for", dataType: "text", indexed: true },
      { key: "company", label: "Company", dataType: "text", indexed: true },
      { key: "url", label: "URL", dataType: "url", indexed: true },
      { key: "sourcePath", label: "Editable source path", dataType: "file_ref" },
      { key: "outputPath", label: "Output path", dataType: "file_ref" },
      { key: "editorInstructions", label: "Editor instructions", dataType: "long_text" },
      { key: "body", label: "Draft body", dataType: "long_text" },
      { key: "summary", label: "Summary", dataType: "long_text" }
    ]
  },
  {
    slug: "operator_playbook",
    label: "Operator Playbook",
    pluralLabel: "Operator Playbooks",
    icon: "book-open",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "audience", label: "Audience", dataType: "text", indexed: true },
      { key: "startCommand", label: "Start command", dataType: "text" },
      { key: "setupChecklist", label: "Setup checklist", dataType: "long_text" },
      { key: "dailyLoop", label: "Daily loop", dataType: "long_text" },
      { key: "agentInstructions", label: "Agent instructions", dataType: "long_text" },
      { key: "humanInstructions", label: "Human instructions", dataType: "long_text" },
      { key: "status", label: "Status", dataType: "text", indexed: true }
    ]
  },
  {
    slug: "source_config",
    label: "Source",
    pluralLabel: "Sources",
    icon: "rss",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "channel", label: "Channel", dataType: "text", indexed: true },
      { key: "sourceUrl", label: "Source URL", dataType: "url", indexed: true },
      { key: "cadence", label: "Cadence", dataType: "text", indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true },
      { key: "importInstructions", label: "Import instructions", dataType: "long_text" },
      { key: "privacyNotes", label: "Privacy notes", dataType: "long_text" }
    ]
  },
  {
    slug: "automation_timer",
    label: "Automation Timer",
    pluralLabel: "Automation Timers",
    icon: "clock",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "cadence", label: "Cadence", dataType: "text", indexed: true },
      { key: "nextRunAt", label: "Next run", dataType: "datetime", indexed: true },
      { key: "task", label: "Task", dataType: "long_text" },
      { key: "blueprint", label: "Blueprint", dataType: "text", indexed: true },
      { key: "approvalRequired", label: "Approval required", dataType: "text", indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true }
    ]
  },
  {
    slug: "outreach_playbook",
    label: "Outreach Playbook",
    pluralLabel: "Outreach Playbooks",
    icon: "book-open",
    displayField: "title",
    templateKey: "outreach",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "audience", label: "Audience", dataType: "text", indexed: true },
      { key: "startCommand", label: "Start command", dataType: "text" },
      { key: "setupChecklist", label: "Setup checklist", dataType: "long_text" },
      { key: "dailyLoop", label: "Daily loop", dataType: "long_text" },
      { key: "agentInstructions", label: "Agent instructions", dataType: "long_text" },
      { key: "humanInstructions", label: "Human instructions", dataType: "long_text" },
      { key: "status", label: "Status", dataType: "text", indexed: true }
    ]
  },
  {
    slug: "setup_todo",
    label: "Setup Todo",
    pluralLabel: "Setup Todos",
    icon: "list-checks",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "key", label: "Key", dataType: "text", indexed: true },
      { key: "templateKey", label: "Template", dataType: "text", indexed: true },
      { key: "category", label: "Category", dataType: "text", indexed: true },
      { key: "severity", label: "Severity", dataType: "text", indexed: true },
      { key: "owner", label: "Owner", dataType: "text", indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true },
      { key: "why", label: "Why", dataType: "long_text" },
      { key: "suggestedAction", label: "Suggested action", dataType: "long_text" },
      { key: "agentInstruction", label: "Agent instruction", dataType: "long_text" }
    ]
  },
  {
    slug: "outreach_source_config",
    label: "Outreach Source",
    pluralLabel: "Outreach Sources",
    icon: "rss",
    displayField: "title",
    templateKey: "outreach",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "channel", label: "Channel", dataType: "text", indexed: true },
      { key: "sourceUrl", label: "Source URL", dataType: "url", indexed: true },
      { key: "cadence", label: "Cadence", dataType: "text", indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true },
      { key: "importInstructions", label: "Import instructions", dataType: "long_text" },
      { key: "privacyNotes", label: "Privacy notes", dataType: "long_text" }
    ]
  },
  {
    slug: "outreach_automation_timer",
    label: "Outreach Automation Timer",
    pluralLabel: "Outreach Automation Timers",
    icon: "clock",
    displayField: "title",
    templateKey: "outreach",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "cadence", label: "Cadence", dataType: "text", indexed: true },
      { key: "nextRunAt", label: "Next run", dataType: "datetime", indexed: true },
      { key: "task", label: "Task", dataType: "long_text" },
      { key: "blueprint", label: "Blueprint", dataType: "text", indexed: true },
      { key: "approvalRequired", label: "Approval required", dataType: "text", indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true }
    ]
  },
  {
    slug: "action_blueprint",
    label: "Action Blueprint",
    pluralLabel: "Action Blueprints",
    icon: "sparkles",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "templateKey", label: "Template", dataType: "text", indexed: true },
      { key: "appliesToViewKey", label: "Applies to view", dataType: "text", indexed: true },
      { key: "appliesToObjectType", label: "Applies to record type", dataType: "text", indexed: true },
      { key: "trigger", label: "Trigger", dataType: "text", indexed: true },
      { key: "automationLevel", label: "Automation level", dataType: "text", indexed: true },
      { key: "approvalRequired", label: "Approval required", dataType: "text", indexed: true },
      { key: "inputs", label: "Inputs", dataType: "long_text" },
      { key: "outputs", label: "Outputs", dataType: "long_text" },
      { key: "humanControl", label: "Human control", dataType: "long_text" },
      { key: "riskLevel", label: "Risk level", dataType: "text", indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true }
    ]
  },
  {
    slug: "action_suggestion",
    label: "Action Suggestion",
    pluralLabel: "Action Suggestions",
    icon: "lightbulb",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "templateKey", label: "Template", dataType: "text", indexed: true },
      { key: "targetViewKey", label: "Target view", dataType: "text", indexed: true },
      { key: "targetObjectType", label: "Target record type", dataType: "text", indexed: true },
      { key: "targetRecord", label: "Target record", dataType: "text", indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true },
      { key: "priority", label: "Priority", dataType: "number", indexed: true },
      { key: "confidence", label: "Confidence", dataType: "number", indexed: true },
      { key: "recommendedAction", label: "Recommended action", dataType: "long_text" },
      { key: "reason", label: "Reason", dataType: "long_text" },
      { key: "draftOutput", label: "Draft output", dataType: "long_text" },
      { key: "approvalRequired", label: "Approval required", dataType: "text", indexed: true },
      { key: "dueAt", label: "Due at", dataType: "datetime", indexed: true }
    ]
  },
  {
    slug: "action_run",
    label: "Action Run",
    pluralLabel: "Action Runs",
    icon: "play",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "templateKey", label: "Template", dataType: "text", indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true },
      { key: "mode", label: "Mode", dataType: "text", indexed: true },
      { key: "blueprint", label: "Blueprint", dataType: "text", indexed: true },
      { key: "startedAt", label: "Started at", dataType: "datetime", indexed: true },
      { key: "finishedAt", label: "Finished at", dataType: "datetime", indexed: true },
      { key: "inputSummary", label: "Input summary", dataType: "long_text" },
      { key: "outputSummary", label: "Output summary", dataType: "long_text" },
      { key: "auditRef", label: "Audit reference", dataType: "file_ref" }
    ]
  },
  {
    slug: "approval_request",
    label: "Approval Request",
    pluralLabel: "Approval Requests",
    icon: "shield-check",
    displayField: "title",
    templateKey: "job_search",
    fields: [
      { key: "title", label: "Title", dataType: "text", required: true, indexed: true },
      { key: "templateKey", label: "Template", dataType: "text", indexed: true },
      { key: "status", label: "Status", dataType: "text", indexed: true },
      { key: "requestedAction", label: "Requested action", dataType: "long_text" },
      { key: "decision", label: "Decision", dataType: "text", indexed: true },
      { key: "owner", label: "Owner", dataType: "text", indexed: true },
      { key: "requestedAt", label: "Requested at", dataType: "datetime", indexed: true },
      { key: "decidedAt", label: "Decided at", dataType: "datetime", indexed: true }
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
    key: "job_alert_matches_job",
    label: "matches",
    inverseLabel: "came from alert",
    sourceObjectType: "job_alert",
    targetObjectType: "job"
  },
  {
    key: "job_fit_evaluates_job",
    label: "evaluates",
    inverseLabel: "has fit",
    sourceObjectType: "job_fit",
    targetObjectType: "job"
  },
  {
    key: "application_targets_job",
    label: "targets",
    inverseLabel: "has application",
    sourceObjectType: "application",
    targetObjectType: "job"
  },
  {
    key: "application_has_fit",
    label: "has fit",
    inverseLabel: "supports application",
    sourceObjectType: "application",
    targetObjectType: "job_fit"
  },
  {
    key: "application_has_contact",
    label: "has contact",
    inverseLabel: "responsible for",
    sourceObjectType: "application",
    targetObjectType: "job_contact"
  },
  {
    key: "application_uses_cv",
    label: "uses CV",
    inverseLabel: "used by application",
    sourceObjectType: "application",
    targetObjectType: "cv_version"
  },
  {
    key: "cv_derived_from_template",
    label: "derived from template",
    inverseLabel: "has derived CV",
    sourceObjectType: "cv_version",
    targetObjectType: "cv_template"
  },
  {
    key: "application_uses_cover_letter",
    label: "uses cover letter",
    inverseLabel: "used by application",
    sourceObjectType: "application",
    targetObjectType: "cover_letter"
  },
  {
    key: "cover_letter_derived_from_template",
    label: "derived from template",
    inverseLabel: "has derived cover letter",
    sourceObjectType: "cover_letter",
    targetObjectType: "cover_letter_template"
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
  },
  {
    key: "suggestion_from_blueprint",
    label: "from blueprint",
    inverseLabel: "created suggestion",
    sourceObjectType: "action_suggestion",
    targetObjectType: "action_blueprint"
  },
  {
    key: "suggestion_for_job",
    label: "suggests action for",
    inverseLabel: "has suggestion",
    sourceObjectType: "action_suggestion",
    targetObjectType: "job"
  },
  {
    key: "suggestion_for_application",
    label: "suggests action for",
    inverseLabel: "has suggestion",
    sourceObjectType: "action_suggestion",
    targetObjectType: "application"
  },
  {
    key: "suggestion_for_job_fit",
    label: "suggests action for",
    inverseLabel: "has suggestion",
    sourceObjectType: "action_suggestion",
    targetObjectType: "job_fit"
  },
  {
    key: "suggestion_for_job_alert",
    label: "suggests action for",
    inverseLabel: "has suggestion",
    sourceObjectType: "action_suggestion",
    targetObjectType: "job_alert"
  },
  {
    key: "run_for_blueprint",
    label: "ran blueprint",
    inverseLabel: "has run",
    sourceObjectType: "action_run",
    targetObjectType: "action_blueprint"
  },
  {
    key: "run_for_suggestion",
    label: "processed suggestion",
    inverseLabel: "has run",
    sourceObjectType: "action_run",
    targetObjectType: "action_suggestion"
  },
  {
    key: "approval_for_suggestion",
    label: "approves suggestion",
    inverseLabel: "needs approval",
    sourceObjectType: "approval_request",
    targetObjectType: "action_suggestion"
  }
];

function recordSearchText(displayName: string, fields: Record<string, unknown>) {
  return [displayName, ...Object.values(fields)]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value))
    .join(" ")
    .toLowerCase();
}

function viewWorkspaceConfig(key: string, index: number) {
  const mainViews = new Set(["job_search.jobs", "lead.all"]);
  const secondaryViews = new Set([
    "job_search.playbook",
    "job_search.sources",
    "job_search.timers",
    "outreach.playbook",
    "outreach.sources",
    "outreach.timers",
    "person.all",
    "company.all",
    "task.open",
    "event.recent",
    "job_search.applications",
    "job_search.interviews",
    "job_search.referrals",
    "job_search.job_alerts",
    "job_search.job_fits",
    "job_search.action_suggestions",
    "job_search.action_blueprints",
    "job_search.documents",
    "job_search.cover_letters",
    "job_search.approvals",
    "job_search.setup_todos"
  ]);

  return {
    placement: mainViews.has(key) ? "main" : secondaryViews.has(key) ? "secondary" : "sidebar",
    displayOrder: index * 10,
    audience: "default",
    visibleWhen: {},
    groupBy: key === "job_search.applications" ? "stage" : key === "job_search.jobs" ? "applicationStage" : undefined
  };
}

const semanticFieldSeeds = [
  { key: "person_name", label: "Person name", dataType: "text" },
  { key: "organization", label: "Organization", dataType: "text" },
  { key: "role_title", label: "Role or title", dataType: "text" },
  { key: "stage", label: "Stage", dataType: "text" },
  { key: "next_action", label: "Next action", dataType: "text" },
  { key: "next_action_at", label: "Next action due", dataType: "datetime" },
  { key: "source_url", label: "Source URL", dataType: "url" },
  { key: "document_version", label: "Document version", dataType: "text" },
  { key: "fit_score", label: "Fit score", dataType: "number" },
  { key: "platform", label: "Platform", dataType: "text" },
  { key: "automation_level", label: "Automation level", dataType: "text" },
  { key: "approval_status", label: "Approval status", dataType: "text" },
  { key: "confidence_score", label: "Confidence score", dataType: "number" },
  { key: "target_view", label: "Target view", dataType: "text" },
  { key: "target_record_type", label: "Target record type", dataType: "text" }
];

const semanticFieldMappings = [
  { objectType: "person", fieldKey: "fullName", semanticFieldKey: "person_name" },
  { objectType: "person", fieldKey: "title", semanticFieldKey: "role_title" },
  { objectType: "company", fieldKey: "name", semanticFieldKey: "organization" },
  { objectType: "lead", fieldKey: "fullName", semanticFieldKey: "person_name" },
  { objectType: "lead", fieldKey: "company", semanticFieldKey: "organization" },
  { objectType: "lead", fieldKey: "title", semanticFieldKey: "role_title" },
  { objectType: "job", fieldKey: "company", semanticFieldKey: "organization" },
  { objectType: "job", fieldKey: "title", semanticFieldKey: "role_title" },
  { objectType: "job", fieldKey: "url", semanticFieldKey: "source_url" },
  { objectType: "job", fieldKey: "platform", semanticFieldKey: "platform" },
  { objectType: "job", fieldKey: "fitRate", semanticFieldKey: "fit_score" },
  { objectType: "job", fieldKey: "nextAction", semanticFieldKey: "next_action" },
  { objectType: "job", fieldKey: "nextActionAt", semanticFieldKey: "next_action_at" },
  { objectType: "job_fit", fieldKey: "fitRate", semanticFieldKey: "fit_score" },
  { objectType: "job_fit", fieldKey: "recommendedAction", semanticFieldKey: "next_action" },
  { objectType: "job_alert", fieldKey: "url", semanticFieldKey: "source_url" },
  { objectType: "job_alert", fieldKey: "status", semanticFieldKey: "stage" },
  { objectType: "application", fieldKey: "company", semanticFieldKey: "organization" },
  { objectType: "application", fieldKey: "role", semanticFieldKey: "role_title" },
  { objectType: "application", fieldKey: "stage", semanticFieldKey: "stage" },
  { objectType: "application", fieldKey: "fitRate", semanticFieldKey: "fit_score" },
  { objectType: "application", fieldKey: "nextAction", semanticFieldKey: "next_action" },
  { objectType: "application", fieldKey: "nextActionAt", semanticFieldKey: "next_action_at" },
  { objectType: "cv_version", fieldKey: "version", semanticFieldKey: "document_version" },
  { objectType: "cover_letter", fieldKey: "version", semanticFieldKey: "document_version" },
  { objectType: "cover_letter", fieldKey: "company", semanticFieldKey: "organization" },
  { objectType: "action_blueprint", fieldKey: "automationLevel", semanticFieldKey: "automation_level" },
  { objectType: "action_blueprint", fieldKey: "appliesToViewKey", semanticFieldKey: "target_view" },
  { objectType: "action_blueprint", fieldKey: "appliesToObjectType", semanticFieldKey: "target_record_type" },
  { objectType: "action_blueprint", fieldKey: "approvalRequired", semanticFieldKey: "approval_status" },
  { objectType: "action_suggestion", fieldKey: "status", semanticFieldKey: "approval_status" },
  { objectType: "action_suggestion", fieldKey: "targetViewKey", semanticFieldKey: "target_view" },
  { objectType: "action_suggestion", fieldKey: "targetObjectType", semanticFieldKey: "target_record_type" },
  { objectType: "action_suggestion", fieldKey: "confidence", semanticFieldKey: "confidence_score" },
  { objectType: "action_suggestion", fieldKey: "recommendedAction", semanticFieldKey: "next_action" },
  { objectType: "action_suggestion", fieldKey: "dueAt", semanticFieldKey: "next_action_at" },
  { objectType: "action_run", fieldKey: "status", semanticFieldKey: "approval_status" },
  { objectType: "approval_request", fieldKey: "status", semanticFieldKey: "approval_status" }
];

try {
  const agent =
    (await db.query.agents.findFirst({ where: eq(agents.name, "Codex CRM Operator") })) ??
    (
      await db
        .insert(agents)
        .values({
          name: "Codex CRM Operator",
          type: "operator",
          defaultBranchPrefix: "agent/codex",
          capabilities: [
            { key: "crm.read", level: "read" },
            { key: "crm.write", level: "write" },
            { key: "code.branch", level: "system" },
            { key: "plan.execute", level: "write" }
          ],
          runtimeConfig: {
            runtime: "codex-cli",
            command: "./oxrm cli"
          },
          metadata: {
            legacyType: "crm_operator"
          }
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
      columns: ["fullName", "company", "title", "status", "nextAction"],
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
      columns: ["fullName", "title", "linkedinUrl", "company", "segment"],
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
      columns: ["name", "domain", "website", "segment", "updatedAt"],
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
      columns: ["title", "status", "type", "dueAt", "lead.fullName"],
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
      columns: ["subject", "type", "channel", "lead.fullName", "occurredAt"],
      filters: [],
      sort: [{ field: "occurredAt", direction: "desc" }],
      isDefault: true
    },
    {
      key: "outreach.playbook",
      name: "Outreach Playbook",
      description: "Plug-and-play CRM/outreach setup instructions for humans and agents.",
      objectType: "outreach_playbook",
      templateKey: "outreach",
      layout: "cards",
      columns: ["title", "audience", "startCommand", "setupChecklist", "dailyLoop", "status"],
      filters: [],
      sort: [{ field: "title", direction: "asc" }],
      isDefault: true
    },
    {
      key: "outreach.sources",
      name: "Outreach Sources",
      description: "Lead and relationship sources the agent should read before drafting.",
      objectType: "outreach_source_config",
      templateKey: "outreach",
      layout: "table",
      columns: ["title", "channel", "sourceUrl", "cadence", "status"],
      filters: [],
      sort: [{ field: "title", direction: "asc" }],
      isDefault: true
    },
    {
      key: "outreach.timers",
      name: "Outreach Timers",
      description: "Recurring local jobs for import, queue review, and draft preparation.",
      objectType: "outreach_automation_timer",
      templateKey: "outreach",
      layout: "table",
      columns: ["title", "cadence", "nextRunAt", "blueprint", "approvalRequired", "status"],
      filters: [],
      sort: [{ field: "nextRunAt", direction: "asc" }],
      isDefault: true
    },
    {
      key: "job_search.playbook",
      name: "Job Search Playbook",
      description: "Plug-and-play setup instructions for running job applications with oXRM and Codex.",
      objectType: "operator_playbook",
      templateKey: "job_search",
      layout: "cards",
      columns: ["title", "audience", "startCommand", "setupChecklist", "dailyLoop", "status"],
      filters: [],
      sort: [{ field: "title", direction: "asc" }],
      isDefault: true
    },
    {
      key: "job_search.sources",
      name: "Job Sources",
      description: "Job boards, company pages, recruiter inboxes, and manual source queues.",
      objectType: "source_config",
      templateKey: "job_search",
      layout: "table",
      columns: ["title", "channel", "sourceUrl", "cadence", "status"],
      filters: [],
      sort: [{ field: "title", direction: "asc" }],
      isDefault: true
    },
    {
      key: "job_search.timers",
      name: "Job Search Timers",
      description: "Recurring local jobs for imports, fit scoring, follow-ups, and approvals.",
      objectType: "automation_timer",
      templateKey: "job_search",
      layout: "table",
      columns: ["title", "cadence", "nextRunAt", "blueprint", "approvalRequired", "status"],
      filters: [],
      sort: [{ field: "nextRunAt", direction: "asc" }],
      isDefault: true
    },
    {
      key: "job_search.setup_todos",
      name: "Setup Todos",
      description: "Open setup gaps and warnings that guide humans, agents, and system setup.",
      objectType: "setup_todo",
      templateKey: "job_search",
      layout: "queue",
      columns: ["title", "severity", "owner", "category", "status", "suggestedAction"],
      filters: [{ field: "templateKey", operator: "equals", value: "job_search" }],
      sort: [
        { field: "severity", direction: "asc" },
        { field: "category", direction: "asc" }
      ],
      isDefault: true
    },
    {
      key: "job_search.jobs",
      name: "Job Postings",
      description: "Consolidated job postings from all platforms with fit, application phase, and next action.",
      objectType: "job",
      templateKey: "job_search",
      layout: "table",
      columns: ["title", "company", "platform", "location", "fitRate", "applicationStage", "lastTouchAt", "nextActionAt"],
      filters: [],
      sort: [{ field: "fitRate", direction: "desc" }],
      isDefault: true
    },
    {
      key: "job_search.job_alerts",
      name: "Incoming Job Alerts",
      description: "Synthetic job alerts captured before deciding whether to apply.",
      objectType: "job_alert",
      templateKey: "job_search",
      layout: "table",
      columns: ["title", "source", "receivedAt", "status", "relationshipSummary"],
      filters: [],
      sort: [{ field: "receivedAt", direction: "desc" }],
      isDefault: true
    },
    {
      key: "job_search.applications",
      name: "Job Search Applications",
      description: "Applications with stage, company, follow-up, and timeline counts.",
      objectType: "application",
      templateKey: "job_search",
      layout: "table",
      columns: ["role", "company", "stage", "fitRate", "responsiblePerson", "cvVersion", "coverLetterVersion", "nextActionAt", "eventCount"],
      filters: [],
      sort: [{ field: "updatedAt", direction: "desc" }],
      isDefault: true
    },
    {
      key: "job_search.job_fits",
      name: "Job Fits",
      description: "Fit evaluations attached to job postings and applications.",
      objectType: "job_fit",
      templateKey: "job_search",
      layout: "table",
      columns: ["title", "fitRate", "recommendedAction", "evaluatedAt", "relationshipSummary"],
      filters: [],
      sort: [{ field: "fitRate", direction: "desc" }],
      isDefault: true
    },
    {
      key: "job_search.action_blueprints",
      name: "Action Blueprints",
      description: "LLM/operator workflows available for the selected job-search view or record type.",
      objectType: "action_blueprint",
      templateKey: "job_search",
      layout: "table",
      columns: ["title", "appliesToViewKey", "appliesToObjectType", "automationLevel", "approvalRequired", "riskLevel", "status"],
      filters: [{ field: "templateKey", operator: "equals", value: "job_search" }],
      sort: [{ field: "title", direction: "asc" }],
      isDefault: true
    },
    {
      key: "job_search.action_suggestions",
      name: "Action Suggestions",
      description: "Agent-generated next actions that still show approval and execution state.",
      objectType: "action_suggestion",
      templateKey: "job_search",
      layout: "queue",
      columns: ["title", "targetViewKey", "targetRecord", "status", "priority", "confidence", "approvalRequired", "dueAt"],
      filters: [{ field: "templateKey", operator: "equals", value: "job_search" }],
      sort: [
        { field: "priority", direction: "desc" },
        { field: "dueAt", direction: "asc" }
      ],
      isDefault: true
    },
    {
      key: "job_search.action_runs",
      name: "Action Runs",
      description: "Dry-run and draft-only executions for action blueprints.",
      objectType: "action_run",
      templateKey: "job_search",
      layout: "table",
      columns: ["title", "blueprint", "mode", "status", "startedAt", "finishedAt", "auditRef"],
      filters: [{ field: "templateKey", operator: "equals", value: "job_search" }],
      sort: [{ field: "startedAt", direction: "desc" }],
      isDefault: true
    },
    {
      key: "job_search.approvals",
      name: "Approval Requests",
      description: "Human decisions required before external actions or sensitive record changes.",
      objectType: "approval_request",
      templateKey: "job_search",
      layout: "table",
      columns: ["title", "status", "owner", "requestedAction", "requestedAt", "decidedAt"],
      filters: [{ field: "templateKey", operator: "equals", value: "job_search" }],
      sort: [{ field: "requestedAt", direction: "desc" }],
      isDefault: true
    },
    {
      key: "job_search.followups_due",
      name: "Job Search Follow-ups Due",
      description: "Applications that need a next action or reply check.",
      objectType: "application",
      templateKey: "job_search",
      layout: "table",
      columns: ["role", "company", "stage", "nextActionAt", "nextAction", "relationshipSummary"],
      filters: [{ field: "nextActionAt", operator: "is_not_empty" }],
      sort: [{ field: "nextActionAt", direction: "asc" }],
      isDefault: true
    },
    {
      key: "job_search.waiting_for_reply",
      name: "Applied / Waiting",
      description: "Applications already sent where the next action is to check or nudge for a reply.",
      objectType: "application",
      templateKey: "job_search",
      layout: "table",
      columns: ["role", "company", "responsiblePerson", "lastTouchAt", "nextAction", "eventCount"],
      filters: [{ field: "stage", operator: "equals", value: "applied" }],
      sort: [{ field: "lastTouchAt", direction: "asc" }],
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
    },
    {
      key: "job_search.documents",
      name: "CV Versions",
      description: "CV versions used by synthetic applications.",
      objectType: "cv_version",
      templateKey: "job_search",
      layout: "table",
      columns: ["title", "version", "focus", "relationshipSummary", "updatedAt"],
      filters: [],
      sort: [{ field: "updatedAt", direction: "desc" }],
      isDefault: true
    },
    {
      key: "job_search.cover_letters",
      name: "Cover Letters",
      description: "Cover letter drafts linked to applications.",
      objectType: "cover_letter",
      templateKey: "job_search",
      layout: "table",
      columns: ["title", "version", "company", "summary", "relationshipSummary"],
      filters: [],
      sort: [{ field: "updatedAt", direction: "desc" }],
      isDefault: true
    }
  ];

  let createdViews = 0;
  for (const [viewIndex, view] of defaultViews.entries()) {
    const workspaceConfig = viewWorkspaceConfig(view.key, viewIndex);
    const viewValues = { ...view, ...workspaceConfig };
    const existing = await db.query.viewDefinitions.findFirst({ where: eq(viewDefinitions.key, view.key) });
    if (!existing) {
      await db.insert(viewDefinitions).values(viewValues);
      createdViews += 1;
    } else {
      await db
        .update(viewDefinitions)
        .set({
          name: viewValues.name,
          description: viewValues.description,
          objectType: viewValues.objectType,
          templateKey: viewValues.templateKey,
          layout: viewValues.layout,
          columns: viewValues.columns,
          filters: viewValues.filters,
          sort: viewValues.sort,
          groupBy: viewValues.groupBy,
          placement: viewValues.placement,
          displayOrder: viewValues.displayOrder,
          audience: viewValues.audience,
          visibleWhen: viewValues.visibleWhen,
          isDefault: viewValues.isDefault,
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
      for (const [fieldIndex, field] of objectType.fields.entries()) {
        await db
          .insert(xrmFieldDefinitions)
          .values({
            objectTypeId: persistedObjectType.id,
            key: field.key,
            label: field.label,
            dataType: field.dataType,
            required: field.required ?? false,
            indexed: field.indexed ?? false,
            searchable: field.indexed ?? false,
            displayOrder: fieldIndex * 10,
            summaryRank: fieldIndex < 6 ? fieldIndex + 1 : null,
            isPrimary: field.key === objectType.displayField,
            options: []
          })
          .onConflictDoUpdate({
            target: [xrmFieldDefinitions.objectTypeId, xrmFieldDefinitions.key],
            set: {
              label: field.label,
              dataType: field.dataType,
              required: field.required ?? false,
              indexed: field.indexed ?? false,
              searchable: field.indexed ?? false,
              displayOrder: fieldIndex * 10,
              summaryRank: fieldIndex < 6 ? fieldIndex + 1 : null,
              isPrimary: field.key === objectType.displayField,
              options: [],
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
  const semanticFieldByKey = new Map<string, { id: string }>();
  for (const semanticField of semanticFieldSeeds) {
    const [persisted] = await db
      .insert(xrmSemanticFields)
      .values(semanticField)
      .onConflictDoUpdate({
        target: xrmSemanticFields.key,
        set: {
          label: semanticField.label,
          dataType: semanticField.dataType,
          updatedAt: new Date()
        }
      })
      .returning({ id: xrmSemanticFields.id, key: xrmSemanticFields.key });
    if (persisted) {
      semanticFieldByKey.set(persisted.key, persisted);
    }
  }

  for (const mapping of semanticFieldMappings) {
    const objectType = objectTypeBySlug.get(mapping.objectType);
    const semanticField = semanticFieldByKey.get(mapping.semanticFieldKey);
    if (!objectType || !semanticField) {
      continue;
    }
    const fieldDefinition = await db.query.xrmFieldDefinitions.findFirst({
      where: and(eq(xrmFieldDefinitions.objectTypeId, objectType.id), eq(xrmFieldDefinitions.key, mapping.fieldKey))
    });
    await db
      .insert(xrmFieldMappings)
      .values({
        objectTypeId: objectType.id,
        fieldDefinitionId: fieldDefinition?.id,
        fieldKey: mapping.fieldKey,
        semanticFieldId: semanticField.id,
        confidence: 100,
        transform: {},
        metadata: { source: "seed" }
      })
      .onConflictDoUpdate({
        target: [xrmFieldMappings.objectTypeId, xrmFieldMappings.fieldKey, xrmFieldMappings.semanticFieldId],
        set: {
          fieldDefinitionId: fieldDefinition?.id,
          confidence: 100,
          transform: {},
          metadata: { source: "seed" },
          updatedAt: new Date()
        }
      });
  }

  let createdSyntheticRecords = 0;

  if (process.env.OXRM_INTERNAL_DEMO_SCENARIO === "job-search") {
  const syntheticRecords = [
    {
      objectType: "job_company",
      externalKey: "job-search:company:signalworks",
      displayName: "SignalWorks",
      fields: { name: "SignalWorks", domain: "signalworks.example", stage: "active", website: "https://signalworks.example" }
    },
    {
      objectType: "job_company",
      externalKey: "job-search:company:northstar-labs",
      displayName: "Northstar Labs",
      fields: { name: "Northstar Labs", domain: "northstar.example", stage: "waiting", website: "https://northstar.example" }
    },
    {
      objectType: "job_company",
      externalKey: "job-search:company:atlas-health",
      displayName: "Atlas Health",
      fields: { name: "Atlas Health", domain: "atlashealth.example", stage: "research", website: "https://atlashealth.example" }
    },
    {
      objectType: "job_company",
      externalKey: "job-search:company:loombridge",
      displayName: "Loombridge",
      fields: { name: "Loombridge", domain: "loombridge.example", stage: "referral", website: "https://loombridge.example" }
    },
    {
      objectType: "job_company",
      externalKey: "job-search:company:kerneldesk",
      displayName: "KernelDesk",
      fields: { name: "KernelDesk", domain: "kerneldesk.example", stage: "archived", website: "https://kerneldesk.example" }
    },
    {
      objectType: "job_company",
      externalKey: "job-search:company:papertrail-systems",
      displayName: "Papertrail Systems",
      fields: { name: "Papertrail Systems", domain: "papertrail.example", stage: "new", website: "https://papertrail.example" }
    },
    {
      objectType: "job_company",
      externalKey: "job-search:company:quartzflow",
      displayName: "QuartzFlow",
      fields: { name: "QuartzFlow", domain: "quartzflow.example", stage: "new", website: "https://quartzflow.example" }
    },
    {
      objectType: "job_contact",
      externalKey: "job-search:contact:maya-erdem",
      displayName: "Maya Erdem",
      fields: { fullName: "Maya Erdem", title: "Engineering Manager", email: "maya@signalworks.example" }
    },
    {
      objectType: "job_contact",
      externalKey: "job-search:contact:jonas-keller",
      displayName: "Jonas Keller",
      fields: { fullName: "Jonas Keller", title: "Technical Recruiter", email: "jonas@northstar.example" }
    },
    {
      objectType: "job_contact",
      externalKey: "job-search:contact:rita-shah",
      displayName: "Rita Shah",
      fields: { fullName: "Rita Shah", title: "Talent Partner", email: "rita@atlashealth.example" }
    },
    {
      objectType: "job_contact",
      externalKey: "job-search:contact:elena-moro",
      displayName: "Elena Moro",
      fields: { fullName: "Elena Moro", title: "Former colleague", email: "elena@loombridge.example" }
    },
    {
      objectType: "job",
      externalKey: "job-search:job:platform-engineer",
      displayName: "Senior Platform Engineer",
      fields: {
        title: "Senior Platform Engineer",
        company: "SignalWorks",
        platform: "Company careers",
        location: "Berlin / Remote",
        status: "open",
        fitRate: 92,
        decisionState: "Reviewing",
        applicationStage: "Applied",
        viewedAt: "2026-06-10T08:35:00.000Z",
        discoveredAt: "2026-06-10T08:20:00.000Z",
        lastTouchAt: "2026-06-16T14:20:00.000Z",
        nextActionAt: "2026-06-19T09:00:00.000Z",
        nextAction: "Send intro-call prep and confirm referral status.",
        source: "manual shortlist",
        url: "https://jobs.example/signalworks-platform-engineer",
        description:
          "Build event-driven infrastructure for customer workflow automation. Strong TypeScript, PostgreSQL, queues, observability, and pragmatic ownership required.",
        fullDescription:
          "SignalWorks is hiring a senior platform engineer to own the workflow runtime behind customer automation products. The role includes TypeScript services, PostgreSQL data modeling, queue reliability, observability, and production debugging. The team wants someone who can turn messy operator workflows into reliable internal platforms, write clear APIs, and keep humans in control of high-impact automation. The application is already active because a warm intro call was recorded with Maya Erdem.",
        requirements: "TypeScript, Node.js, PostgreSQL, Docker, queues, observability, API design, production ownership.",
        responsibilities: "Own platform services, improve queue reliability, design APIs for operator workflows, and document operational tradeoffs.",
        matchingSkills: "TypeScript, PostgreSQL, Docker, event-driven queues, observability, local-first workflow tooling.",
        missingSkills: "More enterprise SSO examples would strengthen the application.",
        riskNotes: "Position toward product/platform impact rather than pure backend delivery."
      }
    },
    {
      objectType: "job",
      externalKey: "job-search:job:ai-tools-engineer",
      displayName: "AI Tools Engineer",
      fields: {
        title: "AI Tools Engineer",
        company: "Northstar Labs",
        platform: "LinkedIn",
        location: "Remote EU",
        status: "applied",
        fitRate: 88,
        decisionState: "Reviewing",
        applicationStage: "Applied",
        viewedAt: "2026-06-12T07:40:00.000Z",
        discoveredAt: "2026-06-12T07:15:00.000Z",
        lastTouchAt: "2026-06-13T11:30:00.000Z",
        nextActionAt: "2026-06-20T08:30:00.000Z",
        nextAction: "Draft a polite follow-up referencing agent workflow experience.",
        source: "LinkedIn alert",
        url: "https://jobs.example/northstar-ai-tools-engineer",
        description:
          "Own internal AI tooling for research teams. Role emphasizes agent workflows, evals, TypeScript services, and careful human-in-the-loop UX.",
        fullDescription:
          "Northstar Labs is looking for an AI tools engineer to build internal research and operations tooling. The work covers agent workflows, evaluation harnesses, prompt and tool integration, TypeScript services, and approval UX for sensitive actions. The application has already been submitted, so the next useful step is a concise follow-up with one concrete example of agent workflow work.",
        requirements: "Agent workflows, evals, TypeScript, service APIs, human approval UX, careful tool design.",
        responsibilities: "Build internal AI tools, maintain eval loops, integrate local tools, and improve review-before-action workflows.",
        matchingSkills: "Agents, MCP, evals, TypeScript APIs, workflow automation, review-before-send UX.",
        missingSkills: "Research-lab domain experience is lighter than requested.",
        riskNotes: "Lead with concrete agent workflow examples and avoid sounding infrastructure-only."
      }
    },
    {
      objectType: "job",
      externalKey: "job-search:job:health-platform-lead",
      displayName: "Health Platform Lead",
      fields: {
        title: "Health Platform Lead",
        company: "Atlas Health",
        platform: "Wellfound",
        location: "Munich hybrid",
        status: "saved",
        fitRate: 74,
        decisionState: "Reviewing",
        applicationStage: "Not started",
        viewedAt: "2026-06-18T08:30:00.000Z",
        discoveredAt: "2026-06-18T06:40:00.000Z",
        lastTouchAt: "2026-06-18T06:40:00.000Z",
        nextActionAt: "2026-06-19T15:00:00.000Z",
        nextAction: "Review fit, then decide whether to create the application packet.",
        source: "Wellfound alert",
        url: "https://jobs.example/atlas-health-platform-lead",
        description:
          "Lead platform reliability for scheduling and care coordination systems. Needs API design, Postgres, compliance awareness, and mentoring.",
        fullDescription:
          "Atlas Health needs a platform lead for scheduling and care coordination systems. The technical overlap is API design, PostgreSQL, reliability, audit trails, and mentoring, but the fit needs disciplined review because regulated healthcare workflows require careful positioning. The correct next action is to review fit and tailor the CV only if the healthcare-platform angle is defensible.",
        requirements: "API design, PostgreSQL, reliability, auditability, mentoring, compliance-aware data handling.",
        responsibilities: "Lead platform reliability, improve scheduling workflows, review operational risks, and mentor backend engineers.",
        matchingSkills: "API design, Postgres, reliability, scheduling workflows, mentoring.",
        missingSkills: "Healthcare compliance and regulated data handling examples.",
        riskNotes: "Do not apply with a generic CV; tailor around reliability and auditability."
      }
    },
    {
      objectType: "job",
      externalKey: "job-search:job:founding-backend",
      displayName: "Founding Backend Engineer",
      fields: {
        title: "Founding Backend Engineer",
        company: "Loombridge",
        platform: "Warm referral",
        location: "Amsterdam / Remote",
        status: "open",
        fitRate: 82,
        decisionState: "Reviewing",
        applicationStage: "Applied",
        viewedAt: "2026-06-17T15:50:00.000Z",
        discoveredAt: "2026-06-17T15:10:00.000Z",
        lastTouchAt: "2026-06-17T16:10:00.000Z",
        nextActionAt: "2026-06-21T10:00:00.000Z",
        nextAction: "Wait for Elena reply, then send CV context if positive.",
        source: "warm contact",
        url: "https://jobs.example/loombridge-founding-backend",
        description:
          "Early backend hire for B2B workflow product. Needs product-minded backend engineer comfortable with customer discovery and fast iteration.",
        fullDescription:
          "Loombridge is a founder-stage B2B workflow product looking for an early backend engineer. The job description emphasizes product-minded backend ownership, direct customer discovery, fast iteration, and enough infrastructure judgment to keep a small team moving. The outreach is active through a warm referral, so the next action depends on Elena's response rather than a blind application.",
        requirements: "Backend product ownership, TypeScript or similar service work, customer discovery, pragmatic infrastructure.",
        responsibilities: "Build early product backend, join customer calls, shape workflow primitives, and iterate with founders.",
        matchingSkills: "Product-minded backend work, customer discovery, workflow systems, fast iteration.",
        missingSkills: "Need stronger direct customer-facing execution examples.",
        riskNotes: "Warm intro matters more than cold application quality here."
      }
    },
    {
      objectType: "job",
      externalKey: "job-search:job:infra-engineer",
      displayName: "Infrastructure Engineer",
      fields: {
        title: "Infrastructure Engineer",
        company: "KernelDesk",
        platform: "Recruiter email",
        location: "Remote",
        status: "rejected",
        fitRate: 46,
        decisionState: "Archived",
        applicationStage: "Closed",
        closingReason: "Rejected",
        viewedAt: "2026-06-15T09:00:00.000Z",
        discoveredAt: "2026-06-02T08:30:00.000Z",
        lastTouchAt: "2026-06-15T08:45:00.000Z",
        nextActionAt: "",
        nextAction: "Archived. Keep lesson: this was too Terraform/Kubernetes heavy.",
        source: "recruiter email",
        url: "https://jobs.example/kerneldesk-infra",
        description:
          "Infrastructure role focused on Kubernetes, Terraform, and incident response. Archived after recruiter said the team needed deeper infra specialization.",
        fullDescription:
          "KernelDesk was an infrastructure-heavy role centered on Kubernetes, Terraform, incident response, and platform operations. The recruiter clarified that the team needed deep infra specialization rather than product/platform workflow work. The application is closed with rejection recorded, and the record remains useful as calibration data for future fit scoring.",
        requirements: "Kubernetes, Terraform, incident response, infrastructure operations, platform reliability.",
        responsibilities: "Maintain infrastructure, lead incident response, own Terraform modules, and support production reliability.",
        matchingSkills: "Docker, observability, production ownership.",
        missingSkills: "Deep Terraform, Kubernetes operations, incident-command specialization.",
        riskNotes: "Archived as a calibration example for avoiding overly infra-heavy roles."
      }
    },
    {
      objectType: "job",
      externalKey: "job-search:job:papertrail-devex",
      displayName: "Developer Experience Engineer",
      fields: {
        title: "Developer Experience Engineer",
        company: "Papertrail Systems",
        platform: "Company careers",
        location: "Remote EU",
        status: "open",
        fitRate: 86,
        decisionState: "New",
        applicationStage: "Not started",
        viewedAt: "",
        discoveredAt: "2026-06-21T07:25:00.000Z",
        lastTouchAt: "",
        nextActionAt: "2026-06-21T13:00:00.000Z",
        nextAction: "Review fit and decide whether to start an application.",
        source: "company career page",
        url: "https://jobs.example/papertrail-devex",
        description: "Build internal developer workflows, local tooling, CI feedback loops, and documentation for a distributed product engineering team.",
        fullDescription:
          "Papertrail Systems is hiring a developer experience engineer to improve local development, CI feedback, internal tooling, and documentation for product engineers. The role is a strong match for someone who can reason about developer workflows, Docker-based local setup, TypeScript services, and operational docs. No application exists yet; this is one of the two fresh jobs that should be reviewed today.",
        requirements: "Developer tooling, Docker, CI, TypeScript, documentation, local setup, product engineering empathy.",
        responsibilities: "Improve local development loops, reduce CI noise, write operational docs, and build small internal tools.",
        matchingSkills: "Docker, TypeScript, local-first tooling, CI troubleshooting, documentation.",
        missingSkills: "Need to confirm build-system ownership expectations.",
        riskNotes: "Position as workflow/product tooling, not only backend services."
      }
    },
    {
      objectType: "job",
      externalKey: "job-search:job:quartzflow-automation",
      displayName: "Workflow Automation Engineer",
      fields: {
        title: "Workflow Automation Engineer",
        company: "QuartzFlow",
        platform: "YC Work at a Startup",
        location: "Berlin / Remote",
        status: "open",
        fitRate: 79,
        decisionState: "New",
        applicationStage: "Not started",
        viewedAt: "",
        discoveredAt: "2026-06-20T18:10:00.000Z",
        lastTouchAt: "",
        nextActionAt: "2026-06-21T14:30:00.000Z",
        nextAction: "Run fit calculation and prepare an application packet if fit stays high.",
        source: "job alert",
        url: "https://jobs.example/quartzflow-automation",
        description: "Design workflow automations for operations teams with strict review steps, audit history, and integrations.",
        fullDescription:
          "QuartzFlow is looking for a workflow automation engineer to design automation systems for operations teams. The role combines backend services, integrations, approval steps, audit history, and careful UX for human-reviewed automation. No application exists yet; the intended agent action is to calculate fit from the CV and suggest whether to start an application.",
        requirements: "Workflow automation, backend services, integrations, audit trails, review UX, TypeScript or Python.",
        responsibilities: "Design automation flows, integrate external systems, build approval checkpoints, and maintain activity history.",
        matchingSkills: "Workflow automation, approval checkpoints, audit trails, backend integrations.",
        missingSkills: "Need more evidence around customer-facing implementation and integration depth.",
        riskNotes: "Apply only if the cover letter can make the approval/audit angle specific."
      }
    },
    {
      objectType: "job_alert",
      externalKey: "job-search:alert:northstar-ai-tools",
      displayName: "LinkedIn alert: AI Tools Engineer",
      fields: {
        title: "AI Tools Engineer at Northstar Labs",
        source: "LinkedIn job alert",
        receivedAt: "2026-06-12T07:15:00.000Z",
        status: "converted_to_application",
        url: "https://jobs.example/northstar-ai-tools-engineer"
      }
    },
    {
      objectType: "job_alert",
      externalKey: "job-search:alert:atlas-health-platform",
      displayName: "Wellfound alert: Health Platform Lead",
      fields: {
        title: "Health Platform Lead at Atlas Health",
        source: "Wellfound job alert",
        receivedAt: "2026-06-18T06:40:00.000Z",
        status: "needs_review",
        url: "https://jobs.example/atlas-health-platform-lead"
      }
    },
    {
      objectType: "job_fit",
      externalKey: "job-search:fit:signalworks-platform",
      displayName: "Fit - SignalWorks Senior Platform Engineer",
      fields: {
        title: "SignalWorks Senior Platform Engineer fit",
        fitRate: 92,
        fitSummary: "Strong match for TypeScript platform work, queues, Postgres, observability, and operator-facing workflow systems.",
        matchingSkills: "TypeScript, PostgreSQL, Docker, event-driven queues, local-first workflow tooling, pragmatic ownership",
        missingSkills: "Deeper enterprise SSO examples could strengthen the story.",
        riskNotes: "Good technical fit. Main risk is positioning toward product/platform impact rather than pure backend delivery.",
        recommendedAction: "Apply and follow up through Maya with a short platform systems narrative.",
        evaluatedAt: "2026-06-10T08:20:00.000Z"
      }
    },
    {
      objectType: "job_fit",
      externalKey: "job-search:fit:northstar-ai-tools",
      displayName: "Fit - Northstar AI Tools Engineer",
      fields: {
        title: "Northstar AI Tools Engineer fit",
        fitRate: 88,
        fitSummary: "Strong fit for agent tooling, evaluations, human approval loops, and TypeScript service work.",
        matchingSkills: "Agents, MCP, evals, TypeScript APIs, workflow automation, review-before-send UX",
        missingSkills: "Research-lab domain experience is lighter than the job description implies.",
        riskNotes: "Lead with concrete agent workflow examples and avoid sounding too infrastructure-focused.",
        recommendedAction: "Follow up with one concrete agent workflow example and ask about the team's evaluation stack.",
        evaluatedAt: "2026-06-13T09:45:00.000Z"
      }
    },
    {
      objectType: "job_fit",
      externalKey: "job-search:fit:atlas-health-platform",
      displayName: "Fit - Atlas Health Platform Lead",
      fields: {
        title: "Atlas Health Platform Lead fit",
        fitRate: 74,
        fitSummary: "Moderate fit. Platform and reliability work match, but healthcare compliance depth needs careful positioning.",
        matchingSkills: "API design, Postgres, reliability, scheduling workflows, mentoring",
        missingSkills: "Healthcare compliance, regulated data handling, HIPAA-style operating examples",
        riskNotes: "Do not apply with a generic CV. Tailor around reliability, auditability, and careful data handling.",
        recommendedAction: "Review the full description and draft a healthcare-platform CV variant before applying.",
        evaluatedAt: "2026-06-18T07:00:00.000Z"
      }
    },
    {
      objectType: "job_fit",
      externalKey: "job-search:fit:loombridge-founding-backend",
      displayName: "Fit - Loombridge Founding Backend Engineer",
      fields: {
        title: "Loombridge Founding Backend Engineer fit",
        fitRate: 82,
        fitSummary: "Good startup fit for backend/product ownership and customer-informed workflow systems.",
        matchingSkills: "Product-minded backend work, customer discovery, workflow systems, fast iteration",
        missingSkills: "Founder-stage hiring may need stronger evidence of direct customer-facing execution.",
        riskNotes: "Warm intro matters more than cold application here.",
        recommendedAction: "Wait for Elena reply, then send concise CV context tailored to founding-team ownership.",
        evaluatedAt: "2026-06-17T15:50:00.000Z"
      }
    },
    {
      objectType: "job_fit",
      externalKey: "job-search:fit:kerneldesk-infra",
      displayName: "Fit - KernelDesk Infrastructure Engineer",
      fields: {
        title: "KernelDesk Infrastructure Engineer fit",
        fitRate: 46,
        fitSummary: "Weak fit after recruiter clarification. The role is more Terraform/Kubernetes-heavy than platform product work.",
        matchingSkills: "Docker, observability, production ownership",
        missingSkills: "Deep Terraform, Kubernetes operations, incident-command specialization",
        riskNotes: "Archived as a calibration example for avoiding overly infra-heavy roles.",
        recommendedAction: "Do not pursue. Use the lesson to filter future alerts.",
        evaluatedAt: "2026-06-15T09:00:00.000Z"
      }
    },
    {
      objectType: "job_fit",
      externalKey: "job-search:fit:papertrail-devex",
      displayName: "Fit - Papertrail Developer Experience Engineer",
      fields: {
        title: "Papertrail Developer Experience Engineer fit",
        fitRate: 86,
        fitSummary: "Strong fit for local developer workflows, Docker setup, CI feedback loops, and operator-facing documentation.",
        matchingSkills: "Docker, TypeScript, local-first tooling, CI troubleshooting, documentation, product engineering empathy",
        missingSkills: "Need to confirm whether the team expects deep build-system ownership.",
        riskNotes: "Position as workflow/product tooling, not only backend services.",
        recommendedAction: "Review description, then start application if CV can emphasize developer workflow systems.",
        evaluatedAt: "2026-06-21T07:40:00.000Z"
      }
    },
    {
      objectType: "job_fit",
      externalKey: "job-search:fit:quartzflow-automation",
      displayName: "Fit - QuartzFlow Workflow Automation Engineer",
      fields: {
        title: "QuartzFlow Workflow Automation Engineer fit",
        fitRate: 79,
        fitSummary: "Good fit for automation loops, approval checkpoints, audit history, and integrations.",
        matchingSkills: "Workflow automation, agent-assisted approvals, audit trails, backend integrations",
        missingSkills: "Need more evidence around customer-facing implementation and integration depth.",
        riskNotes: "Apply only if the cover letter can make the approval/audit angle specific.",
        recommendedAction: "Run CV fit calculation and decide whether to prepare a tailored application packet.",
        evaluatedAt: "2026-06-20T18:30:00.000Z"
      }
    },
    {
      objectType: "cv_template",
      externalKey: "job-search:cv-template:operator-engineering",
      displayName: "Original CV Template - Operator Engineering",
      fields: {
        title: "Original CV Template - Operator Engineering",
        version: "base-2026-06",
        focus: "Backend, automation, local-first systems, agent-assisted workflows",
        url: "https://docs.example/cv-template-operator-engineering.pdf",
        sourcePath: ".data/files/templates/cv/operator-engineering.md",
        outputPath: ".data/files/templates/cv/operator-engineering.pdf",
        editorInstructions:
          "Use this as the canonical source CV. Preserve factual claims. When deriving a role-specific CV, copy this record, adapt the focus and body to the job fit notes, and keep the original template linked.",
        body:
          "Profile: backend/product engineer focused on local-first workflow systems, TypeScript services, PostgreSQL, Docker, queues, and human-in-the-loop agent tooling.\n\nSelected work:\n- Built self-hosted outreach and relationship tooling with auditable agent workflows.\n- Designed local Docker runtimes with API, web, database, MCP, and queue services.\n- Implemented review-before-send workflows for high-context outreach.\n\nCore skills: TypeScript, Node.js, PostgreSQL, Docker, Angular, Fastify, Drizzle, MCP, workflow automation.",
        notes: "Base CV used to derive role-specific CV versions."
      }
    },
    {
      objectType: "cover_letter_template",
      externalKey: "job-search:cover-template:short-context",
      displayName: "Original Cover Letter Template - Short Context",
      fields: {
        title: "Original Cover Letter Template - Short Context",
        version: "base-2026-06",
        tone: "concise, specific, human",
        url: "https://docs.example/cover-template-short-context.md",
        sourcePath: ".data/files/templates/cover-letter/short-context.md",
        outputPath: ".data/files/templates/cover-letter/short-context.md",
        editorInstructions:
          "Use this as the base cover letter. Keep it short. Mention the company, the role, one concrete fit reason, and one human next step. Never imply a message was sent unless the human confirms it.",
        body:
          "Hi {{contact}},\n\nI am applying for {{role}} at {{company}}. The part that looks most relevant is {{specific_fit_reason}}.\n\nI have been working on {{evidence_or_project}}, which maps closely to {{job_need}}.\n\nIf useful, I would be happy to share more context or tailor examples for the team.\n\nBest,\n{{name}}",
        notes: "Base cover letter template used for company-specific drafts."
      }
    },
    {
      objectType: "cv_version",
      externalKey: "job-search:cv:platform-v3",
      displayName: "CV - Backend Platform - v3",
      fields: {
        title: "CV - Backend Platform",
        version: "v3",
        baseTemplate: "Original CV Template - Operator Engineering",
        derivedFor: "SignalWorks Senior Platform Engineer",
        focus: "TypeScript, Postgres, queues, Docker, observability",
        url: "https://docs.example/cv-backend-platform-v3.pdf",
        sourcePath: ".data/files/records/job-search/cv-backend-platform-v3.md",
        outputPath: ".data/files/records/job-search/cv-backend-platform-v3.pdf",
        editorInstructions:
          "Maintain the platform/backend emphasis. For high-fit jobs, add company-specific examples only when they are backed by the job description or communication ledger.",
        body:
          "Profile: backend/platform engineer with TypeScript, PostgreSQL, Docker, queues, observability, and operator-facing workflow systems.\n\nRole emphasis: platform reliability, event-driven systems, pragmatic delivery, and production ownership.\n\nEvidence to keep prominent:\n- Built Docker-first local product stacks with API, web, database, and agent surfaces.\n- Designed auditable queues and follow-up workflows for human review.\n- Worked across product requirements, backend implementation, and operational debugging.",
        notes: "Tailored for platform/backend roles with strong infra ownership."
      }
    },
    {
      objectType: "cv_version",
      externalKey: "job-search:cv:ai-tools-v2",
      displayName: "CV - AI Tools - v2",
      fields: {
        title: "CV - AI Tools",
        version: "v2",
        baseTemplate: "Original CV Template - Operator Engineering",
        derivedFor: "Northstar AI Tools Engineer",
        focus: "Agents, evals, workflow automation, human approval loops",
        url: "https://docs.example/cv-ai-tools-v2.pdf",
        sourcePath: ".data/files/records/job-search/cv-ai-tools-v2.md",
        outputPath: ".data/files/records/job-search/cv-ai-tools-v2.pdf",
        editorInstructions:
          "Lead with agent workflow evidence, MCP/tooling, evaluations, and explicit approval gates. Avoid overstating autonomous sending.",
        body:
          "Profile: product/backend engineer building agent-assisted workflow systems with strong human approval boundaries.\n\nRole emphasis: MCP tools, local queues, evaluation loops, draft-only automation, and auditable state.\n\nEvidence to keep prominent:\n- Built MCP-accessible queues and saved views for agents.\n- Designed draft-only workflows where humans approve external actions.\n- Implemented TypeScript APIs and UI for record inspection, suggestions, and follow-ups.",
        notes: "Emphasizes agent tooling and product engineering."
      }
    },
    {
      objectType: "cv_version",
      externalKey: "job-search:cv:health-platform-draft",
      displayName: "CV - Healthcare Platform Draft - v1",
      fields: {
        title: "CV - Healthcare Platform Draft",
        version: "v1-draft",
        baseTemplate: "Original CV Template - Operator Engineering",
        derivedFor: "Atlas Health Platform Lead",
        focus: "Reliability, auditability, scheduling systems, careful data handling",
        url: "https://docs.example/cv-health-platform-draft-v1.pdf",
        sourcePath: ".data/files/records/job-search/cv-health-platform-draft-v1.md",
        outputPath: ".data/files/records/job-search/cv-health-platform-draft-v1.pdf",
        editorInstructions:
          "This is a draft. Strengthen reliability, auditability, scheduling, and careful data handling. Flag the missing healthcare-compliance evidence instead of hiding it.",
        body:
          "Profile: backend/platform engineer focused on reliable workflow systems, audit trails, scheduling, and local-first operational data.\n\nRole emphasis for Atlas Health: API reliability, Postgres-backed state, scheduling workflows, auditability, and careful handling of sensitive operational context.\n\nGap to handle honestly: direct healthcare compliance experience is lighter; position adjacent work around auditability and cautious data workflows.",
        notes: "Draft CV variant to review before applying."
      }
    },
    {
      objectType: "cv_version",
      externalKey: "job-search:cv:founding-backend-draft",
      displayName: "CV - Founding Backend Draft - v1",
      fields: {
        title: "CV - Founding Backend Draft",
        version: "v1-draft",
        baseTemplate: "Original CV Template - Operator Engineering",
        derivedFor: "Loombridge Founding Backend Engineer",
        focus: "Product-minded backend, customer discovery, fast iteration",
        url: "https://docs.example/cv-founding-backend-draft-v1.pdf",
        sourcePath: ".data/files/records/job-search/cv-founding-backend-draft-v1.md",
        outputPath: ".data/files/records/job-search/cv-founding-backend-draft-v1.pdf",
        editorInstructions:
          "Keep this concise and founder-stage. Emphasize product ownership, customer discovery, backend delivery, and fast iteration.",
        body:
          "Profile: product-minded backend engineer comfortable with customer discovery, ambiguous requirements, and fast iteration.\n\nRole emphasis for Loombridge: backend ownership, product judgment, workflow systems, and direct user feedback loops.\n\nDo not send until the referral contact replies positively.",
        notes: "Prepared but not sent until referral reply."
      }
    },
    {
      objectType: "cover_letter",
      externalKey: "job-search:cover:signalworks",
      displayName: "Cover Letter - SignalWorks",
      fields: {
        title: "Cover Letter - SignalWorks",
        version: "v1",
        baseTemplate: "Original Cover Letter Template - Short Context",
        derivedFor: "SignalWorks Senior Platform Engineer",
        company: "SignalWorks",
        url: "https://docs.example/cover-signalworks-v1.pdf",
        sourcePath: ".data/files/records/job-search/cover-signalworks-v1.md",
        outputPath: ".data/files/records/job-search/cover-signalworks-v1.pdf",
        editorInstructions:
          "Keep the message short and grounded in platform systems. Human must review before sending or uploading.",
        body:
          "Hi Maya,\n\nI am applying for the Senior Platform Engineer role at SignalWorks. The strongest overlap is event-driven workflow systems, TypeScript services, PostgreSQL, queues, and pragmatic platform ownership.\n\nI have been building self-hosted workflow tooling with auditable agent assistance and review-before-send queues, which maps closely to the systems described in the posting.\n\nBest,\nSynthetic Candidate",
        summary: "Connects prior workflow automation work to SignalWorks event-driven product."
      }
    },
    {
      objectType: "cover_letter",
      externalKey: "job-search:cover:northstar",
      displayName: "Cover Letter - Northstar Labs",
      fields: {
        title: "Cover Letter - Northstar Labs",
        version: "v2",
        baseTemplate: "Original Cover Letter Template - Short Context",
        derivedFor: "Northstar AI Tools Engineer",
        company: "Northstar Labs",
        url: "https://docs.example/cover-northstar-v2.pdf",
        sourcePath: ".data/files/records/job-search/cover-northstar-v2.md",
        outputPath: ".data/files/records/job-search/cover-northstar-v2.pdf",
        editorInstructions:
          "Emphasize agent workflow and evaluation examples. Keep the tone factual and avoid generic AI enthusiasm.",
        body:
          "Hi Jonas,\n\nI am following up on the AI Tools Engineer application. The role looks close to my work on agent-assisted workflow systems, MCP-accessible queues, draft-only automation, and human approval loops.\n\nOne concrete example: I built local tools where agents can inspect records, summarize context, and prepare next actions without sending anything automatically.\n\nBest,\nSynthetic Candidate",
        summary: "Highlights Codex/MCP workflow experience and careful AI tooling."
      }
    },
    {
      objectType: "cover_letter",
      externalKey: "job-search:cover:atlas-draft",
      displayName: "Cover Letter - Atlas Health Draft",
      fields: {
        title: "Cover Letter - Atlas Health Draft",
        version: "v1-draft",
        baseTemplate: "Original Cover Letter Template - Short Context",
        derivedFor: "Atlas Health Platform Lead",
        company: "Atlas Health",
        url: "https://docs.example/cover-atlas-health-draft-v1.md",
        sourcePath: ".data/files/records/job-search/cover-atlas-health-draft-v1.md",
        outputPath: ".data/files/records/job-search/cover-atlas-health-draft-v1.md",
        editorInstructions:
          "Draft only. Before applying, verify that the healthcare-platform angle is strong enough and do not hide the missing compliance depth.",
        body:
          "Hi Rita,\n\nI am considering the Health Platform Lead role at Atlas Health. The overlap I would emphasize is backend reliability, auditability, scheduling workflows, and careful operational data handling.\n\nMy direct healthcare-compliance experience is lighter, so I would position the application around adjacent audit and reliability work rather than overstating domain depth.\n\nBest,\nSynthetic Candidate",
        summary: "Draft focused on reliability, auditability, and healthcare scheduling context."
      }
    },
    {
      objectType: "cover_letter",
      externalKey: "job-search:cover:loombridge-draft",
      displayName: "Cover Letter - Loombridge Draft",
      fields: {
        title: "Cover Letter - Loombridge Draft",
        version: "v1-draft",
        baseTemplate: "Original Cover Letter Template - Short Context",
        derivedFor: "Loombridge Founding Backend Engineer",
        company: "Loombridge",
        url: "https://docs.example/cover-loombridge-draft-v1.md",
        sourcePath: ".data/files/records/job-search/cover-loombridge-draft-v1.md",
        outputPath: ".data/files/records/job-search/cover-loombridge-draft-v1.md",
        editorInstructions:
          "Do not send until Elena replies positively. Keep it founder-stage: product ownership, customer discovery, backend delivery.",
        body:
          "Hi Elena,\n\nIf Loombridge is still looking for a founding backend engineer, the fit I would highlight is product-minded backend ownership, workflow systems, and fast iteration with customer feedback.\n\nI can send a concise CV context if that is useful.\n\nBest,\nSynthetic Candidate",
        summary: "Draft emphasizing product-minded backend ownership and warm referral context."
      }
    },
    {
      objectType: "application",
      externalKey: "job-search:application:signalworks-platform",
      displayName: "Senior Platform Engineer at SignalWorks",
      fields: {
        role: "Senior Platform Engineer",
        company: "SignalWorks",
        stage: "Applied",
        fitRate: 92,
        responsiblePerson: "Maya Erdem",
        appliedAt: "2026-06-10T09:00:00.000Z",
        lastTouchAt: "2026-06-16T14:20:00.000Z",
        nextActionAt: "2026-06-19T09:00:00.000Z",
        nextAction: "Send intro-call prep and ask whether Maya can confirm referral status.",
        cvVersion: "Backend Platform v3",
        coverLetterVersion: "SignalWorks v1"
      }
    },
    {
      objectType: "application",
      externalKey: "job-search:application:northstar-ai-tools",
      displayName: "AI Tools Engineer at Northstar Labs",
      fields: {
        role: "AI Tools Engineer",
        company: "Northstar Labs",
        stage: "Applied",
        fitRate: 88,
        responsiblePerson: "Jonas Keller",
        appliedAt: "2026-06-13T11:30:00.000Z",
        lastTouchAt: "2026-06-13T11:30:00.000Z",
        nextActionAt: "2026-06-20T08:30:00.000Z",
        nextAction: "Draft a polite follow-up with one sentence about agent workflow experience.",
        cvVersion: "AI Tools v2",
        coverLetterVersion: "Northstar v2"
      }
    },
    {
      objectType: "application",
      externalKey: "job-search:application:atlas-health-platform",
      displayName: "Health Platform Lead at Atlas Health",
      fields: {
        role: "Health Platform Lead",
        company: "Atlas Health",
        stage: "Not started",
        fitRate: 74,
        responsiblePerson: "Rita Shah",
        appliedAt: "",
        lastTouchAt: "2026-06-18T06:40:00.000Z",
        nextActionAt: "2026-06-19T15:00:00.000Z",
        nextAction: "Review job description, decide whether to tailor CV, and prepare application draft.",
        cvVersion: "Healthcare Platform Draft v1",
        coverLetterVersion: "Atlas Health Draft v1"
      }
    },
    {
      objectType: "application",
      externalKey: "job-search:application:loombridge-founding-backend",
      displayName: "Founding Backend Engineer at Loombridge",
      fields: {
        role: "Founding Backend Engineer",
        company: "Loombridge",
        stage: "Applied",
        fitRate: 82,
        responsiblePerson: "Elena Moro",
        appliedAt: "",
        lastTouchAt: "2026-06-17T16:10:00.000Z",
        nextActionAt: "2026-06-21T10:00:00.000Z",
        nextAction: "Wait for Elena reply, then send CV and short context if positive.",
        cvVersion: "Founding Backend Draft v1",
        coverLetterVersion: "Loombridge Draft v1"
      }
    },
    {
      objectType: "application",
      externalKey: "job-search:application:kerneldesk-infra",
      displayName: "Infrastructure Engineer at KernelDesk",
      fields: {
        role: "Infrastructure Engineer",
        company: "KernelDesk",
        stage: "Closed",
        closingReason: "Rejected",
        fitRate: 46,
        responsiblePerson: "Recruiting team",
        appliedAt: "2026-06-02T10:00:00.000Z",
        lastTouchAt: "2026-06-15T08:45:00.000Z",
        nextActionAt: "",
        nextAction: "Archived. Capture lesson: role was too Terraform/Kubernetes heavy.",
        cvVersion: "Backend Platform v3",
        coverLetterVersion: "none"
      }
    },
    {
      objectType: "interview",
      externalKey: "job-search:interview:signalworks-intro",
      displayName: "SignalWorks intro call",
      fields: {
        title: "SignalWorks intro call",
        stage: "intro",
        scheduledAt: "2026-06-20T13:00:00.000Z"
      }
    },
    {
      objectType: "referral",
      externalKey: "job-search:referral:maya-erdem",
      displayName: "Maya Erdem referral",
      fields: { name: "Maya Erdem referral", status: "requested" }
    },
    {
      objectType: "referral",
      externalKey: "job-search:referral:elena-moro",
      displayName: "Elena Moro referral",
      fields: { name: "Elena Moro referral", status: "waiting_for_reply" }
    },
    {
      objectType: "document",
      externalKey: "job-search:document:platform-resume",
      displayName: "Platform engineer resume",
      fields: {
        title: "Platform engineer resume",
        kind: "resume",
        version: "v3",
        url: "https://docs.example/resume-platform.pdf",
        sourcePath: ".data/files/records/job-search/document-platform-resume.md",
        outputPath: ".data/files/records/job-search/document-platform-resume.pdf",
        editorInstructions: "Generic document editor example. Keep this linked to the SignalWorks application and update only after reviewing the target job fit.",
        body: "Platform resume attached to the SignalWorks application. Use the CV version record as the canonical editable source."
      }
    },
    {
      objectType: "operator_playbook",
      externalKey: "job-search:playbook:start",
      displayName: "Start here: job application system",
      fields: {
        title: "Start here: job application system",
        audience: "Human operator + Codex thread applying for jobs from a local oXRM clone.",
        startCommand: "git clone https://github.com/otcan/oxrm.git && cd oxrm && ./oxrm start && ./oxrm ready && ./oxrm demo job-search",
        setupChecklist:
          "1. Add job sources: job boards, company career pages, recruiter inboxes, referrals, and manual URLs.\n2. Add or edit the base CV template and cover letter template.\n3. Ask Codex to import or paste job postings into Job Postings and Incoming Job Alerts.\n4. Run the fit calculation blueprint for new postings.\n5. Review high-fit suggestions before creating application packets.\n6. Edit CV and cover letter drafts in the document editor.\n7. Send externally yourself, then record the event and next follow-up.",
        dailyLoop:
          "Morning: import sources, dedupe postings, calculate fit, and open suggestions.\nMidday: edit high-fit CV/cover drafts and approve or archive applications.\nEvening: review follow-ups due, draft messages, and record what was actually sent outside oXRM.",
        agentInstructions:
          "Read Job Sources, Job Search Timers, Job Postings, Job Fits, Applications, CV Versions, Cover Letters, and Action Suggestions. Generate drafts only. Never claim a message or application was sent unless the human confirms it. Create or update records with clear audit notes.",
        humanInstructions:
          "You control sources, credentials, final CV content, final cover letters, external sending, applications, and approvals. Treat fit scores as suggestions, not decisions.",
        status: "active"
      }
    },
    {
      objectType: "source_config",
      externalKey: "job-search:source:linkedin-jobs",
      displayName: "LinkedIn job alerts",
      fields: {
        title: "LinkedIn job alerts",
        channel: "job_board",
        sourceUrl: "https://www.linkedin.com/jobs/",
        cadence: "daily",
        status: "configured",
        importInstructions: "Paste or import saved job alert URLs and recruiter job links. Store the original URL and raw description as a job posting or job alert.",
        privacyNotes: "Use synthetic demo data publicly. For real accounts, keep cookies and credentials outside the repo."
      }
    },
    {
      objectType: "source_config",
      externalKey: "job-search:source:company-careers",
      displayName: "Target company career pages",
      fields: {
        title: "Target company career pages",
        channel: "career_page",
        sourceUrl: "https://example.invalid/careers",
        cadence: "daily",
        status: "configured",
        importInstructions: "Maintain a list of target company career pages. Import postings, dedupe by company/title/URL, and create job fit records for new matches.",
        privacyNotes: "Respect robots, rate limits, and site terms. Manual paste is acceptable."
      }
    },
    {
      objectType: "source_config",
      externalKey: "job-search:source:recruiter-inbox",
      displayName: "Recruiter inbox",
      fields: {
        title: "Recruiter inbox",
        channel: "email",
        sourceUrl: "mailto:synthetic-recruiter-inbox@example.invalid",
        cadence: "daily",
        status: "manual",
        importInstructions: "Review recruiter emails, extract role/company/contact/job description, and create Job Posting, Job Contact, Application, and Communication Ledger entries.",
        privacyNotes: "Do not expose real inboxes publicly. Keep external credentials local."
      }
    },
    {
      objectType: "automation_timer",
      externalKey: "job-search:timer:daily-import-fit",
      displayName: "Daily import and fit scoring",
      fields: {
        title: "Daily import and fit scoring",
        cadence: "daily 08:30",
        nextRunAt: "2026-06-21T06:30:00.000Z",
        task: "Import new postings from configured sources, dedupe, extract descriptions, and run disciplined fit scoring.",
        blueprint: "Import job postings from websites or mail; Rate job fit and explain tradeoffs",
        approvalRequired: "No approval to score; human approval before applying.",
        status: "scheduled"
      }
    },
    {
      objectType: "automation_timer",
      externalKey: "job-search:timer:daily-drafts-followups",
      displayName: "Daily drafts and follow-ups",
      fields: {
        title: "Daily drafts and follow-ups",
        cadence: "daily 16:00",
        nextRunAt: "2026-06-20T14:00:00.000Z",
        task: "Review high-fit suggestions, create draft application packets, prepare follow-up messages, and open approval requests.",
        blueprint: "Create tailored application packet; Prepare follow-up from communication ledger",
        approvalRequired: "Always required before sending, applying, uploading, or messaging.",
        status: "scheduled"
      }
    },
    {
      objectType: "action_blueprint",
      externalKey: "job-search:blueprint:inspect-view",
      displayName: "Inspect records and propose next action",
      fields: {
        title: "Inspect records and propose next action",
        templateKey: "job_search",
        appliesToViewKey: "*",
        appliesToObjectType: "*",
        trigger: "Manual review from any saved view",
        automationLevel: "suggested",
        approvalRequired: "Required before external action",
        inputs: "Selected view rows, linked records, relationship summaries, tasks, timeline events, and local files.",
        outputs: "Relationship summary, next action suggestion, draft-only message or task proposal.",
        humanControl: "The user decides whether to create a task, approve a draft, apply, reply, or ignore the suggestion.",
        riskLevel: "low",
        status: "active"
      }
    },
    {
      objectType: "action_blueprint",
      externalKey: "job-search:blueprint:import-postings",
      displayName: "Import job postings from websites or mail",
      fields: {
        title: "Import job postings from websites or mail",
        templateKey: "job_search",
        appliesToViewKey: "job_search.jobs,job_search.job_alerts",
        appliesToObjectType: "job,job_alert",
        trigger: "Scheduled connector run or manual import",
        automationLevel: "automatic_draft",
        approvalRequired: "Not required for synthetic import; required before using real credentials",
        inputs: "Target career pages, job boards, recruiter emails, alert messages, URLs, and raw job descriptions.",
        outputs: "Job alert records, job posting records, source files, deduplication notes, and extraction audit events.",
        humanControl: "User chooses target sources and reviews imported records before applying or contacting anyone.",
        riskLevel: "medium",
        status: "active"
      }
    },
    {
      objectType: "action_blueprint",
      externalKey: "job-search:blueprint:rate-fit",
      displayName: "Rate job fit and explain tradeoffs",
      fields: {
        title: "Rate job fit and explain tradeoffs",
        templateKey: "job_search",
        appliesToViewKey: "job_search.jobs,job_search.job_fits",
        appliesToObjectType: "job,job_fit",
        trigger: "New posting saved or CV template changed",
        automationLevel: "automatic_suggestion",
        approvalRequired: "Not required to score; required before acting on high-fit suggestions",
        inputs: "Job description, company context, CV template, past outcomes, matching skills, missing skills, and constraints.",
        outputs: "Job Fit record with fit rate, matching skills, missing skills, risk notes, and recommended action.",
        humanControl: "User reviews the score explanation and decides whether to create or submit an application packet.",
        riskLevel: "low",
        status: "active"
      }
    },
    {
      objectType: "action_blueprint",
      externalKey: "job-search:blueprint:create-application-packet",
      displayName: "Create tailored application packet",
      fields: {
        title: "Create tailored application packet",
        templateKey: "job_search",
        appliesToViewKey: "job_search.jobs,job_search.applications,job_search.documents,job_search.cover_letters",
        appliesToObjectType: "job,application,cv_version,cover_letter",
        trigger: "High fit rate or explicit user request",
        automationLevel: "draft_only",
        approvalRequired: "Required before sending or uploading documents",
        inputs: "Original CV template, cover letter template, job description, job fit notes, company context, and responsible contact.",
        outputs: "Derived CV version, derived cover letter, application record, local file links, and review task.",
        humanControl: "User approves edits and sends externally; oXRM only stores drafts and local history.",
        riskLevel: "medium",
        status: "active"
      }
    },
    {
      objectType: "action_blueprint",
      externalKey: "job-search:blueprint:follow-up",
      displayName: "Prepare follow-up from communication ledger",
      fields: {
        title: "Prepare follow-up from communication ledger",
        templateKey: "job_search",
        appliesToViewKey: "job_search.applications,job_search.followups_due,job_search.waiting_for_reply",
        appliesToObjectType: "application",
        trigger: "Next action due or reply window passed",
        automationLevel: "automatic_suggestion",
        approvalRequired: "Required before any message is sent",
        inputs: "Application stage, responsible contact, last touch, full communication ledger, current drafts, and due task.",
        outputs: "Suggested next action, draft follow-up message, phase-change recommendation, and task update.",
        humanControl: "User edits and sends outside oXRM, then records the real outcome as an event.",
        riskLevel: "medium",
        status: "active"
      }
    },
    {
      objectType: "action_blueprint",
      externalKey: "job-search:blueprint:summarize-ledger",
      displayName: "Summarize relationship and communication ledger",
      fields: {
        title: "Summarize relationship and communication ledger",
        templateKey: "job_search",
        appliesToViewKey: "job_search.applications,job_search.interviews,job_search.referrals",
        appliesToObjectType: "application,interview,referral",
        trigger: "Before call, follow-up, or status review",
        automationLevel: "manual",
        approvalRequired: "Not required; read-only summary",
        inputs: "Timeline events, tasks, contacts, documents, referrals, interviews, and linked job fit records.",
        outputs: "Short context summary, unresolved commitments, suggested talking points, and missing data warnings.",
        humanControl: "User decides what context is useful and whether to create notes or tasks.",
        riskLevel: "low",
        status: "active"
      }
    },
    {
      objectType: "action_suggestion",
      externalKey: "job-search:suggestion:signalworks-follow-up",
      displayName: "Follow up on SignalWorks referral status",
      fields: {
        title: "Follow up on SignalWorks referral status",
        templateKey: "job_search",
        targetViewKey: "job_search.applications",
        targetObjectType: "application",
        targetRecord: "Senior Platform Engineer at SignalWorks",
        status: "approval_required",
        priority: 3,
        confidence: 91,
        recommendedAction: "Send a concise intro-call prep note and ask whether Maya can confirm referral status.",
        reason: "The fit is 92%, the intro is scheduled, and the communication ledger shows the referral status is still open.",
        draftOutput: "Hi Maya - I prepared a short platform-systems summary for the intro call and wanted to check whether the referral status is already visible on your side.",
        approvalRequired: "Human must review and send externally",
        dueAt: "2026-06-19T09:00:00.000Z"
      }
    },
    {
      objectType: "action_suggestion",
      externalKey: "job-search:suggestion:northstar-follow-up",
      displayName: "Draft Northstar follow-up",
      fields: {
        title: "Draft Northstar follow-up",
        templateKey: "job_search",
        targetViewKey: "job_search.followups_due",
        targetObjectType: "application",
        targetRecord: "AI Tools Engineer at Northstar Labs",
        status: "proposed",
        priority: 2,
        confidence: 86,
        recommendedAction: "Draft a polite reply check with one concrete agent workflow example.",
        reason: "The application is in applied phase, the follow-up date is due, and the job fit record says agent workflow examples are the strongest hook.",
        draftOutput: "Hi Jonas - quick follow-up on my AI Tools application. One relevant example: I built local agent workflows with approval gates so drafts can be prepared without sending automatically.",
        approvalRequired: "Human must review and send externally",
        dueAt: "2026-06-20T08:30:00.000Z"
      }
    },
    {
      objectType: "action_suggestion",
      externalKey: "job-search:suggestion:atlas-application-packet",
      displayName: "Review Atlas before applying",
      fields: {
        title: "Review Atlas before applying",
        templateKey: "job_search",
        targetViewKey: "job_search.jobs",
        targetObjectType: "job",
        targetRecord: "Health Platform Lead",
        status: "needs_human_decision",
        priority: 2,
        confidence: 74,
        recommendedAction: "Review the full job description and decide whether the healthcare-platform CV draft is strong enough to apply.",
        reason: "The fit is moderate and the missing-skills section flags regulated-data experience as the main risk.",
        draftOutput: "Suggested application angle: reliability, auditability, scheduling workflows, and careful handling of sensitive operational data.",
        approvalRequired: "Human must decide apply or archive",
        dueAt: "2026-06-19T15:00:00.000Z"
      }
    },
    {
      objectType: "action_suggestion",
      externalKey: "job-search:suggestion:loombridge-wait",
      displayName: "Wait for Loombridge referral reply",
      fields: {
        title: "Wait for Loombridge referral reply",
        templateKey: "job_search",
        targetViewKey: "job_search.waiting_for_reply",
        targetObjectType: "application",
        targetRecord: "Founding Backend Engineer at Loombridge",
        status: "scheduled",
        priority: 1,
        confidence: 82,
        recommendedAction: "Do not send more yet. If Elena replies positively, send the founding-backend CV context.",
        reason: "Warm intro matters more than cold outreach and the last outbound message is recent.",
        draftOutput: "Prepared context: product-minded backend ownership, customer discovery, and fast iteration in workflow systems.",
        approvalRequired: "Human must confirm before sending CV context",
        dueAt: "2026-06-21T10:00:00.000Z"
      }
    },
    {
      objectType: "action_run",
      externalKey: "job-search:run:fit-scoring-2026-06-18",
      displayName: "Fit scoring run - 2026-06-18",
      fields: {
        title: "Fit scoring run - 2026-06-18",
        templateKey: "job_search",
        status: "completed",
        mode: "dry_run",
        blueprint: "Rate job fit and explain tradeoffs",
        startedAt: "2026-06-18T06:55:00.000Z",
        finishedAt: "2026-06-18T07:00:00.000Z",
        inputSummary: "Scored five synthetic postings against the operator-engineering CV template.",
        outputSummary: "Created five job fit records and three actionable suggestions. No external action was taken.",
        auditRef: ".data/files/runs/job-search/fit-scoring-2026-06-18.json"
      }
    },
    {
      objectType: "action_run",
      externalKey: "job-search:run:atlas-packet-draft",
      displayName: "Atlas application packet draft run",
      fields: {
        title: "Atlas application packet draft run",
        templateKey: "job_search",
        status: "completed",
        mode: "draft_only",
        blueprint: "Create tailored application packet",
        startedAt: "2026-06-18T08:00:00.000Z",
        finishedAt: "2026-06-18T08:05:00.000Z",
        inputSummary: "Used the Atlas posting, job fit notes, original CV template, and cover letter template.",
        outputSummary: "Created Healthcare Platform CV draft and Atlas cover letter draft. Human review still required.",
        auditRef: ".data/files/runs/job-search/atlas-packet-draft.json"
      }
    },
    {
      objectType: "approval_request",
      externalKey: "job-search:approval:signalworks-follow-up",
      displayName: "Approve SignalWorks follow-up",
      fields: {
        title: "Approve SignalWorks follow-up",
        templateKey: "job_search",
        status: "pending",
        requestedAction: "Review, edit, and externally send the SignalWorks referral follow-up if correct.",
        decision: "",
        owner: "Human operator",
        requestedAt: "2026-06-19T08:45:00.000Z",
        decidedAt: ""
      }
    },
    {
      objectType: "approval_request",
      externalKey: "job-search:approval:atlas-apply",
      displayName: "Decide whether to apply to Atlas Health",
      fields: {
        title: "Decide whether to apply to Atlas Health",
        templateKey: "job_search",
        status: "pending",
        requestedAction: "Open the posting and fit notes, then approve application packet review or archive the role.",
        decision: "",
        owner: "Human operator",
        requestedAt: "2026-06-18T08:10:00.000Z",
        decidedAt: ""
      }
    }
  ];

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

  const fileSeeds = [
    {
      recordExternalKey: "job-search:cv-template:operator-engineering",
      kind: "document",
      title: "Operator engineering CV template source",
      path: ".data/files/templates/cv/operator-engineering.md",
      mimeType: "text/markdown"
    },
    {
      recordExternalKey: "job-search:cover-template:short-context",
      kind: "document",
      title: "Short context cover letter template source",
      path: ".data/files/templates/cover-letter/short-context.md",
      mimeType: "text/markdown"
    },
    {
      recordExternalKey: "job-search:cv:health-platform-draft",
      kind: "draft",
      title: "Healthcare platform CV draft source",
      path: ".data/files/records/job-search/cv-health-platform-draft-v1.md",
      mimeType: "text/markdown"
    },
    {
      recordExternalKey: "job-search:cv:platform-v3",
      kind: "document",
      title: "Backend platform CV source",
      path: ".data/files/records/job-search/cv-backend-platform-v3.md",
      mimeType: "text/markdown"
    },
    {
      recordExternalKey: "job-search:job:platform-engineer",
      kind: "raw_source",
      title: "SignalWorks job description",
      path: ".data/files/records/job-search/job-platform-engineer/job-description.md",
      mimeType: "text/markdown"
    },
    {
      recordExternalKey: "job-search:application:signalworks-platform",
      kind: "document",
      title: "Backend Platform CV v3",
      path: ".data/files/records/job-search/application-signalworks-platform/cv-backend-platform-v3.pdf",
      mimeType: "application/pdf"
    },
    {
      recordExternalKey: "job-search:application:signalworks-platform",
      kind: "draft",
      title: "SignalWorks cover letter v1",
      path: ".data/files/records/job-search/application-signalworks-platform/cover-letter-signalworks-v1.md",
      mimeType: "text/markdown"
    },
    {
      recordExternalKey: "job-search:application:northstar-ai-tools",
      kind: "draft",
      title: "Northstar follow-up draft",
      path: ".data/files/records/job-search/application-northstar-ai-tools/follow-up-draft.md",
      mimeType: "text/markdown"
    }
  ];

  for (const file of fileSeeds) {
    const record = recordByExternalKey.get(file.recordExternalKey);
    if (!record) {
      continue;
    }
    await db
      .insert(xrmFiles)
      .values({
        recordId: record.id,
        kind: file.kind,
        title: file.title,
        path: file.path,
        mimeType: file.mimeType,
        metadata: { source: "seed", storage: "local_file" }
      })
      .onConflictDoUpdate({
        target: [xrmFiles.recordId, xrmFiles.path],
        set: {
          kind: file.kind,
          title: file.title,
          mimeType: file.mimeType,
          metadata: { source: "seed", storage: "local_file" },
          updatedAt: new Date()
        }
      });
  }

  const syntheticRelationships = [
    ["job_contact_works_at", "job-search:contact:maya-erdem", "job-search:company:signalworks"],
    ["job_contact_works_at", "job-search:contact:jonas-keller", "job-search:company:northstar-labs"],
    ["job_contact_works_at", "job-search:contact:rita-shah", "job-search:company:atlas-health"],
    ["job_contact_works_at", "job-search:contact:elena-moro", "job-search:company:loombridge"],
    ["job_belongs_to_company", "job-search:job:platform-engineer", "job-search:company:signalworks"],
    ["job_belongs_to_company", "job-search:job:ai-tools-engineer", "job-search:company:northstar-labs"],
    ["job_belongs_to_company", "job-search:job:health-platform-lead", "job-search:company:atlas-health"],
    ["job_belongs_to_company", "job-search:job:founding-backend", "job-search:company:loombridge"],
    ["job_belongs_to_company", "job-search:job:infra-engineer", "job-search:company:kerneldesk"],
    ["job_belongs_to_company", "job-search:job:papertrail-devex", "job-search:company:papertrail-systems"],
    ["job_belongs_to_company", "job-search:job:quartzflow-automation", "job-search:company:quartzflow"],
    ["job_alert_matches_job", "job-search:alert:northstar-ai-tools", "job-search:job:ai-tools-engineer"],
    ["job_alert_matches_job", "job-search:alert:atlas-health-platform", "job-search:job:health-platform-lead"],
    ["job_fit_evaluates_job", "job-search:fit:signalworks-platform", "job-search:job:platform-engineer"],
    ["job_fit_evaluates_job", "job-search:fit:northstar-ai-tools", "job-search:job:ai-tools-engineer"],
    ["job_fit_evaluates_job", "job-search:fit:atlas-health-platform", "job-search:job:health-platform-lead"],
    ["job_fit_evaluates_job", "job-search:fit:loombridge-founding-backend", "job-search:job:founding-backend"],
    ["job_fit_evaluates_job", "job-search:fit:kerneldesk-infra", "job-search:job:infra-engineer"],
    ["job_fit_evaluates_job", "job-search:fit:papertrail-devex", "job-search:job:papertrail-devex"],
    ["job_fit_evaluates_job", "job-search:fit:quartzflow-automation", "job-search:job:quartzflow-automation"],
    ["application_targets_job", "job-search:application:signalworks-platform", "job-search:job:platform-engineer"],
    ["application_targets_job", "job-search:application:northstar-ai-tools", "job-search:job:ai-tools-engineer"],
    ["application_targets_job", "job-search:application:atlas-health-platform", "job-search:job:health-platform-lead"],
    ["application_targets_job", "job-search:application:loombridge-founding-backend", "job-search:job:founding-backend"],
    ["application_targets_job", "job-search:application:kerneldesk-infra", "job-search:job:infra-engineer"],
    ["application_has_fit", "job-search:application:signalworks-platform", "job-search:fit:signalworks-platform"],
    ["application_has_fit", "job-search:application:northstar-ai-tools", "job-search:fit:northstar-ai-tools"],
    ["application_has_fit", "job-search:application:atlas-health-platform", "job-search:fit:atlas-health-platform"],
    ["application_has_fit", "job-search:application:loombridge-founding-backend", "job-search:fit:loombridge-founding-backend"],
    ["application_has_fit", "job-search:application:kerneldesk-infra", "job-search:fit:kerneldesk-infra"],
    ["application_has_contact", "job-search:application:signalworks-platform", "job-search:contact:maya-erdem"],
    ["application_has_contact", "job-search:application:northstar-ai-tools", "job-search:contact:jonas-keller"],
    ["application_has_contact", "job-search:application:atlas-health-platform", "job-search:contact:rita-shah"],
    ["application_has_contact", "job-search:application:loombridge-founding-backend", "job-search:contact:elena-moro"],
    ["application_uses_cv", "job-search:application:signalworks-platform", "job-search:cv:platform-v3"],
    ["application_uses_cv", "job-search:application:northstar-ai-tools", "job-search:cv:ai-tools-v2"],
    ["application_uses_cv", "job-search:application:atlas-health-platform", "job-search:cv:health-platform-draft"],
    ["application_uses_cv", "job-search:application:loombridge-founding-backend", "job-search:cv:founding-backend-draft"],
    ["application_uses_cv", "job-search:application:kerneldesk-infra", "job-search:cv:platform-v3"],
    ["cv_derived_from_template", "job-search:cv:platform-v3", "job-search:cv-template:operator-engineering"],
    ["cv_derived_from_template", "job-search:cv:ai-tools-v2", "job-search:cv-template:operator-engineering"],
    ["cv_derived_from_template", "job-search:cv:health-platform-draft", "job-search:cv-template:operator-engineering"],
    ["cv_derived_from_template", "job-search:cv:founding-backend-draft", "job-search:cv-template:operator-engineering"],
    ["application_uses_cover_letter", "job-search:application:signalworks-platform", "job-search:cover:signalworks"],
    ["application_uses_cover_letter", "job-search:application:northstar-ai-tools", "job-search:cover:northstar"],
    ["application_uses_cover_letter", "job-search:application:atlas-health-platform", "job-search:cover:atlas-draft"],
    ["application_uses_cover_letter", "job-search:application:loombridge-founding-backend", "job-search:cover:loombridge-draft"],
    ["cover_letter_derived_from_template", "job-search:cover:signalworks", "job-search:cover-template:short-context"],
    ["cover_letter_derived_from_template", "job-search:cover:northstar", "job-search:cover-template:short-context"],
    ["cover_letter_derived_from_template", "job-search:cover:atlas-draft", "job-search:cover-template:short-context"],
    ["cover_letter_derived_from_template", "job-search:cover:loombridge-draft", "job-search:cover-template:short-context"],
    ["referral_supports_application", "job-search:referral:maya-erdem", "job-search:application:signalworks-platform"],
    ["referral_supports_application", "job-search:referral:elena-moro", "job-search:application:loombridge-founding-backend"],
    ["interview_belongs_to_application", "job-search:interview:signalworks-intro", "job-search:application:signalworks-platform"],
    ["document_attached_to_application", "job-search:document:platform-resume", "job-search:application:signalworks-platform"],
    ["suggestion_from_blueprint", "job-search:suggestion:signalworks-follow-up", "job-search:blueprint:follow-up"],
    ["suggestion_from_blueprint", "job-search:suggestion:northstar-follow-up", "job-search:blueprint:follow-up"],
    ["suggestion_from_blueprint", "job-search:suggestion:atlas-application-packet", "job-search:blueprint:create-application-packet"],
    ["suggestion_from_blueprint", "job-search:suggestion:loombridge-wait", "job-search:blueprint:follow-up"],
    ["suggestion_for_application", "job-search:suggestion:signalworks-follow-up", "job-search:application:signalworks-platform"],
    ["suggestion_for_application", "job-search:suggestion:northstar-follow-up", "job-search:application:northstar-ai-tools"],
    ["suggestion_for_job", "job-search:suggestion:atlas-application-packet", "job-search:job:health-platform-lead"],
    ["suggestion_for_application", "job-search:suggestion:loombridge-wait", "job-search:application:loombridge-founding-backend"],
    ["run_for_blueprint", "job-search:run:fit-scoring-2026-06-18", "job-search:blueprint:rate-fit"],
    ["run_for_blueprint", "job-search:run:atlas-packet-draft", "job-search:blueprint:create-application-packet"],
    ["run_for_suggestion", "job-search:run:atlas-packet-draft", "job-search:suggestion:atlas-application-packet"],
    ["approval_for_suggestion", "job-search:approval:signalworks-follow-up", "job-search:suggestion:signalworks-follow-up"],
    ["approval_for_suggestion", "job-search:approval:atlas-apply", "job-search:suggestion:atlas-application-packet"]
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

  const jobSearchTasks = [
    {
      applicationKey: "job-search:application:signalworks-platform",
      key: "job-search:follow-up:signalworks-platform",
      title: "Send SignalWorks intro-call prep and referral follow-up",
      description: "Prepare talking points, confirm referral status, and send any missing materials.",
      dueAt: "2026-06-19T09:00:00.000Z",
      priority: 2
    },
    {
      applicationKey: "job-search:application:northstar-ai-tools",
      key: "job-search:follow-up:northstar-ai-tools",
      title: "Follow up with Jonas at Northstar Labs",
      description: "Draft a short reply check mentioning the AI tools CV and one relevant agent workflow project.",
      dueAt: "2026-06-20T08:30:00.000Z",
      priority: 1
    },
    {
      applicationKey: "job-search:application:atlas-health-platform",
      key: "job-search:review:atlas-health-platform",
      title: "Review Atlas Health job alert and tailor application",
      description: "Read the job description, decide whether to apply, and prepare a tailored CV/cover letter draft.",
      dueAt: "2026-06-19T15:00:00.000Z",
      priority: 2
    },
    {
      applicationKey: "job-search:application:loombridge-founding-backend",
      key: "job-search:follow-up:loombridge-referral",
      title: "Check Loombridge referral with Elena",
      description: "If Elena has replied, send CV context. Otherwise wait until the planned follow-up date.",
      dueAt: "2026-06-21T10:00:00.000Z",
      priority: 1
    }
  ];

  for (const task of jobSearchTasks) {
    const application = recordByExternalKey.get(task.applicationKey);
    if (!application) {
      continue;
    }
    const existingTask = await db.query.tasks.findFirst({ where: eq(tasks.idempotencyKey, task.key) });
    const values = {
      title: task.title,
      description: task.description,
      type: "follow_up" as const,
      status: "open" as const,
      priority: task.priority,
      dueAt: new Date(task.dueAt),
      xrmRecordId: application.id,
      idempotencyKey: task.key
    };
    if (existingTask) {
      await db.update(tasks).set({ ...values, updatedAt: new Date() }).where(eq(tasks.id, existingTask.id));
    } else {
      await db.insert(tasks).values(values);
    }
  }

  const jobSearchApprovalTasks = [
    {
      recordKey: "job-search:approval:signalworks-follow-up",
      key: "job-search:approval-task:signalworks-follow-up",
      title: "Approve SignalWorks follow-up draft",
      description: "Review the agent-suggested message before sending anything outside oXRM.",
      dueAt: "2026-06-19T09:00:00.000Z",
      priority: 3
    },
    {
      recordKey: "job-search:approval:atlas-apply",
      key: "job-search:approval-task:atlas-apply",
      title: "Approve or reject Atlas Health application packet",
      description: "Inspect the fit notes, CV draft, and cover letter draft before applying or archiving.",
      dueAt: "2026-06-19T15:00:00.000Z",
      priority: 2
    }
  ];

  for (const task of jobSearchApprovalTasks) {
    const record = recordByExternalKey.get(task.recordKey);
    if (!record) {
      continue;
    }
    const existingTask = await db.query.tasks.findFirst({ where: eq(tasks.idempotencyKey, task.key) });
    const values = {
      title: task.title,
      description: task.description,
      type: "approval" as const,
      status: "open" as const,
      priority: task.priority,
      dueAt: new Date(task.dueAt),
      xrmRecordId: record.id,
      idempotencyKey: task.key,
      metadata: { templateKey: "job_search", source: "agent_suggestion" }
    };
    if (existingTask) {
      await db.update(tasks).set({ ...values, updatedAt: new Date() }).where(eq(tasks.id, existingTask.id));
    } else {
      await db.insert(tasks).values(values);
    }
  }

  const jobSearchEvents = [
    {
      applicationKey: "job-search:application:signalworks-platform",
      key: "job-search:event:signalworks-application-created",
      type: "email_sent" as const,
      channel: "email" as const,
      direction: "outbound" as const,
      subject: "Application submitted with platform CV",
      body: "Sent Backend Platform CV v3 and a tailored SignalWorks cover letter to Maya Erdem.",
      occurredAt: "2026-06-10T09:00:00.000Z",
      metadata: { templateKey: "job_search", stage: "applied", cvVersion: "Backend Platform v3" }
    },
    {
      applicationKey: "job-search:application:signalworks-platform",
      key: "job-search:event:signalworks-fit-scored",
      type: "manual_note" as const,
      channel: "manual" as const,
      direction: "internal" as const,
      subject: "Job fit scored at 92%",
      body: "Fit review: strong platform/backend match. Use Backend Platform CV v3 and SignalWorks cover letter.",
      occurredAt: "2026-06-10T08:20:00.000Z",
      metadata: { templateKey: "job_search", stage: "fit_review", fitRate: 92 }
    },
    {
      applicationKey: "job-search:application:signalworks-platform",
      key: "job-search:event:signalworks-intro-scheduled",
      type: "meeting_booked" as const,
      channel: "scheduler" as const,
      direction: "internal" as const,
      subject: "Intro call scheduled",
      body: "Maya suggested a 30 minute intro call. Prep should focus on event-driven workflow systems.",
      occurredAt: "2026-06-16T14:20:00.000Z",
      metadata: { templateKey: "job_search", stage: "contacted" }
    },
    {
      applicationKey: "job-search:application:northstar-ai-tools",
      key: "job-search:event:northstar-cv-sent",
      type: "email_sent" as const,
      channel: "email" as const,
      direction: "outbound" as const,
      subject: "CV sent to Northstar Labs",
      body: "Sent AI Tools CV v2 and cover letter to Jonas Keller. Waiting for recruiter reply.",
      occurredAt: "2026-06-13T11:30:00.000Z",
      metadata: { templateKey: "job_search", stage: "applied", cvVersion: "AI Tools v2" }
    },
    {
      applicationKey: "job-search:application:atlas-health-platform",
      key: "job-search:event:atlas-alert-received",
      type: "manual_note" as const,
      channel: "manual" as const,
      direction: "internal" as const,
      subject: "Job alert saved",
      body: "Wellfound alert looks relevant but needs review for healthcare compliance and platform leadership fit.",
      occurredAt: "2026-06-18T06:40:00.000Z",
      metadata: { templateKey: "job_search", stage: "fit_review", alertSource: "Wellfound" }
    },
    {
      applicationKey: "job-search:application:atlas-health-platform",
      key: "job-search:event:atlas-drafts-created",
      type: "manual_note" as const,
      channel: "manual" as const,
      direction: "internal" as const,
      subject: "Draft CV and cover letter created",
      body: "Derived Healthcare Platform CV draft and Atlas Health cover letter from the original templates. Human review still required before applying.",
      occurredAt: "2026-06-18T08:05:00.000Z",
      metadata: { templateKey: "job_search", stage: "drafting", cvVersion: "Healthcare Platform Draft v1", coverLetterVersion: "Atlas Health Draft v1" }
    },
    {
      applicationKey: "job-search:application:loombridge-founding-backend",
      key: "job-search:event:loombridge-referral-requested",
      type: "message_sent" as const,
      channel: "email" as const,
      direction: "outbound" as const,
      subject: "Referral requested from Elena",
      body: "Asked Elena whether Loombridge is still hiring and whether she is comfortable making an intro.",
      occurredAt: "2026-06-17T16:10:00.000Z",
      metadata: { templateKey: "job_search", stage: "contacted" }
    },
    {
      applicationKey: "job-search:application:kerneldesk-infra",
      key: "job-search:event:kerneldesk-rejected",
      type: "email_received" as const,
      channel: "email" as const,
      direction: "inbound" as const,
      subject: "KernelDesk rejection received",
      body: "Recruiter said the role required deeper Terraform/Kubernetes specialization. Archived with lesson note.",
      occurredAt: "2026-06-15T08:45:00.000Z",
      metadata: { templateKey: "job_search", stage: "rejected", lesson: "Target backend/platform roles over pure infrastructure." }
    }
  ];

  for (const event of jobSearchEvents) {
    const application = recordByExternalKey.get(event.applicationKey);
    if (!application) {
      continue;
    }
    const existingActivity = await db.query.activities.findFirst({ where: eq(activities.idempotencyKey, event.key) });
    const values = {
      xrmRecordId: application.id,
      type: event.type,
      channel: event.channel,
      direction: event.direction,
      subject: event.subject,
      body: event.body,
      idempotencyKey: event.key,
      occurredAt: new Date(event.occurredAt),
      metadata: event.metadata
    };
    if (existingActivity) {
      await db.update(activities).set(values).where(eq(activities.id, existingActivity.id));
    } else {
      await db.insert(activities).values(values);
    }
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
        demoScenario: process.env.OXRM_INTERNAL_DEMO_SCENARIO ?? "none",
        syntheticRecords: createdSyntheticRecords
      },
      null,
      2
    )
  );
} finally {
  await queryClient.end();
}
