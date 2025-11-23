ALTER TABLE "deepfish_workflow_runs" ADD COLUMN "event_id" varchar(256);--> statement-breakpoint
ALTER TABLE "deepfish_workflows" ADD COLUMN "estimated_time_seconds" integer DEFAULT 100 NOT NULL;
