import type { HttpContext } from '@adonisjs/core/http'
import { InvoiceStatus, InvoicePaymentStatus, Role } from '../enum/index.js'
import Invoice from '#models/invoice'
import Assignment from '#models/assignment'
import DepotAssignment from '#models/depot_assignment'
import Bl from '#models/bl'
import UserActivityService from '#services/user_activity_service'
import NotificationService from '#services/notification_service'
import { DateTime } from 'luxon'




export default class InvoicesController {

    async index({ request, response, auth }: HttpContext) {
        const user = await auth.authenticate()
        try {
            const { status, search, startDate, endDate, depot } = request.qs()
            console.log(status, search, startDate, endDate, depot, "status, search, startDate, endDate, depot")

            let patterns: string[] = []
            let assignedDepots: number[] = []

            // Si l'utilisateur est RECOUVREMENT, on récupère ses affectations
            if (user.$original.role === Role.RECOUVREMENT) {
                // 1. Vérifier d'abord les affectations par dépôt (priorité)
                const depotAssignments = await DepotAssignment.query()
                    .where('user_id', user.$original.id)
                    .where('is_active', true)

                assignedDepots = depotAssignments.map(da => da.depotId)

                // 2. Récupérer les affectations par racine (pour la logique de filtrage)
                const assignedInvoices = await Assignment
                    .query()
                    .where('user_id', user.$original.id)
                    .where('is_active', true)
                patterns = assignedInvoices.map(a => a.pattern)

                // Si l'utilisateur RECOUVREMENT n'a aucune affectation, retourner un tableau vide
                if (assignedDepots.length === 0 && patterns.length === 0) {
                    return response.json({
                        invoices: [],
                        statistics: {
                            total: { count: 0, amount: 0 },
                            byStatus: {}
                        }
                    })
                }
            }

            let query = Invoice.query()
                .preload('customer')
                .preload('payments')
                .preload('depot')
                .orderBy('date', 'desc')
                .whereHas('depot', (depotQuery) => {
                    depotQuery.where('isActive', true)
                })

            // Filtre sur le statut
            if (status && Object.values(InvoiceStatus).includes(status)) {
                query = query.where('status', status)
            }

            // Filtrage par dépôt
            if (depot && depot !== 'tous') {
                query = query.where('depot_id', depot)
            } else if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                // Si pas ADMIN ou RECOUVREMENT, on filtre sur le dépôt de l'utilisateur
                query = query.where('depot_id', user.$original.depotId)
            }

            // Filtrage par affectations (dépôt en priorité, puis racine avec exclusion des dépôts affectés)
            if (user.$original.role === Role.RECOUVREMENT) {
                if (assignedDepots.length > 0) {
                    // Priorité aux affectations par dépôt
                    query = query.whereIn('depot_id', assignedDepots)
                } else if (patterns.length > 0) {
                    // Si pas d'affectation par dépôt, utiliser les patterns de racine
                    // MAIS exclure les factures qui sont dans des dépôts affectés à d'autres utilisateurs

                    // Récupérer tous les dépôts affectés à d'autres utilisateurs
                    const allDepotAssignments = await DepotAssignment.query()
                        .where('is_active', true)
                        .whereNot('user_id', user.$original.id)

                    const excludedDepotIds = allDepotAssignments.map(da => da.depotId)

                    query = query.where((builder) => {
                        // Appliquer les patterns de racine
                        patterns.forEach((prefix, index) => {
                            const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                            builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                        })

                        // Exclure les factures dans les dépôts affectés à d'autres utilisateurs
                        if (excludedDepotIds.length > 0) {
                            builder.whereNotIn('depot_id', excludedDepotIds)
                        }
                    })
                }
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
                .preload('customer')
                .preload('payments')
                .preload('bls', (blQuery) => {
                    blQuery.preload('driver')
                        .orderBy('created_at', 'desc')
                })

            const formattedInvoices = invoices.map(invoice => {
                const totalPaid = invoice.payments.reduce((acc, payment) => acc + Number(payment.amount), 0)
                const remainingAmount = Number(invoice.totalTTC) - totalPaid
                
                // Récupérer le dernier BL validé
                const lastValidatedBl = invoice.bls && invoice.bls.length > 0
                    ? invoice.bls
                        .filter(bl => bl.status === 'validée')
                        .sort((a, b) => {
                            const dateA = a.createdAt ? a.createdAt.toMillis() : 0
                            const dateB = b.createdAt ? b.createdAt.toMillis() : 0
                            return dateB - dateA
                        })[0]
                    : null
                
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
                    deliveredAt: invoice.deliveredAt,
                    lastValidatedBl: lastValidatedBl ? {
                        id: lastValidatedBl.id,
                        createdAt: lastValidatedBl.createdAt.toISO(),
                        driver: lastValidatedBl.driver ? {
                            firstname: lastValidatedBl.driver.firstname,
                            lastname: lastValidatedBl.driver.lastname
                        } : null
                    } : null,
                    remainingAmount: invoice.status === InvoiceStatus.RETOUR ? invoice.totalTTC : remainingAmount
                }
            })

            // Calcul des statistiques
            const totalAmount = formattedInvoices.reduce((acc, invoice) => acc + Number(invoice.totalTtc || 0), 0)
            const totalCount = formattedInvoices.length

            // Statistiques par statut - inclure tous les états même avec 0 factures
            const statsByStatus = Object.values(InvoiceStatus).reduce((acc, status) => {
                const invoicesByStatus = formattedInvoices.filter(invoice => invoice.status === status)
                const count = invoicesByStatus.length
                const amount = invoicesByStatus.reduce((sum, invoice) => sum + Number(invoice.totalTtc || 0), 0)

                acc[status] = {
                    count,
                    amount
                }
                return acc
            }, {} as Record<string, { count: number; amount: number }>)

            return response.json({
                invoices: formattedInvoices,
                statistics: {
                    total: {
                        count: totalCount,
                        amount: totalAmount
                    },
                    byStatus: statsByStatus
                }
            })
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
        let assignedDepots: number[] = []

        // Si l'utilisateur est RECOUVREMENT, on récupère ses affectations
        if (user.$original.role === Role.RECOUVREMENT) {
            // 1. Vérifier d'abord les affectations par dépôt (priorité)
            const depotAssignments = await DepotAssignment.query()
                .where('user_id', user.$original.id)
                .where('is_active', true)

            assignedDepots = depotAssignments.map(da => da.depotId)

            // 2. Récupérer les affectations par racine
            const assignedInvoices = await Assignment
                .query()
                .where('user_id', user.$original.id)
                .where('is_active', true)
            patterns = assignedInvoices.map(a => a.pattern)

            // Si l'utilisateur RECOUVREMENT n'a aucune affectation, retourner un tableau vide
            if (assignedDepots.length === 0 && patterns.length === 0) {
                return ctx.response.json([])
            }
        }

        let query = Invoice.query()
            .whereHas('depot', (depotQuery) => {
                depotQuery.where('isActive', true)
            })
        if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
            query = query.where('depot_id', user.$original.depotId)
        }

