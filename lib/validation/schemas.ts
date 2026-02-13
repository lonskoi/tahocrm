/**
 * Zod схемы валидации для всех API endpoints и форм
 */

import { z } from 'zod'

/**
 * Общие схемы
 */
export const emailSchema = z.string().email('Некорректный email')
export const passwordSchema = z.string().min(6, 'Пароль должен содержать минимум 6 символов')
export const cuidSchema = z.string().cuid('Некорректный ID')
export const dateSchema = z.string().datetime().or(z.date())

/**
 * Helpers: make fields optional and tolerant to empty strings.
 * Important: keep `undefined` when field is not provided (for PATCH partial updates).
 * For optional string-like fields we normalize "" -> null.
 */
const optionalText = (max: number, message?: string) =>
  z
    .string()
    .max(max, message ?? `Слишком длинное значение (max ${max})`)
    .transform(v => (v.trim() === '' ? null : v))
    .optional()
    .nullable()

const optionalEmail = z
  .string()
  .trim()
  .email('Некорректный email')
  .or(z.literal(''))
  .transform(v => (v === '' ? null : v))
  .optional()
  .nullable()

const optionalCuid = cuidSchema
  .or(z.literal(''))
  .transform(v => (v === '' ? null : v))
  .optional()
  .nullable()

const optionalDatetime = z
  .string()
  .trim()
  .datetime()
  .or(z.literal(''))
  .transform(v => (v === '' ? null : v))
  .optional()
  .nullable()

const businessTimestampsShape = {
  businessCreatedAt: optionalDatetime,
  businessUpdatedAt: optionalDatetime,
}

/**
 * Схемы для аутентификации
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Схемы для задач (Tasks)
 */
export const taskStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CONFIRMED',
  'CANCELLED',
])

export const createTaskSchema = z.object({
  title: optionalText(500, 'Название слишком длинное'),
  description: optionalText(5000, 'Описание слишком длинное'),
  assigneeId: optionalCuid,
  vehicleId: optionalCuid,
  orderId: optionalCuid,
  customerId: optionalCuid,
  dueDate: optionalDatetime,
  ...businessTimestampsShape,
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: taskStatusSchema.optional(),
})

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

/**
 * Схемы для поиска
 */
export const searchQuerySchema = z.object({
  q: z
    .string()
    .min(1, 'Поисковый запрос не может быть пустым')
    .max(200, 'Поисковый запрос слишком длинный'),
})

export type SearchQueryInput = z.infer<typeof searchQuerySchema>

/**
 * Схемы для заказов (Orders)
 */
export const orderStatusSchema = z.enum([
  'DRAFT',
  'IN_PROGRESS',
  'WAITING_PARTS',
  'WAITING_ACTIVATION',
  'COMPLETED',
  'CANCELLED',
])
export const orderTypeSchema = z.enum([
  'SKZI_REPLACEMENT',
  'CALIBRATION',
  'BATTERY_REPLACEMENT',
  'CARD_ISSUE',
  'CUSTOMER_ORDER',
  'OTHER',
])

