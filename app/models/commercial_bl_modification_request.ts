import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import CommercialBl from './commercial_bl.js'
import User from './user.js'

export type CommercialBlModificationRequestStatus =
  | 'EN_ATTENTE'
  | 'APPROUVEE'
  | 'REFUSEE'
  | 'UTILISEE'
  | 'EXPIREE'

export default class CommercialBlModificationRequest extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare commercialBlId: number

  @column()
  declare requestedBy: number

  @column()
  declare reviewedBy: number | null

  @column()
  declare status: CommercialBlModificationRequestStatus

  @column()
  declare reason: string

  @column()
  declare responseNote: string | null

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
  declare beforeSnapshot: any[] | null

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
  declare afterSnapshot: any[] | null

  @column.dateTime()
  declare authorizedAt: DateTime | null

  @column.dateTime()
  declare authorizedUntil: DateTime | null

  @column.dateTime()
  declare usedAt: DateTime | null

  @belongsTo(() => CommercialBl, { foreignKey: 'commercialBlId' })
  declare commercialBl: BelongsTo<typeof CommercialBl>

  @belongsTo(() => User, { foreignKey: 'requestedBy' })
  declare requester: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'reviewedBy' })
  declare reviewer: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
