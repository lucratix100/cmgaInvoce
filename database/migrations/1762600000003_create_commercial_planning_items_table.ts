import { BaseSchema } from '@adonisjs/lucid/schema'
import { CommercialPlanningDay } from '../../app/enum/index.js'

export default class extends BaseSchema {
  protected tableName = 'commercial_planning_items'

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
      table.enum('day_of_week', Object.values(CommercialPlanningDay)).notNullable()
      table.integer('sort_order').notNullable().defaultTo(0)
      table.text('instructions').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.integer('created_by').unsigned().references('id').inTable('users').nullable()
      table.timestamp('disabled_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
