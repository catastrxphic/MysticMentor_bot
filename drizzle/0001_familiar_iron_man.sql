CREATE TABLE "shop_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"xp_required" integer NOT NULL,
	"coins_required" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "shop_items_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "achievements" ALTER COLUMN "unlocked_at" SET DEFAULT '2025-02-23T19:40:24.938Z';--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "created_at" SET DEFAULT '2025-02-23T19:40:24.933Z';--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "updated_at" SET DEFAULT '2025-02-23T19:40:24.938Z';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "coins" SET NOT NULL;