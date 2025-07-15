import vine from '@vinejs/vine'

export const loginValidator = vine.compile(vine.object({
    phone: vine.string().mobile(),
    password: vine.string(),
}))
