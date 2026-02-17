import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";

let openai: any = null;

if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
} else {
  console.warn("⚠️  OpenAI API key not set. Using mock SAR generation for development.");
}

const upload = multer({ storage: multer.memoryStorage() });

interface RuleCheck {
  ruleName: string;
  description: string;
  triggered: boolean;
  riskScore: number;
  affectedTransactions: number[];
}

function calculateRiskScore(customerId: number, transactions: any[], alerts: any[]): {
  totalRiskScore: number;
  triggeredRules: string[];
  flaggedTransactions: number[];
} {
  const rules: RuleCheck[] = [];
  const flaggedTransactionIds = new Set<number>();

  const largeTransactions = transactions.filter(t => parseFloat(t.amount) > 10000);
  if (largeTransactions.length > 0) {
    rules.push({
      ruleName: "LARGE_TRANSACTION",
      description: "Transaction exceeds $10,000 threshold",
      triggered: true,
      riskScore: largeTransactions.length * 10,
      affectedTransactions: largeTransactions.map(t => t.id),
    });
    largeTransactions.forEach(t => flaggedTransactionIds.add(t.id));
  }

  const dayTransactionCounts = new Map<string, number>();
  transactions.forEach(t => {
    const date = new Date(t.transactionDate).toISOString().split('T')[0];
    dayTransactionCounts.set(date, (dayTransactionCounts.get(date) || 0) + 1);
  });
  const highVelocityDays = Array.from(dayTransactionCounts.entries()).filter(([_, count]) => count > 5);
  if (highVelocityDays.length > 0) {
    const velocityTxns = transactions.filter(t => {
      const date = new Date(t.transactionDate).toISOString().split('T')[0];
      return highVelocityDays.some(([d, _]) => d === date);
    });
    rules.push({
      ruleName: "HIGH_VELOCITY",
      description: "More than 5 transactions in a single day",
      triggered: true,
      riskScore: highVelocityDays.length * 15,
      affectedTransactions: velocityTxns.map(t => t.id),
    });
    velocityTxns.forEach(t => flaggedTransactionIds.add(t.id));
  }

  const highRiskCountries = ["IRAN", "NORTH KOREA", "SYRIA", "CUBA"];
  const highRiskTxns = transactions.filter(t => 
    t.counterpartyCountry && highRiskCountries.includes(t.counterpartyCountry.toUpperCase())
  );
  if (highRiskTxns.length > 0) {
    rules.push({
      ruleName: "HIGH_RISK_JURISDICTION",
      description: "Transaction with high-risk jurisdiction",
      triggered: true,
      riskScore: highRiskTxns.length * 25,
      affectedTransactions: highRiskTxns.map(t => t.id),
    });
    highRiskTxns.forEach(t => flaggedTransactionIds.add(t.id));
  }

  const roundAmountTxns = transactions.filter(t => {
    const amount = parseFloat(t.amount);
    return amount % 1000 === 0 && amount >= 5000;
  });
  if (roundAmountTxns.length > 2) {
    rules.push({
      ruleName: "ROUND_AMOUNT_PATTERN",
      description: "Multiple transactions with round amounts (structuring indicator)",
      triggered: true,
      riskScore: 20,
      affectedTransactions: roundAmountTxns.map(t => t.id),
    });
    roundAmountTxns.forEach(t => flaggedTransactionIds.add(t.id));
  }

  const totalRiskScore = rules.reduce((sum, rule) => sum + (rule.triggered ? rule.riskScore : 0), 0);
  const triggeredRules = rules.filter(r => r.triggered).map(r => r.ruleName);

  return {
    totalRiskScore,
    triggeredRules,
    flaggedTransactions: Array.from(flaggedTransactionIds),
  };
}

