import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { selectApplicationDocumentSchema } from "../packages/shared/src/index.ts";
import { nextJobCoverLetterDraft } from "../apps/web/src/app/job-document-utils.ts";
import type { XrmRecord } from "../apps/web/src/app/models.ts";

test("documents routes support direct navigation and legacy record redirects", async () => {
  const source = await readFile(new URL("../apps/web/src/app/app.routes.ts", import.meta.url), "utf8");
  assert.match(source, /path: "documents"/);
  assert.match(source, /path: "records\/cv_version", redirectTo: "documents"/);
  assert.match(source, /path: "records\/cover_letter", redirectTo: "documents"/);
});

test("job cover-letter generation always creates a new version and external key", () => {
  const jobId = "11111111-1111-4111-8111-111111111111";
  const records = [
    { id: "1", displayName: "Draft", fields: { jobId, version: "v1-draft", body: "edited" }, status: "active" }
  ] as XrmRecord[];
  const next = nextJobCoverLetterDraft(records, jobId, "unique-2");
  assert.equal(next.version, "v2-draft");
  assert.equal(next.externalKey, `web:job-cover-letter-draft:${jobId}:unique-2`);
  assert.equal(records[0]?.fields["body"], "edited");
});

test("document selection accepts record IDs and explicit unlinking", () => {
  const applicationId = "11111111-1111-4111-8111-111111111111";
  const documentId = "22222222-2222-4222-8222-222222222222";
  assert.equal(selectApplicationDocumentSchema.parse({ applicationId, kind: "cv", documentId }).documentId, documentId);
  assert.equal(selectApplicationDocumentSchema.parse({ applicationId, kind: "cover_letter", documentId: null }).documentId, null);
  assert.throws(() => selectApplicationDocumentSchema.parse({ applicationId, kind: "resume", documentId }));
});

test("the web client preserves null documentId for unlink requests", async () => {
  const source = await readFile(new URL("../apps/web/src/app/crm-api.service.ts", import.meta.url), "utf8");
  const method = source.slice(source.indexOf("async selectApplicationDocument"), source.indexOf("private async request"));
  assert.match(method, /body: JSON\.stringify\(body\)/);
  assert.doesNotMatch(method, /cleanPayload\(body\)/);
});

test("bodyless API requests do not advertise an empty JSON body", async () => {
  const source = await readFile(new URL("../apps/web/src/app/crm-api.service.ts", import.meta.url), "utf8");
  assert.match(source, /init\.body \? \{ "content-type": "application\/json" \} : \{\}/);
});

test("document dialogs expose focus trapping and unsaved-change protection", async () => {
  const [cvModal, coverModal, documentsPage] = await Promise.all([
    readFile(new URL("../apps/web/src/app/cv-library-modal.component.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/src/app/cover-letter-library-modal.component.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/src/app/job-documents-page.component.ts", import.meta.url), "utf8")
  ]);
  for (const source of [cvModal, coverModal]) {
    assert.match(source, /role="dialog"/);
    assert.match(source, /aria-modal="true"/);
    assert.match(source, /ocModalFocusTrap/);
    assert.match(source, /keydown\.escape/);
  }
  assert.match(documentsPage, /window:beforeunload/);
  assert.match(documentsPage, /Discard unsaved document changes/);
});
