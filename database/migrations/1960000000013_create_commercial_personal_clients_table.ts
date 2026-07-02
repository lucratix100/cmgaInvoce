import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_personal_clients'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('agent_id').unsigned().references('id').inTable('users').notNullable()
      table.string('name').notNullable()
      table.string('phone').nullable()
      table.string('address').nullable()
      table.string('email').nullable()
      table.string('account_number').nullable()
      table.string('contact_name').nullable()
      table.text('notes').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('disabled_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['agent_id', 'is_active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