export const createOrderSchema = z.object({
  number: optionalText(100, 'Номер заказа слишком длинный'),
  documentDate: optionalDatetime,
  type: orderTypeSchema.optional(),
  vehicleId: optionalCuid,
  tachographId: optionalCuid,
  description: optionalText(5000),
  comment: optionalText(5000),
  totalAmount: z.number().nonnegative('Сумма не может быть отрицательной').optional(),
  ...businessTimestampsShape,
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

/**
 * Схемы для транспортных средств (Vehicles)
 */
export const createVehicleSchema = z.object({
  govNumber: optionalText(20, 'Госномер слишком длинный'),
  vin: optionalText(17),
  color: optionalText(100),
  brand: optionalText(100),
  model: optionalText(100),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  ptsNumber: optionalText(100),
  category: z.enum(['N1', 'N2', 'N3', 'M1', 'M2', 'M3']).optional().nullable(),
  ecoClass: optionalText(100),
  ownerInn: z
    .string()
    .trim()
    .regex(/^\d{10}$|^\d{12}$/, 'ИНН должен содержать 10 или 12 цифр')
    .or(z.literal(''))
    .transform(v => (v === '' ? null : v))
    .optional()
    .nullable(),
  ownerName: optionalText(500),
  ownerAddress: optionalText(2000),
  mileage: z.number().int().nonnegative().optional().nullable(),
  tireSize: optionalText(200),
  notes: optionalText(5000),
  ...businessTimestampsShape,
})

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>

/**
 * Схемы для тахографов (Tachographs) / Оборудования
 */
export const equipmentTypeSchema = z.enum(['TACHOGRAPH', 'GLONASS', 'OTHER'])

export const createTachographSchema = z.object({
  type: equipmentTypeSchema.optional(),
  brand: optionalText(100),
  model: optionalText(100),
  serialNumber: optionalText(100),
  comment: optionalText(5000),
  vehicleId: optionalCuid,
  customerId: optionalCuid,
  skziId: optionalCuid,
  skziSerialNumber: optionalText(100), // Альтернатива skziId для ручного ввода номера
  batteryReplaced: z.boolean().optional(),
  w: optionalText(50),
  k: optionalText(50),
  l: optionalText(50),
  workDate: z
    .string()
    .optional()
    .transform(v => {
      if (!v || v === '') return null
      try {
        return new Date(v).toISOString()
      } catch {
        return null
      }
    })
    .nullable(),
  tireSize: optionalText(200),
  ...businessTimestampsShape,
})

export type CreateTachographInput = z.infer<typeof createTachographSchema>

export const updateTachographSchema = createTachographSchema.partial()
export type UpdateTachographInput = z.infer<typeof updateTachographSchema>

/**
 * Схемы для СКЗИ
 */
export const createSKZISchema = z.object({
  serialNumber: optionalText(100),
  activationDate: optionalDatetime,
  expiryDate: optionalDatetime,
  mchd: optionalText(200),
  isActive: z.boolean().optional(),
  ...businessTimestampsShape,
})

export type CreateSKZIInput = z.infer<typeof createSKZISchema>

/**
 * Схемы для тенантов (Tenants) - только для SUPER_ADMIN
 */
export const createTenantSchema = z.object({
  name: optionalText(500, 'Название слишком длинное'),
  inn: z
    .string()
    .trim()
    .regex(/^\d{10}$|^\d{12}$/, 'ИНН должен содержать 10 или 12 цифр')
    .or(z.literal(''))
    .transform(v => (v === '' ? null : v))
    .optional()
    .nullable(),
  email: optionalEmail,
  subscriptionPlan: z.string().optional(),
  maxUsers: z.number().int().positive().optional(),
})

export type CreateTenantInput = z.infer<typeof createTenantSchema>

export const updateTenantSchema = z.object({
  name: optionalText(500),
  inn: z
    .string()
    .trim()
    .regex(/^\d{10}$|^\d{12}$/)
    .or(z.literal(''))
    .transform(v => (v === '' ? null : v))
    .optional()
    .nullable(),
  email: optionalEmail,
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  blockedReason: optionalText(1000),
  subscriptionPlan: z.string().optional(),
  subscriptionEndDate: optionalDatetime,
  maxUsers: z.number().int().positive().optional(),
})

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>

/**
 * Схемы для пользователей (Users)
 */
export const userRoleSchema = z.enum([
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'MANAGER',
  'MASTER',
  'CARD_SPECIALIST',
  'DIRECTOR',
  'CLIENT',
])

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Имя обязательно').max(200),
  phone: z.string().max(20).optional().nullable(),
  role: userRoleSchema,
  roles: z.array(userRoleSchema).optional(),
  tenantId: cuidSchema.optional().nullable(),
  isActive: z.boolean().optional(),
  ...businessTimestampsShape,
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z
  .object({
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    name: z.string().min(1, 'Имя обязательно').max(200).optional(),
    phone: z.string().max(20).optional().nullable(),
    role: userRoleSchema.optional(),
    roles: z.array(userRoleSchema).optional(),
    isActive: z.boolean().optional(),
    ...businessTimestampsShape,
  })
  .partial()

export type UpdateUserInput = z.infer<typeof updateUserSchema>

/**
 * ==================== CRM Core Schemas ====================
 */
export const customerTypeSchema = z.enum(['COMPANY', 'SOLE_PROPRIETOR', 'INDIVIDUAL'])

export const createCustomerSchema = z.object({
  type: customerTypeSchema.optional(),
  name: optionalText(500),
  fullName: optionalText(1000),
  inn: optionalText(20),
  kpp: optionalText(20),
  ogrn: optionalText(30),
  okpo: optionalText(30),
  firstName: optionalText(100),
  lastName: optionalText(100),
  middleName: optionalText(100),
  passport: optionalText(200),
  address: optionalText(2000),
  addressComment: optionalText(5000),
  legalAddress: optionalText(2000),
  phone: optionalText(50),
  email: optionalEmail,
  comment: optionalText(5000),
  ...businessTimestampsShape,
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>

export const updateCustomerSchema = createCustomerSchema.partial()
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>

export const createContactSchema = z.object({
  customerId: cuidSchema,
  name: optionalText(500),
  position: optionalText(200),
  phone: optionalText(50),
  email: optionalEmail,
  comment: optionalText(5000),
  ...businessTimestampsShape,
})
export type CreateContactInput = z.infer<typeof createContactSchema>

export const updateContactSchema = createContactSchema.omit({ customerId: true }).partial()
export type UpdateContactInput = z.infer<typeof updateContactSchema>

export const createCustomerBankAccountSchema = z.object({
  customerId: cuidSchema,
  bik: optionalText(50),
  bankName: optionalText(500),
  bankAddress: optionalText(2000),
  corrAccount: optionalText(100),
  accountNumber: optionalText(100),
  comment: optionalText(5000),
  ...businessTimestampsShape,
})
export type CreateCustomerBankAccountInput = z.infer<typeof createCustomerBankAccountSchema>

export const updateCustomerBankAccountSchema = createCustomerBankAccountSchema
  .omit({ customerId: true })
  .partial()
export type UpdateCustomerBankAccountInput = z.infer<typeof updateCustomerBankAccountSchema>

export const updateCustomerAccessSchema = z.object({
  responsibleUserIds: z.array(cuidSchema).max(100).optional(),
})
export type UpdateCustomerAccessInput = z.infer<typeof updateCustomerAccessSchema>

export const driverCardRequestStatusSchema = z.enum([
  'DRAFT',
  'IN_WORK',
  'READY',
  'ISSUED',
  'CANCELLED',
])

export const driverCardRequestSchema = z.object({
  id: optionalCuid,
  status: driverCardRequestStatusSchema.optional(),
  driverFullName: optionalText(500),
  driverPhone: optionalText(50),
  applicationDate: optionalDatetime,
  receivedByDriverDate: optionalDatetime,
  expiryDate: optionalDatetime,
  cardNumber: optionalText(100),
  pinPackCodes: z.any().optional().nullable(),
  ...businessTimestampsShape,
})

export type DriverCardRequestInput = z.infer<typeof driverCardRequestSchema>

export const updateDriverCardRequestSchema = driverCardRequestSchema.partial()
export type UpdateDriverCardRequestInput = z.infer<typeof updateDriverCardRequestSchema>

// Extend vehicle schema with customerId binding
export const createVehicleCrmSchema = createVehicleSchema.extend({
  customerId: optionalCuid,
})
export type CreateVehicleCrmInput = z.infer<typeof createVehicleCrmSchema>

export const updateVehicleCrmSchema = createVehicleCrmSchema.partial()
export type UpdateVehicleCrmInput = z.infer<typeof updateVehicleCrmSchema>

// Extend order schema with customer/contact binding
export const createOrderCrmSchema = createOrderSchema.extend({
  customerId: optionalCuid,
  contactId: optionalCuid,
  status: orderStatusSchema.optional(),
  isPaid: z.boolean().optional(),
  isShipped: z.boolean().optional(),
  isDocumentsSigned: z.boolean().optional(),
  driverCards: z.array(driverCardRequestSchema).optional(),
})
export type CreateOrderCrmInput = z.infer<typeof createOrderCrmSchema>

export const updateOrderCrmSchema = createOrderCrmSchema.partial().extend({
  status: orderStatusSchema.optional(),
})
export type UpdateOrderCrmInput = z.infer<typeof updateOrderCrmSchema>

export const vatRateSchema = z.enum(['NONE', 'VAT_5', 'VAT_7', 'VAT_10', 'VAT_20', 'VAT_22'])

export const invoiceStatusSchema = z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'])

export const invoiceLineItemSchema = z.object({
  productId: optionalCuid,
  serviceId: optionalCuid,
  name: optionalText(500),
  quantity: z.number().positive().optional(),
  unit: optionalText(50),
  price: z.number().nonnegative().optional(),
  vatRate: vatRateSchema.optional(),
})

export const createInvoiceSchema = z.object({
  number: optionalText(100),
  updNumber: optionalText(100),
  orderId: optionalCuid,
  customerId: optionalCuid,
  issuerOrganizationId: optionalCuid,
  status: invoiceStatusSchema.optional(),
  issueDate: optionalDatetime,
  updDate: optionalDatetime,
  dueDate: optionalDatetime,
  paidDate: optionalDatetime,
  items: z.array(invoiceLineItemSchema).optional(),
  isPaid: z.boolean().optional(),
  isShipped: z.boolean().optional(),
  isDocumentsSigned: z.boolean().optional(),
  ...businessTimestampsShape,
})
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  isPaid: z.boolean().optional(),
  isShipped: z.boolean().optional(),
  isDocumentsSigned: z.boolean().optional(),
})
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>

export const createIssuerOrganizationSchema = z.object({
  name: optionalText(500),
  inn: optionalText(20),
  kpp: optionalText(20),
  ogrn: optionalText(30),
  address: optionalText(2000),
  phone: optionalText(50),
  email: optionalEmail,
  bankName: optionalText(500),
  bankBic: optionalText(50),
  bankAccount: optionalText(50),
  bankCorr: optionalText(50),
  isDefault: z.boolean().optional(),
  ...businessTimestampsShape,
})
export type CreateIssuerOrganizationInput = z.infer<typeof createIssuerOrganizationSchema>

export const updateIssuerOrganizationSchema = createIssuerOrganizationSchema.partial()
export type UpdateIssuerOrganizationInput = z.infer<typeof updateIssuerOrganizationSchema>

export const documentTypeSchema = z.enum([
  'INVOICE',
  'UPD',
  'ACT',
  'CALIBRATION_CERT',
  'INSTALLATION_ACT',
  'CONTRACT',
  'OTHER',
])

export const createDocumentSchema = z.object({
  type: documentTypeSchema.optional(),
  title: optionalText(500),
  fileUrl: optionalText(4000),
  fileName: optionalText(500),
  mimeType: optionalText(200),
  customerId: optionalCuid,
  orderId: optionalCuid,
  invoiceId: optionalCuid,
  vehicleId: optionalCuid,
  tachographId: optionalCuid,
  ...businessTimestampsShape,
})
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>

export const updateDocumentSchema = createDocumentSchema.partial()
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>

export const tenantUiModulesSchema = z.object({
  customers: z.boolean().optional(),
  vehicles: z.boolean().optional(),
  equipment: z.boolean().optional(),
  orders: z.boolean().optional(),
  invoices: z.boolean().optional(),
  documents: z.boolean().optional(),
  users: z.boolean().optional(),
  settings: z.boolean().optional(),
})

export const upsertTenantUiConfigSchema = z.object({
  modules: tenantUiModulesSchema,
})
export type UpsertTenantUiConfigInput = z.infer<typeof upsertTenantUiConfigSchema>

export const createCatalogItemSchema = z.object({
  name: optionalText(500),
  sku: optionalText(100),
  unit: optionalText(50),
  price: z.number().nonnegative().optional(),
  vatRate: vatRateSchema.optional(),
  isActive: z.boolean().optional(),
  ...businessTimestampsShape,
})
export type CreateCatalogItemInput = z.infer<typeof createCatalogItemSchema>

export const updateCatalogItemSchema = createCatalogItemSchema.partial()
export type UpdateCatalogItemInput = z.infer<typeof updateCatalogItemSchema>

/**
 * Схемы для блокировки тенанта
 */
export const blockTenantSchema = z.object({
  reason: z.string().min(1, 'Причина блокировки обязательна').max(1000, 'Причина слишком длинная'),
})

export type BlockTenantInput = z.infer<typeof blockTenantSchema>

/**
 * Схемы для ID параметров
 */
export const idParamSchema = z.object({
  id: cuidSchema,
})

export type IdParam = z.infer<typeof idParamSchema>

/**
 * Схемы для query параметров
 */
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .optional(),
})

export type PaginationInput = z.infer<typeof paginationSchema>
