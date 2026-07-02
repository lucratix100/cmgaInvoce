import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import CommercialExecutionLog from './commercial_execution_log.js'

export default class CommercialPersonalClient extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare agentId: number

  @column()
  declare name: string

  @column()
  declare phone: string | null

  @column()
  declare address: string | null

  @column()
  declare email: string | null

  @column()
  declare accountNumber: string | null

  @column()
  declare contactName: string | null

  @column()
  declare notes: string | null

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare disabledAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'agentId' })
  declare agent: BelongsTo<typeof User>

  @hasMany(() => CommercialExecutionLog, { foreignKey: 'personalClientId' })
  declare executionLogs: HasMany<typeof CommercialExecutionLog>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
