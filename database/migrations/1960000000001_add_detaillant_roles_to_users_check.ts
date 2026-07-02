import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    await this.db.rawQuery(`ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS users_role_check`)
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName} ADD CONSTRAINT users_role_check
      CHECK (role = ANY (ARRAY[
        'ADMIN'::text,
        'MAGASINIER'::text,
        'CHEF DEPOT'::text,
        'RECOUVREMENT'::text,
        'CONTROLEUR'::text,
        'SUPERVISEUR_MAGASIN'::text,
        'AGENT_COMMERCIAL'::text,
        'COMMERCIAL_ADMIN'::text,
        'ADMIN_DETAILLANT'::text,
        'COMMERCIAL_DETAILLANT'::text
      ]))
    `)
  }

  async down() {
    await this.db.rawQuery(`ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS users_role_check`)
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName} ADD CONSTRAINT users_role_check
      CHECK (role = ANY (ARRAY[
        'ADMIN'::text,
        'MAGASINIER'::text,
        'CHEF DEPOT'::text,
        'RECOUVREMENT'::text,
        'CONTROLEUR'::text,
        'SUPERVISEUR_MAGASIN'::text,
        'AGENT_COMMERCIAL'::text,
        'COMMERCIAL_ADMIN'::text
      ]))
    `)
  }
}
