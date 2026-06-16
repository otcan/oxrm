-- Manual migration note:
-- Adds template ownership metadata to saved views so templates can define default object views.
-- Existing view rows remain valid with a NULL template_key until seed refreshes bundled default views by key.
-- No legacy CRM rows or generic oXRM records are rewritten by this migration.
-- After applying, run the seed step to attach the outreach template key to bundled views and verify list/run view calls.
-- Rollback impact: dropping this column only removes template filtering for saved views; view definitions still exist.

ALTER TABLE "view_definitions" ADD COLUMN "template_key" text;--> statement-breakpoint
CREATE INDEX "view_definitions_template_idx" ON "view_definitions" USING btree ("template_key","object_type");
