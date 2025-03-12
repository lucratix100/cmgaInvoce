import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'auth_access_tokens'
  protected refreshTableName = 'auth_refresh_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('tokenable_id')
        .unsigned()
        .notNullable()
        .references('users.id')
        .onDelete('CASCADE')
      table.string('type').notNullable()
      table.string('name').nullable()
      table.string('hash').notNullable()
      table.text('abilities').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('last_used_at').nullable()
      table.timestamp('expires_at').nullable()
    })

    this.schema.createTable(this.refreshTableName, (table) => {
      table.increments('id')
      table.string('type').notNullable()
      table.string('name').nullable()
      table.string('hash').notNullable().unique()
      table
        .integer('tokenable_id')
        .unsigned()
        .notNullable()
        .references('users.id')
        .onDelete('CASCADE')
      table.json('abilities').nullable()
      table.timestamp('last_used_at').nullable()
      table.timestamp('expires_at').nullable()
      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.dropTable(this.refreshTableName)
  }
}
