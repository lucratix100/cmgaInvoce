import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Depot from './depot.js'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Customer from './customer.js'
import Bl from './bl.js'
import { InvoicePaymentStatus, InvoiceStatus } from '../enum/index.js'
import Payment from './payment.js'
import UserActivitie from './user_activitie.js'
import InvoiceRecoveryCustomSetting from './invoice_recovery_custom_setting.js'


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
  declare statusPayment: InvoicePaymentStatus
  @column()
  declare order: any | null
  @column()
  declare isUrgent: boolean
  @column.dateTime({ autoCreate: false })
  declare lastPaymentDate: DateTime | null
  @belongsTo(() => Depot)
  declare depot: BelongsTo<typeof Depot>
  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>
  @hasMany(() => Bl)
  declare bls: HasMany<typeof Bl>
  @hasMany(() => Payment)
  declare payments: HasMany<typeof Payment>
  @hasMany(() => UserActivitie)
  declare userActivities: HasMany<typeof UserActivitie>
  @hasMany(() => InvoiceRecoveryCustomSetting)
  declare recoveryCustomSettings: HasMany<typeof InvoiceRecoveryCustomSetting>
  @column.dateTime({ autoCreate: false })
  declare deliveredAt: DateTime
  @column.dateTime({ autoCreate: true })

  declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
