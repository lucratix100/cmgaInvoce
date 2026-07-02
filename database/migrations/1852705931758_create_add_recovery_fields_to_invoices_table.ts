import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName}
      ADD COLUMN IF NOT EXISTS is_urgent boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_payment_date timestamptz NULL
    `)
  }

  async down() {
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName}
      DROP COLUMN IF EXISTS is_urgent,
      DROP COLUMN IF EXISTS last_payment_date
    `)
  }
}