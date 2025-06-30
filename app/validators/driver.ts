import vine from '@vinejs/vine'

export const driverSchema = vine.compile(
    vine.object({
        firstname: vine.string().trim(),
        lastname: vine.string().trim(),
        phone: vine.string().trim(),
        isActive: vine.boolean().optional(),
    })
)