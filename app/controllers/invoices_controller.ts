import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

import Invoice from '#models/invoice'
import { InvoiceStatus, Role } from '../enum/index.js'
import Bl from '#models/bl'
import Assignment from '#models/assignment'
import User from '#models/user'
import InvoiceReminder from '#models/invoice_reminder'
import Customer from '#models/customer'
import Depot from '#models/depot'
import UserActivityService from '#services/user_activity_service'
import NotificationService from '#services/notification_service'




export default class InvoicesController {

    async index({ request, response, auth }: HttpContext) {
        const user = await auth.authenticate()
        try {
            const { status, search, startDate, endDate } = request.qs()
            console.log(status, search, startDate, endDate, "status, search, startDate, endDate")
            let patterns: string[] = []
            // Si l'utilisateur est RECOUVREMENT, on récupère ses préfixes
            if (user.$original.role === Role.RECOUVREMENT) {
                const assignedInvoices = await Assignment
                    .query()
                    .where('user_id', user.$original.id)
                patterns = assignedInvoices.map(a => a.pattern)

                // Si l'utilisateur RECOUVREMENT n'a pas de patterns, retourner un tableau vide
                if (patterns.length === 0) {
                    return response.json([])
                }
            }
            let query = Invoice.query()
                .preload('customer')
                .preload('payments')
                .orderBy('date', 'desc')
            // Filtre sur le statut
            if (status && Object.values(InvoiceStatus).includes(status)) {
                query = query.where('status', status)
            }
            // Si pas ADMIN ou RECOUVREMENT, on filtre sur le dépôt
            if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                query = query.where('depot_id', user.$original.depotId)
            }
            // Filtrage par préfixes uniquement pour RECOUVREMENT
            if (user.$original.role === Role.RECOUVREMENT && patterns.length > 0) {
                query = query.where((builder) => {
                    patterns.forEach((prefix, index) => {
                        const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                        builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                    })
                })
            }


            // Filtrage par date
            if (startDate) {
                if (endDate) {
                    query = query
                        .whereRaw('DATE(date) >= ?', [startDate])
                        .whereRaw('DATE(date) <= ?', [endDate])
                } else {
                    query = query.whereRaw('DATE(date) = ?', [startDate])
                }
            }

            // Recherche texte
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

            const formattedInvoices = invoices.map(invoice => {
                const totalPaid = invoice.payments.reduce((acc, payment) => acc + Number(payment.amount), 0)
                const remainingAmount = Number(invoice.totalTTC) - totalPaid
                return {
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    accountNumber: invoice.accountNumber,
                    date: invoice.date,
                    status: invoice.status,
                    customer: invoice.customer ? {
                        name: invoice.customer.name,
                        phone: invoice.customer.phone
                    } : null,
                    order: invoice.order,
                    depotId: invoice.depotId,
                    statusPayment: invoice.statusPayment,
                    totalTtc: invoice.totalTTC,
                    remainingAmount: remainingAmount
                }
            })

            return response.json(formattedInvoices)
        } catch (error) {
            console.error('Erreur détaillée:', error)
            return response.status(500).json({
                error: 'Erreur lors de la récupération des factures'
            })
        }
    }

    async show(ctx: HttpContext) {
        const user = await ctx.auth.authenticate()
        let patterns: string[] = []
        // Si l'utilisateur est RECOUVREMENT, on récupère ses préfixes
        if (user.$original.role === Role.RECOUVREMENT) {
            const assignedInvoices = await Assignment
                .query()
                .where('user_id', user.$original.id)
            patterns = assignedInvoices.map(a => a.pattern)
            if (patterns.length === 0) {
                return ctx.response.json([])
            }
        }

        let query = Invoice.query()
        if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
            query = query.where('depot_id', user.$original.depotId)
        }
        if (user.$original.role === Role.RECOUVREMENT && patterns.length > 0) {
            query = query.where((builder) => {
                patterns.forEach((prefix, index) => {
                    const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                    builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                })
            })
        }
        const invoice = await query.where('id', ctx.params.id).first()
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
        const user = await ctx.auth.authenticate()
        let query = Invoice.query()
        if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
            query = query.where('depot_id', user.$original.depotId)
        }
        const invoice = await query.where('id', ctx.params.id).first()
        if (!invoice) {
            return ctx.response.status(404).json({ message: 'Invoice not found' })
        }
        invoice.merge(ctx.request.body())
        await invoice.save()
        return invoice
    }
    async destroy(ctx: HttpContext) {
        const user = await ctx.auth.authenticate()
        if (user.$original.role.includes(Role.ADMIN)) {
            const invoice = await Invoice.find(ctx.params.id)
            if (!invoice) {
                return ctx.response.status(404).json({ message: 'Invoice not found' })
            }
            await invoice.delete()
            return invoice
        }
    }
    async get_invoices_by_customer(ctx: HttpContext) {
        const user = await ctx.auth.authenticate()
        let patterns: string[] = []

        // Si l'utilisateur est RECOUVREMENT, on récupère ses préfixes
        if (user.$original.role === Role.RECOUVREMENT) {
            const assignedInvoices = await Assignment
                .query()
                .where('user_id', user.$original.id)

            patterns = assignedInvoices.map(a => a.pattern)
            if (patterns.length === 0) {
                return ctx.response.json([])
            }
        }
        let query = Invoice.query()
        if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
            query = query.where('depot_id', user.$original.depotId)
        }
        if (user.$original.role === Role.RECOUVREMENT && patterns.length > 0) {
            query = query.where((builder) => {
                patterns.forEach((prefix, index) => {
                    const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                    builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                })
            })
        }

        const invoices = await query.where('customer_id', ctx.params.id)
        return invoices
    }
    async get_invoices_by_depot(ctx: HttpContext) {
        const user = await ctx.auth.authenticate()
        let patterns: string[] = []


        try {
            // Si l'utilisateur est RECOUVREMENT, on récupère ses préfixes
            if (user.$original.role === Role.RECOUVREMENT) {
                const assignedInvoices = await Assignment
                    .query()
                    .where('user_id', user.$original.id)

                patterns = assignedInvoices.map(a => a.pattern)
                if (patterns.length === 0) {
                    return ctx.response.json([])
                }
            }

            let query = Invoice.query()
            if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                query = query.where('depot_id', user.$original.depotId)
            }
            if (user.$original.role === Role.RECOUVREMENT && patterns.length > 0) {
                query = query.where((builder) => {
                    patterns.forEach((prefix, index) => {
                        const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                        builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                    })
                })
            }
            const invoices = await query.where('depot_id', ctx.params.id)
            return invoices
        } catch (error) {
            console.error('Erreur détaillée:', error)
            return ctx.response.status(500).json({
                error: 'Erreur lors de la récupération des factures'
            })
        }
    }
    async get_invoices_by_status(ctx: HttpContext) {
        const user = await ctx.auth.authenticate()
        let patterns: string[] = []

        // Si l'utilisateur est RECOUVREMENT, on récupère ses préfixes
        if (user.$original.role === Role.RECOUVREMENT) {
            const assignedInvoices = await Assignment
                .query()
                .where('user_id', user.$original.id)

            patterns = assignedInvoices.map(a => a.pattern)
        }
        let query = Invoice.query()
        if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
            query = query.where('depot_id', user.$original.depotId)
        }
        if (user.$original.role === Role.RECOUVREMENT && patterns.length > 0) {
            query = query.where((builder) => {
                patterns.forEach((prefix, index) => {
                    const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                    builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                })
            })
        }
        const invoices = await query.where('status', ctx.params.status)
        return invoices
    }

    async get_invoice_by_date({ request, response, auth }: HttpContext) {
        const user = await auth.authenticate()
        let patterns: string[] = []

        // Si l'utilisateur est RECOUVREMENT, on récupère ses préfixes
        if (user.$original.role === Role.RECOUVREMENT) {
            const assignedInvoices = await Assignment
                .query()
                .where('user_id', user.$original.id)

            patterns = assignedInvoices.map(a => a.pattern)
            if (patterns.length === 0) {
                return response.json([])
            }
        }


        try {
            const { startDate, endDate } = request.qs()

            if (!startDate || !endDate) {
                return response.status(400).json({
                    error: 'Les dates de début et de fin sont requises'
                })
            }

            let query = Invoice.query()
                .preload('customer')
                .where('created_at', '>=', `${startDate} 00:00:00`)
                .where('created_at', '<=', `${endDate} 23:59:59`)
                .orderBy('created_at', 'desc')
            if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                query = query.where('depot_id', user.$original.depotId)
            }
            if (user.$original.role === Role.RECOUVREMENT && patterns.length > 0) {
                query = query.where((builder) => {
                    patterns.forEach((prefix, index) => {
                        const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                        builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                    })
                })
            }
            const invoices = await query

            return response.json(invoices)
        } catch (error) {
            console.error('Erreur détaillée:', error)
            return response.status(500).json({
                error: 'Erreur lors de la récupération des factures'
            })
        }
    }

    async get_invoice_by_invoice_number_and_depot(ctx: HttpContext) {
        const user = await ctx.auth.authenticate()
        let patterns: string[] = []

        // Si l'utilisateur est RECOUVREMENT, on récupère ses préfixes
        if (user.$original.role === Role.RECOUVREMENT) {
            const assignedInvoices = await Assignment
                .query()
                .where('user_id', user.$original.id)

            patterns = assignedInvoices.map(a => a.pattern)
            if (patterns.length === 0) {
                return ctx.response.json([])
            }
        }

        let query = Invoice.query()
        if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
            query = query.where('depot_id', user.$original.depotId)
        }
        if (user.$original.role === Role.RECOUVREMENT && patterns.length > 0) {
            query = query.where((builder) => {
                patterns.forEach((prefix, index) => {
                    const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                    builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                })
            })
        }
        const invoice = await query.where('invoice_number', ctx.params.invoice_number)
        return invoice
    }

    async get_invoice_by_invoice_number({ params, response, auth }: HttpContext) {
        console.log(params.invoice_number, "get_invoice_by_invoice_number")
        const user = await auth.authenticate()
        let patterns: string[] = []

        // Si l'utilisateur est RECOUVREMENT, on récupère ses préfixes
        if (user.$original.role === Role.RECOUVREMENT) {
            const assignedInvoices = await Assignment
                .query()
                .where('user_id', user.$original.id)

            patterns = assignedInvoices.map(a => a.pattern)
            if (patterns.length === 0) {
                return response.json([])
            }
        }

        try {
            let query = Invoice.query()
                .where('invoice_number', params.invoice_number)
                .preload('customer')
                .preload('depot')
            if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                query = query.where('depot_id', user.$original.depotId)
            }
            if (user.$original.role === Role.RECOUVREMENT && patterns.length > 0) {
                query = query.where((builder) => {
                    patterns.forEach((prefix, index) => {
                        const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                        builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                    })
                })
            }
            const invoice = await query.firstOrFail()
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

    async getBls({ params, response, auth }: HttpContext) {
        console.log(params.invoice_number, "getBls")
        const user = await auth.authenticate()
        let patterns: string[] = []

        // Si l'utilisateur est RECOUVREMENT, on récupère ses préfixes
        if (user.$original.role === Role.RECOUVREMENT) {
            const assignedInvoices = await Assignment
                .query()
                .where('user_id', user.$original.id)
            patterns = assignedInvoices.map(a => a.pattern)

            if (patterns.length === 0) {
                return response.json([])
            }
        }

        try {
            let query = Invoice.query()
                .where('invoice_number', params.invoice_number)

            if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                query = query.where('depot_id', user.$original.depotId)
            }

            if (user.$original.role === Role.RECOUVREMENT && patterns.length > 0) {
                query = query.where((builder) => {
                    patterns.forEach((prefix, index) => {
                        const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                        builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                    })
                })
            }

            query = query.preload('bls', (query) => {
                query.preload('driver').preload('user', (query) => {
                    query.select('firstname', 'lastname')
                })
                    .orderBy('created_at', 'desc')
            })

            const invoice = await query.firstOrFail()
            return response.json(invoice.bls)
        } catch (error) {
            console.error('Erreur getBls:', error)
            if (error.code === 'E_ROW_NOT_FOUND') {
                return response.status(404).json({ error: 'Facture non trouvée' })
            }
            return response.status(500).json({ error: 'Erreur lors de la récupération des BLs' })
        }
    }

    async getInvoiceByNumber(ctx: HttpContext) {
        const user = await ctx.auth.authenticate()

        const invoiceNumber = ctx.params.number
        try {
            let query = Invoice.query()
                .where('invoice_number', invoiceNumber)
            if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                query = query.where('depot_id', user.$original.depotId)
            }
            query = query.preload('customer')
            const invoice = await query.firstOrFail()

            if (!invoice) {
                return ctx.response.status(404).json({ message: 'Facture non trouvée.' })
            }
            const bl = await Bl.query().where('invoice_id', invoice.id).orderBy('id', 'desc').preload('driver').first()
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

    async get_invoice_by_scan(ctx: HttpContext) {
        
        const invoiceNumber = ctx.request.body().invoice_number
        
        const invoice = await Invoice.query().where('invoice_number', invoiceNumber).first()
 
        if (!invoice) {
            return ctx.response.status(404).json({ message: 'Facture non trouvée.' })
        }

        return invoice
    }

    async updateInvoiceStatusByNumber(ctx: HttpContext) {
        const user = await ctx.auth.authenticate()
        const invoiceNumber = ctx.params.invoice_number
        const { status } = ctx.request.body()

        try {
            let query = Invoice.query().where('invoice_number', invoiceNumber)
            
            if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                query = query.where('depot_id', user.$original.depotId)
            }
            
            const invoice = await query.preload('customer').first()
            
            if (!invoice) {
                return ctx.response.status(404).json({ message: 'Facture non trouvée.' })
            }

            const oldStatus = invoice.status
            invoice.status = status
            await invoice.save()

            // Enregistrer l'activité de mise à jour du statut
            let action: string = UserActivityService.ACTIONS.UPDATE_INVOICE
            if (status === InvoiceStatus.EN_ATTENTE) {
                action = UserActivityService.ACTIONS.SCAN_INVOICE
            } else if (status === InvoiceStatus.LIVREE) {
                action = UserActivityService.ACTIONS.DELIVER_INVOICE
            }

            await UserActivityService.logActivity(
                Number(user.id),
                action,
                user.role,
                invoice.id,
                {
                    invoiceNumber: invoice.invoiceNumber,
                    oldStatus,
                    newStatus: status
                }
            )

            return ctx.response.json({ message: 'Statut de facture mis à jour avec succès' })
        } catch (error) {
            console.error('Erreur lors de la mise à jour du statut:', error)
            return ctx.response.status(500).json({ message: 'Erreur lors de la mise à jour du statut.' })
        }
    }
}



