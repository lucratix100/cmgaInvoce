import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_activities'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.string('action')
      table.string('role')
      table.integer('invoice_id').unsigned().references('id').inTable('invoices').onDelete('SET NULL')
      table.json('details').nullable()
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}