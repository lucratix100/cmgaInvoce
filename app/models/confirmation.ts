import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Bl from './bl.js'
import User from './user.js'

export default class Confirmation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  @column()
  declare blId: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Bl)
  declare bl: BelongsTo<typeof Bl>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}