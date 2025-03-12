import type { HttpContext } from '@adonisjs/core/http'

import Invoice from '#models/invoice'

export default class InvoicesController {
    async index() {
        const invoices = await Invoice.all()
        return invoices
    }
    async show(ctx: HttpContext) {
        const invoice = await Invoice.find(ctx.params.id)
        if (!invoice) {
            return ctx.response.status(404).json({ message: 'Invoice not found' })
        }
        return invoice
    }
    async store(ctx: HttpContext) {
        const invoice = await Invoice.create(ctx.request.body())
        return invoice
    }
    async update(ctx: HttpContext) {
        const invoice = await Invoice.find(ctx.params.id)
        if (!invoice) {
            return ctx.response.status(404).json({ message: 'Invoice not found' })
        }
        invoice.merge(ctx.request.body())
        await invoice.save()
        return invoice
    }
    async destroy(ctx: HttpContext) {
        const invoice = await Invoice.find(ctx.params.id)
        if (!invoice) {
            return ctx.response.status(404).json({ message: 'Invoice not found' })
        }
        await invoice.delete()
        return invoice
    }
    async get_invoices_by_customer(ctx: HttpContext) {
        const invoices = await Invoice.query().where('customer_id', ctx.params.id)
        return invoices
    }
    async get_invoices_by_depot(ctx: HttpContext) {
        const invoices = await Invoice.query().where('depot_id', ctx.params.id)
        return invoices
    }
    async get_invoices_by_status(ctx: HttpContext) {
        const invoices = await Invoice.query().where('status', ctx.params.status)
        return invoices
    }
}
