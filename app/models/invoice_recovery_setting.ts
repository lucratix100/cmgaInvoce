import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Root from './root.js'

export default class InvoiceRecoverySetting extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare rootId: number | null

  @column()
  declare defaultDays: number

  @column()
  declare isActive: boolean

  @belongsTo(() => Root)
  declare root: BelongsTo<typeof Root>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}