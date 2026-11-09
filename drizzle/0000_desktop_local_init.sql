CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"customer_type" text DEFAULT 'عادي' NOT NULL,
	"balance" numeric(14, 3) DEFAULT 0 NOT NULL,
	"opening_balance" numeric(14, 3) DEFAULT 0 NOT NULL,
	"installment_enabled" boolean DEFAULT false NOT NULL,
	"installment_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"product_id" integer,
	"product_code" text DEFAULT '' NOT NULL,
	"product_name" text NOT NULL,
	"barcode" text DEFAULT '' NOT NULL,
	"unit" text DEFAULT 'قطعة' NOT NULL,
	"quantity" numeric(14, 3) DEFAULT 0 NOT NULL,
	"price" numeric(14, 3) DEFAULT 0 NOT NULL,
	"discount" numeric(14, 3) DEFAULT 0 NOT NULL,
	"total" numeric(14, 3) DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_no" text NOT NULL,
	"type" text DEFAULT 'sale' NOT NULL,
	"customer_id" integer,
	"customer_name" text DEFAULT 'عميل نقدي' NOT NULL,
	"payment_type" text DEFAULT 'نقدي' NOT NULL,
	"subtotal" numeric(14, 3) DEFAULT 0 NOT NULL,
	"discount" numeric(14, 3) DEFAULT 0 NOT NULL,
	"tax" numeric(14, 3) DEFAULT 0 NOT NULL,
	"total" numeric(14, 3) DEFAULT 0 NOT NULL,
	"paid" numeric(14, 3) DEFAULT 0 NOT NULL,
	"remaining" numeric(14, 3) DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'محفوظة' NOT NULL,
	"invoice_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_no_unique" UNIQUE("invoice_no")
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"amount" numeric(14, 3) DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"amount" numeric(14, 3) DEFAULT 0 NOT NULL,
	"method" text DEFAULT 'نقدي' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"group_name" text DEFAULT 'أدوات مدرسية' NOT NULL,
	"color" text DEFAULT '#1675c5' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "product_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#1675c5' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"barcode" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'عام' NOT NULL,
	"category_group" text DEFAULT 'أدوات مدرسية' NOT NULL,
	"unit" text DEFAULT 'قطعة' NOT NULL,
	"purchase_price" numeric(14, 3) DEFAULT 0 NOT NULL,
	"sale_price" numeric(14, 3) DEFAULT 0 NOT NULL,
	"quantity" numeric(14, 3) DEFAULT 0 NOT NULL,
	"min_quantity" numeric(14, 3) DEFAULT 0 NOT NULL,
	"tax_rate" numeric(14, 3) DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'جديدة' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;