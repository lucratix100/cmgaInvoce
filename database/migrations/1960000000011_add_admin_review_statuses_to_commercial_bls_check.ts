import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_bls'

  async up() {
    await this.db.rawQuery(`ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS commercial_bls_status_check`)
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName} ADD CONSTRAINT commercial_bls_status_check
      CHECK (status = ANY (ARRAY[
        'BROUILLON'::text,
        'CONFIRME'::text,
        'MODIFICATION_DEMANDEE'::text,
        'MODIFICATION_AUTORISEE'::text,
        'VALIDE_ADMIN'::text,
        'REJETE_ADMIN'::text,
        'ANNULE'::text,
        'FACTURE'::text
      ]))
    `)
  }

  async down() {
    await this.db.rawQuery(`UPDATE ${this.tableName} SET status = 'CONFIRME' WHERE status IN ('VALIDE_ADMIN', 'REJETE_ADMIN')`)
    await this.db.rawQuery(`ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS commercial_bls_status_check`)
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName} ADD CONSTRAINT commercial_bls_status_check
      CHECK (status = ANY (ARRAY[
        'BROUILLON'::text,
        'CONFIRME'::text,
        'MODIFICATION_DEMANDEE'::text,
        'MODIFICATION_AUTORISEE'::text,
        'FACTURE'::text
      ]))
    `)
  }
}
