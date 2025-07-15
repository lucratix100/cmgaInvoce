import vine from '@vinejs/vine'


export const depotValidator = vine.compile(vine.object({
    name: vine.string().trim(),
    needDoubleCheck: vine.boolean().optional(),
    isActive: vine.boolean().optional()
}))