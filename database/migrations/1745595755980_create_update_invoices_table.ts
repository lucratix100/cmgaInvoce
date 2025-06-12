import { BaseSchema } from '@adonisjs/lucid/schema'
import { InvoicePaymentStatus } from '../../app/enum/index.js'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
     table.enum('status_payment', Object.values(InvoicePaymentStatus)).defaultTo(InvoicePaymentStatus.NON_PAYE).notNullable()
    })
  }
  async down() {
    this.schema.alterTable(this.tableName, () => {
    })
  }
}