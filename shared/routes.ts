import { z } from 'zod';
import {
  insertCustomerSchema,
  insertTransactionSchema,
  insertAlertSchema,
  insertSarSchema,
  insertSarSectionSchema,
  insertAuditLogSchema,
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/customers' as const,
      responses: {
        200: z.array(z.any()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/customers/:id' as const,
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions' as const,
      input: z.object({
        customerId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.any()),
      },
    },
  },
  
  alerts: {
    list: {
      method: 'GET' as const,
      path: '/api/alerts' as const,
      input: z.object({
        customerId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.any()),
      },
    },
  },
  
  data: {
    upload: {
      method: 'POST' as const,
      path: '/api/data/upload' as const,
      input: z.object({
        customers: z.array(insertCustomerSchema).optional(),
        transactions: z.array(insertTransactionSchema).optional(),
        alerts: z.array(insertAlertSchema).optional(),
      }),
      responses: {
        201: z.object({
          customersCreated: z.number(),
          transactionsCreated: z.number(),
          alertsCreated: z.number(),
        }),
        400: errorSchemas.validation,
      },
    },
    uploadFile: {
      method: 'POST' as const,
      path: '/api/data/upload-file' as const,
      responses: {
        201: z.object({
          customersCreated: z.number(),
          transactionsCreated: z.number(),
          alertsCreated: z.number(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
  
  riskScoring: {
    calculateForCustomer: {
      method: 'POST' as const,
      path: '/api/risk-scoring/customer/:customerId' as const,
      responses: {
        200: z.object({
          customerId: z.number(),
          totalRiskScore: z.number(),
          triggeredRules: z.array(z.string()),
          flaggedTransactions: z.array(z.number()),
        }),
        404: errorSchemas.notFound,
      },
    },
  },
  
  sars: {
    list: {
      method: 'GET' as const,
      path: '/api/sars' as const,
      responses: {
        200: z.array(z.any()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/sars/:id' as const,
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/sars/generate' as const,
      input: z.object({
        customerId: z.coerce.number(),
        includeTransactionIds: z.array(z.number()).optional(),
      }),
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    updateSection: {
      method: 'PUT' as const,
      path: '/api/sars/:sarId/sections/:sectionId' as const,
      input: z.object({
        content: z.string(),
        reason: z.string(),
      }),
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    compare: {
      method: 'GET' as const,
      path: '/api/sars/:id/compare' as const,
      input: z.object({
        fromVersion: z.coerce.number().optional(),
        toVersion: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.object({
          currentVersion: z.number(),
          previousVersion: z.number(),
          changes: z.array(z.object({
            sectionType: z.string(),
            type: z.enum(["added", "removed", "modified"]),
            oldContent: z.string().optional(),
            newContent: z.string().optional(),
          })),
        }),
        404: errorSchemas.notFound,
      },
    },
    auditTrail: {
      method: 'GET' as const,
      path: '/api/sars/:id/audit-trail' as const,
      responses: {
        200: z.array(z.any()),
        404: errorSchemas.notFound,
      },
    },
    explainSentence: {
      method: 'GET' as const,
      path: '/api/sars/sentences/:sentenceId/explain' as const,
      responses: {
        200: z.object({
          sentence: z.any(),
          supportingTransactions: z.array(z.any()),
          supportingRules: z.array(z.any()),
        }),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type DataUploadInput = z.infer<typeof api.data.upload.input>;
export type RiskScoreResponse = z.infer<typeof api.riskScoring.calculateForCustomer.responses[200]>;
export type GenerateSarInput = z.infer<typeof api.sars.generate.input>;
export type UpdateSectionInput = z.infer<typeof api.sars.updateSection.input>;
export type SarComparisonResponse = z.infer<typeof api.sars.compare.responses[200]>;
export type ExplainSentenceResponse = z.infer<typeof api.sars.explainSentence.responses[200]>;
