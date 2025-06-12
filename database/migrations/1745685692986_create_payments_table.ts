import { BaseSchema } from '@adonisjs/lucid/schema'
import { PaymentMethod } from '../../app/enum/index.js'
export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('invoice_id').references('invoices.id').notNullable()
      table.integer('amount').notNullable().unsigned()
      table.enum('payment_method', Object.values(PaymentMethod))
      table.date('payment_date').notNullable()
      table.text('comment').nullable()


      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}