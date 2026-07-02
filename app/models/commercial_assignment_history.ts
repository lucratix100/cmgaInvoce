import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import CommercialClient from './commercial_client.js'
import CommercialClientAssignment from './commercial_client_assignment.js'
import CommercialClientLocation from './commercial_client_location.js'

export default class CommercialAssignmentHistory extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare assignmentId: number | null

  @column()
  declare agentId: number | null

  @column()
  declare previousAgentId: number | null

  @column()
  declare commercialClientId: number | null

  @column()
  declare commercialClientLocationId: number | null

  @column()
  declare action: string

  @column()
  declare performedBy: number | null

  @column()
  declare note: string | null

  @column()
  declare metadata: any | null

  @belongsTo(() => CommercialClientAssignment, { foreignKey: 'assignmentId' })
  declare assignment: BelongsTo<typeof CommercialClientAssignment>

  @belongsTo(() => User, { foreignKey: 'agentId' })
  declare agent: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'previousAgentId' })
  declare previousAgent: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'performedBy' })
  declare performer: BelongsTo<typeof User>

  @belongsTo(() => CommercialClient, { foreignKey: 'commercialClientId' })
  declare client: BelongsTo<typeof CommercialClient>

  @belongsTo(() => CommercialClientLocation, { foreignKey: 'commercialClientLocationId' })
  declare commercialClientLocation: BelongsTo<typeof CommercialClientLocation>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
