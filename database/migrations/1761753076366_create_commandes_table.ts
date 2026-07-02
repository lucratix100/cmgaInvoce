import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commandes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('number').notNullable().unique()
      table.date('date').notNullable()
      table.integer('user_id').references('id').inTable('users').notNullable().unsigned()
      table.boolean('status').notNullable().defaultTo(false)
    
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}