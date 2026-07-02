import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_bls'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('execution_log_id')
        .unsigned()
        .references('id')
        .inTable('commercial_execution_logs')
        .notNullable()
        .onDelete('CASCADE')
      table.integer('created_by').unsigned().references('id').inTable('users').notNullable()
      table.integer('confirmed_by').unsigned().references('id').inTable('users').nullable()
      table
        .enum('status', ['BROUILLON', 'CONFIRME', 'MODIFICATION_DEMANDEE', 'MODIFICATION_AUTORISEE', 'VALIDE_ADMIN', 'REJETE_ADMIN', 'ANNULE', 'FACTURE'])
        .notNullable()
        .defaultTo('BROUILLON')
      table.json('products_snapshot').nullable()
      table.text('comment').nullable()
      table.timestamp('confirmed_at').nullable()
      table.timestamp('edit_authorized_until').nullable()
      table.integer('admin_reviewed_by').unsigned().references('id').inTable('users').nullable()
      table.timestamp('admin_reviewed_at').nullable()
      table.text('admin_review_comment').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['execution_log_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
