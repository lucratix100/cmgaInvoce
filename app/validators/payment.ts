import vine from '@vinejs/vine'
import { PaymentMethod } from '../enum/index.js'

export const paymentValidator = vine.compile(
    vine.object({
        invoiceId: vine.number(),
        amount: vine.number(),
        paymentMethod: vine.enum(PaymentMethod),
        paymentDate: vine.date(),
        comment: vine.string().optional(),
    })
)