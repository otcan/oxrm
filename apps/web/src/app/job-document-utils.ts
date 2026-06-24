import type { XrmRecord } from "./models";

export function nextJobCoverLetterDraft(records: XrmRecord[], jobId: string, uniqueId = crypto.randomUUID()) {
  const versions = records
    .filter((record) => record.fields?.["jobId"] === jobId || record.metadata?.["jobId"] === jobId)
    .map((record) => /^v(\d+)(?:-draft)?$/i.exec(String(record.fields?.["version"] ?? "")))
    .map((match) => Number(match?.[1] ?? 0));
  const number = Math.max(0, ...versions) + 1;
  return {
    number,
    version: `v${number}-draft`,
    externalKey: `web:job-cover-letter-draft:${jobId}:${uniqueId}`
  };
}
