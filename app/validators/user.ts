import vine from '@vinejs/vine'
import { Role } from '../enum/index.js'

export const userValidatorStore = vine.compile(vine.object({
    firstname: vine.string().trim(),
    lastname: vine.string().trim(),
    email: vine.string().email(),
    phone: vine.string().trim(),
    password: vine.string(),
    confirmPassword: vine.string(),
    role: vine.enum(Object.values(Role)),
    depotId: vine.number().nullable().optional(),
    isActive: vine.boolean().optional()
}))

export const userValidatorUpdate = vine.compile(vine.object({
    firstname: vine.string().trim().optional(),
    lastname: vine.string().trim().optional(),
    email: vine.string().email().optional(),
    phone: vine.string().trim().optional(),
    password: vine.string().optional().nullable(),
    confirmPassword: vine.string().optional().nullable(),
    role: vine.enum(Object.values(Role)).optional(),
    depotId: vine.number().optional().nullable(),
    isActive: vine.boolean().optional()
}))
