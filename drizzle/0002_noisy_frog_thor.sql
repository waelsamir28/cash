CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'أخرى' NOT NULL,
	"amount" numeric(14, 3) DEFAULT 0 NOT NULL,
	"expense_date" timestamp with time zone DEFAULT now() NOT NULL,
	"payment_method" text DEFAULT 'نقدي' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "return_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_id" integer NOT NULL,
	"product_id" integer,
	"product_code" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" numeric(14, 3) DEFAULT 0 NOT NULL,
	"price" numeric(14, 3) DEFAULT 0 NOT NULL,
	"total" numeric(14, 3) DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_no" text NOT NULL,
	"type" text DEFAULT 'مرتجع مبيعات' NOT NULL,
	"original_invoice_id" integer,
	"original_invoice_no" text DEFAULT '' NOT NULL,
	"customer_id" integer,
	"customer_name" text DEFAULT 'عميل نقدي' NOT NULL,
	"total" numeric(14, 3) DEFAULT 0 NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'مكتمل' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "returns_return_no_unique" UNIQUE("return_no")
);
--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;