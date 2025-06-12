import type { HttpContext } from '@adonisjs/core/http'
import Payment from '../models/payment.js'
import Invoice from '../models/invoice.js'
import { InvoicePaymentStatus } from '../enum/index.js'

export default class PaymentsController {
  /**
   * Affiche la liste des paiements
   */
  async index({ request, response }: HttpContext) {
    try {
      const { invoiceNumber, startDate, endDate, statusPayment } = request.qs()
      let query = Payment.query()
        .preload('invoice', (invoiceQuery) => {
          invoiceQuery.preload('customer')
        })
        .orderBy('payment_date', 'desc')

      if (invoiceNumber) {
        const invoice = await Invoice.findBy('invoice_number', invoiceNumber)
        if (!invoice) {
          return response.status(404).json({ error: 'Facture non trouvée' })
        }
        query = query.where('invoice_id', invoice.id)
      }

      if (startDate) {
        if (endDate) {
          query = query
            .whereRaw('DATE(payment_date) >= ?', [startDate])
            .whereRaw('DATE(payment_date) <= ?', [endDate])
        } else {
          query = query.whereRaw('DATE(payment_date) = ?', [startDate])
        }
      }

      if (statusPayment && statusPayment !== 'tous') {
        query = query.whereHas('invoice', (invoiceQuery) => {
          invoiceQuery.where('status_payment', statusPayment)
        })
      }

      const payments = await query
      return response.status(200).json(payments)
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements:', error)
      return response.status(500).json({ error: 'Erreur lors de la récupération des paiements' })
    }
  }

  /**
   * Affiche un paiement spécifique
   */
  async show({ params, response }: HttpContext) {
    try {
      const payment = await Payment.findOrFail(params.id)
      return response.status(200).json(payment)
    } catch (error) {
      console.error('Erreur lors de la récupération du paiement:', error)
      return response.status(404).json({ error: 'Paiement non trouvé' })
    }
  }

  /**
   * Crée un nouveau paiement et met à jour le statut de la facture
   */
  async store({ request, response }: HttpContext) {
    try {
      const data = request.only(['invoiceNumber', 'amount', 'paymentMethod', 'paymentDate', 'comment'])
      data.amount = Number(data.amount)

      if (!data.invoiceNumber) {
        return response.status(400).json({ error: 'Le numéro de facture est requis' })
      }

      const invoice = await Invoice.findBy('invoice_number', data.invoiceNumber)
      if (!invoice) {
        return response.status(404).json({ error: 'Facture non trouvée' })
      }

      const totalPaid = await this.getTotalPaid(invoice.id)
      const remainingAmount = Number(invoice.totalTTC) - totalPaid

      if (data.amount > remainingAmount) {
        return response.status(400).json({
          error: `Le montant du paiement (${data.amount}) dépasse le montant restant (${remainingAmount})`
        })
      }

      const payment = await Payment.create({
        invoiceId: invoice.id,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
        comment: data.comment
      })

      await this.updateInvoiceStatus(invoice.id)
      await invoice.refresh()

      return response.status(201).json({
        message: 'Paiement créé avec succès',
        payment,
        invoiceStatus: invoice.statusPayment
      })
    } catch (error) {
      console.error('Erreur lors de la création du paiement:', error)
      return response.status(500).json({ error: 'Erreur lors de la création du paiement' })
    }
  }

  /**
   * Met à jour un paiement existant
   */
  async update({ params, request, response }: HttpContext) {
    try {
      const payment = await Payment.findOrFail(params.id)
      const data = request.only(['amount', 'paymentMethod', 'paymentDate', 'comment'])
      data.amount = Number(data.amount)

      const invoice = await Invoice.findOrFail(payment.invoiceId)

      const totalPaid = await this.getTotalPaid(invoice.id)
      const remainingAmount = Number(invoice.totalTTC) - totalPaid

      if (data.amount > remainingAmount) {
        return response.status(400).json({
          error: `Le nouveau montant (${data.amount}) dépasse le montant restant (${remainingAmount})`
        })
      }

      payment.merge(data)
      await payment.save()

      await this.updateInvoiceStatus(invoice.id)
      await invoice.refresh()

      return response.status(200).json({
        message: 'Paiement mis à jour avec succès',
        payment,
        invoiceStatus: invoice.statusPayment
      })
    } catch (error) {
      console.error('Erreur lors de la mise à jour du paiement:', error)
      return response.status(500).json({ error: 'Erreur lors de la mise à jour du paiement' })
    }
  }

  /**
   * Supprime un paiement
   */
  async destroy({ params, response }: HttpContext) {
    try {
      const payment = await Payment.findOrFail(params.id)
      const invoiceId = payment.invoiceId

      await payment.delete()

      await this.updateInvoiceStatus(invoiceId)
      const invoice = await Invoice.findOrFail(invoiceId)

      return response.status(200).json({
        message: 'Paiement supprimé avec succès',
        invoiceStatus: invoice.statusPayment
      })
    } catch (error) {
      console.error('Erreur lors de la suppression du paiement:', error)
      return response.status(500).json({ error: 'Erreur lors de la suppression du paiement' })
    }
  }

  /**
   * Récupère tous les paiements d'une facture spécifique
   */
  async getPaymentsByInvoice({ params, response }: HttpContext) {
    try {
      const invoice = await Invoice.findBy('invoice_number', params.invoice_number)
      if (!invoice) {
        return response.status(404).json({ error: 'Facture non trouvée' })
      }

      const payments = await Payment.query()
        .where('invoice_id', invoice.id)
        .orderBy('payment_date', 'desc')

      return response.status(200).json(payments)
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements de la facture:', error)
      return response.status(500).json({ error: 'Erreur lors de la récupération des paiements de la facture' })
    }
  }

  /**
   * Calcul du montant total payé pour une facture
   */
  private async getTotalPaid(invoiceId: number) {
    const payments = await Payment.query().where('invoice_id', invoiceId)

    const result = payments.reduce((acc, payment) => acc + Number(payment.amount), 0)
    console.log('result:', result)
    return Number(result || 0)
  }

  /**
   * Met à jour automatiquement le statut de paiement d'une facture
   */
  private async updateInvoiceStatus(invoiceId: number) {
    const invoice = await Invoice.findOrFail(invoiceId)
    const totalPaid = await this.getTotalPaid(invoiceId)
    const totalTTC = Number(invoice.totalTTC)

    console.log('totalPaid:', totalPaid)
    console.log('totalTTC:', totalTTC)

    if (totalPaid === totalTTC) {
      console.log('Facture entièrement payée.', totalPaid === totalTTC)
      await invoice.merge({ statusPayment: InvoicePaymentStatus.PAYE }).save()
    } else if (totalPaid < totalTTC) {
      console.log('Paiement partiel effectué.')
      await invoice.merge({ statusPayment: InvoicePaymentStatus.PAIEMENT_PARTIEL }).save()
    }
  }
}
