import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { Role } from '../enum/index.js'
import Depot from './depot.js'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Bl from '#models/bl'
import Assignment from './assignment.js'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['phone'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare depotId: number | null
  @column()
  declare firstname: string

  @column()
  declare lastname: string

  @column()
  declare role: Role

  @column()
  declare phone: string

  @column()
  declare email: string | null

  @column()
  declare isActive: boolean

  @hasMany(() => Bl)
  declare bls: HasMany<typeof Bl>

  @belongsTo(() => Depot)
  declare depot: BelongsTo<typeof Depot>

  @hasMany(() => Assignment)
  declare assignments: HasMany<typeof Assignment>

  @column({ serializeAs: null })
  declare password: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '30 days',
    prefix: 'user_',
    table: 'auth_access_tokens',
    type: 'auth_token',
    tokenSecretLength: 40,
  })

  static refreshTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '7 days',
    prefix: 'user_refresh_',
    table: 'auth_refresh_tokens',
    type: 'refresh_token',
    tokenSecretLength: 40,
  })

}