        // Filtrage par affectations (dépôt en priorité, puis racine avec exclusion des dépôts affectés)
        if (user.$original.role === Role.RECOUVREMENT) {
            if (assignedDepots.length > 0) {
                // Priorité aux affectations par dépôt
                query = query.whereIn('depot_id', assignedDepots)
            } else if (patterns.length > 0) {
                // Si pas d'affectation par dépôt, utiliser les patterns de racine
                // MAIS exclure les factures qui sont dans des dépôts affectés à d'autres utilisateurs

                // Récupérer tous les dépôts affectés à d'autres utilisateurs
                const allDepotAssignments = await DepotAssignment.query()
                    .where('is_active', true)
                    .whereNot('user_id', user.$original.id)

                const excludedDepotIds = allDepotAssignments.map(da => da.depotId)

                query = query.where((builder) => {
                    // Appliquer les patterns de racine
                    patterns.forEach((prefix, index) => {
                        const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                        builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                    })

                    // Exclure les factures dans les dépôts affectés à d'autres utilisateurs
                    if (excludedDepotIds.length > 0) {
                        builder.whereNotIn('depot_id', excludedDepotIds)
                    }
                })
            }
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
        try {
            let query = Invoice.query()
                .whereHas('depot', (depotQuery) => {
                    depotQuery.where('isActive', true)
                })
            if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                query = query.where('depot_id', user.$original.depotId)
            }
            const invoice = await query.where('id', ctx.params.id).first()
            if (!invoice) {
                return ctx.response.status(404).json({ message: 'Invoice not found' })
            }
            if (ctx.request.body().status.toUpperCase() === InvoiceStatus.ANNULEE) {
                invoice.merge({ status: InvoiceStatus.ANNULEE, totalTTC: 0, statusPayment: InvoicePaymentStatus.NON_PAYE })
            }

            invoice.merge(ctx.request.body())

            await invoice.save()
            return invoice
        } catch (error) {
            console.error('Erreur détaillée:', error)
            return ctx.response.status(500).json({
                error: 'Erreur lors de la mise à jour de la facture'
            })
        }
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
        let assignedDepots: number[] = []

