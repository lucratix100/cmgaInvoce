import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { CommercialPlanningDay } from '../enum/index.js'
import User from './user.js'
import CommercialClient from './commercial_client.js'
import CommercialClientLocation from './commercial_client_location.js'
import CommercialExecutionLog from './commercial_execution_log.js'

export default class CommercialPlanningItem extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare agentId: number

  @column()
  declare commercialClientId: number | null

  @column()
  declare commercialClientLocationId: number | null

  @column()
  declare dayOfWeek: CommercialPlanningDay

  @column()
  declare sortOrder: number

  @column()
  declare instructions: string | null

  @column()
  declare isActive: boolean

  @column()
  declare createdBy: number | null

  @column.dateTime()
  declare disabledAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'agentId' })
  declare agent: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => CommercialClient, { foreignKey: 'commercialClientId' })
  declare client: BelongsTo<typeof CommercialClient>

  @belongsTo(() => CommercialClientLocation, { foreignKey: 'commercialClientLocationId' })
  declare commercialClientLocation: BelongsTo<typeof CommercialClientLocation>

  @hasMany(() => CommercialExecutionLog, { foreignKey: 'planningItemId' })
  declare executionLogs: HasMany<typeof CommercialExecutionLog>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
