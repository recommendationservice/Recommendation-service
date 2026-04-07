CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE SCHEMA "reco";
--> statement-breakpoint
CREATE TABLE "reco"."content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"type" text NOT NULL,
	"text_for_embedding" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(1536),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "reco"."events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"content_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"weight" smallint NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_type_check" CHECK ("reco"."events"."event_type" IN ('view', 'read', 'deep_read', 'like', 'share', 'dislike', 'bookmark'))
);
--> statement-breakpoint
CREATE TABLE "reco"."user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_user_id" text NOT NULL,
	"preference_vector" vector(1536),
	"total_weight" double precision DEFAULT 0 NOT NULL,
	"total_events" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_external_user_id_unique" UNIQUE("external_user_id")
);
--> statement-breakpoint
CREATE TABLE "reco"."view_history" (
	"user_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"view_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "view_history_user_id_content_id_pk" PRIMARY KEY("user_id","content_id")
);
--> statement-breakpoint
ALTER TABLE "reco"."events" ADD CONSTRAINT "events_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "reco"."content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reco"."view_history" ADD CONSTRAINT "view_history_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "reco"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reco"."view_history" ADD CONSTRAINT "view_history_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "reco"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_content_type_active" ON "reco"."content" USING btree ("type") WHERE "reco"."content"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_events_user" ON "reco"."events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_view_history_user" ON "reco"."view_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_content_embedding" ON "reco"."content" USING hnsw ("embedding" vector_cosine_ops);