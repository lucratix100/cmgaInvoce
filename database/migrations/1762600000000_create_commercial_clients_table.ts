import { BaseSchema } from '@adonisjs/lucid/schema'
import { CommercialClientType } from '../../app/enum/index.js'

export default class extends BaseSchema {
  protected tableName = 'commercial_clients'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.enum('type', Object.values(CommercialClientType)).notNullable()
      table.string('phone').nullable()
      table.string('address').nullable()
      table.string('email').nullable()
      table.string('account_number').nullable()
      table.string('contact_name').nullable()
      table.text('notes').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.integer('created_by').unsigned().references('id').inTable('users').nullable()
      table.timestamp('disabled_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
