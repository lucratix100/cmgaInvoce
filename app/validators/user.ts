import vine from '@vinejs/vine'
import { Role } from '../enum/index.js'

export const userValidator = vine.compile(vine.object({
    firstname: vine.string().trim(),
    lastname: vine.string().trim(),
    email: vine.string().email().optional(),
    phone: vine.string().trim(),
    password: vine.string(),
    role: vine.enum(Object.values(Role)),
    depotId: vine.number(),
    isActive: vine.boolean().optional()
}))

