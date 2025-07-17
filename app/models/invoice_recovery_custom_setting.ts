import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Invoice from './invoice.js'

export default class InvoiceRecoveryCustomSetting extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare invoiceId: number

  @column()
  declare customDays: number

  @belongsTo(() => Invoice)
  declare invoice: BelongsTo<typeof Invoice>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}