import { BaseSchema } from '@adonisjs/lucid/schema'
import { InvoiceStatus } from '../../app/enum/invoice-status.js'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('invoice_number')
      table.date('date')
      table.string('account_number')
      table.string('status').defaultTo(InvoiceStatus.PENDING)
      table.jsonb('order').nullable()
      table.boolean('is_complete_delivery')
      table.integer('total_ttc')
      table.boolean('is_completed').notNullable().defaultTo(false)
      table.integer('depot_id').unsigned().references('depots.id')
      table.integer('customer_id').unsigned().references('customers.id')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
