import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("user").notNull(), // "user" | "admin"
  credits: integer("credits").default(20).notNull(), // Starting credits
  isVerified: boolean("is_verified").default(false).notNull(),
  otpCode: text("otp_code"),
  otpExpiry: timestamp("otp_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const creditPacks = pgTable("credit_packs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  credits: integer("credits").notNull(),
  price: integer("price").notNull(), // Price in INR
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  creditPackId: uuid("credit_pack_id").references(() => creditPacks.id),
  amount: integer("amount").notNull(), // Amount in INR
  credits: integer("credits").notNull(),
  razorpayOrderId: text("razorpay_order_id").notNull().unique(),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpaySignature: text("razorpay_signature"),
  status: text("status").default("pending").notNull(), // "pending" | "success" | "failed"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generations = pgTable("generations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // "image" | "video" | "image-to-video"
  prompt: text("prompt").notNull(),
  aspectRatio: text("aspect_ratio").notNull(),
  mediaUrl: text("media_url"),
  status: text("status").default("pending").notNull(), // "pending" | "completed" | "failed"
  creditsUsed: integer("credits_used").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
