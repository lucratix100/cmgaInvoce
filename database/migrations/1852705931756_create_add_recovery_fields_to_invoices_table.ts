import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Vérifier si la colonne is_urgent existe déjà
      if (!this.schema.hasColumn(this.tableName, 'is_urgent')) {
        table.boolean('is_urgent').defaultTo(false) // Marquer les factures urgentes
      }
      
      // Vérifier si la colonne last_payment_date existe déjà
      if (!this.schema.hasColumn(this.tableName, 'last_payment_date')) {
        table.timestamp('last_payment_date').nullable() // Date du dernier paiement
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_urgent')
      table.dropColumn('last_payment_date')
    })
  }
}