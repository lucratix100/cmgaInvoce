import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'roots'

  async up() {
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName}
      ADD COLUMN IF NOT EXISTS visible_to_roles jsonb NOT NULL DEFAULT '["COMMERCIAL_ADMIN"]'::jsonb
    `)
  }

  async down() {
    await this.db.rawQuery(`ALTER TABLE ${this.tableName} DROP COLUMN IF EXISTS visible_to_roles`)
  }
}
