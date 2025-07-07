import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'conversation_participants'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('conversation_id').references('id').inTable('conversations').onDelete('CASCADE')
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.enum('role', ['admin', 'member']).defaultTo('member') // Pour les conversations de groupe
      table.timestamp('joined_at')
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Index pour optimiser les requêtes
      table.index(['conversation_id'])
      table.index(['user_id'])
      table.unique(['conversation_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
} 