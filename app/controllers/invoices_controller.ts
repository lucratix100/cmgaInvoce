import type { HttpContext } from '@adonisjs/core/http'

import Invoice from '#models/invoice'
import { InvoiceStatus } from '../enum/index.js'
import Bl from '#models/bl'


export default class InvoicesController {
    async index({ request, response }: HttpContext) {
        try {
            const { status, search, startDate, endDate } = request.qs()
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
                } : null,
                order: invoice.order
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

            return response.json(invoices)
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


            return response.json(invoice)
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



            return response.json(invoice.bls)
        } catch (error) {
            console.error('Erreur getBls:', error)
            return response.status(404).json({ error: 'Facture non trouvée' })
        }
    }

    async getInvoiceByNumber(ctx: HttpContext) {
        const invoiceNumber = ctx.params.number
        try {
            const invoice = await Invoice.query()
                .where('invoice_number', invoiceNumber)
                .preload('customer')
                .first()

            if (!invoice) {
                return ctx.response.status(404).json({ message: 'Facture non trouvée.' })
            }
            const bl = await Bl.query().where('invoice_id', invoice.id).orderBy('id', 'desc').first()
            if (bl) {
                return {
                    invoice,
                    bl
                };
            }

            return { invoice, bl: null }
        } catch (error) {
            console.log(error)
            return ctx.response.status(500).json({ message: 'Erreur lors de la récupération de la facture.' })
        }
    }
    async get_invoice_statistics_by_month({ response }: HttpContext) {
        try {
            // Obtenir le mois et l'année courants
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0'); // +1 car les mois commencent à 0

            // Calculer le premier et dernier jour du mois courant
            const firstDayOfMonth = `${year}-${month}-01`;
            const lastDayOfMonth = new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0];

            // Requêtes pour obtenir les statistiques
            const totalResult = await Invoice.query()
                .whereBetween('date', [firstDayOfMonth, lastDayOfMonth])
                .count('* as total');

            const enAttenteResult = await Invoice.query()
                .where('status', InvoiceStatus.EN_ATTENTE)
                .whereBetween('date', [firstDayOfMonth, lastDayOfMonth])
                .count('* as total');

            const livreeResult = await Invoice.query()
                .where('status', InvoiceStatus.LIVREE)
                .whereBetween('date', [firstDayOfMonth, lastDayOfMonth])
                .count('* as total');

            const enCoursResult = await Invoice.query()
                .where('status', InvoiceStatus.EN_COURS)
                .whereBetween('date', [firstDayOfMonth, lastDayOfMonth])
                .count('* as total');

            // Extraire les valeurs numériques des résultats
            const total = Number(totalResult[0].$extras.total || 0);
            const enAttente = Number(enAttenteResult[0].$extras.total || 0);
            const livree = Number(livreeResult[0].$extras.total || 0);
            const enCours = Number(enCoursResult[0].$extras.total || 0);

            return response.json({
                period: `${month}/${year}`,
                total,
                enAttente,
                livree,
                enCours
            });
        } catch (error) {
            console.error('Erreur lors du calcul des statistiques:', error);
            return response.status(500).json({
                error: 'Erreur lors de la récupération des statistiques des factures'
            });
        }
    }
}



