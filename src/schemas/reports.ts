import { z } from 'zod';
import { customerRefSchema, dateSchema, dateTimeSchema, paginationQuerySchema, positiveIntegerSchema, toolOutputSchema } from './common.js';

const accountCodeSchema = z.string().min(1);
const reportDateFilterSchema = z.union([dateSchema, dateTimeSchema]);

const reportPeriodSchema = z
  .object({
    account_start: accountCodeSchema.optional(),
    account_end: accountCodeSchema.optional(),
    year: z.number().int().min(1000).max(9999),
    month_start: z.number().int().min(1).max(13),
    month_end: z.number().int().min(1).max(13),
    includes_tax_difference: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.month_start > value.month_end) {
      context.addIssue({
        code: 'custom',
        path: ['month_start'],
        message: 'month_start must be less than or equal to month_end',
      });
    }

    if (value.account_start && value.account_end && value.account_start > value.account_end) {
      context.addIssue({
        code: 'custom',
        path: ['account_start'],
        message: 'account_start must be less than or equal to account_end',
      });
    }
  });

export const trialBalanceSchema = reportPeriodSchema;

export const trialBalanceByThirdSchema = reportPeriodSchema
  .extend({
    customer: customerRefSchema.optional(),
  })
  .strict();

export const trialBalanceToolSchema = trialBalanceSchema;
export const trialBalanceByThirdToolSchema = trialBalanceByThirdSchema;

export const reportFileSchema = z
  .object({
    file_id: z.string().min(1),
    file_url: z.url(),
  })
  .strict();

const accountsPayableDueSchema = z
  .object({
    prefix: z.string(),
    consecutive: z.union([z.string(), z.number().int()]),
    quote: z.union([z.string(), z.number().int()]),
    date: z.union([dateSchema, dateTimeSchema]),
    balance: z.number(),
  })
  .strict();

const accountsPayableProviderSchema = z
  .object({
    id: z.string().optional(),
    identification: z.union([z.string(), z.number()]),
    branch_office: z.number().int().min(0).max(999).optional(),
    name: z.string(),
  })
  .strict();

const accountsPayableCostCenterSchema = z
  .object({
    code: z.union([z.string(), z.number()]),
    name: z.string(),
  })
  .strict();

const accountsPayableCurrencySchema = z
  .object({
    money_code: z.string(),
    balance: z.union([z.string(), z.number()]),
  })
  .strict();

export const accountsPayableResultSchema = z
  .object({
    due: accountsPayableDueSchema,
    provider: accountsPayableProviderSchema,
    cost_center: accountsPayableCostCenterSchema.optional(),
    currency: accountsPayableCurrencySchema.optional(),
  })
  .strict();

const reportLinksSchema = z
  .object({
    previous: z.object({ href: z.url() }).strict().optional(),
    self: z.object({ href: z.url() }).strict().optional(),
    next: z.object({ href: z.url() }).strict().optional(),
  })
  .strict();

const accountsPayablePageSchema = z
  .object({
    pagination: z
      .object({
        page: positiveIntegerSchema,
        page_size: positiveIntegerSchema,
        total_results: z.number().int().nonnegative(),
      })
      .strict(),
    results: z.array(accountsPayableResultSchema),
  })
  .strict();

export const accountsPayableResponseSchema = z
  .object({
    value: accountsPayablePageSchema,
    _links: reportLinksSchema.optional(),
    __links: reportLinksSchema.optional(),
  })
  .strict();

export const accountsPayableQuerySchema = z
  .object({
    due_date_start: reportDateFilterSchema.optional().describe('Due-date lower bound (date or RFC3339 date-time)'),
    due_date_end: reportDateFilterSchema.optional().describe('Due-date upper bound (date or RFC3339 date-time)'),
    provider_identification: z.string().min(1).optional().describe('Provider identification number'),
    provider_branch_office: z.number().int().min(0).max(999).optional().describe('Provider branch office (0-999)'),
    // Some generated Siigo descriptions expose date_end while the narrative
    // contract calls it due_date_end. Keep the live-compatible alias available.
    date_end: reportDateFilterSchema.optional().describe('Compatibility alias for due_date_end (date or RFC3339 date-time)'),
    page: paginationQuerySchema.shape.page,
    page_size: paginationQuerySchema.shape.page_size,
  })
  .strict()
  .superRefine((value, context) => {
    const end = value.due_date_end ?? value.date_end;
    if (value.due_date_start && end && Date.parse(value.due_date_start) > Date.parse(end)) {
      context.addIssue({
        code: 'custom',
        path: ['due_date_start'],
        message: 'due_date_start must be less than or equal to the end date',
      });
    }
  });

export const reportFileToolOutputSchema = toolOutputSchema(reportFileSchema);
export const accountsPayableToolOutputSchema = toolOutputSchema(accountsPayableResponseSchema);

export type TrialBalance = z.infer<typeof trialBalanceSchema>;
export type TrialBalanceByThird = z.infer<typeof trialBalanceByThirdSchema>;
export type AccountsPayableQuery = z.infer<typeof accountsPayableQuerySchema>;
