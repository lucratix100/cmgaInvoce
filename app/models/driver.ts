import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import Bl from './bl.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Driver extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare phone: string

  @column()
  declare isActive: boolean

  @hasMany(() => Bl)
  declare bls: HasMany<typeof Bl>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}