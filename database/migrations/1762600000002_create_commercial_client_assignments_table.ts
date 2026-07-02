import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_client_assignments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('agent_id').unsigned().references('id').inTable('users').notNullable()
      table.integer('commercial_client_id').unsigned().references('id').inTable('commercial_clients').nullable()
      table
        .integer('commercial_client_location_id')
        .unsigned()
        .references('id')
        .inTable('commercial_client_locations')
        .nullable()
      table.integer('assigned_by').unsigned().references('id').inTable('users').nullable()
      table.text('note').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('started_at').nullable()
      table.timestamp('ended_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
