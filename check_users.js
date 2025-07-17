import { Ignitor } from '@adonisjs/core'
import { config } from 'dotenv'

config()

const ignitor = new Ignitor(process.cwd())
await ignitor.init()

const { default: User } = await import('#models/user')

try {
  const users = await User.all()
  console.log('Utilisateurs dans la base de données:')
  users.forEach(user => {
    console.log(`- ID: ${user.id}, Phone: ${user.phone}, Email: ${user.email}, Role: ${user.role}`)
  })
} catch (error) {
  console.error('Erreur:', error.message)
} finally {
  process.exit(0)
} 