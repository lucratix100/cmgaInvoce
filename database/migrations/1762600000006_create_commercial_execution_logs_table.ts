import { BaseSchema } from '@adonisjs/lucid/schema'
import { CommercialExecutionStatus } from '../../app/enum/index.js'

export default class extends BaseSchema {
  protected tableName = 'commercial_execution_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('planning_item_id')
        .unsigned()
        .references('id')
        .inTable('commercial_planning_items')
        .nullable()
      table.integer('agent_id').unsigned().references('id').inTable('users').notNullable()
      table.enum('status', Object.values(CommercialExecutionStatus)).notNullable()
      table.text('comment').nullable()
      table.boolean('order_taken').notNullable().defaultTo(false)
      table.timestamp('next_follow_up_at').nullable()
      table.integer('created_by').unsigned().references('id').inTable('users').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
