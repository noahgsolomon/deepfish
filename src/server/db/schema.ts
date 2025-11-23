import { SQL, sql } from "drizzle-orm";
import {
  AnyPgColumn,
  index,
  pgTableCreator,
  uniqueIndex,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const createTable = pgTableCreator((name) => `deepfish_${name}`);

export function lower(column: AnyPgColumn): SQL {
  return sql`lower(${column})`;
}

export const users = createTable(
  "users",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    firstName: d.varchar({ length: 256 }),
    lastName: d.varchar({ length: 256 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
    replicateApiKey: d.varchar("replicate_api_key", { length: 256 }),
    falApiKey: d.varchar("fal_api_key", { length: 256 }),
    subscribed: d.boolean().notNull().default(false),
    stripeCustomerId: d.varchar("stripe_customer_id", { length: 256 }),
    stripeSubscriptionId: d.varchar("stripe_subscription_id", { length: 256 }),
    stripePriceId: d.varchar("stripe_price_id", { length: 256 }),
    stripeCurrentPeriodEnd: d.timestamp("stripe_current_period_end", {
      mode: "date",
    }),
    isOver18: d.boolean("is_over_18").notNull().default(false),
    clerkId: d.text("clerk_id").notNull().unique(),
    email: d.text("email").notNull().unique(),
    apiKey: d.varchar("api_key", { length: 256 }),
    imageUrl: d.text("image_url"),
    beta: d.boolean().notNull().default(false),
    creditBalance: d.real("credit_balance").notNull().default(0),
    completedWalkthrough: d
      .boolean("completed_walkthrough")
      .notNull()
      .default(false),
    claimedFreeCredits: d
      .boolean("claimed_free_credits")
      .notNull()
      .default(false),
  }),
  (t) => [
    index("clerk_id_idx").on(t.clerkId),
    index("email_idx").on(t.email),
    index("api_key_idx").on(t.apiKey),
  ],
);

// Flow table schema matching the Rust SQLite schema
export const flows = createTable(
  "flows",
  (d) => ({
    id: d.text("id").primaryKey(), // Flow IDs are UUIDs/strings
    name: d.text("name").notNull(),
    data: d.text("data").notNull(), // JSON stored as text
    createdAt: d.bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: d.bigint("updated_at", { mode: "number" }).notNull(),
    emoji: d.text("emoji").notNull(),
    thumbnail: d.text("thumbnail"),
    nsfw: d.boolean("nsfw").notNull().default(false),
    userId: d
      .integer("user_id")
      .notNull()
      .references(() => users.id), // Add user association for multi-tenancy
    runs: d.integer("runs").notNull().default(0),
    isPublic: d.boolean("is_public").notNull().default(false),
    exampleOutputType: d.text("example_output_type"), // 'image' | 'video' | 'audio'
    exampleOutput: d.text("example_output"), // URL to the output
  }),
  (t) => [
    index("flows_user_idx").on(t.userId),
    index("flows_updated_idx").on(t.updatedAt),
    index("flows_public_idx").on(t.isPublic),
  ],
);

// Shape of the JSON stored in the `data` column of `workflows`
export interface WorkflowData {
  id?: number;
  title: string;
  description: string;
  avatar: string;
  runTime: string;
  installTime?: string;
  gpu?: string;
  outputType: string;
  imageSize?: string;
  imageName: string;
  image: string;
  version?: string;
  link?: string;
  price?: string;
  coldStart?: boolean;
  schema: any;
  deepFishOfficial?: boolean;
  group?: string;
  mode: string;
  provider?: string;
  download?: any[];
  inputTypes?: string[];
  inOutKey?: string;
  outputAssetSrc?: string | string[] | null;
  thumbnail?: string;
  runs?: number;
  featured?: boolean;
  result?: WorkflowResult;
  logs?: string[];
  shortTitle?: string;
  shortDescription?: string;
}

export const workflows = createTable(
  "workflows",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    title: d.varchar("title", { length: 256 }).notNull().unique(),
    data: d.json("data").$type<WorkflowData>().notNull(),
    runs: d.integer("runs").notNull().default(0),
    featured: d.boolean("featured").notNull().default(false),
    nsfw: d.boolean("nsfw").notNull().default(false),
    maxFreeRuns: d.integer("max_free_runs").notNull().default(1000),
    creditCost: d.real("credit_cost").notNull().default(1),
    keywords: d.text("keywords").notNull().default(""),
    pageTitle: d.varchar("page_title", { length: 256 }).notNull().default(""),
    estimatedTimeSeconds: d
      .integer("estimated_time_seconds")
      .notNull()
      .default(100),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [index("workflows_title_idx").on(t.title)],
);

export interface WorkflowResult {
  type?: string;
  outputPath?: string | string[];
  processingTime?: number;
}

export interface WorkflowInfo {
  id: number;
  title: string;
  shortTitle?: string;
  shortDescription?: string;
  description: string;
  avatar: string;
  runTime: string;
  installTime?: string;
  gpu?: string;
  outputType: string;
  imageSize?: string;
  imageName: string;
  image: string;
  version?: string;
  link?: string;
  price?: string;
  coldStart?: boolean;
  schema: any;
  logs?: string[];
  progress?: number;
  deepfishOfficial?: boolean;
  status?: "idle" | "processing" | "complete" | "error";
  group?: string;
  mode: "api" | "local" | "both";
  installed: boolean;
  provider?: string;
  inputs?: Record<string, any>;
  outputAssetSrc?: string | string[] | null;
  result?: WorkflowResult | null;
  inputTypes?: string[];
  inOutKey?: string;
  thumbnail?: string;
  runs?: number;
  keywords?: string;
  pageTitle?: string;
}

export const userWorkflows = createTable(
  "user_workflows",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .integer("user_id")
      .notNull()
      .references(() => users.id),
    title: d.varchar("title", { length: 256 }).notNull(),
    data: d.json("data").$type<WorkflowInfo>().notNull(),
    runs: d.integer("runs").notNull().default(0),
    nsfw: d.boolean("nsfw").notNull().default(false),
    creditCost: d.real("credit_cost").notNull().default(1),
    keywords: d.text("keywords").notNull().default(""),
    pageTitle: d.varchar("page_title", { length: 256 }).notNull().default(""),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("user_workflows_user_idx").on(t.userId),
    uniqueIndex("user_workflows_user_title_uidx").on(t.userId, t.title),
  ],
);

