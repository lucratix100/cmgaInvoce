import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'


export default class Product extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare reference: string

  @column()
  declare name: string

  @column()
  declare imgUrl: string | null

  @column()
  declare price: number



  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
