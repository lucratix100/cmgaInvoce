import Invoice from "#models/invoice"
import InvoiceReminder from "#models/invoice_reminder"
import auth from "@adonisjs/auth/services/main"
import type { HttpContext } from '@adonisjs/core/http'

export default class InvoiceRemindersController {

    async index({ response }: HttpContext) {
        try {
            const invoiceReminders = await InvoiceReminder.all()
            return invoiceReminders
        } catch (error) {
            return response.status(500).json({ message: 'Error fetching invoice reminders' })
        }
    }

    async store({ request, response, auth }: HttpContext) {
        const { invoiceId, remindAt, comment } = request.body()
        const user = await auth.authenticate()
        try {
            const invoiceReminder = await InvoiceReminder.create({ invoiceId, remindAt, comment, userId: user.$original.id })

            return response.status(201).json({ message: 'Invoice reminder created', invoiceReminder })
        } catch (error) {
            return response.status(500).json({ message: 'Error creating invoice reminder' })
        }
    }

    async show({ params, response }: HttpContext) {
        try {
            const invoiceReminder = await InvoiceReminder.find(params.id)
            return invoiceReminder
        } catch (error) {
            return response.status(500).json({ message: 'Error fetching invoice reminder' })
        }
    }

    async update({ params, request, response }: HttpContext) {
        try {
            const { invoiceId, remindAt, comment } = request.body()
            const invoiceReminder = await InvoiceReminder.find(params.id)
            if (!invoiceReminder) {
                return response.status(404).json({ message: 'Invoice reminder not found' })
            }
            invoiceReminder.invoiceId = invoiceId
            invoiceReminder.remindAt = remindAt
            invoiceReminder.comment = comment
            await invoiceReminder.save()
            return response.status(200).json({ message: 'Invoice reminder updated', invoiceReminder })
        } catch (error) {
            return response.status(500).json({ message: 'Error updating invoice reminder' })
        }
    }

    async destroy({ params, response }: HttpContext) {
        try {
            const invoiceReminder = await InvoiceReminder.find(params.id)
            if (!invoiceReminder) {
                return response.status(404).json({ message: 'Invoice reminder not found' })
            }
            await invoiceReminder.delete()
            return response.status(200).json({ message: 'Invoice reminder deleted' })
        } catch (error) {
            return response.status(500).json({ message: 'Error deleting invoice reminder' })
        }
    }

    async getInvoiceRemindersByInvoiceNumber({ params, response }: HttpContext) {
        try {
            const invoiceReminders = await InvoiceReminder.query().where('invoice_number', params.invoice_number)
            const invoice = await Invoice.find(params.invoice_number)
            if (!invoice) {
                return response.status(404).json({ message: 'Invoice not found' })
            }
            return invoiceReminders
        } catch (error) {
            return response.status(500).json({ message: 'Error fetching invoice reminders' })
        }
    }

    async getUserReminders({ auth, response }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (!user) {
                return response.status(401).json({ message: 'Non authentifié' })
            }

            const now = new Date()
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

            console.log('Date actuelle:', now)

            const reminders = await InvoiceReminder.query()
                .where('user_id', user.$original.id)
                .where((query) => {
                    query.where((subQuery) => {
                        subQuery.where('read', false)
                            .whereRaw('remind_at >= remind_at - interval \'7 days\'')
                            .whereRaw('remind_at <= remind_at + interval \'7 days\'')
                            .where('remind_at', '<=', now)
                    }).orWhere((subQuery) => {
                        subQuery.where('read', true)
                            .whereRaw('remind_at >= remind_at - interval \'7 days\'')
                            .where('remind_at', '<=', endOfToday)
                    })
                })
                .preload('invoice', (query) => {
                    query.select('invoiceNumber', 'status', 'accountNumber', 'customerId')
                        .preload('customer', (customerQuery) => {
                            customerQuery.select('name')
                        })
                })
                .orderBy('remind_at', 'desc')
            return reminders
        } catch (error) {
            console.error("Erreur détaillée:", error)
            return response.status(500).json({
                message: 'Erreur lors de la récupération des rappels',
                error: error.message
            })
        }
    }
    async getAllRemindersByUserAndInvoice({ params, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (!user) {
                return response.status(401).json({ message: 'Non authentifié' })
            }
            const invoiceReminders = await InvoiceReminder.query().where('user_id', user.$original.id).where('invoice_id', params.invoice_id)
            return invoiceReminders
        } catch (error) {
            return response.status(500).json({ message: 'Error fetching invoice reminders' })
        }
    }

    async markAsRead({ params, response }: HttpContext) {
        try {
            const reminder = await InvoiceReminder.find(params.id)
            if (!reminder) {
                return response.status(404).json({ message: 'Rappel non trouvé' })
            }

            reminder.read = true
            await reminder.save()

            return response.status(200).json({
                message: 'Rappel marqué comme lu',
                reminder
            })
        } catch (error) {
            console.error("Erreur lors du marquage du rappel:", error)
            return response.status(500).json({
                message: 'Erreur lors du marquage du rappel',
                error: error.message
            })
        }
    }
}
