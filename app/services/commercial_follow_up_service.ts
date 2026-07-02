import { DateTime } from 'luxon'
import CommercialPlanningItem from '#models/commercial_planning_item'
import CommercialExecutionLog from '#models/commercial_execution_log'
import InvoiceReminder from '#models/invoice_reminder'
import User from '#models/user'
import { CommercialExecutionStatus, Role } from '../enum/index.js'
import NotificationService from '#services/notification_service'

export type FollowUpDueState = 'due_today' | 'overdue'

export interface PendingFollowUpItem {
  planningItem: CommercialPlanningItem
  latestLog: CommercialExecutionLog
  dueState: FollowUpDueState
  clientName: string
  agentName: string
}

export default class CommercialFollowUpService {
  static getFollowUpDueState(
    status: CommercialExecutionStatus,
    nextFollowUpAt: DateTime | null | undefined
  ): FollowUpDueState | null {
    if (status !== CommercialExecutionStatus.A_RELANCER || !nextFollowUpAt) {
      return null
    }

    const startOfToday = DateTime.local().startOf('day')
    const endOfToday = DateTime.local().endOf('day')

    if (nextFollowUpAt > endOfToday) {
      return null
    }

    if (nextFollowUpAt < startOfToday) {
      return 'overdue'
    }

    return 'due_today'
  }

  static async getPendingFollowUps(agentId?: number): Promise<PendingFollowUpItem[]> {
    const query = CommercialPlanningItem.query()
      .where('is_active', true)
      .preload('client')
      .preload('agent')
      .preload('commercialClientLocation', (locationQuery) => locationQuery.preload('client'))
      .preload('executionLogs', (logsQuery) => logsQuery.orderBy('created_at', 'desc').limit(1))

    if (agentId) {
      query.where('agent_id', agentId)
    }

    const planningItems = await query.orderBy('sort_order', 'asc')
    const results: PendingFollowUpItem[] = []

    for (const item of planningItems) {
      const latestLog = item.executionLogs?.[0]
      if (!latestLog) continue

      const dueState = this.getFollowUpDueState(latestLog.status, latestLog.nextFollowUpAt)
      if (!dueState) continue

      const clientName = await this.getPlanningItemClientName(item)
      const agent = item.agent

      results.push({
        planningItem: item,
        latestLog,
        dueState,
        clientName,
        agentName: agent
          ? `${agent.firstname || ''} ${agent.lastname || ''}`.trim() || agent.phone || `Agent #${agent.id}`
          : `Agent #${item.agentId}`,
      })
    }

    return results.sort((a, b) => {
      if (a.dueState !== b.dueState) {
        return a.dueState === 'overdue' ? -1 : 1
      }

      const aTime = a.latestLog.nextFollowUpAt?.toMillis() || 0
      const bTime = b.latestLog.nextFollowUpAt?.toMillis() || 0
      return aTime - bTime
    })
  }

  static async clearAgentFollowUpNotifications(agentId: number, clientName: string) {
    const reminderPrefix = `Relance client - ${clientName}`

    await InvoiceReminder.query()
      .where('user_id', agentId)
      .where('comment', 'like', `${reminderPrefix}%`)
      .delete()
  }

  static async scheduleAgentFollowUpNotification(
    agentId: number,
    clientName: string,
    followUpAt: DateTime,
    dueState: FollowUpDueState | null = null
  ) {
    const startOfToday = DateTime.local().startOf('day')
    const followUpDay = followUpAt.startOf('day')
    const isVisibleToday = dueState === 'due_today' || dueState === 'overdue'
    const notificationAt = isVisibleToday ? startOfToday : followUpDay
    const reminderPrefix = `Relance client - ${clientName}`
    const timeLabel = followUpAt.toFormat('dd/MM/yyyy HH:mm')
    const statusLabel =
      dueState === 'overdue'
        ? `en retard depuis le ${timeLabel}`
        : dueState === 'due_today'
          ? `à traiter aujourd'hui (${followUpAt.toFormat('HH:mm')})`
          : `prévue le ${followUpAt.toFormat('dd/MM/yyyy à HH:mm')}`
    const comment = `${reminderPrefix} ${statusLabel}`.slice(0, 255)

    await InvoiceReminder.query()
      .where('user_id', agentId)
      .where('read', false)
      .where('comment', 'like', `${reminderPrefix}%`)
      .delete()

    await InvoiceReminder.create({
      userId: agentId,
      remindAt: notificationAt,
      comment,
      read: false,
    })
  }

