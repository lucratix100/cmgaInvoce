import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_execution_logs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('personal_client_id')
        .unsigned()
        .references('id')
        .inTable('commercial_personal_clients')
        .nullable()
      table.index(['personal_client_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['personal_client_id'])
      table.dropColumn('personal_client_id')
    })
  }
}