async function generateSarNarrative(
  customer: any,
  transactions: any[],
  alerts: any[],
  riskScore: any
): Promise<{
  sections: { type: string; content: string; confidence: string; sentences: { text: string; confidence: string; txnIds: number[]; rules: string[] }[] }[];
}> {
  // If OpenAI is not available, generate mock SAR text
  if (!openai) {
    const sections = [
      {
        type: "OVERVIEW",
        content: `A review of customer ${customer.name} (Account: ${customer.accountNumber}) has identified suspicious financial activity requiring investigation. The customer, classified as ${customer.riskLevel} risk, has demonstrated patterns consistent with potential money laundering or sanctions evasion.`,
        confidence: "medium",
        sentences: [
          {
            text: `Customer ${customer.name} account shows activity exceeding policy thresholds.`,
            confidence: "high",
            txnIds: riskScore.flaggedTransactions.slice(0, 3),
            rules: riskScore.triggeredRules.slice(0, 2),
            sequence: 0,
          },
          {
            text: "Multiple high-risk jurisdictions identified in counterparty transactions.",
            confidence: "high",
            txnIds: riskScore.flaggedTransactions.slice(0, 2),
            rules: riskScore.triggeredRules.slice(0, 1),
            sequence: 1,
          },
        ],
      },
      {
        type: "TRANSACTION_PATTERN",
        content: `Analysis of ${transactions.length} transactions reveals concerning patterns. Transaction velocity exceeds historical norms with ${riskScore.flaggedTransactions.length} flagged transactions identified. Counterparty relationships show high-risk geographic indicators.`,
        confidence: "medium",
        sentences: [
          {
            text: `Total of ${transactions.length} transactions reviewed with ${riskScore.flaggedTransactions.length} flagged for further investigation.`,
            confidence: "high",
            txnIds: riskScore.flaggedTransactions,
            rules: riskScore.triggeredRules,
            sequence: 0,
          },
          {
            text: "High-velocity transaction patterns identified suggesting potential structuring.",
            confidence: "medium",
            txnIds: riskScore.flaggedTransactions.slice(0, 4),
            rules: ["HIGH_VELOCITY"],
            sequence: 1,
          },
        ],
      },
      {
        type: "SUSPICION_RATIONALE",
        content: `The identified activity is suspicious due to: (1) Multiple rule triggers with total risk score of ${riskScore.totalRiskScore}; (2) Transactions with high-risk jurisdictions; (3) Patterns inconsistent with customer profile and stated occupation.`,
        confidence: "medium",
        sentences: [
          {
            text: `Risk scoring analysis produced a total score of ${riskScore.totalRiskScore} based on triggered rules: ${riskScore.triggeredRules.join(", ")}.`,
            confidence: "high",
            txnIds: riskScore.flaggedTransactions,
            rules: riskScore.triggeredRules,
            sequence: 0,
          },
        ],
      },
      {
        type: "CONCLUSION",
        content: "Based on the analysis above, this SAR is filed due to suspicious activity potentially indicative of money laundering or sanctions violations. Further investigation is recommended including enhanced due diligence review.",
        confidence: "medium",
        sentences: [
          {
            text: "Recommend filing SAR and enhanced customer due diligence procedures.",
            confidence: "high",
            txnIds: riskScore.flaggedTransactions,
            rules: riskScore.triggeredRules,
            sequence: 0,
          },
        ],
      },
    ];
    return { sections };
  }

  const prompt = `You are a financial compliance officer writing a Suspicious Activity Report (SAR). Generate a structured narrative based on the following information:

CUSTOMER INFORMATION:
- Name: ${customer.name}
- Account Number: ${customer.accountNumber}
- Risk Level: ${customer.riskLevel}
- Country: ${customer.countryOfResidence || 'Unknown'}
- Occupation: ${customer.occupation || 'Unknown'}

TRANSACTION SUMMARY:
- Total Transactions: ${transactions.length}
- Flagged Transactions: ${riskScore.flaggedTransactions.length}
- Total Risk Score: ${riskScore.totalRiskScore}

TRIGGERED RULES:
${riskScore.triggeredRules.map((r: string) => `- ${r}`).join('\n')}

SAMPLE TRANSACTIONS:
${transactions.slice(0, 5).map((t: any) => 
  `- ${t.transactionDate}: ${t.direction} ${t.amount} ${t.currency} ${t.transactionType} to ${t.counterparty || 'Unknown'} (${t.counterpartyCountry || 'Unknown'})`
).join('\n')}

Generate a SAR narrative with EXACTLY 4 sections:
1. OVERVIEW: Brief summary of the suspicious activity (2-3 sentences)
2. TRANSACTION_PATTERN: Detailed analysis of transaction patterns (3-4 sentences)
3. SUSPICION_RATIONALE: Why this activity is suspicious (2-3 sentences)
4. CONCLUSION: Summary and recommendation (1-2 sentences)

For EACH sentence, indicate confidence level as HIGH, MEDIUM, or LOW.
For EACH sentence, list which transaction IDs (from flagged transactions: ${riskScore.flaggedTransactions.join(', ')}) and rules support it.

Respond in JSON format:
{
  "sections": [
    {
      "type": "OVERVIEW",
      "sentences": [
        {
          "text": "sentence text here",
          "confidence": "HIGH|MEDIUM|LOW",
          "supportingTransactionIds": [1, 2],
          "supportingRules": ["RULE_NAME"]
        }
      ]
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  
  const sections = result.sections.map((section: any) => {
    const sectionContent = section.sentences.map((s: any) => s.text).join(' ');
    const avgConfidence = section.sentences.length > 0 
      ? (section.sentences.filter((s: any) => s.confidence === 'HIGH').length / section.sentences.length > 0.6 ? 'high' 
        : section.sentences.filter((s: any) => s.confidence === 'LOW').length / section.sentences.length > 0.6 ? 'low' 
        : 'medium')
      : 'medium';
    
    return {
      type: section.type,
      content: sectionContent,
      confidence: avgConfidence,
      sentences: section.sentences.map((s: any, idx: number) => ({
        text: s.text,
        confidence: (s.confidence || 'MEDIUM').toLowerCase(),
        txnIds: s.supportingTransactionIds || [],
        rules: s.supportingRules || [],
        sequence: idx,
      })),
    };
  });

  return { sections };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.customers.list.path, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get(api.customers.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.get(api.transactions.list.path, async (req, res) => {
    try {
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
      const transactions = await storage.getTransactions(customerId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get(api.alerts.list.path, async (req, res) => {
    try {
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
      const alerts = await storage.getAlerts(customerId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post(api.data.upload.path, async (req, res) => {
    try {
      const input = api.data.upload.input.parse(req.body);
      
      let customersCreated = 0;
      let transactionsCreated = 0;
      let alertsCreated = 0;

      if (input.customers && input.customers.length > 0) {
        const created = await storage.createCustomers(input.customers);
        customersCreated = created.length;
      }

      if (input.transactions && input.transactions.length > 0) {
        const created = await storage.createTransactions(input.transactions);
        transactionsCreated = created.length;
      }

      if (input.alerts && input.alerts.length > 0) {
        const created = await storage.createAlerts(input.alerts);
        alertsCreated = created.length;
      }

      res.status(201).json({
        customersCreated,
        transactionsCreated,
        alertsCreated,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: error.errors[0].message,
          field: error.errors[0].path.join('.'),
        });
      }
      console.error("Error uploading data:", error);
      res.status(500).json({ message: "Failed to upload data" });
    }
  });

  app.post(api.data.uploadFile.path, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileContent = req.file.buffer.toString('utf-8');
      let data: any;

      if (req.file.originalname.endsWith('.json')) {
        data = JSON.parse(fileContent);
      } else if (req.file.originalname.endsWith('.csv')) {
        const records: any[] = [];
        const stream = Readable.from(fileContent);
        await new Promise((resolve, reject) => {
          stream
            .pipe(csv())
            .on('data', (row) => records.push(row))
            .on('end', resolve)
            .on('error', reject);
        });
        data = { customers: records };
      } else {
        return res.status(400).json({ message: "Unsupported file format. Use JSON or CSV" });
      }

      let customersCreated = 0;
      let transactionsCreated = 0;
      let alertsCreated = 0;

      if (data.customers && data.customers.length > 0) {
        const created = await storage.createCustomers(data.customers);
        customersCreated = created.length;
      }

      if (data.transactions && data.transactions.length > 0) {
        const created = await storage.createTransactions(data.transactions);
        transactionsCreated = created.length;
      }

      if (data.alerts && data.alerts.length > 0) {
        const created = await storage.createAlerts(data.alerts);
        alertsCreated = created.length;
      }

      res.status(201).json({
        customersCreated,
        transactionsCreated,
        alertsCreated,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ message: "Failed to process file" });
    }
  });

  app.post(api.riskScoring.calculateForCustomer.path, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const transactions = await storage.getTransactions(customerId);
      const alerts = await storage.getAlerts(customerId);

      const riskScore = calculateRiskScore(customerId, transactions, alerts);

      res.json(riskScore);
    } catch (error) {
      console.error("Error calculating risk score:", error);
      res.status(500).json({ message: "Failed to calculate risk score" });
    }
  });

  app.get(api.sars.list.path, async (req, res) => {
    try {
      const sars = await storage.getSars();
      res.json(sars);
    } catch (error) {
      console.error("Error fetching SARs:", error);
      res.status(500).json({ message: "Failed to fetch SARs" });
    }
  });

  app.get(api.sars.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sar = await storage.getSarWithDetails(id);
      if (!sar) {
        return res.status(404).json({ message: "SAR not found" });
      }
      res.json(sar);
    } catch (error) {
      console.error("Error fetching SAR:", error);
      res.status(500).json({ message: "Failed to fetch SAR" });
    }
  });

  app.post(api.sars.generate.path, async (req, res) => {
    try {
      const input = api.sars.generate.input.parse(req.body);
      
      const customer = await storage.getCustomer(input.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const transactions = await storage.getTransactions(input.customerId);
      const alerts = await storage.getAlerts(input.customerId);

      const riskScore = calculateRiskScore(input.customerId, transactions, alerts);

      const narrative = await generateSarNarrative(customer, transactions, alerts, riskScore);

      const sar = await storage.createSar({
        customerId: input.customerId,
        title: `SAR for ${customer.name} - ${new Date().toISOString().split('T')[0]}`,
        status: "draft",
        generatedBy: "AI",
      });

      for (let i = 0; i < narrative.sections.length; i++) {
        const section = narrative.sections[i];
        const createdSection = await storage.createSarSection({
          sarId: sar.id,
          sectionType: section.type,
          content: section.content,
          confidenceLevel: section.confidence,
          sequence: i,
        });

        for (const sentence of section.sentences) {
          await storage.createSarSentence({
            sectionId: createdSection.id,
            sentenceText: sentence.text,
            confidenceLevel: sentence.confidence,
            supportingTransactionIds: sentence.txnIds,
            supportingRules: sentence.rules,
            sequence: sentence.sequence,
          });
        }
      }

      await storage.createAuditLog({
        sarId: sar.id,
        userId: "system",
        action: "SAR_GENERATED",
        reason: "Initial AI generation",
      });

      const snapshotData = {
        sar,
        sections: narrative.sections,
      };
      await storage.createSarVersion({
        sarId: sar.id,
        versionNumber: 1,
        snapshotData,
      });

      const fullSar = await storage.getSarWithDetails(sar.id);
      res.status(201).json(fullSar);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: error.errors[0].message,
          field: error.errors[0].path.join('.'),
        });
      }
      console.error("Error generating SAR:", error);
      res.status(500).json({ message: "Failed to generate SAR" });
    }
  });

  app.put(api.sars.updateSection.path, async (req, res) => {
    try {
      const sarId = parseInt(req.params.sarId);
      const sectionId = parseInt(req.params.sectionId);
      const input = api.sars.updateSection.input.parse(req.body);

      const sar = await storage.getSar(sarId);
      if (!sar) {
        return res.status(404).json({ message: "SAR not found" });
      }

      const section = await storage.getSarSection(sectionId);
      if (!section || section.sarId !== sarId) {
        return res.status(404).json({ message: "Section not found" });
      }

      const oldContent = section.content;
      const updatedSection = await storage.updateSarSection(sectionId, {
        content: input.content,
      });

      await storage.createAuditLog({
        sarId,
        userId: "user",
        action: "SECTION_EDITED",
        fieldChanged: `section_${sectionId}`,
        oldValue: oldContent,
        newValue: input.content,
        reason: input.reason,
      });

      const newVersion = sar.version + 1;
      await storage.updateSar(sarId, { version: newVersion });

      const fullSar = await storage.getSarWithDetails(sarId);
      await storage.createSarVersion({
        sarId,
        versionNumber: newVersion,
        snapshotData: fullSar,
      });

      res.json(updatedSection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: error.errors[0].message,
          field: error.errors[0].path.join('.'),
        });
      }
      console.error("Error updating section:", error);
      res.status(500).json({ message: "Failed to update section" });
    }
  });

  app.get(api.sars.compare.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sar = await storage.getSar(id);
      if (!sar) {
        return res.status(404).json({ message: "SAR not found" });
      }

      const versions = await storage.getSarVersions(id);
      if (versions.length < 2) {
        return res.json({
          currentVersion: sar.version,
          previousVersion: sar.version,
          changes: [],
        });
      }

      const currentVersion = versions[0];
      const previousVersion = versions[1];

      const currentSections = (currentVersion.snapshotData as any).sections || [];
      const previousSections = (previousVersion.snapshotData as any).sections || [];

      const changes: any[] = [];
      
      currentSections.forEach((curr: any) => {
        const prev = previousSections.find((p: any) => p.id === curr.id);
        if (!prev) {
          changes.push({
            sectionType: curr.sectionType,
            type: "added",
            newContent: curr.content,
          });
        } else if (curr.content !== prev.content) {
          changes.push({
            sectionType: curr.sectionType,
            type: "modified",
            oldContent: prev.content,
            newContent: curr.content,
          });
        }
      });

      previousSections.forEach((prev: any) => {
        const curr = currentSections.find((c: any) => c.id === prev.id);
        if (!curr) {
          changes.push({
            sectionType: prev.sectionType,
            type: "removed",
            oldContent: prev.content,
          });
        }
      });

      res.json({
        currentVersion: currentVersion.versionNumber,
        previousVersion: previousVersion.versionNumber,
        changes,
      });
    } catch (error) {
      console.error("Error comparing versions:", error);
      res.status(500).json({ message: "Failed to compare versions" });
    }
  });

  app.get(api.sars.auditTrail.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sar = await storage.getSar(id);
      if (!sar) {
        return res.status(404).json({ message: "SAR not found" });
      }

      const logs = await storage.getAuditLogs(id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit trail:", error);
      res.status(500).json({ message: "Failed to fetch audit trail" });
    }
  });

  app.get(api.sars.explainSentence.path, async (req, res) => {
    try {
      const sentenceId = parseInt(req.params.sentenceId);
      const sentence = await storage.getSarSentence(sentenceId);
      if (!sentence) {
        return res.status(404).json({ message: "Sentence not found" });
      }

      const txnIds = (sentence.supportingTransactionIds as any) || [];
      const supportingTransactions = await Promise.all(
        txnIds.map((id: number) => storage.getTransaction(id))
      );

      const ruleNames = (sentence.supportingRules as any) || [];
      const supportingRules = ruleNames.map((name: string) => ({
        ruleName: name,
        description: getRuleDescription(name),
      }));

      res.json({
        sentence,
        supportingTransactions: supportingTransactions.filter(t => t !== undefined),
        supportingRules,
      });
    } catch (error) {
      console.error("Error explaining sentence:", error);
      res.status(500).json({ message: "Failed to explain sentence" });
    }
  });

  await seedDatabase();

  return httpServer;
}

function getRuleDescription(ruleName: string): string {
  const descriptions: Record<string, string> = {
    "LARGE_TRANSACTION": "Transaction exceeds $10,000 threshold",
    "HIGH_VELOCITY": "More than 5 transactions in a single day",
    "HIGH_RISK_JURISDICTION": "Transaction with high-risk jurisdiction",
    "ROUND_AMOUNT_PATTERN": "Multiple transactions with round amounts (structuring indicator)",
  };
  return descriptions[ruleName] || "Unknown rule";
}

async function seedDatabase() {
  try {
    const existingCustomers = await storage.getCustomers();
    if (existingCustomers.length > 0) {
      console.log("Database already seeded");
      return;
    }

    console.log("Seeding database with sample data...");

    const customer1 = await storage.createCustomer({
      customerId: "CUST-001",
      name: "John Mitchell",
      accountNumber: "ACC-7821-9034",
      riskLevel: "high",
      countryOfResidence: "United States",
      occupation: "Import/Export Business Owner",
      accountOpenDate: new Date("2022-03-15"),
    });

    const customer2 = await storage.createCustomer({
      customerId: "CUST-002",
      name: "Sarah Chen",
      accountNumber: "ACC-4562-1087",
      riskLevel: "medium",
      countryOfResidence: "Singapore",
      occupation: "Cryptocurrency Trader",
      accountOpenDate: new Date("2023-01-20"),
    });

    const txns1 = await storage.createTransactions([
      {
        customerId: customer1.id,
        transactionId: "TXN-001",
        amount: "15000.00",
        currency: "USD",
        transactionType: "wire_transfer",
        direction: "outbound",
        counterparty: "ABC Trading Ltd",
        counterpartyCountry: "Iran",
        description: "Payment for goods",
        transactionDate: new Date("2025-01-15T10:30:00Z"),
      },
      {
        customerId: customer1.id,
        transactionId: "TXN-002",
        amount: "9500.00",
        currency: "USD",
        transactionType: "wire_transfer",
        direction: "outbound",
        counterparty: "XYZ Corp",
        counterpartyCountry: "Iran",
        description: "Trade settlement",
        transactionDate: new Date("2025-01-15T14:20:00Z"),
      },
      {
        customerId: customer1.id,
        transactionId: "TXN-003",
        amount: "8000.00",
        currency: "USD",
        transactionType: "wire_transfer",
        direction: "outbound",
        counterparty: "Global Exports Inc",
        counterpartyCountry: "Iran",
        description: "Invoice payment",
        transactionDate: new Date("2025-01-15T16:45:00Z"),
      },
      {
        customerId: customer1.id,
        transactionId: "TXN-004",
        amount: "12000.00",
        currency: "USD",
        transactionType: "wire_transfer",
        direction: "outbound",
        counterparty: "Mideast Trading",
        counterpartyCountry: "Iran",
        description: "Purchase order payment",
        transactionDate: new Date("2025-01-16T09:15:00Z"),
      },
      {
        customerId: customer1.id,
        transactionId: "TXN-005",
        amount: "10000.00",
        currency: "USD",
        transactionType: "wire_transfer",
        direction: "outbound",
        counterparty: "Tehran Commodities",
        counterpartyCountry: "Iran",
        description: "Commodity purchase",
        transactionDate: new Date("2025-01-16T11:30:00Z"),
      },
      {
        customerId: customer1.id,
        transactionId: "TXN-006",
        amount: "11500.00",
        currency: "USD",
        transactionType: "wire_transfer",
        direction: "outbound",
        counterparty: "Eastern Supplies",
        counterpartyCountry: "Iran",
        description: "Supply payment",
        transactionDate: new Date("2025-01-16T15:00:00Z"),
      },
    ]);

    await storage.createAlerts([
      {
        transactionId: txns1[0].id,
        ruleName: "LARGE_TRANSACTION",
        ruleDescription: "Transaction exceeds $10,000 threshold",
        riskScore: 10,
      },
      {
        transactionId: txns1[0].id,
        ruleName: "HIGH_RISK_JURISDICTION",
        ruleDescription: "Transaction with high-risk jurisdiction",
        riskScore: 25,
      },
      {
        transactionId: txns1[3].id,
        ruleName: "LARGE_TRANSACTION",
        ruleDescription: "Transaction exceeds $10,000 threshold",
        riskScore: 10,
      },
      {
        transactionId: txns1[3].id,
        ruleName: "HIGH_RISK_JURISDICTION",
        ruleDescription: "Transaction with high-risk jurisdiction",
        riskScore: 25,
      },
      {
        transactionId: txns1[4].id,
        ruleName: "ROUND_AMOUNT_PATTERN",
        ruleDescription: "Round amount transaction (possible structuring)",
        riskScore: 20,
      },
      {
        transactionId: txns1[4].id,
        ruleName: "HIGH_RISK_JURISDICTION",
        ruleDescription: "Transaction with high-risk jurisdiction",
        riskScore: 25,
      },
    ]);

    const txns2 = await storage.createTransactions([
      {
        customerId: customer2.id,
        transactionId: "TXN-101",
        amount: "25000.00",
        currency: "USD",
        transactionType: "crypto_exchange",
        direction: "inbound",
        counterparty: "Crypto Exchange A",
        counterpartyCountry: "Malta",
        description: "Bitcoin sale",
        transactionDate: new Date("2025-02-01T08:00:00Z"),
      },
      {
        customerId: customer2.id,
        transactionId: "TXN-102",
        amount: "18000.00",
        currency: "USD",
        transactionType: "crypto_exchange",
        direction: "outbound",
        counterparty: "Crypto Exchange B",
        counterpartyCountry: "Cayman Islands",
        description: "Ethereum purchase",
        transactionDate: new Date("2025-02-01T10:30:00Z"),
      },
      {
        customerId: customer2.id,
        transactionId: "TXN-103",
        amount: "22000.00",
        currency: "USD",
        transactionType: "crypto_exchange",
        direction: "inbound",
        counterparty: "Crypto Exchange A",
        counterpartyCountry: "Malta",
        description: "Altcoin sale",
        transactionDate: new Date("2025-02-01T13:45:00Z"),
      },
    ]);

    await storage.createAlerts([
      {
        transactionId: txns2[0].id,
        ruleName: "LARGE_TRANSACTION",
        ruleDescription: "Transaction exceeds $10,000 threshold",
        riskScore: 10,
      },
      {
        transactionId: txns2[1].id,
        ruleName: "LARGE_TRANSACTION",
        ruleDescription: "Transaction exceeds $10,000 threshold",
        riskScore: 10,
      },
      {
        transactionId: txns2[2].id,
        ruleName: "LARGE_TRANSACTION",
        ruleDescription: "Transaction exceeds $10,000 threshold",
        riskScore: 10,
      },
    ]);

    console.log("Database seeded successfully with 2 customers, 9 transactions, and 9 alerts");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
