import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import CommercialBl from './commercial_bl.js'
import User from './user.js'

export default class CommercialBlDocument extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare commercialBlId: number

  @column()
  declare uploadedBy: number

  @column()
  declare originalName: string

  @column()
  declare storedName: string

  @column()
  declare mimeType: string

  @column()
  declare size: number

  @belongsTo(() => CommercialBl, { foreignKey: 'commercialBlId' })
  declare commercialBl: BelongsTo<typeof CommercialBl>

  @belongsTo(() => User, { foreignKey: 'uploadedBy' })
  declare uploader: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
