import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_order_lines'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('execution_log_id')
        .unsigned()
        .references('id')
        .inTable('commercial_execution_logs')
        .notNullable()
        .onDelete('CASCADE')
      table.integer('product_id').unsigned().references('id').inTable('products').notNullable()
      table.integer('quantity').notNullable().defaultTo(1)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
