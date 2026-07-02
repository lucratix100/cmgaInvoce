import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_execution_logs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('resolved_follow_up_at').nullable()
      table.index(['resolved_follow_up_at'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['resolved_follow_up_at'])
      table.dropColumn('resolved_follow_up_at')
    })
  }
}
