import assert from "node:assert/strict";

const baseUrl = process.env["OXRM_API_URL"] ?? "http://127.0.0.1:50695";
const runId = `smoke-${Date.now()}`;
const createdIds: string[] = [];

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(payload)}`);
  return payload as T;
}

async function cleanupStaleSmokeRecords() {
  for (const objectType of ["application", "cv_version", "cover_letter"]) {
    const records = await request<Array<{ id: string; externalKey?: string | null }>>(
      `/api/xrm/records?objectType=${objectType}&q=smoke-&includeDeleted=true&limit=500`
    );
    await Promise.all(
      records
        .filter((record) => record.externalKey?.startsWith("test:smoke-"))
        .map((record) => request(`/api/xrm/records/${record.id}`, { method: "DELETE" }))
    );
  }
}

async function create(objectType: string, displayName: string, fields: Record<string, unknown>, suffix: string) {
  const record = await request<{ id: string; fields: Record<string, unknown>; metadata?: Record<string, unknown> }>("/api/xrm/records", {
    method: "POST",
    body: JSON.stringify({ objectType, displayName, externalKey: `test:${runId}:${suffix}`, fields, source: "test", metadata: { smoke: true } })
  });
  createdIds.push(record.id);
  return record;
}

try {
  await cleanupStaleSmokeRecords();
  const application = await create("application", `Document smoke ${runId}`, { role: "Smoke", company: "Local" }, "application");
  const cv = await create("cv_version", `CV ${runId}`, { title: `CV ${runId}`, version: "v1" }, "cv");
  const cover1 = await create("cover_letter", `Cover ${runId} v1`, { title: `Cover ${runId} v1`, version: "v1-draft", body: "edited content" }, "cover-1");
  const cover2 = await create("cover_letter", `Cover ${runId} v2`, { title: `Cover ${runId} v2`, version: "v2-draft", body: "new content" }, "cover-2");
  assert.notEqual(cover1.id, cover2.id);
  assert.equal(cover1.fields["body"], "edited content");

  const withCv = await request<{ fields: Record<string, unknown>; sourceRelationships: Array<{ relationshipType?: { key?: string }; targetRecord?: { id?: string } }> }>(
    `/api/applications/${application.id}/document`,
    { method: "PUT", body: JSON.stringify({ kind: "cv", documentId: cv.id, source: "test" }) }
  );
  assert.equal(withCv.fields["cvVersion"], `CV ${runId}`);
  assert.equal(withCv.sourceRelationships.some((relationship) => relationship.relationshipType?.key === "application_uses_cv" && relationship.targetRecord?.id === cv.id), true);

  const withoutCv = await request<{ fields: Record<string, unknown>; sourceRelationships: Array<{ relationshipType?: { key?: string } }> }>(
    `/api/applications/${application.id}/document`,
    { method: "PUT", body: JSON.stringify({ kind: "cv", documentId: null, source: "test" }) }
  );
  assert.equal(withoutCv.fields["cvVersion"], "");
  assert.equal(withoutCv.sourceRelationships.some((relationship) => relationship.relationshipType?.key === "application_uses_cv"), false);

  const withCover = await request<{ fields: Record<string, unknown> }>(`/api/applications/${application.id}/document`, {
    method: "PUT",
    body: JSON.stringify({ kind: "cover_letter", documentId: cover2.id, source: "test" })
  });
  assert.equal(withCover.fields["coverLetterVersion"], `Cover ${runId} v2`);

  const withoutCover = await request<{ fields: Record<string, unknown> }>(`/api/applications/${application.id}/document`, {
    method: "PUT",
    body: JSON.stringify({ kind: "cover_letter", documentId: null, source: "test" })
  });
  assert.equal(withoutCover.fields["coverLetterVersion"], "");

  const defaultCv = await request<{ metadata: Record<string, unknown> }>("/api/xrm/records", {
    method: "POST",
    body: JSON.stringify({ objectType: "cv_version", recordId: cv.id, displayName: `CV ${runId}`, fields: cv.fields, metadata: { default: true }, source: "test" })
  });
  assert.equal(defaultCv.metadata["default"], true);
  console.log("document workflow live smoke passed");
} finally {
  await Promise.all(createdIds.map((id) => request(`/api/xrm/records/${id}`, { method: "DELETE" }).catch(() => null)));
}
