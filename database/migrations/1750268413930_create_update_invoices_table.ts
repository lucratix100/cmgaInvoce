import { BaseSchema } from '@adonisjs/lucid/schema'
import { InvoiceStatus } from '../../app/enum/index.js'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('status', Object.values(InvoiceStatus)).defaultTo(InvoiceStatus.NON_RECEPTIONNEE)
    })
  }
  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('status')
    })
  }
}
