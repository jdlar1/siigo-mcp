import { z } from 'zod';
import { linksSchema, paginationQuerySchema, positiveIntegerSchema, toolOutputSchema } from './common.js';

export const documentTypeCodeSchema = z.enum(['FV', 'RC', 'NC', 'FC', 'CC', 'RP', 'C', 'DS']);

const globalAdjustmentSchema = z
  .object({
    id: z.number().int().nonnegative(),
    name: z.string(),
    percentage: z.number().nonnegative(),
    active: z.boolean(),
  })
  .strict();

export const documentTypeSchema = z
  .object({
    id: positiveIntegerSchema,
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    type: documentTypeCodeSchema,
    active: z.boolean(),
    seller_by_item: z.boolean().optional(),
    cost_center: z.boolean().optional(),
    cost_center_mandatory: z.boolean().optional(),
    cost_center_default: positiveIntegerSchema.optional(),
    automatic_number: z.boolean().optional(),
    consecutive: z.number().int().nonnegative().optional(),
    discount_type: z.enum(['Percentage', 'Value']).optional(),
    decimals: z.boolean().optional(),
    advance_payment: z.boolean().optional(),
    reteiva: z.boolean().optional(),
    reteica: z.boolean().optional(),
    self_withholding: z.boolean().optional(),
    self_withholding_limit: z.number().nonnegative().optional(),
    electronic_type: z.string().optional(),
    official_book: z.string().optional(),
    document_support: z.boolean().optional(),
    prefix: z.string().optional(),
    global_discounts: z.array(globalAdjustmentSchema).optional(),
    global_charges: z.array(globalAdjustmentSchema).optional(),
    consumption_tax: z.boolean().optional(),
    cargo_transportation: z.boolean().optional(),
    healthcare_company: z.boolean().optional(),
    customer_by_item: z.boolean().optional(),
  })
  .strict();

export const taxSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string(),
    type: z.string(),
    percentage: z.number(),
    active: z.boolean(),
  })
  .strict();

export const paymentTypeSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string(),
    type: z.enum(['Cartera', 'Proveedor', 'CarteraProveedor']),
    active: z.boolean(),
    due_date: z.boolean(),
  })
  .strict();

export const costCenterSchema = z
  .object({
    id: positiveIntegerSchema,
    code: z.string(),
    name: z.string(),
    active: z.boolean(),
  })
  .strict();

export const userSchema = z
  .object({
    id: positiveIntegerSchema,
    username: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    active: z.boolean(),
    identification: z.string(),
  })
  .strict();

export const warehouseSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string(),
    active: z.boolean(),
    has_movements: z.boolean().optional(),
  })
  .strict();

export const priceListSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string(),
    active: z.boolean(),
    position: positiveIntegerSchema,
  })
  .strict();

export const citySchema = z
  .object({
    CityID: z.string(),
    CountryCode: z.string(),
    CountryName: z.string(),
    StateCode: z.string(),
    StateName: z.string(),
    CityCode: z.string(),
    CityName: z.string(),
  })
  .strict();

export const idTypeSchema = z
  .object({
    code: z.string(),
    name: z.string(),
  })
  .strict();

export const fiscalResponsibilitySchema = z
  .object({
    code: z.string(),
    name: z.string(),
  })
  .strict();

export const fixedAssetSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string(),
    group: z.string(),
    active: z.boolean(),
  })
  .strict();

export const accountingConceptSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string(),
  })
  .strict();

export const documentTypeQuerySchema = z
  .object({
    type: documentTypeCodeSchema.optional().describe('Document type filter, such as FV, FC, RC, RP, CC, or DS'),
  })
  .strict();

export const paymentTypeQuerySchema = z
  .object({
    document_type: documentTypeCodeSchema.describe('Required document type filter, such as FV, FC, RC, or RP'),
  })
  .strict();

export const usersQuerySchema = paginationQuerySchema;
export const emptyCatalogQuerySchema = z.object({}).strict();

export const paginatedUsersResponseSchema = z
  .object({
    pagination: z
      .object({
        page: positiveIntegerSchema,
        page_size: positiveIntegerSchema,
        total_results: z.number().int().nonnegative(),
      })
      .strict(),
    results: z.array(userSchema),
    _links: linksSchema.optional(),
    __links: linksSchema.optional(),
  })
  .strict();

export const documentTypesResponseSchema = z.array(documentTypeSchema);
export const taxesResponseSchema = z.array(taxSchema);
export const paymentTypesResponseSchema = z.array(paymentTypeSchema);
export const costCentersResponseSchema = z.array(costCenterSchema);
export const warehousesResponseSchema = z.array(warehouseSchema);
export const priceListsResponseSchema = z.array(priceListSchema);
export const citiesResponseSchema = z.array(citySchema);
export const idTypesResponseSchema = z.array(idTypeSchema);
export const fiscalResponsibilitiesResponseSchema = z.array(fiscalResponsibilitySchema);
export const fixedAssetsResponseSchema = z.array(fixedAssetSchema);
export const expensesResponseSchema = z.array(accountingConceptSchema);
export const miscIncomeResponseSchema = z.array(accountingConceptSchema);
export const documentTypesToolOutputSchema = toolOutputSchema(documentTypesResponseSchema);
export const taxesToolOutputSchema = toolOutputSchema(taxesResponseSchema);
export const paymentTypesToolOutputSchema = toolOutputSchema(paymentTypesResponseSchema);
export const costCentersToolOutputSchema = toolOutputSchema(costCentersResponseSchema);
export const usersToolOutputSchema = toolOutputSchema(paginatedUsersResponseSchema);
export const warehousesToolOutputSchema = toolOutputSchema(warehousesResponseSchema);
export const priceListsToolOutputSchema = toolOutputSchema(priceListsResponseSchema);
export const fixedAssetsToolOutputSchema = toolOutputSchema(fixedAssetsResponseSchema);
export const expensesToolOutputSchema = toolOutputSchema(expensesResponseSchema);
export const miscIncomeToolOutputSchema = toolOutputSchema(miscIncomeResponseSchema);

export type DocumentTypeQuery = z.infer<typeof documentTypeQuerySchema>;
export type PaymentTypeQuery = z.infer<typeof paymentTypeQuerySchema>;
export type UsersQuery = z.infer<typeof usersQuerySchema>;
