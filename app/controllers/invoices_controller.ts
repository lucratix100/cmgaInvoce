import type { HttpContext } from '@adonisjs/core/http'

import Invoice from '#models/invoice'
import { InvoiceStatus } from '../enum/index.js'

export default class InvoicesController {
    async index({ request, response }: HttpContext) {
        try {
            const { status, search, startDate, endDate } = request.qs()
            console.log('Received query params:', { status, search, startDate, endDate })
            
            let query = Invoice.query()
                .preload('customer')
                .orderBy('date', 'desc')

            if (status && Object.values(InvoiceStatus).includes(status)) {
                query = query.where('status', status)
            }

            if (startDate) {
                if (endDate) {
                    query = query
                        .whereRaw('DATE(date) >= ?', [startDate])
                        .whereRaw('DATE(date) <= ?', [endDate])
                } else {
                    query = query.whereRaw('DATE(date) = ?', [startDate])
                }
                console.log('Filtering by date:', { startDate, endDate: endDate || 'same day' })
            }

            if (search) {
                query = query.where((builder) => {
                    builder
                        .where('invoice_number', 'LIKE', `%${search}%`)
                        .orWhere('account_number', 'LIKE', `%${search}%`)
                        .orWhereHas('customer', (customerQuery) => {
                            customerQuery
                                .where('name', 'LIKE', `%${search}%`)
                                .orWhere('phone', 'LIKE', `%${search}%`)
                        })
                })
            }

            const invoices = await query
            console.log(`Found ${invoices.length} invoices for date criteria:`, 
                startDate ? (endDate ? 'range' : 'single day') : 'no date filter')

            const formattedInvoices = invoices.map(invoice => ({
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                accountNumber: invoice.accountNumber,
                date: invoice.date,
                status: invoice.status,
                customer: invoice.customer ? {
                    name: invoice.customer.name,
                    phone: invoice.customer.phone
                } : null
            }))
            
            return response.json(formattedInvoices)
        } catch (error) {
            console.error('Erreur détaillée:', error)
            return response.status(500).json({
                error: 'Erreur lors de la récupération des factures'
            })
        }
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

    async get_invoice_by_date({ request, response }: HttpContext) {
        try {
            const { startDate, endDate } = request.qs()
            
            if (!startDate || !endDate) {
                return response.status(400).json({
                    error: 'Les dates de début et de fin sont requises'
                })
            }

            const invoices = await Invoice.query()
                .preload('customer')
                .where('created_at', '>=', `${startDate} 00:00:00`)
                .where('created_at', '<=', `${endDate} 23:59:59`)
                .orderBy('created_at', 'desc')

            const formattedInvoices = invoices.map(invoice => ({
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                accountNumber: invoice.accountNumber,
                date: invoice.date,
                status: invoice.status,
                customer: invoice.customer ? {
                    name: invoice.customer.name,
                    phone: invoice.customer.phone
                } : null
            }))
            
            return response.json(formattedInvoices)
        } catch (error) {
            console.error('Erreur détaillée:', error)
            return response.status(500).json({
                error: 'Erreur lors de la récupération des factures'
            })
        }
    }

    async get_invoice_by_invoice_number_and_depot(ctx: HttpContext) {
        const invoice = await Invoice.query().where('invoice_number', ctx.params.invoice_number).where('depot_id', ctx.params.depot_id)
        return invoice
    }

    async get_invoice_by_invoice_number({ params, response }: HttpContext) {
        try {
            const invoice = await Invoice.query()
                .where('invoice_number', params.invoice_number)
                .preload('customer')
                .preload('depot')
                .first()

            console.log('1. Raw invoice order:', invoice?.order)

            if (!invoice) {
                return response.status(404).json({
                    error: 'Facture non trouvée'
                })
            }

            let parsedOrder = []
            try {
                const orderData = typeof invoice.order === 'string' 
                    ? JSON.parse(invoice.order || '[]') 
                    : invoice.order

                console.log('2. Parsed order data:', orderData)

                parsedOrder = orderData.map((item: any) => {
                    console.log('3. Processing item:', item)
                    return {
                        reference: item._attributes?.reference || '',
                        designation: item._attributes?.designation || '',
                        quantity: Number(item._attributes?.quantite || 0),
                        unitPrice: Number(item._attributes?.prixUnitaire || 0),
                        totalHT: Number(item._attributes?.montantHT || 0)
                    }
                })

                console.log('4. Final parsed order:', parsedOrder)
            } catch (parseError) {
                console.error('5. Parse error:', parseError)
                parsedOrder = []
            }

            const formattedInvoice = {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                accountNumber: invoice.accountNumber,
                date: invoice.date,
                status: invoice.status,
                order: parsedOrder,
                customer: invoice.customer ? {
                    id: invoice.customer.id,
                    name: invoice.customer.name,
                    phone: invoice.customer.phone
                } : null,
                depot: invoice.depot ? {
                    id: invoice.depot.id,
                    name: invoice.depot.name
                } : null
            }

            console.log('6. Final formatted invoice:', formattedInvoice)
            return response.json(formattedInvoice)
        } catch (error) {
            console.error('7. Final error:', error)
            return response.status(500).json({
                error: 'Erreur lors de la récupération de la facture'
            })
        }
    }

    async getBls({ params, response }: HttpContext) {
        try {
            const invoice = await Invoice.query()
                .where('invoice_number', params.invoice_number)
                .preload('bls', (query) => {
                    query.preload('driver')
                        .orderBy('created_at', 'desc')
                })
                .firstOrFail()

            const formattedBls = invoice.bls.map(bl => ({
                id: bl.id,
                createdAt: bl.createdAt,
                status: bl.status,
                driver: bl.driver ? {
                    firstname: bl.driver.firstname,
                    lastname: bl.driver.lastname,
                    phone: bl.driver.phone
                } : null,
                products: typeof bl.products === 'string' 
                    ? JSON.parse(bl.products).map((product: any) => ({
                        reference: product.reference || '',
                        designation: product.name || '',
                        quantite: Number(product.quantite || 0),
                        remainingQty: Number(product.remainingQty || 0)
                      }))
                    : bl.products || []
            }))

            return response.json(formattedBls)
        } catch (error) {
            console.error('Erreur getBls:', error)
            return response.status(404).json({ error: 'Facture non trouvée' })
        }
    }
}