import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import Invoice from '#models/invoice'
import CommercialClient from '#models/commercial_client'
import CommercialClientLocation from '#models/commercial_client_location'
import CommercialClientAssignment from '#models/commercial_client_assignment'
import CommercialPlanningItem from '#models/commercial_planning_item'
import CommercialAssignmentHistory from '#models/commercial_assignment_history'
import CommercialClientImport from '#models/commercial_client_import'
import CommercialExecutionLog from '#models/commercial_execution_log'
import CommercialOrderLine from '#models/commercial_order_line'
import CommercialBl from '#models/commercial_bl'
import CommercialBlModificationRequest from '#models/commercial_bl_modification_request'
import CommercialPersonalClient from '#models/commercial_personal_client'
import Product from '#models/product'
import db from '@adonisjs/lucid/services/db'
import NotificationService from '#services/notification_service'
import CommercialFollowUpService from '#services/commercial_follow_up_service'
import UserActivityService from '#services/user_activity_service'
import {
  getCurrentWeekPlanningDayRange,
  isTourItemCompleted,
} from '../utils/commercial_planning_week.js'
import {
  commercialAssignmentValidator,
  commercialClientLocationValidator,
  commercialClientValidator,
  commercialImportValidator,
  commercialPersonalClientValidator,
  commercialPersonalOrderValidator,
  commercialPlanningValidator,
  commercialProductValidator,
  commercialTransferValidator,
} from '#validators/commercial'
import {
  CommercialClientType,
  CommercialExecutionStatus,
  CommercialPlanningDay,
  Role,
} from '../enum/index.js'
import { userValidatorStore, userValidatorUpdate } from '#validators/user'

