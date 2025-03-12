import { BaseSchema } from '@adonisjs/lucid/schema'
import { Role } from '../../app/enum/roles.js'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('firstname').notNullable()
      table.string('lastname').notNullable()
      table.enum('role', Object.values(Role)).notNullable()
      table.string('email', 254).nullable().unique()
      table.integer('depot_id').references('depots.id').nullable()
      table.string('phone').notNullable().unique()
      table.string('password').notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
