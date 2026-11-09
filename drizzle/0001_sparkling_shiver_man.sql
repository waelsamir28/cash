CREATE TABLE "inventory_count_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"count_id" integer NOT NULL,
	"product_id" integer,
	"product_code" text NOT NULL,
	"product_name" text NOT NULL,
	"system_quantity" numeric(14, 3) DEFAULT 0 NOT NULL,
	"counted_quantity" numeric(14, 3) DEFAULT 0 NOT NULL,
	"variance" numeric(14, 3) DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"count_no" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'جارية' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"total_scanned" integer DEFAULT 0 NOT NULL,
	"total_variance" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_counts_count_no_unique" UNIQUE("count_no")
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"product_code" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" numeric(14, 3) DEFAULT 0 NOT NULL,
	"purchase_price" numeric(14, 3) DEFAULT 0 NOT NULL,
	"total" numeric(14, 3) DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_no" text NOT NULL,
	"status" text DEFAULT 'مسودة' NOT NULL,
	"supplier_name" text DEFAULT 'المورد العام' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"total_cost" numeric(14, 3) DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_name" text NOT NULL,
	"role" text DEFAULT 'cashier' NOT NULL,
	"start_at" timestamp with time zone DEFAULT now() NOT NULL,
	"end_at" timestamp with time zone,
	"starting_cash" numeric(14, 3) DEFAULT 0 NOT NULL,
	"ending_cash" numeric(14, 3) DEFAULT 0 NOT NULL,
	"total_sales" numeric(14, 3) DEFAULT 0 NOT NULL,
	"total_purchases" numeric(14, 3) DEFAULT 0 NOT NULL,
	"sales_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'مفتوحة' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'cashier' NOT NULL,
	"password" text DEFAULT '1234' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_count_id_inventory_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;