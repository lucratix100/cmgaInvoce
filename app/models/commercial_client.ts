import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { CommercialClientType } from '../enum/index.js'
import User from './user.js'
import CommercialClientLocation from './commercial_client_location.js'
import CommercialClientAssignment from './commercial_client_assignment.js'
import CommercialPlanningItem from './commercial_planning_item.js'

export default class CommercialClient extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare type: CommercialClientType

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

  @column()
  declare createdBy: number | null

  @column.dateTime()
  declare disabledAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @hasMany(() => CommercialClientLocation)
  declare locations: HasMany<typeof CommercialClientLocation>

  @hasMany(() => CommercialClientAssignment)
  declare assignments: HasMany<typeof CommercialClientAssignment>

  @hasMany(() => CommercialPlanningItem)
  declare planningItems: HasMany<typeof CommercialPlanningItem>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
