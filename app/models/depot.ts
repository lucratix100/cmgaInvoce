import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Invoice from '#models/invoice'
import User from '#models/user'


export default class Depot extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare needDoubleCheck: boolean

  @hasMany(() => Invoice)
  declare invoice: HasMany<typeof Invoice>

  @hasMany(() => User)
  declare user: HasMany<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}