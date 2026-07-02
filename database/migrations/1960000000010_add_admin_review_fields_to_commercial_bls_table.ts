import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commercial_bls'

  async up() {
    const hasReviewedBy = await this.schema.hasColumn(this.tableName, 'admin_reviewed_by')
    const hasReviewedAt = await this.schema.hasColumn(this.tableName, 'admin_reviewed_at')
    const hasReviewComment = await this.schema.hasColumn(this.tableName, 'admin_review_comment')

    if (!hasReviewedBy || !hasReviewedAt || !hasReviewComment) {
      this.schema.alterTable(this.tableName, (table) => {
        if (!hasReviewedBy) table.integer('admin_reviewed_by').unsigned().references('id').inTable('users').nullable()
        if (!hasReviewedAt) table.timestamp('admin_reviewed_at').nullable()
        if (!hasReviewComment) table.text('admin_review_comment').nullable()
      })
    }
  }

  async down() {
    const hasReviewedBy = await this.schema.hasColumn(this.tableName, 'admin_reviewed_by')
    const hasReviewedAt = await this.schema.hasColumn(this.tableName, 'admin_reviewed_at')
    const hasReviewComment = await this.schema.hasColumn(this.tableName, 'admin_review_comment')

    if (hasReviewedBy || hasReviewedAt || hasReviewComment) {
      this.schema.alterTable(this.tableName, (table) => {
        if (hasReviewedBy) table.dropColumn('admin_reviewed_by')
        if (hasReviewedAt) table.dropColumn('admin_reviewed_at')
        if (hasReviewComment) table.dropColumn('admin_review_comment')
      })
    }
  }
}