  static async processDailyReminders() {
    const pending = await this.getPendingFollowUps()
    const overdue = pending.filter((item) => item.dueState === 'overdue')

    for (const item of pending) {
      try {
        await this.scheduleAgentFollowUpNotification(
          item.planningItem.agentId,
          item.clientName,
          item.latestLog.nextFollowUpAt!,
          item.dueState
        )
      } catch (error) {
        console.error(
          `[Relances] Erreur rappel agent #${item.planningItem.agentId} (${item.clientName}):`,
          error
        )
      }
    }

    if (overdue.length > 0) {
      await this.notifyManagersAboutOverdueFollowUps(overdue)
    }

    return {
      total: pending.length,
      dueToday: pending.filter((item) => item.dueState === 'due_today').length,
      overdue: overdue.length,
    }
  }

  static async notifyManagersAboutOverdueFollowUps(overdueItems: PendingFollowUpItem[]) {
    const startOfToday = DateTime.local().startOf('day')
    const groupedByAgent = new Map<string, PendingFollowUpItem[]>()

    for (const item of overdueItems) {
      const key = item.agentName
      const existing = groupedByAgent.get(key) || []
      existing.push(item)
      groupedByAgent.set(key, existing)
    }

    const lines = Array.from(groupedByAgent.entries()).map(([agentName, items]) => {
      const clients = items.map((entry) => entry.clientName).slice(0, 3).join(', ')
      const suffix = items.length > 3 ? ` +${items.length - 3}` : ''
      return `${agentName}: ${clients}${suffix}`
    })

    const title = 'Relances non honorées'
    const message = `${overdueItems.length} client(s) en retard — ${lines.join(' | ')}`.slice(0, 200)
    const commentPrefix = 'Relances non honorées'

    const managers = await User.query()
      .whereIn('role', [Role.COMMERCIAL_ADMIN, Role.ADMIN_DETAILLANT])
      .where('is_active', true)

    await Promise.all(
      managers.map(async (manager) => {
        await InvoiceReminder.query()
          .where('user_id', Number(manager.id))
          .where('read', false)
          .where('comment', 'like', `${commentPrefix}%`)
          .where('remind_at', '>=', startOfToday.toSQL()!)
          .delete()

        await NotificationService.notifyUser(Number(manager.id), title, message)
      })
    )
  }

  static async getOverdueFollowUpsSummary() {
    const overdue = (await this.getPendingFollowUps()).filter((item) => item.dueState === 'overdue')

    return overdue.map((item) => ({
      planningItemId: item.planningItem.id,
      agentId: item.planningItem.agentId,
      agentName: item.agentName,
      clientName: item.clientName,
      dueAt: item.latestLog.nextFollowUpAt?.toISO() ?? null,
      daysLate: item.latestLog.nextFollowUpAt
        ? Math.max(
            0,
            Math.floor(DateTime.local().startOf('day').diff(item.latestLog.nextFollowUpAt.startOf('day'), 'days').days)
          )
        : 0,
    }))
  }

  private static async getPlanningItemClientName(planningItem: CommercialPlanningItem) {
    if (planningItem.commercialClientLocationId) {
      const location = planningItem.commercialClientLocation
      return location?.name || location?.client?.name || planningItem.client?.name || 'Client inconnu'
    }

    return planningItem.client?.name || 'Client inconnu'
  }
}
