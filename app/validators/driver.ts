import vine from '@vinejs/vine'

export const driverSchema = vine.compile(
    vine.object({
        firstName: vine.string().minLength(3).maxLength(255),
        lastName: vine.string().minLength(3).maxLength(255),
        phone: vine.string().minLength(9).maxLength(15),
        isActive: vine.boolean().optional(),
    })
)