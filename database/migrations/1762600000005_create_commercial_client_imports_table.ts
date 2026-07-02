import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_client_imports'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('imported_by').unsigned().references('id').inTable('users').nullable()
      table.string('file_name').nullable()
      table.integer('total_rows').notNullable().defaultTo(0)
      table.integer('success_count').notNullable().defaultTo(0)
      table.integer('error_count').notNullable().defaultTo(0)
      table.jsonb('errors').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
