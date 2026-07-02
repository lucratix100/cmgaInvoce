import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class CommercialClientImport extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare importedBy: number | null

  @column()
  declare fileName: string | null

  @column()
  declare totalRows: number

  @column()
  declare successCount: number

  @column()
  declare errorCount: number

  @column()
  declare errors: any[] | null

  @belongsTo(() => User, { foreignKey: 'importedBy' })
  declare importer: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
