import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'magasins'

  async up() {
    const hasMagasinTypes = await this.schema.hasTable('magasin_types')
    if (!hasMagasinTypes) {
      this.schema.createTable('magasin_types', (table) => {
        table.increments('id')
        table.string('name').notNullable().unique()
        table.boolean('is_active').notNullable().defaultTo(true)
        table.timestamp('created_at').notNullable()
        table.timestamp('updated_at').nullable()
      })
    }

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      table.string('name').notNullable().unique()
      table.string('responsable').notNullable()
      table.string('address').nullable()
      table.string('phone').notNullable().unique()
      table.string('phone2').nullable()
      table.string('email').nullable().unique()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.integer('magasin_type_id').references('id').inTable('magasin_types').notNullable().unsigned()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}