export default class CommercialAdminController {
  private async requireCommercialAdmin({ auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (user.role !== Role.COMMERCIAL_ADMIN && user.role !== Role.ADMIN) {
      response.status(403).json({ message: 'Accès réservé au responsable commercial' })
      return null
    }
    return user
  }

  private async requireAdmin({ auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (user.role !== Role.ADMIN) {
      response.status(403).json({ message: 'Accès réservé à l\'administrateur' })
      return null
    }
    return user
  }

  private async requireCommercialUser({ auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (![Role.AGENT_COMMERCIAL, Role.COMMERCIAL_ADMIN, Role.ADMIN, Role.ADMIN_DETAILLANT, Role.COMMERCIAL_DETAILLANT].includes(user.role)) {
      response.status(403).json({ message: 'Accès réservé aux rôles commerciaux' })
      return null
    }
    return user
  }

  private async requireCommercialAgent({ auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (![Role.AGENT_COMMERCIAL, Role.COMMERCIAL_DETAILLANT].includes(user.role)) {
      response.status(403).json({ message: 'Accès réservé au commercial' })
      return null
    }
    return user
  }

  private async validateCommercialTarget(
    commercialClientId?: number | null,
    commercialClientLocationId?: number | null
  ) {
    if (!commercialClientId && !commercialClientLocationId) {
      return { error: 'Sélectionnez un client ou un local de magasin' }
    }

    if (commercialClientLocationId) {
      const location = await CommercialClientLocation.query()
        .where('id', commercialClientLocationId)
        .preload('client')
        .first()

      if (!location || !location.isActive || !location.client?.isActive) {
        return { error: 'Local de magasin introuvable ou inactif' }
      }

      return {
        clientId: location.commercialClientId,
        locationId: location.id,
      }
    }

    const client = await CommercialClient.find(commercialClientId!)
    if (!client || !client.isActive) {
      return { error: 'Client commercial introuvable ou inactif' }
    }

    if (client.type === CommercialClientType.MAGASIN) {
      return { error: 'Un magasin doit être affecté via un local précis' }
    }

    return {
      clientId: client.id,
      locationId: null,
    }
  }

  private async ensureTargetInAgentPortfolio(
    agentId: number,
    commercialClientId: number,
    commercialClientLocationId?: number | null
  ) {
    const assignment = await CommercialClientAssignment.query()
      .where('agent_id', agentId)
      .where('commercial_client_id', commercialClientId)
      .where('is_active', true)
      .if(commercialClientLocationId, (query) =>
        query.where('commercial_client_location_id', commercialClientLocationId!)
      )
      .if(!commercialClientLocationId, (query) => query.whereNull('commercial_client_location_id'))
      .first()

    return Boolean(assignment)
  }

  private async findDuplicatePlanningItem(
    agentId: number,
    dayOfWeek: CommercialPlanningDay,
    commercialClientId: number,
    commercialClientLocationId?: number | null,
    excludeId?: number
  ) {
    return CommercialPlanningItem.query()
      .where('agent_id', agentId)
      .where('day_of_week', dayOfWeek)
      .where('commercial_client_id', commercialClientId)
      .where('is_active', true)
      .if(commercialClientLocationId, (query) =>
        query.where('commercial_client_location_id', commercialClientLocationId!)
      )
      .if(!commercialClientLocationId, (query) => query.whereNull('commercial_client_location_id'))
      .if(excludeId, (query) => query.whereNot('id', excludeId!))
      .first()
  }

  private async ensureAgent(agentId: number) {
    const agent = await User.find(agentId)
    if (!agent || agent.role !== Role.AGENT_COMMERCIAL || !agent.isActive) {
      return null
    }
    return agent
  }

  private async logAssignmentHistory(
    data: {
      assignmentId?: number | null
      agentId?: number | null
      previousAgentId?: number | null
      commercialClientId?: number | null
      commercialClientLocationId?: number | null
      action: string
      performedBy?: number | null
      note?: string | null
      metadata?: any
    },
    trx?: any
  ) {
    await CommercialAssignmentHistory.create(
      {
        assignmentId: data.assignmentId ?? null,
        agentId: data.agentId ?? null,
        previousAgentId: data.previousAgentId ?? null,
        commercialClientId: data.commercialClientId ?? null,
        commercialClientLocationId: data.commercialClientLocationId ?? null,
        action: data.action,
        performedBy: data.performedBy ?? null,
        note: data.note ?? null,
        metadata: data.metadata ?? null,
      },
      trx ? { client: trx } : undefined
    )
  }

  private async ensureAssignmentAtAgent(
    agentId: number,
    commercialClientId: number | null,
    commercialClientLocationId: number | null,
    assignedBy: number,
    note: string | null,
    trx: any
  ) {
    const existing = await CommercialClientAssignment.query({ client: trx })
      .where('agent_id', agentId)
      .where('is_active', true)
      .if(commercialClientLocationId, (query) =>
        query.where('commercial_client_location_id', commercialClientLocationId!)
      )
      .if(!commercialClientLocationId, (query) =>
        query.where('commercial_client_id', commercialClientId!).whereNull('commercial_client_location_id')
      )
      .first()

    if (existing) {
      return existing
    }

    const assignment = await CommercialClientAssignment.create(
      {
        agentId,
        commercialClientId,
        commercialClientLocationId,
        assignedBy,
        note,
        isActive: true,
        startedAt: DateTime.now(),
      },
      { client: trx }
    )

    await this.logAssignmentHistory(
      {
        assignmentId: assignment.id,
        agentId: assignment.agentId,
        commercialClientId: assignment.commercialClientId,
        commercialClientLocationId: assignment.commercialClientLocationId,
        action: 'CREATE_ASSIGNMENT',
        performedBy: assignedBy,
        note,
        metadata: { viaTransfer: true },
      },
      trx
    )

    return assignment
  }

  private async transferSingleAssignment(
    assignment: CommercialClientAssignment,
    toAgentId: number,
    performedBy: number,
    note: string | null,
    trx: any
  ) {
    const existingAtDestination = await CommercialClientAssignment.query({ client: trx })
      .where('agent_id', toAgentId)
      .where('is_active', true)
      .if(assignment.commercialClientLocationId, (query) =>
        query.where('commercial_client_location_id', assignment.commercialClientLocationId!)
      )
      .if(!assignment.commercialClientLocationId, (query) =>
        query
          .where('commercial_client_id', assignment.commercialClientId!)
          .whereNull('commercial_client_location_id')
      )
      .first()

    assignment.isActive = false
    assignment.endedAt = DateTime.now()
    await assignment.useTransaction(trx).save()

    await this.logAssignmentHistory(
      {
        assignmentId: assignment.id,
        agentId: toAgentId,
        previousAgentId: assignment.agentId,
        commercialClientId: assignment.commercialClientId,
        commercialClientLocationId: assignment.commercialClientLocationId,
        action: 'TRANSFER_ASSIGNMENT',
        performedBy,
        note,
        metadata: { merged: Boolean(existingAtDestination) },
      },
      trx
    )

    if (existingAtDestination) {
      return 'merged'
    }

    await CommercialClientAssignment.create(
      {
        agentId: toAgentId,
        commercialClientId: assignment.commercialClientId,
        commercialClientLocationId: assignment.commercialClientLocationId,
        assignedBy: performedBy,
        note,
        isActive: true,
        startedAt: DateTime.now(),
      },
      { client: trx }
    )

    return 'transferred'
  }

  private getCommercialManagerRole(agentRole: Role) {
    if (agentRole === Role.AGENT_COMMERCIAL) return Role.COMMERCIAL_ADMIN
    if (agentRole === Role.COMMERCIAL_DETAILLANT) return Role.ADMIN_DETAILLANT
    return null
  }

  private getUserDisplayName(user?: User | null) {
    if (!user) return 'Utilisateur inconnu'
    return `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.phone || user.email || `Utilisateur #${user.id}`
  }

  private async getParentCommercialClient(planningItem: CommercialPlanningItem) {
    if (planningItem.commercialClientLocationId) {
      const location = await CommercialClientLocation.query()
        .where('id', planningItem.commercialClientLocationId)
        .preload('client')
        .first()

      return location?.client || null
    }

    if (planningItem.commercialClientId) {
      return CommercialClient.find(planningItem.commercialClientId)
    }

    return null
  }

  private async buildCommercialBlSnapshot(executionLogId: number) {
    const lines = await CommercialOrderLine.query()
      .where('execution_log_id', executionLogId)
      .preload('product')

    return lines.map((line) => ({
      productId: line.productId,
      productName: line.product?.name || '',
      productReference: line.product?.reference || '',
      quantity: line.quantity,
    }))
  }

  private async buildCommercialBlSnapshotFromLines(orderLines: Array<{ productId: number; quantity: number }>) {
    const productIds = [...new Set(orderLines.map((line) => Number(line.productId)))]
    const products = productIds.length > 0 ? await Product.query().whereIn('id', productIds) : []
    const productsById = new Map(products.map((product) => [product.id, product]))

    return orderLines.map((line) => {
      const product = productsById.get(Number(line.productId))
      return {
        productId: Number(line.productId),
        productName: product?.name || '',
        productReference: product?.reference || '',
        quantity: Number(line.quantity),
      }
    })
  }

  private async commercialBlRequestSnapshotsSupported() {
    try {
      const result = await db
        .from('information_schema.columns')
        .where('table_name', 'commercial_bl_modification_requests')
        .whereIn('column_name', ['before_snapshot', 'after_snapshot'])
        .count('* as total')
        .first()

      return Number(result?.total || 0) === 2
    } catch {
      return false
    }
  }

  private async commercialPersonalClientsSupported() {
    try {
      const result = await db
        .from('information_schema.columns')
        .whereIn('table_name', ['commercial_execution_logs', 'commercial_personal_clients'])
        .where((query) => {
          query
            .where((columnQuery) => {
              columnQuery
                .where('table_name', 'commercial_execution_logs')
                .where('column_name', 'personal_client_id')
            })
            .orWhere((columnQuery) => {
              columnQuery
                .where('table_name', 'commercial_personal_clients')
                .where('column_name', 'agent_id')
            })
        })
        .count('* as total')
        .first()

      return Number(result?.total || 0) === 2
    } catch {
      return false
    }
  }

  private async createCommercialBlDraft(
    executionLogId: number,
    createdBy: number,
    productsSnapshot: Array<{ productId: number; quantity: number }>,
    trx?: any
  ) {
    return CommercialBl.create(
      {
        executionLogId,
        createdBy,
        status: 'BROUILLON',
        productsSnapshot,
      },
      trx ? { client: trx } : undefined
    )
  }

  private isCommercialBlActive(bl?: CommercialBl | null) {
    return Boolean(bl && !['ANNULE', 'FACTURE'].includes(bl.status))
  }

  private async getBlockingCommercialBlForPlanningItem(planningItem: CommercialPlanningItem) {
    const range = getCurrentWeekPlanningDayRange(planningItem.dayOfWeek)

    return CommercialBl.query()
      .whereHas('executionLog', (query) => {
        query
          .where('planning_item_id', planningItem.id)
          .where('created_at', '>=', range.start.toSQL()!)
          .where('created_at', '<=', range.end.toSQL()!)
      })
      .whereNotIn('status', ['ANNULE', 'FACTURE', 'REJETE_ADMIN'])
      .preload('executionLog')
      .orderBy('created_at', 'desc')
      .first()
  }

  private async getActiveCommercialBlsMap(planningItemIds: number[]) {
    const map = new Map<number, CommercialBl>()
    if (planningItemIds.length === 0) return map

    const bls = await CommercialBl.query()
      .whereHas('executionLog', (query) => {
        query.whereIn('planning_item_id', planningItemIds)
      })
      .whereNotIn('status', ['ANNULE', 'FACTURE'])
      .preload('executionLog')
      .orderBy('created_at', 'desc')

    for (const bl of bls) {
      const planningItemId = bl.executionLog?.planningItemId
      if (planningItemId && !map.has(planningItemId)) {
        map.set(planningItemId, bl)
      }
    }

    return map
  }

  private async getPlanningItemClientName(planningItem: CommercialPlanningItem) {
    if (planningItem.commercialClientLocationId) {
      const location = await CommercialClientLocation.query()
        .where('id', planningItem.commercialClientLocationId)
        .preload('client')
        .first()

      return location?.name || location?.client?.name || 'Client inconnu'
    }

    if (planningItem.commercialClientId) {
      const client = await CommercialClient.find(planningItem.commercialClientId)
      return client?.name || 'Client inconnu'
    }

    return 'Client inconnu'
  }

  private async scheduleAgentFollowUpNotification(planningItem: CommercialPlanningItem, followUpAt: DateTime) {
    const clientName = await this.getPlanningItemClientName(planningItem)
    const dueState = CommercialFollowUpService.getFollowUpDueState(
      CommercialExecutionStatus.A_RELANCER,
      followUpAt
    )

    await CommercialFollowUpService.scheduleAgentFollowUpNotification(
      planningItem.agentId,
      clientName,
      followUpAt,
      dueState
    )
  }

  private async clearAgentFollowUpNotification(planningItem: CommercialPlanningItem) {
    const clientName = await this.getPlanningItemClientName(planningItem)
    await CommercialFollowUpService.clearAgentFollowUpNotifications(planningItem.agentId, clientName)
  }

  private normalizeSearchTerm(value?: string | null) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }

  private getAdminCommercialBlStatusSearchText(status: string) {
    switch (status) {
      case 'CONFIRME':
        return 'confirme en attente admin attente'
      case 'VALIDE_ADMIN':
        return 'valide autorise facturation'
      case 'REJETE_ADMIN':
        return 'rejete rejet'
      case 'FACTURE':
        return 'facture factures'
      default:
        return status
    }
  }

  private getCommercialExecutionStatusSearchText(status: string) {
    switch (status) {
      case CommercialExecutionStatus.APPELE:
        return 'appele appel repondu'
      case CommercialExecutionStatus.NON_REPONDU:
        return 'non repondu absent'
      case CommercialExecutionStatus.COMMANDE_PRISE:
        return 'commande prise commande client'
      case CommercialExecutionStatus.A_RELANCER:
        return 'relance a relancer rappel'
      default:
        return status
    }
  }

  private formatCommercialBl(bl?: CommercialBl | null) {
    if (!bl) return null
    const latestRequest = (bl.modificationRequests || [])
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0]

    return {
      id: String(bl.id),
      executionLogId: String(bl.executionLogId),
      status: bl.status,
      productsSnapshot: bl.productsSnapshot || [],
      comment: bl.comment,
      confirmedAt: bl.confirmedAt?.toISO() ?? null,
      editAuthorizedUntil: bl.editAuthorizedUntil?.toISO() ?? null,
      adminReviewedAt: bl.adminReviewedAt?.toISO() ?? null,
      adminReviewComment: bl.adminReviewComment,
      latestRequest: latestRequest
        ? {
            id: String(latestRequest.id),
            status: latestRequest.status,
            reason: latestRequest.reason,
            responseNote: latestRequest.responseNote,
            authorizedUntil: latestRequest.authorizedUntil?.toISO() ?? null,
          }
        : null,
    }
  }

  private formatPersonalClient(client: CommercialPersonalClient) {
    return {
      id: String(client.id),
      name: client.name,
      phone: client.phone,
      address: client.address,
      email: client.email,
      accountNumber: client.accountNumber,
      contactName: client.contactName,
      notes: client.notes,
      isActive: client.isActive,
      createdAt: client.createdAt.toISO(),
      updatedAt: client.updatedAt?.toISO() ?? null,
    }
  }

  private formatCommercialBlRequest(request: CommercialBlModificationRequest) {
    const log = request.commercialBl?.executionLog
    const clientInfo = this.resolveClientFromExecutionLog(log)

    return {
      id: String(request.id),
      commercialBlId: String(request.commercialBlId),
      status: request.status,
      reason: request.reason,
      responseNote: request.responseNote,
      beforeSnapshot: request.beforeSnapshot || [],
      afterSnapshot: request.afterSnapshot || [],
      createdAt: request.createdAt.toISO(),
      updatedAt: request.updatedAt?.toISO() ?? null,
      authorizedAt: request.authorizedAt?.toISO() ?? null,
      usedAt: request.usedAt?.toISO() ?? null,
      requester: request.requester
        ? {
            id: String(request.requester.id),
            name: `${request.requester.firstname || ''} ${request.requester.lastname || ''}`.trim(),
            role: request.requester.role,
          }
        : null,
      order: log
        ? {
            id: String(log.id),
            numeroCommande: `CMD-${log.id}`,
            clientName: clientInfo.name,
            parentName: clientInfo.parentName,
          }
        : null,
      reviewer: request.reviewer
        ? {
            id: String(request.reviewer.id),
            name: `${request.reviewer.firstname || ''} ${request.reviewer.lastname || ''}`.trim(),
            role: request.reviewer.role,
          }
        : null,
    }
  }

  private formatFacturationCommercialBl(bl: CommercialBl) {
    const log = bl.executionLog
    const clientInfo = this.resolveClientFromExecutionLog(log)
    const agent = log?.agent
    return {
      id: String(bl.id),
      executionLogId: String(bl.executionLogId),
      numeroCommande: `CMD-${bl.executionLogId}`,
      status: bl.status,
      confirmedAt: bl.confirmedAt?.toISO() ?? null,
      facturedAt: bl.facturedAt?.toISO() ?? null,
      adminReviewedAt: bl.adminReviewedAt?.toISO() ?? null,
      adminReviewComment: bl.adminReviewComment,
      clientName: clientInfo.name,
      clientAccountNumber: clientInfo.accountNumber,
      parentName: clientInfo.parentName,
      agentName: agent ? `${agent.firstname || ''} ${agent.lastname || ''}`.trim() || agent.phone : 'Commercial inconnu',
      products: (log?.orderLines || []).map((line) => ({
        productId: line.productId,
        productName: line.product?.name || '',
        productReference: line.product?.reference || '',
        quantity: line.quantity,
      })),
      facturedBy: bl.facturer
        ? `${bl.facturer.firstname || ''} ${bl.facturer.lastname || ''}`.trim() || bl.facturer.phone
        : null,
    }
  }

  private formatAdminCommercialBlReview(bl: CommercialBl) {
    const log = bl.executionLog
    const clientInfo = this.resolveClientFromExecutionLog(log)
    const agent = log?.agent
    return {
      id: String(bl.id),
      executionLogId: String(bl.executionLogId),
      numeroCommande: `CMD-${bl.executionLogId}`,
      status: bl.status,
      confirmedAt: bl.confirmedAt?.toISO() ?? null,
      adminReviewedAt: bl.adminReviewedAt?.toISO() ?? null,
      adminReviewComment: bl.adminReviewComment,
      clientName: clientInfo.name,
      clientAccountNumber: clientInfo.accountNumber,
      parentName: clientInfo.parentName,
      agentName: agent ? `${agent.firstname || ''} ${agent.lastname || ''}`.trim() || agent.phone : 'Commercial inconnu',
      agentId: agent ? String(agent.id) : null,
      products: (log?.orderLines || []).map((line) => ({
        productId: line.productId,
        productName: line.product?.name || '',
        productReference: line.product?.reference || '',
        quantity: line.quantity,
      })),
      reviewer: bl.adminReviewer
        ? `${bl.adminReviewer.firstname || ''} ${bl.adminReviewer.lastname || ''}`.trim() || bl.adminReviewer.phone
        : null,
    }
  }

  private async getCommercialBlForUser(blId: number, user: User) {
    const personalClientsSupported = await this.commercialPersonalClientsSupported()
    const bl = await CommercialBl.query()
      .where('id', blId)
      .preload('executionLog', (logQuery) => {
        ;(logQuery as any).preload('planningItem', (planningQuery: any) => {
          planningQuery.preload('client').preload('commercialClientLocation', (locationQuery: any) => {
            locationQuery.preload('client')
          })
        })
        if (personalClientsSupported) logQuery.preload('personalClient')
        logQuery.preload('orderLines', (linesQuery) => linesQuery.preload('product'))
        logQuery.preload('agent')
      })
      .preload('modificationRequests')
      .first()

    if (!bl) return null

    if ([Role.AGENT_COMMERCIAL, Role.COMMERCIAL_DETAILLANT].includes(user.role)) {
      if (bl.executionLog.agentId !== Number(user.id)) return null
    }

    await this.expireCommercialBlAuthorizationIfNeeded(bl)
    return bl
  }

  private async expireCommercialBlAuthorizationIfNeeded(bl: CommercialBl) {
    if (bl.status !== 'MODIFICATION_AUTORISEE') {
      return
    }

    if (!bl.editAuthorizedUntil || bl.editAuthorizedUntil < DateTime.now()) {
      bl.editAuthorizedUntil = DateTime.now().endOf('day')
      await bl.save()
    }
  }

  private async syncCommercialBlLines(
    bl: CommercialBl,
    orderLines: Array<{ productId: number; quantity: number }>,
    user: User,
    trx?: any
  ) {
    const wasAuthorizedEdit = bl.status === 'MODIFICATION_AUTORISEE'

    await CommercialOrderLine.query({ client: trx })
      .where('execution_log_id', bl.executionLogId)
      .delete()

    if (orderLines.length > 0) {
      await CommercialOrderLine.createMany(
        orderLines.map((line) => ({
          executionLogId: bl.executionLogId,
          productId: Number(line.productId),
          quantity: Number(line.quantity),
        })),
        trx ? { client: trx } : undefined
      )
    }

    bl.productsSnapshot = orderLines.map((line) => ({
      productId: Number(line.productId),
      quantity: Number(line.quantity),
    }))

    if (bl.status === 'MODIFICATION_AUTORISEE') {
      bl.status = 'CONFIRME'
      bl.editAuthorizedUntil = null
      bl.confirmedBy = Number(user.id)
      bl.confirmedAt = DateTime.now()
      bl.adminReviewedBy = null
      bl.adminReviewedAt = null
      bl.adminReviewComment = null
      const request = await CommercialBlModificationRequest.query({ client: trx })
        .where('commercial_bl_id', bl.id)
        .where('status', 'APPROUVEE')
        .orderBy('created_at', 'desc')
        .first()
      if (request) {
        request.status = 'UTILISEE'
        request.usedAt = DateTime.now()
        if (await this.commercialBlRequestSnapshotsSupported()) {
          request.afterSnapshot = await this.buildCommercialBlSnapshotFromLines(orderLines)
        }
        await request.useTransaction(trx).save()
      }
    }

    await bl.useTransaction(trx).save()

    await UserActivityService.logActivity(
      Number(user.id),
      UserActivityService.ACTIONS.UPDATE_AUTHORIZED_COMMERCIAL_BL,
      user.role,
      undefined,
      {
        commercialBlId: bl.id,
        executionLogId: bl.executionLogId,
        status: bl.status,
        orderLines,
      }
    )

    if (wasAuthorizedEdit) {
      await this.notifyCommercialManager(
        user,
        'BC commercial modifié',
        `${this.getUserDisplayName(user)} a modifié le BC commercial #${bl.id} après autorisation. Le BC repasse en attente de validation ADMIN.`,
        {
          commercialBlId: bl.id,
          executionLogId: bl.executionLogId,
          type: 'commercial_bl_authorized_update',
        }
      )
      await NotificationService.notifyRole(
        Role.ADMIN,
        'BC commercial modifié',
        `${this.getUserDisplayName(user)} a modifié le BC commercial #${bl.id}. Il attend une nouvelle validation ADMIN.`,
        undefined,
        { commercialBlId: bl.id, executionLogId: bl.executionLogId, type: 'commercial_bl_confirmed_after_authorized_update' }
      )
    }
  }

  private async notifyCommercialManager(agent: User, title: string, message: string, details?: any) {
    const managerRole = this.getCommercialManagerRole(agent.role)
    if (!managerRole) return

    await NotificationService.notifyRole(managerRole, title, message, undefined, details)
  }

  private async requireFacturationUser({ auth, response }: HttpContext) {
    const user = await auth.authenticate()
    if (user.role !== Role.FACTURATION) {
      response.status(403).json({ message: 'Accès réservé au rôle facturation' })
      return null
    }
    return user
  }

  async dashboard(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const [
      activeAgents,
      activeClients,
      activeLocations,
      activeAssignments,
      invoicesCount,
      planningToday,
    ] = await Promise.all([
      User.query().where('role', Role.AGENT_COMMERCIAL).where('is_active', true).count('* as total').first(),
      CommercialClient.query().where('is_active', true).count('* as total').first(),
      CommercialClientLocation.query().where('is_active', true).count('* as total').first(),
      CommercialClientAssignment.query().where('is_active', true).count('* as total').first(),
      Invoice.query().count('* as total').first(),
      CommercialPlanningItem.query()
        .where('is_active', true)
        .where('day_of_week', this.getTodayPlanningDay())
        .count('* as total')
        .first(),
    ])

    const alerts = await this.buildAlerts()

    return ctx.response.json({
      stats: {
        activeAgents: Number(activeAgents?.$extras.total || 0),
        activeClients: Number(activeClients?.$extras.total || 0),
        activeLocations: Number(activeLocations?.$extras.total || 0),
        activeAssignments: Number(activeAssignments?.$extras.total || 0),
        invoicesCount: Number(invoicesCount?.$extras.total || 0),
        planningToday: Number(planningToday?.$extras.total || 0),
      },
      alerts,
    })
  }

  async teamStats(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const { period = '7d', from, to } = ctx.request.qs()
    const resolvedPeriod = from ? 'custom' : String(period)
    const { start, end } = this.getTeamStatsPeriodRange(resolvedPeriod, from, to)
    const today = this.getTodayPlanningDay()
    const todayRange = this.getCurrentWeekPlanningDayRange(today)
    const trendStart = start.startOf('day')
    const trendEnd = end.endOf('day')

    const [
      portfolioCounts,
      agents,
      periodLogs,
      todayPlanningItems,
      blStatusRows,
      pendingBcRequestsResult,
      dailyTrendRows,
      pendingFollowUps,
      alerts,
    ] = await Promise.all([
      Promise.all([
        User.query().where('role', Role.AGENT_COMMERCIAL).where('is_active', true).count('* as total').first(),
        CommercialClient.query().where('is_active', true).count('* as total').first(),
        CommercialClientLocation.query().where('is_active', true).count('* as total').first(),
        CommercialClientAssignment.query().where('is_active', true).count('* as total').first(),
        Invoice.query().count('* as total').first(),
        CommercialPlanningItem.query()
          .where('is_active', true)
          .where('day_of_week', today)
          .count('* as total')
          .first(),
      ]),
      User.query().where('role', Role.AGENT_COMMERCIAL).where('is_active', true).orderBy('firstname', 'asc'),
      CommercialExecutionLog.query()
        .where('created_at', '>=', start.toSQL()!)
        .where('created_at', '<=', end.toSQL()!)
        .preload('orderLines'),
      CommercialPlanningItem.query()
        .where('day_of_week', today)
        .where('is_active', true)
        .preload('executionLogs', (logsQuery) => this.preloadExecutionLogsForRange(logsQuery, todayRange)),
      db.from('commercial_bls').select('status').count('* as total').groupBy('status'),
      CommercialBlModificationRequest.query().where('status', 'EN_ATTENTE').count('* as total').first(),
      db
        .from('commercial_execution_logs')
        .where('created_at', '>=', trendStart.toSQL()!)
        .where('created_at', '<=', trendEnd.toSQL()!)
        .select(
          db.raw('DATE(created_at) as day'),
          db.raw('COUNT(*)::int as actions'),
          db.raw("SUM(CASE WHEN status = 'COMMANDE_PRISE' THEN 1 ELSE 0 END)::int as orders")
        )
        .groupByRaw('DATE(created_at)')
        .orderBy('day', 'asc'),
      CommercialFollowUpService.getPendingFollowUps(),
      this.buildAlerts(),
    ])

    const [
      activeAgents,
      activeClients,
      activeLocations,
      activeAssignments,
      invoicesCount,
      planningToday,
    ] = portfolioCounts

    const todayByStatus = {
      [CommercialExecutionStatus.APPELE]: 0,
      [CommercialExecutionStatus.NON_REPONDU]: 0,
      [CommercialExecutionStatus.COMMANDE_PRISE]: 0,
      [CommercialExecutionStatus.A_RELANCER]: 0,
    }
    let todayCompleted = 0
    const todayByAgent = new Map<number, { planned: number; completed: number }>()

    for (const item of todayPlanningItems) {
      const latestLog = item.executionLogs?.[0]
      const isCompleted = isTourItemCompleted(latestLog?.status as CommercialExecutionStatus | undefined)

      if (isCompleted) todayCompleted++
      if (latestLog?.status) {
        todayByStatus[latestLog.status] = (todayByStatus[latestLog.status] || 0) + 1
      }

      const agentStats = todayByAgent.get(Number(item.agentId)) || { planned: 0, completed: 0 }
      agentStats.planned++
      if (isCompleted) agentStats.completed++
      todayByAgent.set(Number(item.agentId), agentStats)
    }

    const todayPlanned = todayPlanningItems.length
    const todayPending = todayPlanned - todayCompleted

    const byAction = {
      [CommercialExecutionStatus.APPELE]: 0,
      [CommercialExecutionStatus.NON_REPONDU]: 0,
      [CommercialExecutionStatus.COMMANDE_PRISE]: 0,
      [CommercialExecutionStatus.A_RELANCER]: 0,
    }
    let totalProducts = 0
    const clientsTouched = new Set<string>()
    const agentPeriodStats = new Map<
      number,
      { total: number; orders: number; relances: number; responded: number }
    >()

    for (const log of periodLogs) {
      byAction[log.status] = (byAction[log.status] || 0) + 1
      totalProducts += (log.orderLines || []).reduce((sum, line) => sum + Number(line.quantity || 0), 0)
      clientsTouched.add(String(log.planningItemId || log.personalClientId || log.id))

      const agentStats = agentPeriodStats.get(log.agentId) || { total: 0, orders: 0, relances: 0, responded: 0 }
      agentStats.total++
      if (log.status === CommercialExecutionStatus.COMMANDE_PRISE) agentStats.orders++
      if (log.status === CommercialExecutionStatus.A_RELANCER) agentStats.relances++
      if ([CommercialExecutionStatus.APPELE, CommercialExecutionStatus.COMMANDE_PRISE].includes(log.status)) {
        agentStats.responded++
      }
      agentPeriodStats.set(log.agentId, agentStats)
    }

    const periodTotal = periodLogs.length
    const responded =
      byAction[CommercialExecutionStatus.APPELE] + byAction[CommercialExecutionStatus.COMMANDE_PRISE]
    const responseRate = periodTotal > 0 ? Math.round((responded / periodTotal) * 100) : 0

    const startOfCurrentMonth = DateTime.local().startOf('month')
    const endOfCurrentMonth = DateTime.local().endOf('month')
    const startOfPreviousMonth = startOfCurrentMonth.minus({ months: 1 }).startOf('month')
    const endOfPreviousMonth = startOfCurrentMonth.minus({ days: 1 }).endOf('day')

    const [currentMonthTotalResult, previousMonthTotalResult] = await Promise.all([
      CommercialExecutionLog.query()
        .where('created_at', '>=', startOfCurrentMonth.toSQL()!)
        .where('created_at', '<=', endOfCurrentMonth.toSQL()!)
        .count('* as total')
        .first(),
      CommercialExecutionLog.query()
        .where('created_at', '>=', startOfPreviousMonth.toSQL()!)
        .where('created_at', '<=', endOfPreviousMonth.toSQL()!)
        .count('* as total')
        .first(),
    ])

    const currentMonth = Number(currentMonthTotalResult?.$extras.total || 0)
    const previousMonth = Number(previousMonthTotalResult?.$extras.total || 0)
    const difference = currentMonth - previousMonth
    const percent = previousMonth > 0 ? Math.round((difference / previousMonth) * 100) : currentMonth > 0 ? 100 : 0

    const bcPipeline = {
      pendingEditRequests: Number(pendingBcRequestsResult?.$extras.total || 0),
      brouillon: 0,
      confirme: 0,
      modificationDemandee: 0,
      valideAdmin: 0,
      rejeteAdmin: 0,
      facture: 0,
      annule: 0,
      total: 0,
    }

    for (const row of blStatusRows) {
      const count = Number(row.total || 0)
      bcPipeline.total += count
      switch (row.status) {
        case 'BROUILLON':
          bcPipeline.brouillon += count
          break
        case 'CONFIRME':
          bcPipeline.confirme += count
          break
        case 'MODIFICATION_DEMANDEE':
        case 'MODIFICATION_AUTORISEE':
          bcPipeline.modificationDemandee += count
          break
        case 'VALIDE_ADMIN':
          bcPipeline.valideAdmin += count
          break
        case 'REJETE_ADMIN':
          bcPipeline.rejeteAdmin += count
          break
        case 'FACTURE':
          bcPipeline.facture += count
          break
        case 'ANNULE':
          bcPipeline.annule += count
          break
      }
    }

    const agentRanking = agents.map((agent) => {
      const agentId = Number(agent.id)
      const periodStats = agentPeriodStats.get(agentId) || { total: 0, orders: 0, relances: 0, responded: 0 }
      const todayStats = todayByAgent.get(agentId) || { planned: 0, completed: 0 }
      const agentResponseRate =
        periodStats.total > 0 ? Math.round((periodStats.responded / periodStats.total) * 100) : 0
      const todayRate =
        todayStats.planned > 0 ? Math.round((todayStats.completed / todayStats.planned) * 100) : 0

      return {
        agentId,
        name: this.getUserDisplayName(agent),
        total: periodStats.total,
        orders: periodStats.orders,
        relances: periodStats.relances,
        responseRate: agentResponseRate,
        todayPlanned: todayStats.planned,
        todayCompleted: todayStats.completed,
        todayRate,
      }
    })

    agentRanking.sort((a, b) => b.total - a.total || b.orders - a.orders)

    const followUpsDue = pendingFollowUps.filter((item) => item.dueState === 'due_today').length
    const followUpsOverdue = pendingFollowUps.filter((item) => item.dueState === 'overdue').length

    const dailyTrend = this.fillDailyTrendGaps(
      dailyTrendRows.map((row: any) => ({
        date: String(row.day).slice(0, 10),
        actions: Number(row.actions || 0),
        orders: Number(row.orders || 0),
      })),
      trendStart,
      trendEnd
    )

    return ctx.response.json({
      period: resolvedPeriod,
      periodRange: {
        from: start.toISODate(),
        to: end.toISODate(),
      },
      portfolio: {
        activeAgents: Number(activeAgents?.$extras.total || 0),
        activeClients: Number(activeClients?.$extras.total || 0),
        activeLocations: Number(activeLocations?.$extras.total || 0),
        activeAssignments: Number(activeAssignments?.$extras.total || 0),
        invoicesCount: Number(invoicesCount?.$extras.total || 0),
        planningToday: Number(planningToday?.$extras.total || 0),
      },
      todayTour: {
        planned: todayPlanned,
        completed: todayCompleted,
        pending: todayPending,
        executionRate: todayPlanned > 0 ? Math.round((todayCompleted / todayPlanned) * 100) : 0,
        followUpsDue,
        followUpsOverdue,
        byStatus: todayByStatus,
      },
      periodStats: {
        total: periodTotal,
        byAction,
        totalProducts,
        clientsTouched: clientsTouched.size,
        responseRate,
        orders: byAction[CommercialExecutionStatus.COMMANDE_PRISE],
        relances: byAction[CommercialExecutionStatus.A_RELANCER],
        monthlyTrend: {
          currentMonth,
          previousMonth,
          difference,
          percent,
          direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'stable',
        },
      },
      dailyTrend,
      agentRanking,
      bcPipeline,
      alerts,
    })
  }

  async agents(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const agents = await User.query()
      .where('role', Role.AGENT_COMMERCIAL)
      .orderBy('created_at', 'desc')

    return ctx.response.json(agents)
  }

  async storeAgent(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const data = await ctx.request.validateUsing(userValidatorStore)
    if (data.password !== data.confirmPassword) {
      return ctx.response.status(400).json({ message: 'Les mots de passe ne correspondent pas' })
    }

    const { confirmPassword, ...agentData } = data
    const user = await User.create({
      ...agentData,
      role: Role.AGENT_COMMERCIAL,
      depotId: null,
    })

    return ctx.response.status(201).json({ success: true, user })
  }

  async updateAgent(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const agent = await User.query()
      .where('id', ctx.params.id)
      .where('role', Role.AGENT_COMMERCIAL)
      .first()

    if (!agent) {
      return ctx.response.status(404).json({ message: 'Commercial introuvable' })
    }

    const data = await ctx.request.validateUsing(userValidatorUpdate)
    if (data.password && data.password !== data.confirmPassword) {
      return ctx.response.status(400).json({ message: 'Les mots de passe ne correspondent pas' })
    }

    const { confirmPassword, ...userData } = data
    if (!userData.password) {
      delete userData.password
    }
    agent.merge({
      ...userData,
      role: Role.AGENT_COMMERCIAL,
      depotId: null,
    } as Partial<User>)
    await agent.save()

    return ctx.response.json({ success: true, user: agent })
  }

  async deactivateAgent(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const agent = await User.query()
      .where('id', ctx.params.id)
      .where('role', Role.AGENT_COMMERCIAL)
      .first()

    if (!agent) {
      return ctx.response.status(404).json({ message: 'Commercial introuvable' })
    }

    agent.isActive = false
    await agent.save()

    await CommercialClientAssignment.query()
      .where('agent_id', agent.id)
      .where('is_active', true)
      .update({ is_active: false, ended_at: DateTime.now().toSQL() })

    await this.logAssignmentHistory({
      agentId: Number(agent.id),
      action: 'DEACTIVATE_AGENT',
      performedBy: Number(currentUser.id),
      note: 'Commercial désactivé',
    })

    return ctx.response.json({ success: true })
  }

  async clients(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const { search, type, includeInactive } = ctx.request.qs()
    let query = CommercialClient.query()
      .preload('locations')
      .preload('assignments', (assignmentQuery) => {
        assignmentQuery.where('is_active', true).preload('agent')
      })
      .orderBy('created_at', 'desc')

    if (!includeInactive) {
      query = query.where('is_active', true)
    }
    if (type) {
      query = query.where('type', type)
    }
    if (search) {
      query = query.where((builder) => {
        builder
          .where('name', 'ILIKE', `%${search}%`)
          .orWhere('phone', 'ILIKE', `%${search}%`)
          .orWhere('account_number', 'ILIKE', `%${search}%`)
      })
    }

    return ctx.response.json(await query)
  }

  async storeClient(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const data = await ctx.request.validateUsing(commercialClientValidator)
    const client = await CommercialClient.create({
      ...data,
      createdBy: Number(currentUser.id),
      isActive: data.isActive ?? true,
    })

    return ctx.response.status(201).json(client)
  }

  async updateClient(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const client = await CommercialClient.find(ctx.params.id)
    if (!client) {
      return ctx.response.status(404).json({ message: 'Client commercial introuvable' })
    }

    const data = await ctx.request.validateUsing(commercialClientValidator)
    client.merge(data)
    if (data.isActive === false) {
      client.disabledAt = DateTime.now()
    }
    await client.save()

    return ctx.response.json(client)
  }

  async deactivateClient(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const client = await CommercialClient.find(ctx.params.id)
    if (!client) {
      return ctx.response.status(404).json({ message: 'Client commercial introuvable' })
    }

    client.isActive = false
    client.disabledAt = DateTime.now()
    await client.save()

    await CommercialClientAssignment.query()
      .where('commercial_client_id', client.id)
      .where('is_active', true)
      .update({ is_active: false, ended_at: DateTime.now().toSQL() })

    await this.logAssignmentHistory({
      commercialClientId: client.id,
      action: 'DEACTIVATE_CLIENT',
      performedBy: Number(currentUser.id),
    })

    return ctx.response.json({ success: true })
  }

  async activateClient(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const client = await CommercialClient.find(ctx.params.id)
    if (!client) {
      return ctx.response.status(404).json({ message: 'Client commercial introuvable' })
    }

    client.isActive = true
    client.disabledAt = null
    await client.save()

    await this.logAssignmentHistory({
      commercialClientId: client.id,
      action: 'ACTIVATE_CLIENT',
      performedBy: Number(currentUser.id),
    })

    return ctx.response.json({ success: true })
  }

  async storeLocation(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const data = await ctx.request.validateUsing(commercialClientLocationValidator)
    const client = await CommercialClient.find(data.commercialClientId)
    if (!client || client.type !== CommercialClientType.MAGASIN) {
      return ctx.response.status(422).json({ message: 'Le local doit appartenir à un client de type MAGASIN' })
    }

    const location = await CommercialClientLocation.create({
      ...data,
      isActive: data.isActive ?? true,
    })

    return ctx.response.status(201).json(location)
  }

  async updateLocation(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const location = await CommercialClientLocation.find(ctx.params.id)
    if (!location) {
      return ctx.response.status(404).json({ message: 'Local introuvable' })
    }

    const data = await ctx.request.validateUsing(commercialClientLocationValidator)
    location.merge(data)
    if (data.isActive === false) {
      location.disabledAt = DateTime.now()
    }
    await location.save()

    return ctx.response.json(location)
  }

  async deactivateLocation(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const location = await CommercialClientLocation.find(ctx.params.id)
    if (!location) {
      return ctx.response.status(404).json({ message: 'Local introuvable' })
    }

    location.isActive = false
    location.disabledAt = DateTime.now()
    await location.save()

    await CommercialClientAssignment.query()
      .where('commercial_client_location_id', location.id)
      .where('is_active', true)
      .update({ is_active: false, ended_at: DateTime.now().toSQL() })

    await this.logAssignmentHistory({
      commercialClientId: location.commercialClientId,
      commercialClientLocationId: location.id,
      action: 'DEACTIVATE_LOCATION',
      performedBy: Number(currentUser.id),
    })

    return ctx.response.json({ success: true })
  }

  async activateLocation(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const location = await CommercialClientLocation.find(ctx.params.id)
    if (!location) {
      return ctx.response.status(404).json({ message: 'Local introuvable' })
    }

    const client = await CommercialClient.find(location.commercialClientId)
    if (!client || !client.isActive) {
      return ctx.response.status(422).json({ message: "Activez d'abord l'enseigne liée au local" })
    }

    location.isActive = true
    location.disabledAt = null
    await location.save()

    await this.logAssignmentHistory({
      commercialClientId: location.commercialClientId,
      commercialClientLocationId: location.id,
      action: 'ACTIVATE_LOCATION',
      performedBy: Number(currentUser.id),
    })

    return ctx.response.json({ success: true })
  }

  async assignments(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const assignments = await CommercialClientAssignment.query()
      .preload('agent')
      .preload('client')
      .where('is_active', true)
      .orderBy('created_at', 'desc')

    return ctx.response.json(await this.attachLocations(assignments))
  }

  async storeAssignment(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const data = await ctx.request.validateUsing(commercialAssignmentValidator)
    const agent = await this.ensureAgent(data.agentId)
    if (!agent) {
      return ctx.response.status(422).json({ message: 'Commercial invalide ou inactif' })
    }

    const target = await this.validateCommercialTarget(data.commercialClientId, data.commercialClientLocationId)
    if ('error' in target) {
      return ctx.response.status(422).json({ message: target.error })
    }

    const existingAssignments = await CommercialClientAssignment.query()
      .where('is_active', true)
      .if(target.locationId, (query) => query.where('commercial_client_location_id', target.locationId!))
      .if(!target.locationId, (query) => query.where('commercial_client_id', target.clientId).whereNull('commercial_client_location_id'))

    for (const existingAssignment of existingAssignments) {
      existingAssignment.isActive = false
      existingAssignment.endedAt = DateTime.now()
      await existingAssignment.save()
      await this.logAssignmentHistory({
        assignmentId: existingAssignment.id,
        previousAgentId: existingAssignment.agentId,
        commercialClientId: existingAssignment.commercialClientId,
        commercialClientLocationId: existingAssignment.commercialClientLocationId,
        action: 'TRANSFER_ASSIGNMENT',
        performedBy: Number(currentUser.id),
        metadata: { newAgentId: data.agentId },
      })
    }

    const assignment = await CommercialClientAssignment.create({
      agentId: data.agentId,
      commercialClientId: target.clientId,
      commercialClientLocationId: target.locationId,
      assignedBy: Number(currentUser.id),
      note: data.note ?? null,
      isActive: data.isActive ?? true,
      startedAt: DateTime.now(),
    })

    await this.logAssignmentHistory({
      assignmentId: assignment.id,
      agentId: assignment.agentId,
      commercialClientId: assignment.commercialClientId,
      commercialClientLocationId: assignment.commercialClientLocationId,
      action: 'CREATE_ASSIGNMENT',
      performedBy: Number(currentUser.id),
      note: assignment.note,
    })

    await assignment.load('agent')
    await assignment.load('client')

    const [serializedAssignment] = await this.attachLocations([assignment])

    return ctx.response.status(201).json(serializedAssignment)
  }

  async deactivateAssignment(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const assignment = await CommercialClientAssignment.find(ctx.params.id)
    if (!assignment) {
      return ctx.response.status(404).json({ message: 'Affectation introuvable' })
    }

    assignment.isActive = false
    assignment.endedAt = DateTime.now()
    await assignment.save()

    await this.logAssignmentHistory({
      assignmentId: assignment.id,
      agentId: assignment.agentId,
      commercialClientId: assignment.commercialClientId,
      commercialClientLocationId: assignment.commercialClientLocationId,
      action: 'DEACTIVATE_ASSIGNMENT',
      performedBy: Number(currentUser.id),
    })

    return ctx.response.json({ success: true })
  }

  async transferCommercialResources(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const data = await ctx.request.validateUsing(commercialTransferValidator)

    if (data.fromAgentId === data.toAgentId) {
      return ctx.response.status(422).json({
        message: 'Le commercial source et le commercial destination doivent être différents',
      })
    }

    if (!data.transferPortfolio && !data.transferPlanning) {
      return ctx.response.status(422).json({
        message: 'Sélectionnez au moins le portefeuille ou le planning à transférer',
      })
    }

    const fromAgent = await this.ensureAgent(data.fromAgentId)
    const toAgent = await this.ensureAgent(data.toAgentId)
    if (!fromAgent || !toAgent) {
      return ctx.response.status(422).json({ message: 'Commercial invalide ou inactif' })
    }

    const trx = await db.transaction()

    try {
      let assignmentsTransferred = 0
      let assignmentsMerged = 0
      let planningTransferred = 0
      let planningSkipped = 0
      const performedBy = Number(currentUser.id)
      const note = data.note ?? null

      if (data.transferPortfolio) {
        const assignments = await CommercialClientAssignment.query({ client: trx })
          .where('agent_id', data.fromAgentId)
          .where('is_active', true)

        for (const assignment of assignments) {
          const result = await this.transferSingleAssignment(
            assignment,
            data.toAgentId,
            performedBy,
            note,
            trx
          )
          if (result === 'merged') {
            assignmentsMerged++
          } else {
            assignmentsTransferred++
          }
        }
      }

      if (data.transferPlanning) {
        const planningItems = await CommercialPlanningItem.query({ client: trx })
          .where('agent_id', data.fromAgentId)
          .where('is_active', true)

        for (const planningItem of planningItems) {
          if (!planningItem.commercialClientId) {
            planningSkipped++
            continue
          }

          if (!data.transferPortfolio) {
            await this.ensureAssignmentAtAgent(
              data.toAgentId,
              planningItem.commercialClientId,
              planningItem.commercialClientLocationId,
              performedBy,
              note,
              trx
            )
          }

          const duplicate = await CommercialPlanningItem.query({ client: trx })
            .where('agent_id', data.toAgentId)
            .where('day_of_week', planningItem.dayOfWeek)
            .where('commercial_client_id', planningItem.commercialClientId)
            .where('is_active', true)
            .if(planningItem.commercialClientLocationId, (query) =>
              query.where('commercial_client_location_id', planningItem.commercialClientLocationId!)
            )
            .if(!planningItem.commercialClientLocationId, (query) =>
              query.whereNull('commercial_client_location_id')
            )
            .whereNot('id', planningItem.id)
            .first()

          if (duplicate) {
            planningItem.isActive = false
            planningItem.disabledAt = DateTime.now()
            await planningItem.useTransaction(trx).save()
            planningSkipped++
            continue
          }

          planningItem.agentId = data.toAgentId
          await planningItem.useTransaction(trx).save()
          planningTransferred++
        }
      }

      await this.logAssignmentHistory(
        {
          agentId: data.toAgentId,
          previousAgentId: data.fromAgentId,
          action: 'BULK_TRANSFER',
          performedBy,
          note,
          metadata: {
            transferPortfolio: data.transferPortfolio,
            transferPlanning: data.transferPlanning,
            assignmentsTransferred,
            assignmentsMerged,
            planningTransferred,
            planningSkipped,
          },
        },
        trx
      )

      await trx.commit()

      return ctx.response.json({
        assignmentsTransferred,
        assignmentsMerged,
        planningTransferred,
        planningSkipped,
      })
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async histories(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const histories = await CommercialAssignmentHistory.query()
      .preload('agent')
      .preload('previousAgent')
      .preload('performer')
      .preload('client')
      .orderBy('created_at', 'desc')
      .limit(100)

    return ctx.response.json(await this.attachLocations(histories))
  }

  async planning(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const { agentId, day } = ctx.request.qs()
    let query = CommercialPlanningItem.query()
      .preload('agent')
      .preload('client')
      .where('is_active', true)
      .orderBy('day_of_week', 'asc')
      .orderBy('sort_order', 'asc')

    if (agentId) {
      query = query.where('agent_id', agentId)
    }
    if (day) {
      query = query.where('day_of_week', day)
    }

    return ctx.response.json(await this.attachLocations(await query))
  }

  async storePlanning(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const data = await ctx.request.validateUsing(commercialPlanningValidator)
    const agent = await this.ensureAgent(data.agentId)
    if (!agent) {
      return ctx.response.status(422).json({ message: 'Commercial invalide ou inactif' })
    }

    const target = await this.validateCommercialTarget(data.commercialClientId, data.commercialClientLocationId)
    if ('error' in target) {
      return ctx.response.status(422).json({ message: target.error })
    }

    const targetInPortfolio = await this.ensureTargetInAgentPortfolio(
      data.agentId,
      target.clientId,
      target.locationId
    )
    if (!targetInPortfolio) {
      return ctx.response.status(422).json({ message: 'Cette cible ne fait pas partie du portefeuille du commercial' })
    }

    const duplicatePlanningItem = await this.findDuplicatePlanningItem(
      data.agentId,
      data.dayOfWeek,
      target.clientId,
      target.locationId
    )
    if (duplicatePlanningItem) {
      return ctx.response.status(422).json({
        message: 'Cette cible est déjà planifiée pour ce commercial le même jour',
      })
    }

    const planningItem = await CommercialPlanningItem.create({
      agentId: data.agentId,
      commercialClientId: target.clientId,
      commercialClientLocationId: target.locationId,
      dayOfWeek: data.dayOfWeek,
      sortOrder: data.sortOrder ?? 0,
      instructions: data.instructions ?? null,
      isActive: data.isActive ?? true,
      createdBy: Number(currentUser.id),
    })

    await planningItem.load('agent')
    await planningItem.load('client')

    const [serializedPlanningItem] = await this.attachLocations([planningItem])

    return ctx.response.status(201).json(serializedPlanningItem)
  }

  async updatePlanning(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const planningItem = await CommercialPlanningItem.find(ctx.params.id)
    if (!planningItem) {
      return ctx.response.status(404).json({ message: 'Programme introuvable' })
    }

    const data = await ctx.request.validateUsing(commercialPlanningValidator)
    const agent = await this.ensureAgent(data.agentId)
    if (!agent) {
      return ctx.response.status(422).json({ message: 'Commercial invalide ou inactif' })
    }

    const target = await this.validateCommercialTarget(data.commercialClientId, data.commercialClientLocationId)
    if ('error' in target) {
      return ctx.response.status(422).json({ message: target.error })
    }

    const targetInPortfolio = await this.ensureTargetInAgentPortfolio(
      data.agentId,
      target.clientId,
      target.locationId
    )
    if (!targetInPortfolio) {
      return ctx.response.status(422).json({ message: 'Cette cible ne fait pas partie du portefeuille du commercial' })
    }

    const duplicatePlanningItem = await this.findDuplicatePlanningItem(
      data.agentId,
      data.dayOfWeek,
      target.clientId,
      target.locationId,
      planningItem.id
    )
    if (duplicatePlanningItem) {
      return ctx.response.status(422).json({
        message: 'Cette cible est déjà planifiée pour ce commercial le même jour',
      })
    }

    planningItem.merge({
      agentId: data.agentId,
      commercialClientId: target.clientId,
      commercialClientLocationId: target.locationId,
      dayOfWeek: data.dayOfWeek,
      sortOrder: data.sortOrder ?? planningItem.sortOrder,
      instructions: data.instructions ?? null,
      isActive: data.isActive ?? planningItem.isActive,
    })

    if (data.isActive === false) {
      planningItem.disabledAt = DateTime.now()
    }

    await planningItem.save()
    return ctx.response.json(planningItem)
  }

  async deactivatePlanning(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const planningItem = await CommercialPlanningItem.find(ctx.params.id)
    if (!planningItem) {
      return ctx.response.status(404).json({ message: 'Programme introuvable' })
    }

    planningItem.isActive = false
    planningItem.disabledAt = DateTime.now()
    await planningItem.save()

    return ctx.response.json({ success: true })
  }

  async alerts(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    return ctx.response.json(await this.buildAlerts())
  }

  async importClients(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAdmin(ctx)
    if (!currentUser) return

    const data = await ctx.request.validateUsing(commercialImportValidator)
    const errors: Array<{ row: number; message: string }> = []
    let successCount = 0

    for (const [index, row] of data.rows.entries()) {
      try {
        const client = await CommercialClient.create({
          name: row.name,
          type: row.type,
          phone: row.phone ?? null,
          address: row.address ?? null,
          email: row.email ?? null,
          accountNumber: row.accountNumber ?? null,
          contactName: row.contactName ?? null,
          notes: row.notes ?? null,
          createdBy: Number(currentUser.id),
          isActive: true,
        })

        if (row.type === CommercialClientType.MAGASIN && row.locationName) {
          await CommercialClientLocation.create({
            commercialClientId: client.id,
            name: row.locationName,
            address: row.locationAddress ?? row.address ?? null,
            phone: row.locationPhone ?? row.phone ?? null,
            responsable: row.locationResponsable ?? row.contactName ?? null,
            isActive: true,
          })
        }

        successCount++
      } catch (error) {
        errors.push({
          row: index + 2,
          message: error.message || 'Erreur import ligne',
        })
      }
    }

    const importLog = await CommercialClientImport.create({
      importedBy: Number(currentUser.id),
      fileName: data.fileName ?? null,
      totalRows: data.rows.length,
      successCount,
      errorCount: errors.length,
      errors,
    })

    return ctx.response.json(importLog)
  }

  async agentClients(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    const { day, agentId } = ctx.request.qs()
    const targetAgentId =
      currentUser.role === Role.AGENT_COMMERCIAL ? Number(currentUser.id) : Number(agentId || currentUser.id)
    const selectedDay = (day || this.getTodayPlanningDay()) as CommercialPlanningDay
    const canModify = selectedDay === this.getTodayPlanningDay()
    const selectedDayRange = this.getCurrentWeekPlanningDayRange(selectedDay)

    const planningItems = await CommercialPlanningItem.query()
      .where('agent_id', targetAgentId)
      .where('day_of_week', selectedDay)
      .where('is_active', true)
      .preload('client')
      .preload('executionLogs', (logsQuery) => this.preloadExecutionLogsForRange(logsQuery, selectedDayRange))
      .orderBy('sort_order', 'asc')

    const locations = await this.getLocationsMap(planningItems.map((item) => item.commercialClientLocationId))
    const activeBcs = await this.getActiveCommercialBlsMap(planningItems.map((item) => item.id))

    return ctx.response.json(planningItems.map((item) => this.formatAgentPlanningItem(item, locations, canModify, activeBcs)))
  }

  async agentStats(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    const clients = await this.agentClientsData(ctx)
    const completedClients = clients.filter((client) => client.status === 'effectuer').length

    return ctx.response.json({
      totalClients: clients.length,
      completedClients,
      pendingClients: clients.length - completedClients,
      progress: {
        current: completedClients,
        total: clients.length,
      },
    })
  }

  async agentFollowUps(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    const { agentId } = ctx.request.qs()
    const targetAgentId =
      currentUser.role === Role.AGENT_COMMERCIAL ? Number(currentUser.id) : Number(agentId || currentUser.id)
    const canModify = true

    const pendingFollowUps = await CommercialFollowUpService.getPendingFollowUps(targetAgentId)
    const dueItems = pendingFollowUps.map((entry) => entry.planningItem)

    const locations = await this.getLocationsMap(dueItems.map((item) => item.commercialClientLocationId))
    const activeBcs = await this.getActiveCommercialBlsMap(dueItems.map((item) => item.id))
    const dueStateByPlanningItemId = new Map(
      pendingFollowUps.map((entry) => [entry.planningItem.id, entry.dueState])
    )

    return ctx.response.json(
      dueItems.map((item) =>
        this.formatAgentPlanningItem(
          item,
          locations,
          canModify,
          activeBcs,
          dueStateByPlanningItemId.get(item.id) || null
        )
      )
    )
  }

  async updateAgentClientStatus(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    const planningItem = await CommercialPlanningItem.find(ctx.params.id)
    if (!planningItem) {
      return ctx.response.status(404).json({ message: 'Programme introuvable' })
    }

    if (currentUser.role === Role.AGENT_COMMERCIAL && planningItem.agentId !== Number(currentUser.id)) {
      return ctx.response.status(403).json({ message: 'Programme non affecté à ce commercial' })
    }

    const canModifyToday = await this.canModifyPlanningItemToday(planningItem)
    if (!canModifyToday) {
      return ctx.response.status(403).json({
        message: 'Modification autorisée uniquement le jour de la tournée ou à la date de relance',
      })
    }

    const body = ctx.request.body()
    const executionStatus =
      body.status === 'effectuer'
        ? CommercialExecutionStatus.APPELE
        : body.status === 'en_attente'
          ? CommercialExecutionStatus.A_RELANCER
          : body.status

    if (!Object.values(CommercialExecutionStatus).includes(executionStatus)) {
      return ctx.response.status(422).json({ message: 'Statut commercial invalide' })
    }

    const orderLines: Array<{ productId: number; quantity: number }> = Array.isArray(body.orderLines)
      ? body.orderLines
      : []

    if (executionStatus === CommercialExecutionStatus.A_RELANCER && !body.nextFollowUpAt) {
      return ctx.response.status(422).json({ message: 'La date de relance est obligatoire' })
    }

    const followUpAt = body.nextFollowUpAt ? DateTime.fromISO(body.nextFollowUpAt) : null
    if (executionStatus === CommercialExecutionStatus.A_RELANCER && (!followUpAt || !followUpAt.isValid)) {
      return ctx.response.status(422).json({ message: 'La date et l’heure de relance sont invalides' })
    }

    const parentCommercialClient =
      executionStatus === CommercialExecutionStatus.COMMANDE_PRISE
        ? await this.getParentCommercialClient(planningItem)
        : null
    const clientAccountNumber = String(body.clientAccountNumber || body.accountNumber || '').trim()

    if (
      executionStatus === CommercialExecutionStatus.COMMANDE_PRISE &&
      orderLines.length === 0 &&
      !body.orderTaken
    ) {
      await NotificationService.notifyRole(
        Role.ADMIN,
        'BC commercial sans lignes',
        `${this.getUserDisplayName(currentUser)} a tenté de créer une commande prise sans produit`,
        undefined,
        {
          planningItemId: planningItem.id,
          agentId: currentUser.id,
          type: 'commercial_bl_empty_lines',
        }
      )
      return ctx.response.status(422).json({ message: 'Ajoutez au moins un produit pour une commande prise' })
    }

    if (executionStatus === CommercialExecutionStatus.COMMANDE_PRISE && parentCommercialClient && !parentCommercialClient.accountNumber) {
      if (!clientAccountNumber) {
        return ctx.response.status(422).json({ message: 'Le numéro de compte client est obligatoire pour la première commande' })
      }

      if (!/^\d+$/.test(clientAccountNumber)) {
        return ctx.response.status(422).json({ message: 'Le numéro de compte client doit contenir uniquement des chiffres' })
      }

      const existingClient = await CommercialClient.query()
        .where('account_number', clientAccountNumber)
        .whereNot('id', parentCommercialClient.id)
        .first()

      if (existingClient) {
        return ctx.response.status(409).json({ message: 'Ce numéro de compte client est déjà utilisé par un autre client' })
      }
    }

    const activeBc = await this.getBlockingCommercialBlForPlanningItem(planningItem)
    if (activeBc) {
      await NotificationService.notifyRole(
        Role.ADMIN,
        'Fiche verrouillée par BC actif',
        `${this.getUserDisplayName(currentUser)} a tenté de modifier une fiche verrouillée par le BC #${activeBc.id}`,
        undefined,
        {
          commercialBlId: activeBc.id,
          executionLogId: activeBc.executionLogId,
          planningItemId: planningItem.id,
          type: 'commercial_sheet_locked_by_bc',
        }
      )
      return ctx.response.status(409).json({
        message: executionStatus === CommercialExecutionStatus.COMMANDE_PRISE
          ? 'Un BC existe déjà pour cette fiche. Modifiez ou annulez ce BC avant de saisir une nouvelle commande.'
          : 'Cette fiche est verrouillée car un BC actif existe. Modifiez ou annulez le BC pour pouvoir modifier la fiche.',
        commercialBl: this.formatCommercialBl(activeBc),
      })
    }

    if (orderLines.length > 0) {
      const productIds = [...new Set(orderLines.map((line) => Number(line.productId)))]
      const productsCount = await Product.query().whereIn('id', productIds).count('* as total')
      if (Number(productsCount[0].$extras.total) !== productIds.length) {
        return ctx.response.status(422).json({ message: 'Un ou plusieurs produits sont invalides' })
      }

      for (const line of orderLines) {
        if (!line.productId || Number(line.quantity) <= 0) {
          return ctx.response.status(422).json({ message: 'Chaque ligne doit avoir un produit et une quantité valide' })
        }
      }
    }

    const trx = await db.transaction()

    const previousLog = await CommercialExecutionLog.query()
      .where('planning_item_id', planningItem.id)
      .orderBy('created_at', 'desc')
      .first()

    const resolvedFollowUpAt =
      executionStatus !== CommercialExecutionStatus.A_RELANCER &&
      previousLog?.status === CommercialExecutionStatus.A_RELANCER &&
      previousLog.nextFollowUpAt
        ? previousLog.nextFollowUpAt
        : null

    try {
      if (
        executionStatus === CommercialExecutionStatus.COMMANDE_PRISE &&
        parentCommercialClient &&
        !parentCommercialClient.accountNumber &&
        clientAccountNumber
      ) {
        parentCommercialClient.accountNumber = clientAccountNumber
        await parentCommercialClient.useTransaction(trx).save()
      }

      const executionLog = await CommercialExecutionLog.create(
        {
          planningItemId: planningItem.id,
          agentId: planningItem.agentId,
          status: executionStatus,
          comment: body.comment ?? null,
          orderTaken: body.orderTaken ?? orderLines.length > 0,
          nextFollowUpAt: followUpAt,
          resolvedFollowUpAt,
          createdBy: Number(currentUser.id),
        },
        { client: trx }
      )

      if (orderLines.length > 0) {
        await CommercialOrderLine.createMany(
          orderLines.map((line) => ({
            executionLogId: executionLog.id,
            productId: Number(line.productId),
            quantity: Number(line.quantity),
          })),
          { client: trx }
        )

        await this.createCommercialBlDraft(
          executionLog.id,
          Number(currentUser.id),
          orderLines.map((line) => ({
            productId: Number(line.productId),
            quantity: Number(line.quantity),
          })),
          trx
        )
      }

      await trx.commit()
      if (executionStatus === CommercialExecutionStatus.A_RELANCER && followUpAt) {
        try {
          await this.scheduleAgentFollowUpNotification(planningItem, followUpAt)
        } catch (notificationError) {
          console.error('Erreur lors de la planification de la notification de relance:', notificationError)
        }
      } else {
        try {
          await this.clearAgentFollowUpNotification(planningItem)
        } catch (notificationError) {
          console.error('Erreur lors de la suppression de la notification de relance:', notificationError)
        }
      }
      if (orderLines.length > 0) {
        await UserActivityService.logActivity(
          Number(currentUser.id),
          UserActivityService.ACTIONS.CREATE_COMMERCIAL_BL,
          currentUser.role,
          undefined,
          {
            executionLogId: executionLog.id,
            planningItemId: planningItem.id,
            orderLines,
          }
        )
      }
      return ctx.response.json({ success: true, executionLogId: executionLog.id })
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({ message: 'Erreur lors de l\'enregistrement de l\'action' })
    }
  }

  async products(ctx: HttpContext) {
    const currentUser = await this.requireAdmin(ctx)
    if (!currentUser) return

    const items = await Product.query().orderBy('name', 'asc')
    return ctx.response.json(items.map((product) => this.formatProduct(product)))
  }

  async storeProduct(ctx: HttpContext) {
    const currentUser = await this.requireAdmin(ctx)
    if (!currentUser) return

    const data = await commercialProductValidator.validate(ctx.request.body())

    const product = await Product.create({
      reference: data.name,
      name: data.name,
      price: '0',
      imgUrl: null,
    })

    return ctx.response.status(201).json(this.formatProduct(product))
  }

  async updateProduct(ctx: HttpContext) {
    const currentUser = await this.requireAdmin(ctx)
    if (!currentUser) return

    const product = await Product.find(ctx.params.id)
    if (!product) {
      return ctx.response.status(404).json({ message: 'Produit introuvable' })
    }

    const data = await commercialProductValidator.validate(ctx.request.body())
    product.merge({
      reference: data.name,
      name: data.name,
      price: product.price || '0',
      imgUrl: product.imgUrl,
    })
    await product.save()

    return ctx.response.json(this.formatProduct(product))
  }

  async destroyProduct(ctx: HttpContext) {
    const currentUser = await this.requireAdmin(ctx)
    if (!currentUser) return

    const product = await Product.find(ctx.params.id)
    if (!product) {
      return ctx.response.status(404).json({ message: 'Produit introuvable' })
    }

    const usedInOrders = await CommercialOrderLine.query().where('product_id', product.id).first()
    if (usedInOrders) {
      return ctx.response.status(422).json({
        message: 'Ce produit est utilisé dans des commandes et ne peut pas être supprimé',
      })
    }

    await product.delete()
    return ctx.response.json({ success: true })
  }

  async agentProducts(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    const products = await Product.query().orderBy('name', 'asc')

    return ctx.response.json(
      products.map((product) => ({
        id: product.id,
        reference: product.reference,
        name: product.name,
        price: Number(product.price) || 0,
      }))
    )
  }

  async agentPersonalClients(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAgent(ctx)
    if (!currentUser) return
    if (!(await this.commercialPersonalClientsSupported())) {
      return ctx.response.status(503).json({ message: 'Appliquez les migrations du portefeuille personnel avant d’utiliser cette fonctionnalité' })
    }

    const { search, includeInactive } = ctx.request.qs()
    const query = CommercialPersonalClient.query()
      .where('agent_id', Number(currentUser.id))
      .orderBy('created_at', 'desc')

    if (!includeInactive || String(includeInactive) !== 'true') {
      query.where('is_active', true)
    }

    const clients = await query
    const filtered = search
      ? clients.filter((client) => {
          const term = this.normalizeSearchTerm(String(search))
          return [
            client.name,
            client.phone,
            client.address,
            client.accountNumber,
            client.contactName,
            client.notes,
          ].some((value) => this.normalizeSearchTerm(value).includes(term))
        })
      : clients

    return ctx.response.json(filtered.map((client) => this.formatPersonalClient(client)))
  }

  async agentAssignedPortfolio(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAgent(ctx)
    if (!currentUser) return

    const { search } = ctx.request.qs()
    const assignments = await CommercialClientAssignment.query()
      .where('agent_id', Number(currentUser.id))
      .where('is_active', true)
      .preload('client')
      .preload('commercialClientLocation' as any, (locationQuery: any) => {
        locationQuery.preload('client')
      })
      .orderBy('created_at', 'desc')

    const formatted = assignments.map((assignment) => this.formatAgentAssignedPortfolioItem(assignment))
    const filtered = search
      ? formatted.filter((item) => {
          const term = this.normalizeSearchTerm(String(search))
          return [
            item.name,
            item.parentName,
            item.phone,
            item.address,
            item.accountNumber,
            item.note,
          ].some((value) => this.normalizeSearchTerm(value).includes(term))
        })
      : formatted

    return ctx.response.json(filtered)
  }

  async storeAgentPersonalClient(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAgent(ctx)
    if (!currentUser) return
    if (!(await this.commercialPersonalClientsSupported())) {
      return ctx.response.status(503).json({ message: 'Appliquez les migrations du portefeuille personnel avant d’utiliser cette fonctionnalité' })
    }

    const data = await ctx.request.validateUsing(commercialPersonalClientValidator)
    const phone = String(data.phone || '').trim()
    const accountNumber = String(data.accountNumber || '').trim()

    if (!phone) {
      return ctx.response.status(422).json({ message: 'Le numéro de téléphone client est obligatoire' })
    }
    if (!accountNumber) {
      return ctx.response.status(422).json({ message: 'Le numéro de compte client est obligatoire' })
    }
    if (!/^\d+$/.test(accountNumber)) {
      return ctx.response.status(422).json({ message: 'Le numéro de compte client doit contenir uniquement des chiffres' })
    }

    const client = await CommercialPersonalClient.create({
      ...data,
      phone,
      accountNumber: accountNumber || null,
      agentId: Number(currentUser.id),
      isActive: data.isActive ?? true,
    })

    return ctx.response.status(201).json({ success: true, client: this.formatPersonalClient(client) })
  }

  async updateAgentPersonalClient(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAgent(ctx)
    if (!currentUser) return
    if (!(await this.commercialPersonalClientsSupported())) {
      return ctx.response.status(503).json({ message: 'Appliquez les migrations du portefeuille personnel avant d’utiliser cette fonctionnalité' })
    }

    const client = await CommercialPersonalClient.query()
      .where('id', ctx.params.id)
      .where('agent_id', Number(currentUser.id))
      .first()

    if (!client) {
      return ctx.response.status(404).json({ message: 'Client personnel introuvable' })
    }

    const data = await ctx.request.validateUsing(commercialPersonalClientValidator)
    const phone = String(data.phone || '').trim()
    const accountNumber = String(data.accountNumber || '').trim()

    if (!phone) {
      return ctx.response.status(422).json({ message: 'Le numéro de téléphone client est obligatoire' })
    }
    if (!accountNumber) {
      return ctx.response.status(422).json({ message: 'Le numéro de compte client est obligatoire' })
    }
    if (!/^\d+$/.test(accountNumber)) {
      return ctx.response.status(422).json({ message: 'Le numéro de compte client doit contenir uniquement des chiffres' })
    }

    client.merge({
      ...data,
      phone,
      accountNumber: accountNumber || null,
      isActive: data.isActive ?? client.isActive,
      disabledAt: data.isActive === false ? DateTime.now() : data.isActive === true ? null : client.disabledAt,
    })
    await client.save()

    return ctx.response.json({ success: true, client: this.formatPersonalClient(client) })
  }

  async deactivateAgentPersonalClient(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAgent(ctx)
    if (!currentUser) return
    if (!(await this.commercialPersonalClientsSupported())) {
      return ctx.response.status(503).json({ message: 'Appliquez les migrations du portefeuille personnel avant d’utiliser cette fonctionnalité' })
    }

    const client = await CommercialPersonalClient.query()
      .where('id', ctx.params.id)
      .where('agent_id', Number(currentUser.id))
      .first()

    if (!client) {
      return ctx.response.status(404).json({ message: 'Client personnel introuvable' })
    }

    client.isActive = false
    client.disabledAt = DateTime.now()
    await client.save()

    return ctx.response.json({ success: true, client: this.formatPersonalClient(client) })
  }

  async storeAgentPersonalOrder(ctx: HttpContext) {
    const currentUser = await this.requireCommercialAgent(ctx)
    if (!currentUser) return
    if (!(await this.commercialPersonalClientsSupported())) {
      return ctx.response.status(503).json({ message: 'Appliquez les migrations du portefeuille personnel avant d’utiliser cette fonctionnalité' })
    }

    const data = await ctx.request.validateUsing(commercialPersonalOrderValidator)
    const orderLines = Array.isArray(data.orderLines) ? data.orderLines : []

    if (orderLines.length === 0) {
      return ctx.response.status(422).json({ message: 'Ajoutez au moins un produit au BC commercial' })
    }

    const productIds = [...new Set(orderLines.map((line) => Number(line.productId)))]
    if (productIds.length !== orderLines.length) {
      return ctx.response.status(422).json({ message: 'Un produit ne peut pas être choisi deux fois dans le même BC' })
    }
    const productsCount = await Product.query().whereIn('id', productIds).count('* as total')
    if (Number(productsCount[0].$extras.total) !== productIds.length) {
      return ctx.response.status(422).json({ message: 'Un ou plusieurs produits sont invalides' })
    }

    for (const line of orderLines) {
      if (!line.productId || Number(line.quantity) <= 0) {
        return ctx.response.status(422).json({ message: 'Chaque ligne doit avoir un produit et une quantité valide' })
      }
    }

    let personalClient: CommercialPersonalClient | null = null
    if (data.personalClientId) {
      personalClient = await CommercialPersonalClient.query()
        .where('id', data.personalClientId)
        .where('agent_id', Number(currentUser.id))
        .where('is_active', true)
        .first()

      if (!personalClient) {
        return ctx.response.status(404).json({ message: 'Client personnel introuvable ou inactif' })
      }
    }

    if (!personalClient && !data.client) {
      return ctx.response.status(422).json({ message: 'Sélectionnez ou créez un client personnel' })
    }

    const nextAccountNumber = String(data.client?.accountNumber || personalClient?.accountNumber || '').trim()
    const nextPhone = String(data.client?.phone || personalClient?.phone || '').trim()
    if (!nextPhone) {
      return ctx.response.status(422).json({ message: 'Le numéro de téléphone client est obligatoire' })
    }
    if (!nextAccountNumber) {
      return ctx.response.status(422).json({ message: 'Le numéro de compte client est obligatoire pour créer un BC' })
    }
    if (!/^\d+$/.test(nextAccountNumber)) {
      return ctx.response.status(422).json({ message: 'Le numéro de compte client doit contenir uniquement des chiffres' })
    }

    const trx = await db.transaction()
    try {
      if (!personalClient && data.client) {
        personalClient = await CommercialPersonalClient.create(
          {
            ...data.client,
            phone: nextPhone,
            accountNumber: nextAccountNumber,
            agentId: Number(currentUser.id),
            isActive: true,
          },
          { client: trx }
        )
      } else if (personalClient && !personalClient.accountNumber && nextAccountNumber) {
        personalClient.accountNumber = nextAccountNumber
        await personalClient.useTransaction(trx).save()
      }

      const executionLog = await CommercialExecutionLog.create(
        {
          planningItemId: null,
          personalClientId: personalClient!.id,
          agentId: Number(currentUser.id),
          status: CommercialExecutionStatus.COMMANDE_PRISE,
          comment: data.comment ?? null,
          orderTaken: true,
          nextFollowUpAt: null,
          createdBy: Number(currentUser.id),
        },
        { client: trx }
      )

      await CommercialOrderLine.createMany(
        orderLines.map((line) => ({
          executionLogId: executionLog.id,
          productId: Number(line.productId),
          quantity: Number(line.quantity),
        })),
        { client: trx }
      )

      const bl = await this.createCommercialBlDraft(
        executionLog.id,
        Number(currentUser.id),
        orderLines.map((line) => ({
          productId: Number(line.productId),
          quantity: Number(line.quantity),
        })),
        trx
      )

      await trx.commit()

      await UserActivityService.logActivity(
        Number(currentUser.id),
        UserActivityService.ACTIONS.CREATE_COMMERCIAL_BL,
        currentUser.role,
        undefined,
        {
          executionLogId: executionLog.id,
          personalClientId: personalClient!.id,
          commercialBlId: bl.id,
          orderLines,
        }
      )

      return ctx.response.status(201).json({
        success: true,
        executionLogId: executionLog.id,
        personalClient: this.formatPersonalClient(personalClient!),
        bl: this.formatCommercialBl(bl),
      })
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({ message: 'Erreur lors de la création du BC personnel' })
    }
  }

  async agentHistory(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    const { from, to, status, search, agentId } = ctx.request.qs()
    const targetAgentId =
      currentUser.role === Role.AGENT_COMMERCIAL ? Number(currentUser.id) : Number(agentId || currentUser.id)
    const personalClientsSupported = await this.commercialPersonalClientsSupported()

    const query = CommercialExecutionLog.query()
      .where('agent_id', targetAgentId)
      .preload('planningItem' as any, (planningQuery: any) => {
        planningQuery.preload('client').preload('commercialClientLocation', (locationQuery: any) => {
          locationQuery.preload('client')
        })
      })
      .if(personalClientsSupported, (logQuery) => logQuery.preload('personalClient'))
      .preload('orderLines', (linesQuery) => linesQuery.preload('product'))
      .orderBy('created_at', 'desc')

    if (from) {
      query.where('created_at', '>=', DateTime.fromISO(from).startOf('day').toSQL()!)
    }
    if (to) {
      query.where('created_at', '<=', DateTime.fromISO(to).endOf('day').toSQL()!)
    }
    if (status === 'RELANCE_EFFECTUEE') {
      query.whereNotNull('resolved_follow_up_at')
    } else if (status && Object.values(CommercialExecutionStatus).includes(status as CommercialExecutionStatus)) {
      query.where('status', status)
    }

    const logs = await query.limit(500)
    const formatted = await this.attachFollowUpResolutionFlags(logs)
    const filtered = search
      ? formatted.filter((entry) => {
          const term = this.normalizeSearchTerm(String(search))
          return [
            entry.clientName,
            entry.parentName,
            entry.clientPhone,
            entry.clientCode,
            entry.comment,
            this.getCommercialExecutionStatusSearchText(entry.status),
            ...(entry.followUpResolved ? ['relance effectuee traitee'] : []),
            ...(entry.orderLines || []).flatMap((line) => [line.productName, line.productReference]),
          ].some((value) => this.normalizeSearchTerm(value).includes(term))
        })
      : formatted

    return ctx.response.json(filtered)
  }

  async agentHistoryStats(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    const { from, to, status, search, agentId } = ctx.request.qs()
    const targetAgentId =
      currentUser.role === Role.AGENT_COMMERCIAL ? Number(currentUser.id) : Number(agentId || currentUser.id)
    const personalClientsSupported = await this.commercialPersonalClientsSupported()

    const query = CommercialExecutionLog.query()
      .where('agent_id', targetAgentId)
      .preload('planningItem' as any, (planningQuery: any) => {
        planningQuery.preload('client').preload('commercialClientLocation', (locationQuery: any) => {
          locationQuery.preload('client')
        })
      })
      .if(personalClientsSupported, (logQuery) => logQuery.preload('personalClient'))
      .preload('orderLines', (linesQuery) => linesQuery.preload('product'))

    if (from) {
      query.where('created_at', '>=', DateTime.fromISO(from).startOf('day').toSQL()!)
    }
    if (to) {
      query.where('created_at', '<=', DateTime.fromISO(to).endOf('day').toSQL()!)
    }
    if (status === 'RELANCE_EFFECTUEE') {
      query.whereNotNull('resolved_follow_up_at')
    } else if (status && Object.values(CommercialExecutionStatus).includes(status as CommercialExecutionStatus)) {
      query.where('status', status)
    }

    const logs = await query
    const formatted = await this.attachFollowUpResolutionFlags(logs)
    const filtered = search
      ? formatted.filter((entry) => {
          const term = this.normalizeSearchTerm(String(search))
          return [
            entry.clientName,
            entry.parentName,
            entry.clientPhone,
            entry.clientCode,
            entry.comment,
            this.getCommercialExecutionStatusSearchText(entry.status),
            ...(entry.followUpResolved ? ['relance effectuee traitee'] : []),
            ...(entry.orderLines || []).flatMap((line) => [line.productName, line.productReference]),
          ].some((value) => this.normalizeSearchTerm(value).includes(term))
        })
      : formatted

    const byAction = {
      [CommercialExecutionStatus.APPELE]: 0,
      [CommercialExecutionStatus.NON_REPONDU]: 0,
      [CommercialExecutionStatus.COMMANDE_PRISE]: 0,
      [CommercialExecutionStatus.A_RELANCER]: 0,
    }

    let totalProducts = 0
    const clientsTouched = new Set<string>()

    for (const entry of filtered) {
      byAction[entry.status] = (byAction[entry.status] || 0) + 1
      totalProducts += (entry.orderLines || []).reduce((sum, line) => sum + Number(line.quantity || 0), 0)
      clientsTouched.add(String(entry.planningItemId || entry.clientName))
    }

    const responded =
      byAction[CommercialExecutionStatus.APPELE] +
      byAction[CommercialExecutionStatus.COMMANDE_PRISE]

    const startOfCurrentMonth = DateTime.local().startOf('month')
    const endOfCurrentMonth = DateTime.local().endOf('month')
    const startOfPreviousMonth = startOfCurrentMonth.minus({ months: 1 }).startOf('month')
    const endOfPreviousMonth = startOfCurrentMonth.minus({ days: 1 }).endOf('day')

    const [currentMonthTotalResult, previousMonthTotalResult] = await Promise.all([
      CommercialExecutionLog.query()
        .where('agent_id', targetAgentId)
        .where('created_at', '>=', startOfCurrentMonth.toSQL()!)
        .where('created_at', '<=', endOfCurrentMonth.toSQL()!)
        .count('* as total')
        .first(),
      CommercialExecutionLog.query()
        .where('agent_id', targetAgentId)
        .where('created_at', '>=', startOfPreviousMonth.toSQL()!)
        .where('created_at', '<=', endOfPreviousMonth.toSQL()!)
        .count('* as total')
        .first(),
    ])

    const currentMonth = Number(currentMonthTotalResult?.$extras.total || 0)
    const previousMonth = Number(previousMonthTotalResult?.$extras.total || 0)
    const difference = currentMonth - previousMonth
    const percent = previousMonth > 0 ? Math.round((difference / previousMonth) * 100) : currentMonth > 0 ? 100 : 0

    return ctx.response.json({
      total: filtered.length,
      byAction,
      totalProducts,
      clientsTouched: clientsTouched.size,
      followUpsResolved: filtered.filter((entry) => entry.followUpResolved).length,
      responseRate: filtered.length > 0 ? Math.round((responded / filtered.length) * 100) : 0,
      monthlyTrend: {
        currentMonth,
        previousMonth,
        difference,
        percent,
        direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'stable',
      },
    })
  }

  async agentOrders(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    const { from, to, search, agentId } = ctx.request.qs()
    const targetAgentId =
      currentUser.role === Role.AGENT_COMMERCIAL ? Number(currentUser.id) : Number(agentId || currentUser.id)
    const personalClientsSupported = await this.commercialPersonalClientsSupported()

    const query = CommercialExecutionLog.query()
      .where('agent_id', targetAgentId)
      .where('status', CommercialExecutionStatus.COMMANDE_PRISE)
      .preload('planningItem' as any, (planningQuery: any) => {
        planningQuery.preload('client').preload('commercialClientLocation', (locationQuery: any) => {
          locationQuery.preload('client')
        })
      })
      .if(personalClientsSupported, (logQuery) => logQuery.preload('personalClient'))
      .preload('orderLines', (linesQuery) => linesQuery.preload('product'))
      .preload('commercialBl', (blQuery) => blQuery.preload('modificationRequests'))
      .orderBy('created_at', 'desc')

    if (from) {
      query.where('created_at', '>=', DateTime.fromISO(from).startOf('day').toSQL()!)
    }
    if (to) {
      query.where('created_at', '<=', DateTime.fromISO(to).endOf('day').toSQL()!)
    }

    const logs = await query.limit(500)
    for (const log of logs) {
      if (!log.commercialBl) {
        const snapshot = (log.orderLines || []).map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        }))
        const bl = await this.createCommercialBlDraft(log.id, log.createdBy || log.agentId, snapshot)
        log.$preloaded.commercialBl = bl
      } else {
        await this.expireCommercialBlAuthorizationIfNeeded(log.commercialBl)
      }
    }
    const orders = logs
      .map((log) => this.formatAgentOrder(log))
      .filter((order) => {
        if (!search) return true
        const term = String(search).toLowerCase()
        return (
          order.clientName.toLowerCase().includes(term) ||
          order.numeroCommande.toLowerCase().includes(term)
        )
      })

    return ctx.response.json(orders)
  }

  async agentCommercialBl(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    const executionLogId = Number(ctx.params.id)
    const personalClientsSupported = await this.commercialPersonalClientsSupported()
    const bl = await CommercialBl.query()
      .where('execution_log_id', executionLogId)
      .preload('modificationRequests')
      .preload('executionLog', (logQuery) => {
        if (personalClientsSupported) logQuery.preload('personalClient')
        logQuery.preload('orderLines', (linesQuery) => linesQuery.preload('product'))
      })
      .first()

    if (!bl) {
      return ctx.response.status(404).json({ message: 'BC commercial introuvable' })
    }

    if ([Role.AGENT_COMMERCIAL, Role.COMMERCIAL_DETAILLANT].includes(currentUser.role) && bl.executionLog.agentId !== Number(currentUser.id)) {
      return ctx.response.status(403).json({ message: 'BC commercial non affecté à ce commercial' })
    }

    return ctx.response.json(this.formatCommercialBl(bl))
  }

  async updateAgentCommercialBl(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    const bl = await this.getCommercialBlForUser(Number(ctx.params.id), currentUser)
    if (!bl) {
      return ctx.response.status(404).json({ message: 'BC commercial introuvable' })
    }

    if (bl.status === 'FACTURE') {
      return ctx.response.status(403).json({ message: 'BC commercial déjà facturé, modification interdite' })
    }

    if (![Role.AGENT_COMMERCIAL, Role.COMMERCIAL_DETAILLANT].includes(currentUser.role)) {
      return ctx.response.status(403).json({ message: 'Seul le commercial affecté peut modifier ce BC' })
    }

    const canEdit =
      bl.status === 'BROUILLON' ||
      bl.status === 'REJETE_ADMIN' ||
      bl.status === 'MODIFICATION_AUTORISEE'

    if (!canEdit) {
      await NotificationService.notifyRole(
        Role.ADMIN,
        'BC commercial verrouillé',
        `${this.getUserDisplayName(currentUser)} a tenté de modifier le BC commercial verrouillé #${bl.id}`,
        undefined,
        {
          commercialBlId: bl.id,
          executionLogId: bl.executionLogId,
          status: bl.status,
          type: 'commercial_bl_locked_edit',
        }
      )
      return ctx.response.status(403).json({ message: 'Ce BC commercial est verrouillé' })
    }

    const orderLines: Array<{ productId: number; quantity: number }> = Array.isArray(ctx.request.body().orderLines)
      ? ctx.request.body().orderLines
      : []

    if (orderLines.length === 0) {
      await NotificationService.notifyRole(
        Role.ADMIN,
        'BC commercial sans lignes',
        `${this.getUserDisplayName(currentUser)} a tenté d’enregistrer le BC commercial #${bl.id} sans produit`,
        undefined,
        {
          commercialBlId: bl.id,
          executionLogId: bl.executionLogId,
          type: 'commercial_bl_empty_lines',
        }
      )
      return ctx.response.status(422).json({ message: 'Ajoutez au moins un produit au BC commercial' })
    }

    const productIds = [...new Set(orderLines.map((line) => Number(line.productId)))]
    if (productIds.length !== orderLines.length) {
      return ctx.response.status(422).json({ message: 'Un produit ne peut pas être choisi deux fois dans le même BC' })
    }
    const productsCount = await Product.query().whereIn('id', productIds).count('* as total')
    if (Number(productsCount[0].$extras.total) !== productIds.length) {
      return ctx.response.status(422).json({ message: 'Un ou plusieurs produits sont invalides' })
    }

    for (const line of orderLines) {
      if (!line.productId || Number(line.quantity) <= 0) {
        return ctx.response.status(422).json({ message: 'Chaque ligne doit avoir un produit et une quantité valide' })
      }
    }

    const trx = await db.transaction()
    try {
      bl.useTransaction(trx)
      await this.syncCommercialBlLines(bl, orderLines, currentUser, trx)
      await trx.commit()
      await bl.load('modificationRequests')
      return ctx.response.json({ success: true, bl: this.formatCommercialBl(bl) })
    } catch (error) {
      await trx.rollback()
      return ctx.response.status(500).json({ message: 'Erreur lors de la modification du BC commercial' })
    }
  }

  async confirmAgentCommercialBl(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    const bl = await this.getCommercialBlForUser(Number(ctx.params.id), currentUser)
    if (!bl) {
      return ctx.response.status(404).json({ message: 'BC commercial introuvable' })
    }

    if (bl.status === 'FACTURE') {
      return ctx.response.status(403).json({ message: 'BC commercial déjà facturé' })
    }

    if (bl.status === 'ANNULE') {
      return ctx.response.status(400).json({ message: 'Un BC annulé ne peut pas être confirmé' })
    }

    if (![Role.AGENT_COMMERCIAL, Role.COMMERCIAL_DETAILLANT].includes(currentUser.role)) {
      return ctx.response.status(403).json({ message: 'Seul le commercial affecté peut confirmer ce BC' })
    }

    if (['CONFIRME', 'VALIDE_ADMIN', 'MODIFICATION_DEMANDEE', 'FACTURE'].includes(bl.status)) {
      return ctx.response.status(400).json({ message: 'Ce BC commercial est déjà confirmé ou en demande de modification' })
    }

    const snapshot = await this.buildCommercialBlSnapshot(bl.executionLogId)
    bl.status = 'CONFIRME'
    bl.productsSnapshot = snapshot
    bl.confirmedBy = Number(currentUser.id)
    bl.confirmedAt = DateTime.now()
    bl.editAuthorizedUntil = null
    bl.adminReviewedBy = null
    bl.adminReviewedAt = null
    bl.adminReviewComment = null
    await bl.save()

    await UserActivityService.logActivity(
      Number(currentUser.id),
      UserActivityService.ACTIONS.CONFIRM_COMMERCIAL_BL,
      currentUser.role,
      undefined,
      {
        commercialBlId: bl.id,
        executionLogId: bl.executionLogId,
        productsSnapshot: snapshot,
      }
    )

    await NotificationService.notifyRole(
      Role.ADMIN,
      'BC commercial confirmé',
      `Un BC commercial a été confirmé par ${currentUser.firstname} ${currentUser.lastname} et attend votre validation`,
      undefined,
      { commercialBlId: bl.id, executionLogId: bl.executionLogId, type: 'commercial_bl_confirmed' }
    )

    await bl.load('modificationRequests')
    return ctx.response.json({ success: true, bl: this.formatCommercialBl(bl) })
  }

  async requestCommercialBlEdit(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    const bl = await this.getCommercialBlForUser(Number(ctx.params.id), currentUser)
    if (!bl) {
      return ctx.response.status(404).json({ message: 'BC commercial introuvable' })
    }

    if (bl.status === 'FACTURE') {
      return ctx.response.status(403).json({ message: 'BC commercial déjà facturé, demande impossible' })
    }

    if (![Role.AGENT_COMMERCIAL, Role.COMMERCIAL_DETAILLANT].includes(currentUser.role)) {
      return ctx.response.status(403).json({ message: 'Seul le commercial affecté peut demander une modification' })
    }

    if (bl.status !== 'CONFIRME') {
      return ctx.response.status(400).json({ message: 'Seul un BC confirmé en attente ADMIN peut faire l’objet d’une demande' })
    }

    const reason = String(ctx.request.body().reason || '').trim()
    if (!reason) {
      return ctx.response.status(422).json({ message: 'Le motif de modification est obligatoire' })
    }

    const existing = await CommercialBlModificationRequest.query()
      .where('commercial_bl_id', bl.id)
      .where('status', 'EN_ATTENTE')
      .first()
    if (existing) {
      return ctx.response.status(400).json({ message: 'Une demande est déjà en attente pour ce BC' })
    }

    const snapshotsSupported = await this.commercialBlRequestSnapshotsSupported()
    const beforeSnapshot = snapshotsSupported ? await this.buildCommercialBlSnapshot(bl.executionLogId) : []
    const request = await CommercialBlModificationRequest.create({
      commercialBlId: bl.id,
      requestedBy: Number(currentUser.id),
      status: 'EN_ATTENTE',
      reason,
      ...(snapshotsSupported ? { beforeSnapshot } : {}),
    })

    bl.status = 'MODIFICATION_DEMANDEE'
    await bl.save()

    await UserActivityService.logActivity(
      Number(currentUser.id),
      UserActivityService.ACTIONS.REQUEST_COMMERCIAL_BL_EDIT,
      currentUser.role,
      undefined,
      { commercialBlId: bl.id, requestId: request.id, reason, beforeSnapshot }
    )

    await this.notifyCommercialManager(
      currentUser,
      'Demande modification BC commercial',
      `${currentUser.firstname} ${currentUser.lastname} demande une autorisation de modification du BC commercial #${bl.id}`,
      {
        commercialBlId: bl.id,
        requestId: request.id,
        reason,
        requesterRole: currentUser.role,
        targetRole: this.getCommercialManagerRole(currentUser.role),
        type: 'commercial_bl_edit_request',
      }
    )

    await bl.load('modificationRequests')
    return ctx.response.status(201).json({ success: true, bl: this.formatCommercialBl(bl) })
  }

  async cancelAgentCommercialBl(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    const bl = await this.getCommercialBlForUser(Number(ctx.params.id), currentUser)
    if (!bl) {
      return ctx.response.status(404).json({ message: 'BC commercial introuvable' })
    }

    if (![Role.AGENT_COMMERCIAL, Role.COMMERCIAL_DETAILLANT].includes(currentUser.role)) {
      return ctx.response.status(403).json({ message: 'Seul le commercial affecté peut annuler ce BC' })
    }

    if (bl.status === 'FACTURE') {
      return ctx.response.status(403).json({ message: 'Un BC facturé ne peut pas être annulé' })
    }

    if (bl.status === 'ANNULE') {
      return ctx.response.json({ success: true, bl: this.formatCommercialBl(bl) })
    }

    const reason = String(ctx.request.body().reason || '').trim()
    if (!reason) {
      return ctx.response.status(422).json({ message: 'Le motif d’annulation est obligatoire' })
    }

    const previousStatus = bl.status
    bl.status = 'ANNULE'
    bl.comment = reason || bl.comment
    bl.editAuthorizedUntil = null
    await bl.save()

    await UserActivityService.logActivity(
      Number(currentUser.id),
      UserActivityService.ACTIONS.CANCEL_COMMERCIAL_BL,
      currentUser.role,
      undefined,
      {
        commercialBlId: bl.id,
        executionLogId: bl.executionLogId,
        reason: reason || null,
      }
    )

    await NotificationService.notifyUser(
      Number(currentUser.id),
      'BC commercial annulé',
      `Le BC commercial #${bl.id} a été annulé avec succès`,
      undefined,
      { commercialBlId: bl.id, executionLogId: bl.executionLogId, reason: reason || null, type: 'commercial_bl_cancelled' }
    )

    await this.notifyCommercialManager(
      currentUser,
      'BC commercial annulé',
      `${this.getUserDisplayName(currentUser)} a annulé le BC commercial #${bl.id}`,
      {
        commercialBlId: bl.id,
        executionLogId: bl.executionLogId,
        previousStatus,
        reason: reason || null,
        type: 'commercial_bl_cancelled_by_agent',
      }
    )

    if (['VALIDE_ADMIN', 'MODIFICATION_DEMANDEE', 'MODIFICATION_AUTORISEE'].includes(previousStatus)) {
      await NotificationService.notifyRole(
        Role.ADMIN,
        'BC validé annulé',
        `${this.getUserDisplayName(currentUser)} a annulé le BC commercial #${bl.id} déjà validé par l’ADMIN`,
        undefined,
        {
          commercialBlId: bl.id,
          executionLogId: bl.executionLogId,
          previousStatus,
          reason: reason || null,
          type: 'validated_commercial_bl_cancelled',
        }
      )
    }

    await bl.load('modificationRequests')
    return ctx.response.json({ success: true, bl: this.formatCommercialBl(bl) })
  }

  async commercialBlRequests(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    if (![Role.ADMIN, Role.COMMERCIAL_ADMIN, Role.ADMIN_DETAILLANT].includes(currentUser.role)) {
      return ctx.response.status(403).json({ message: 'Accès réservé aux responsables' })
    }

    const { status } = ctx.request.qs()
    const personalClientsSupported = await this.commercialPersonalClientsSupported()
    const query = CommercialBlModificationRequest.query()
      .preload('requester')
      .preload('reviewer')
      .preload('commercialBl', (blQuery) => {
        blQuery.preload('executionLog', (logQuery) => {
          logQuery.preload('agent')
          ;(logQuery as any).preload('planningItem', (planningQuery: any) => {
            planningQuery.preload('client').preload('commercialClientLocation', (locationQuery: any) => {
              locationQuery.preload('client')
            })
          })
          if (personalClientsSupported) logQuery.preload('personalClient')
        })
      })
      .orderBy('created_at', 'desc')

    if (status === 'history') {
      query.whereNot('status', 'EN_ATTENTE')
    } else if (status === 'all') {
      // Vue complète réservée aux usages internes.
    } else if (status) {
      query.where('status', String(status).toUpperCase())
    } else {
      query.where('status', 'EN_ATTENTE')
    }

    const requests = await query

    const filtered = requests.filter((request) => {
      const agentRole = request.commercialBl?.executionLog?.agent?.role
      if (currentUser.role === Role.ADMIN) return true
      if (currentUser.role === Role.COMMERCIAL_ADMIN) return agentRole === Role.AGENT_COMMERCIAL
      if (currentUser.role === Role.ADMIN_DETAILLANT) return agentRole === Role.COMMERCIAL_DETAILLANT
      return false
    })

    return ctx.response.json(filtered.map((request) => this.formatCommercialBlRequest(request)))
  }

  async reviewCommercialBlRequest(ctx: HttpContext) {
    const currentUser = await this.requireCommercialUser(ctx)
    if (!currentUser) return

    if (![Role.ADMIN, Role.COMMERCIAL_ADMIN, Role.ADMIN_DETAILLANT].includes(currentUser.role)) {
      return ctx.response.status(403).json({ message: 'Accès réservé aux responsables' })
    }

    const request = await CommercialBlModificationRequest.query()
      .where('id', ctx.params.id)
      .where('status', 'EN_ATTENTE')
      .preload('requester')
      .preload('commercialBl', (blQuery) => {
        blQuery.preload('executionLog', (logQuery) => logQuery.preload('agent'))
      })
      .first()

    if (!request) {
      return ctx.response.status(404).json({ message: 'Demande introuvable' })
    }

    const agentRole = request.commercialBl.executionLog.agent.role
    if (
      (currentUser.role === Role.COMMERCIAL_ADMIN && agentRole !== Role.AGENT_COMMERCIAL) ||
      (currentUser.role === Role.ADMIN_DETAILLANT && agentRole !== Role.COMMERCIAL_DETAILLANT)
    ) {
      return ctx.response.status(403).json({ message: 'Demande non autorisée pour ce responsable' })
    }

    const decision = String(ctx.request.body().decision || '').toUpperCase()
    const note = ctx.request.body().note ? String(ctx.request.body().note) : null

    if (!['APPROUVER', 'REFUSER'].includes(decision)) {
      return ctx.response.status(422).json({ message: 'Décision invalide' })
    }

    const bl = request.commercialBl
    request.reviewedBy = Number(currentUser.id)
    request.responseNote = note

    if (decision === 'APPROUVER') {
      const authorizedUntil = DateTime.now().endOf('day')
      request.status = 'APPROUVEE'
      request.authorizedAt = DateTime.now()
      request.authorizedUntil = authorizedUntil
      bl.status = 'MODIFICATION_AUTORISEE'
      bl.editAuthorizedUntil = authorizedUntil
      await bl.save()
      await UserActivityService.logActivity(
        Number(currentUser.id),
        UserActivityService.ACTIONS.APPROVE_COMMERCIAL_BL_EDIT,
        currentUser.role,
        undefined,
        { commercialBlId: bl.id, requestId: request.id, authorizedUntil: authorizedUntil.toISO(), note }
      )
    } else {
      request.status = 'REFUSEE'
      bl.status = 'VALIDE_ADMIN'
      bl.editAuthorizedUntil = null
      await bl.save()
      await UserActivityService.logActivity(
        Number(currentUser.id),
        UserActivityService.ACTIONS.REJECT_COMMERCIAL_BL_EDIT,
        currentUser.role,
        undefined,
        { commercialBlId: bl.id, requestId: request.id, note }
      )
    }

    await request.save()

    if (request.requester) {
      await NotificationService.notifyUser(
        Number(request.requester.id),
        decision === 'APPROUVER' ? 'Modification BC autorisée' : 'Modification BC refusée',
        decision === 'APPROUVER'
          ? `Votre demande de modification du BC commercial #${bl.id} est autorisée. Enregistrez vos changements pour finaliser la modification.`
          : `Votre demande de modification du BC commercial #${bl.id} a été refusée${note ? ` : ${note}` : ''}`,
        undefined,
        {
          commercialBlId: bl.id,
          requestId: request.id,
          decision,
          note,
          type: decision === 'APPROUVER' ? 'commercial_bl_edit_approved' : 'commercial_bl_edit_rejected',
        }
      )
    }

    const managerRole = this.getCommercialManagerRole(agentRole)
    if (managerRole) {
      await NotificationService.notifyRoleExcept(
        managerRole,
        Number(currentUser.id),
        decision === 'APPROUVER' ? 'Demande BC approuvée' : 'Demande BC refusée',
        `${this.getUserDisplayName(currentUser)} a ${decision === 'APPROUVER' ? 'autorisé' : 'refusé'} la modification du BC commercial #${bl.id}`,
        undefined,
        {
          commercialBlId: bl.id,
          requestId: request.id,
          decision,
          note,
          type: decision === 'APPROUVER' ? 'commercial_bl_edit_approved_by_manager' : 'commercial_bl_edit_rejected_by_manager',
        }
      )
    }

    return ctx.response.json({ success: true })
  }

  async adminCommercialBlReviews(ctx: HttpContext) {
    const currentUser = await this.requireAdmin(ctx)
    if (!currentUser) return

    const { status, search } = ctx.request.qs()
    const reviewStatuses = ['CONFIRME', 'VALIDE_ADMIN', 'REJETE_ADMIN', 'FACTURE']
    const personalClientsSupported = await this.commercialPersonalClientsSupported()
    const query = CommercialBl.query()
      .whereIn('status', reviewStatuses)
      .preload('executionLog', (logQuery) => {
        logQuery.preload('agent')
        ;(logQuery as any).preload('planningItem', (planningQuery: any) => {
          planningQuery.preload('client').preload('commercialClientLocation', (locationQuery: any) => {
            locationQuery.preload('client')
          })
        })
        if (personalClientsSupported) logQuery.preload('personalClient')
        logQuery.preload('orderLines', (linesQuery) => linesQuery.preload('product'))
      })
      .preload('adminReviewer')
      .orderBy('confirmed_at', 'asc')
      .orderBy('id', 'asc')

    if (status && reviewStatuses.includes(String(status))) {
      query.where('status', String(status))
    }

    const bls = await query.limit(500)
    const formatted = bls.map((bl) => this.formatAdminCommercialBlReview(bl))
    const filtered = search
      ? formatted.filter((item) => {
          const term = this.normalizeSearchTerm(String(search))
          return this.normalizeSearchTerm(item.clientName).includes(term) ||
            this.normalizeSearchTerm(item.agentName).includes(term) ||
            this.normalizeSearchTerm(item.numeroCommande).includes(term) ||
            this.normalizeSearchTerm(item.clientAccountNumber).includes(term) ||
            this.normalizeSearchTerm(item.parentName).includes(term) ||
            this.normalizeSearchTerm(item.reviewer).includes(term) ||
            this.normalizeSearchTerm(item.adminReviewComment).includes(term) ||
            this.normalizeSearchTerm(this.getAdminCommercialBlStatusSearchText(item.status)).includes(term)
        })
      : formatted

    return ctx.response.json(filtered)
  }

  async reviewCommercialBlForFacturation(ctx: HttpContext) {
    const currentUser = await this.requireAdmin(ctx)
    if (!currentUser) return

    const decision = String(ctx.request.body().decision || '').toUpperCase()
    const note = ctx.request.body().note ? String(ctx.request.body().note).trim() : ''

    if (!['VALIDER', 'REJETER'].includes(decision)) {
      return ctx.response.status(422).json({ message: 'Décision invalide' })
    }

    if (decision === 'REJETER' && !note) {
      return ctx.response.status(422).json({ message: 'Le commentaire est obligatoire lors du rejet' })
    }

    const bl = await CommercialBl.query()
      .where('id', ctx.params.id)
      .preload('executionLog', (logQuery) => {
        logQuery.preload('agent')
        logQuery.preload('orderLines', (linesQuery) => linesQuery.preload('product'))
      })
      .first()

    if (!bl) {
      return ctx.response.status(404).json({ message: 'BC commercial introuvable' })
    }

    if (bl.status !== 'CONFIRME') {
      return ctx.response.status(409).json({ message: 'Seul un BC confirmé en attente peut être validé ou rejeté' })
    }

    bl.adminReviewedBy = Number(currentUser.id)
    bl.adminReviewedAt = DateTime.now()
    bl.adminReviewComment = note || null
    bl.editAuthorizedUntil = null

    if (decision === 'VALIDER') {
      bl.status = 'VALIDE_ADMIN'
      await bl.save()

      await UserActivityService.logActivity(
        Number(currentUser.id),
        UserActivityService.ACTIONS.VALIDATE_COMMERCIAL_BL_FOR_FACTURATION,
        currentUser.role,
        undefined,
        { commercialBlId: bl.id, executionLogId: bl.executionLogId, note }
      )

      await NotificationService.notifyRole(
        Role.FACTURATION,
        'BC commercial autorisé',
        `Le BC commercial #${bl.id} est autorisé pour facturation`,
        undefined,
        { commercialBlId: bl.id, executionLogId: bl.executionLogId, type: 'commercial_bl_authorized' }
      )

      const agent = bl.executionLog?.agent
      if (agent) {
        await NotificationService.notifyUser(
          Number(agent.id),
          'BC commercial validé',
          `Votre BC commercial #${bl.id} a été validé par l’ADMIN`,
          undefined,
          { commercialBlId: bl.id, executionLogId: bl.executionLogId, type: 'commercial_bl_validated_by_admin' }
        )
      }

      await NotificationService.notifyRoleExcept(
        Role.ADMIN,
        Number(currentUser.id),
        'BC commercial validé',
        `${this.getUserDisplayName(currentUser)} a validé le BC commercial #${bl.id}`,
        undefined,
        { commercialBlId: bl.id, executionLogId: bl.executionLogId, type: 'commercial_bl_validated_by_other_admin' }
      )
    } else {
      bl.status = 'REJETE_ADMIN'
      await bl.save()

      await UserActivityService.logActivity(
        Number(currentUser.id),
        UserActivityService.ACTIONS.REJECT_COMMERCIAL_BL_FOR_FACTURATION,
        currentUser.role,
        undefined,
        { commercialBlId: bl.id, executionLogId: bl.executionLogId, note }
      )

      const agent = bl.executionLog?.agent
      if (agent) {
        await NotificationService.notifyUser(
          Number(agent.id),
          'BC commercial rejeté',
          `Votre BC commercial #${bl.id} a été rejeté par l’ADMIN : ${note}`,
          undefined,
          { commercialBlId: bl.id, executionLogId: bl.executionLogId, type: 'commercial_bl_rejected' }
        )
      }

      await NotificationService.notifyRoleExcept(
        Role.ADMIN,
        Number(currentUser.id),
        'BC commercial rejeté',
        `${this.getUserDisplayName(currentUser)} a rejeté le BC commercial #${bl.id}${note ? ` : ${note}` : ''}`,
        undefined,
        { commercialBlId: bl.id, executionLogId: bl.executionLogId, note, type: 'commercial_bl_rejected_by_other_admin' }
      )
    }

    return ctx.response.json({ success: true, bl: this.formatCommercialBl(bl) })
  }

  async facturationCommercialBls(ctx: HttpContext) {
    const currentUser = await this.requireFacturationUser(ctx)
    if (!currentUser) return

    const { status, search, from, to } = ctx.request.qs()
    const allowedStatuses = ['VALIDE_ADMIN', 'FACTURE']
    const personalClientsSupported = await this.commercialPersonalClientsSupported()
    const query = CommercialBl.query()
      .whereIn('status', allowedStatuses)
      .preload('executionLog', (logQuery) => {
        logQuery.preload('agent')
        ;(logQuery as any).preload('planningItem', (planningQuery: any) => {
          planningQuery.preload('client').preload('commercialClientLocation', (locationQuery: any) => {
            locationQuery.preload('client')
          })
        })
        if (personalClientsSupported) logQuery.preload('personalClient')
        logQuery.preload('orderLines', (linesQuery) => linesQuery.preload('product'))
      })
      .preload('confirmer')
      .preload('facturer')
      .orderBy('admin_reviewed_at', 'asc')
      .orderBy('confirmed_at', 'asc')
      .orderBy('id', 'asc')

    if (status && allowedStatuses.includes(String(status))) {
      query.where('status', String(status))
    }
    if (from) {
      query.where('confirmed_at', '>=', DateTime.fromISO(from).startOf('day').toSQL()!)
    }
    if (to) {
      query.where('confirmed_at', '<=', DateTime.fromISO(to).endOf('day').toSQL()!)
    }

    const bls = await query.limit(500)
    const formatted = bls.map((bl) => this.formatFacturationCommercialBl(bl))
    const filtered = search
      ? formatted.filter((item) => {
          const term = String(search).toLowerCase()
          return item.clientName.toLowerCase().includes(term) ||
            item.agentName.toLowerCase().includes(term) ||
            item.numeroCommande.toLowerCase().includes(term)
        })
      : formatted

    return ctx.response.json(filtered)
  }

  async markCommercialBlFactured(ctx: HttpContext) {
    const currentUser = await this.requireFacturationUser(ctx)
    if (!currentUser) return

    const bl = await CommercialBl.query()
      .where('id', ctx.params.id)
      .preload('executionLog', (logQuery) => logQuery.preload('agent'))
      .first()

    if (!bl) {
      return ctx.response.status(404).json({ message: 'BC commercial introuvable' })
    }

    if (bl.status === 'FACTURE') {
      return ctx.response.json({ success: true, message: 'BC commercial déjà facturé', bl: this.formatCommercialBl(bl) })
    }

    if (bl.status !== 'VALIDE_ADMIN') {
      await NotificationService.notifyRole(
        Role.ADMIN,
        'Facturation BC impossible',
        `Le rôle facturation a tenté de facturer le BC commercial #${bl.id} avec le statut ${bl.status}`,
        undefined,
        {
          commercialBlId: bl.id,
          executionLogId: bl.executionLogId,
          status: bl.status,
          type: 'commercial_bl_facturation_blocked',
        }
      )
      return ctx.response.status(409).json({
        message: ['CONFIRME', 'MODIFICATION_DEMANDEE', 'MODIFICATION_AUTORISEE'].includes(bl.status)
          ? 'Ce BC attend une validation ADMIN ou une fin de modification'
          : 'Seul un BC autorisé par l’ADMIN peut être facturé',
      })
    }

    bl.status = 'FACTURE'
    bl.facturedBy = Number(currentUser.id)
    bl.facturedAt = DateTime.now()
    bl.editAuthorizedUntil = null
    await bl.save()

    await UserActivityService.logActivity(
      Number(currentUser.id),
      UserActivityService.ACTIONS.MARK_COMMERCIAL_BL_FACTURED,
      currentUser.role,
      undefined,
      {
        commercialBlId: bl.id,
        executionLogId: bl.executionLogId,
        facturedAt: bl.facturedAt?.toISO(),
      }
    )

    const agent = bl.executionLog?.agent
    if (agent) {
      await NotificationService.notifyUser(
        Number(agent.id),
        'BC commercial facturé',
        `Votre BC commercial #${bl.id} a été marqué comme facturé`,
        undefined,
        { commercialBlId: bl.id, executionLogId: bl.executionLogId, type: 'commercial_bl_factured' }
      )
    }

    return ctx.response.json({ success: true, bl: this.formatCommercialBl(bl) })
  }

  private async agentClientsData(ctx: HttpContext) {
    const currentUser = await ctx.auth.authenticate()
    const { day, agentId } = ctx.request.qs()
    const targetAgentId =
      currentUser.role === Role.AGENT_COMMERCIAL ? Number(currentUser.id) : Number(agentId || currentUser.id)
    const selectedDay = (day || this.getTodayPlanningDay()) as CommercialPlanningDay
    const canModify = selectedDay === this.getTodayPlanningDay()
    const selectedDayRange = this.getCurrentWeekPlanningDayRange(selectedDay)

    const planningItems = await CommercialPlanningItem.query()
      .where('agent_id', targetAgentId)
      .where('day_of_week', selectedDay)
      .where('is_active', true)
      .preload('client')
      .preload('executionLogs', (logsQuery) => this.preloadExecutionLogsForRange(logsQuery, selectedDayRange))
      .orderBy('sort_order', 'asc')

    const locations = await this.getLocationsMap(planningItems.map((item) => item.commercialClientLocationId))
    const activeBcs = await this.getActiveCommercialBlsMap(planningItems.map((item) => item.id))

    return planningItems.map((item) => this.formatAgentPlanningItem(item, locations, canModify, activeBcs))
  }

  private formatAgentPlanningItem(
    item: CommercialPlanningItem,
    locations: Map<number, any>,
    canModify = false,
    activeBcs = new Map<number, CommercialBl>(),
    followUpDueState: 'due_today' | 'overdue' | null = null
  ) {
    const location = item.commercialClientLocationId ? locations.get(item.commercialClientLocationId) : null
    const target = location || item.client
    const parentClient = location?.client || item.client
    const latestLog = item.executionLogs?.[0]
    const latestCommercialBlLog = (item.executionLogs || []).find((log) => log.commercialBl)
    const latestCommercialBc = latestCommercialBlLog?.commercialBl || null
    const activeBc = activeBcs.get(item.id) || (this.isCommercialBlActive(latestCommercialBc) ? latestCommercialBc : null)
    const visibleBc = activeBc || latestCommercialBc
    const resolvedFollowUpDueState =
      followUpDueState ||
      CommercialFollowUpService.getFollowUpDueState(
        latestLog?.status as CommercialExecutionStatus,
        latestLog?.nextFollowUpAt
      )
    const status = isTourItemCompleted(latestLog?.status as CommercialExecutionStatus | undefined)
      ? 'effectuer'
      : 'en_attente'

    return {
      id: String(item.id),
      name: target?.name || 'Client inconnu',
      address: location?.address || item.client?.address || '',
      phone: location?.phone || item.client?.phone || '',
      accountNumber: parentClient?.accountNumber || '',
      status,
      executionStatus: latestLog?.status ?? null,
      latestComment: latestLog?.comment ?? null,
      nextFollowUpAt: latestLog?.nextFollowUpAt?.toISO() ?? null,
      followUpDueState: resolvedFollowUpDueState,
      orderTaken: Boolean(latestLog?.orderTaken),
      commercialBcStatus: visibleBc?.status ?? null,
      commercialBcId: visibleBc ? String(visibleBc.id) : null,
      recentLogs: (item.executionLogs || []).map((log) => ({
        id: log.id,
        status: log.status,
        comment: log.comment,
        orderTaken: log.orderTaken,
        nextFollowUpAt: log.nextFollowUpAt?.toISO() ?? null,
        createdAt: log.createdAt.toISO(),
      })),
      assignedDate: item.dayOfWeek,
      agentId: String(item.agentId),
      type: parentClient?.type,
      parentName: location ? parentClient?.name : null,
      instructions: item.instructions,
      canModify,
    }
  }

  private formatAgentAssignedPortfolioItem(assignment: CommercialClientAssignment) {
    const location = assignment.commercialClientLocation
    const target = location || assignment.client
    const parentClient = location?.client || assignment.client

    return {
      id: String(assignment.id),
      source: 'ADMIN',
      targetType: location ? 'LOCATION' : 'CLIENT',
      commercialClientId: assignment.commercialClientId,
      commercialClientLocationId: assignment.commercialClientLocationId,
      name: target?.name || 'Client inconnu',
      parentName: location ? parentClient?.name || null : null,
      type: parentClient?.type || null,
      phone: location?.phone || assignment.client?.phone || '',
      address: location?.address || assignment.client?.address || '',
      accountNumber: parentClient?.accountNumber || '',
      note: assignment.note,
      assignedAt: assignment.startedAt?.toISO() || assignment.createdAt.toISO(),
      isActive: assignment.isActive,
    }
  }

  private preloadExecutionLogsForRange(logsQuery: any, range: { start: DateTime; end: DateTime }) {
    return logsQuery
      .where('created_at', '>=', range.start.toSQL()!)
      .where('created_at', '<=', range.end.toSQL()!)
      .preload('commercialBl')
      .orderBy('created_at', 'desc')
      .limit(20)
  }

  private async canModifyPlanningItemToday(planningItem: CommercialPlanningItem) {
    if (planningItem.dayOfWeek === this.getTodayPlanningDay()) {
      return true
    }

    const latestLog = await CommercialExecutionLog.query()
      .where('planning_item_id', planningItem.id)
      .orderBy('created_at', 'desc')
      .first()

    if (!latestLog || latestLog.status !== CommercialExecutionStatus.A_RELANCER || !latestLog.nextFollowUpAt) {
      return false
    }

    const endOfToday = DateTime.local().endOf('day')

    return latestLog.nextFollowUpAt <= endOfToday
  }

  private formatExecutionLogEntry(log: CommercialExecutionLog) {
    const clientInfo = this.resolveClientFromExecutionLog(log)

    return {
      id: String(log.id),
      planningItemId: log.planningItemId,
      personalClientId: log.personalClientId,
      clientName: clientInfo.name,
      clientAddress: clientInfo.address,
      clientPhone: clientInfo.phone,
      clientCode: clientInfo.accountNumber,
      parentName: clientInfo.parentName,
      status: log.status,
      comment: log.comment,
      orderTaken: log.orderTaken,
      nextFollowUpAt: log.nextFollowUpAt?.toISO() ?? null,
      resolvedFollowUpAt: log.resolvedFollowUpAt?.toISO() ?? null,
      followUpResolved: Boolean(log.resolvedFollowUpAt),
      createdAt: log.createdAt.toISO(),
      orderLines: (log.orderLines || []).map((line) => ({
        id: line.id,
        productId: line.productId,
        productName: line.product?.name || '',
        productReference: line.product?.reference || '',
        quantity: line.quantity,
        unitPrice: Number(line.product?.price || 0),
        totalPrice: Number(line.product?.price || 0) * line.quantity,
      })),
    }
  }

  private formatAgentOrder(log: CommercialExecutionLog) {
    const clientInfo = this.resolveClientFromExecutionLog(log)
    const items = (log.orderLines || []).map((line) => ({
      id: String(line.id),
      productId: line.productId,
      product: line.product?.name || '',
      reference: line.product?.reference || '',
      quantity: String(line.quantity),
      unitPrice: Number(line.product?.price || 0),
      totalPrice: Number(line.product?.price || 0) * line.quantity,
    }))
    const sousTotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
    const orderStatus =
      log.commercialBl?.status === 'ANNULE'
        ? 'annulee'
        : ['CONFIRME', 'VALIDE_ADMIN', 'MODIFICATION_DEMANDEE', 'FACTURE'].includes(log.commercialBl?.status || '')
          ? 'en_cours_facturation'
          : 'en_preparation'

    return {
      id: String(log.id),
      numeroCommande: `CMD-${log.id}`,
      clientId: log.planningItemId ? String(log.planningItemId) : `personal-${log.personalClientId}`,
      clientName: clientInfo.name,
      clientAddress: clientInfo.address,
      clientPhone: clientInfo.phone,
      clientCode: clientInfo.accountNumber,
      parentName: clientInfo.parentName,
      dateCommande: log.createdAt.toFormat('yyyy-MM-dd'),
      heureCommande: log.createdAt.toFormat('HH:mm'),
      commentaire: log.comment,
      items,
      sousTotal,
      total: sousTotal,
      statut: orderStatus,
      commercialBl: this.formatCommercialBl(log.commercialBl),
    }
  }

  private async attachFollowUpResolutionFlags(logs: CommercialExecutionLog[]) {
    const planningIds = [...new Set(logs.map((log) => log.planningItemId).filter(Boolean))] as number[]
    const allItemLogs =
      planningIds.length > 0
        ? await CommercialExecutionLog.query()
            .whereIn('planning_item_id', planningIds)
            .orderBy('created_at', 'asc')
        : []

    const logsByItem = new Map<number, CommercialExecutionLog[]>()
    for (const log of allItemLogs) {
      if (!log.planningItemId) continue
      const bucket = logsByItem.get(log.planningItemId) || []
      bucket.push(log)
      logsByItem.set(log.planningItemId, bucket)
    }

    return logs.map((log) => {
      const entry = this.formatExecutionLogEntry(log)
      let resolvedFollowUpAt = entry.resolvedFollowUpAt

      if (
        !resolvedFollowUpAt &&
        log.planningItemId &&
        log.status !== CommercialExecutionStatus.A_RELANCER
      ) {
        const itemLogs = logsByItem.get(log.planningItemId) || []
        const index = itemLogs.findIndex((itemLog) => itemLog.id === log.id)
        if (index > 0) {
          const previous = itemLogs[index - 1]
          if (
            previous.status === CommercialExecutionStatus.A_RELANCER &&
            previous.nextFollowUpAt &&
            log.createdAt >= previous.nextFollowUpAt.startOf('day')
          ) {
            resolvedFollowUpAt = previous.nextFollowUpAt.toISO()
          }
        }
      }

      return {
        ...entry,
        resolvedFollowUpAt,
        followUpResolved: Boolean(resolvedFollowUpAt),
      }
    })
  }

  private resolveClientFromExecutionLog(log?: CommercialExecutionLog | null) {
    if (log?.personalClient) {
      return {
        name: log.personalClient.name || 'Client inconnu',
        address: log.personalClient.address || '',
        phone: log.personalClient.phone || '',
        accountNumber: log.personalClient.accountNumber || '',
        parentName: 'Portefeuille personnel',
      }
    }

    return this.resolveClientFromPlanningItem(log?.planningItem)
  }

  private resolveClientFromPlanningItem(planningItem?: CommercialPlanningItem | null) {
    if (!planningItem) {
      return {
        name: 'Client inconnu',
        address: '',
        phone: '',
        accountNumber: '',
        parentName: null as string | null,
      }
    }

    const location = planningItem.commercialClientLocation
    const target = location || planningItem.client
    const parentClient = location?.client || planningItem.client

    return {
      name: target?.name || 'Client inconnu',
      address: location?.address || planningItem.client?.address || '',
      phone: location?.phone || planningItem.client?.phone || '',
      accountNumber: parentClient?.accountNumber || '',
      parentName: location ? parentClient?.name || null : null,
    }
  }

  private async getLocationsMap(locationIds: Array<number | null | undefined>) {
    const ids = [...new Set(locationIds.filter(Boolean) as number[])]
    if (ids.length === 0) {
      return new Map<number, any>()
    }

    const locations = await CommercialClientLocation.query()
      .whereIn('id', ids)
      .preload('client')

    return new Map(locations.map((location) => [location.id, location.serialize()]))
  }

  private async attachLocations<T extends { commercialClientLocationId?: number | null; serialize?: () => any }>(
    records: T[]
  ) {
    const locations = await this.getLocationsMap(records.map((record) => record.commercialClientLocationId))

    return records.map((record) => {
      const serialized = typeof record.serialize === 'function' ? record.serialize() : record

      return {
        ...serialized,
        location: record.commercialClientLocationId
          ? locations.get(record.commercialClientLocationId) || null
          : null,
      }
    })
  }

  private formatProduct(product: Product) {
    return {
      id: product.id,
      reference: product.reference,
      name: product.name,
      price: Number(product.price) || 0,
      imgUrl: product.imgUrl,
      createdAt: product.createdAt?.toISO(),
      updatedAt: product.updatedAt?.toISO() ?? null,
    }
  }

  private getTeamStatsPeriodRange(period: string, from?: string, to?: string) {
    const now = DateTime.local()

    if (period === 'custom' && from) {
      const start = DateTime.fromISO(String(from)).startOf('day')
      let end = to ? DateTime.fromISO(String(to)).endOf('day') : start.endOf('day')

      if (!start.isValid) {
        return { start: now.minus({ days: 6 }).startOf('day'), end: now.endOf('day') }
      }
      if (!end.isValid || end < start) {
        end = start.endOf('day')
      }

      return { start, end }
    }

    switch (period) {
      case 'today':
        return { start: now.startOf('day'), end: now.endOf('day') }
      case '30d':
        return { start: now.minus({ days: 29 }).startOf('day'), end: now.endOf('day') }
      case 'month':
        return { start: now.startOf('month'), end: now.endOf('month') }
      case '7d':
      default:
        return { start: now.minus({ days: 6 }).startOf('day'), end: now.endOf('day') }
    }
  }

  private fillDailyTrendGaps(
    rows: Array<{ date: string; actions: number; orders: number }>,
    start: DateTime,
    end: DateTime
  ) {
    const map = new Map(rows.map((row) => [row.date, row]))
    const result: Array<{ date: string; actions: number; orders: number }> = []
    let cursor = start.startOf('day')

    while (cursor <= end) {
      const key = cursor.toISODate()!
      result.push(map.get(key) || { date: key, actions: 0, orders: 0 })
      cursor = cursor.plus({ days: 1 })
    }

    return result
  }

  private getTodayPlanningDay() {
    const days = [
      CommercialPlanningDay.DIMANCHE,
      CommercialPlanningDay.LUNDI,
      CommercialPlanningDay.MARDI,
      CommercialPlanningDay.MERCREDI,
      CommercialPlanningDay.JEUDI,
      CommercialPlanningDay.VENDREDI,
      CommercialPlanningDay.SAMEDI,
    ]

    const today = days[new Date().getDay()]
    return today === CommercialPlanningDay.DIMANCHE ? CommercialPlanningDay.LUNDI : today
  }

  private getCurrentWeekPlanningDayRange(day: CommercialPlanningDay) {
    return getCurrentWeekPlanningDayRange(day)
  }

  private async buildAlerts() {
    const [clients, locations, agents, planningItems, overdueFollowUps] = await Promise.all([
      CommercialClient.query().where('is_active', true).preload('assignments', (query) => query.where('is_active', true)),
      CommercialClientLocation.query()
        .where('is_active', true)
        .preload('client')
        .preload('assignments', (query) => query.where('is_active', true)),
      User.query().where('role', Role.AGENT_COMMERCIAL).where('is_active', true),
      CommercialPlanningItem.query().where('is_active', true),
      CommercialFollowUpService.getOverdueFollowUpsSummary(),
    ])

    const unassignedIndividuals = clients.filter(
      (client) => client.type === CommercialClientType.INDIVIDUEL && client.assignments.length === 0
    )
    const unassignedLocations = locations.filter((location) => location.assignments.length === 0)
    const agentsWithoutPlanning = agents.filter(
      (agent) => !planningItems.some((item) => Number(item.agentId) === Number(agent.id))
    )
    const planningDays = Object.values(CommercialPlanningDay).filter(
      (day) => day !== CommercialPlanningDay.DIMANCHE
    )
    const daysWithoutPlanning = planningDays.filter(
      (day) => !planningItems.some((item) => item.dayOfWeek === day)
    )

    return {
      unassignedClients: unassignedIndividuals.map((client) => ({
        id: client.id,
        name: client.name,
        type: client.type,
      })),
      unassignedLocations: unassignedLocations.map((location) => ({
        id: location.id,
        name: location.name,
        clientName: location.client?.name,
      })),
      agentsWithoutPlanning: agentsWithoutPlanning.map((agent) => ({
        id: agent.id,
        name: `${agent.firstname} ${agent.lastname}`,
        phone: agent.phone,
      })),
      daysWithoutPlanning,
      overdueFollowUps,
    }
  }
}
