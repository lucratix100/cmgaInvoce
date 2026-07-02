import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'roots'

  async up() {
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName}
      ALTER COLUMN visible_to_roles SET DEFAULT '[]'::jsonb
    `)

    await this.db.rawQuery(`
      UPDATE ${this.tableName}
      SET visible_to_roles = '[]'::jsonb
      WHERE visible_to_roles = '["COMMERCIAL_ADMIN"]'::jsonb
    `)
  }

  async down() {
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName}
      ALTER COLUMN visible_to_roles SET DEFAULT '["COMMERCIAL_ADMIN"]'::jsonb
    `)

    await this.db.rawQuery(`
      UPDATE ${this.tableName}
      SET visible_to_roles = '["COMMERCIAL_ADMIN"]'::jsonb
      WHERE visible_to_roles = '[]'::jsonb
    `)
  }
}
