import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import User from './user.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Invoice from './invoice.js'

export default class InvoiceReminder extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare invoiceId: number 

  @column()
  declare remindAt: DateTime

  @column()
  declare comment: string 

  @column()
  declare read: boolean

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Invoice)
  declare invoice: BelongsTo<typeof Invoice>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}