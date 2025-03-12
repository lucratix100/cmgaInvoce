import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import Invoice from './invoice.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Customer extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare accountNumber: string

  @column()
  declare phone: string | null

  @hasMany(() => Invoice)
  declare invoices: HasMany<typeof Invoice>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
