import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Depot from './depot.js'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Customer from './customer.js'
import Bl from './bl.js'
import { InvoiceStatus } from '../enum/index.js'

export default class Invoice extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare invoiceNumber: string

  @column()
  declare accountNumber: string

  @column()
  declare date: Date

  @column()
  declare status: InvoiceStatus

  @column()
  declare isCompleted: boolean

  @column()
  declare totalTTC: number
  @column()
  declare isCompleteDelivery: boolean

  @column()
  declare depotId: number

  @column()
  declare customerId: number

  @column()
  declare order: JSON

  @belongsTo(() => Depot)
  declare depot: BelongsTo<typeof Depot>

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>

  @hasMany(() => Bl)
  declare bls: HasMany<typeof Bl>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
