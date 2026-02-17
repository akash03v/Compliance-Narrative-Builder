import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, decimal, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  accountNumber: varchar("account_number", { length: 50 }).notNull(),
  riskLevel: text("risk_level").notNull().default("low"),
  countryOfResidence: text("country_of_residence"),
  occupation: text("occupation"),
  accountOpenDate: timestamp("account_open_date"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  transactionId: varchar("transaction_id", { length: 50 }).notNull().unique(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  transactionType: text("transaction_type").notNull(),
  direction: text("direction").notNull(),
  counterparty: text("counterparty"),
  counterpartyCountry: text("counterparty_country"),
  description: text("description"),
  transactionDate: timestamp("transaction_date").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  ruleName: text("rule_name").notNull(),
  ruleDescription: text("rule_description"),
  riskScore: integer("risk_score").notNull(),
  triggeredAt: timestamp("triggered_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const sars = pgTable("sars", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  version: integer("version").notNull().default(1),
  generatedBy: text("generated_by").notNull().default("AI"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const sarSections = pgTable("sar_sections", {
  id: serial("id").primaryKey(),
  sarId: integer("sar_id").notNull().references(() => sars.id, { onDelete: "cascade" }),
  sectionType: text("section_type").notNull(),
  content: text("content").notNull(),
  confidenceLevel: text("confidence_level").notNull().default("medium"),
  sequence: integer("sequence").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const sarSentences = pgTable("sar_sentences", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => sarSections.id, { onDelete: "cascade" }),
  sentenceText: text("sentence_text").notNull(),
  confidenceLevel: text("confidence_level").notNull().default("medium"),
  supportingTransactionIds: jsonb("supporting_transaction_ids").notNull().default([]),
  supportingRules: jsonb("supporting_rules").notNull().default([]),
  sequence: integer("sequence").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  sarId: integer("sar_id").notNull().references(() => sars.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().default("system"),
  action: text("action").notNull(),
  fieldChanged: text("field_changed"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  reason: text("reason"),
  timestamp: timestamp("timestamp").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const sarVersions = pgTable("sar_versions", {
  id: serial("id").primaryKey(),
  sarId: integer("sar_id").notNull().references(() => sars.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  snapshotData: jsonb("snapshot_data").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const customersRelations = relations(customers, ({ many }) => ({
  transactions: many(transactions),
  sars: many(sars),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  customer: one(customers, {
    fields: [transactions.customerId],
    references: [customers.id],
  }),
  alerts: many(alerts),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  transaction: one(transactions, {
    fields: [alerts.transactionId],
    references: [transactions.id],
  }),
}));

export const sarsRelations = relations(sars, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sars.customerId],
    references: [customers.id],
  }),
  sections: many(sarSections),
  auditLogs: many(auditLogs),
  versions: many(sarVersions),
}));

export const sarSectionsRelations = relations(sarSections, ({ one, many }) => ({
  sar: one(sars, {
    fields: [sarSections.sarId],
    references: [sars.id],
  }),
  sentences: many(sarSentences),
}));

export const sarSentencesRelations = relations(sarSentences, ({ one }) => ({
  section: one(sarSections, {
    fields: [sarSentences.sectionId],
    references: [sarSections.id],
  }),
}));

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, triggeredAt: true });
export const insertSarSchema = createInsertSchema(sars).omit({ id: true, createdAt: true, updatedAt: true, version: true });
export const insertSarSectionSchema = createInsertSchema(sarSections).omit({ id: true, createdAt: true });
export const insertSarSentenceSchema = createInsertSchema(sarSentences).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });
export const insertSarVersionSchema = createInsertSchema(sarVersions).omit({ id: true, createdAt: true });

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Sar = typeof sars.$inferSelect;
export type InsertSar = z.infer<typeof insertSarSchema>;
export type SarSection = typeof sarSections.$inferSelect;
export type InsertSarSection = z.infer<typeof insertSarSectionSchema>;
export type SarSentence = typeof sarSentences.$inferSelect;
export type InsertSarSentence = z.infer<typeof insertSarSentenceSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type SarVersion = typeof sarVersions.$inferSelect;
export type InsertSarVersion = z.infer<typeof insertSarVersionSchema>;

export type CreateSarRequest = z.infer<typeof insertSarSchema>;
export type UpdateSarSectionRequest = Partial<Omit<InsertSarSection, "sarId" | "sequence">>;
export type CreateAuditLogRequest = z.infer<typeof insertAuditLogSchema>;

export type SarWithDetails = Sar & {
  customer: Customer;
  sections: (SarSection & {
    sentences: SarSentence[];
  })[];
  auditLogs: AuditLog[];
};

export type DataUploadRequest = {
  customers?: InsertCustomer[];
  transactions?: InsertTransaction[];
  alerts?: InsertAlert[];
};

export type RiskScoreResult = {
  customerId: number;
  totalRiskScore: number;
  triggeredRules: string[];
  flaggedTransactions: number[];
};

export type GenerateSarRequest = {
  customerId: number;
  includeTransactionIds?: number[];
};

export type SarComparisonResponse = {
  currentVersion: number;
  previousVersion: number;
  changes: {
    sectionType: string;
    type: "added" | "removed" | "modified";
    oldContent?: string;
    newContent?: string;
  }[];
};

export * from "./models/chat";
