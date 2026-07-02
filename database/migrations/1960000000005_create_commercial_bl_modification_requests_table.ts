import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_bl_modification_requests'

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
      table.integer('requested_by').unsigned().references('id').inTable('users').notNullable()
      table.integer('reviewed_by').unsigned().references('id').inTable('users').nullable()
      table.enum('status', ['EN_ATTENTE', 'APPROUVEE', 'REFUSEE', 'UTILISEE', 'EXPIREE']).notNullable().defaultTo('EN_ATTENTE')
      table.text('reason').notNullable()
      table.text('response_note').nullable()
      table.json('before_snapshot').nullable()
      table.json('after_snapshot').nullable()
      table.timestamp('authorized_at').nullable()
      table.timestamp('authorized_until').nullable()
      table.timestamp('used_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
