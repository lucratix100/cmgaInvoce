import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import CommercialExecutionLog from './commercial_execution_log.js'
import Product from './product.js'

export default class CommercialOrderLine extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare executionLogId: number

  @column()
  declare productId: number

  @column()
  declare quantity: number

  @belongsTo(() => CommercialExecutionLog, { foreignKey: 'executionLogId' })
  declare executionLog: BelongsTo<typeof CommercialExecutionLog>

  @belongsTo(() => Product, { foreignKey: 'productId' })
  declare product: BelongsTo<typeof Product>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
