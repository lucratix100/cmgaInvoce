import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Driver from '#models/driver'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Invoice from '#models/invoice'
import Confirmation from './confirmation.js'
import User from '#models/user'

export default class Bl extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare isDelivered: boolean

  @column()
  declare status: 'validée' | 'en attente de confirmation'

  @column()
  declare products: any

  @column()
  declare total: number
  @column()
  declare driverId: number

  @column()
  declare userId: number

  @column()
  declare invoiceId: number

  @belongsTo(() => Driver)
  declare driver: BelongsTo<typeof Driver>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Invoice)
  declare invoice: BelongsTo<typeof Invoice>



  @hasMany(() => Confirmation)
  declare confirmations: HasMany<typeof Confirmation>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}