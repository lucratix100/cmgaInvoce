import type { HttpContext } from '@adonisjs/core/http'
import Invoice from '#models/invoice'
import Depot from '#models/depot'
import Driver from '#models/driver'
import User from '#models/user'
import Payment from '#models/payment'
import { InvoiceStatus, InvoicePaymentStatus } from '../enum/index.js'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class DashboardController {
  async stats({ request, response }: HttpContext) {
    try {
      const { period = 'monthly', start, end } = request.qs()
      
      // Statistiques des factures
      const invoiceStats = await this.getInvoiceStats(start, end)
      
      // Statistiques des paiements
      const paymentStats = await this.getPaymentStats(start, end)
      
      // Statistiques système
      const systemStats = await this.getSystemStats()
      
      // Données pour les graphiques selon la période ou l'intervalle
      let chartData
      switch (period) {
        case 'daily':
          chartData = await this.getDailyStats(start, end)
          break
        case 'weekly':
          chartData = await this.getWeeklyStats(start, end)
          break
        case 'monthly':
        default:
          chartData = await this.getMonthlyStats(start, end)
          break
      }

      return response.json({
        ...invoiceStats,
        ...paymentStats,
        ...systemStats,
        [period === 'daily' ? 'dailyStats' : period === 'weekly' ? 'weeklyStats' : 'monthlyStats']: chartData
      })
    } catch (error) {
      console.error('Erreur dans getDashboardStats:', error)
      return response.status(500).json({ error: 'Erreur lors de la récupération des statistiques' })
    }
  }

  async invoiceStats({ response }: HttpContext) {
    try {
      const stats = await this.getInvoiceStats()
      return response.json(stats)
    } catch (error) {
      console.error('Erreur dans getInvoiceStats:', error)
      return response.status(500).json({ error: 'Erreur lors de la récupération des statistiques des factures' })
    }
  }

  async paymentStats({ response }: HttpContext) {
    try {
      const stats = await this.getPaymentStats()
      return response.json(stats)
    } catch (error) {
      console.error('Erreur dans getPaymentStats:', error)
      return response.status(500).json({ error: 'Erreur lors de la récupération des statistiques de paiement' })
    }
  }

  async systemStats({ response }: HttpContext) {
    try {
      const stats = await this.getSystemStats()
      return response.json(stats)
    } catch (error) {
      console.error('Erreur dans getSystemStats:', error)
      return response.status(500).json({ error: 'Erreur lors de la récupération des statistiques système' })
    }
  }

  async chartData({ request, response }: HttpContext) {
    try {
      const { period = 'monthly' } = request.qs()
      
      let chartData
      switch (period) {
        case 'daily':
          chartData = await this.getDailyStats()
          break
        case 'weekly':
          chartData = await this.getWeeklyStats()
          break
        case 'monthly':
        default:
          chartData = await this.getMonthlyStats()
          break
      }

      return response.json(chartData)
    } catch (error) {
      console.error('Erreur dans getChartData:', error)
      return response.status(500).json({ error: 'Erreur lors de la récupération des données du graphique' })
    }
  }

  async advancedStats({ request, response }: HttpContext) {
    const { period = 'monthly', start, end } = request.qs()
    let startDate = start
    let endDate = end

    // Si la période n'est pas personnalisée, calculer les dates automatiquement
    if (!start && !end) {
      const now = new Date()
      if (period === 'daily') {
        const today = now.toISOString().split('T')[0]
        startDate = today
        endDate = today
      } else if (period === 'weekly') {
        const dayOfWeek = now.getDay()
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - daysToSubtract)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        startDate = startOfWeek.toISOString().split('T')[0]
        endDate = endOfWeek.toISOString().split('T')[0]
      } else if (period === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        startDate = startOfMonth.toISOString().split('T')[0]
        endDate = endOfMonth.toISOString().split('T')[0]
      }
    }

    // 1. Répartition des paiements par mode
    let paymentModesQuery = Payment.query()
    if (startDate && endDate) paymentModesQuery = paymentModesQuery.whereBetween('payment_date', [startDate, endDate])
    const paymentModes = await paymentModesQuery
      .select('payment_method')
      .count('* as count')
      .groupBy('payment_method')

    console.log('paymentModes SQL:', paymentModes)

    // 2. Taux de paiement (payées vs impayées)
    let invoiceQuery = Invoice.query()
    if (startDate && endDate) invoiceQuery = invoiceQuery.whereBetween('date', [startDate, endDate])
    const totalInvoices = await invoiceQuery.clone().count('* as total').first()
    const paidInvoices = await invoiceQuery.clone().where('status_payment', InvoicePaymentStatus.PAYE).count('* as total').first()
    const unpaidInvoices = await invoiceQuery.clone().where('status_payment', InvoicePaymentStatus.NON_PAYE).count('* as total').first()

    // 3. Top 5 clients les plus actifs (par nombre de factures)
    const topCustomers = await invoiceQuery.clone()
      .select('customer_id')
      .count('* as total')
      .groupBy('customer_id')
      .orderByRaw('total DESC')
      .limit(5)

    // Récupérer les noms des clients
    let customerIds = topCustomers.map(c => c.customerId).filter(id => !!id)
    if (customerIds.length === 0) {
      return response.json({
        paymentModes: paymentModes.map(pm => ({
          mode: pm.payment_method || pm.paymentMethod || pm.mode || 'Inconnu',
          count: Number(pm.count || pm.$extras.count || 0)
        })),
        paymentRate: {
          paid: Number(paidInvoices?.$extras.total || 0),
          unpaid: Number(unpaidInvoices?.$extras.total || 0),
          total: Number(totalInvoices?.$extras.total || 0)
        },
        topCustomers: []
      })
    }
    const customers = await (await import('#models/customer')).default.query().whereIn('id', customerIds)
    const customersMap = Object.fromEntries(customers.map(c => [String(c.id), c.$attributes.name]))

    return response.json({
      paymentModes: paymentModes.map(pm => ({
        mode: pm.payment_method || pm.paymentMethod || pm.mode || 'Inconnu',
        count: Number(pm.count || pm.$extras.count || 0)
      })),
      paymentRate: {
        paid: Number(paidInvoices?.$extras.total || 0),
        unpaid: Number(unpaidInvoices?.$extras.total || 0),
        total: Number(totalInvoices?.$extras.total || 0)
      },
      topCustomers: topCustomers.map(tc => ({
        id: tc.customerId,
        name: customersMap[String(tc.customerId)] || 'Inconnu',
        total: Number(tc.$extras.total)
      }))
    })
  }

  private async getInvoiceStats(start?: string, end?: string) {
    let query = Invoice.query()
    if (start && end) query = query.whereBetween('date', [start, end])
    const totalInvoices = await query.clone().count('* as total').first()
    const deliveredInvoices = await query.clone().where('status', InvoiceStatus.LIVREE).count('* as total').first()
    const pendingInvoices = await query.clone().where('status', InvoiceStatus.EN_ATTENTE).count('* as total').first()
    const inProgressInvoices = await query.clone().where('status', InvoiceStatus.EN_COURS).count('* as total').first()
    // Calcul du revenu total
    const revenueResult = await query.clone().select(db.raw('COALESCE(SUM(total_ttc), 0) as total_revenue')).first()
    return {
      totalInvoices: Number(totalInvoices?.$extras.total || 0),
      deliveredInvoices: Number(deliveredInvoices?.$extras.total || 0),
      pendingInvoices: Number(pendingInvoices?.$extras.total || 0),
      inProgressInvoices: Number(inProgressInvoices?.$extras.total || 0),
      totalRevenue: Number(revenueResult?.$extras.total_revenue || 0)
    }
  }

  private async getPaymentStats(start?: string, end?: string) {
    let query = Invoice.query()
    if (start && end) query = query.whereBetween('date', [start, end])
    const totalInvoices = await query.clone().count('* as total').first()
    const paidInvoices = await query.clone().where('status_payment', InvoicePaymentStatus.PAYE).count('* as total').first()
    const partialPaidInvoices = await query.clone().where('status_payment', InvoicePaymentStatus.PAIEMENT_PARTIEL).count('* as total').first()
    const unpaidInvoices = await query.clone().where('status_payment', InvoicePaymentStatus.NON_PAYE).count('* as total').first()
    return {
      totalInvoices: Number(totalInvoices?.$extras.total || 0),
      paidInvoices: Number(paidInvoices?.$extras.total || 0),
      partialPaidInvoices: Number(partialPaidInvoices?.$extras.total || 0),
      unpaidInvoices: Number(unpaidInvoices?.$extras.total || 0)
    }
  }

  private async getSystemStats() {
    const depots = await Depot.query().where('is_active', true).count('* as total').first()
    const drivers = await Driver.query().count('* as total').first()
    const users = await User.query().count('* as total').first()

    return {
      totalDepots: Number(depots?.$extras.total || 0),
      totalDrivers: Number(drivers?.$extras.total || 0),
      totalUsers: Number(users?.$extras.total || 0)
    }
  }

  private async getMonthlyStats(start?: string, end?: string) {
    const months = []
    if (start && end) {
      // Regrouper par mois sur l'intervalle donné
      const stats = await db.raw(`
        SELECT 
          TO_CHAR(date, 'YYYY-MM') as month,
          COUNT(*) as total,
          COUNT(CASE WHEN status = ? THEN 1 END) as delivered,
          COALESCE(SUM(total_ttc), 0) as revenue
        FROM invoices 
        WHERE date >= ? AND date <= ?
        GROUP BY month
        ORDER BY month
      `, [InvoiceStatus.LIVREE, start, end])
      for (const row of stats.rows || []) {
        months.push({
          month: row.month,
          total: Number(row.total || 0),
          delivered: Number(row.delivered || 0),
          revenue: Number(row.revenue || 0)
        })
      }
    } else {
      const currentYear = DateTime.now().year
      for (let month = 1; month <= 12; month++) {
        const monthName = DateTime.fromObject({ year: currentYear, month }).toFormat('MMM')
        const stats = await db.raw(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = ? THEN 1 END) as delivered,
            COALESCE(SUM(total_ttc), 0) as revenue
          FROM invoices 
          WHERE EXTRACT(YEAR FROM date) = ? AND EXTRACT(MONTH FROM date) = ?
        `, [InvoiceStatus.LIVREE, currentYear, month])
        const result = stats.rows && stats.rows[0] ? stats.rows[0] : {}
        months.push({
          month: monthName,
          total: Number(result?.total || 0),
          delivered: Number(result?.delivered || 0),
          revenue: Number(result?.revenue || 0)
        })
      }
    }
    return months
  }

  private async getWeeklyStats(start?: string, end?: string) {
    const weeks = []
    if (start && end) {
      // Regrouper par semaine sur l'intervalle donné
      const stats = await db.raw(`
        SELECT 
          TO_CHAR(date, 'IYYY-IW') as week,
          COUNT(*) as total,
          COUNT(CASE WHEN status = ? THEN 1 END) as delivered,
          COALESCE(SUM(total_ttc), 0) as revenue
        FROM invoices 
        WHERE date >= ? AND date <= ?
        GROUP BY week
        ORDER BY week
      `, [InvoiceStatus.LIVREE, start, end])
      for (const row of stats.rows || []) {
        weeks.push({
          week: row.week,
          total: Number(row.total || 0),
          delivered: Number(row.delivered || 0),
          revenue: Number(row.revenue || 0)
        })
      }
    } else {
      const currentDate = DateTime.now()
      // Statistiques des 8 dernières semaines
      for (let i = 7; i >= 0; i--) {
        const weekStart = currentDate.minus({ weeks: i }).startOf('week')
        const weekEnd = weekStart.endOf('week')
        const weekLabel = `${weekStart.toFormat('dd/MM')} - ${weekEnd.toFormat('dd/MM')}`
        const stats = await db.raw(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = ? THEN 1 END) as delivered,
            COALESCE(SUM(total_ttc), 0) as revenue
          FROM invoices 
          WHERE date >= ? AND date <= ?
        `, [InvoiceStatus.LIVREE, weekStart.toSQL(), weekEnd.toSQL()])
        const result = stats.rows && stats.rows[0] ? stats.rows[0] : {}
        weeks.push({
          week: weekLabel,
          total: Number(result?.total || 0),
          delivered: Number(result?.delivered || 0),
          revenue: Number(result?.revenue || 0)
        })
      }
    }
    return weeks
  }

  private async getDailyStats(start?: string, end?: string) {
    const days = []
    if (start && end) {
      // Statistiques par jour sur l'intervalle donné
      const stats = await db.raw(`
        SELECT 
          TO_CHAR(date, 'YYYY-MM-DD') as date,
          COUNT(*) as total,
          COUNT(CASE WHEN status = ? THEN 1 END) as delivered,
          COALESCE(SUM(total_ttc), 0) as revenue
        FROM invoices 
        WHERE date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date
      `, [InvoiceStatus.LIVREE, start, end])
      for (const row of stats.rows || []) {
        days.push({
          date: row.date,
          total: Number(row.total || 0),
          delivered: Number(row.delivered || 0),
          revenue: Number(row.revenue || 0)
        })
      }
    } else {
      const currentDate = DateTime.now()
      // Statistiques des 30 derniers jours
      for (let i = 29; i >= 0; i--) {
        const day = currentDate.minus({ days: i })
        const dayLabel = day.toFormat('dd/MM')
        const stats = await db.raw(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = ? THEN 1 END) as delivered,
            COALESCE(SUM(total_ttc), 0) as revenue
          FROM invoices 
          WHERE DATE(date) = ?
        `, [InvoiceStatus.LIVREE, day.toFormat('yyyy-MM-dd')])
        const result = stats.rows && stats.rows[0] ? stats.rows[0] : {}
        days.push({
          date: dayLabel,
          total: Number(result?.total || 0),
          delivered: Number(result?.delivered || 0),
          revenue: Number(result?.revenue || 0)
        })
      }
    }
    return days
  }
} 