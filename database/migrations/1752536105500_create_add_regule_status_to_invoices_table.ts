import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    // Supprimer l'ancienne contrainte CHECK sur status
    await this.db.rawQuery(`ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check`)
    // Ajouter la nouvelle contrainte CHECK avec la valeur 'régule'
    await this.db.rawQuery(`ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('non réceptionnée', 'en attente de livraison', 'en cours de livraison', 'livrée', 'retour', 'régule'))`)
  }

  async down() {
    // Supprimer la contrainte incluant 'régule'
    await this.db.rawQuery(`ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check`)
    // Remettre l'ancienne contrainte sans 'régule'
    await this.db.rawQuery(`ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('non réceptionnée', 'en attente de livraison', 'en cours de livraison', 'livrée', 'retour'))`)
  }
}