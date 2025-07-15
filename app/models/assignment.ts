import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import Root from './root.js'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import CommercialInitial from './commercial_initial.js'

import User from './user.js'

export default class Assignment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare rootId: number

  @column()
  declare userId: number | null

  @column()
  declare commercialInitialId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column()
  declare isActive: boolean

  @belongsTo(() => Root)

  declare root: BelongsTo<typeof Root>

  @belongsTo(() => CommercialInitial)
  declare commercial_intials: BelongsTo<typeof CommercialInitial>

  @belongsTo(() => User)
  declare users: BelongsTo<typeof User>

  @column()
  declare pattern: string

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

}