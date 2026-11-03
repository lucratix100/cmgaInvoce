import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_bl_documents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('commercial_bl_id')
        .unsigned()
        .references('id')
        .inTable('commercial_bls')
        .notNullable()
        .onDelete('CASCADE')
      table.integer('uploaded_by').unsigned().references('id').inTable('users').notNullable()
      table.string('original_name', 255).notNullable()
      table.string('stored_name', 80).notNullable()
      table.string('mime_type', 120).notNullable()
      table.integer('size').unsigned().notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['commercial_bl_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
