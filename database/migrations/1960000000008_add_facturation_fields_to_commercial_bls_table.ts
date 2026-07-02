import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_bls'

  async up() {
    const hasFacturedBy = await this.schema.hasColumn(this.tableName, 'factured_by')
    const hasFacturedAt = await this.schema.hasColumn(this.tableName, 'factured_at')

    if (!hasFacturedBy || !hasFacturedAt) {
      this.schema.alterTable(this.tableName, (table) => {
        if (!hasFacturedBy) table.integer('factured_by').unsigned().references('id').inTable('users').nullable()
        if (!hasFacturedAt) table.timestamp('factured_at').nullable()
      })
    }
  }

  async down() {
    const hasFacturedBy = await this.schema.hasColumn(this.tableName, 'factured_by')
    const hasFacturedAt = await this.schema.hasColumn(this.tableName, 'factured_at')

    if (hasFacturedBy || hasFacturedAt) {
      this.schema.alterTable(this.tableName, (table) => {
        if (hasFacturedBy) table.dropColumn('factured_by')
        if (hasFacturedAt) table.dropColumn('factured_at')
      })
    }
  }
}
