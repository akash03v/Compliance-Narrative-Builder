import {
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
import type { IStorage } from "./storage";

export class MockStorage implements IStorage {
  private customers: Map<number, Customer> = new Map();
  private transactions: Map<number, Transaction> = new Map();
  private alerts: Map<number, Alert> = new Map();
  private sars: Map<number, Sar> = new Map();
  private sarSections: Map<number, SarSection> = new Map();
  private sarSentences: Map<number, SarSentence> = new Map();
  private auditLogs: Map<number, AuditLog> = new Map();
  private sarVersions: Map<number, SarVersion> = new Map();

  private nextCustomerId = 1;
  private nextTransactionId = 1;
  private nextAlertId = 1;
  private nextSarId = 1;
  private nextSarSectionId = 1;
  private nextSarSentenceId = 1;
  private nextAuditLogId = 1;
  private nextSarVersionId = 1;

  private getId(collection: string): number {
    switch (collection) {
      case "customer":
        return this.nextCustomerId++;
      case "transaction":
        return this.nextTransactionId++;
      case "alert":
        return this.nextAlertId++;
      case "sar":
        return this.nextSarId++;
      case "sarSection":
        return this.nextSarSectionId++;
      case "sarSentence":
        return this.nextSarSentenceId++;
      case "auditLog":
        return this.nextAuditLogId++;
      case "sarVersion":
        return this.nextSarVersionId++;
      default:
        return 1;
    }
  }

  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.getId("customer");
    const newCustomer: Customer = {
      id,
      ...customer,
      createdAt: new Date(),
    } as Customer;
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async createCustomers(customerList: InsertCustomer[]): Promise<Customer[]> {
    return Promise.all(customerList.map(c => this.createCustomer(c)));
  }

  async getTransactions(customerId?: number): Promise<Transaction[]> {
    let result = Array.from(this.transactions.values());
    if (customerId) {
      result = result.filter(t => t.customerId === customerId);
    }
    return result.sort(
      (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.getId("transaction");
    const newTransaction: Transaction = {
      id,
      ...transaction,
      createdAt: new Date(),
    } as Transaction;
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async createTransactions(transactionList: InsertTransaction[]): Promise<Transaction[]> {
    return Promise.all(transactionList.map(t => this.createTransaction(t)));
  }

  async getAlerts(customerId?: number): Promise<Alert[]> {
    let result = Array.from(this.alerts.values());
    if (customerId) {
      const customerTransactions = Array.from(this.transactions.values())
        .filter(t => t.customerId === customerId)
        .map(t => t.id);
      result = result.filter(a => customerTransactions.includes(a.transactionId));
    }
    return result.sort(
      (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );
  }

  async getAlertsByTransactionIds(transactionIds: number[]): Promise<Alert[]> {
    if (transactionIds.length === 0) return [];
    return Array.from(this.alerts.values()).filter(a =>
      transactionIds.includes(a.transactionId)
    );
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = this.getId("alert");
    const newAlert: Alert = {
      id,
      ...alert,
      createdAt: new Date(),
    } as Alert;
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async createAlerts(alertList: InsertAlert[]): Promise<Alert[]> {
    return Promise.all(alertList.map(a => this.createAlert(a)));
  }

  async getSars(): Promise<Sar[]> {
    return Array.from(this.sars.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getSar(id: number): Promise<Sar | undefined> {
    return this.sars.get(id);
  }

  async getSarWithDetails(id: number): Promise<SarWithDetails | undefined> {
    const sar = this.sars.get(id);
    if (!sar) return undefined;

    const customer = this.customers.get(sar.customerId);
    const sections = Array.from(this.sarSections.values())
      .filter(s => s.sarId === id)
      .sort((a, b) => a.sequence - b.sequence);

    const logs = Array.from(this.auditLogs.values())
      .filter(l => l.sarId === id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const sectionsWithSentences = await Promise.all(
      sections.map(async (section) => {
        const sentences = Array.from(this.sarSentences.values())
          .filter(s => s.sectionId === section.id)
          .sort((a, b) => a.sequence - b.sequence);
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
    const id = this.getId("sar");
    const newSar: Sar = {
      id,
      ...sar,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Sar;
    this.sars.set(id, newSar);
    return newSar;
  }

  async updateSar(id: number, updates: Partial<Sar>): Promise<Sar> {
    const existing = this.sars.get(id);
    if (!existing) throw new Error(`SAR with id ${id} not found`);
    const updated: Sar = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.sars.set(id, updated);
    return updated;
  }

  async getSarSections(sarId: number): Promise<SarSection[]> {
    return Array.from(this.sarSections.values())
      .filter(s => s.sarId === sarId)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async getSarSection(id: number): Promise<SarSection | undefined> {
    return this.sarSections.get(id);
  }

  async createSarSection(section: InsertSarSection): Promise<SarSection> {
    const id = this.getId("sarSection");
    const newSection: SarSection = {
      id,
      ...section,
    } as SarSection;
    this.sarSections.set(id, newSection);
    return newSection;
  }

  async updateSarSection(id: number, updates: Partial<SarSection>): Promise<SarSection> {
    const existing = this.sarSections.get(id);
    if (!existing) throw new Error(`SAR section with id ${id} not found`);
    const updated: SarSection = {
      ...existing,
      ...updates,
    };
    this.sarSections.set(id, updated);
    return updated;
  }

  async getSarSentences(sectionId: number): Promise<SarSentence[]> {
    return Array.from(this.sarSentences.values())
      .filter(s => s.sectionId === sectionId)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async getSarSentence(id: number): Promise<SarSentence | undefined> {
    return this.sarSentences.get(id);
  }

  async createSarSentence(sentence: InsertSarSentence): Promise<SarSentence> {
    const id = this.getId("sarSentence");
    const newSentence: SarSentence = {
      id,
      ...sentence,
    } as SarSentence;
    this.sarSentences.set(id, newSentence);
    return newSentence;
  }

  async getAuditLogs(sarId: number): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .filter(l => l.sarId === sarId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = this.getId("auditLog");
    const newLog: AuditLog = {
      id,
      ...log,
      timestamp: new Date(),
    } as AuditLog;
    this.auditLogs.set(id, newLog);
    return newLog;
  }

  async getSarVersions(sarId: number): Promise<SarVersion[]> {
    return Array.from(this.sarVersions.values())
      .filter(v => v.sarId === sarId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async createSarVersion(version: InsertSarVersion): Promise<SarVersion> {
    const id = this.getId("sarVersion");
    const newVersion: SarVersion = {
      id,
      ...version,
      createdAt: new Date(),
    } as SarVersion;
    this.sarVersions.set(id, newVersion);
    return newVersion;
  }
}





