import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('conversation_id').references('id').inTable('conversations').onDelete('CASCADE')
      table.integer('sender_id').references('id').inTable('users').onDelete('CASCADE')
      table.text('content')
      table.enum('type', ['text', 'image', 'file']).defaultTo('text')
      table.string('file_url').nullable() // Pour les fichiers/images
      table.boolean('is_read').defaultTo(false)
      table.timestamp('read_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Index pour optimiser les requêtes
      table.index(['conversation_id'])
      table.index(['sender_id'])
      table.index(['created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
} 