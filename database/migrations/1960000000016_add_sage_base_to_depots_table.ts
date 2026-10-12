import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'depots'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Nom de la base de gestion Sage dont proviennent les factures du dépôt (ex: GESTION_PIKINE)
      table.string('sage_base').nullable().unique()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('sage_base')
    })
  }
}
