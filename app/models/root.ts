import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import CommercialInitial from './commercial_initial.js'
import Assignment from './assignment.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Root extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @hasMany(() => CommercialInitial)
  declare commercialInitials: HasMany<typeof CommercialInitial>

  @hasMany(() => Assignment)
  declare assignments: HasMany<typeof Assignment>

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}