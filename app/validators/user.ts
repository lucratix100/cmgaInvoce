import vine from '@vinejs/vine'
import { Role } from '../enum/roles.js'

export const userValidator = vine.compile
    (vine.object({
        firstname: vine.string().minLength(3).maxLength(255),
        lastname: vine.string().minLength(3).maxLength(255),
        isActive: vine.boolean().optional(),
        phone: vine.string().maxLength(15),
        role: vine.enum(Role),
        email: vine.string().email().optional(),
        password: vine.string().maxLength(255),
        depotId: vine.number().optional(),
    }))

