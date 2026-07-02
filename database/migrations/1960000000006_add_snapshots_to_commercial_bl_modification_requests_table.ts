import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_bl_modification_requests'

  async up() {
    const hasBeforeSnapshot = await this.schema.hasColumn(this.tableName, 'before_snapshot')
    const hasAfterSnapshot = await this.schema.hasColumn(this.tableName, 'after_snapshot')

    if (!hasBeforeSnapshot || !hasAfterSnapshot) {
      this.schema.alterTable(this.tableName, (table) => {
        if (!hasBeforeSnapshot) table.json('before_snapshot').nullable()
        if (!hasAfterSnapshot) table.json('after_snapshot').nullable()
      })
    }
  }

  async down() {
    const hasBeforeSnapshot = await this.schema.hasColumn(this.tableName, 'before_snapshot')
    const hasAfterSnapshot = await this.schema.hasColumn(this.tableName, 'after_snapshot')

    if (hasBeforeSnapshot || hasAfterSnapshot) {
      this.schema.alterTable(this.tableName, (table) => {
        if (hasBeforeSnapshot) table.dropColumn('before_snapshot')
        if (hasAfterSnapshot) table.dropColumn('after_snapshot')
      })
    }
  }
}