        // Si l'utilisateur est RECOUVREMENT, on récupère ses affectations
        if (user.$original.role === Role.RECOUVREMENT) {
            // 1. Vérifier d'abord les affectations par dépôt (priorité)
            const depotAssignments = await DepotAssignment.query()
                .where('user_id', user.$original.id)
                .where('is_active', true)

            assignedDepots = depotAssignments.map(da => da.depotId)

            // 2. Récupérer les affectations par racine
            const assignedInvoices = await Assignment
                .query()
                .where('user_id', user.$original.id)
                .where('is_active', true)

            patterns = assignedInvoices.map(a => a.pattern)

            // Si l'utilisateur RECOUVREMENT n'a aucune affectation, retourner un tableau vide
            if (assignedDepots.length === 0 && patterns.length === 0) {
                return ctx.response.json([])
            }
        }

        let query = Invoice.query()
            .whereHas('depot', (depotQuery) => {
                depotQuery.where('isActive', true)
            })
        if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
            query = query.where('depot_id', user.$original.depotId)
        }

        // Filtrage par affectations (dépôt en priorité, puis racine avec exclusion des dépôts affectés)
        if (user.$original.role === Role.RECOUVREMENT) {
            if (assignedDepots.length > 0) {
                // Priorité aux affectations par dépôt
                query = query.whereIn('depot_id', assignedDepots)
            } else if (patterns.length > 0) {
                // Si pas d'affectation par dépôt, utiliser les patterns de racine
                // MAIS exclure les factures qui sont dans des dépôts affectés à d'autres utilisateurs

                // Récupérer tous les dépôts affectés à d'autres utilisateurs
                const allDepotAssignments = await DepotAssignment.query()
                    .where('is_active', true)
                    .whereNot('user_id', user.$original.id)

                const excludedDepotIds = allDepotAssignments.map(da => da.depotId)

                query = query.where((builder) => {
                    // Appliquer les patterns de racine
                    patterns.forEach((prefix, index) => {
                        const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                        builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                    })

                    // Exclure les factures dans les dépôts affectés à d'autres utilisateurs
                    if (excludedDepotIds.length > 0) {
                        builder.whereNotIn('depot_id', excludedDepotIds)
                    }
                })
            }
        }

        const invoices = await query.where('customer_id', ctx.params.id)
        return invoices
    }
    async get_invoices_by_depot(ctx: HttpContext) {
        const user = await ctx.auth.authenticate()
        let patterns: string[] = []
        let assignedDepots: number[] = []

        try {
            // Si l'utilisateur est RECOUVREMENT, on récupère ses affectations
            if (user.$original.role === Role.RECOUVREMENT) {
                // 1. Vérifier d'abord les affectations par dépôt (priorité)
                const depotAssignments = await DepotAssignment.query()
                    .where('user_id', user.$original.id)
                    .where('is_active', true)

                assignedDepots = depotAssignments.map(da => da.depotId)

                // 2. Récupérer les affectations par racine
                const assignedInvoices = await Assignment
                    .query()
                    .where('user_id', user.$original.id)
                    .where('is_active', true)

                patterns = assignedInvoices.map(a => a.pattern)

                // Si l'utilisateur RECOUVREMENT n'a aucune affectation, retourner un tableau vide
                if (assignedDepots.length === 0 && patterns.length === 0) {
                    return ctx.response.json([])
                }
            }

            let query = Invoice.query()
                .whereHas('depot', (depotQuery) => {
                    depotQuery.where('isActive', true)
                })
            if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                query = query.where('depot_id', user.$original.depotId)
            }

            // Filtrage par affectations (dépôt en priorité, puis racine avec exclusion des dépôts affectés)
            if (user.$original.role === Role.RECOUVREMENT) {
                if (assignedDepots.length > 0) {
                    // Priorité aux affectations par dépôt
                    query = query.whereIn('depot_id', assignedDepots)
                } else if (patterns.length > 0) {
                    // Si pas d'affectation par dépôt, utiliser les patterns de racine
                    // MAIS exclure les factures qui sont dans des dépôts affectés à d'autres utilisateurs

                    // Récupérer tous les dépôts affectés à d'autres utilisateurs
                    const allDepotAssignments = await DepotAssignment.query()
                        .where('is_active', true)
                        .whereNot('user_id', user.$original.id)

                    const excludedDepotIds = allDepotAssignments.map(da => da.depotId)

                    query = query.where((builder) => {
                        // Appliquer les patterns de racine
                        patterns.forEach((prefix, index) => {
                            const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                            builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                        })

                        // Exclure les factures dans les dépôts affectés à d'autres utilisateurs
                        if (excludedDepotIds.length > 0) {
                            builder.whereNotIn('depot_id', excludedDepotIds)
                        }
                    })
                }
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
        let assignedDepots: number[] = []

        // Si l'utilisateur est RECOUVREMENT, on récupère ses affectations
        if (user.$original.role === Role.RECOUVREMENT) {
            // 1. Vérifier d'abord les affectations par dépôt (priorité)
            const depotAssignments = await DepotAssignment.query()
                .where('user_id', user.$original.id)
                .where('is_active', true)

            assignedDepots = depotAssignments.map(da => da.depotId)

            // 2. Récupérer les affectations par racine
            const assignedInvoices = await Assignment
                .query()
                .where('user_id', user.$original.id)
                .where('is_active', true)

            patterns = assignedInvoices.map(a => a.pattern)

            // Si l'utilisateur RECOUVREMENT n'a aucune affectation, retourner un tableau vide
            if (assignedDepots.length === 0 && patterns.length === 0) {
                return ctx.response.json([])
            }
        }

        let query = Invoice.query()
            .whereHas('depot', (depotQuery) => {
                depotQuery.where('isActive', true)
            })
        if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
            query = query.where('depot_id', user.$original.depotId)
        }

        // Filtrage par affectations (dépôt en priorité, puis racine avec exclusion des dépôts affectés)
        if (user.$original.role === Role.RECOUVREMENT) {
            if (assignedDepots.length > 0) {
                // Priorité aux affectations par dépôt
                query = query.whereIn('depot_id', assignedDepots)
            } else if (patterns.length > 0) {
                // Si pas d'affectation par dépôt, utiliser les patterns de racine
                // MAIS exclure les factures qui sont dans des dépôts affectés à d'autres utilisateurs

                // Récupérer tous les dépôts affectés à d'autres utilisateurs
                const allDepotAssignments = await DepotAssignment.query()
                    .where('is_active', true)
                    .whereNot('user_id', user.$original.id)

                const excludedDepotIds = allDepotAssignments.map(da => da.depotId)

                query = query.where((builder) => {
                    // Appliquer les patterns de racine
                    patterns.forEach((prefix, index) => {
                        const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                        builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                    })

                    // Exclure les factures dans les dépôts affectés à d'autres utilisateurs
                    if (excludedDepotIds.length > 0) {
                        builder.whereNotIn('depot_id', excludedDepotIds)
                    }
                })
            }
        }

        const invoices = await query.where('status', ctx.params.status)
        return invoices
    }

    async get_invoice_by_date({ request, response, auth }: HttpContext) {
        const user = await auth.authenticate()
        let patterns: string[] = []
        let assignedDepots: number[] = []

        // Si l'utilisateur est RECOUVREMENT, on récupère ses affectations
        if (user.$original.role === Role.RECOUVREMENT) {
            // 1. Vérifier d'abord les affectations par dépôt (priorité)
            const depotAssignments = await DepotAssignment.query()
                .where('user_id', user.$original.id)
                .where('is_active', true)

            assignedDepots = depotAssignments.map(da => da.depotId)

            // 2. Récupérer les affectations par racine
            const assignedInvoices = await Assignment
                .query()
                .where('user_id', user.$original.id)
                .where('is_active', true)

            patterns = assignedInvoices.map(a => a.pattern)

            // Si l'utilisateur RECOUVREMENT n'a aucune affectation, retourner un tableau vide
            if (assignedDepots.length === 0 && patterns.length === 0) {
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
                .whereHas('depot', (depotQuery) => {
                    depotQuery.where('isActive', true)
                })
                .where('created_at', '>=', `${startDate} 00:00:00`)
                .where('created_at', '<=', `${endDate} 23:59:59`)

            if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                query = query.where('depot_id', user.$original.depotId)
            }

            // Filtrage par affectations (dépôt en priorité, puis racine avec exclusion des dépôts affectés)
            if (user.$original.role === Role.RECOUVREMENT) {
                if (assignedDepots.length > 0) {
                    // Priorité aux affectations par dépôt
                    query = query.whereIn('depot_id', assignedDepots)
                } else if (patterns.length > 0) {
                    // Si pas d'affectation par dépôt, utiliser les patterns de racine
                    // MAIS exclure les factures qui sont dans des dépôts affectés à d'autres utilisateurs

                    // Récupérer tous les dépôts affectés à d'autres utilisateurs
                    const allDepotAssignments = await DepotAssignment.query()
                        .where('is_active', true)
                        .whereNot('user_id', user.$original.id)

                    const excludedDepotIds = allDepotAssignments.map(da => da.depotId)

                    query = query.where((builder) => {
                        // Appliquer les patterns de racine
                        patterns.forEach((prefix, index) => {
                            const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                            builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                        })

                        // Exclure les factures dans les dépôts affectés à d'autres utilisateurs
                        if (excludedDepotIds.length > 0) {
                            builder.whereNotIn('depot_id', excludedDepotIds)
                        }
                    })
                }
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
            .whereHas('depot', (depotQuery) => {
                depotQuery.where('isActive', true)
            })
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
        let assignedDepots: number[] = []

        // Si l'utilisateur est RECOUVREMENT, on récupère ses affectations
        if (user.$original.role === Role.RECOUVREMENT) {
            // 1. Vérifier d'abord les affectations par dépôt (priorité)
            const depotAssignments = await DepotAssignment.query()
                .where('user_id', user.$original.id)
                .where('is_active', true)

            assignedDepots = depotAssignments.map(da => da.depotId)

            // 2. Récupérer les affectations par racine
            const assignedInvoices = await Assignment
                .query()
                .where('user_id', user.$original.id)
                .where('is_active', true)

            patterns = assignedInvoices.map(a => a.pattern)

            // Si l'utilisateur RECOUVREMENT n'a aucune affectation, retourner un tableau vide
            if (assignedDepots.length === 0 && patterns.length === 0) {
                return response.json([])
            }
        }

        try {
            let query = Invoice.query()
                .where('invoice_number', params.invoice_number)
                .preload('customer')
                .preload('depot')
                .whereHas('depot', (depotQuery) => {
                    depotQuery.where('isActive', true)
                })
            if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                query = query.where('depot_id', user.$original.depotId)
            }

            // Filtrage par affectations (dépôt en priorité, puis racine avec exclusion des dépôts affectés)
            if (user.$original.role === Role.RECOUVREMENT) {
                if (assignedDepots.length > 0) {
                    // Priorité aux affectations par dépôt
                    query = query.whereIn('depot_id', assignedDepots)
                } else if (patterns.length > 0) {
                    // Si pas d'affectation par dépôt, utiliser les patterns de racine
                    // MAIS exclure les factures qui sont dans des dépôts affectés à d'autres utilisateurs

                    // Récupérer tous les dépôts affectés à d'autres utilisateurs
                    const allDepotAssignments = await DepotAssignment.query()
                        .where('is_active', true)
                        .whereNot('user_id', user.$original.id)

                    const excludedDepotIds = allDepotAssignments.map(da => da.depotId)

                    query = query.where((builder) => {
                        // Appliquer les patterns de racine
                        patterns.forEach((prefix, index) => {
                            const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                            builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                        })

                        // Exclure les factures dans les dépôts affectés à d'autres utilisateurs
                        if (excludedDepotIds.length > 0) {
                            builder.whereNotIn('depot_id', excludedDepotIds)
                        }
                    })
                }
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
        let assignedDepots: number[] = []

        // Si l'utilisateur est RECOUVREMENT, on récupère ses affectations
        if (user.$original.role === Role.RECOUVREMENT) {
            // 1. Vérifier d'abord les affectations par dépôt (priorité)
            const depotAssignments = await DepotAssignment.query()
                .where('user_id', user.$original.id)
                .where('is_active', true)

            assignedDepots = depotAssignments.map(da => da.depotId)

            // 2. Récupérer les affectations par racine
            const assignedInvoices = await Assignment
                .query()
                .where('user_id', user.$original.id)
                .where('is_active', true)
            patterns = assignedInvoices.map(a => a.pattern)

            // Si l'utilisateur RECOUVREMENT n'a aucune affectation, retourner un tableau vide
            if (assignedDepots.length === 0 && patterns.length === 0) {
                return response.json([])
            }
        }

        try {
            let query = Invoice.query()
                .where('invoice_number', params.invoice_number)
                .whereHas('depot', (depotQuery) => {
                    depotQuery.where('isActive', true)
                })

            if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                query = query.where('depot_id', user.$original.depotId)
            }

            // Filtrage par affectations (dépôt en priorité, puis racine avec exclusion des dépôts affectés)
            if (user.$original.role === Role.RECOUVREMENT) {
                if (assignedDepots.length > 0) {
                    // Priorité aux affectations par dépôt
                    query = query.whereIn('depot_id', assignedDepots)
                } else if (patterns.length > 0) {
                    // Si pas d'affectation par dépôt, utiliser les patterns de racine
                    // MAIS exclure les factures qui sont dans des dépôts affectés à d'autres utilisateurs

                    // Récupérer tous les dépôts affectés à d'autres utilisateurs
                    const allDepotAssignments = await DepotAssignment.query()
                        .where('is_active', true)
                        .whereNot('user_id', user.$original.id)

                    const excludedDepotIds = allDepotAssignments.map(da => da.depotId)

                    query = query.where((builder) => {
                        // Appliquer les patterns de racine
                        patterns.forEach((prefix, index) => {
                            const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                            builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                        })

                        // Exclure les factures dans les dépôts affectés à d'autres utilisateurs
                        if (excludedDepotIds.length > 0) {
                            builder.whereNotIn('depot_id', excludedDepotIds)
                        }
                    })
                }
            }

            query = query.preload('bls', (query) => {
                query.preload('driver').preload('user', (query) => {
                    query.select('firstname', 'lastname', 'role')
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
        let patterns: string[] = []
        let assignedDepots: number[] = []

        const invoiceNumber = ctx.params.number
        try {
            // Si l'utilisateur est RECOUVREMENT, on récupère ses affectations
            if (user.$original.role === Role.RECOUVREMENT) {
                // 1. Vérifier d'abord les affectations par dépôt (priorité)
                const depotAssignments = await DepotAssignment.query()
                    .where('user_id', user.$original.id)
                    .where('is_active', true)

                assignedDepots = depotAssignments.map(da => da.depotId)

                // 2. Récupérer les affectations par racine
                const assignedInvoices = await Assignment
                    .query()
                    .where('user_id', user.$original.id)
                    .where('is_active', true)

                patterns = assignedInvoices.map(a => a.pattern)

                // Si l'utilisateur RECOUVREMENT n'a aucune affectation, retourner un tableau vide
                if (assignedDepots.length === 0 && patterns.length === 0) {
                    return ctx.response.status(404).json({ message: 'Facture non trouvée.' })
                }
            }

            let query = Invoice.query()
                .where('invoice_number', invoiceNumber)
                .whereHas('depot', (depotQuery) => {
                    depotQuery.where('isActive', true)
                })
            if (user.$original.role !== Role.ADMIN && user.$original.role !== Role.RECOUVREMENT) {
                query = query.where('depot_id', user.$original.depotId)
            }

            // Filtrage par affectations (dépôt en priorité, puis racine avec exclusion des dépôts affectés)
            if (user.$original.role === Role.RECOUVREMENT) {
                if (assignedDepots.length > 0) {
                    // Priorité aux affectations par dépôt
                    query = query.whereIn('depot_id', assignedDepots)
                } else if (patterns.length > 0) {
                    // Si pas d'affectation par dépôt, utiliser les patterns de racine
                    // MAIS exclure les factures qui sont dans des dépôts affectés à d'autres utilisateurs

                    // Récupérer tous les dépôts affectés à d'autres utilisateurs
                    const allDepotAssignments = await DepotAssignment.query()
                        .where('is_active', true)
                        .whereNot('user_id', user.$original.id)

                    const excludedDepotIds = allDepotAssignments.map(da => da.depotId)

                    query = query.where((builder) => {
                        // Appliquer les patterns de racine
                        patterns.forEach((prefix, index) => {
                            const method = index === 0 ? 'whereRaw' : 'orWhereRaw'
                            builder[method]('account_number ~ ?', [`^\\d+${prefix}`])
                        })

                        // Exclure les factures dans les dépôts affectés à d'autres utilisateurs
                        if (excludedDepotIds.length > 0) {
                            builder.whereNotIn('depot_id', excludedDepotIds)
                        }
                    })
                }
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
                .whereHas('depot', (depotQuery) => {
                    depotQuery.where('isActive', true)
                })
                .whereBetween('date', [firstDayOfMonth, lastDayOfMonth])
                .count('* as total');

            const enAttenteResult = await Invoice.query()
                .whereHas('depot', (depotQuery) => {
                    depotQuery.where('isActive', true)
                })
                .where('status', InvoiceStatus.EN_ATTENTE)
                .whereBetween('date', [firstDayOfMonth, lastDayOfMonth])
                .count('* as total');

            const livreeResult = await Invoice.query()
                .whereHas('depot', (depotQuery) => {
                    depotQuery.where('isActive', true)
                })
                .where('status', InvoiceStatus.LIVREE)
                .whereBetween('date', [firstDayOfMonth, lastDayOfMonth])
                .count('* as total');

            const enCoursResult = await Invoice.query()
                .whereHas('depot', (depotQuery) => {
                    depotQuery.where('isActive', true)
                })
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

        const invoice = await Invoice.query()
            .where('invoice_number', invoiceNumber)
            .whereHas('depot', (depotQuery) => {
                depotQuery.where('isActive', true)
            })
            .first()

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
            let query = Invoice.query()
                .where('invoice_number', invoiceNumber)
                .whereHas('depot', (depotQuery) => {
                    depotQuery.where('isActive', true)
                })

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

    async getInvoicePaymentCalculations({ params, request, response, auth }: HttpContext) {
        try {
            console.log('🔍 getInvoicePaymentCalculations appelée avec params:', params)
            console.log('🔍 Query params:', request.qs())

            const user = await auth.authenticate()
            const { invoice_number } = params
            const { excludePaymentId } = request.qs()

            console.log('🔍 invoice_number:', invoice_number)
            console.log('🔍 excludePaymentId:', excludePaymentId)

            if (!invoice_number) {
                console.log('❌ Numéro de facture manquant')
                return response.status(400).json({ error: 'Le numéro de facture est requis' })
            }

            // Récupérer la facture avec les paiements
            const invoice = await Invoice.query()
                .where('invoice_number', invoice_number)
                .preload('customer')
                .preload('payments')
                .first()

            console.log('🔍 Facture trouvée:', invoice ? 'OUI' : 'NON')

            if (!invoice) {
                console.log('❌ Facture non trouvée')
                return response.status(404).json({ error: 'Facture non trouvée' })
            }

            // Filtrer les paiements si un ID d'exclusion est fourni
            const payments = excludePaymentId
                ? invoice.payments.filter(payment => payment.id !== Number(excludePaymentId))
                : invoice.payments

            console.log('🔍 Nombre de paiements:', payments.length)

            // Calculs côté backend
            const totalTTC = Number(invoice.totalTTC)
            const totalPaid = payments.reduce((acc, payment) => acc + Number(payment.amount), 0)
            const remainingAmount = Math.max(0, totalTTC - totalPaid)
            const surplus = totalPaid > totalTTC ? totalPaid - totalTTC : 0

            // Calculer le pourcentage de paiement
            const paymentPercentage = totalTTC > 0 ? Math.round((totalPaid / totalTTC) * 100) : 0

            console.log('🔍 Calculs terminés:', { totalTTC, totalPaid, remainingAmount, surplus, paymentPercentage })

            return response.json({
                success: true,
                data: {
                    invoice: {
                        id: invoice.id,
                        invoiceNumber: invoice.invoiceNumber,
                        totalTTC,
                        statusPayment: invoice.statusPayment,
                        customer: invoice.customer ? {
                            name: invoice.customer.name,
                            phone: invoice.customer.phone
                        } : null
                    },
                    calculations: {
                        totalTTC,
                        totalPaid,
                        remainingAmount,
                        surplus,
                        paymentPercentage
                    },
                    payments: payments.map(payment => ({
                        id: payment.id,
                        amount: payment.amount,
                        paymentMethod: payment.paymentMethod,
                        paymentDate: payment.paymentDate,
                        comment: payment.comment,
                        chequeInfo: payment.chequeInfo
                    }))
                }
            })
        } catch (error) {
            console.error('❌ Erreur lors du calcul des montants de paiement:', error)
            return response.status(500).json({
                error: 'Erreur lors du calcul des montants de paiement'
            })
        }
    }

    /**
     * Marque une facture comme "LIVREE" (pour les utilisateurs admin et recouvrement)
     */
    async markAsDeliveredWithReturn({ params, request, response, auth }: HttpContext) {
        try {
            const currentUser = await auth.authenticate()
            const { comment } = request.only(['comment'])

            // Vérifier les permissions
            if (currentUser.role !== Role.ADMIN && currentUser.role !== Role.RECOUVREMENT) {
                return response.status(403).json({
                    error: 'Vous n\'avez pas les permissions pour effectuer cette action'
                })
            }

            // Récupérer la facture
            const invoice = await Invoice.query()
                .where('invoice_number', params.invoice_number)
                .preload('customer')
                .preload('depot')
                .first()

            if (!invoice) {
                return response.status(404).json({
                    error: 'Facture non trouvée'
                })
            }

            // Vérifier que la facture est en cours de livraison
            if (invoice.status !== InvoiceStatus.EN_COURS) {
                return response.status(400).json({
                    error: 'Seules les factures en cours de livraison peuvent être marquées comme "LIVREE"'
                })
            }

            // Vérifier que la facture est payée
            if (invoice.statusPayment !== 'payé') {
                return response.status(400).json({
                    error: 'Seules les factures payées peuvent être marquées comme "LIVREE"'
                })
            }

            // Vérifier les permissions spécifiques pour l'utilisateur RECOUVREMENT
            if (currentUser.role === Role.RECOUVREMENT) {
                let hasAccess = false
                let patterns: string[] = []
                let assignedDepots: number[] = []

                // Vérifier les affectations par dépôt
                const depotAssignments = await DepotAssignment.query()
                    .where('user_id', currentUser.id)
                    .where('is_active', true)
                
                assignedDepots = depotAssignments.map(da => da.depotId)
                
                if (assignedDepots.includes(invoice.depotId)) {
                    hasAccess = true
                } else {
                    // Vérifier les affectations par racine
                    const assignedInvoices = await Assignment
                        .query()
                        .where('user_id', currentUser.id)
                        .where('is_active', true)
                    
                    patterns = assignedInvoices.map(a => a.pattern)
                    
                    // Vérifier si le numéro de compte correspond à un pattern assigné
                    for (const pattern of patterns) {
                        if (invoice.accountNumber.match(new RegExp(`^\\d+${pattern}`))) {
                            hasAccess = true
                            break
                        }
                    }
                }

                if (!hasAccess) {
                    return response.status(403).json({
                        error: 'Vous n\'avez pas accès à cette facture'
                    })
                }
            }

            // Marquer la facture comme "LIVREE"
            await invoice.merge({
                status: InvoiceStatus.LIVREE,
                isCompleted: true,
                deliveredAt: DateTime.now()
            })
            await invoice.save()

            // Enregistrer l'activité
            await UserActivityService.logActivity(
                Number(currentUser.id),
                UserActivityService.ACTIONS.MARK_AS_DELIVERED_WITH_RETURN,
                currentUser.role,
                invoice.id,
                {
                    invoiceNumber: invoice.invoiceNumber,
                    comment: comment || '',
                    previousStatus: InvoiceStatus.EN_COURS,
                    newStatus: InvoiceStatus.LIVREE
                }
            )

            // Notifier les admins si c'est un utilisateur recouvrement
            if (currentUser.role === Role.RECOUVREMENT) {
                await NotificationService.notifyAdminsForImportantActions(
                    '📦 Facture marquée comme "LIVREE"',
                    `La facture ${invoice.invoiceNumber} a été marquée comme "LIVREE" par ${currentUser.firstname} ${currentUser.lastname}${comment ? ` - Commentaire: ${comment}` : ''}`,
                    invoice.id,
                    {
                        invoiceNumber: invoice.invoiceNumber,
                        customerName: invoice.customer?.name || 'Client inconnu',
                        modifiedBy: `${currentUser.firstname} ${currentUser.lastname}`,
                        previousStatus: InvoiceStatus.EN_COURS,
                        newStatus: InvoiceStatus.LIVREE,
                        comment: comment || '',
                        type: 'invoice_delivered_with_return'
                    }
                )
            }

            return response.status(200).json({
                success: true,
                message: 'Facture marquée comme "LIVREE" avec succès',
                invoice: {
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    status: invoice.status,
                    deliveredAt: invoice.deliveredAt,
                    comment: comment || ''
                }
            })

        } catch (error) {
            console.error('Erreur lors du marquage de la facture comme "LIVREE":', error)
            return response.status(500).json({
                error: 'Erreur lors du marquage de la facture'
            })
        }
    }
}



