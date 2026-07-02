import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_assignment_histories'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('assignment_id')
        .unsigned()
        .references('id')
        .inTable('commercial_client_assignments')
        .nullable()
      table.integer('agent_id').unsigned().references('id').inTable('users').nullable()
      table.integer('previous_agent_id').unsigned().references('id').inTable('users').nullable()
      table.integer('commercial_client_id').unsigned().references('id').inTable('commercial_clients').nullable()
      table
        .integer('commercial_client_location_id')
        .unsigned()
        .references('id')
        .inTable('commercial_client_locations')
        .nullable()
      table.string('action').notNullable()
      table.integer('performed_by').unsigned().references('id').inTable('users').nullable()
      table.text('note').nullable()
      table.jsonb('metadata').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
