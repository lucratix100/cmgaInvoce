import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import CommercialOrderLine from './commercial_order_line.js'
import CommercialBl from './commercial_bl.js'
import { CommercialExecutionStatus } from '../enum/index.js'
import User from './user.js'
import CommercialPlanningItem from './commercial_planning_item.js'
import CommercialPersonalClient from './commercial_personal_client.js'

export default class CommercialExecutionLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare planningItemId: number | null

  @column()
  declare personalClientId: number | null

  @column()
  declare agentId: number

  @column()
  declare status: CommercialExecutionStatus

  @column()
  declare comment: string | null

  @column()
  declare orderTaken: boolean

  @column.dateTime()
  declare nextFollowUpAt: DateTime | null

  @column.dateTime()
  declare resolvedFollowUpAt: DateTime | null

  @column()
  declare createdBy: number | null

  @belongsTo(() => CommercialPlanningItem, { foreignKey: 'planningItemId' })
  declare planningItem: BelongsTo<typeof CommercialPlanningItem>

  @belongsTo(() => CommercialPersonalClient, { foreignKey: 'personalClientId' })
  declare personalClient: BelongsTo<typeof CommercialPersonalClient>

  @belongsTo(() => User, { foreignKey: 'agentId' })
  declare agent: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @hasMany(() => CommercialOrderLine, { foreignKey: 'executionLogId' })
  declare orderLines: HasMany<typeof CommercialOrderLine>

  @hasOne(() => CommercialBl, { foreignKey: 'executionLogId' })
  declare commercialBl: HasOne<typeof CommercialBl>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
