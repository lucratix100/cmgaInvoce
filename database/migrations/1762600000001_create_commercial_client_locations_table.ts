import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_client_locations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('commercial_client_id')
        .unsigned()
        .references('id')
        .inTable('commercial_clients')
        .onDelete('CASCADE')
        .notNullable()
      table.string('name').notNullable()
      table.string('address').nullable()
      table.string('phone').nullable()
      table.string('phone2').nullable()
      table.string('email').nullable()
      table.string('responsable').nullable()
      table.text('notes').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('disabled_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
