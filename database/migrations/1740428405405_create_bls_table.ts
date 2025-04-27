import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bls'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('status').notNullable().defaultTo('en attente de livraison')
      table.boolean('is_delivered').defaultTo(false)
      table.integer('invoice_id').unsigned().references('invoices.id')
      table.jsonb('products').notNullable()
      table.integer('user_id').unsigned().references('users.id')
      table.integer('driver_id').unsigned().references('drivers.id')
      table.integer('total').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}