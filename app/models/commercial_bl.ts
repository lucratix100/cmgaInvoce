import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import CommercialExecutionLog from './commercial_execution_log.js'
import CommercialBlModificationRequest from './commercial_bl_modification_request.js'
import User from './user.js'

export type CommercialBlStatus =
  | 'BROUILLON'
  | 'CONFIRME'
  | 'MODIFICATION_DEMANDEE'
  | 'MODIFICATION_AUTORISEE'
  | 'VALIDE_ADMIN'
  | 'REJETE_ADMIN'
  | 'ANNULE'
  | 'FACTURE'

export default class CommercialBl extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare executionLogId: number

  @column()
  declare createdBy: number

  @column()
  declare confirmedBy: number | null

  @column()
  declare status: CommercialBlStatus

  @column({
    prepare: (value) => value == null ? null : JSON.stringify(value),
    consume: (value) => {
      if (typeof value !== 'string') return value
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    },
  })
  declare productsSnapshot: any[] | null

  @column()
  declare comment: string | null

  @column.dateTime()
  declare confirmedAt: DateTime | null

  @column.dateTime()
  declare editAuthorizedUntil: DateTime | null

  @column()
  declare facturedBy: number | null

  @column.dateTime()
  declare facturedAt: DateTime | null

  @column()
  declare adminReviewedBy: number | null

  @column.dateTime()
  declare adminReviewedAt: DateTime | null

  @column()
  declare adminReviewComment: string | null

  @belongsTo(() => CommercialExecutionLog, { foreignKey: 'executionLogId' })
  declare executionLog: BelongsTo<typeof CommercialExecutionLog>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'confirmedBy' })
  declare confirmer: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'facturedBy' })
  declare facturer: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'adminReviewedBy' })
  declare adminReviewer: BelongsTo<typeof User>

  @hasMany(() => CommercialBlModificationRequest, { foreignKey: 'commercialBlId' })
  declare modificationRequests: HasMany<typeof CommercialBlModificationRequest>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