export const workflowRuns = createTable(
  "workflow_runs",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .integer("user_id")
      .notNull()
      .references(() => users.id),
    workflowId: d
      .integer("workflow_id")
      .notNull()
      .references(() => workflows.id),
    provider: d
      .varchar("provider", { length: 50 })
      .notNull()
      .default("replicate"),
    ranWithOurApiKey: d.boolean("ran_with_our_api_key").notNull().default(true),
    inputs: d.json("inputs").$type<Record<string, any>>(),
    inputHash: d.varchar("input_hash", { length: 64 }), // SHA-256 hash
    output: d.json("output").$type<any>(),
    status: d.varchar("status", { length: 50 }).notNull().default("pending"), // pending, running, completed, failed, cancelled
    error: d.text("error"),
    eventId: d.varchar("event_id", { length: 256 }), // Inngest event ID for tracking
    creditsCharged: d.real("credits_charged").notNull().default(0), // Track credits deducted for this run
    startedAt: d.timestamp("started_at", { withTimezone: true }),
    completedAt: d.timestamp("completed_at", { withTimezone: true }),
    ranAt: d
      .timestamp("ran_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    // Fields for history display
    archived: d.boolean("archived").notNull().default(false),
    displayName: d.varchar("display_name", { length: 256 }),
    thumbnailUrl: d.text("thumbnail_url"),
  }),
  (t) => [
    index("workflow_runs_user_idx").on(t.userId),
    index("workflow_runs_workflow_idx").on(t.workflowId),
    index("workflow_runs_ran_at_idx").on(t.ranAt),
    index("workflow_runs_hash_idx").on(t.inputHash),
    index("workflow_runs_status_idx").on(t.status),
    index("workflow_runs_archived_idx").on(t.archived),
  ],
);

export const gifts = createTable(
  "gifts",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    uuid: d
      .text("uuid")
      .notNull()
      .unique()
      .default(sql`gen_random_uuid()`),
    senderId: d
      .integer("sender_id")
      .notNull()
      .references(() => users.id),
    credits: d.integer("credits").notNull(),
    message: d.text("message"),
    imageUrl: d.text("image_url"),
    status: d
      .text("status", { enum: ["pending", "claimed", "canceled"] })
      .notNull()
      .default("pending"),
    claimed: d.boolean("claimed").notNull().default(false),
    claimedUserId: d.integer("claimed_user_id").references(() => users.id),
    claimedAt: d.timestamp("claimed_at", { withTimezone: true }),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("gifts_sender_idx").on(t.senderId),
    index("gifts_uuid_idx").on(t.uuid),
    index("gifts_status_idx").on(t.status),
    index("gifts_claimed_user_idx").on(t.claimedUserId),
  ],
);

// Relations
export const flowsRelations = relations(flows, ({ one }) => ({
  user: one(users, {
    fields: [flows.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  flows: many(flows),
  userWorkflows: many(userWorkflows),
  sentGifts: many(gifts, { relationName: "giftSender" }),
  claimedGifts: many(gifts, { relationName: "giftClaimer" }),
}));

export const workflowRunsRelations = relations(workflowRuns, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowRuns.workflowId],
    references: [workflows.id],
  }),
}));

export const userWorkflowsRelations = relations(userWorkflows, ({ one }) => ({
  user: one(users, {
    fields: [userWorkflows.userId],
    references: [users.id],
  }),
}));

export const giftsRelations = relations(gifts, ({ one }) => ({
  sender: one(users, {
    fields: [gifts.senderId],
    references: [users.id],
    relationName: "giftSender",
  }),
  claimedUser: one(users, {
    fields: [gifts.claimedUserId],
    references: [users.id],
    relationName: "giftClaimer",
  }),
}));
