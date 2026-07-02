import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'products'

  async up() {
    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id serial PRIMARY KEY,
        reference varchar(255),
        name varchar(255),
        img_url varchar(255),
        price varchar(255),
        category_product_id integer NOT NULL REFERENCES category_products(id),
        created_at timestamptz,
        updated_at timestamptz
      )
    `)
  }

  async down() {
    await this.db.rawQuery(`DROP TABLE IF EXISTS ${this.tableName}`)
  }
}