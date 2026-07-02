import vine from '@vinejs/vine'
import { CommercialClientType, CommercialExecutionStatus, CommercialPlanningDay } from '../enum/index.js'

export const commercialClientValidator = vine.compile(
  vine.object({
    name: vine.string().trim(),
    type: vine.enum(Object.values(CommercialClientType)),
    phone: vine.string().trim().nullable().optional(),
    address: vine.string().trim().nullable().optional(),
    email: vine.string().email().nullable().optional(),
    accountNumber: vine.string().trim().nullable().optional(),
    contactName: vine.string().trim().nullable().optional(),
    notes: vine.string().trim().nullable().optional(),
    isActive: vine.boolean().optional(),
  })
)

export const commercialClientLocationValidator = vine.compile(
  vine.object({
    commercialClientId: vine.number(),
    name: vine.string().trim(),
    address: vine.string().trim().nullable().optional(),
    phone: vine.string().trim().nullable().optional(),
    phone2: vine.string().trim().nullable().optional(),
    email: vine.string().email().nullable().optional(),
    responsable: vine.string().trim().nullable().optional(),
    notes: vine.string().trim().nullable().optional(),
    isActive: vine.boolean().optional(),
  })
)

export const commercialAssignmentValidator = vine.compile(
  vine.object({
    agentId: vine.number(),
    commercialClientId: vine.number().nullable().optional(),
    commercialClientLocationId: vine.number().nullable().optional(),
    note: vine.string().trim().nullable().optional(),
    isActive: vine.boolean().optional(),
  })
)

export const commercialPlanningValidator = vine.compile(
  vine.object({
    agentId: vine.number(),
    commercialClientId: vine.number().nullable().optional(),
    commercialClientLocationId: vine.number().nullable().optional(),
    dayOfWeek: vine.enum(Object.values(CommercialPlanningDay)),
    sortOrder: vine.number().optional(),
    instructions: vine.string().trim().nullable().optional(),
    isActive: vine.boolean().optional(),
  })
)

export const commercialTransferValidator = vine.compile(
  vine.object({
    fromAgentId: vine.number(),
    toAgentId: vine.number(),
    transferPortfolio: vine.boolean(),
    transferPlanning: vine.boolean(),
    note: vine.string().trim().nullable().optional(),
  })
)

export const commercialProductValidator = vine.compile(
  vine.object({
    name: vine.string().trim(),
  })
)

export const commercialPersonalClientValidator = vine.compile(
  vine.object({
    name: vine.string().trim(),
    phone: vine.string().trim(),
    address: vine.string().trim().nullable().optional(),
    email: vine.string().email().nullable().optional(),
    accountNumber: vine.string().trim(),
    contactName: vine.string().trim().nullable().optional(),
    notes: vine.string().trim().nullable().optional(),
    isActive: vine.boolean().optional(),
  })
)

export const commercialPersonalOrderValidator = vine.compile(
  vine.object({
    personalClientId: vine.number().nullable().optional(),
    client: vine
      .object({
        name: vine.string().trim(),
        phone: vine.string().trim(),
        address: vine.string().trim().nullable().optional(),
        email: vine.string().email().nullable().optional(),
        accountNumber: vine.string().trim(),
        contactName: vine.string().trim().nullable().optional(),
        notes: vine.string().trim().nullable().optional(),
      })
      .optional(),
    comment: vine.string().trim().nullable().optional(),
    orderLines: vine.array(
      vine.object({
        productId: vine.number(),
        quantity: vine.number(),
      })
    ),
  })
)

export const commercialExecutionLogValidator = vine.compile(
  vine.object({
    planningItemId: vine.number().nullable().optional(),
    status: vine.enum(Object.values(CommercialExecutionStatus)),
    comment: vine.string().trim().nullable().optional(),
    orderTaken: vine.boolean().optional(),
    nextFollowUpAt: vine.string().trim().nullable().optional(),
  })
)

export const commercialImportValidator = vine.compile(
  vine.object({
    fileName: vine.string().trim().nullable().optional(),
    rows: vine.array(
      vine.object({
        name: vine.string().trim(),
        type: vine.enum(Object.values(CommercialClientType)),
        phone: vine.string().trim().nullable().optional(),
        address: vine.string().trim().nullable().optional(),
        email: vine.string().trim().nullable().optional(),
        accountNumber: vine.string().trim().nullable().optional(),
        contactName: vine.string().trim().nullable().optional(),
        notes: vine.string().trim().nullable().optional(),
        locationName: vine.string().trim().nullable().optional(),
        locationAddress: vine.string().trim().nullable().optional(),
        locationPhone: vine.string().trim().nullable().optional(),
        locationResponsable: vine.string().trim().nullable().optional(),
      })
    ),
  })
)
