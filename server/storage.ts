import { db } from "./db";
import {
  customers,
  transactions,
  alerts,
  sars,
  sarSections,
  sarSentences,
  auditLogs,
  sarVersions,
  type Customer,
  type Transaction,
  type Alert,
  type Sar,
  type SarSection,
  type SarSentence,
  type AuditLog,
  type SarVersion,
  type InsertCustomer,
  type InsertTransaction,
  type InsertAlert,
  type InsertSar,
  type InsertSarSection,
  type InsertSarSentence,
  type InsertAuditLog,
  type InsertSarVersion,
  type SarWithDetails,
} from "@shared/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { MockStorage } from "./mock-storage";

export interface IStorage {
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  createCustomers(customerList: InsertCustomer[]): Promise<Customer[]>;
  
  getTransactions(customerId?: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  createTransactions(transactionList: InsertTransaction[]): Promise<Transaction[]>;
  
  getAlerts(customerId?: number): Promise<Alert[]>;
  getAlertsByTransactionIds(transactionIds: number[]): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  createAlerts(alertList: InsertAlert[]): Promise<Alert[]>;
  
  getSars(): Promise<Sar[]>;
  getSar(id: number): Promise<Sar | undefined>;
  getSarWithDetails(id: number): Promise<SarWithDetails | undefined>;
  createSar(sar: InsertSar): Promise<Sar>;
  updateSar(id: number, updates: Partial<Sar>): Promise<Sar>;
  
  getSarSections(sarId: number): Promise<SarSection[]>;
  getSarSection(id: number): Promise<SarSection | undefined>;
  createSarSection(section: InsertSarSection): Promise<SarSection>;
  updateSarSection(id: number, updates: Partial<SarSection>): Promise<SarSection>;
  
  getSarSentences(sectionId: number): Promise<SarSentence[]>;
  getSarSentence(id: number): Promise<SarSentence | undefined>;
  createSarSentence(sentence: InsertSarSentence): Promise<SarSentence>;
  
  getAuditLogs(sarId: number): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  
  getSarVersions(sarId: number): Promise<SarVersion[]>;
  createSarVersion(version: InsertSarVersion): Promise<SarVersion>;
}

export class DatabaseStorage implements IStorage {
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async createCustomers(customerList: InsertCustomer[]): Promise<Customer[]> {
    if (customerList.length === 0) return [];
    return await db.insert(customers).values(customerList).returning();
  }

  async getTransactions(customerId?: number): Promise<Transaction[]> {
    if (customerId) {
      return await db.select().from(transactions).where(eq(transactions.customerId, customerId)).orderBy(desc(transactions.transactionDate));
    }
    return await db.select().from(transactions).orderBy(desc(transactions.transactionDate));
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(transaction).returning();
    return created;
  }

  async createTransactions(transactionList: InsertTransaction[]): Promise<Transaction[]> {
    if (transactionList.length === 0) return [];
    return await db.insert(transactions).values(transactionList).returning();
  }

  async getAlerts(customerId?: number): Promise<Alert[]> {
    if (customerId) {
      const txns = await db.select().from(transactions).where(eq(transactions.customerId, customerId));
      const txnIds = txns.map(t => t.id);
      if (txnIds.length === 0) return [];
      return await db.select().from(alerts).where(inArray(alerts.transactionId, txnIds)).orderBy(desc(alerts.triggeredAt));
    }
    return await db.select().from(alerts).orderBy(desc(alerts.triggeredAt));
  }

  async getAlertsByTransactionIds(transactionIds: number[]): Promise<Alert[]> {
    if (transactionIds.length === 0) return [];
    return await db.select().from(alerts).where(inArray(alerts.transactionId, transactionIds));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [created] = await db.insert(alerts).values(alert).returning();
    return created;
  }

  async createAlerts(alertList: InsertAlert[]): Promise<Alert[]> {
    if (alertList.length === 0) return [];
    return await db.insert(alerts).values(alertList).returning();
  }

  async getSars(): Promise<Sar[]> {
    return await db.select().from(sars).orderBy(desc(sars.createdAt));
  }

  async getSar(id: number): Promise<Sar | undefined> {
    const [sar] = await db.select().from(sars).where(eq(sars.id, id));
    return sar;
  }

  async getSarWithDetails(id: number): Promise<SarWithDetails | undefined> {
    const [sar] = await db.select().from(sars).where(eq(sars.id, id));
    if (!sar) return undefined;

    const [customer] = await db.select().from(customers).where(eq(customers.id, sar.customerId));
    const sections = await db.select().from(sarSections).where(eq(sarSections.sarId, id)).orderBy(sarSections.sequence);
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.sarId, id)).orderBy(desc(auditLogs.timestamp));

    const sectionsWithSentences = await Promise.all(
      sections.map(async (section) => {
        const sentences = await db.select().from(sarSentences).where(eq(sarSentences.sectionId, section.id)).orderBy(sarSentences.sequence);
        return { ...section, sentences };
      })
    );

    return {
      ...sar,
      customer,
      sections: sectionsWithSentences,
      auditLogs: logs,
    };
  }

  async createSar(sar: InsertSar): Promise<Sar> {
    const [created] = await db.insert(sars).values(sar).returning();
    return created;
  }

  async updateSar(id: number, updates: Partial<Sar>): Promise<Sar> {
    const [updated] = await db.update(sars)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(sars.id, id))
      .returning();
    return updated;
  }

  async getSarSections(sarId: number): Promise<SarSection[]> {
    return await db.select().from(sarSections).where(eq(sarSections.sarId, sarId)).orderBy(sarSections.sequence);
  }

  async getSarSection(id: number): Promise<SarSection | undefined> {
    const [section] = await db.select().from(sarSections).where(eq(sarSections.id, id));
    return section;
  }

  async createSarSection(section: InsertSarSection): Promise<SarSection> {
    const [created] = await db.insert(sarSections).values(section).returning();
    return created;
  }

  async updateSarSection(id: number, updates: Partial<SarSection>): Promise<SarSection> {
    const [updated] = await db.update(sarSections)
      .set(updates)
      .where(eq(sarSections.id, id))
      .returning();
    return updated;
  }

  async getSarSentences(sectionId: number): Promise<SarSentence[]> {
    return await db.select().from(sarSentences).where(eq(sarSentences.sectionId, sectionId)).orderBy(sarSentences.sequence);
  }

  async getSarSentence(id: number): Promise<SarSentence | undefined> {
    const [sentence] = await db.select().from(sarSentences).where(eq(sarSentences.id, id));
    return sentence;
  }

  async createSarSentence(sentence: InsertSarSentence): Promise<SarSentence> {
    const [created] = await db.insert(sarSentences).values(sentence).returning();
    return created;
  }

  async getAuditLogs(sarId: number): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.sarId, sarId)).orderBy(desc(auditLogs.timestamp));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getSarVersions(sarId: number): Promise<SarVersion[]> {
    return await db.select().from(sarVersions).where(eq(sarVersions.sarId, sarId)).orderBy(desc(sarVersions.versionNumber));
  }

  async createSarVersion(version: InsertSarVersion): Promise<SarVersion> {
    const [created] = await db.insert(sarVersions).values(version).returning();
    return created;
  }
}

export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage()
  : new MockStorage();
