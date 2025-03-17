import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Driver from '#models/driver'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Invoice from '#models/invoice'
import Confirmation from './confirmation.js'

export default class Bl extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare date: Date

  @column()
  declare isDelivered: boolean

  @column()
  declare status: 'validée' | 'en attente de confirmation'

  @column()
  declare products: string

  @column()
  declare driverId: number

  @column()
  declare invoiceId: number

  @belongsTo(() => Driver)
  declare driver: BelongsTo<typeof Driver>

  @belongsTo(() => Invoice)
  declare invoice: BelongsTo<typeof Invoice>



  @hasMany(() => Confirmation)
  declare confirmations: HasMany<typeof Confirmation>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}