import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    // D'abord, mettre à jour les valeurs null avec une valeur par défaut
    await this.db.rawQuery(`
      UPDATE users 
      SET role = 'MAGASINIER' 
      WHERE role IS NULL
    `)

    // Supprimer l'ancienne contrainte de vérification
    await this.db.rawQuery(`
      ALTER TABLE users DROP CONSTRAINT users_role_check
    `)

    // Ajouter la nouvelle contrainte avec les nouveaux rôles
    await this.db.rawQuery(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role = ANY (ARRAY['ADMIN'::text, 'MAGASINIER'::text, 'CHEF DEPOT'::text, 'RECOUVREMENT'::text, 'CONTROLEUR'::text, 'SUPERVISEUR_MAGASIN'::text, 'AGENT_COMMERCIAL'::text, 'COMMERCIAL_ADMIN'::text]))
    `)
  }
  async down() {
    // Supprimer la nouvelle contrainte
    await this.db.rawQuery(`
      ALTER TABLE users DROP CONSTRAINT users_role_check
    `)
    // Remettre l'ancienne contrainte
    await this.db.rawQuery(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role = ANY (ARRAY['ADMIN'::text, 'MAGASINIER'::text, 'CHEF DEPOT'::text, 'RECOUVREMENT'::text, 'CONTROLEUR'::text, 'SUPERVISEUR_MAGASIN'::text]))
    `)
  }
}