import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { PaymentMethod } from '../enum/index.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Invoice from './invoice.js'

export default class Payment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare invoiceId: number

  @column()
  declare amount: number

  @column()
  declare paymentMethod: PaymentMethod

  @column()
  declare paymentDate: Date

  @column()
  declare comment: string | null

  @column()
  declare chequeInfo: string | null

  @belongsTo(() => Invoice)
  declare invoice: BelongsTo<typeof Invoice>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}