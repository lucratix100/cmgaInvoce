import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import CommercialClient from './commercial_client.js'
import CommercialClientAssignment from './commercial_client_assignment.js'
import CommercialPlanningItem from './commercial_planning_item.js'

export default class CommercialClientLocation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare commercialClientId: number

  @column()
  declare name: string

  @column()
  declare address: string | null

  @column()
  declare phone: string | null

  @column()
  declare phone2: string | null

  @column()
  declare email: string | null

  @column()
  declare responsable: string | null

  @column()
  declare notes: string | null

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare disabledAt: DateTime | null

  @belongsTo(() => CommercialClient)
  declare client: BelongsTo<typeof CommercialClient>

  @hasMany(() => CommercialClientAssignment)
  declare assignments: HasMany<typeof CommercialClientAssignment>

  @hasMany(() => CommercialPlanningItem)
  declare planningItems: HasMany<typeof CommercialPlanningItem>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
