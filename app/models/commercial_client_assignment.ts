import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import CommercialClient from './commercial_client.js'
import CommercialClientLocation from './commercial_client_location.js'
import CommercialAssignmentHistory from './commercial_assignment_history.js'

export default class CommercialClientAssignment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare agentId: number

  @column()
  declare commercialClientId: number | null

  @column()
  declare commercialClientLocationId: number | null

  @column()
  declare assignedBy: number | null

  @column()
  declare note: string | null

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare startedAt: DateTime | null

  @column.dateTime()
  declare endedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'agentId' })
  declare agent: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'assignedBy' })
  declare assigner: BelongsTo<typeof User>

  @belongsTo(() => CommercialClient, { foreignKey: 'commercialClientId' })
  declare client: BelongsTo<typeof CommercialClient>

  @belongsTo(() => CommercialClientLocation, { foreignKey: 'commercialClientLocationId' })
  declare commercialClientLocation: BelongsTo<typeof CommercialClientLocation>

  @hasMany(() => CommercialAssignmentHistory, { foreignKey: 'assignmentId' })
  declare histories: HasMany<typeof CommercialAssignmentHistory>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
