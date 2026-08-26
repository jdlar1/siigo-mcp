import { z } from 'zod';
import {
  addressSchema,
  contactSchema,
  dateTimeSchema,
  listResponseSchema,
  metadataSchema,
  paginationQuerySchema,
  phoneSchema,
  positiveIntegerSchema,
  toolOutputSchema,
} from './common.js';

const customerDateFilterSchema = z.union([z.iso.date(), dateTimeSchema]);

export const customerTypeSchema = z.enum(['Customer', 'Supplier', 'Other']);
export const personTypeSchema = z.enum(['Person', 'Company']);
export const customerIdTypeSchema = z.enum(['13', '31', '22', '42', '50', 'R-00-PN', '91', '41', '47', '11', '43', '21', '12', '89', '48']);

const numericIdentificationTypes = new Set(['13', '31', '11']);
const customerIdentificationSchema = z
  .string()
  .min(1)
  .max(20)
  .regex(/^[A-Za-z0-9]+$/, 'identification must be alphanumeric without spaces or special characters');

export const customerListQuerySchema = paginationQuerySchema
  .extend({
    identification: z.string().min(1).max(50).optional().describe('Customer identification filter'),
    branch_office: z.number().int().min(0).max(999).optional().describe('Customer branch filter'),
    active: z.boolean().optional().describe('Filter by active status'),
    type: customerTypeSchema.optional().describe('Customer type filter'),
    person_type: personTypeSchema.optional().describe('Person or company filter'),
    created_start: customerDateFilterSchema.optional().describe('Created-at lower bound'),
    created_end: customerDateFilterSchema.optional().describe('Created-at upper bound'),
    date_start: customerDateFilterSchema.optional().describe('Date lower bound'),
    date_end: customerDateFilterSchema.optional().describe('Date upper bound'),
    updated_start: customerDateFilterSchema.optional().describe('Updated-at lower bound'),
    updated_end: customerDateFilterSchema.optional().describe('Updated-at upper bound'),
  })
  .strict();

const fiscalResponsibilitySchema = z
  .object({
    code: z.string().min(1).max(20),
    name: z.string().max(100).optional(),
  })
  .strict();

const customerCustomFieldSchema = z
  .object({
    key: z.string().min(1).max(50),
    value: z.string().max(64),
  })
  .strict();

const relatedUsersSchema = z
  .object({
    seller_id: positiveIntegerSchema.optional(),
    collector_id: positiveIntegerSchema.optional(),
  })
  .strict();

export const customerInputSchema = z
  .object({
    type: customerTypeSchema.optional(),
    person_type: personTypeSchema,
    id_type: customerIdTypeSchema,
    identification: customerIdentificationSchema,
    check_digit: z.string().regex(/^\d$/).optional(),
    name: z.array(z.string().min(1).max(100)).min(1).max(2),
    commercial_name: z.string().max(100).optional(),
    branch_office: z.number().int().min(0).max(999).optional(),
    active: z.boolean().optional(),
    vat_responsible: z.boolean().optional(),
    fiscal_responsibilities: z.array(fiscalResponsibilitySchema).min(1).optional(),
    address: addressSchema,
    phones: z.array(phoneSchema).optional(),
    contacts: z.array(contactSchema).min(1).max(10),
    comments: z.string().max(4000).optional(),
    related_users: relatedUsersSchema.optional(),
    custom_fields: z.array(customerCustomFieldSchema).optional(),
  })
  .strict()
  .superRefine((customer, context) => {
    const expectedNameCount = customer.person_type === 'Person' ? 2 : 1;
    if (customer.name.length !== expectedNameCount) {
      context.addIssue({
        code: 'custom',
        path: ['name'],
        message: `${customer.person_type} customers require ${expectedNameCount} name value${expectedNameCount === 1 ? '' : 's'}`,
      });
    }

    if (numericIdentificationTypes.has(customer.id_type) && !/^\d{3,13}$/.test(customer.identification)) {
      context.addIssue({
        code: 'custom',
        path: ['identification'],
        message: `${customer.id_type} identification must contain 3-13 digits`,
      });
    }

    customer.custom_fields?.forEach((field, index) => {
      if (field.key === 'CUCON' && field.value.length > 64) {
        context.addIssue({
          code: 'too_big',
          path: ['custom_fields', index, 'value'],
          maximum: 64,
          origin: 'string',
          inclusive: true,
          message: 'CUCON must be at most 64 characters',
        });
      }
    });
  });

export const customerReferenceSchema = z
  .object({
    identification: customerIdentificationSchema,
    branch_office: z.number().int().min(0).max(999).optional(),
  })
  .strict();

const customerResponseCitySchema = z
  .object({
    country_code: z.string(),
    country_name: z.string().optional(),
    state_code: z.string(),
    state_name: z.string().optional(),
    city_code: z.string(),
    city_name: z.string().optional(),
  })
  .passthrough();

const customerResponseAddressSchema = z
  .object({
    address: z.string(),
    city: customerResponseCitySchema,
    postal_code: z.string().optional(),
  })
  .passthrough();

export const customerOrInlineSchema = z.union([customerReferenceSchema, customerInputSchema]);

export const customerIdSchema = z.uuid().describe('Customer UUID');

export const customerIdInputSchema = z
  .object({
    id: customerIdSchema,
  })
  .strict();

export const customerCreateInputSchema = z
  .object({
    customer: customerInputSchema,
  })
  .strict();

export const customerUpdateInputSchema = z
  .object({
    id: customerIdSchema,
    customer: customerInputSchema,
  })
  .strict();

export const customerSearchSchema = z
  .object({
    identification: z.string().min(1).max(50).optional(),
    name: z.string().min(1).max(100).optional(),
    type: customerTypeSchema.optional(),
    page: paginationQuerySchema.shape.page,
    page_size: paginationQuerySchema.shape.page_size,
  })
  .strict();

export const customerResponseSchema = z
  .object({
    id: z.string().optional(),
    type: customerTypeSchema.optional(),
    person_type: personTypeSchema.optional(),
    id_type: z
      .object({
        code: z.string(),
        name: z.string(),
      })
      .passthrough()
      .optional(),
    identification: z.string().optional(),
    check_digit: z.string().optional(),
    name: z.array(z.string()).optional(),
    commercial_name: z.string().optional(),
    branch_office: z.number().int().optional(),
    active: z.boolean().optional(),
    vat_responsible: z.boolean().optional(),
    fiscal_responsibilities: z
      .array(
        z
          .object({
            code: z.string(),
            name: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    address: customerResponseAddressSchema.optional(),
    phones: z.array(phoneSchema).optional(),
    contacts: z.array(contactSchema).optional(),
    comments: z.string().optional(),
    related_users: relatedUsersSchema.optional(),
    custom_fields: z.array(customerCustomFieldSchema).optional(),
    metadata: metadataSchema.optional(),
  })
  .passthrough();

export const customerEntityToolOutputSchema = toolOutputSchema(customerResponseSchema);
export const customerListToolOutputSchema = toolOutputSchema(listResponseSchema(customerResponseSchema));
