CREATE TABLE "bouquets" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"state" jsonb NOT NULL,
	"schema_version" integer NOT NULL,
	"edit_token_hash" text NOT NULL,
	"secret_hash" text,
	"expires_at" timestamp with time zone,
	"reveal_at" timestamp with time zone,
	"one_time" boolean DEFAULT false NOT NULL,
	"allow_remix" boolean DEFAULT true NOT NULL,
	"read_receipt" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"snapshot" text,
	"opened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"bouquet_id" text NOT NULL,
	"blob_url" text NOT NULL,
	"kind" text NOT NULL,
	"content_type" text NOT NULL,
	"bytes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bouquet_id" text NOT NULL,
	"emoji" text NOT NULL,
	"reply" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_bouquet_id_bouquets_id_fk" FOREIGN KEY ("bouquet_id") REFERENCES "public"."bouquets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_bouquet_id_bouquets_id_fk" FOREIGN KEY ("bouquet_id") REFERENCES "public"."bouquets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bouquets_expires_at_idx" ON "bouquets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "media_bouquet_id_idx" ON "media" USING btree ("bouquet_id");--> statement-breakpoint
CREATE INDEX "reactions_bouquet_id_idx" ON "reactions" USING btree ("bouquet_id");